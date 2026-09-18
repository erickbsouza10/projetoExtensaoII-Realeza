export type Dificuldade = 'facil' | 'medio' | 'dificil';

export interface Pergunta {
  id: number;
  curso: string;
  periodo: number;
  disciplina: string;
  dificuldade: Dificuldade;
  pergunta: string;
  alternativas: string[];
  correta: number;
}

export const perguntas: Pergunta[] = [
  {
    id: 1,
    curso: 'ADS',
    periodo: 2,
    disciplina: 'Algoritmos',
    dificuldade: 'facil',
    pergunta: 'Qual estrutura é utilizada para repetir um bloco de código?',
    alternativas: ['if', 'for', 'switch', 'class'],
    correta: 1,
  },

  {
    id: 2,
    curso: 'ADS',
    periodo: 2,
    disciplina: 'Banco de Dados',
    dificuldade: 'medio',
    pergunta: 'Qual comando SQL é utilizado para consultar registros?',
    alternativas: ['INSERT', 'UPDATE', 'SELECT', 'DROP'],
    correta: 2,
  },

  {
    id: 3,
    curso: 'ADS',
    periodo: 2,
    disciplina: 'Banco de Dados',
    dificuldade: 'dificil',
    pergunta: 'Qual forma normal elimina dependências transitivas?',
    alternativas: ['1FN', '2FN', '3FN', 'BCNF'],
    correta: 2,
  },

  {
    id: 4,
    curso: 'Direito',
    periodo: 1,
    disciplina: 'Introdução ao Direito',
    dificuldade: 'facil',
    pergunta: 'Qual é uma das principais fontes formais do Direito?',
    alternativas: ['Lei', 'Opinião pessoal', 'Costume individual', 'Preferência'],
    correta: 0,
  },
];
