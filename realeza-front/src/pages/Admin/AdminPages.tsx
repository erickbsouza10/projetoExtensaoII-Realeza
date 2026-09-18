import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  adminApi,
  adminQuery,
  type AdminCourse,
  type AdminSubject,
  type AdminQuestion,
  type AdminStats,
  type Difficulty,
  type QuestionPage,
} from '../../services/admin';
import { useAdminResource } from './useAdminResource';

type Notice = { kind: 'success' | 'error'; text: string } | null;
const difficulties: Record<Difficulty, string> = {
  EASY: 'Fácil',
  MEDIUM: 'Médio',
  HARD: 'Difícil',
};
function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.';
}
function Feedback({ notice }: { notice: Notice }) {
  return (
    notice && (
      <p
        className={`admin-notice ${notice.kind}`}
        role={notice.kind === 'error' ? 'alert' : 'status'}
      >
        {notice.text}
      </p>
    )
  );
}
function ResourceState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return (
    <>
      {loading && <p role="status">Carregando catálogo...</p>}
      {error && (
        <div className="admin-notice error" role="alert">
          {error}
          <button type="button" className="link-real" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      )}
    </>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span className={`admin-status ${active ? 'active' : ''}`}>{active ? 'Ativa' : 'Inativa'}</span>
  );
}
function CourseSelect({
  courses,
  value,
  onChange,
  id,
  all = false,
  disabled = false,
}: {
  courses: AdminCourse[];
  value: string;
  onChange: (value: string) => void;
  id: string;
  all?: boolean;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id}>
      Curso
      <select
        id={id}
        value={value}
        required={!all}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{all ? 'Todos os cursos' : 'Selecione um curso'}</option>
        {courses.map((course) => (
          <option value={course.id} key={course.id}>
            {course.name} ({course.code}){course.active ? '' : ' — inativo'}
          </option>
        ))}
      </select>
    </label>
  );
}
function SemesterSelect({
  course,
  value,
  onChange,
  id,
  all = false,
  disabled = false,
}: {
  course?: AdminCourse;
  value: string | number;
  onChange: (value: string) => void;
  id: string;
  all?: boolean;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id}>
      Período
      <select
        id={id}
        value={value}
        required={!all}
        disabled={!course || disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {all && <option value="">Todos os períodos</option>}
        {Array.from({ length: course?.totalSemesters ?? 0 }, (_, index) => (
          <option value={index + 1} key={index + 1}>
            {index + 1}º período
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminDashboard() {
  const resource = useAdminResource<AdminStats>('/stats');
  return (
    <section>
      <h2>O catálogo do reino</h2>
      <p className="admin-intro">Organize os cursos, suas disciplinas e os desafios dos alunos.</p>
      <ResourceState {...resource} />
      {resource.data && (
        <div className="admin-dashboard">
          {[
            { path: 'cursos', name: 'Cursos', count: resource.data.courses },
            { path: 'disciplinas', name: 'Disciplinas', count: resource.data.subjects },
            { path: 'questoes', name: 'Questões', count: resource.data.questions },
          ].map((item) => (
            <Link className="admin-panel" to={`/admin/${item.path}`} key={item.path}>
              <strong>{item.count}</strong>
              <h3>{item.name}</h3>
              <span>Administrar →</span>
            </Link>
          ))}
        </div>
      )}
      <p className="admin-intro">
        Os totais incluem registros ativos e inativos. Desativar preserva o histórico e os vínculos
        existentes.
      </p>
    </section>
  );
}

export function AdminCourses() {
  const resource = useAdminResource<AdminCourse[]>('/courses');
  const empty = { name: '', code: '', totalSemesters: 5, active: true };
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  function reset() {
    setEditing(null);
    setDraft(empty);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await adminApi(
        editing ? `/courses/${editing}` : '/courses',
        editing ? 'PATCH' : 'POST',
        draft,
      );
      setNotice({ kind: 'success', text: editing ? 'Curso atualizado.' : 'Curso cadastrado.' });
      reset();
      resource.reload();
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  async function toggle(course: AdminCourse) {
    setBusy(true);
    setNotice(null);
    try {
      await adminApi(`/courses/${course.id}`, 'PATCH', { active: !course.active });
      resource.reload();
      setNotice({
        kind: 'success',
        text: course.active ? 'Curso desativado. Os vínculos foram preservados.' : 'Curso ativado.',
      });
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Cursos</h2>
      <Feedback notice={notice} />
      <div className="admin-grid">
        <form className="admin-panel admin-form" onSubmit={save} aria-busy={busy}>
          <h3>{editing ? 'Editar curso' : 'Novo curso'}</h3>
          <fieldset disabled={busy}>
            <label htmlFor="course-name">
              Nome
              <input
                id="course-name"
                required
                maxLength={150}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label htmlFor="course-code">
              Código
              <input
                id="course-code"
                required
                maxLength={30}
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
              />
            </label>
            <label htmlFor="course-semesters">
              Quantidade de períodos
              <input
                id="course-semesters"
                type="number"
                min={1}
                max={100}
                required
                value={draft.totalSemesters}
                onChange={(event) =>
                  setDraft({ ...draft, totalSemesters: Number(event.target.value) })
                }
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
              />
              Curso ativo
            </label>
            <div className="admin-actions">
              <button className="botao-real" type="submit">
                {busy ? 'Salvando...' : editing ? 'Salvar curso' : 'Cadastrar curso'}
              </button>
              {editing && (
                <button className="botao-real botao-secundario" type="button" onClick={reset}>
                  Cancelar
                </button>
              )}
            </div>
          </fieldset>
        </form>
        <div>
          <ResourceState {...resource} />
          <div className="admin-list">
            {resource.data?.map((course) => (
              <article className="admin-panel admin-row" data-id={course.id} key={course.id}>
                <div>
                  <h3>{course.name}</h3>
                  <p>
                    {course.code} · {course.totalSemesters} períodos
                  </p>
                  <Status active={course.active} />
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="botao-real botao-secundario"
                    disabled={busy}
                    onClick={() => {
                      setEditing(course.id);
                      setDraft({
                        name: course.name,
                        code: course.code,
                        totalSemesters: course.totalSemesters,
                        active: course.active,
                      });
                      setNotice(null);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="link-real"
                    disabled={busy}
                    onClick={() => void toggle(course)}
                  >
                    {course.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {resource.data?.length === 0 && <p>Nenhum curso cadastrado.</p>}
        </div>
      </div>
    </section>
  );
}

export function AdminSubjects() {
  const courses = useAdminResource<AdminCourse[]>('/courses');
  const [filter, setFilter] = useState({ courseId: '', semester: '' });
  const resource = useAdminResource<AdminSubject[]>(`/subjects?${adminQuery(filter)}`);
  const empty = { name: '', courseId: '', semester: 1, active: true };
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const catalog = courses.data ?? [];
  function reset() {
    setEditing(null);
    setDraft(empty);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await adminApi(
        editing ? `/subjects/${editing}` : '/subjects',
        editing ? 'PATCH' : 'POST',
        draft,
      );
      setNotice({
        kind: 'success',
        text: editing ? 'Disciplina atualizada.' : 'Disciplina cadastrada.',
      });
      reset();
      resource.reload();
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  async function toggle(subject: AdminSubject) {
    setBusy(true);
    setNotice(null);
    try {
      await adminApi(`/subjects/${subject.id}`, 'PATCH', { active: !subject.active });
      resource.reload();
      setNotice({
        kind: 'success',
        text: subject.active ? 'Disciplina desativada.' : 'Disciplina ativada.',
      });
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Disciplinas</h2>
      <Feedback notice={notice} />
      <ResourceState {...courses} />
      <div className="admin-grid">
        <form className="admin-panel admin-form" onSubmit={save} aria-busy={busy}>
          <h3>{editing ? 'Editar disciplina' : 'Nova disciplina'}</h3>
          <fieldset disabled={busy || courses.loading}>
            <CourseSelect
              id="subject-course"
              courses={catalog}
              value={draft.courseId}
              onChange={(courseId) => setDraft({ ...draft, courseId, semester: 1 })}
            />
            <SemesterSelect
              id="subject-semester"
              course={catalog.find((course) => course.id === draft.courseId)}
              value={draft.semester}
              onChange={(semester) => setDraft({ ...draft, semester: Number(semester) })}
            />
            <label htmlFor="subject-name">
              Nome
              <input
                id="subject-name"
                required
                maxLength={150}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
              />
              Disciplina ativa
            </label>
            <div className="admin-actions">
              <button className="botao-real" type="submit" disabled={!draft.courseId}>
                {busy ? 'Salvando...' : editing ? 'Salvar disciplina' : 'Cadastrar disciplina'}
              </button>
              {editing && (
                <button className="botao-real botao-secundario" type="button" onClick={reset}>
                  Cancelar
                </button>
              )}
            </div>
          </fieldset>
        </form>
        <div>
          <div className="admin-filters">
            <CourseSelect
              id="subject-filter-course"
              courses={catalog}
              all
              value={filter.courseId}
              onChange={(courseId) => setFilter({ courseId, semester: '' })}
            />
            <SemesterSelect
              id="subject-filter-semester"
              all
              course={catalog.find((course) => course.id === filter.courseId)}
              value={filter.semester}
              onChange={(semester) => setFilter({ ...filter, semester })}
            />
          </div>
          <ResourceState {...resource} />
          <div className="admin-list">
            {resource.data?.map((subject) => (
              <article className="admin-panel admin-row" data-id={subject.id} key={subject.id}>
                <div>
                  <h3>{subject.name}</h3>
                  <p>
                    {subject.course.code} · {subject.semester}º período
                  </p>
                  <Status active={subject.active} />
                </div>
                <div className="admin-actions">
                  <button
                    type="button"
                    className="botao-real botao-secundario"
                    disabled={busy}
                    onClick={() => {
                      setEditing(subject.id);
                      setDraft({
                        name: subject.name,
                        courseId: subject.course.id,
                        semester: subject.semester,
                        active: subject.active,
                      });
                      setNotice(null);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="link-real"
                    disabled={busy}
                    onClick={() => void toggle(subject)}
                  >
                    {subject.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {resource.data?.length === 0 && <p>Nenhuma disciplina encontrada.</p>}
        </div>
      </div>
    </section>
  );
}

type QuestionDraft = {
  courseId: string;
  semester: number;
  subjectId: string;
  difficulty: Difficulty;
  statement: string;
  alternatives: string[];
  correct: number;
  active: boolean;
};
const emptyQuestion = (): QuestionDraft => ({
  courseId: '',
  semester: 1,
  subjectId: '',
  difficulty: 'EASY',
  statement: '',
  alternatives: ['', '', '', ''],
  correct: 0,
  active: true,
});
export function AdminQuestions() {
  const courses = useAdminResource<AdminCourse[]>('/courses');
  const subjects = useAdminResource<AdminSubject[]>('/subjects');
  const [filter, setFilter] = useState({
    courseId: '',
    semester: '',
    subjectId: '',
    difficulty: '',
    active: '',
  });
  const [page, setPage] = useState(1);
  const resource = useAdminResource<QuestionPage>(
    `/questions?${adminQuery({ ...filter, page, limit: 20 })}`,
  );
  const [draft, setDraft] = useState<QuestionDraft>(emptyQuestion);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const catalog = courses.data ?? [],
    disciplines = subjects.data ?? [];
  const formSubjects = disciplines.filter(
    (subject) => subject.course.id === draft.courseId && subject.semester === draft.semester,
  );
  const filterSubjects = disciplines.filter(
    (subject) =>
      (!filter.courseId || subject.course.id === filter.courseId) &&
      (!filter.semester || subject.semester === Number(filter.semester)),
  );
  function changeFilter(value: Partial<typeof filter>) {
    setFilter({ ...filter, ...value });
    setPage(1);
  }
  function reset() {
    setEditing(null);
    setDraft(emptyQuestion());
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const payload = {
      courseId: draft.courseId,
      semester: draft.semester,
      subjectId: draft.subjectId,
      difficulty: draft.difficulty,
      statement: draft.statement,
      active: draft.active,
      options: draft.alternatives.map((text, index) => ({
        text,
        isCorrect: index === draft.correct,
      })),
    };
    try {
      await adminApi(
        editing ? `/questions/${editing}` : '/questions',
        editing ? 'PATCH' : 'POST',
        payload,
      );
      setNotice({ kind: 'success', text: editing ? 'Questão atualizada.' : 'Questão cadastrada.' });
      reset();
      setPage(1);
      resource.reload();
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  async function edit(id: string) {
    setBusy(true);
    setNotice(null);
    try {
      const question = await adminApi<AdminQuestion>(`/questions/${id}`);
      setEditing(question.id);
      setDraft({
        courseId: question.course.id,
        semester: question.semester,
        subjectId: question.subject.id,
        difficulty: question.difficulty,
        statement: question.statement,
        active: question.active,
        alternatives: question.options.map((option) => option.text),
        correct: question.options.findIndex((option) => option.isCorrect),
      });
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  async function toggle(question: AdminQuestion) {
    setBusy(true);
    setNotice(null);
    try {
      await adminApi(`/questions/${question.id}/status`, 'PATCH', { active: !question.active });
      resource.reload();
      setNotice({
        kind: 'success',
        text: question.active ? 'Questão desativada.' : 'Questão ativada.',
      });
    } catch (error) {
      setNotice({ kind: 'error', text: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Questões</h2>
      <Feedback notice={notice} />
      <ResourceState {...courses} />
      <ResourceState {...subjects} />
      <form className="admin-panel admin-form question-form" onSubmit={save} aria-busy={busy}>
        <h3>{editing ? 'Editar questão' : 'Nova questão'}</h3>
        <fieldset disabled={busy || courses.loading || subjects.loading}>
          <div className="admin-fields">
            <CourseSelect
              id="question-course"
              courses={catalog}
              value={draft.courseId}
              onChange={(courseId) => setDraft({ ...draft, courseId, semester: 1, subjectId: '' })}
            />
            <SemesterSelect
              id="question-semester"
              course={catalog.find((course) => course.id === draft.courseId)}
              value={draft.semester}
              onChange={(semester) =>
                setDraft({ ...draft, semester: Number(semester), subjectId: '' })
              }
            />
            <label htmlFor="question-subject">
              Disciplina
              <select
                id="question-subject"
                required
                disabled={!draft.courseId}
                value={draft.subjectId}
                onChange={(event) => setDraft({ ...draft, subjectId: event.target.value })}
              >
                <option value="">Selecione uma disciplina</option>
                {formSubjects.map((subject) => (
                  <option value={subject.id} key={subject.id}>
                    {subject.name}
                    {subject.active ? '' : ' — inativa'}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="question-difficulty">
              Dificuldade
              <select
                id="question-difficulty"
                value={draft.difficulty}
                onChange={(event) =>
                  setDraft({ ...draft, difficulty: event.target.value as Difficulty })
                }
              >
                {Object.entries(difficulties).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {draft.courseId && formSubjects.length === 0 && (
            <p className="admin-intro">
              Cadastre uma disciplina para este curso e período em Disciplinas.
            </p>
          )}
          <label htmlFor="question-statement">
            Pergunta
            <textarea
              id="question-statement"
              rows={4}
              required
              maxLength={10000}
              value={draft.statement}
              onChange={(event) => setDraft({ ...draft, statement: event.target.value })}
            />
          </label>
          <div className="admin-fields alternatives-fields">
            {draft.alternatives.map((text, index) => (
              <label htmlFor={`option-${index}`} key={index}>
                Alternativa {String.fromCharCode(65 + index)}
                <input
                  id={`option-${index}`}
                  required
                  maxLength={2000}
                  value={text}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      alternatives: draft.alternatives.map((item, position) =>
                        position === index ? event.target.value : item,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <fieldset className="correct-options">
            <legend>Resposta correta</legend>
            {draft.alternatives.map((_, index) => (
              <label key={index}>
                <input
                  type="radio"
                  name="correct"
                  value={index}
                  checked={draft.correct === index}
                  onChange={() => setDraft({ ...draft, correct: index })}
                />
                {String.fromCharCode(65 + index)}
              </label>
            ))}
          </fieldset>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) => setDraft({ ...draft, active: event.target.checked })}
            />
            Questão ativa
          </label>
          <div className="admin-actions">
            <button className="botao-real" type="submit" disabled={!draft.subjectId}>
              {busy ? 'Salvando...' : editing ? 'Salvar questão' : 'Cadastrar questão'}
            </button>
            {editing && (
              <button className="botao-real botao-secundario" type="button" onClick={reset}>
                Cancelar
              </button>
            )}
          </div>
        </fieldset>
      </form>
      <div className="admin-panel admin-filters question-filters">
        <CourseSelect
          id="filter-course"
          courses={catalog}
          all
          value={filter.courseId}
          onChange={(courseId) => changeFilter({ courseId, semester: '', subjectId: '' })}
        />
        <SemesterSelect
          id="filter-semester"
          all
          course={catalog.find((course) => course.id === filter.courseId)}
          value={filter.semester}
          onChange={(semester) => changeFilter({ semester, subjectId: '' })}
        />
        <label htmlFor="filter-subject">
          Disciplina
          <select
            id="filter-subject"
            value={filter.subjectId}
            onChange={(event) => changeFilter({ subjectId: event.target.value })}
          >
            <option value="">Todas as disciplinas</option>
            {filterSubjects.map((subject) => (
              <option value={subject.id} key={subject.id}>
                {subject.name} · {subject.course.code} · {subject.semester}º
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="filter-difficulty">
          Dificuldade
          <select
            id="filter-difficulty"
            value={filter.difficulty}
            onChange={(event) => changeFilter({ difficulty: event.target.value })}
          >
            <option value="">Todas as dificuldades</option>
            {Object.entries(difficulties).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="filter-status">
          Status
          <select
            id="filter-status"
            value={filter.active}
            onChange={(event) => changeFilter({ active: event.target.value })}
          >
            <option value="">Todos os status</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </select>
        </label>
        <button
          type="button"
          className="link-real"
          onClick={() => {
            setFilter({ courseId: '', semester: '', subjectId: '', difficulty: '', active: '' });
            setPage(1);
          }}
        >
          Limpar filtros
        </button>
      </div>
      <ResourceState {...resource} />
      <div className="admin-list questions-list">
        {resource.data?.data.map((question) => (
          <article className="admin-panel" data-id={question.id} key={question.id}>
            <div className="question-meta">
              <strong>{question.subject.name}</strong>
              <span>
                {question.course.code} · {question.semester}º período ·{' '}
                {difficulties[question.difficulty]}
              </span>
              <Status active={question.active} />
            </div>
            <h3>{question.statement}</h3>
            <div className="admin-actions">
              <button
                type="button"
                className="botao-real botao-secundario"
                disabled={busy}
                onClick={() => void edit(question.id)}
              >
                Editar
              </button>
              <button
                type="button"
                className="link-real"
                disabled={busy}
                onClick={() => void toggle(question)}
              >
                {question.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </article>
        ))}
      </div>
      {resource.data && (
        <>
          <p className="admin-intro">
            {resource.data.total === 0
              ? 'Nenhuma questão encontrada.'
              : `${resource.data.total} questão(ões) encontrada(s).`}
          </p>
          <div className="admin-pagination">
            <button
              type="button"
              className="botao-real botao-secundario"
              disabled={page <= 1 || busy}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {Math.max(1, Math.ceil(resource.data.total / resource.data.limit))}
            </span>
            <button
              type="button"
              className="botao-real botao-secundario"
              disabled={page * resource.data.limit >= resource.data.total || busy}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </section>
  );
}
