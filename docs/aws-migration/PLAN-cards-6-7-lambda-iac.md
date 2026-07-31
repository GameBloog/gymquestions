# Backend em Lambda + IaC — Plano de Implementação (cartões 6 e 7)

> **Para executores agênticos:** SUB-SKILL OBRIGATÓRIA — use
> `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam
> checkbox (`- [ ]`) para acompanhamento.

**Goal:** transformar o backend Fastify em funções Lambda e descrever toda a
infraestrutura num `serverless.yml`, sem alterar o comportamento do `pnpm dev`.

**Architecture:** o corpo de cada job de cron sai de dentro do `node-cron` e vira
função pura em `src/jobs/`, chamada por dois acionadores diferentes — os
schedulers locais (dev) e handlers Lambda avulsos (produção). O HTTP vira
`src/lambda.ts` via `@fastify/aws-lambda`, importando `app.ts` e nunca
`server.ts`. O `serverless.yml` declara uma função HTTP e três agendadas, com
segredos vindos do SSM.

**Tech Stack:** Node 22 · TypeScript · Fastify 5 · Prisma 6 · Vitest 2 · pnpm 10 ·
Serverless Framework v4 (esbuild nativo) · AWS Lambda arm64 · API Gateway HTTP API ·
EventBridge Scheduler · SSM Parameter Store.

**Design de referência:** [DESIGN-cards-6-7-lambda-iac.md](./DESIGN-cards-6-7-lambda-iac.md)

## Global Constraints

- Região AWS: `us-east-2`. Runtime `nodejs22.x`, arquitetura `arm64`.
- Domínios: `api.gforcecoach.com` (prod), `api-dev.gforcecoach.com` (dev).
- Contas: `gforce-dev` = `605618941761`, `gforce-prod` = `565828850910`.
- `pnpm dev` deve continuar idêntico ao atual — `src/server.ts` não é modificado.
- Nenhum segredo em texto plano no repositório ou no `serverless.yml`.
- Prefixo dos parâmetros SSM: `/gforce/<stage>/<NOME>`.
- Imports de produção usam o alias `@/` (ver `tsconfig.json`); testes usam caminho
  relativo, seguindo a convenção de `test/unit/`.
- Commits sem qualquer linha de atribuição a IA.
- Nada é aplicado em conta AWS real neste plano (isso é o cartão 8).

---

### Task 1: Extrair os jobs de cron para módulo compartilhado

Hoje a regra de cada job vive dentro do callback do `cron.schedule(...)`, logo só
pode ser acionada por um processo vivo. Esta tarefa separa *o que o job faz* de
*quando ele roda*.

Diferença de comportamento intencional: a função de job **propaga** o erro. Os
schedulers locais continuam engolindo com `console.error` (comportamento atual
preservado), mas o handler Lambda vai deixar o erro subir, para a invocação ser
marcada como falha nas métricas da AWS. Job que falha em silêncio é job que
ninguém descobre que parou.

**Files:**
- Create: `src/jobs/index.ts`
- Modify: `src/infraestructure/notifications/notification-scheduler.ts`
- Modify: `src/infraestructure/storage/storage-cleanup-scheduler.ts`
- Test: `test/unit/jobs/jobs.spec.ts`

**Interfaces:**
- Consumes: `notificationService` de
  `@/infraestructure/notifications/notification.service`;
  `ProcessStorageDeletionsUseCase` de
  `@/application/use-cases/storage-cleanup/process-storage-deletions`;
  `PrismaStorageCleanupRepository` de
  `@/infraestructure/database/respositories/prisma-storage-cleanup-repository`
  (atenção: o diretório é `respositories`, com a grafia como está no repositório).
- Produces: `runFridayPhotoReminder(): Promise<void>`,
  `runReavaliacaoReminders(): Promise<void>`,
  `runStorageCleanup(): Promise<{ processed: number }>` — usados pelas Tasks 3.

- [ ] **Step 1: Escrever o teste que falha**

Criar `test/unit/jobs/jobs.spec.ts`:

```typescript
import { describe, expect, it, vi, afterEach } from "vitest"
import { notificationService } from "../../../src/infraestructure/notifications/notification.service"
import {
  runFridayPhotoReminder,
  runReavaliacaoReminders,
} from "../../../src/jobs"

