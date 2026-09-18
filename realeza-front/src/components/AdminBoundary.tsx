import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
export default function AdminBoundary() {
  const { user } = useAuth();
  return user?.role === 'SUPER_ADMIN' ? <Outlet /> : <Navigate to="/home" replace />;
}
