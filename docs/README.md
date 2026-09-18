# Realeza — estado atual e execução

Atualizado em 18/09/2026.

Realeza é um jogo educacional de perguntas e respostas com identidade medieval. O projeto agora inclui frontend React e backend NestJS com PostgreSQL. Login, cadastro de primeiro acesso, perfil e sessão estão integrados de ponta a ponta. SUPER_ADMIN administra cursos, disciplinas e questões pelo Painel Real. A Sala permanece um protótipo local, com dois jogadores no mesmo navegador, enquanto o multiplayer ainda não foi implementado.

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, React Router, CSS e Lucide React |
| Backend | NestJS 11, TypeScript, TypeORM 0.3, PostgreSQL, Passport/JWT, bcrypt, class-validator, class-transformer, ConfigModule e Swagger |
| Verificação | ESLint, builds TypeScript, testes HTTP com Node Test Runner e testes de navegador com Puppeteer Core |

Não há Prisma. Use Node.js compatível com o Vite instalado (20.19+ ou 22.12+) e npm. A implementação foi testada com Node.js 20.20.2 e PostgreSQL 16.

## Estrutura

```text
projeto-realeza/
├── README.md
├── docs/README.md
├── realeza-back/
│   ├── .env.example
│   ├── package.json
│   ├── test/
│   │   ├── api.e2e.cjs
│   │   ├── browser.e2e.cjs
│   │   ├── admin.e2e.cjs
│   │   └── admin-browser.e2e.cjs
│   └── src/
│       ├── common/               # Guard, usuário autenticado, enums e erros
│       ├── config/               # Validação do ambiente
│       ├── database/
│       │   ├── data-source.ts
│       │   ├── migrations/
│       │   └── seeds/
│       ├── modules/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── courses/
│       │   ├── subjects/
│       │   ├── questions/
│       │   └── admin/             # CRUD, filtros e paginação administrativa
│       ├── app.module.ts
│       └── main.ts
└── realeza-front/
    ├── .env.example
    └── src/
        ├── assets/
        ├── components/           # Visual compartilhado, preloader, proteção e tabuleiro
        ├── contexts/             # Sessão, restauração e hook useAuth
        ├── data/                 # Configuração e perguntas do protótipo local
        ├── pages/                # Login/Primeiro acesso, Home e Sala
        ├── routes/
        ├── services/api.ts       # HTTP, tipos, JWT e erros centralizados
        └── utils/menuSound.ts
```

Rooms e Games não receberam arquivos vazios nem APIs simuladas. A separação entre autenticação, catálogo e perguntas permite que a próxima etapa adicione esses módulos e um GameEngine sem mover regras para os controladores HTTP.

## 1. Configurar PostgreSQL

Instale e inicie PostgreSQL. Em Linux, com uma instalação local, entre como administrador:

```bash
sudo -u postgres psql
```

No console do PostgreSQL:

```sql
CREATE ROLE realeza WITH LOGIN;
\password realeza
CREATE DATABASE realeza OWNER realeza;
\q
```

O comando `\password` pede uma senha sem colocá-la no comando SQL. O usuário dono do banco precisa conseguir criar tabelas e a extensão `pgcrypto`, utilizada pelo TypeORM para UUIDs. Use um banco separado para os testes.

## 2. Configurar backend e ambiente

A partir de `projeto-realeza`:

```bash
cd realeza-back
npm ci
cp .env.example .env
```

Edite `.env` com sua conexão e um segredo JWT aleatório. Para gerar um segredo:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

| Variável | Uso |
| --- | --- |
| `NODE_ENV` | Ambiente; exemplo: `development` |
| `PORT` | Porta HTTP; padrão `3000` |
| `DATABASE_URL` | Conexão PostgreSQL: `postgresql://realeza:SUA_SENHA@localhost:5432/realeza` |
| `JWT_SECRET` | Segredo aleatório de no mínimo 32 caracteres |
| `JWT_TTL_SECONDS` | Validade do JWT, entre 60 e 86400 segundos; padrão 3600 |
| `CORS_ORIGINS` | Origens explícitas separadas por vírgula; exemplo: `http://localhost:5173,http://127.0.0.1:5173` |

