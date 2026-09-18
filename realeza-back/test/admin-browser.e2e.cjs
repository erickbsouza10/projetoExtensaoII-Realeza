const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const puppeteer = createRequire(resolve(__dirname, '../../realeza-front/package.json'))('puppeteer-core');
const { Pool } = require('pg');
require('dotenv').config();
if (!process.env.TEST_DATABASE_URL || !process.env.CHROME_BIN) throw new Error('Configure TEST_DATABASE_URL (banco isolado) e CHROME_BIN.');
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const base = process.env.TEST_API_URL || 'http://localhost:3000';
const front = process.env.TEST_FRONTEND_URL || 'http://localhost:5173';
const nonce = randomUUID().slice(0,8), password = `Browser-${randomUUID()}`;
const adminRegistration = `super-browser-${nonce}`, studentRegistration = `student-browser-${nonce}`, courseCode = `DIR-${nonce}`;
const registrations = [adminRegistration, studentRegistration];
async function request(path, token, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(body !== undefined ? {'Content-Type':'application/json'} : {}) }, ...(body !== undefined ? {body:JSON.stringify(body)} : {}) });
  const data = await response.json(); assert.ok(response.ok, JSON.stringify(data)); return data;
}
async function account() {
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, ['dist/database/seeds/admin-create.js','--stdin-json'], { cwd: resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL }, stdio:['pipe','pipe','pipe'] });
    let text=''; child.stdout.on('data', data => {text+=data;}); child.stderr.on('data', data => {text+=data;}); child.on('error', reject); child.on('close', code => code === 0 ? done() : reject(new Error(text)));
    child.stdin.end(JSON.stringify({name:'Soberana de teste',registration:adminRegistration,password}));
  });
}
async function replace(page, selector, text) { await page.click(selector,{clickCount:3}); await page.type(selector,text); }
async function login(page, registration) { await page.waitForSelector('#matricula'); await replace(page,'#matricula',registration); await replace(page,'#senha',password); await page.click('button[type=submit]'); await page.waitForSelector('.home-menu'); }
async function route(page, path, selector) { await page.goto(front+path); try { await page.waitForSelector(selector); } catch (error) { console.error('Falha de rota:', path, page.url(), await page.$eval('body', element => element.innerText)); throw error; } }
async function notice(page, text) { await page.waitForFunction(value => document.querySelector('.admin-notice.success')?.textContent.includes(value), {}, text); }
async function nav(page, path, selector) { await page.click(`.admin-nav a[href="/admin/${path}"]`); await page.waitForSelector(selector); }
const optionInput = correct => ['Escolha A','Escolha B','Escolha C','Escolha D'].map((text,index) => ({text,isCorrect:index===correct}));
test('Painel Real no navegador: permissões, CRUD e persistência', {timeout:180000}, async t => {
  let browser, page, courseId, subjectId, questionId, adminSession;
  const errors=[];
  try {
    await account(); adminSession = await request('/auth/login',null,'POST',{registration:adminRegistration,password});
    const courses = await request('/courses'); const ads=courses.find(course=>course.code==='ADS');
    await request('/auth/register',null,'POST',{name:'Aluno sem permissão',registration:studentRegistration,password,courseId:ads.id,semester:2});
    browser = await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}); page = await browser.newPage(); page.on('pageerror',error=>errors.push(error.message)); await page.setViewport({width:1280,height:900});
    await t.test('aluno não vê botão e não entra em nenhuma rota administrativa', async () => {
      await route(page,'/','#matricula'); await login(page,studentRegistration); assert.equal(await page.$('.home-admin'),null);
      for(const path of ['/admin','/admin/cursos','/admin/disciplinas','/admin/questoes']) { await route(page,path,'.home-menu'); assert.equal(new URL(page.url()).pathname,'/home'); assert.equal(await page.$('.admin-shell'),null); }
      await page.click('.home-sair'); await page.waitForSelector('#matricula');
    });
    await t.test('SUPER_ADMIN entra pelo login normal e abre dashboard sem curso fictício', async () => {
      await login(page,adminRegistration); assert.match(await page.$eval('.home-jogador',element=>element.innerText),/Administração do reino/); assert.doesNotMatch(await page.$eval('.home-jogador',element=>element.innerText),/ADS|período/);
      await page.click('.home-admin'); await page.waitForSelector('.admin-dashboard'); assert.equal(await page.$$eval('.admin-dashboard > a',items=>items.length),3);
    });
    await t.test('cadastrar, validar duplicidade e editar curso', async () => {
      await nav(page,'cursos','#course-name'); await page.type('#course-name','Direito no navegador'); await page.type('#course-code',courseCode); await replace(page,'#course-semesters','10'); await page.click('.admin-form button[type=submit]'); await notice(page,'Curso cadastrado');
      const {rows}=await pool.query('SELECT id FROM courses WHERE code=$1',[courseCode]); courseId=rows[0].id; await page.waitForSelector(`[data-id="${courseId}"]`);
      await page.type('#course-name','Curso duplicado'); await page.type('#course-code',courseCode); await page.click('.admin-form button[type=submit]'); await page.waitForSelector('.admin-notice.error'); assert.match(await page.$eval('.admin-notice.error',element=>element.innerText),/código/);
      await page.click(`[data-id="${courseId}"] .botao-real`); await replace(page,'#course-name','Direito persistido'); await page.click('.admin-form button[type=submit]'); await notice(page,'Curso atualizado'); await page.waitForFunction(id=>document.querySelector(`[data-id="${id}"]`)?.textContent.includes('Direito persistido'),{},courseId);
    });
    await t.test('cadastrar e editar disciplina vinculada ao curso/período', async () => {
      await nav(page,'disciplinas','#subject-name'); await page.waitForFunction(()=>document.querySelector('#subject-course').options.length>1); await page.select('#subject-course',courseId); await page.select('#subject-semester','2'); await page.type('#subject-name','Direito Constitucional'); await page.click('.admin-form button[type=submit]'); await notice(page,'Disciplina cadastrada');
      const {rows}=await pool.query('SELECT id FROM subjects WHERE course_id=$1',[courseId]); subjectId=rows[0].id; await page.waitForSelector(`[data-id="${subjectId}"]`); await page.click(`[data-id="${subjectId}"] .botao-real`); await replace(page,'#subject-name','Constitucional atualizado'); await page.click('.admin-form button[type=submit]'); await notice(page,'Disciplina atualizada');
    });
    await t.test('cadastrar questão com 4 alternativas e resposta B', async () => {
      await nav(page,'questoes','#question-statement'); await page.waitForFunction(()=>!document.querySelector('.question-form fieldset').disabled);
      await page.select('#question-course',courseId); await page.select('#question-semester','2'); await page.select('#question-subject',subjectId); await page.select('#question-difficulty','MEDIUM'); await page.type('#question-statement','Qual é a escolha constitucional?');
      for(let index=0;index<4;index++) await page.type(`#option-${index}`,`Escolha ${String.fromCharCode(65+index)}`);
      await page.click('input[name=correct][value="1"]'); assert.equal(await page.$$eval('input[name=correct]',items=>items.filter(item=>item.checked).length),1);
      await page.click('.question-form button[type=submit]'); await notice(page,'Questão cadastrada'); const {rows}=await pool.query('SELECT id FROM questions WHERE course_id=$1',[courseId]); questionId=rows[0].id; await page.waitForSelector(`[data-id="${questionId}"]`);
    });
    await t.test('editar enunciado, dificuldade, alternativa e gabarito persistidos', async () => {
      await page.click(`[data-id="${questionId}"] .botao-real`); await page.waitForFunction(()=>document.querySelector('input[name=correct][value="1"]').checked);
      await replace(page,'#question-statement','Questão editada no painel'); await page.select('#question-difficulty','HARD'); await replace(page,'#option-2','Nova escolha C'); await page.click('input[name=correct][value="2"]'); await page.click('.question-form button[type=submit]'); await notice(page,'Questão atualizada');
      const saved=await request(`/admin/questions/${questionId}`,adminSession.accessToken); assert.equal(saved.statement,'Questão editada no painel'); assert.equal(saved.difficulty,'HARD'); assert.equal(saved.options[2].text,'Nova escolha C'); assert.equal(saved.options[2].isCorrect,true);
    });
    await t.test('desativar questão e usar os cinco filtros', async () => {
      await page.waitForSelector(`[data-id="${questionId}"]`); await page.click(`[data-id="${questionId}"] .link-real`); await notice(page,'Questão desativada');
      await page.select('#filter-course',courseId); await page.select('#filter-semester','2'); await page.select('#filter-subject',subjectId); await page.select('#filter-difficulty','HARD'); await page.select('#filter-status','false');
      await page.waitForFunction(id=>document.querySelectorAll('.questions-list article').length===1 && document.querySelector(`.questions-list [data-id="${id}"]`),{},questionId);
      await page.select('#filter-status','true'); await page.waitForFunction(()=>document.querySelector('.admin-content').textContent.includes('Nenhuma questão encontrada.'));
    });
    await t.test('paginação limita listagem a 20 questões por página', async () => {
      for(let index=0;index<21;index++) await request('/admin/questions',adminSession.accessToken,'POST',{courseId,semester:2,subjectId,difficulty:'EASY',statement:`Paginação ${index}`,options:optionInput(0),active:true});
      await page.click('.question-filters button'); await page.select('#filter-course',courseId); await page.waitForFunction(()=>document.querySelectorAll('.questions-list article').length===20); await page.click('.admin-pagination button:last-child');
      await page.waitForFunction(()=>document.querySelector('.admin-pagination')?.textContent.includes('Página 2 de 2') && document.querySelectorAll('.questions-list article').length===2);
    });
    await t.test('desativar disciplina e curso preserva questões e oculta curso no cadastro', async () => {
      await nav(page,'disciplinas','#subject-name'); await page.waitForSelector(`[data-id="${subjectId}"]`); await page.click(`[data-id="${subjectId}"] .link-real`); await notice(page,'Disciplina desativada');
      await nav(page,'cursos','#course-name'); await page.waitForSelector(`[data-id="${courseId}"]`); await page.click(`[data-id="${courseId}"] .link-real`); await notice(page,'Curso desativado');
      assert.equal((await request('/courses')).some(item=>item.id===courseId),false); assert.equal((await request(`/admin/questions?courseId=${courseId}`,adminSession.accessToken)).total,22);
      await page.reload(); await page.waitForSelector('.admin-shell'); assert.equal(new URL(page.url()).pathname,'/admin/cursos');
    });
    await t.test('painel e formulários cabem em tela móvel', async () => {
      await page.setViewport({width:390,height:844});
      for(const [path,selector] of [['/admin','.admin-dashboard'],['/admin/cursos','#course-name'],['/admin/disciplinas','#subject-name'],['/admin/questoes','#question-statement']]) { await route(page,path,selector); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path); assert.equal(await page.$eval('.admin-shell',element=>getComputedStyle(element).overflowY),'auto'); }
      assert.deepEqual(errors,[]);
    });
  } finally {
    if(browser) await browser.close(); await pool.query('DELETE FROM users WHERE registration=ANY($1::varchar[])',[registrations]);
    if(courseId) { await pool.query('DELETE FROM questions WHERE course_id=$1',[courseId]); await pool.query('DELETE FROM subjects WHERE course_id=$1',[courseId]); await pool.query('DELETE FROM courses WHERE id=$1',[courseId]); }
    await pool.end();
  }
});
