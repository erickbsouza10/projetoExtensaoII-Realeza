import { useNavigate } from 'react-router-dom';
import { Crown, DoorOpen, LogOut, Plus, Swords } from 'lucide-react';
import MedievalScreen, { RealezaBrand } from '../../components/MedievalScreen';
import logoNassau from '../../assets/logo-nassau.png';
import './Home.css';
import { useAuth } from '../../contexts/auth-context';

function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <MedievalScreen className="home">
      <header className="home-header">
        <RealezaBrand compacta />
        <button
          className="home-sair"
          title="Sair"
          aria-label="Sair"
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
        >
          <LogOut aria-hidden="true" />
        </button>
      </header>
      <section className="home-menu" aria-label="Menu principal">
        <div className="home-emblema" aria-hidden="true">
          <Crown />
          <span>{user.name.charAt(0).toUpperCase()}</span>
          <i />
        </div>
        <span className="home-saudacao">BEM-VINDO AO REINO</span>
        <h2>Saudações, {user.name}.</h2>
        <div className="home-jogador">
          <span>
            {user.course ? `${user.course.name} (${user.course.code})` : 'Administração do reino'}
          </span>
          {user.semester !== null && <span>{user.semester}º período</span>}
        </div>
        <div className="home-divisor" aria-hidden="true">
          <span />
          <Crown />
          <span />
        </div>
        <button className="botao-real home-jogar" onClick={() => navigate('/sala')}>
          <Swords aria-hidden="true" />
          Jogar
        </button>
        {user.role === 'SUPER_ADMIN' && (
          <button
            className="botao-real botao-secundario home-admin"
            onClick={() => navigate('/admin')}
          >
            Painel Administrativo
          </button>
        )}
        <div className="home-salas">
          <button className="botao-real botao-secundario" onClick={() => navigate('/sala')}>
            <Plus aria-hidden="true" />
            Criar Sala
          </button>
          <button className="botao-real botao-secundario" onClick={() => navigate('/sala')}>
            <DoorOpen aria-hidden="true" />
            Entrar em Sala
          </button>
        </div>
      </section>
      <footer className="home-footer">
        <img src={logoNassau} alt="Brasao Nassau" />
        <span>
          {user.course ? `${user.course.code} · ${user.semester}º período` : 'Painel Real'}
        </span>
      </footer>
    </MedievalScreen>
  );
}

export default Home;
