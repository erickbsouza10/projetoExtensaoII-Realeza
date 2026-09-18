# Realeza Frontend

Aplicação React/TypeScript/Vite com login real, primeiro acesso, Home com perfil autenticado, Sala de partida local e Painel Real para SUPER_ADMIN. O visual medieval foi preservado.

Configure e inicie o backend conforme [../docs/README.md](../docs/README.md). Depois:

```bash
npm ci
cp .env.example .env
npm run dev
```

`VITE_API_URL` aponta para a API (padrão `http://localhost:3000`). Validação: `npm run build` e `npm run lint`.
