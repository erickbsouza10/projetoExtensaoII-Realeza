import type { CSSProperties } from 'react';
import { boardConfig, criarCircuito, type JogadorTabuleiro } from '../../data/boardConfig';
import PecaJogador from './PecaJogador';
import logoNassau from '../../assets/logo-nassau.png';
import './Tabuleiro.css';

interface Props {
  jogadores: JogadorTabuleiro[];
  jogadorMovendo: number | null;
  vencedor: JogadorTabuleiro | null;
}

const circuito = criarCircuito(boardConfig.quantidadeCasas);
const centroCasa = (posicao: number) => {
  const casa = circuito.caminho[Math.max(0, Math.min(posicao, circuito.caminho.length - 1))];
  return {
    x: ((casa.coluna + 0.5) * 100) / circuito.colunas,
    y: ((casa.linha + 0.5) * 100) / circuito.linhas,
  };
};

export default function Tabuleiro({ jogadores, jogadorMovendo, vencedor }: Props) {
  return (
    <section
      className="tabuleiro-secao"
      aria-label={`Circuito medieval de ${circuito.caminho.length} casas`}
    >
      <header className="tabuleiro-titulo">
        <h2>O caminho da coroa</h2>
        <span>{circuito.caminho.length} casas</span>
      </header>
      <div
        className="tabuleiro-moldura"
        style={
          {
            '--textura-casa': boardConfig.texturaCasa
              ? `url("${boardConfig.texturaCasa}")`
              : 'none',
            '--fundo-tabuleiro': boardConfig.fundoTabuleiro
              ? `url("${boardConfig.fundoTabuleiro}")`
              : 'none',
            '--duracao-passo': `${boardConfig.duracaoPasso}ms`,
          } as CSSProperties
        }
      >
        <div
          className="tabuleiro-circuito"
          style={{
            gridTemplateColumns: `repeat(${circuito.colunas}, 1fr)`,
            gridTemplateRows: `repeat(${circuito.linhas}, 1fr)`,
          }}
        >
          <div
            className="fortaleza"
            style={{ gridColumn: `2 / ${circuito.colunas}`, gridRow: `2 / ${circuito.linhas}` }}
          >
            <img className="fortaleza-logo" src={logoNassau} alt="Brasao Nassau" />
            <span className="fortaleza-status" role="status">
              {jogadorMovendo !== null
                ? `${jogadores.find((j) => j.id === jogadorMovendo)?.nome} está avançando`
                : vencedor
                  ? `${vencedor.nome} conquistou a coroa!`
                  : ''}
            </span>
          </div>
          {circuito.caminho.map((casa, index) => {
            const inicio = index === 0;
            const chegada = index === circuito.caminho.length - 1;
            const especial = boardConfig.casasEspeciais.find((item) => item.posicao === index);
            const proxima = circuito.caminho[index + 1];
            const direcao = proxima
              ? proxima.coluna > casa.coluna
                ? 'direita'
                : proxima.coluna < casa.coluna
                  ? 'esquerda'
                  : proxima.linha > casa.linha
                    ? 'baixo'
                    : 'cima'
              : '';
            return (
              <div
                key={index}
                className={`casa-tabuleiro ${inicio ? 'casa-inicio' : chegada ? 'casa-chegada' : especial ? 'casa-especial' : ''}`}
                style={{ gridColumn: casa.coluna + 1, gridRow: casa.linha + 1 }}
                aria-label={`Casa ${index + 1}${inicio ? ', início' : chegada ? ', chegada' : especial ? `, ${especial.nome}` : ''}`}
              >
                <span className="casa-numero">{String(index + 1).padStart(2, '0')}</span>
                <span className="casa-gravura" aria-hidden="true">
                  {chegada && boardConfig.imagemChegada ? (
                    <img src={boardConfig.imagemChegada} alt="" />
                  ) : inicio ? (
                    '⚑'
                  ) : chegada ? (
                    '♛'
                  ) : (
                    especial?.simbolo || '✧'
                  )}
                </span>
                {(inicio || chegada) && (
                  <span className="casa-legenda">{inicio ? 'INÍCIO' : 'CHEGADA'}</span>
                )}
                {proxima && (
                  <span className={`casa-conexao conexao-${direcao}`} aria-hidden="true" />
                )}
              </div>
            );
          })}
          {jogadores.map((jogador) => {
            const colegas = jogadores.filter((item) => item.posicao === jogador.posicao);
            const deslocamento =
              (colegas.findIndex((item) => item.id === jogador.id) - (colegas.length - 1) / 2) * 22;
            return (
              <PecaJogador
                key={jogador.id}
                jogador={jogador}
                {...centroCasa(jogador.posicao)}
                deslocamento={deslocamento}
                movendo={jogadorMovendo === jogador.id}
              />
            );
          })}
        </div>
      </div>
      <div className="tabuleiro-legenda">
        {jogadores.map((j) => (
          <span key={j.id}>
            <i style={{ background: j.cor }} />
            {j.nome}
            <small>
              {j.posicao + 1}/{circuito.caminho.length}
            </small>
          </span>
        ))}
      </div>
    </section>
  );
}