Se a senha do banco tiver caracteres especiais, codifique-os corretamente para uso em URL. Os placeholders `CHANGE_ME` e `REPLACE_WITH...` precisam ser substituídos. Configurações inválidas impedem a inicialização da API. Arquivos `.env` são ignorados; `.env.example` não contém credenciais reais.

## 3. Executar migrations e seeds

Ainda em `realeza-back`:

```bash
npm run migration:run
npm run seed
npm run migration:show
```

A migration inicial cria `courses`, `users`, `subjects`, `questions` e `question_options`, além dos enums `user_role` e `question_difficulty`. Todas as entidades de domínio usam chave UUID. A tabela técnica `migrations` registra as migrations executadas.

A migration `1789693200000-SuperAdmin.ts` acrescenta `SUPER_ADMIN` ao enum e permite curso/período nulos para contas administrativas. Checks mantêm o perfil obrigatório para STUDENT e exigem que curso/período sejam preenchidos juntos. Nenhum registro existente é apagado ou promovido.

O schema usa chaves estrangeiras, matrícula e código de curso únicos, períodos positivos, posição de alternativa não negativa e um índice que impede mais de uma alternativa correta por pergunta. `synchronize` permanece desativado. A validação do cadastro também verifica se o período está dentro do limite do curso.

O seed é transacional e pode ser executado novamente sem duplicar o catálogo. Se as quatro questões iniciais já existem, preserva as alterações feitas no painel, inclusive nomes e códigos editados. Não cria contas nem senhas padrão:

- **ADS:** Análise e Desenvolvimento de Sistemas, 5 períodos, ativo para cadastro.
- **Direito:** registro inativo para preservar a pergunta original. `totalSemesters=1` é um limite provisório, suficiente para o registro existente de 1º período, e não uma afirmação sobre a duração oficial do curso. Confirme e ajuste a duração antes de ativá-lo.
- Disciplinas: Algoritmos, Banco de Dados e Introdução ao Direito.
- Quatro perguntas e dezesseis alternativas, preservando enunciados, alternativas e gabaritos do arquivo original `realeza-front/src/data/gameData.ts`.

O cadastro consulta cursos ativos do banco; novos cursos não exigem alterar componentes React. Alterações futuras no catálogo deverão respeitar a consistência entre curso, disciplina e período.

Para gerar uma migration após alterar entidades:

```bash
npm run migration:generate -- src/database/migrations/NomeDaAlteracao
```

Revise o SQL gerado antes de executá-lo. `npm run migration:revert` desfaz a última migration; na migration inicial isso remove todas as tabelas de domínio e seus dados. O rollback de SUPER_ADMIN é recusado se ainda houver SUPER_ADMIN ou contas administrativas sem curso/período; não converte ou apaga essas contas automaticamente.

## 4. Iniciar backend

```bash
npm run start:dev
```

Para build e execução compilada:

```bash
npm run build
npm run lint
npm run migration:run:prod
npm run seed:prod
npm run start:prod
```

Os scripts `migration:run:prod` e `seed:prod` usam os arquivos em `dist/` e exigem build prévio. Os JSONs do seed são incluídos no build.

## 5. Iniciar frontend

Em outro terminal, a partir de `projeto-realeza`:

```bash
cd realeza-front
npm ci
cp .env.example .env
npm run dev
```

Configure `VITE_API_URL` em `.env` para o endereço da API, sem sufixo de rota, por exemplo `http://localhost:3000`. Reinicie o Vite após mudar a configuração. Se o Vite escolher outra porta, acrescente a origem correta ao `CORS_ORIGINS` do backend e reinicie a API.

```bash
npm run build
npm run lint
npm run preview
```

O frontend compilado fica em `dist/`. `preview` exige um build anterior. Para integrar o preview padrão, configure também sua origem (normalmente `http://localhost:4173`) no CORS.

## URLs padrão

| Recurso | URL |
| --- | --- |
| Login e primeiro acesso | `http://localhost:5173/` |
| Home protegida | `http://localhost:5173/home` |
| Sala local protegida | `http://localhost:5173/sala` |
| Painel Real (SUPER_ADMIN) | `http://localhost:5173/admin` |
| API | `http://localhost:3000` |
| Swagger | `http://localhost:3000/docs` |
| OpenAPI JSON | `http://localhost:3000/docs-json` |

