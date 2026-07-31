# Design — Cartões 6 e 7: backend em Lambda + IaC com Serverless Framework

Data: 2026-07-31
Cartões: [6. Adaptar backend pra Lambda](https://app.clickup.com/t/86ajm6v2n) ·
[7. IaC com Serverless Framework](https://app.clickup.com/t/86ajm6v6h)
Status: implementado (cartões 6, 7 e 8 concluídos localmente — deploy em conta
AWS real e criação dos parâmetros `/gforce/prod/*` seguem pendentes, ver
`docs/aws-migration/SSM-PARAMETERS.md`)

## Por que os dois cartões juntos

O cartão 7 declara na infraestrutura arquivos que o cartão 6 cria no código
(`src/lambda.ts` e os handlers de cron). Na data deste design nenhum deles
existia no repositório, apesar do cartão 6 estar como "in progress" no ClickUp —
verificado: sem `src/lambda.ts`, sem `@fastify/aws-lambda` no `package.json`,
`generator client` do Prisma sem `binaryTargets`, e `src/server.ts:16-17` ainda
chamando os schedulers `node-cron`.

Sem o cartão 6, o esbuild do Serverless falha ao empacotar e o critério de
aceite 1 do cartão 7 (`serverless package` sem erro) já não passa. Logo: um
design, dois cartões.

## Decisões tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Ferramenta de IaC | Serverless Framework v4 | Caminho mais curto para o que os cartões 7–11 já assumem. Login exigido uma vez; `SERVERLESS_ACCESS_KEY` vira secret no cartão 10. |
| Bundling | esbuild **nativo do v4** | O v4 traz esbuild embutido. O plugin `serverless-esbuild` citado no cartão é idioma do v3 — instalá-lo no v4 é regressão. Config vai em `build.esbuild`. |
| Agendamento | `method: scheduler` + `timezone` | `AWS::Events::Rule` só entende UTC. `AWS::Scheduler::Schedule` aceita `America/Sao_Paulo` e preserva a intenção do produto ("9h da manhã do aluno"), imune a mudança de horário de verão. |
| Segredos | SSM resolvido no deploy, `SecureString` | `src/env.ts` valida com Zod **no import** — todo o backend assume `process.env` preenchido. Busca em runtime exigiria tornar `env.ts` assíncrono, o que extrapola o cartão. |
| Limite de upload | 4MB nos stages AWS | Lambda aceita 6MB de payload síncrono e o API Gateway infla binário em ~33% ao codificar: o teto real é ~4,5MB. 4MB dá margem e falha com mensagem honesta. |
| Região | `us-east-2` (Ohio) | Colada no Postgres do Render, que fica em Ohio (cartão 1). Cada query Lambda→Render atravessa a internet. |
| Domínio | `gforcecoach.com` | `api.gforcecoach.com` (prod), `api-dev.gforcecoach.com` (dev). |

Contas AWS (cartões 2 e 3, já entregues): `gforce-dev` = `605618941761`,
`gforce-prod` = `565828850910`, SSO `d-906678da07`.

## Cartão 6 — o backend vira função

### O conflito interno do cartão, e como é resolvido

O cartão 6 diz *"node-cron sai de cena"*, mas seu critério de aceite 1 exige que
`pnpm dev` continue **exatamente** como hoje — e hoje `pnpm dev` roda os crons
em processo. As duas frases só convivem se `node-cron` sair da **produção**, não
da máquina do desenvolvedor.

Desenho: o corpo de cada job sai de dentro do `cron.schedule(...)` e vira função
pura num módulo compartilhado. Os schedulers locais passam a chamar essa função;
os handlers Lambda chamam a mesma função. Um job, dois acionadores.

### Arquivos

| Arquivo | Situação | Conteúdo |
|---|---|---|
| `src/jobs/index.ts` | novo | `sendFridayPhotoReminder`, `sendReavaliacaoReminders`, `processStorageDeletions` — funções puras, sem agendamento |
| `src/lambda.ts` | novo | `awsLambdaFastify(app)` → `export const handler`. Importa `app.ts`, **nunca** `server.ts` |
| `src/lambda-crons.ts` | novo | 3 handlers; cada um chama um job e retorna |
| `src/server.ts` | intacto | dev local segue idêntico |
| `src/infraestructure/notifications/notification-scheduler.ts` | ajustado | passa a chamar `src/jobs/`, sem lógica própria |
| `src/infraestructure/storage/storage-cleanup-scheduler.ts` | ajustado | idem |
| `prisma/schema.prisma` | ajustado | `binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]` |
| `package.json` | ajustado | `+@fastify/aws-lambda`, `+serverless`, `+serverless-offline`, `+serverless-domain-manager` |

Em produção `server.ts` e os schedulers nunca são carregados: o bundle parte de
`lambda.ts` / `lambda-crons.ts`, que não os importam.

### Binários nativos

`@prisma/client` e `sharp` ficam **fora** do bundle (`external`) e entram no zip
como `node_modules` — binário nativo não sobrevive a bundling. `sharp` precisa
ser instalado para `linux/arm64` explicitamente, não o binário do macOS.

### Conexão com o banco

`connection_limit=3&sslmode=require` mora **dentro do valor** do parâmetro SSM
`DATABASE_URL`, não no código. Lambdas concorrentes com pool alto estouram o
limite de conexões do Postgres do Render, e o tráfego cruza a internet.

### Upload

`MAX_FILE_SIZE` passa a 4MB nos stages AWS (parâmetro SSM); o dev local segue em
5MB. `MAX_PHOTO_SIZE` (2MB) não é afetado. O signed upload direto no Cloudinary
— que removeria o teto de vez — fica registrado como trabalho futuro, fora
destes dois cartões porque exige mudança no frontend (outro repositório).

## Cartão 7 — o `serverless.yml`

### Provider

```yaml
service: gforce-api
provider:
  name: aws
  runtime: nodejs22.x
  architecture: arm64
  region: us-east-2
  memorySize: 1024
  logRetentionInDays: 14      # log eterno é o maior vazamento do alvo de US$1-2/mês
  httpApi:
    cors: false               # o Fastify já responde CORS; dois CORS = header duplicado
    payload: '2.0'
```

### Bundling

```yaml
build:
  esbuild:
    bundle: true
    minify: true
    external:                   # binário nativo não sobrevive a bundling
      - '@prisma/client'
      - '.prisma/client'
      - sharp
package:
  patterns:
    - 'node_modules/.prisma/client/**'
    - 'node_modules/sharp/**'
    - 'node_modules/@img/**'
```

### Funções

| Função | Handler | Gatilho | Timeout |
|---|---|---|---|
| `api` | `src/lambda.handler` | `httpApi: '*'` | 29s (teto do API Gateway) |
| `cronFotosSexta` | `src/lambda-crons.fridayPhotoReminder` | `cron(0 9 ? * FRI *)` @ `America/Sao_Paulo` | 300s |
| `cronReavaliacao` | `src/lambda-crons.reavaliacaoReminder` | `cron(0 8 * * ? *)` @ `America/Sao_Paulo` | 300s |
| `cronStorageCleanup` | `src/lambda-crons.storageCleanup` | `rate(15 minutes)` | 300s |

Equivalência com o sistema atual (critério de aceite 3 do cartão 7):

| Job hoje | Cron atual | Origem | Vira |
|---|---|---|---|
| Lembrete de fotos (sexta) | `0 9 * * 5` TZ São Paulo | `notification-scheduler.ts`, env `FRIDAY_PHOTO_REMINDER_CRON` | `cronFotosSexta` |
| Lembrete de reavaliação | `0 8 * * *` TZ São Paulo | `notification-scheduler.ts`, env `REAVALIACAO_REMINDER_CRON` | `cronReavaliacao` |
| Limpeza de storage | `*/15 * * * *` UTC | `storage-cleanup-scheduler.ts`, hardcoded | `cronStorageCleanup` |

Os dois lembretes usam `method: scheduler` (timezone). A limpeza usa
`rate(15 minutes)` clássico — timezone não significa nada para um intervalo.

### Domínio

`serverless-domain-manager` com `apiType: http`, `endpointType: regional`,
certificado ACM em **us-east-2**. A regra "certificado em us-east-1" vale para
CloudFront e REST API edge-optimized — não para HTTP API regional. Em prod,
`disableDefaultEndpoint: true`, para que a API só seja acessível pelo domínio.

### Throttling

O Serverless **não** expõe throttle para HTTP API (o `usagePlan` da documentação
é exclusivo de REST API). Vai por extensão de recurso:

```yaml
resources:
  extensions:
    HttpApiStage:
      Properties:
        DefaultRouteSettings:
          ThrottlingRateLimit: 100      # prod (dev: 10)
          ThrottlingBurstLimit: 200     # prod (dev: 20)
```

Compensa parcialmente o `@fastify/rate-limit`, que em Lambda passa a contar por
instância.

### Segredos

Formato: `${ssm:/gforce/${sls:stage}/NOME}`.

**SecureString** — `DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`, `SMTP_USER`, `SMTP_PASS`, `TWILIO_AUTH_TOKEN`,
`LEAD_TRACKING_SALT`, `USDA_API_KEY`, `TACO_API_KEY`, `YOUTUBE_API_KEY`

**String** (configuração por ambiente, não segredo) — `CORS_ORIGIN`,
`CLOUDINARY_CLOUD_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `TWILIO_ACCOUNT_SID`,
`TWILIO_WHATSAPP_FROM`, `MAX_FILE_SIZE`, `PRIVACY_*`

**Fixo no YAML** (constante de runtime, não configuração) — `NODE_ENV=production`,
`TRUST_PROXY=true`

`TRUST_PROXY=true` é obrigatório atrás do API Gateway: sem ele o rate-limit
enxerga o IP da AWS em vez do IP do usuário e passa a limitar todo mundo junto.

`ENABLE_NOTIFICATION_SCHEDULER` **não** entra aqui, mesmo sendo uma decisão de
arquitetura e não configuração de ambiente. A intenção original era desligar
só o `node-cron` in-process (que de fato nunca é carregado em Lambda — o
bundle parte de `lambda.ts`/`lambda-crons.ts`, que não importam
`cron-scheduler.ts`), mas `job-registry.ts` usa a mesma flag como gate de
**execução** do job, não só de agendamento local. Fixá-la em `false` no YAML
desabilitaria `cronFotosSexta`/`cronReavaliacao` em produção: o EventBridge
dispara, a Lambda roda e retorna `{"status":"skipped"}` — sucesso no
CloudWatch, nenhum aluno notificado. `src/env.ts` já tem default `true`, que é
o que se quer em produção.

### Diferença entre stages

Apenas domínio, conta e prefixo dos parâmetros SSM — como exige o critério de
aceite 4. Verificável por `diff` entre `serverless print --stage dev` e
`--stage prod`.

## Verificação

| Critério | Como é provado |
|---|---|
| 7.1 — `serverless package --stage dev` sem erro e sem segredo embutido | roda o comando; `grep` no artefato por trechos dos segredos |
| 7.2 — `serverless offline` com paridade com `pnpm dev` | sobe offline e bate a mesma rota real nos dois |
| 7.3 — cada cron tem função com schedule equivalente | tabela de equivalência acima |
| 7.4 — dev e prod só diferem em domínio/conta/SSM | `diff` dos dois `serverless print` |
| 6.1 — `pnpm dev` idêntico ao atual | schedulers preservados; suíte atual segue verde |
| 6.2 — handler responde a evento do API Gateway | teste Vitest invocando `handler` com evento sintético |
| 6.3 — cron roda 1x e encerra sem timer pendente | teste Vitest por handler |
| 6.4 — binários corretos no bundle | inspeção do zip: `.prisma/client/*.node` e `@img/sharp-linux-arm64` |
| 6.5 — upload no tamanho máximo passa | limite de 4MB documentado e aplicado via SSM |

## Riscos aceitos

- **Rate-limit enfraquece.** `@fastify/rate-limit` é in-memory, portanto por
  instância Lambda. O throttling do API Gateway compensa em parte. Já aceito no
  cartão 6.
- **Cold start de 1–2s** com Fastify + Prisma. Sem provisioned concurrency —
  custaria mais que a fatura-alvo inteira.
- **Segredos legíveis na configuração da Lambda** por quem tiver
  `lambda:GetFunctionConfiguration` na conta. Consequência direta da resolução
  no deploy; a alternativa (busca em runtime) exigiria reescrever `src/env.ts`.
- **Latência Lambda→Render** atravessa a internet mesmo com as regiões coladas.

## Fora de escopo

Deploy em conta AWS real (cartão 8), frontend (cartão 9), CI/CD (cartão 10),
cutover (cartão 11). Signed upload direto no Cloudinary — trabalho futuro.
