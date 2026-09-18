const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { Pool } = require('pg');
const { compare } = require('bcrypt');
require('dotenv').config();
if (!process.env.TEST_DATABASE_URL)
  throw new Error('Informe TEST_DATABASE_URL de um banco isolado conectado à API de teste.');
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const base = process.env.TEST_API_URL || 'http://localhost:3000';
const registrations = [],
  courseIds = [];
const password = `Admin-${randomUUID()}`;
async function request(path, token, method = 'GET', body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
function cli(input) {
  return new Promise((resolve, reject) => {
    const processAdmin = spawn('npm', ['run', 'admin:create', '--', '--stdin-json'], {
      cwd: require('node:path').resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    processAdmin.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    processAdmin.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    processAdmin.on('error', reject);
    processAdmin.on('close', (code) => resolve({ code, stdout, stderr }));
    processAdmin.stdin.end(JSON.stringify(input));
  });
}
function options(correct = 0) {
  return ['Uma', 'Duas', 'Três', 'Quatro'].map((text, index) => ({
    text,
    isCorrect: index === correct,
  }));
}
function noAnswer(data) {
  assert.doesNotMatch(
    JSON.stringify(data),
    /isCorrect|is_correct|correctIndex|correctOption|passwordHash|password_hash/,
  );
}
test(
  'SUPER_ADMIN e catálogo administrativo com PostgreSQL real',
  { timeout: 120000 },
  async (t) => {
    let admin, student, course, subject, otherSubject, question, cliInput;
    try {
      await t.test('comando cria SUPER_ADMIN sem curso/período e com bcrypt', async () => {
        const registration = `admin-${randomUUID()}`;
        registrations.push(registration);
        cliInput = { name: 'Administrador de teste', registration, password };
        const result = await cli(cliInput);
        assert.equal(result.code, 0);
        assert.match(result.stdout, /criada com sucesso/);
        assert.ok(!result.stdout.includes(password) && !result.stderr.includes(password));
        const { rows } = await pool.query(
          'SELECT role,course_id,semester,password_hash FROM users WHERE registration=$1',
          [registration],
        );
        assert.equal(rows[0].role, 'SUPER_ADMIN');
        assert.equal(rows[0].course_id, null);
        assert.equal(rows[0].semester, null);
        assert.match(rows[0].password_hash, /^\$2[ab]\$12\$/);
        assert.equal(await compare(password, rows[0].password_hash), true);
        const login = await request('/auth/login', null, 'POST', { registration, password });
        assert.equal(login.status, 200);
        admin = login.data;
        assert.equal(admin.user.role, 'SUPER_ADMIN');
        assert.equal(admin.user.course, null);
        assert.equal(admin.user.semester, null);
        const me = await request('/auth/me', admin.accessToken);
        assert.equal(me.status, 200);
        assert.equal(me.data.role, 'SUPER_ADMIN');
      });
      await t.test('CLI duplicado não altera conta e rejeita senha inválida/role', async () => {
        const duplicate = await cli(cliInput);
        assert.equal(duplicate.code, 0);
        assert.match(duplicate.stdout, /Matrícula já existe/);
        for (const override of [
          { password: '123' },
          { password: 'é'.repeat(40) },
          { role: 'STUDENT' },
        ]) {
          const result = await cli({ ...cliInput, registration: randomUUID(), ...override });
          assert.notEqual(result.code, 0);
          assert.match(result.stderr, /Erro/);
          assert.ok(!result.stderr.includes(password));
        }
      });
      await t.test('registro público permanece STUDENT e não aceita SUPER_ADMIN', async () => {
        const courses = await request('/courses');
        const ads = courses.data.find((item) => item.code === 'ADS');
        const registration = `aluno-${randomUUID()}`;
        registrations.push(registration);
        const body = {
          name: 'Aluno administrativo teste',
          registration,
          password,
          courseId: ads.id,
          semester: 2,
        };
        const result = await request('/auth/register', null, 'POST', body);
        assert.equal(result.status, 201);
        student = result.data;
        assert.equal(student.user.role, 'STUDENT');
        const rejected = await request('/auth/register', null, 'POST', {
          ...body,
          registration: randomUUID(),
          role: 'SUPER_ADMIN',
        });
        assert.equal(rejected.status, 400);
        const duplicateStudent = await cli({ name: 'Não promover', registration, password });
        assert.match(duplicateStudent.stdout, /Matrícula já existe/);
        const me = await request('/auth/me', student.accessToken);
        assert.equal(me.data.role, 'STUDENT');
      });
      await t.test('todas as rotas administrativas exigem JWT e SUPER_ADMIN', async () => {
        const id = randomUUID();
        const routes = [
          ['/admin/stats', 'GET'],
          ['/admin/courses', 'GET'],
          ['/admin/courses', 'POST'],
          [`/admin/courses/${id}`, 'PATCH'],
          ['/admin/subjects', 'GET'],
          ['/admin/subjects', 'POST'],
          [`/admin/subjects/${id}`, 'PATCH'],
          ['/admin/questions', 'GET'],
          [`/admin/questions/${id}`, 'GET'],
          ['/admin/questions', 'POST'],
          [`/admin/questions/${id}`, 'PATCH'],
          [`/admin/questions/${id}/status`, 'PATCH'],
        ];
        for (const [path, method] of routes) {
          const body = method === 'GET' ? undefined : {};
          assert.equal((await request(path, null, method, body)).status, 401, path);
          const denied = await request(path, student.accessToken, method, body);
          assert.equal(denied.status, 403, path);
          assert.equal(denied.data.code, 'FORBIDDEN');
        }
        assert.equal((await request('/admin/stats', admin.accessToken)).status, 200);
        await pool.query("UPDATE users SET role='ADMIN' WHERE id=$1", [student.user.id]);
        assert.equal((await request('/admin/courses', student.accessToken)).status, 403);
        await pool.query("UPDATE users SET role='STUDENT' WHERE id=$1", [student.user.id]);
        assert.equal(
          (await request('/questions/random?difficulty=EASY', admin.accessToken)).status,
          403,
        );
      });
      await t.test('cadastrar curso, validar dados e rejeitar código duplicado', async () => {
        const body = {
          name: 'Direito de teste',
          code: `DIR-${randomUUID().slice(0, 8)}`,
          totalSemesters: 10,
          active: true,
        };
        const result = await request('/admin/courses', admin.accessToken, 'POST', body);
        assert.equal(result.status, 201);
        course = result.data;
        courseIds.push(course.id);
        assert.ok(course.createdAt && course.updatedAt);
        const duplicate = await request('/admin/courses', admin.accessToken, 'POST', body);
        assert.equal(duplicate.status, 409);
        assert.equal(duplicate.data.code, 'COURSE_CODE_ALREADY_EXISTS');
        for (const override of [
          { name: ' ' },
          { code: '' },
          { totalSemesters: 0 },
          { totalSemesters: 1.5 },
          { active: null },
        ])
          assert.equal(
            (await request('/admin/courses', admin.accessToken, 'POST', { ...body, ...override }))
              .status,
            400,
          );
        assert.equal(
          (await request(`/admin/courses/${course.id}`, admin.accessToken, 'PATCH', { name: null }))
            .status,
          400,
        );
        const edit = await request(`/admin/courses/${course.id}`, admin.accessToken, 'PATCH', {
          name: 'Direito atualizado',
        });
        assert.equal(edit.status, 200);
        assert.equal(edit.data.name, 'Direito atualizado');
      });
      await t.test('cadastro/edição de disciplinas e período válido', async () => {
        const body = { name: 'Direito Civil', courseId: course.id, semester: 2, active: true };
        const result = await request('/admin/subjects', admin.accessToken, 'POST', body);
        assert.equal(result.status, 201);
        subject = result.data;
        assert.equal(
          (await request('/admin/subjects', admin.accessToken, 'POST', body)).status,
          409,
        );
        for (const override of [{ semester: 11 }, { semester: 0 }, { courseId: randomUUID() }])
          assert.equal(
            (await request('/admin/subjects', admin.accessToken, 'POST', { ...body, ...override }))
              .status,
            400,
          );
        const other = await request('/admin/subjects', admin.accessToken, 'POST', {
          ...body,
          name: 'Direito Penal',
          semester: 3,
        });
        assert.equal(other.status, 201);
        otherSubject = other.data;
        const edit = await request(`/admin/subjects/${subject.id}`, admin.accessToken, 'PATCH', {
          name: 'Direito Civil atualizado',
        });
        assert.equal(edit.status, 200);
        const filtered = await request(
          `/admin/subjects?courseId=${course.id}&semester=2`,
          admin.accessToken,
        );
        assert.equal(filtered.data.length, 1);
      });
      await t.test('cadastro de questão e gabarito somente administrativo', async () => {
        const body = {
          courseId: course.id,
          semester: 2,
          subjectId: subject.id,
          difficulty: 'MEDIUM',
          statement: 'Qual é a alternativa correta?',
          options: options(),
          active: true,
        };
        const result = await request('/admin/questions', admin.accessToken, 'POST', body);
        assert.equal(result.status, 201);
        question = result.data;
        assert.equal(question.options.length, 4);
        assert.equal(question.options.filter((option) => option.isCorrect).length, 1);
        const registration = `curso-${randomUUID()}`;
        registrations.push(registration);
        const player = await request('/auth/register', null, 'POST', {
          name: 'Aluno de Direito',
          registration,
          password,
          courseId: course.id,
          semester: 2,
        });
        assert.equal(player.status, 201);
        const publicQuestion = await request(
          '/questions/random?difficulty=MEDIUM',
          player.data.accessToken,
        );
        assert.equal(publicQuestion.status, 200);
        assert.equal(publicQuestion.data.id, question.id);
        noAnswer(publicQuestion.data);
        student = player.data;
        const detail = await request(`/admin/questions/${question.id}`, admin.accessToken);
        assert.equal(detail.status, 200);
        assert.equal(detail.data.options[0].isCorrect, true);
      });
      await t.test(
        'questão rejeita gabaritos, alternativas e disciplina incompatíveis',
        async () => {
          const body = {
            courseId: course.id,
            semester: 2,
            subjectId: subject.id,
            difficulty: 'EASY',
            statement: 'Enunciado de teste',
            options: options(),
            active: true,
          };
          for (const override of [
            { options: options().slice(0, 3) },
            { options: [...options(), { text: 'Cinco', isCorrect: false }] },
            { options: options(-1) },
            { options: options().map((item, index) => ({ ...item, isCorrect: index < 2 })) },
            {
              options: options().map((item, index) =>
                index === 0 ? { ...item, text: ' ' } : item,
              ),
            },
            { statement: ' ' },
            { difficulty: 'facil' },
            { subjectId: randomUUID() },
            { subjectId: otherSubject.id },
            { semester: 11 },
          ]) {
            const result = await request('/admin/questions', admin.accessToken, 'POST', {
              ...body,
              ...override,
            });
            assert.equal(result.status, 400, JSON.stringify(override));
          }
          const ads = (await request('/courses')).data.find((item) => item.code === 'ADS');
          assert.equal(
            (
              await request('/admin/questions', admin.accessToken, 'POST', {
                ...body,
                courseId: ads.id,
              })
            ).status,
            400,
          );
          assert.equal(
            (
              await request(`/admin/questions/${question.id}`, admin.accessToken, 'PATCH', {
                options: null,
              })
            ).status,
            400,
          );
        },
      );
      await t.test('editar questão e alternativas em transação, mantendo IDs', async () => {
        const beforeIds = question.options.map((option) => option.id);
        const result = await request(
          `/admin/questions/${question.id}`,
          admin.accessToken,
          'PATCH',
          { statement: 'Questão editada', difficulty: 'HARD', options: options(2) },
        );
        assert.equal(result.status, 200);
        question = result.data;
        assert.equal(question.statement, 'Questão editada');
        assert.equal(question.options[2].isCorrect, true);
        assert.equal(question.options[0].isCorrect, false);
        assert.deepEqual(
          question.options.map((option) => option.id),
          beforeIds,
        );
        const moved = await request(`/admin/questions/${question.id}`, admin.accessToken, 'PATCH', {
          subjectId: otherSubject.id,
          semester: 3,
        });
        assert.equal(moved.status, 200);
        assert.equal(moved.data.subject.id, otherSubject.id);
        const restored = await request(
          `/admin/questions/${question.id}`,
          admin.accessToken,
          'PATCH',
          { subjectId: subject.id, semester: 2 },
        );
        assert.equal(restored.status, 200);
        question = restored.data;
        assert.equal(
          (
            await request(`/admin/subjects/${subject.id}`, admin.accessToken, 'PATCH', {
              semester: 4,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(`/admin/courses/${course.id}`, admin.accessToken, 'PATCH', {
              totalSemesters: 1,
            })
          ).status,
          409,
        );
      });
      await t.test('falha ao gravar alternativa reverte questão e gabarito', async () => {
        const marker = randomUUID();
        await pool.query(
          `ALTER TABLE question_options ADD CONSTRAINT realeza_admin_test_failure CHECK (text <> '${marker}')`,
        );
        try {
          const failed = await request(
            `/admin/questions/${question.id}`,
            admin.accessToken,
            'PATCH',
            {
              statement: 'Não deve persistir',
              options: options(1).map((option, index) =>
                index === 3 ? { ...option, text: marker } : option,
              ),
            },
          );
          assert.equal(failed.status, 500);
          const unchanged = await request(`/admin/questions/${question.id}`, admin.accessToken);
          assert.equal(unchanged.data.statement, question.statement);
          assert.deepEqual(unchanged.data.options, question.options);
        } finally {
          await pool.query(
            'ALTER TABLE question_options DROP CONSTRAINT realeza_admin_test_failure',
          );
        }
      });
      await t.test('filtros e paginação de questões', async () => {
        const other = await request('/admin/questions', admin.accessToken, 'POST', {
          courseId: course.id,
          semester: 3,
          subjectId: otherSubject.id,
          difficulty: 'EASY',
          statement: 'Outra questão',
          options: options(1),
          active: true,
        });
        assert.equal(other.status, 201);
        const filtered = await request(
          `/admin/questions?courseId=${course.id}&semester=2&subjectId=${subject.id}&difficulty=HARD&active=true`,
          admin.accessToken,
        );
        assert.equal(filtered.data.total, 1);
        assert.equal(filtered.data.data[0].id, question.id);
        const first = await request(
            `/admin/questions?courseId=${course.id}&page=1&limit=1`,
            admin.accessToken,
          ),
          second = await request(
            `/admin/questions?courseId=${course.id}&page=2&limit=1`,
            admin.accessToken,
          );
        assert.equal(first.data.total, 2);
        assert.equal(first.data.data.length, 1);
        assert.equal(second.data.data.length, 1);
        assert.notEqual(first.data.data[0].id, second.data.data[0].id);
        for (const query of [
          'page=0',
          'limit=101',
          'active=invalid',
          'courseId=invalid',
          'difficulty=invalid',
        ])
          assert.equal((await request(`/admin/questions?${query}`, admin.accessToken)).status, 400);
      });
      await t.test('desativação preserva vínculos e impede uso público', async () => {
        assert.equal(
          (
            await request(`/admin/questions/${question.id}/status`, admin.accessToken, 'PATCH', {
              active: false,
            })
          ).status,
          200,
        );
        const inactive = await request(
          `/admin/questions?courseId=${course.id}&active=false`,
          admin.accessToken,
        );
        assert.equal(inactive.data.total, 1);
        assert.equal(
          (await request('/questions/random?difficulty=HARD', student.accessToken)).status,
          404,
        );
        assert.equal(
          (
            await request(`/admin/questions/${question.id}/status`, admin.accessToken, 'PATCH', {
              active: true,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(`/admin/subjects/${subject.id}`, admin.accessToken, 'PATCH', {
              active: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (await request('/questions/random?difficulty=HARD', student.accessToken)).status,
          404,
        );
        assert.equal(
          (
            await request(`/admin/questions/${question.id}`, admin.accessToken, 'PATCH', {
              active: true,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`/admin/subjects/${subject.id}`, admin.accessToken, 'PATCH', {
              active: true,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(`/admin/courses/${course.id}`, admin.accessToken, 'PATCH', {
              active: false,
            })
          ).status,
          200,
        );
        assert.equal(
          (await request('/courses')).data.some((item) => item.id === course.id),
          false,
        );
        assert.equal((await request('/auth/me', student.accessToken)).data.course.id, course.id);
        assert.equal(
          (await request(`/admin/questions/${question.id}`, admin.accessToken)).status,
          200,
        );
        assert.equal(
          (await request('/questions/random?difficulty=HARD', student.accessToken)).status,
          404,
        );
        assert.equal(
          (
            await request(`/admin/questions/${question.id}`, admin.accessToken, 'PATCH', {
              active: true,
            })
          ).status,
          400,
        );
      });
      await t.test('Swagger documenta administração e Banco protege perfil STUDENT', async () => {
        const docs = await request('/docs-json');
        for (const path of [
          '/admin/courses',
          '/admin/subjects',
          '/admin/questions',
          '/admin/questions/{id}/status',
        ])
          assert.ok(docs.data.paths[path]);
        await assert.rejects(
          pool.query('UPDATE users SET course_id=NULL,semester=NULL WHERE id=$1', [
            student.user.id,
          ]),
          /users_student_profile_check/,
        );
        await pool.query("UPDATE users SET role='STUDENT' WHERE id=$1", [admin.user.id]).then(
          () => assert.fail('SUPER_ADMIN sem perfil não pode virar STUDENT'),
          (error) => assert.match(error.message, /users_student_profile_check/),
        );
      });
    } finally {
      await pool.query(
        'ALTER TABLE question_options DROP CONSTRAINT IF EXISTS realeza_admin_test_failure',
      );
      await pool.query('DELETE FROM users WHERE registration = ANY($1::varchar[])', [
        registrations,
      ]);
      await pool.query('DELETE FROM questions WHERE course_id = ANY($1::uuid[])', [courseIds]);
      await pool.query('DELETE FROM subjects WHERE course_id = ANY($1::uuid[])', [courseIds]);
      await pool.query('DELETE FROM courses WHERE id = ANY($1::uuid[])', [courseIds]);
      await pool.end();
    }
  },
);
