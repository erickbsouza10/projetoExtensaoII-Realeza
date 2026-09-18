# React + TypeScript + Vite

## Tabuleiro Realeza

O circuito esta em `src/components/tabuleiro/Tabuleiro.tsx`, e as miniaturas
em `PecaJogador.tsx`. A partida continua usando os estados locais de `Sala.tsx`.

- `src/data/boardConfig.ts`: quantidade de casas (20, incluindo inicio e
  chegada), duracao de cada passo, textura das casas, fundo do tabuleiro e arte
  da chegada. Use URLs ou imports de imagens nos campos de textura.
- `casasEspeciais`: posicao baseada em zero, nome e simbolo. Sao marcadores
  visuais e nao alteram recompensas ou regras nesta versao.
- `jogadoresIniciais` em `Sala.tsx`: cor e campo opcional `imagem` de cada
  jogador. Ao fornecer a imagem, ela substitui a miniatura CSS automaticamente.
- A primeira casa tem posicao 0 e a chegada tem posicao 19. O movimento para
  na chegada, mesmo que a recompensa seja maior que a distancia restante.
- Texturas CSS e aparencia das casas e miniaturas: `Tabuleiro.css`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
