import type { CSSProperties } from 'react';
import type { JogadorTabuleiro } from '../../data/boardConfig';

interface Props {
  jogador: JogadorTabuleiro;
  x: number;
  y: number;
  deslocamento: number;
  movendo: boolean;
}

export default function PecaJogador({ jogador, x, y, deslocamento, movendo }: Props) {
  return (
    <div
      className={`peca-jogador${movendo ? ' peca-movendo' : ''}`}
      style={
        {
          left: `calc(${x}% + ${x / 100 - 0.5} * var(--gap-circuito))`,
          top: `calc(${y}% + ${y / 100 - 0.5} * var(--gap-circuito))`,
          '--cor-peca': jogador.cor,
          '--deslocamento': `${(deslocamento / 34) * 100}%`,
        } as CSSProperties
      }
      title={`${jogador.nome} · Casa ${jogador.posicao + 1}`}
      aria-label={`${jogador.nome}, casa ${jogador.posicao + 1}`}
      data-jogador={jogador.id}
      data-posicao={jogador.posicao}
    >
      {jogador.imagem ? (
        <img src={jogador.imagem} alt="" />
      ) : (
        <span className="miniatura" aria-hidden="true">
          <span className="miniatura-elmo" />
          <span className="miniatura-capa" />
          <span className="miniatura-escudo">{jogador.nome.charAt(0)}</span>
          <span className="miniatura-base" />
        </span>
      )}
    </div>
  );
}
