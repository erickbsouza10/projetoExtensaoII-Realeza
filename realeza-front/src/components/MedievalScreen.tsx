import type { MouseEvent, ReactNode } from "react";
import logoNassau from "../assets/logo-nassau.png";
import { tocarSomMenu } from "../utils/menuSound";
import "./MedievalScreen.css";

export function RealezaBrand({ compacta = false }: { compacta?: boolean }) {
  return <div className={`realeza-brand${compacta ? " brand-compacta" : ""}`}>
    <img className="realeza-brasao" src={logoNassau} alt="Brasao Nassau" />
    <div><h1>REALEZA</h1><span>O reino do conhecimento</span></div>
  </div>;
}

export default function MedievalScreen({ children, className }: { children: ReactNode; className: string }) {
  function somDoBotao(event: MouseEvent<HTMLElement>) {
    const botao = event.target instanceof Element ? event.target.closest("button") : null;
    if (botao && !botao.disabled) tocarSomMenu();
  }

  return <main className={`realeza-screen ${className}`} onClickCapture={somDoBotao}>
    <div className="realeza-background" aria-hidden="true" />
    <div className="realeza-ornamento ornamento-superior" aria-hidden="true" />
    <div className="realeza-ornamento ornamento-inferior" aria-hidden="true" />
    {children}
  </main>;
}
