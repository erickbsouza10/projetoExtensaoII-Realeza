import { useNavigate } from "react-router-dom";
import { useRef, type FormEvent } from "react";
import { ArrowRight, KeyRound, UserRound } from "lucide-react";
import MedievalScreen, { RealezaBrand } from "../../components/MedievalScreen";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const recuperacao = useRef<HTMLDialogElement>(null);

  function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("/home");
  }

  return (
    <MedievalScreen className="login">
      <div className="login-conteudo">
        <RealezaBrand />
        <p className="login-frase">Conquiste a coroa com seu conhecimento.</p>
        <form className="login-formulario" onSubmit={entrar}>
          <label htmlFor="matricula">Matrícula</label>
          <div className="login-campo"><UserRound aria-hidden="true" /><input id="matricula" name="matricula" type="text" autoComplete="username" placeholder="Sua matrícula" /></div>
          <label htmlFor="senha">Senha</label>
          <div className="login-campo"><KeyRound aria-hidden="true" /><input id="senha" name="senha" type="password" autoComplete="current-password" placeholder="Sua senha" /></div>
          <button type="button" className="link-real login-recuperar" onClick={() => recuperacao.current?.showModal()}>Esqueceu sua senha?</button>
          <button type="submit" className="botao-real login-entrar">Entrar <ArrowRight aria-hidden="true" /></button>
        </form>
        <div className="login-separador"><span />ou<span /></div>
        <button className="botao-real botao-secundario login-google" onClick={() => navigate("/home")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="google-icone">
            <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.41 13.93a6 6 0 0 1 0-3.86V7.48H3.07a10 10 0 0 0 0 9.04l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.59C7.2 7.71 9.4 5.95 12 5.95Z" />
          </svg>
          Continuar com Google
        </button>
      </div>
      <dialog ref={recuperacao} className="dialogo-real" aria-labelledby="recuperacao-titulo">
        <h2 id="recuperacao-titulo">Recuperar senha</h2>
        <p>A recuperação de senha estará disponível quando sua conta estiver conectada. Por enquanto, entre com matrícula ou Google para continuar a partida.</p>
        <button className="botao-real" onClick={() => recuperacao.current?.close()}>Voltar ao login</button>
      </dialog>
    </MedievalScreen>
  );
}

export default Login;