Swagger documenta os DTOs, endpoints e autenticação Bearer. Após cadastro ou login, copie o `accessToken` retornado para Authorize.

## Endpoints implementados

| Método | Rota | Autenticação | Comportamento |
| --- | --- | --- | --- |
| POST | `/auth/register` | Pública | Valida e cria um aluno; retorna JWT e perfil |
| POST | `/auth/login` | Pública | Autentica matrícula e senha; retorna JWT e perfil |
| GET | `/auth/me` | JWT | Retorna perfil atual do banco |
| GET | `/users/me` | JWT | Retorna o próprio perfil, sem hashes |
| GET | `/courses` | Pública | Lista cursos ativos para cadastro |
| GET | `/subjects` | JWT | Lista disciplinas ativas do curso/período autenticado |
| GET | `/questions/random?difficulty=EASY` | JWT | Sorteia pergunta do curso/período autenticado |

A busca de perguntas aceita `EASY`, `MEDIUM` ou `HARD`. Não aceita curso, período ou identidade enviados pelo cliente: o perfil é consultado no banco pelo ID do JWT. A resposta contém apenas ID, enunciado, dificuldade, disciplina e alternativas com ID, texto e posição. **Não retorna `isCorrect`, índice correto ou gabarito.**

Ainda não existem endpoints de resposta, pontuação, salas ou partidas. Na próxima etapa, o GameEngine deve determinar a dificuldade pelo dado e validar a alternativa no servidor; a busca atual de catálogo não é uma API de partida autoritativa.

### Modelo de dados

| Entidade/tabela | Campos e relações principais |
| --- | --- |
| User / `users` | Matrícula única, nome, email opcional, hash bcrypt, Course/período obrigatórios para STUDENT e opcionais para contas administrativas, role `STUDENT`/`ADMIN`/`SUPER_ADMIN`, datas |
| Course / `courses` | Nome, código único, total de períodos, ativo e datas |
| Subject / `subjects` | Nome, Course, período, ativo e datas; unicidade por curso/período/nome |
| Question / `questions` | Subject, Course, período, dificuldade, enunciado, ativo e datas |
| QuestionOption / `question_options` | Question, texto, posição e `isCorrect` apenas no backend |

Cadastros públicos recebem `STUDENT`; enviar `role` ou campos desconhecidos é rejeitado. Senhas de cadastro têm no mínimo 8 caracteres e no máximo 72 bytes UTF-8, respeitando o limite do bcrypt. Nenhuma resposta HTTP expõe o hash.

## Login e primeiro acesso

1. O usuário informa matrícula e senha; o frontend chama `/auth/login`.
2. Se o login for válido, recebe JWT, consulta `/auth/me` e abre a Home com nome, curso e período reais.
3. Se a matrícula não existir, recebe `USER_NOT_REGISTERED` e abre automaticamente Primeiro acesso, preservando matrícula e senha.
4. O usuário informa nome, escolhe um curso do banco, seleciona período entre 1 e `totalSemesters` e confirma a senha.
5. O frontend verifica a confirmação; o backend valida matrícula única, nome, senha, curso ativo e período permitido.
6. O cadastro retorna JWT; a sessão é estabelecida e a Home abre sem pedir novamente as credenciais.

Também é possível abrir Primeiro acesso pelo botão do login. Senha incorreta permanece na tela de login, sem abrir cadastro. O botão Google permanece visível e desabilitado, pois OAuth não está configurado. Recuperação de senha informa que ainda está em desenvolvimento.

### Sessão e proteção

A autenticação fica centralizada no AuthProvider e o HTTP em `services/api.ts`. O token é mantido em memória e salvo no `localStorage` para sobreviver à recarga. A inicialização verifica `/auth/me` antes de liberar as rotas. Não há refresh token nesta etapa; após expirar, é necessário entrar novamente.

JWT inválido ou expirado remove a sessão. Indisponibilidade da API durante a restauração mantém o token salvo, bloqueia o acesso e oferece Tentar novamente. Requisições HTTP têm prazo de 15 segundos. Sair apaga o token, limpa o perfil e volta ao login; logout também é propagado para outras abas. O logout local não revoga tokens já emitidos no servidor, que continuam sujeitos à expiração.

