# Realeza

Jogo educacional com tema medieval, frontend React e backend NestJS/PostgreSQL. Autenticação, primeiro acesso e perfil estão integrados. SUPER_ADMIN administra cursos, disciplinas e questões pelo Painel Real. A Sala continua como protótipo local; multiplayer ainda não foi implementado.

Veja [docs/README.md](docs/README.md) para configuração do PostgreSQL, `.env`, migrations, seeds, endpoints, permissões, execução e testes.

## Criar sua primeira conta administrativa

Após configurar o banco e o `.env`, a partir desta pasta:

```bash
cd realeza-back
npm ci
npm run migration:run
npm run admin:create
npm run start:dev
```

`admin:create` solicita nome, matrícula, email opcional, senha oculta e confirmação. Não cria duplicata nem promove uma matrícula existente. A conta SUPER_ADMIN não exige curso/período.

Em outro terminal:

```bash
cd projeto-realeza/realeza-front
npm ci
npm run dev
```

Configure `VITE_API_URL` e `CORS_ORIGINS` conforme o guia. Entre pelo login normal com a matrícula e senha cadastradas no comando e clique em **Painel Administrativo** na Home.

Fluxo: **Login → Home → Painel Administrativo → Cursos / Disciplinas / Questões**. Alunos não possuem acesso ao painel; o backend verifica JWT e role em todas as rotas administrativas. Swagger: `/docs` na API.
