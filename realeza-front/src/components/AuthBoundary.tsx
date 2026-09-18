import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
export function SessionLoading() {
  const { retry, logout } = useAuth();
  return (
    <main className="preloader">
      <h1>Realeza</h1>
      <p role="alert">Não foi possível verificar sua sessão.</p>
      <button onClick={retry}>Tentar novamente</button>
      <button onClick={logout}>Voltar ao login</button>
    </main>
  );
}
export default function AuthBoundary() {
  const { user, status } = useAuth();
  if (status === 'loading')
    return (
      <main className="preloader" aria-busy="true">
        <h1>Realeza</h1>
        <p role="status">Verificando sessão...</p>
      </main>
    );
  if (status === 'error') return <SessionLoading />;
  return user ? <Outlet /> : <Navigate to="/" replace />;
}