describe("jobs de notificação", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delega o lembrete de fotos de sexta ao notification service", async () => {
    const spy = vi
      .spyOn(notificationService, "sendFridayPhotoReminder")
      .mockResolvedValue(undefined)

    await runFridayPhotoReminder()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("delega os lembretes de reavaliação ao notification service", async () => {
    const spy = vi
      .spyOn(notificationService, "sendReavaliacaoRemindersForToday")
      .mockResolvedValue(undefined)

    await runReavaliacaoReminders()

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("propaga o erro em vez de engolir, para a invocação falhar", async () => {
    vi.spyOn(notificationService, "sendFridayPhotoReminder").mockRejectedValue(
      new Error("SMTP fora do ar"),
    )

    await expect(runFridayPhotoReminder()).rejects.toThrow("SMTP fora do ar")
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm test:unit -- test/unit/jobs/jobs.spec.ts`
Expected: FAIL — `Failed to resolve import "../../../src/jobs"`.

- [ ] **Step 3: Criar `src/jobs/index.ts`**

```typescript
import { ProcessStorageDeletionsUseCase } from "@/application/use-cases/storage-cleanup/process-storage-deletions"
import { PrismaStorageCleanupRepository } from "@/infraestructure/database/respositories/prisma-storage-cleanup-repository"
import { notificationService } from "@/infraestructure/notifications/notification.service"

export async function runFridayPhotoReminder(): Promise<void> {
  await notificationService.sendFridayPhotoReminder()
}

export async function runReavaliacaoReminders(): Promise<void> {
  await notificationService.sendReavaliacaoRemindersForToday()
}

// Construído sob demanda e reaproveitado: numa Lambda o mesmo container atende
// várias invocações, e recriar repositório a cada execução desperdiça conexão.
// Também evita tocar no Prisma só por importar este módulo num teste.
let storageProcessor: ProcessStorageDeletionsUseCase | null = null

export async function runStorageCleanup(): Promise<{ processed: number }> {
  storageProcessor ??= new ProcessStorageDeletionsUseCase(
    new PrismaStorageCleanupRepository(),
  )

  return storageProcessor.execute()
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm test:unit -- test/unit/jobs/jobs.spec.ts`
Expected: PASS — 3 testes.

- [ ] **Step 5: Apontar os schedulers para os jobs**

Em `src/infraestructure/notifications/notification-scheduler.ts`, trocar os dois
callbacks. O import novo:

```typescript
import { runFridayPhotoReminder, runReavaliacaoReminders } from "@/jobs"
```

O callback do lembrete de sexta passa a ser:

```typescript
    this.fridayReminderTask = cron.schedule(
      env.FRIDAY_PHOTO_REMINDER_CRON,
      () => {
        void runFridayPhotoReminder().catch((error) => {
          console.error(
            "[notifications] Erro no job de lembrete de fotos (sexta):",
            error,
          )
        })
      },
      {
        timezone: env.NOTIFICATION_TIMEZONE,
      },
    )
```

E o da reavaliação:

```typescript
    this.reavaliacaoTask = cron.schedule(
      env.REAVALIACAO_REMINDER_CRON,
      () => {
        void runReavaliacaoReminders().catch((error) => {
          console.error(
            "[notifications] Erro no job de reavaliação diária:",
            error,
          )
        })
      },
      {
        timezone: env.NOTIFICATION_TIMEZONE,
      },
    )
```

Remover o import de `./notification.service` se ele tiver ficado sem uso.

- [ ] **Step 6: Apontar o scheduler de storage para o job**

Em `src/infraestructure/storage/storage-cleanup-scheduler.ts`, substituir os
imports de `ProcessStorageDeletionsUseCase` e `PrismaStorageCleanupRepository`
por:

```typescript
import { runStorageCleanup } from "@/jobs"
```

Apagar o campo `private processor = new ProcessStorageDeletionsUseCase(...)` e
trocar o callback por:

```typescript
    this.task = cron.schedule("*/15 * * * *", () => {
      void runStorageCleanup().catch((error) => {
        console.error("[storage-cleanup] Erro ao processar limpezas:", error)
      })
    })
```

- [ ] **Step 7: Rodar a suíte inteira e o lint**

Run: `pnpm test:unit && pnpm lint`
Expected: PASS, sem erro de lint. Nenhum teste existente pode quebrar — os
schedulers mudaram de fiação, não de comportamento.

- [ ] **Step 8: Commit**

```bash
git add src/jobs/index.ts \
        src/infraestructure/notifications/notification-scheduler.ts \
        src/infraestructure/storage/storage-cleanup-scheduler.ts \
        test/unit/jobs/jobs.spec.ts
git commit -m "refactor(jobs): extrair jobs de cron para modulo compartilhado

Separa o que o job faz de quando ele roda: o corpo sai de dentro do
cron.schedule e vira funcao pura em src/jobs, que os schedulers locais
passam a chamar. Os handlers Lambda vao usar as mesmas funcoes.

A funcao de job propaga o erro; os schedulers seguem engolindo com
console.error, preservando o comportamento atual do dev local."
```

---

### Task 2: Handler HTTP da Lambda

**Files:**
- Create: `src/lambda.ts`
- Modify: `package.json` (dependência `@fastify/aws-lambda`)
- Test: `test/unit/lambda/http-handler.spec.ts`

**Interfaces:**
- Consumes: `app` de `@/app`.
- Produces: `handler` — recebe um evento do API Gateway HTTP API (payload 2.0) e
  devolve `{ statusCode, headers, body, isBase64Encoded }`.

- [ ] **Step 1: Instalar o adapter**

Run: `pnpm add @fastify/aws-lambda`
Expected: entra em `dependencies` (é dependência de runtime, não de build).

- [ ] **Step 2: Escrever o teste que falha**

Criar `test/unit/lambda/http-handler.spec.ts`. O alvo é `/health`, a única rota
que não toca banco nem serviço externo:

```typescript
import { describe, expect, it } from "vitest"
import { handler } from "../../../src/lambda"

const apiGatewayV2Event = {
  version: "2.0",
  routeKey: "GET /health",
  rawPath: "/health",
  rawQueryString: "",
  headers: {
    "content-length": "0",
    host: "api-dev.gforcecoach.com",
    "user-agent": "vitest",
  },
  requestContext: {
    accountId: "605618941761",
    apiId: "test-api",
    domainName: "api-dev.gforcecoach.com",
    http: {
      method: "GET",
      path: "/health",
      protocol: "HTTP/1.1",
      sourceIp: "203.0.113.10",
      userAgent: "vitest",
    },
    requestId: "test-request-id",
    routeKey: "GET /health",
    stage: "$default",
    time: "31/Jul/2026:12:00:00 +0000",
    timeEpoch: 1785456000000,
  },
  isBase64Encoded: false,
}

const lambdaContext = {
  callbackWaitsForEmptyEventLoop: true,
  functionName: "gforce-api-dev-api",
  functionVersion: "$LATEST",
  invokedFunctionArn:
    "arn:aws:lambda:us-east-2:605618941761:function:gforce-api-dev-api",
  memoryLimitInMB: "1024",
  awsRequestId: "test-request-id",
  logGroupName: "/aws/lambda/gforce-api-dev-api",
  logStreamName: "test-stream",
  getRemainingTimeInMillis: () => 29000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
}

describe("handler HTTP da Lambda", () => {
  it("responde /health igual ao servidor HTTP", async () => {
    const response = await handler(
      apiGatewayV2Event as never,
      lambdaContext as never,
    )

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body as string)).toMatchObject({ status: "ok" })
  })

  it("devolve 404 com o formato de erro da aplicação em rota inexistente", async () => {
    const response = await handler(
      {
        ...apiGatewayV2Event,
        rawPath: "/rota-que-nao-existe",
        routeKey: "GET /rota-que-nao-existe",
        requestContext: {
          ...apiGatewayV2Event.requestContext,
          http: {
            ...apiGatewayV2Event.requestContext.http,
            path: "/rota-que-nao-existe",
          },
        },
      } as never,
      lambdaContext as never,
    )

    expect(response.statusCode).toBe(404)
  })
})
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm test:unit -- test/unit/lambda/http-handler.spec.ts`
Expected: FAIL — `Failed to resolve import "../../../src/lambda"`.

- [ ] **Step 4: Criar `src/lambda.ts`**

```typescript
import awsLambdaFastify from "@fastify/aws-lambda"
import { app } from "./app"

// Importa app.ts, nunca server.ts: assim o node-cron e o app.listen ficam
// fora do bundle de produção, e o dev local segue intacto.
export const handler = awsLambdaFastify(app, {
  binaryMimeTypes: [
    "application/octet-stream",
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
})
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm test:unit -- test/unit/lambda/http-handler.spec.ts`
Expected: PASS — 2 testes.

- [ ] **Step 6: Commit**

```bash
git add src/lambda.ts test/unit/lambda/http-handler.spec.ts package.json pnpm-lock.yaml
git commit -m "feat(lambda): adicionar handler HTTP via @fastify/aws-lambda

Converte eventos do API Gateway HTTP API em requests Fastify reusando o
app.ts existente. Nao importa server.ts, entao o node-cron e o listen
ficam fora do bundle de producao."
```

---

### Task 3: Handlers de cron da Lambda

O critério 3 do cartão 6 exige que o handler "rode o job completo e encerre sem
deixar timer/listener pendente". O teste verifica isso literalmente, contando
timers ativos depois que a promise resolve.

**Files:**
- Create: `src/lambda-crons.ts`
- Test: `test/unit/lambda/cron-handlers.spec.ts`

**Interfaces:**
- Consumes: `runFridayPhotoReminder`, `runReavaliacaoReminders`,
  `runStorageCleanup` de `@/jobs` (Task 1).
- Produces: `fridayPhotoReminder()`, `reavaliacaoReminder()`,
  `storageCleanup()` — cada um devolve `Promise<{ ok: true; job: string }>`;
  referenciados por nome no `serverless.yml` (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Criar `test/unit/lambda/cron-handlers.spec.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest"
import * as jobs from "../../../src/jobs"
import {
  fridayPhotoReminder,
  reavaliacaoReminder,
  storageCleanup,
} from "../../../src/lambda-crons"

describe("handlers de cron da Lambda", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("executa o lembrete de fotos uma única vez", async () => {
    const spy = vi
      .spyOn(jobs, "runFridayPhotoReminder")
      .mockResolvedValue(undefined)

    const result = await fridayPhotoReminder()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, job: "friday-photo-reminder" })
  })

  it("executa os lembretes de reavaliação uma única vez", async () => {
    const spy = vi
      .spyOn(jobs, "runReavaliacaoReminders")
      .mockResolvedValue(undefined)

    const result = await reavaliacaoReminder()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, job: "reavaliacao-reminder" })
  })

  it("executa a limpeza de storage uma única vez", async () => {
    const spy = vi
      .spyOn(jobs, "runStorageCleanup")
      .mockResolvedValue({ processed: 3 })

    const result = await storageCleanup()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, job: "storage-cleanup", processed: 3 })
  })

  it("não deixa timer pendente depois de encerrar", async () => {
    vi.spyOn(jobs, "runStorageCleanup").mockResolvedValue({ processed: 0 })
    vi.useFakeTimers()

    await storageCleanup()

    expect(vi.getTimerCount()).toBe(0)
  })

  it("propaga a falha para a invocação ser marcada como erro", async () => {
    vi.spyOn(jobs, "runStorageCleanup").mockRejectedValue(
      new Error("Cloudinary fora do ar"),
    )

    await expect(storageCleanup()).rejects.toThrow("Cloudinary fora do ar")
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm test:unit -- test/unit/lambda/cron-handlers.spec.ts`
Expected: FAIL — `Failed to resolve import "../../../src/lambda-crons"`.

- [ ] **Step 3: Criar `src/lambda-crons.ts`**

```typescript
import {
  runFridayPhotoReminder,
  runReavaliacaoReminders,
  runStorageCleanup,
} from "./jobs"

// Um handler por job: falha, log e métrica de cada um ficam isolados na AWS.
// Nenhum deles agenda nada — o agendamento é do EventBridge (serverless.yml).
// Erros sobem de propósito: invocação que falha em silêncio é job que ninguém
// descobre que parou.

export async function fridayPhotoReminder(): Promise<{
  ok: true
  job: string
}> {
  await runFridayPhotoReminder()
  return { ok: true, job: "friday-photo-reminder" }
}

export async function reavaliacaoReminder(): Promise<{
  ok: true
  job: string
}> {
  await runReavaliacaoReminders()
  return { ok: true, job: "reavaliacao-reminder" }
}

export async function storageCleanup(): Promise<{
  ok: true
  job: string
  processed: number
}> {
  const { processed } = await runStorageCleanup()
  return { ok: true, job: "storage-cleanup", processed }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm test:unit -- test/unit/lambda/cron-handlers.spec.ts`
Expected: PASS — 5 testes.

Se o `vi.spyOn` sobre o módulo `jobs` falhar com "not extensible", adicionar no
topo do arquivo de teste `vi.mock("../../../src/jobs", { spy: true })` e repetir.

- [ ] **Step 5: Commit**

```bash
git add src/lambda-crons.ts test/unit/lambda/cron-handlers.spec.ts
git commit -m "feat(lambda): adicionar handlers de cron avulsos

Um handler por job, cada um executa uma vez e encerra. O agendamento
passa a ser responsabilidade do EventBridge. Erros sobem para a
invocacao ser marcada como falha nas metricas."
```

---

### Task 4: Binários nativos para linux-arm64

Prisma e sharp carregam binário compilado. O binário do macOS não roda na Lambda,
e nenhum dos dois sobrevive a bundling — por isso ficam fora do bundle e entram
no zip como `node_modules`.

**Files:**
- Modify: `prisma/schema.prisma:1-3`
- Modify: `package.json` (script de instalação dos binários linux)
- Create: `scripts/install-lambda-binaries.sh`

**Interfaces:**
- Produces: `node_modules/.prisma/client/*-linux-arm64-openssl-3.0.x.so.node` e
  `node_modules/@img/sharp-linux-arm64/` — verificados no zip pela Task 8.

- [ ] **Step 1: Declarar o alvo de compilação do Prisma**

Em `prisma/schema.prisma`, o bloco `generator client` passa a:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]
}
```

- [ ] **Step 2: Regenerar o client e confirmar o binário**

Run: `pnpm db:generate && ls node_modules/.prisma/client/ | grep -i arm64`
Expected: aparece um arquivo contendo `linux-arm64-openssl-3.0.x`. Se não
aparecer, o `binaryTargets` não foi aplicado — conferir o schema antes de seguir.

- [ ] **Step 3: Declarar as arquiteturas suportadas no `package.json`**

`pnpm add --config.platform=linux --config.arch=arm64 sharp` **não serve aqui**:
ele *troca* o binário do sharp pelo de linux, e a máquina de desenvolvimento
(macOS) fica sem o dela — `pnpm dev` e os testes que tocam imagem quebram. O
correto no pnpm é declarar que o projeto precisa das duas arquiteturas, para que
ambas sejam instaladas lado a lado.

Acrescentar ao `package.json`, no nível raiz do objeto:

```json
  "pnpm": {
    "supportedArchitectures": {
      "os": ["current", "linux"],
      "cpu": ["current", "arm64"]
    }
  },
```

- [ ] **Step 4: Criar o script de verificação dos binários**

Criar `scripts/install-lambda-binaries.sh`:

```bash
#!/usr/bin/env bash
# Garante os binarios nativos das duas arquiteturas: a da maquina local e a da
# Lambda (linux/arm64). As arquiteturas vem de pnpm.supportedArchitectures no
# package.json — este script so reinstala e confere.
set -euo pipefail

echo "==> instalando dependencias para todas as arquiteturas suportadas"
pnpm install

echo "==> prisma client com engine linux-arm64"
pnpm db:generate

echo "==> conferindo"
ls node_modules/@img | grep -q 'sharp-linux-arm64' \
  && echo "OK: @img/sharp-linux-arm64 presente" \
  || { echo "FALHOU: @img/sharp-linux-arm64 ausente" >&2; exit 1; }

ls node_modules/.prisma/client | grep -q 'linux-arm64' \
  && echo "OK: engine linux-arm64 do Prisma presente" \
  || { echo "FALHOU: engine linux-arm64 ausente" >&2; exit 1; }
```

- [ ] **Step 5: Registrar o script no `package.json`**

Adicionar em `scripts`:

```json
    "lambda:binaries": "bash scripts/install-lambda-binaries.sh",
```

- [ ] **Step 6: Executar e conferir**

Run: `chmod +x scripts/install-lambda-binaries.sh && pnpm lambda:binaries`
Expected: as duas linhas `OK:` no fim.

- [ ] **Step 7: Confirmar que a máquina local continua com o binário dela**

Run: `ls node_modules/@img`
Expected: além de `sharp-linux-arm64`, o pacote da plataforma local continua
presente (em Mac Apple Silicon, `sharp-darwin-arm64`). Se o binário local
sumiu, `supportedArchitectures` foi aplicado errado — corrigir antes de seguir,
porque isso quebra o `pnpm dev`.

- [ ] **Step 8: Confirmar que nada regrediu**

Run: `pnpm test:unit && pnpm lint && npx tsc --noEmit`
Expected: PASS. O `binaryTargets` mantém `"native"`, então a máquina local segue
com o engine dela.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma package.json pnpm-lock.yaml scripts/install-lambda-binaries.sh
git commit -m "build(lambda): preparar binarios nativos para linux-arm64

Prisma passa a gerar tambem o engine linux-arm64-openssl-3.0.x, e o
pnpm passa a instalar o sharp das duas arquiteturas — a da maquina local
e a da Lambda — via supportedArchitectures.

Trocar o binario por --config.platform seria destrutivo: deixaria a
maquina de desenvolvimento sem o sharp dela."
```

---

### Task 5: `serverless.yml` — provider, bundling e função HTTP

Primeira metade do cartão 7. Fecha o critério de aceite 1 (`serverless package`
sem erro e sem segredo embutido).

Sobre a resolução dos segredos: a forma
`${ssm:/gforce/${sls:stage}/NOME, env:NOME, ''}` tem três níveis. Na AWS, vem do
SSM. Rodando offline, cai na variável do `.env` local. Sem nenhum dos dois,
resolve para vazio — o empacotamento funciona, e quem reclama é o Zod do
`src/env.ts` no primeiro cold start, com mensagem clara. Isso é deliberado:
falha de configuração deve aparecer no boot, não como pacote que não empacota.

**Files:**
- Create: `serverless.yml`
- Modify: `package.json` (devDependencies e scripts)
- Modify: `.gitignore` (artefatos do Serverless)

**Interfaces:**
- Consumes: `src/lambda.handler` (Task 2).
- Produces: o serviço `gforce-api` e o recurso lógico `HttpApiStage`, estendido
  pela Task 7.

- [ ] **Step 1: Instalar o Serverless Framework**

Run: `pnpm add -D serverless@^4 serverless-offline serverless-domain-manager`
Expected: os três em `devDependencies`.

- [ ] **Step 2: Ignorar os artefatos de build**

Acrescentar ao `.gitignore`:

```gitignore
# Serverless Framework
.serverless/
.esbuild/
```

- [ ] **Step 3: Criar o `serverless.yml`**

```yaml
service: gforce-api

# Serverless Framework v4: o esbuild e nativo. Nao instalar serverless-esbuild,
# que e idioma do v3.
frameworkVersion: '4'

package:
  patterns:
    # Binarios nativos entram no zip como node_modules (ver build.esbuild.external)
    - 'node_modules/.prisma/client/**'
    - 'node_modules/sharp/**'
    - 'node_modules/@img/**'

build:
  esbuild:
    bundle: true
    minify: true
    sourcemap:
      type: linked
      setNodeOptions: true
    external:
      - '@prisma/client'
      - '.prisma/client'
      - sharp

params:
  dev:
    domainName: api-dev.gforcecoach.com
    disableDefaultEndpoint: false
  prod:
    domainName: api.gforcecoach.com
    disableDefaultEndpoint: true

provider:
  name: aws
  runtime: nodejs22.x
  architecture: arm64
  region: us-east-2
  stage: ${opt:stage, 'dev'}
  memorySize: 1024
  timeout: 29 # teto do API Gateway; nao adianta pedir mais
  logRetentionInDays: 14
  versionFunctions: false
  httpApi:
    payload: '2.0'
    cors: false # o Fastify ja responde CORS; dois CORS = header duplicado
    disableDefaultEndpoint: ${param:disableDefaultEndpoint}
  environment:
    # Constantes de runtime — consequencia da arquitetura, nao configuracao
    NODE_ENV: production
    TRUST_PROXY: 'true' # sem isso o rate-limit ve o IP do API Gateway, nao o do usuario
    ENABLE_NOTIFICATION_SCHEDULER: 'false'
    NOTIFICATION_TIMEZONE: America/Sao_Paulo
    LOG_LEVEL: info

    # Segredos: SSM na AWS, .env local no offline, vazio se faltar (Zod reclama no boot)
    DATABASE_URL: ${ssm:/gforce/${sls:stage}/DATABASE_URL, env:DATABASE_URL, ''}
    JWT_SECRET: ${ssm:/gforce/${sls:stage}/JWT_SECRET, env:JWT_SECRET, ''}
    LEAD_TRACKING_SALT: ${ssm:/gforce/${sls:stage}/LEAD_TRACKING_SALT, env:LEAD_TRACKING_SALT, ''}
    CLOUDINARY_CLOUD_NAME: ${ssm:/gforce/${sls:stage}/CLOUDINARY_CLOUD_NAME, env:CLOUDINARY_CLOUD_NAME, ''}
    CLOUDINARY_API_KEY: ${ssm:/gforce/${sls:stage}/CLOUDINARY_API_KEY, env:CLOUDINARY_API_KEY, ''}
    CLOUDINARY_API_SECRET: ${ssm:/gforce/${sls:stage}/CLOUDINARY_API_SECRET, env:CLOUDINARY_API_SECRET, ''}
    CORS_ORIGIN: ${ssm:/gforce/${sls:stage}/CORS_ORIGIN, env:CORS_ORIGIN, ''}
    MAX_FILE_SIZE: ${ssm:/gforce/${sls:stage}/MAX_FILE_SIZE, env:MAX_FILE_SIZE, '4194304'}
    SMTP_HOST: ${ssm:/gforce/${sls:stage}/SMTP_HOST, env:SMTP_HOST, ''}
    SMTP_PORT: ${ssm:/gforce/${sls:stage}/SMTP_PORT, env:SMTP_PORT, '587'}
    SMTP_SECURE: ${ssm:/gforce/${sls:stage}/SMTP_SECURE, env:SMTP_SECURE, 'false'}
    SMTP_USER: ${ssm:/gforce/${sls:stage}/SMTP_USER, env:SMTP_USER, ''}
    SMTP_PASS: ${ssm:/gforce/${sls:stage}/SMTP_PASS, env:SMTP_PASS, ''}
    SMTP_FROM_EMAIL: ${ssm:/gforce/${sls:stage}/SMTP_FROM_EMAIL, env:SMTP_FROM_EMAIL, ''}
    SMTP_FROM_NAME: ${ssm:/gforce/${sls:stage}/SMTP_FROM_NAME, env:SMTP_FROM_NAME, 'G-Force'}
    TWILIO_ACCOUNT_SID: ${ssm:/gforce/${sls:stage}/TWILIO_ACCOUNT_SID, env:TWILIO_ACCOUNT_SID, ''}
    TWILIO_AUTH_TOKEN: ${ssm:/gforce/${sls:stage}/TWILIO_AUTH_TOKEN, env:TWILIO_AUTH_TOKEN, ''}
    TWILIO_WHATSAPP_FROM: ${ssm:/gforce/${sls:stage}/TWILIO_WHATSAPP_FROM, env:TWILIO_WHATSAPP_FROM, ''}
    USDA_API_KEY: ${ssm:/gforce/${sls:stage}/USDA_API_KEY, env:USDA_API_KEY, ''}
    TACO_API_BASE_URL: ${ssm:/gforce/${sls:stage}/TACO_API_BASE_URL, env:TACO_API_BASE_URL, ''}
    TACO_API_KEY: ${ssm:/gforce/${sls:stage}/TACO_API_KEY, env:TACO_API_KEY, ''}
    YOUTUBE_API_KEY: ${ssm:/gforce/${sls:stage}/YOUTUBE_API_KEY, env:YOUTUBE_API_KEY, ''}
    PRIVACY_CONTROLLER_NAME: ${ssm:/gforce/${sls:stage}/PRIVACY_CONTROLLER_NAME, env:PRIVACY_CONTROLLER_NAME, ''}
    PRIVACY_CONTROLLER_DOCUMENT_TYPE: ${ssm:/gforce/${sls:stage}/PRIVACY_CONTROLLER_DOCUMENT_TYPE, env:PRIVACY_CONTROLLER_DOCUMENT_TYPE, ''}
    PRIVACY_CONTROLLER_DOCUMENT: ${ssm:/gforce/${sls:stage}/PRIVACY_CONTROLLER_DOCUMENT, env:PRIVACY_CONTROLLER_DOCUMENT, ''}
    PRIVACY_CONTROLLER_ADDRESS: ${ssm:/gforce/${sls:stage}/PRIVACY_CONTROLLER_ADDRESS, env:PRIVACY_CONTROLLER_ADDRESS, ''}
    PRIVACY_CONTACT_EMAIL: ${ssm:/gforce/${sls:stage}/PRIVACY_CONTACT_EMAIL, env:PRIVACY_CONTACT_EMAIL, ''}

plugins:
  - serverless-offline

functions:
  api:
    handler: src/lambda.handler
    events:
      - httpApi: '*'
```

- [ ] **Step 4: Registrar os scripts no `package.json`**

Adicionar em `scripts`:

```json
    "sls:package": "serverless package --stage dev",
    "sls:print": "serverless print --stage dev",
    "sls:offline": "serverless offline --stage dev",
```

- [ ] **Step 5: Empacotar**

Run: `pnpm sls:package`
Expected: termina sem erro e cria `.serverless/gforce-api.zip`. Na primeira
execução o v4 pede login (`serverless login`) — é a conta gratuita decidida no
design.

- [ ] **Step 6: Provar que nenhum segredo foi embutido**

Run:

```bash
unzip -o .serverless/gforce-api.zip -d /tmp/sls-check >/dev/null && \
grep -rl "$(grep '^JWT_SECRET=' .env | cut -d= -f2- | cut -c1-20)" /tmp/sls-check | head
```

Expected: **nenhuma saída**. Qualquer arquivo listado é um segredo dentro do
pacote e reprova o critério 1 do cartão 7. Rodar também para
`CLOUDINARY_API_SECRET` e `DATABASE_URL`. Ao terminar: `rm -rf /tmp/sls-check`.

- [ ] **Step 7: Commit**

```bash
git add serverless.yml package.json pnpm-lock.yaml .gitignore
git commit -m "feat(iac): adicionar serverless.yml com provider e funcao HTTP

Serverless Framework v4 com esbuild nativo, Node 22 em arm64 na us-east-2
(colada no Postgres do Render em Ohio). Prisma e sharp ficam fora do
bundle e entram no zip como node_modules.

Segredos resolvem em tres niveis: SSM na AWS, .env no offline, vazio se
faltar — nesse caso o Zod do env.ts reclama no primeiro cold start."
```

---

### Task 6: Funções de cron no `serverless.yml`

Fecha o critério de aceite 3 do cartão 7.

`AWS::Events::Rule` só entende UTC. `method: scheduler` gera
`AWS::Scheduler::Schedule`, que aceita `timezone` — é o que mantém "9h da manhã
em São Paulo" escrito no arquivo em vez da tradução para UTC, que erraria uma
hora se o Brasil voltasse a ter horário de verão.

Equivalência a preservar:

| Job hoje | Cron atual | Vira |
|---|---|---|
| `notification-scheduler.ts`, `FRIDAY_PHOTO_REMINDER_CRON` = `0 9 * * 5` @ São Paulo | sexta 9h | `cron(0 9 ? * FRI *)` @ `America/Sao_Paulo` |
| `notification-scheduler.ts`, `REAVALIACAO_REMINDER_CRON` = `0 8 * * *` @ São Paulo | diário 8h | `cron(0 8 * * ? *)` @ `America/Sao_Paulo` |
| `storage-cleanup-scheduler.ts`, `*/15 * * * *` | a cada 15 min | `rate(15 minutes)` |

**Files:**
- Modify: `serverless.yml` (bloco `functions`)

**Interfaces:**
- Consumes: `src/lambda-crons.fridayPhotoReminder`,
  `src/lambda-crons.reavaliacaoReminder`, `src/lambda-crons.storageCleanup`
  (Task 3).

- [ ] **Step 1: Acrescentar as três funções**

No `serverless.yml`, o bloco `functions` passa a ser:

```yaml
functions:
  api:
    handler: src/lambda.handler
    events:
      - httpApi: '*'

  cronFotosSexta:
    handler: src/lambda-crons.fridayPhotoReminder
    timeout: 300
    events:
      - schedule:
          method: scheduler # AWS::Scheduler::Schedule: aceita timezone
          rate:
            - cron(0 9 ? * FRI *)
          timezone: America/Sao_Paulo

  cronReavaliacao:
    handler: src/lambda-crons.reavaliacaoReminder
    timeout: 300
    events:
      - schedule:
          method: scheduler
          rate:
            - cron(0 8 * * ? *)
          timezone: America/Sao_Paulo

  cronStorageCleanup:
    handler: src/lambda-crons.storageCleanup
    timeout: 300
    events:
      # Intervalo puro: timezone nao significa nada aqui
      - schedule:
          rate:
            - rate(15 minutes)
```

- [ ] **Step 2: Conferir que os quatro handlers foram reconhecidos**

Run: `pnpm sls:print | grep -A2 "handler:"`
Expected: aparecem `src/lambda.handler`, `src/lambda-crons.fridayPhotoReminder`,
`src/lambda-crons.reavaliacaoReminder`, `src/lambda-crons.storageCleanup`.

- [ ] **Step 3: Conferir os schedules gerados**

Run: `pnpm sls:print | grep -E "cron\(|rate\(|timezone"`
Expected exatamente:

```
            - cron(0 9 ? * FRI *)
          timezone: America/Sao_Paulo
            - cron(0 8 * * ? *)
          timezone: America/Sao_Paulo
            - rate(15 minutes)
```

- [ ] **Step 4: Empacotar de novo**

Run: `pnpm sls:package`
Expected: sem erro; agora com quatro funções empacotadas.

- [ ] **Step 5: Commit**

```bash
git add serverless.yml
git commit -m "feat(iac): agendar os tres crons no EventBridge

Uma funcao por job, com a mesma periodicidade do node-cron atual. Os dois
lembretes usam AWS::Scheduler::Schedule para preservar o fuso
America/Sao_Paulo; a limpeza de storage usa rate(15 minutes), onde
timezone nao significa nada."
```

---

### Task 7: Domínio, throttling e paridade entre stages

Fecha o critério de aceite 4 do cartão 7.

O Serverless **não** expõe throttling para HTTP API — o `usagePlan` da
documentação é exclusivo de REST API. Vai por extensão do recurso `HttpApiStage`
gerado pelo framework.

**Files:**
- Modify: `serverless.yml` (`params`, `plugins`, `custom`, `resources`)

- [ ] **Step 1: Acrescentar os parâmetros de throttling e domínio por stage**

O bloco `params` passa a ser:

```yaml
params:
  dev:
    domainName: api-dev.gforcecoach.com
    disableDefaultEndpoint: false
    throttleRate: 10
    throttleBurst: 20
  prod:
    domainName: api.gforcecoach.com
    disableDefaultEndpoint: true
    throttleRate: 100
    throttleBurst: 200
```

- [ ] **Step 2: Registrar o plugin de domínio e sua configuração**

O bloco `plugins` passa a:

```yaml
plugins:
  - serverless-domain-manager
  - serverless-offline
```

E acrescentar o bloco `custom` (antes de `functions`):

```yaml
custom:
  customDomain:
    domainName: ${param:domainName}
    basePath: ''
    apiType: http
    # HTTP API usa certificado da propria regiao. A regra "certificado em
    # us-east-1" vale para CloudFront e REST API edge-optimized.
    endpointType: regional
    securityPolicy: tls_1_2
    # Criacao do dominio e do registro DNS acontece no cartao 8, nao aqui.
    createRoute53Record: false
    autoDomain: false
```

- [ ] **Step 3: Acrescentar o throttling**

No fim do `serverless.yml`:

```yaml
resources:
  extensions:
    # O Serverless nao expoe throttle para HTTP API; estende-se o stage direto.
    # Compensa parcialmente o @fastify/rate-limit, que em Lambda passa a contar
    # por instancia.
    HttpApiStage:
      Properties:
        DefaultRouteSettings:
          ThrottlingRateLimit: ${param:throttleRate}
          ThrottlingBurstLimit: ${param:throttleBurst}
```

- [ ] **Step 4: Provar que dev e prod só diferem no previsto**

Run:

```bash
serverless print --stage dev  > /tmp/sls-dev.yml
serverless print --stage prod > /tmp/sls-prod.yml
diff /tmp/sls-dev.yml /tmp/sls-prod.yml
```

Expected: as únicas diferenças são `domainName` (`api-dev.` vs `api.`),
`disableDefaultEndpoint` (`false` vs `true`), os dois valores de throttling, o
`stage` e o prefixo `/gforce/dev` vs `/gforce/prod` nos parâmetros SSM.
**Qualquer outra linha divergente reprova o critério 4** e deve ser corrigida
antes de seguir. Ao terminar: `rm -f /tmp/sls-dev.yml /tmp/sls-prod.yml`.

- [ ] **Step 5: Commit**

```bash
git add serverless.yml
git commit -m "feat(iac): custom domain, throttling e paridade entre stages

Dominio via serverless-domain-manager com certificado ACM regional
(HTTP API nao usa us-east-1). Throttling entra por extensao do
HttpApiStage, porque o framework so expoe usage plan para REST API.

dev e prod diferem apenas em dominio, endpoint padrao, limites de
throttle e prefixo dos parametros SSM."
```

---

### Task 8: Validação offline, inventário do SSM e limite de upload

Fecha o critério de aceite 2 do cartão 7 e o 5 do cartão 6.

O limite de upload cai para 4MB nos stages AWS. Motivo: a Lambda aceita no máximo
6MB de payload síncrono e o API Gateway infla binário em ~33% ao codificá-lo,
então o teto real é ~4,5MB. Com os 5MB de hoje, arquivos grandes falhariam em
produção com erro obscuro. O dev local segue em 5MB pelo `.env`.

**Files:**
- Create: `docs/aws-migration/SSM-PARAMETERS.md`
- Modify: `docs/aws-migration/DESIGN-cards-6-7-lambda-iac.md` (marcar implementado)

- [ ] **Step 1: Subir o offline**

Run: `pnpm db:start && pnpm sls:offline`
Expected: o serverless-offline sobe e lista as rotas do Fastify sob
`ANY /{proxy+}`. Os segredos vêm do `.env` local pela cadeia de fallback.

- [ ] **Step 2: Provar paridade com o `pnpm dev`**

Em outro terminal:

```bash
curl -s http://localhost:3000/health
```

Expected: mesmo corpo que `curl -s http://localhost:3333/health` devolve com
`pnpm dev` rodando — `{"status":"ok",...}`. Encerrar o offline depois.

- [ ] **Step 3: Escrever o inventário dos parâmetros SSM**

Criar `docs/aws-migration/SSM-PARAMETERS.md`:

````markdown
# Parâmetros SSM — `/gforce/<stage>/`

Inventário dos parâmetros que o `serverless.yml` consome. **Criar estes
parâmetros é trabalho do cartão 8**, na conta AWS de cada stage; este documento
é o roteiro.

Contas: dev `605618941761`, prod `565828850910`. Região `us-east-2`.

## SecureString (segredos)

`DATABASE_URL` · `JWT_SECRET` · `LEAD_TRACKING_SALT` · `CLOUDINARY_API_KEY` ·
`CLOUDINARY_API_SECRET` · `SMTP_USER` · `SMTP_PASS` · `TWILIO_AUTH_TOKEN` ·
`USDA_API_KEY` · `TACO_API_KEY` · `YOUTUBE_API_KEY`

`DATABASE_URL` deve terminar com `?connection_limit=3&sslmode=require`: Lambdas
concorrentes com pool alto estouram o limite de conexões do Postgres do Render, e
o tráfego cruza a internet.

## String (configuração por ambiente)

`CORS_ORIGIN` · `CLOUDINARY_CLOUD_NAME` · `MAX_FILE_SIZE` · `SMTP_HOST` ·
`SMTP_PORT` · `SMTP_SECURE` · `SMTP_FROM_EMAIL` · `SMTP_FROM_NAME` ·
`TWILIO_ACCOUNT_SID` · `TWILIO_WHATSAPP_FROM` · `TACO_API_BASE_URL` ·
`PRIVACY_CONTROLLER_NAME` · `PRIVACY_CONTROLLER_DOCUMENT_TYPE` ·
`PRIVACY_CONTROLLER_DOCUMENT` · `PRIVACY_CONTROLLER_ADDRESS` ·
`PRIVACY_CONTACT_EMAIL`

`MAX_FILE_SIZE` = `4194304` (4MB) nos dois stages. A Lambda aceita 6MB de payload
síncrono e o API Gateway infla binário em ~33% ao codificar, então o teto real
é ~4,5MB. Os 5MB do dev local não passariam.

## Fixos no `serverless.yml` (não vão para o SSM)

`NODE_ENV=production` · `TRUST_PROXY=true` · `ENABLE_NOTIFICATION_SCHEDULER=false` ·
`NOTIFICATION_TIMEZONE=America/Sao_Paulo` · `LOG_LEVEL=info`

São consequência da arquitetura, não escolha de ambiente. `TRUST_PROXY=true` é
obrigatório atrás do API Gateway: sem ele o rate-limit enxerga o IP do gateway
em vez do IP do usuário e limita todo mundo junto.

## Como criar (cartão 8)

```bash
aws ssm put-parameter --profile gforce-dev --region us-east-2 \
  --name /gforce/dev/JWT_SECRET --type SecureString --value 'VALOR' --overwrite

aws ssm put-parameter --profile gforce-dev --region us-east-2 \
  --name /gforce/dev/MAX_FILE_SIZE --type String --value '4194304' --overwrite
```

Conferir o que já existe:

```bash
aws ssm get-parameters-by-path --profile gforce-dev --region us-east-2 \
  --path /gforce/dev --recursive --query 'Parameters[].Name' --output table
```
````

- [ ] **Step 4: Rodar a suíte completa e o lint**

Run: `pnpm test:unit && pnpm lint`
Expected: PASS. Confirma o critério 1 do cartão 6 — nada do dev local regrediu.

- [ ] **Step 5: Commit**

```bash
git add docs/aws-migration/SSM-PARAMETERS.md
git commit -m "docs(aws-migration): inventario dos parametros SSM

Lista o que e SecureString, o que e configuracao e o que fica fixo no
YAML, com os comandos de criacao para o cartao 8. Registra MAX_FILE_SIZE
em 4MB: a Lambda aceita 6MB de payload e o API Gateway infla binario em
~33%, entao o teto real e ~4,5MB."
```

---

## Verificação final

Rodar antes de dar os cartões por concluídos:

| Critério | Comando | Esperado |
|---|---|---|
| 7.1 pacote sem erro nem segredo | `pnpm sls:package` + grep do Step 6 da Task 5 | zip gerado, grep vazio |
| 7.2 offline com paridade | Steps 1–2 da Task 8 | mesmo corpo em `:3000` e `:3333` |
| 7.3 cada cron tem função | Step 3 da Task 6 | três schedules, dois com timezone |
| 7.4 dev ≡ prod | Step 4 da Task 7 | só as diferenças previstas |
| 6.1 dev local intacto | `pnpm test:unit && pnpm dev` | suíte verde, servidor sobe com os crons |
| 6.2 handler HTTP | `pnpm test:unit -- test/unit/lambda/http-handler.spec.ts` | PASS |
| 6.3 cron encerra limpo | `pnpm test:unit -- test/unit/lambda/cron-handlers.spec.ts` | PASS, `getTimerCount() === 0` |
| 6.4 binários no bundle | `unzip -l .serverless/gforce-api.zip \| grep -E 'linux-arm64'` | engine do Prisma e `@img/sharp-linux-arm64` |
| 6.5 limite de upload | `docs/aws-migration/SSM-PARAMETERS.md` | `MAX_FILE_SIZE=4194304` documentado |

## Fora deste plano

Deploy em conta AWS real e criação dos parâmetros SSM (cartão 8), frontend
(cartão 9), CI/CD (cartão 10), cutover (cartão 11). Signed upload direto no
Cloudinary — trabalho futuro, exige mudança no frontend.