## Criar o primeiro SUPER_ADMIN

O administrador usa o mesmo login JWT dos alunos. Não existe cadastro público administrativo nem promoção automática de contas existentes.

Com PostgreSQL e `.env` já configurados, a partir de `projeto-realeza`:

```bash
cd realeza-back
npm ci
npm run migration:run
npm run admin:create
```

O comando solicita **nome, matrícula, email opcional, senha e confirmação**. A senha é digitada sem eco ou asteriscos no terminal e não é passada como argumento. Exige pelo menos 8 caracteres e no máximo 72 bytes UTF-8, e usa o mesmo bcrypt de custo 12 da autenticação normal.

Resultados:

- Conta criada: informa sucesso e grava `role=SUPER_ADMIN`, `course=null`, `semester=null`.
- Matrícula já existente: informa que existe; não duplica, promove ou altera a senha da conta.
- Entrada inválida ou erro de conexão/migration: informa erro e termina com código de saída diferente de zero, sem imprimir a senha ou detalhes da conexão.

Para iniciar a API:

```bash
npm run start:dev
```

Em outro terminal:

```bash
cd projeto-realeza/realeza-front
npm ci
npm run dev
```

Confirme que `VITE_API_URL` aponta para a API e que a origem do frontend está em `CORS_ORIGINS`. Abra o endereço informado pelo Vite, entre com a **matrícula e senha criadas no comando** e clique em **Painel Administrativo** na Home.

Fluxo: **Login → Home → Painel Administrativo → Cursos / Disciplinas / Questões**. A Home administrativa mostra Administração do reino, sem inventar curso ou período. A sessão continua válida após recarga.

O comando compilado está disponível após build:

```bash
npm run build
npm run admin:create:prod
```

Para automação, `npm run admin:create -- --stdin-json` recebe um único objeto JSON por entrada padrão com `name`, `registration`, `password` e `email` opcional. Utilize entrada proveniente de um gerenciador de segredos ou canal privado; não coloque a senha em argumentos, histórico do shell ou arquivos versionados. Não aceita `role`, curso ou período nesse objeto. O modo padrão interativo é suficiente para criar sua conta.

## Permissões e painel administrativo

`JwtAuthGuard` autentica pelo JWT e consulta o usuário atual no banco. `@Roles(Role.SUPER_ADMIN)` e `RolesGuard` autorizam todas as rotas `/admin/*`. Sem JWT, retorna 401; STUDENT e ADMIN autenticados recebem 403. O valor ADMIN preexistente permanece no enum, mas não possui acesso ao catálogo nesta etapa.

O JWT continua identificando a conta por `sub` (ID); a role vem do perfil salvo no banco e é conferida em cada request. Enviar `role: "SUPER_ADMIN"` em `/auth/register` é rejeitado. O cadastro público cria exclusivamente STUDENT e continua exigindo curso ativo e período válido.

No React, `/admin`, `/admin/cursos`, `/admin/disciplinas` e `/admin/questoes` exigem sessão e SUPER_ADMIN. Alunos são redirecionados à Home. O botão administrativo só aparece para SUPER_ADMIN; essa visibilidade não substitui a proteção no backend.

### Telas

| Rota | Recursos |
| --- | --- |
| `/admin` | Painel Real, contadores de cursos/disciplinas/questões e navegação |
| `/admin/cursos` | Cadastro, edição, quantidade de períodos e ativação/desativação |
| `/admin/disciplinas` | Cadastro/edição por curso/período, filtros e ativação/desativação |
| `/admin/questoes` | Cadastro/edição, quatro alternativas, um gabarito, filtros, paginação e ativação/desativação |

Os formulários preservam o tema medieval e oferecem mensagens de erro, confirmação de salvamento, estados de carregamento e nova tentativa. Os seletores de período e disciplina dependem do curso/período escolhido. O painel permite rolagem em telas pequenas.

### Endpoints administrativos

