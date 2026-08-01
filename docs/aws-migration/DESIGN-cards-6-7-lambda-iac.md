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

Tabela conferida contra o repositório entregue, não contra o plano original —
a entrega consolidou os jobs num registro central em vez de um módulo
`src/jobs/index.ts` com funções soltas, e os dois schedulers antigos foram
removidos, não ajustados.

| Arquivo | Situação | Conteúdo |
|---|---|---|
| `src/infraestructure/jobs/job-registry.ts` | novo | Registro central: `JOB_NAMES`, `jobRegistry` (um `isEnabled()`/`run()` por job), `getJob`. Substitui as duas funções puras que o plano original previa em `src/jobs/index.ts` — esse arquivo nunca chegou a existir |
| `src/infraestructure/jobs/cron-scheduler.ts` | novo | Agendador local (`node-cron`), usado só pelo `pnpm dev`; lê o mesmo `jobRegistry` |
| `src/lambda.ts` | novo | `awsLambdaFastify(app)` → `export const handler`. Importa `app.ts`, **nunca** `server.ts` |
| `src/lambda-crons.ts` | novo | 3 handlers; cada um chama `getJob(name).run()` e retorna |
| `src/server.ts` | ajustado | troca a chamada aos dois schedulers antigos por `cronScheduler.start()`/`stop()` |
| `src/infraestructure/notifications/notification-scheduler.ts` | removido | lógica migrada para `job-registry.ts` + `cron-scheduler.ts` |
| `src/infraestructure/storage/storage-cleanup-scheduler.ts` | removido | idem |
| `prisma/schema.prisma` | ajustado | `binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]` |
| `package.json` | ajustado | `+@fastify/aws-lambda`, `+serverless`, `+serverless-offline`, `+serverless-domain-manager` |

Em produção `server.ts` e `cron-scheduler.ts` nunca são carregados: o bundle
parte de `lambda.ts` / `lambda-crons.ts`, que não os importam.

### Binários nativos

`@prisma/client` e `sharp` ficam **fora** do bundle (`external`) e entram no zip
como `node_modules` — binário nativo não sobrevive a bundling. `sharp` precisa
ser instalado para `linux/arm64` explicitamente, não o binário do macOS.

**Exclusão de variantes darwin/musl em `package.patterns` — limite conhecido.**
Os padrões `!node_modules/@img/*darwin*` e `!node_modules/@img/*musl*` do
`serverless.yml` tinham um bug de glob: sem `/**`, casam só o diretório em si,
não o conteúdo — corrigido acrescentando `/**` aos dois. Mas esse conserto,
sozinho, **não** remove os binários darwin do zip quando o `serverless
package`/`deploy` roda numa máquina macOS. Investigado com o código-fonte do
Serverless Framework v4.40 (`~/.serverless/releases/4.40.0/package/dist/sf-core.js`,
plugin `Esbuild`, métodos `_preparePackageJson`/`_packageAll`):

1. Antes de zipar, o plugin escreve um `package.json` enxuto (só com as
   dependências marcadas `external`) em `.serverless/build/` e roda `pnpm
   install` **dentro dessa pasta**, na máquina que está empacotando.
2. Esse `pnpm install` herda `pnpm.supportedArchitectures` do `package.json`
   do projeto (`os: ["current", "linux"]`, sem `libc` fixado) — então, numa
   máquina macOS, ele reinstala `sharp` com as variantes darwin (`current`) E
   linux/musl/glibc, do zero, dentro de `.serverless/build/node_modules`.
3. Na hora de gerar o zip, `_packageAll()` chama
   `zip2.directory(".serverless/build/node_modules", "node_modules")`
   **incondicionalmente, antes de aplicar `package.patterns`** — essa cópia
   inteira entra no artefato sem nenhum filtro. Só depois disso o código
   itera `package.patterns` (via `globby`) e tenta adicionar arquivos da
   `node_modules/` real do projeto por cima; como os caminhos de zip
   coincidem, essa segunda tentativa não tem efeito sobre o que a primeira
   cópia (incondicional) já escreveu.

Ou seja: os padrões `!node_modules/@img/*darwin*/**` e `!*musl*/**` **corrigem
a sintaxe do glob** (que antes não excluía nada mesmo dentro da sua própria
etapa) e têm efeito real sobre o tamanho do zip. Medido nesta máquina
(macOS, `pnpm sls:package`, dois empacotamentos por configuração para
confirmar reprodutibilidade): o zip com o glob correto (`/**`) ficou em
**46.622.442 bytes** (~46,6 MB) nas duas rodadas; com o glob antigo (sem
`/**`, que não excluía nada), **~63.286.145 bytes** (~63,3 MB), também
estável entre rodadas. A diferença é real, não variação de compressão: o
glob corrigido remove 20 entradas duplicadas do zip (68 → 48 caminhos que
apareciam repetidos), encolhendo o arquivo em 16,66 MB. O conteúdo
*extraído* é idêntico nos dois casos porque cada caminho duplicado resolve
para o mesmo arquivo na extração — a segunda cópia grava por cima da
primeira; só o zip em si tem menos bytes a percorrer com o glob corrigido.

Essa diferença tem consequência prática, não é só estética: **63,3 MB
ultrapassa o limite de 50 MB para upload direto de código de função Lambda;
46,6 MB fica dentro dele.** Sem o `/**`, o pacote dependeria de publicar via
S3 em vez de upload direto — o glob corrigido evita essa complicação extra.

