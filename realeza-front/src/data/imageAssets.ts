import dado1 from '../assets/dados/1.png';
import dado2 from '../assets/dados/2.png';
import dado3 from '../assets/dados/3.png';
import dado4 from '../assets/dados/4.png';
import dado5 from '../assets/dados/5.png';
import dado6 from '../assets/dados/6.png';
import background from '../assets/bg.png';

export const imagensDados = [dado1, dado2, dado3, dado4, dado5, dado6];
export const imagensAplicacao = [background, ...imagensDados];

export function carregarImagem(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const timeout = window.setTimeout(() => finalizar(false), 15000);

    function finalizar(sucesso: boolean) {
      window.clearTimeout(timeout);
      imagem.onload = null;
      imagem.onerror = null;
      if (sucesso) resolve();
      else reject(new Error(`Falha ao carregar imagem: ${src}`));
    }

    imagem.onload = () => {
      if (!imagem.naturalWidth) {
        finalizar(false);
        return;
      }
      imagem.decode().then(
        () => finalizar(true),
        () => finalizar(false),
      );
    };
    imagem.onerror = () => finalizar(false);
    imagem.src = src;
  });
}