Todos os endpoints abaixo exigem **Bearer JWT + SUPER_ADMIN** e estão documentados no Swagger.

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/admin/stats` | Totais de cursos, disciplinas e questões, incluindo inativos |
| GET | `/admin/courses` | Lista cursos ativos e inativos |
| POST | `/admin/courses` | Cria curso |
| PATCH | `/admin/courses/:id` | Edita nome, código, períodos e/ou status |
| GET | `/admin/subjects` | Lista disciplinas; filtros opcionais `courseId`, `semester`, `active` |
| POST | `/admin/subjects` | Cria disciplina |
| PATCH | `/admin/subjects/:id` | Edita disciplina e/ou status |
| GET | `/admin/questions` | Lista questões com filtros e paginação |
| GET | `/admin/questions/:id` | Detalhe administrativo, incluindo gabarito |
| POST | `/admin/questions` | Cria questão com alternativas |
| PATCH | `/admin/questions/:id` | Edita questão, alternativas e/ou status |
| PATCH | `/admin/questions/:id/status` | Altera apenas `active` |

Não existem endpoints DELETE. Desativação mantém IDs, vínculos e registros existentes. Cursos inativos somem de `/courses` para novos cadastros, mas não apagam alunos, disciplinas ou questões. Perguntas de curso, disciplina ou questão inativos não são sorteadas para jogadores.

Campos de curso: `name`, `code`, `totalSemesters` (inteiro de 1 a 100), `active` opcional, padrão true. Código único; nome e código são obrigatórios e não podem conter apenas espaços.

Campos de disciplina: `name`, `courseId`, `semester`, `active` opcional. Curso deve existir, período deve estar nos limites do curso e a combinação curso/período/nome não pode duplicar outra disciplina. É possível preparar disciplinas em curso inativo.

Para cadastrar uma questão:

```json
{
  "courseId": "UUID_DO_CURSO",
  "semester": 2,
  "subjectId": "UUID_DA_DISCIPLINA",
  "difficulty": "MEDIUM",
  "statement": "O que representa uma chave primária?",
  "active": true,
  "options": [
    { "text": "Identifica unicamente um registro", "isCorrect": true },
    { "text": "Apaga uma tabela", "isCorrect": false },
    { "text": "Ordena todas as colunas", "isCorrect": false },
    { "text": "Substitui uma consulta", "isCorrect": false }
  ]
}
```

As opções são ordenadas pelo array (A–D); posição e IDs são definidos pelo servidor. O enunciado aceita até 10000 caracteres e cada alternativa até 2000. São obrigatórias **exatamente quatro alternativas não vazias e exatamente uma correta**. Dificuldades: `EASY`, `MEDIUM`, `HARD` (Fácil, Médio e Difícil no painel).

Curso e disciplina devem existir, e a disciplina precisa pertencer ao curso e período enviados. Para criar/ativar questão ativa, o curso e a disciplina também devem estar ativos. Questões inativas podem ser preparadas com pais inativos. Ao editar apenas parte do perfil da questão, o servidor valida o perfil resultante inteiro.

Edições de questão e alternativas são transacionais. Ao editar alternativas, os IDs são preservados por posição. Se qualquer gravação falhar, enunciado, dificuldade, status e gabarito voltam ao estado anterior. Os timestamps `createdAt`/`updatedAt` existentes permanecem disponíveis.

Reduzir o total de períodos de um curso abaixo de períodos usados por alunos, disciplinas ou questões é rejeitado. Mover uma disciplina de curso/período enquanto ela possui questões também é rejeitado; mova as questões para outra disciplina consistente primeiro. Os bloqueios de transação coordenam essas alterações com o cadastro de alunos e questões.

### Filtros e paginação

```text
GET /admin/questions?courseId=UUID&semester=2&subjectId=UUID&difficulty=MEDIUM&active=true&page=1&limit=20
```

Filtros são opcionais. `active` aceita `true`/`false`; omitir inclui os dois status. `page` começa em 1; `limit` tem padrão 20 e máximo 100. Campos desconhecidos ou valores inválidos são rejeitados. Resposta:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

A tela usa 20 questões por página e reinicia na primeira página ao mudar filtros. O endpoint público `/questions/random` continua utilizando DTO próprio e nunca envia `isCorrect`, `correctIndex`, `correctOption` ou gabarito; somente o detalhe/listagem administrativa autorizada inclui a resposta correta.

### Erros administrativos

| Código | HTTP | Significado |
| --- | --- | --- |
| `FORBIDDEN` | 403 | Usuário sem SUPER_ADMIN |
| `ACADEMIC_PROFILE_REQUIRED` | 403 | Conta sem curso/período tenta buscar perguntas/disciplinas como aluno |
| `COURSE_CODE_ALREADY_EXISTS` | 409 | Código de curso duplicado |
| `SUBJECT_ALREADY_EXISTS` | 409 | Disciplina duplicada no curso/período |
| `COURSE_SEMESTERS_IN_USE` | 409 | Redução invalidaria vínculos existentes |
| `SUBJECT_IN_USE` | 409 | Disciplina com questões não pode mudar de perfil |
| `CATALOG_CHANGED` | 409 | Perfil alterado concorrentemente; recarregue antes de editar |
| `CATALOG_NOT_FOUND` | 404 | Registro administrativo inexistente |
| `INVALID_SUBJECT` | 400 | Disciplina inexistente |
| `SUBJECT_PROFILE_MISMATCH` | 400 | Disciplina não pertence ao curso/período |
| `INACTIVE_QUESTION_PARENT` | 400 | Questão ativa exige curso e disciplina ativos |

Também se aplicam `VALIDATION_ERROR`, `INVALID_COURSE` e `INVALID_SEMESTER` descritos abaixo.

## Sala local preservada

A Sala exige sessão, mas **a partida ainda usa os jogadores demonstrativos Erick e Arthur e as perguntas locais de ADS, 2º período**. Esses dados são independentes do perfil real da Home. O arquivo local com gabaritos permanece somente para manter o protótipo funcionando; não é a fonte de autoridade de futuras partidas persistidas.

O circuito tem 20 casas, incluindo início e chegada. O adversário de quem lança o dado responde. Ao acertar, avança casa por casa; os passos duram 420 ms. Quem respondeu lança o próximo dado. Chegar à última casa vence e permite Nova partida.

| Dado | Dificuldade | Casas por acerto |
| --- | --- | --- |
| 1–2 | Fácil | 1 |
| 3–4 | Médio | 2 |
| 5 | Difícil | 3 |
| 6 | Difícil | 4 |

O resultado do dado fica destacado por 2,5 segundos. Cada pergunta tem 10 segundos, com pizza circular esvaziando e segundos restantes. A cor é verde acima de 6 segundos, amarela acima de 3 até 6 e vermelha até 3. Resposta errada ou prazo esgotado não concede casas. O feedback fica por 1,2 segundo. Abandonar partida retorna à Home e cancela os temporizadores ao desmontar a Sala.

A partida não é salva. Casas especiais têm identificação visual, sem efeitos de jogo. Perguntas podem se repetir. O visual medieval, o som de botões do login/menu, o carregamento das imagens e os layouts responsivos foram mantidos.

## Erros padronizados

```json
{
  "statusCode": 404,
  "code": "USER_NOT_REGISTERED",
  "message": "Matrícula não cadastrada."
}
```

| Código | HTTP | Significado |
| --- | --- | --- |
| `USER_NOT_REGISTERED` | 404 | Matrícula inexistente; abre primeiro acesso |
| `INVALID_CREDENTIALS` | 401 | Senha incorreta |
| `REGISTRATION_ALREADY_EXISTS` | 409 | Matrícula já cadastrada |
| `INVALID_COURSE` | 400 | Curso inexistente ou inativo |
| `INVALID_SEMESTER` | 400 | Período acima do limite do curso |
| `VALIDATION_ERROR` | 400 | DTO inválido ou campos desconhecidos; message pode ser uma lista |
| `UNAUTHORIZED` | 401 | Token ausente, inválido ou expirado |
| `QUESTION_NOT_FOUND` | 404 | Sem pergunta para o perfil/dificuldade |
| `INTERNAL_ERROR` | 500 | Erro interno sem expor detalhes do banco |

O frontend decide abrir cadastro pelo código do erro, sem comparar textos de mensagens. Falhas de conexão são tratadas como `NETWORK_ERROR` no cliente.

## Testes reproduzíveis

Use um PostgreSQL isolado, execute migrations e seed e inicie uma instância da API conectada a esse mesmo banco. Não use banco de produção. As suites criam contas de teste temporárias e removem os registros criados ao terminar.

Em `realeza-back`, configure as variáveis para os serviços de teste e execute:

```bash
export TEST_API_URL=http://localhost:3000
export TEST_DATABASE_URL=postgresql://realeza:SUA_SENHA@localhost:5432/realeza_test
npm run test:e2e
npm run test:admin
```

A URL do teste deve corresponder ao banco configurado na API em execução. Para o navegador, instale também as dependências do frontend, inicie-o apontando para essa API e informe um Chrome/Chromium já instalado:

```bash
export TEST_FRONTEND_URL=http://localhost:5173
export CHROME_BIN=/caminho/para/chrome-ou-chromium
npm run test:browser
npm run test:admin:browser
```

Execute as suites em sequência no mesmo banco de teste, evitando que as contas/questões temporárias de uma suite afetem a outra. A suite administrativa de API injeta e remove uma constraint de teste para verificar rollback real de uma falha na gravação de alternativa.

O teste de navegador usa Puppeteer Core instalado como dependência de desenvolvimento do frontend; não baixa um navegador automaticamente. Os testes de expiração usam o `JWT_SECRET` do `.env` do backend, que deve corresponder à API de teste.

### Verificações executadas nesta implementação

- Build e lint do backend e frontend.
- Migration inicial aplicada e registrada; seed executado duas vezes sem duplicar perguntas/alternativas.
- Comparação somente leitura do schema com as entidades TypeORM, sem diferenças.
- Cadastro, matrícula duplicada (inclusive concorrência), login válido, senha incorreta e matrícula inexistente.
- JWT válido, inválido e expirado; `/auth/me` e `/users/me` com e sem autenticação.
- Validação de nome, matrícula, senha curta, senha acima do limite UTF-8, curso inativo/inexistente, período e tentativa de enviar role.
- Cursos ativos, disciplinas do perfil, perguntas nas três dificuldades e ausência de gabaritos nas respostas HTTP.
- Swagger com Bearer e CORS sem autorização para origem desconhecida.
- Primeiro acesso no navegador, confirmação de senha, cadastro e login até a Home.
- Perfil alterado diretamente no banco refletido na Home após recarga.
- Recarga da sessão, recuperação após falha de rede, logout entre abas, bloqueio de `/home` e `/sala` e tokens inválidos/expirados.
- Dado local, resposta correta, movimento da peça, cores do cronômetro, prazo esgotado e abandono.
- Cadastro em viewport móvel sem ultrapassar a largura da tela.

Verificações da etapa administrativa:

- Criação do SUPER_ADMIN pelo comando, bcrypt de custo 12 e curso/período nulos.
- Matrícula duplicada sem promoção e rejeição de senha inválida/campos administrativos na entrada.
- Login normal e todas as rotas administrativas protegidas contra ausência de JWT, STUDENT e ADMIN.
- CRUD de cursos e disciplinas, duplicidades, períodos e consistência do perfil.
- Quatro alternativas, rejeição de zero/duas corretas e de disciplina incompatível.
- Edição transacional, IDs de alternativas preservados e rollback após falha de banco.
- Desativação preservando vínculos, filtros e paginação.
- Gabarito administrativo disponível somente ao SUPER_ADMIN e ausente na API de jogadores.
- Painel no navegador: login, botão da Home, cadastro/edição/desativação, cinco filtros, paginação de 20 e persistência após recarga.
- Bloqueio de alunos em todas as rotas do painel e layout móvel.
- Build/lint do backend e frontend e execução das suites anteriores de autenticação e Sala.

As verificações usam serviços isolados, sem modificar bancos ou serviços de outros projetos.

## Próxima etapa

- Room, RoomPlayer, Game, GamePlayer e GameTurn com migrations próprias.
- WebSocket/Socket.IO para sincronização entre dispositivos.
- GameEngine responsável por dado, dificuldade, prazo, gabarito, avanço e vitória.
- Migração da Sala local para partidas com autoridade do servidor.
- OAuth Google, recuperação de senha e histórico/ranking.

A arquitetura atual não simula esses recursos.
