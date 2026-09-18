export interface JogadorTabuleiro {
  id: number;
  nome: string;
  posicao: number;
  cor: string;
  imagem?: string;
}

// Positions are zero-based; the start and finish are included in the total.
export const boardConfig = {
  quantidadeCasas: 20,
  duracaoPasso: 420,
  texturaCasa: '',
  fundoTabuleiro: '',
  imagemChegada: '',
  casasEspeciais: [
    { posicao: 5, nome: 'Torre de vigia', simbolo: '♜' },
    { posicao: 10, nome: 'Santuário', simbolo: '✦' },
    { posicao: 15, nome: 'Portão real', simbolo: '⚑' },
  ],
};

export function criarCircuito(quantidade: number) {
  const total = Math.max(4, Math.floor(quantidade));
  const colunas = Math.max(3, Math.ceil(total / 4) + 2);
  const linhas = Math.max(3, Math.ceil((total + 4) / 2) - colunas);
  const caminho: { coluna: number; linha: number }[] = [];
  for (let linha = linhas - 1; linha >= 0; linha--) caminho.push({ coluna: 0, linha });
  for (let coluna = 1; coluna < colunas; coluna++) caminho.push({ coluna, linha: 0 });
  for (let linha = 1; linha < linhas; linha++) caminho.push({ coluna: colunas - 1, linha });
  for (let coluna = colunas - 2; coluna > 0; coluna--) caminho.push({ coluna, linha: linhas - 1 });
  return { colunas, linhas, caminho: caminho.slice(0, total) };
}
