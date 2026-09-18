const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createRequire } = require('node:module');
const puppeteer = createRequire(
  require('node:path').resolve(__dirname, '../../realeza-front/package.json'),
)('puppeteer-core');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();
if (!process.env.TEST_DATABASE_URL || !process.env.CHROME_BIN)
  throw new Error('Configure TEST_DATABASE_URL (banco isolado) e CHROME_BIN.');
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const frontend = process.env.TEST_FRONTEND_URL || 'http://localhost:5173';
const registration = `browser-${randomUUID()}`;
const password = 'SenhaBrowser123!';
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function replace(page, selector, text) {
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text);
}
async function login(page, secret = password) {
  await page.waitForSelector('#matricula');
  await replace(page, '#matricula', registration);
  await replace(page, '#senha', secret);
  await page.click('button[type=submit]');
}
async function atHome(page) {
  await page.waitForSelector('.home-menu');
  assert.equal(new URL(page.url()).pathname, '/home');
}
async function logout(page) {
  await page.click('.home-sair');
  await page.waitForSelector('#matricula');
  assert.equal(await page.evaluate(() => localStorage.getItem('realeza.accessToken')), null);
}
test(
  'Realeza: autenticação integrada e partida local no navegador',
  { timeout: 120000 },
  async (t) => {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    const errors = [],
      endpoints = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (response.url().includes('/auth/')) endpoints.push(new URL(response.url()).pathname);
    });
    try {
      await page.setViewport({ width: 1280, height: 900 });
      await t.test('rotas home/sala bloqueadas sem sessão e Google desabilitado', async () => {
        for (const path of ['/home', '/sala']) {
          await page.goto(frontend + path);
          await page.waitForSelector('#matricula');
          assert.equal(new URL(page.url()).pathname, '/');
        }
        assert.equal(await page.$eval('.login-google', (button) => button.disabled), true);
      });
      await t.test('matrícula inexistente abre primeiro acesso e mantém os campos', async () => {
        await login(page);
        await page.waitForSelector('#nome');
        await page.waitForFunction(() => document.querySelector('#curso').options.length > 1);
        assert.equal(await page.$eval('#matricula', (input) => input.value), registration);
        assert.equal(await page.$eval('#senha', (input) => input.value), password);
        const courseId = await page.$eval('#curso', (input) => input.options[1].value);
        await page.select('#curso', courseId);
        assert.equal(await page.$$eval('#periodo option', (options) => options.length), 5);
        await page.select('#periodo', '3');
        await page.type('#nome', 'Aurora de teste');
        await page.type('#confirmar-senha', 'SenhaDiferente123');
        await page.click('button[type=submit]');
        await page.waitForSelector('.login-erro');
        assert.match(
          await page.$eval('.login-erro', (element) => element.innerText),
          /não coincidem/,
        );
      });
      await t.test('cadastro autentica automaticamente e Home mostra perfil real', async () => {
        await replace(page, '#confirmar-senha', password);
        await page.click('button[type=submit]');
        await atHome(page);
        assert.match(
          await page.$eval('.home-menu', (element) => element.innerText),
          /Aurora de teste/,
        );
        assert.match(
          await page.$eval('.home-jogador', (element) => element.innerText),
          /3º período/,
        );
        assert.ok(endpoints.includes('/auth/login'));
        assert.ok(endpoints.includes('/auth/register'));
        assert.ok(endpoints.includes('/auth/me'));
      });
      await t.test('recarga mantém sessão e alterações do banco aparecem no perfil', async () => {
        await page.reload();
        await atHome(page);
        await pool.query('UPDATE users SET name=$1,semester=4 WHERE registration=$2', [
          'Aurora do banco',
          registration,
        ]);
        await page.reload();
        await atHome(page);
        assert.match(
          await page.$eval('.home-menu', (element) => element.innerText),
          /Aurora do banco/,
        );
        assert.match(
          await page.$eval('.home-jogador', (element) => element.innerText),
          /4º período/,
        );
      });
      await t.test(
        'indisponibilidade da API preserva token e permite tentar novamente',
        async () => {
          let fail = true;
          await page.setRequestInterception(true);
          const intercept = (request) => {
            if (fail && request.url().endsWith('/auth/me')) request.abort();
            else request.continue();
          };
          page.on('request', intercept);
          await page.reload();
          await page.waitForSelector('.preloader button');
          assert.notEqual(
            await page.evaluate(() => localStorage.getItem('realeza.accessToken')),
            null,
          );
          fail = false;
          await page.click('.preloader button');
          await atHome(page);
          page.off('request', intercept);
          await page.setRequestInterception(false);
        },
      );
      await t.test('logout em outra aba encerra a sessão compartilhada', async () => {
        const second = await browser.newPage();
        await second.goto(frontend + '/home');
        await atHome(second);
        await logout(second);
        await page.waitForSelector('#matricula');
        assert.equal(new URL(page.url()).pathname, '/');
        await second.close();
        await login(page);
        await atHome(page);
      });
      await t.test('logout apaga token e protege as duas rotas', async () => {
        await logout(page);
        for (const path of ['/home', '/sala']) {
          await page.goto(frontend + path);
          await page.waitForSelector('#matricula');
          assert.equal(new URL(page.url()).pathname, '/');
        }
      });
      await t.test('senha incorreta não entra; login correto usa perfil do banco', async () => {
        await login(page, 'SenhaIncorreta123');
        await page.waitForSelector('.login-erro');
        assert.equal(new URL(page.url()).pathname, '/');
        assert.equal(await page.$('#nome'), null);
        await replace(page, '#senha', password);
        await page.click('button[type=submit]');
        await atHome(page);
        assert.match(
          await page.$eval('.home-menu', (element) => element.innerText),
          /Aurora do banco/,
        );
      });
      await t.test(
        'partida local mantém dado, acerto, movimento, cronômetro e abandono',
        async () => {
          await page.evaluate(() => {
            Math.random = () => 0;
          });
          await page.click('.home-jogar');
          await page.waitForSelector('.btn-dado');
          await page.click('.btn-dado');
          await page.waitForSelector('.overlay-pergunta');
          assert.match(await page.$eval('.cronometro', (element) => element.innerText), /10s/);
          await page.click('.alternativas button:nth-child(2)');
          await page.waitForSelector('.resultado-resposta.acertou');
          await page.waitForFunction(
            () =>
              !document.querySelector('.overlay-pergunta') &&
              document.querySelector('[data-jogador="2"]').dataset.posicao === '1' &&
              !document.querySelector('.btn-dado').disabled,
          );
          await page.click('.btn-dado');
          await page.waitForSelector('.overlay-pergunta');
          await sleep(4500);
          assert.match(
            await page.$eval('.cronometro-pizza', (element) => element.style.background),
            /230, 189, 89/,
          );
          await sleep(3000);
          assert.match(
            await page.$eval('.cronometro-pizza', (element) => element.style.background),
            /237, 115, 115/,
          );
          await page.waitForSelector('.resultado-resposta.esgotou');
          await page.waitForFunction(() => !document.querySelector('.overlay-pergunta'));
          assert.equal(
            await page.$eval('[data-jogador="1"]', (element) => element.dataset.posicao),
            '0',
          );
          await page.click('.btn-abandonar');
          await atHome(page);
        },
      );
      await t.test('cadastro cabe em tela móvel e permite rolar', async () => {
        await logout(page);
        await page.setViewport({ width: 390, height: 844 });
        await page.$$eval('.login-formulario button', (buttons) =>
          buttons.find((button) => button.innerText.includes('Primeiro acesso')).click(),
        );
        await page.waitForSelector('#nome');
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        assert.equal(
          await page.$eval(
            '.login-cadastro',
            (element) => element.scrollHeight >= element.clientHeight,
          ),
          true,
        );
      });
      await t.test('JWT inválido/expirado não libera rota protegida', async () => {
        await page.evaluate(() => localStorage.setItem('realeza.accessToken', 'invalid'));
        await page.goto(frontend + '/home');
        await page.waitForSelector('#matricula');
        assert.equal(await page.evaluate(() => localStorage.getItem('realeza.accessToken')), null);
        const user = await pool.query('SELECT id FROM users WHERE registration=$1', [registration]);
        const token = jwt.sign({ sub: user.rows[0].id }, process.env.JWT_SECRET, {
          expiresIn: -1,
          issuer: 'realeza',
          audience: 'realeza-front',
        });
        await page.evaluate((value) => localStorage.setItem('realeza.accessToken', value), token);
        await page.goto(frontend + '/sala');
        await page.waitForSelector('#matricula');
        assert.equal(new URL(page.url()).pathname, '/');
        assert.deepEqual(errors, []);
      });
    } finally {
      await browser.close();
      await pool.query('DELETE FROM users WHERE registration=$1', [registration]);
      await pool.end();
    }
  },
);
