import { useEffect, useState, type ReactNode } from 'react';
import { carregarImagem, imagensAplicacao } from '../data/imageAssets';
import './Preloader.css';

export default function Preloader({ children }: { children: ReactNode }) {
  const [tentativa, setTentativa] = useState(0);
  const [carregadas, setCarregadas] = useState(0);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  useEffect(() => {
    let ativo = true;
    Promise.all(
      imagensAplicacao.map(async (src) => {
        await carregarImagem(src);
        if (ativo) setCarregadas((total) => total + 1);
      }),
    ).then(
      () => {
        if (ativo) setEstado('pronto');
      },
      () => {
        if (ativo) setEstado('erro');
      },
    );
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  if (estado === 'pronto') return children;

  return (
    <main className="preloader" aria-busy={estado === 'carregando'}>
      <h1>Realeza</h1>
      {estado === 'erro' ? (
        <>
          <p role="alert">Não foi possível carregar as imagens.</p>
          <button
            onClick={() => {
              setCarregadas(0);
              setEstado('carregando');
              setTentativa((valor) => valor + 1);
            }}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          <span className="preloader-spinner" aria-hidden="true" />
          <p role="status">Carregando...</p>
          <progress
            value={carregadas}
            max={imagensAplicacao.length}
            aria-label="Carregamento das imagens"
          />
        </>
      )}
    </main>
  );
}