Com honestidade: mesmo com o glob corrigido, **os binários `darwin` e
`linuxmusl` do `@img` continuam no artefato** (~33,7 MB descompactados,
somando `sharp-darwin-arm64`, `sharp-libvips-darwin-arm64`,
`sharp-linuxmusl-arm64` e `sharp-libvips-linuxmusl-arm64`) — é a mesma causa
descrita nos passos 1–3 acima: o Serverless reinstala os pacotes marcados
como `external` (aqui, `sharp`) do zero numa pasta isolada
(`.serverless/build/node_modules`) e copia essa pasta inteira para o zip
**antes** de aplicar `package.patterns`, então nenhuma exclusão de glob
alcança essa cópia. Fica registrado como limitação conhecida e aceita: o
pacote (~46,6 MB) segue confortavelmente abaixo dos limites da AWS (50 MB
de upload direto, 250 MB descompactado), então não há urgência em resolver
isso agora.

Numa máquina Linux (ex.: CI), tanto o `pnpm install` de `.serverless/build`
quanto o `node_modules` real do projeto resolveriam `current` como `linux`,
não `darwin` — nesse caso os binários darwin não entrariam por nenhum dos
dois caminhos, e a sobra de ~33,7 MB descrita acima não existiria. A
variante `musl`, porém, entraria em qualquer SO enquanto
`supportedArchitectures` (hoje em `pnpm-workspace.yaml`, ver correção
separada) não tiver `libc: ["glibc"]` — isso não foi alterado aqui por
estar fora do escopo desta correção (mexe em como o ambiente de
desenvolvimento local resolve dependências) e fica registrado como
trabalho futuro.

Confirmado, em ambos os casos, que os binários exigidos pelo runtime seguem
no zip: `node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node`
e `node_modules/@img/sharp-linux-arm64/lib/sharp-linux-arm64.node`.

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

O bloco `params` do `serverless.yml` faz divergir quatro valores entre `dev` e
`prod` — não só o domínio:

| Parâmetro | `dev` | `prod` | Por quê |
|---|---|---|---|
| `domainName` | `api-dev.gforcecoach.com` | `api.gforcecoach.com` | domínio por ambiente, óbvio |
| `disableDefaultEndpoint` | `false` | `true` | em prod, a URL crua do API Gateway (`https://{api-id}.execute-api...`) fica desativada de propósito — força todo tráfego pelo domínio customizado, para não existir uma segunda porta de entrada sem WAF/observabilidade de domínio. Em dev, a URL crua fica ligada porque é conveniente testar sem esperar propagação de DNS |
| `throttleRate` | `10` | `100` | throttle baixo em dev protege contra teste de carga acidental (ou um loop de retry mal escrito) estourando o orçamento de um ambiente que não deveria receber tráfego de produção |
| `throttleBurst` | `20` | `200` | mesma razão do `throttleRate`, para o pico instantâneo |

Além do bloco `params`, dev e prod também divergem em conta AWS (perfis
`gforce-dev`/`gforce-prod`) e no prefixo dos parâmetros SSM
(`/gforce/${sls:stage}/...`, via `${sls:stage}`) — como exige o critério de
aceite 4. Verificável por `diff` entre `serverless print --stage dev` e
`--stage prod` (mais o `params` acima, que o `diff` já cobre).

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
- **Segredos em texto plano em quatro lugares, não só na configuração da
  Lambda — três na conta AWS, um no disco local de quem empacota.**
  (1) `Environment.Variables` de cada função,
  legível por quem tiver `lambda:GetFunctionConfiguration`. (2) O
  `cloudformation-template-update-stack.json` que o Serverless gera a cada
  `package`/`deploy` — ele embute os valores já resolvidos do SSM como texto
  plano nas propriedades de cada função, e é legível por quem tiver
  `cloudformation:GetTemplate` na conta, mesmo sem nenhuma permissão sobre
  Lambda. (3) O mesmo template, guardado no bucket S3 de deploy do Serverless
  (`serverless-framework-deployments-...`), legível por quem tiver
  `s3:GetObject` nesse bucket. (4) **`.serverless/meta.json` e
  `.serverless/serverless-state.json`, no disco local de quem empacota** —
  o Serverless grava os mesmos valores já resolvidos do SSM, em texto
  plano, nesses dois arquivos a cada `sls:package`/`sls:deploy`, antes
  mesmo de qualquer upload à AWS. `.serverless/` está no `.gitignore`
  (não é versionado), mas convém apagar a pasta manualmente depois de
  empacotar — ela sobrevive no disco entre execuções e é legível por
  qualquer processo ou pessoa com acesso à máquina, sem precisar de
  nenhuma permissão AWS. Nenhum desses quatro segredos está no `.zip` do
  pacote de código (o artefato auditado no critério 7.1) — o zip contém só
  código e binários nativos; os outros três são artefatos à parte, gerados
  e publicados pelo próprio Serverless Framework. É consequência inevitável de
  resolver `${ssm:...}` **no momento do deploy** para popular
  `provider.environment`: o valor precisa estar em algum artefato do
  CloudFormation para a Lambda recebê-lo como variável de ambiente. A
  alternativa — buscar os segredos em runtime, dentro do handler, em vez de
  no deploy — foi avaliada e recusada: `src/env.ts` valida com Zod de forma
  síncrona, no import, e todo o backend assume `process.env` já preenchido
  antes de qualquer outro módulo carregar; buscar no SSM em runtime exigiria
  tornar `env.ts` assíncrono, o que extrapola os cartões 6 e 7.
- **Latência Lambda→Render** atravessa a internet mesmo com as regiões coladas.

## Fora de escopo

Deploy em conta AWS real (cartão 8), frontend (cartão 9), CI/CD (cartão 10),
cutover (cartão 11). Signed upload direto no Cloudinary — trabalho futuro.
