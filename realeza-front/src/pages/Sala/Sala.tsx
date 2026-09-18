import { useEffect, useEffectEvent, useRef, useState } from "react";
import { perguntas, type Dificuldade } from "../../data/gameData";
import { imagensDados } from "../../data/imageAssets";
import { boardConfig, type JogadorTabuleiro } from "../../data/boardConfig";
import Tabuleiro from "../../components/tabuleiro/Tabuleiro";
import "./Sala.css";
import { useNavigate } from "react-router-dom";

const jogadoresIniciais: JogadorTabuleiro[] = [
  {
    id: 1,
    nome: "Erick",
    posicao: 0,
    cor: "#337e70",
  },
  {
    id: 2,
    nome: "Arthur",
    posicao: 0,
    cor: "#a74751",
  },
];

function Sala() {
  const navigate = useNavigate();
  const prazo = useRef(0);
  const respostaBloqueada = useRef(false);
  const [tempo, setTempo] = useState(10000);
  const animacaoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultadoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const respostaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movimentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rodadaBloqueada = useRef(false);

  useEffect(() => () => {
    if (animacaoRef.current !== null) clearInterval(animacaoRef.current);
    if (resultadoRef.current !== null) clearTimeout(resultadoRef.current);
    if (respostaRef.current !== null) clearTimeout(respostaRef.current);
    if (movimentoRef.current !== null) clearTimeout(movimentoRef.current);
  }, []);
  const [jogadores, setJogadores] = useState(jogadoresIniciais);
  const [jogadorMovendo, setJogadorMovendo] = useState<number | null>(null);
  const [vencedor, setVencedor] = useState<JogadorTabuleiro | null>(null);

  // Jogador que vai lançar o dado
  const [jogadorDoDado, setJogadorDoDado] = useState(0);
  const [mostrandoResultado, setMostrandoResultado] = useState(false);
  const [dado, setDado] = useState<number | null>(null);

  const [rolando, setRolando] = useState(false);

  const [perguntaAtual, setPerguntaAtual] =
    useState<(typeof perguntas)[0] | null>(null);

  const [respondida, setRespondida] = useState(false);

  const [resultadoResposta, setResultadoResposta] = useState<
    "acertou" | "errou" | "esgotou" | null
  >(null);

  const esgotar = useEffectEvent(() => responder(-1));
  useEffect(() => {
    if (!perguntaAtual || respostaBloqueada.current) return;
    const intervalo = setInterval(() => {
      const restante = Math.max(0, prazo.current - Date.now());
      setTempo(restante);
      if (restante === 0) esgotar();
    }, 50);
    return () => clearInterval(intervalo);
  }, [perguntaAtual, respondida]);

  // Simulação enquanto não temos backend
  const curso = "ADS";
  const periodo = 2;

  /*
   * Quem responde é sempre o adversário
   * de quem lançou o dado.
   *
   * Para 2 jogadores:
   *
   * Erick (0) -> Arthur (1)
   * Arthur (1) -> Erick (0)
   */
  const jogadorRespondendo =
    (jogadorDoDado + 1) % jogadores.length;

  function dificuldadePeloDado(numero: number): Dificuldade {
    if (numero <= 2) {
      return "facil";
    }

    if (numero <= 4) {
      return "medio";
    }

    return "dificil";
  }

  /*
   * Quantas casas o jogador ganha
   * caso acerte a pergunta.
   */
  function recompensaPeloDado(numero: number) {
    if (numero <= 2) {
      return 1;
    }

    if (numero <= 4) {
      return 2;
    }

    if (numero === 5) {
      return 3;
    }

    // Dado 6
    return 4;
  }

  function sortearPergunta(numeroDado: number) {
    const dificuldade = dificuldadePeloDado(numeroDado);

    const disponiveis = perguntas.filter(
      (pergunta) =>
        pergunta.curso === curso &&
        pergunta.periodo === periodo &&
        pergunta.dificuldade === dificuldade
    );

    if (disponiveis.length === 0) {
      console.warn(
        `Nenhuma pergunta encontrada para ${curso}, ${periodo}º período e dificuldade ${dificuldade}`
      );

      setPerguntaAtual(null);
      rodadaBloqueada.current = false;

      return;
    }

    const indiceAleatorio = Math.floor(
      Math.random() * disponiveis.length
    );

    const perguntaSorteada =
      disponiveis[indiceAleatorio];

    prazo.current = Date.now() + 10000;
    respostaBloqueada.current = false;
    setTempo(10000);
    setPerguntaAtual(perguntaSorteada);
  }

function jogarDado() {
  if (
    rolando ||
    rodadaBloqueada.current ||
    vencedor ||
    mostrandoResultado ||
    perguntaAtual
  ) {
    return;
  }

  setRolando(true);
  rodadaBloqueada.current = true;
  setDado(Math.floor(Math.random() * 6) + 1);
  setMostrandoResultado(false);
  setResultadoResposta(null);

  let contador = 0;
  const totalTrocas = 12;

  const animacao = setInterval(() => {
    const faceAleatoria =
      Math.floor(Math.random() * 6) + 1;

    setDado(faceAleatoria);

    contador++;

    if (contador >= totalTrocas) {
      clearInterval(animacao);

      const resultadoFinal =
        Math.floor(Math.random() * 6) + 1;

      setDado(resultadoFinal);
      setRolando(false);

      // Entrou na fase de exibição do resultado
      setMostrandoResultado(true);

      // Mantém o resultado destacado por 2.5 segundos
      resultadoRef.current = setTimeout(() => {
        setMostrandoResultado(false);

        sortearPergunta(resultadoFinal);
      }, 2500);
    }
  }, 80);
  animacaoRef.current = animacao;
}

  function responder(indiceAlternativa: number) {
    if (!perguntaAtual || respostaBloqueada.current) {
      return;
    }

    respostaBloqueada.current = true;
    const esgotou = indiceAlternativa === -1 || Date.now() >= prazo.current;
    if (esgotou) setTempo(0);
    setRespondida(true);

    const acertou =
      !esgotou && indiceAlternativa === perguntaAtual.correta;

    setResultadoResposta(esgotou ? "esgotou" : acertou ? "acertou" : "errou");

    // Close the question before moving so the entire journey stays visible.
    respostaRef.current = setTimeout(() => {
      setPerguntaAtual(null);
      if (acertou && dado) avancarJogador(recompensaPeloDado(dado));
      else finalizarRodada();
    }, 1200);
  }

  function avancarJogador(casas: number) {
    const jogador = jogadores[jogadorRespondendo];
    const destino = Math.min(jogador.posicao + casas, boardConfig.quantidadeCasas - 1);
    let posicao = jogador.posicao;
    setJogadorMovendo(jogador.id);

    function passo() {
      posicao += 1;
      const novaPosicao = posicao;
      setJogadores(anteriores => anteriores.map(item => item.id === jogador.id ? { ...item, posicao: novaPosicao } : item));
      movimentoRef.current = setTimeout(() => {
        if (posicao < destino) passo();
        else {
          setJogadorMovendo(null);
          if (destino === boardConfig.quantidadeCasas - 1) setVencedor({ ...jogador, posicao: destino });
          finalizarRodada();
        }
      }, boardConfig.duracaoPasso);
    }
    passo();
  }

  function finalizarRodada() {
    rodadaBloqueada.current = false;
    setPerguntaAtual(null);
    setDado(null);
    setRespondida(false);
    setResultadoResposta(null);

    /*
     * O jogador que acabou de responder
     * passa a ser quem lança o próximo dado.
     */
    setJogadorDoDado(jogadorRespondendo);
  }

  function reiniciarPartida() {
    setJogadores(jogadoresIniciais);
    setVencedor(null);
    setJogadorDoDado(0);
    setDado(null);
    setResultadoResposta(null);
    setRespondida(false);
    rodadaBloqueada.current = false;
  }

  return (
    <main className="sala">
      {/* Background medieval */}

      <div className="background-medieval" />

      <div className="game">
        {/* HEADER */}

        <header className="game-header">
          <div className="identidade-sala">
            <span>REALEZA</span>

            <h1>Sala Real</h1>
          </div>

        <section className="jogadores" aria-label="Jogadores da partida">
          {jogadores.map((jogador, index) => {
            const estaJogando =
              index === jogadorDoDado;

            const vaiResponder =
              index === jogadorRespondendo;

            return (
              <div
                key={jogador.id}
                className={
                  estaJogando
                    ? "jogador jogador-ativo"
                    : "jogador"
                }
              >
                <span className="coroa">
                  <i className="jogador-cor" style={{ background: jogador.cor }} />
                  {estaJogando ? "♛" : "♟"}
                </span>

                <div>
                  <strong>
                    {jogador.nome}
                  </strong>

                  <small>
                    {jogador.posicao === 0 ? "Início" : `Casa ${jogador.posicao + 1}`} · {boardConfig.quantidadeCasas} casas
                  </small>

                  {estaJogando && (
                    <small>
                      Lança o dado
                    </small>
                  )}

                  {vaiResponder && (
                    <small>
                      Recebe o desafio
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </section>
          <div className="curso">
            <strong>{curso}</strong>
            <small>{periodo}º período</small>
            <button className="btn-abandonar" onClick={() => navigate("/home")}>Abandonar partida</button>
          </div>
        </header>

        {/* MESA */}

        <div className="partida-layout">
        <Tabuleiro jogadores={jogadores} jogadorMovendo={jogadorMovendo} vencedor={vencedor} />
        <section className="mesa" aria-label="Dado e turno">
          <div className="turno">
            <span>{vencedor ? "CAMPEÃO DO REINO" : jogadorMovendo !== null ? "EM MARCHA" : "LANÇA O DADO"}</span>

            <h2>
              {vencedor?.nome || jogadores.find(j => j.id === jogadorMovendo)?.nome || jogadores[jogadorDoDado].nome}
            </h2>

            {vencedor ? <p>A coroa foi conquistada.</p> : <p>
              O desafio será para{" "}
              <strong>
                {
                  jogadores[jogadorRespondendo]
                    .nome
                }
              </strong>
            </p>}
          </div>

          {/* DADO */}

          <div className="area-dado">
  <div
    className={
      mostrandoResultado
        ? "dado-container resultado-ativo"
        : "dado-container"
    }
  >
    {imagensDados.map((src, index) => (
    <img
      key={src}
      src={src}
      hidden={dado !== index + 1}
      width={150}
      height={150}
      className={
        rolando
          ? "dado dado-rolando"
          : mostrandoResultado
          ? "dado dado-resultado"
          : "dado"
      }
      alt={`Dado ${index + 1}`}
    />
    ))}

    {dado === null && <div className="dado-placeholder">?</div>}

    {mostrandoResultado && dado !== null && (
      <div className="numero-sorteado">
        <span>RESULTADO</span>

        <strong>{dado} </strong>

        <small>
          {dificuldadePeloDado(dado)} 
        </small>
      </div>
    )}
  </div>

            <button
              className="btn-dado"
              onClick={vencedor ? reiniciarPartida : jogarDado}
              disabled={
                rolando ||
                mostrandoResultado ||
                jogadorMovendo !== null ||
                perguntaAtual !== null
              }
            >
              {vencedor ? "Nova partida" : jogadorMovendo !== null ? "Avançando..." : rolando
                ? "Lançando..."
                : "Jogar dado"}
            </button>
          </div>

          {/* RESULTADO DO DADO */}

          {dado && !rolando && (
            <div className="resultado-dado">
              <span>Dificuldade</span>

              <strong>
                {dificuldadePeloDado(dado)}
              </strong>

              <span>
                • Vale{" "}
                {recompensaPeloDado(dado)}{" "}
                {recompensaPeloDado(dado) === 1
                  ? "casa"
                  : "casas"}
              </span>
            </div>
          )}
        </section>
        </div>

        {/* PERGUNTA */}

        {perguntaAtual && (
          <div className="overlay-pergunta">
            <section className="pergunta-card">

              {/* Jogador que precisa responder */}

              <div className="pergunta-cabecalho">
              <div className="desafiante">
                <span>
                  ⚔ DESAFIO PARA
                </span>

                <strong>
                  {
                    jogadores[
                      jogadorRespondendo
                    ].nome
                  }
                </strong>
              </div>

              <div className="cronometro" role="timer" aria-label={`${Math.ceil(tempo / 1000)} segundos restantes`}>
                <div className="cronometro-pizza" style={{ background: `conic-gradient(${tempo > 6000 ? "#7ddc87" : tempo > 3000 ? "#e6bd59" : "#ed7373"} ${tempo / 10000 * 360}deg, #ffffff12 0deg)` }}><span>{Math.ceil(tempo / 1000)}s</span></div>
                <small>Tempo restante</small>
              </div>
              </div>
              <div className="pergunta-info">
                <span className="disciplina">
                  {
                    perguntaAtual.disciplina
                  }
                </span>

                <span className="nivel">
                  {
                    perguntaAtual.dificuldade
                  }
                </span>
              </div>

              <h2>
                {perguntaAtual.pergunta}
              </h2>

              {/* ALTERNATIVAS */}

              <div className="alternativas">
                {perguntaAtual.alternativas.map(
                  (alternativa, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        responder(index)
                      }
                      disabled={respondida}
                    >
                      <span>
                        {String.fromCharCode(
                          65 + index
                        )}
                      </span>

                      {alternativa}
                    </button>
                  )
                )}
              </div>

              {/* RESULTADO */}

              {resultadoResposta && (
                <div
                  className={`resultado-resposta ${resultadoResposta}`}
                >
                  {resultadoResposta ===
                  "acertou" ? (
                    <>
                      ✓ Resposta correta! +
                      {dado
                        ? recompensaPeloDado(
                            dado
                          )
                        : 0}{" "}
                      casas
                    </>
                  ) : (
                    <>
                      {resultadoResposta === "esgotou" ? "⌛ Tempo esgotado!" : "✕ Resposta errada!"}
                      Nenhuma casa conquistada.
                    </>
                  )}
                </div>
              )}

              {/* RECOMPENSA */}

              {!resultadoResposta && dado && (
                <div className="recompensa">
                  Vale{" "}
                  <strong>
                    +
                    {recompensaPeloDado(
                      dado
                    )}
                  </strong>{" "}
                  casas
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default Sala;
