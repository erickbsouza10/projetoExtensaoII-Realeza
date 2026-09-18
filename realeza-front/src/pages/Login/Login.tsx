import { Navigate, useNavigate } from 'react-router-dom';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, UserRound } from 'lucide-react';
import MedievalScreen, { RealezaBrand } from '../../components/MedievalScreen';
import { useAuth } from '../../contexts/auth-context';
import { SessionLoading } from '../../components/AuthBoundary';
import { api, ApiError, type Course } from '../../services/api';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const recuperacao = useRef<HTMLDialogElement>(null);
  const [cadastro, setCadastro] = useState(false);
  const [registration, setRegistration] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [name, setName] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');
  const course = courses.find((item) => item.id === courseId);

  async function carregarCursos() {
    setLoadingCourses(true);
    try {
      const catalog = await api<Course[]>('/courses');
      setCourses(catalog);
      if (!catalog.length) setError('Nenhum curso disponível para cadastro.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível carregar os cursos.');
    } finally {
      setLoadingCourses(false);
    }
  }
  async function primeiroAcesso() {
    setError('');
    setCadastro(true);
    await carregarCursos();
  }
  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (cadastro && password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      if (cadastro)
        await auth.register({
          registration: registration.trim(),
          password,
          name: name.trim(),
          courseId,
          semester,
        });
      else await auth.login({ registration: registration.trim(), password });
      navigate('/home', { replace: true });
    } catch (error) {
      if (!cadastro && error instanceof ApiError && error.code === 'USER_NOT_REGISTERED')
        await primeiroAcesso();
      else setError(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }
  if (auth.status === 'loading')
    return (
      <main className="preloader">
        <h1>Realeza</h1>
        <p role="status">Verificando sessão...</p>
      </main>
    );
  if (auth.status === 'error') return <SessionLoading />;
  if (auth.user) return <Navigate to="/home" replace />;

  return (
    <MedievalScreen className={`login${cadastro ? ' login-cadastro' : ''}`}>
      <div className="login-conteudo">
        <RealezaBrand />
        <p className="login-frase">
          {cadastro
            ? 'Primeiro acesso — prepare sua entrada no reino.'
            : 'Conquiste a coroa com seu conhecimento.'}
        </p>
        {cadastro && <h2 className="cadastro-titulo">Criar conta</h2>}
        <form className="login-formulario" onSubmit={entrar} aria-busy={busy}>
          {cadastro && (
            <>
              <label htmlFor="nome">Nome</label>
              <div className="login-campo">
                <UserRound aria-hidden="true" />
                <input
                  id="nome"
                  autoComplete="name"
                  required
                  maxLength={150}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy}
                />
              </div>
            </>
          )}
          <label htmlFor="matricula">Matrícula</label>
          <div className="login-campo">
            <UserRound aria-hidden="true" />
            <input
              id="matricula"
              name="matricula"
              type="text"
              autoComplete="username"
              required
              maxLength={50}
              placeholder="Sua matrícula"
              value={registration}
              onChange={(event) => setRegistration(event.target.value)}
              disabled={busy}
            />
          </div>
          {cadastro && (
            <>
              <label htmlFor="curso">Curso</label>
              <div className="login-campo">
                <select
                  id="curso"
                  required
                  value={courseId}
                  onChange={(event) => {
                    setCourseId(event.target.value);
                    setSemester(1);
                  }}
                  disabled={busy || loadingCourses}
                >
                  <option value="">
                    {loadingCourses ? 'Carregando cursos...' : 'Selecione seu curso'}
                  </option>
                  {courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>
              {!courses.length && !loadingCourses && (
                <button
                  type="button"
                  className="link-real"
                  onClick={() => {
                    setError('');
                    void carregarCursos();
                  }}
                >
                  Recarregar cursos
                </button>
              )}
              <label htmlFor="periodo">Período atual</label>
              <div className="login-campo">
                <select
                  id="periodo"
                  required
                  disabled={!course || busy}
                  value={semester}
                  onChange={(event) => setSemester(Number(event.target.value))}
                >
                  {Array.from({ length: course?.totalSemesters ?? 0 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}º período
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <label htmlFor="senha">Senha{cadastro ? ' (mínimo 8 caracteres)' : ''}</label>
          <div className="login-campo">
            <KeyRound aria-hidden="true" />
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete={cadastro ? 'new-password' : 'current-password'}
              required
              minLength={cadastro ? 8 : undefined}
              maxLength={72}
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
          </div>
          {cadastro && (
            <>
              <label htmlFor="confirmar-senha">Confirmar senha</label>
              <div className="login-campo">
                <KeyRound aria-hidden="true" />
                <input
                  id="confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy}
                />
              </div>
            </>
          )}
          {error && (
            <p className="login-erro" role="alert">
              {error}
            </p>
          )}
          {!cadastro && (
            <button
              type="button"
              className="link-real login-recuperar"
              onClick={() => recuperacao.current?.showModal()}
            >
              Esqueceu sua senha?
            </button>
          )}
          <button
            type="submit"
            className="botao-real login-entrar"
            disabled={busy || (cadastro && (!course || loadingCourses))}
          >
            {busy ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar'}{' '}
            <ArrowRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className="link-real"
            disabled={busy || loadingCourses}
            onClick={() => {
              if (cadastro) {
                setCadastro(false);
                setError('');
              } else void primeiroAcesso();
            }}
          >
            {cadastro ? 'Voltar ao login' : 'Primeiro acesso / Criar conta'}
          </button>
        </form>
        {!cadastro && (
          <>
            <div className="login-separador">
              <span />
              ou
              <span />
            </div>
            <button
              className="botao-real botao-secundario login-google"
              disabled
              title="Google OAuth ainda não configurado"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="google-icone">
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.41 13.93a6 6 0 0 1 0-3.86V7.48H3.07a10 10 0 0 0 0 9.04l3.34-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z"
                />
              </svg>
              Google — indisponível
            </button>
          </>
        )}
      </div>
      <dialog ref={recuperacao} className="dialogo-real" aria-labelledby="recuperacao-titulo">
        <h2 id="recuperacao-titulo">Recuperar senha</h2>
        <p>
          A recuperação de senha ainda está em desenvolvimento. Para criar sua conta, utilize
          Primeiro acesso.
        </p>
        <button className="botao-real" onClick={() => recuperacao.current?.close()}>
          Voltar ao login
        </button>
      </dialog>
    </MedievalScreen>
  );
}
export default Login;
