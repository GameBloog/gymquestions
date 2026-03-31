# API Gym

Backend da plataforma G-Force para acompanhamento de alunos, treinos, dietas, evolucao, check-ins, notificacoes e aquisicao de leads.

## Visao geral

Este servico expoe uma API REST com controle por papeis:

- `ADMIN`
- `PROFESSOR`
- `ALUNO`

Principais modulos:

- Autenticacao (`/auth`)
- Convites de acesso (`/auth/invite-codes`)
- Gestao de professores (`/professores`)
- Gestao de alunos e perfil (`/alunos`)
- Historico de evolucao (`/alunos/:id/historico`)
- Treino (editor, planos e check-ins) (`/treinos`)
- Dieta (editor, alimentos, planos e check-ins) (`/dietas`)
- Upload de fotos e arquivos (`/fotos-shape`, `/arquivos-aluno`)
- Lead tracking para aquisicao (`/lead-links`)
- Notificacoes (scheduler + email/whatsapp)

## Stack

- Node.js + TypeScript
- Fastify
- Prisma + PostgreSQL
- Zod (validacao)
- JWT + bcrypt
- Vitest (unit/e2e)

## Estrutura principal

```text
src/
  application/
  domain/
  infraestructure/
    http/
    database/
    notifications/
  shared/
prisma/
  schema.prisma
  migrations/
  seed.ts
test/
```

## Requisitos

- Linux ou macOS com shell `bash`
- Node.js `20.19.4` recomendado
- `corepack` habilitado com `pnpm@10.13.1`
- Docker com `docker compose` e daemon em execucao

## Setup local

Na raiz do workspace, o caminho mais rapido e:

```bash
pnpm run setup:backend
```

Dentro de `api-gym`, o fluxo equivalente e:

```bash
pnpm install
cp .env.example .env
cp .env.test.example .env.test
pnpm run env:check
pnpm run env:test:check
pnpm run db:start
pnpm run db:generate
pnpm run db:migrate:deploy
pnpm run db:seed
pnpm run dev
```

API local: `http://localhost:3333`

## Variaveis de ambiente

Veja `.env.example` para referencia completa.

Campos criticos:

- `DATABASE_URL`
- `JWT_SECRET`
- `CLOUDINARY_*`
- `LEAD_TRACKING_SALT`
- `NOTIFICATION_*` (o template local deixa o scheduler desligado por padrao)
- `SMTP_*` (opcional no local)
- `TWILIO_*` (opcional no local)
- `TACO_API_BASE_URL` (opcional; so configure se estiver rodando o GraphQL local ou remoto)
- `USDA_API_KEY` (opcional)

Observacoes:

- Para o banco local via Docker, use `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/api_gym?schema=public`.
- `CORS_ORIGIN` so e necessario em producao; em desenvolvimento o backend libera CORS para facilitar o setup local.
- `SMTP_FROM_EMAIL` precisa ser email valido se estiver presente. Por isso o template usa um placeholder valido em vez de string vazia.
- Em providers como Render, **nao use aspas** em cron (`FRIDAY_PHOTO_REMINDER_CRON`, `REAVALIACAO_REMINDER_CRON`).
- `LEAD_TRACKING_SALT` deve ser secreto e aleatorio (32+ chars recomendado).

## Banco de dados

### Banco local via Docker

```bash
pnpm run db:start
```

### Migracoes

```bash
pnpm run db:migrate:deploy
```

### Seed

O seed atual cobre:

- Admin
- Professor padrao
- Convites bootstrap (admin/professor)
- Em ambiente nao-producao:
  - Professor de exemplo
  - Alunos de exemplo
  - Historico de evolucao
  - Exercicios, plano de treino e check-in
  - Alimentos, plano de dieta e check-in
  - Lead links + click events + attribution

Rodar:

```bash
pnpm run db:seed
```

### Prisma Client

```bash
pnpm run db:generate
```

### Parar banco local

```bash
pnpm run db:stop
```

## Testes

### Unitarios

```bash
pnpm run test:unit
```

### E2E

```bash
pnpm run db:test:start
pnpm run db:test:migrate
pnpm run test:e2e
pnpm run db:test:stop
```

## Endpoints principais

### Autenticacao

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

`/auth/register` aceita `leadSlug` opcional para atribuicao de first-touch de lead.

### Convites

- `POST /auth/invite-codes` (ADMIN)
- `GET /auth/invite-codes` (ADMIN)

### Lead tracking

- `POST /lead-links` (ADMIN)
- `GET /lead-links` (ADMIN)
- `PATCH /lead-links/:id` (ADMIN)
- `GET /lead-links/analytics?range=7|30|90` (ADMIN)
- `POST /lead-links/click` (publico)

### Alunos e professores

- `GET/POST/PUT/DELETE /alunos`
- `GET/POST/PUT/DELETE /professores`

### Treino

- CRUD logico de exercicios e planos
- check-ins por dia e exercicio
- comentarios aluno/professor

### Dieta

- alimentos internos e externos (`TACO`/`USDA`)
- importacao de alimento externo
- plano semanal de dieta
- check-ins de refeicoes e dias

## Integracao de alimentos externos

### TACO (GraphQL self-host)

`TACO_API_BASE_URL` deve apontar para endpoint GraphQL completo, ex:

```env
TACO_API_BASE_URL=https://seu-servico-taco.onrender.com/graphql
```

### USDA

Configure `USDA_API_KEY` para habilitar buscas USDA.

## Deploy (Render + Vercel)

### Backend (Render)

- Build command: `pnpm install --frozen-lockfile && pnpm run build:prod`
- Start command: `pnpm run start`
- Defina todas envs de producao

### Frontend (Vercel)

- `VITE_API_URL` deve apontar para URL publica do backend

### TACO API (GraphQL)

Pode ser:

- service separado no Render (image-based ou repo-based)
- endpoint final deve responder em `/graphql`

## Seguranca

- Controle de acesso por papel em todas rotas protegidas
- `@fastify/rate-limit` global + ajuste por rota publica de lead click
- Hash de IP/User-Agent para tracking de leads (sem armazenar IP puro)
- Validacao de payload com Zod

## Scripts uteis

```bash
pnpm run dev
pnpm run build
pnpm run start
pnpm run db:migrate
pnpm run db:seed
pnpm run test:unit
pnpm run test:e2e
```

## Troubleshooting

- `Variaveis de ambiente invalidas`: rode `pnpm run env:check` ou `pnpm run env:test:check` para validar o parser real antes de subir a API.
- `P1001` / `Can't reach database server`: confirme o Docker ativo, rode `pnpm run db:start` e verifique se a porta `5433` esta livre.
- `Prisma Client did not initialize yet`: rode `pnpm run db:generate`.
- `P2022` / coluna inexistente: rode migracoes pendentes.
- Timeout em APIs externas: valide conectividade e URL de `TACO_API_BASE_URL`.
- E2E falhando por conexao: subir banco de teste na porta de `.env.test`.
