# Realeza Backend

API NestJS com PostgreSQL/TypeORM, JWT, bcrypt, validação e Swagger. Módulos: auth, users, courses, subjects, questions e admin. O catálogo administrativo exige SUPER_ADMIN; o cadastro público permanece STUDENT.

A configuração do banco e do `.env`, migrations, seeds, endpoints, permissões e testes estão em [../docs/README.md](../docs/README.md).

Após configurar o banco e o `.env`:

```bash
npm ci
npm run migration:run
npm run seed
npm run admin:create
npm run start:dev
```

`admin:create` é interativo, com senha oculta e confirmação. Matrícula existente não é duplicada ou promovida. Para a versão compilada, execute build e `npm run admin:create:prod`.

Swagger: `http://localhost:3000/docs` com a configuração padrão. Testes: `test:e2e`, `test:admin`, `test:browser` e `test:admin:browser`, em sequência num banco isolado conforme o guia.
