import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import MedievalScreen, { RealezaBrand } from '../../components/MedievalScreen';
import { useAuth } from '../../contexts/auth-context';
import './Admin.css';
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <MedievalScreen className="admin-shell">
      <header className="admin-header">
        <RealezaBrand compacta />
        <div className="admin-account">
          <span>{user?.name}</span>
          <Link to="/home">Voltar à Home</Link>
          <button
            className="home-sair"
            aria-label="Sair"
            onClick={() => {
              logout();
              navigate('/', { replace: true });
            }}
          >
            <LogOut aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="admin-heading">
        <span>ADMINISTRAÇÃO DO REINO</span>
        <h1>Painel Real</h1>
      </div>
      <nav className="admin-nav" aria-label="Administração">
        <NavLink to="/admin" end>
          Visão geral
        </NavLink>
        <NavLink to="/admin/cursos">Cursos</NavLink>
        <NavLink to="/admin/disciplinas">Disciplinas</NavLink>
        <NavLink to="/admin/questoes">Questões</NavLink>
      </nav>
      <div className="admin-content">
        <Outlet />
      </div>
    </MedievalScreen>
  );
}
