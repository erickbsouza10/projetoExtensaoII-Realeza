const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { compare } = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const base = process.env.TEST_API_URL || 'http://localhost:3000';
if (!process.env.TEST_DATABASE_URL)
  throw new Error('Informe TEST_DATABASE_URL de um banco isolado conectado à API de teste.');
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const registrations = [];
const password = 'SenhaTeste123!';
async function request(path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
function noSecrets(data) {
  assert.doesNotMatch(
    JSON.stringify(data),
    /passwordHash|password_hash|isCorrect|is_correct|"correct"/,
  );
}
test('Realeza API com PostgreSQL real', async (t) => {
  let course, session, input, inactiveId;
  try {
    await t.test('cursos ativos públicos e seed preservado', async () => {
      const result = await request('/courses');
      assert.equal(result.status, 200);
      course = result.data.find((item) => item.code === 'ADS');
      assert.equal(course.totalSemesters, 5);
      assert.equal(
        result.data.some((item) => item.code === 'Direito'),
        false,
      );
      const { rows } = await pool.query('SELECT count(*)::int AS total FROM questions');
      assert.equal(rows[0].total, 4);
      const correct = await pool.query(
        'SELECT question_id FROM question_options GROUP BY question_id HAVING count(*) FILTER (WHERE is_correct) <> 1',
      );
      assert.equal(correct.rows.length, 0);
      const options = await pool.query('SELECT count(*)::int AS total FROM question_options');
      assert.equal(options.rows[0].total, 16);
      const seed = require('../src/database/seeds/questions.json');
      for (const item of seed) {
        const id = `00000000-0000-4000-8000-${String(item.id).padStart(12, '0')}`;
        const question = await pool.query('SELECT statement FROM questions WHERE id=$1', [id]);
        assert.equal(question.rows[0].statement, item.statement);
        const saved = await pool.query(
          'SELECT text,position,is_correct FROM question_options WHERE question_id=$1 ORDER BY position',
          [id],
        );
        assert.deepEqual(
          saved.rows.map((option) => option.text),
          item.options,
        );
        assert.equal(saved.rows.find((option) => option.is_correct).position, item.correct);
      }
    });
    await t.test('cadastro retorna JWT, perfil e senha bcrypt; não promove aluno', async () => {
      const registration = `test-${randomUUID()}`;
      registrations.push(registration);
      input = { registration, name: 'Aluno de teste', password, courseId: course.id, semester: 2 };
      const result = await request('/auth/register', { body: input });
      assert.equal(result.status, 201);
      session = result.data;
      assert.equal(session.user.registration, registration);
      assert.equal(session.user.course.id, course.id);
      assert.equal(session.user.semester, 2);
      assert.equal(session.user.role, 'STUDENT');
      noSecrets(session);
      const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
        session.user.id,
      ]);
      assert.notEqual(rows[0].password_hash, password);
      assert.equal(await compare(password, rows[0].password_hash), true);
    });
    await t.test('matrícula duplicada', async () => {
      const result = await request('/auth/register', { body: input });
      assert.equal(result.status, 409);
      assert.equal(result.data.code, 'REGISTRATION_ALREADY_EXISTS');
    });
    await t.test('login correto', async () => {
      const result = await request('/auth/login', {
        body: { registration: input.registration, password },
      });
      assert.equal(result.status, 200);
      assert.equal(result.data.user.id, session.user.id);
      noSecrets(result.data);
    });
    await t.test('senha incorreta', async () => {
      const result = await request('/auth/login', {
        body: { registration: input.registration, password: 'OutraSenha123' },
      });
      assert.equal(result.status, 401);
      assert.equal(result.data.code, 'INVALID_CREDENTIALS');
    });
    await t.test('matrícula inexistente', async () => {
      const result = await request('/auth/login', {
        body: { registration: randomUUID(), password },
      });
      assert.deepEqual(result.data, {
        statusCode: 404,
        code: 'USER_NOT_REGISTERED',
        message: 'Matrícula não cadastrada.',
      });
    });
    await t.test('auth/me e users/me com e sem JWT', async () => {
      for (const path of ['/auth/me', '/users/me']) {
        const ok = await request(path, { token: session.accessToken });
        assert.equal(ok.status, 200);
        assert.equal(ok.data.id, session.user.id);
        noSecrets(ok.data);
        const denied = await request(path);
        assert.equal(denied.status, 401);
        assert.equal(denied.data.code, 'UNAUTHORIZED');
      }
      assert.equal((await request('/auth/me', { token: 'invalid' })).status, 401);
      const expired = jwt.sign({ sub: session.user.id }, process.env.JWT_SECRET, {
        expiresIn: -1,
        issuer: 'realeza',
        audience: 'realeza-front',
      });
      assert.equal((await request('/auth/me', { token: expired })).status, 401);
    });
    await t.test('validação: matrícula, nome, senha, curso, período e role', async () => {
      for (const override of [
        { registration: ' ' },
        { name: ' ' },
        { password: '123' },
        { password: 'é'.repeat(40) },
        { courseId: randomUUID() },
        { semester: 0 },
        { semester: 6 },
        { semester: 1.5 },
        { role: 'ADMIN' },
      ]) {
        const registration = randomUUID();
        registrations.push(registration);
        const result = await request('/auth/register', {
          body: { ...input, registration, ...override },
        });
        assert.equal(result.status, 400, JSON.stringify(override));
      }
      inactiveId = randomUUID();
      await pool.query(
        'INSERT INTO courses (id,name,code,total_semesters,active) VALUES ($1,$2,$3,1,false)',
        [inactiveId, 'Curso inativo teste', `T-${randomUUID().slice(0, 8)}`],
      );
      const inactive = await request('/auth/register', {
        body: { ...input, registration: randomUUID(), courseId: inactiveId },
      });
      assert.equal(inactive.status, 400);
      assert.equal(inactive.data.code, 'INVALID_COURSE');
    });
    await t.test('cadastros concorrentes respeitam unicidade', async () => {
      const registration = randomUUID();
      registrations.push(registration);
      const results = await Promise.all(
        [1, 2].map(() => request('/auth/register', { body: { ...input, registration } })),
      );
      assert.deepEqual(results.map((item) => item.status).sort(), [201, 409]);
    });
    await t.test('disciplinas pelo perfil e perguntas sem gabarito', async () => {
      const subjects = await request('/subjects', { token: session.accessToken });
      assert.equal(subjects.status, 200);
      assert.equal(subjects.data.length, 2);
      for (const difficulty of ['EASY', 'MEDIUM', 'HARD']) {
        const result = await request(`/questions/random?difficulty=${difficulty}`, {
          token: session.accessToken,
        });
        assert.equal(result.status, 200);
        assert.equal(result.data.options.length, 4);
        assert.equal(result.data.difficulty, difficulty);
        assert.deepEqual(
          result.data.options.map((option) => option.position),
          [0, 1, 2, 3],
        );
        noSecrets(result.data);
      }
      assert.equal((await request('/questions/random?difficulty=EASY')).status, 401);
      assert.equal(
        (await request('/questions/random?difficulty=invalid', { token: session.accessToken }))
          .status,
        400,
      );
      assert.equal(
        (
          await request('/questions/random?difficulty=EASY&courseId=x&semester=1', {
            token: session.accessToken,
          })
        ).status,
        400,
      );
    });
    await t.test('perfil vem do banco a cada request, não do JWT/cliente', async () => {
      await pool.query('UPDATE users SET name=$1,semester=3 WHERE id=$2', [
        'Perfil atualizado no banco',
        session.user.id,
      ]);
      const result = await request('/auth/me', { token: session.accessToken });
      assert.equal(result.data.name, 'Perfil atualizado no banco');
      assert.equal(result.data.semester, 3);
      const empty = await request('/questions/random?difficulty=EASY', {
        token: session.accessToken,
      });
      assert.equal(empty.status, 404);
      assert.equal(empty.data.code, 'QUESTION_NOT_FOUND');
    });
    await t.test('Swagger com Bearer JWT e CORS explícito', async () => {
      const docs = await request('/docs-json');
      assert.equal(docs.status, 200);
      assert.ok(docs.data.components.securitySchemes.bearer);
      for (const endpoint of [
        '/auth/register',
        '/auth/login',
        '/auth/me',
        '/users/me',
        '/courses',
        '/questions/random',
      ])
        assert.ok(docs.data.paths[endpoint]);
      const blocked = await request('/courses', {
        headers: { Origin: 'http://untrusted.example' },
      });
      assert.equal(blocked.headers.get('access-control-allow-origin'), null);
    });
  } finally {
    await pool.query('DELETE FROM users WHERE registration = ANY($1::varchar[])', [registrations]);
    if (inactiveId) await pool.query('DELETE FROM courses WHERE id=$1', [inactiveId]);
    await pool.end();
  }
});
