import { useNavigate } from "react-router-dom";
import { Crown, DoorOpen, LogOut, Plus, Swords } from "lucide-react";
import MedievalScreen, { RealezaBrand } from "../../components/MedievalScreen";
import logoNassau from "../../assets/logo-nassau.png";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  return (
    <MedievalScreen className="home">
      <header className="home-header">
        <RealezaBrand compacta />
        <button className="home-sair" title="Sair" aria-label="Sair" onClick={() => navigate("/")}><LogOut aria-hidden="true" /></button>
      </header>
      <section className="home-menu" aria-label="Menu principal">
        <div className="home-emblema" aria-hidden="true"><Crown /><span>E</span><i /></div>
        <span className="home-saudacao">BEM-VINDO AO REINO</span>
        <h2>Saudações, Erick.</h2>
        <div className="home-jogador"><span>Análise e Desenvolvimento de Sistemas</span><span>2º período</span></div>
        <div className="home-divisor" aria-hidden="true"><span /><Crown /><span /></div>
        <button className="botao-real home-jogar" onClick={() => navigate("/sala")}><Swords aria-hidden="true" />Jogar</button>
        <div className="home-salas">
          <button className="botao-real botao-secundario" onClick={() => navigate("/sala")}><Plus aria-hidden="true" />Criar Sala</button>
          <button className="botao-real botao-secundario" onClick={() => navigate("/sala")}><DoorOpen aria-hidden="true" />Entrar em Sala</button>
        </div>
      </section>
      <footer className="home-footer"><img src={logoNassau} alt="Brasao Nassau" /><span>ADS · 2º período</span></footer>
    </MedievalScreen>
  );
}

export default Home;
