# Runbook — tirar o Render de jogo

Sequência para deixar a API da AWS servindo sozinha. Escrito para ser seguido
na ordem: cada passo tem o que verificar antes de avançar e como voltar atrás.

**Estado verificado em 2026-08-10** (por `scripts/smoke-deployed.mjs`):

| | p95 warm | 1ª requisição | verificações |
|---|---|---|---|
| `api-dev.gforcecoach.com` | 234ms | 2,04s | 10/10 |
| `api.gforcecoach.com` | 192ms | 2,25s | 10/10 |

As medidas saíram de uma máquina de desenvolvimento, então incluem a latência
de rede até `us-east-2` — não isolam a perna Lambda→Render. Servem de linha de
base para comparação, não de medida da arquitetura.

---

## ⚠️ Antes de qualquer comando `aws`

Os perfis `gforce-dev` e `gforce-prod` estão configurados com região
**`us-east-1`**, mas todo o ambiente vive em **`us-east-2`**. SSM, Lambda,
EventBridge e CloudWatch são todos regionais: sem `--region us-east-2`, os
comandos respondem com sucesso e lista vazia — o que parece "não existe" e na
verdade é "você olhou no lugar errado".

```bash
aws ssm get-parameters-by-path --profile gforce-dev --region us-east-2 \
  --path /gforce/dev --recursive --query "Parameters[].Name"
```

## Estado confirmado na conta (2026-08-10)

| | dev (`605618941761`) | prod (`565828850910`) |
|---|---|---|
| Parâmetros SSM | 17/17 | 17/17 |
| `CORS_ORIGIN` | `https://www.gforcecoach.com` | idem |
| `MAX_FILE_SIZE` | `4194304` | idem |
| Crons no EventBridge | 3, todos `DISABLED` | 3, todos `DISABLED` |
| Alarmes | 4, ativos | **nenhum — falta deploy** |
| Erros na última semana | nenhum | nenhum |

**Dev e prod apontam para o mesmo banco**, confirmado:
`dpg-d4igg08gjchc73ektprg-a.ohio-postgres.render.com/gym_database_server`.

O apex `gforcecoach.com` responde 307 para `www`, então o `Origin` que chega à
API é sempre o `www` — o `CORS_ORIGIN` atual cobre o caso real.

## O que já está pronto

- API implantada nos dois stages, com domínio próprio e HTTPS válido.
- `api.gforcecoach.com` e `api-dev.gforcecoach.com` resolvem para o API Gateway.
- CORS respondendo com origem única (sem cabeçalho duplicado).
- Upload de mídia de exercício não passa mais pela Lambda — vai assinado, direto
  ao Cloudinary, então o teto de payload do API Gateway deixou de limitá-lo.
  Implantado em dev; as rotas `/assinatura` e `/confirmacao` respondem, e o
  caminho multipart antigo segue no ar como rota de volta.
- Origem não autorizada responde 403, e não mais 500 — o que tirava do 5xx um
  ruído que faria o alarme novo disparar por tráfego de rotina.
- Alarmes do CloudWatch (5xx, erros, duração, crons) aplicados em **dev**.
- Frontend com build apontando para `api.gforcecoach.com`.

### Inscrever o e-mail nos alarmes

O tópico existe sem assinante — alarme sem inscrição não avisa ninguém:

```bash
aws sns subscribe --profile gforce-dev --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:605618941761:gforce-api-dev-alarms \
  --protocol email --notification-endpoint voce@exemplo.com
```

A AWS manda um e-mail de confirmação; sem clicar, nada chega. Repetir na conta
de produção depois que ela receber o deploy (o ARN sai como output do stack).

## O que ainda não foi provado

Isto é o que separa "a API responde" de "a API pode substituir o Render":

1. **Nenhum fluxo autenticado real foi exercitado contra a AWS.** O smoke test
   cobre rotas públicas; login válido, CRUD e upload nunca rodaram lá — e, pela
   decisão de banco único, só rodarão localmente ou no próprio cutover.
2. **Nenhum e-mail foi enviado a partir da Lambda.** SMTP de dentro da AWS é um
   caminho que nunca foi percorrido, e é o mais difícil de simular local: o
   container não prova que a Lambda alcança o servidor SMTP.
3. **Os crons nunca dispararam pelo EventBridge.** Estão implantados e
   `DISABLED` nos dois stages; quem executa hoje é o `node-cron` do Render.

---

## Decisão: um banco só, o de produção

Não haverá Postgres dev separado. Os dois stages continuam apontando para o
banco de produção, e o desenvolvimento local usa o Postgres em container
(`docker-compose.yml`, porta 5433).

**O que isso implica, e não tem contorno:** nenhum cenário de escrita pode ser
executado contra o ambiente implantado. Criar aluno, subir foto ou disparar
e-mail contra `api-dev` é escrever no banco de produção e mandar mensagem para
pessoa real. Em consequência:

| Camada | Onde é validada |
|---|---|
| Regra de negócio | local — Vitest contra o Postgres do container |
| Handler da Lambda | local — `serverless offline` |
| Infraestrutura (TLS, API Gateway, CORS, latência) | implantado — `smoke-deployed.mjs`, só leitura |
| Escrita ponta a ponta no ambiente real | **não coberta** — verificação manual no cutover |

Trate `api-dev` como produção para qualquer requisição que escreva. O stage
`dev` serve para validar infraestrutura e deploy, não para testar dados.

⚠️ `test/e2e/setup.ts` roda `DROP SCHEMA public CASCADE`. Nunca aponte o `.env`
para a `DATABASE_URL` de nenhum dos stages.

## Passo 1 — configurar dev e prod ✅ feito em 2026-08-10

Os dois stages estão com o código atual: rotas de upload assinado, CORS
devolvendo 403 em vez de 500, e os quatro alarmes.

| | dev | prod |
|---|---|---|
| Deploy | ✅ | ✅ |
| Rotas `/assinatura` e `/confirmacao` | ✅ | ✅ |
| CORS de origem estranha | 403 | 403 |
| Alarmes | 4 | 4 |
| Crons | `DISABLED` | `DISABLED` |
| Smoke test | 10/10, p95 190ms | 10/10, p95 219ms |

Nada disso mudou o que o usuário vê: o frontend continua chamando o Render.

**Falta inscrever o e-mail nos dois tópicos** — alarme sem assinante não avisa:

```bash
aws sns subscribe --profile gforce-prod --region us-east-2 \
  --topic-arn arn:aws:sns:us-east-2:565828850910:gforce-api-prod-alarms \
  --protocol email --notification-endpoint voce@exemplo.com
```

## Passo 2 — validar os fluxos de escrita, localmente

Como não há ambiente implantado seguro para escrita, isto roda contra o
container:

```bash
pnpm db:start && pnpm db:migrate:deploy && pnpm db:seed
pnpm test:all
pnpm sls:offline    # sobe o handler da Lambda em localhost:3000
```

Com o `serverless offline` de pé, exercitar pela rede o que só o caminho novo
tem: assinatura → upload no Cloudinary → confirmação. É o fluxo que nenhuma
suíte cobre ponta a ponta.

O script de paridade compara os dois modos de execução:

```bash
node scripts/smoke-test-endpoints.mjs
```

## Passo 3 — publicar o frontend apontando para a AWS

O branch `feat/aws-api-cutover` já traz `.env.production` com
`VITE_API_URL=https://api.gforcecoach.com`. Basta buildar e publicar.

**Verificar:** o bundle publicado não contém nenhuma referência a `onrender.com`.

```bash
curl -s https://www.gforcecoach.com/ | grep -o '/assets/[^"]*\.js' \
  | xargs -I{} curl -s https://www.gforcecoach.com{} | grep -c onrender
```

Deve imprimir `0`.

**Este é o passo que efetivamente move o tráfego.** Até aqui, nada mudou para o
usuário — o DNS já apontava para a AWS, mas o frontend chamava o Render direto.

**Rollback:** republicar o build anterior. E, se preferir não depender de um
novo deploy, o registro DNS de `api.gforcecoach.com` pode voltar para o Render —
foi por isso que o front aponta para o domínio próprio, e não para a URL crua
do API Gateway.

## Passo 4 — observar

48 a 72 horas com o web service do Render **de pé**, sem tráfego, servindo de
rede de segurança. Acompanhar 5xx e duração no CloudWatch.

Rodar o smoke test periodicamente contra produção — ele não escreve nada:

```bash
node scripts/smoke-deployed.mjs --target https://api.gforcecoach.com
```

## Passo 5 — mover os crons (a parte delicada)

⚠️ **A ordem aqui não é negociável.** Os dois ambientes apontam para o mesmo
banco. Com os dois agendadores ativos ao mesmo tempo, o aluno recebe o lembrete
de foto duas vezes na sexta e duas limpezas de storage correm concorrentes.

1. **Primeiro** desligar o cron no Render — `ENABLE_NOTIFICATION_SCHEDULER=false`
   nas variáveis do web service, e reiniciar.
2. Confirmar no log do Render que o agendador não subiu.
3. **Só então** ligar na AWS: `cronsEnabled: true` no `params.prod` do
   `serverless.yml` e `serverless deploy --stage prod`.
4. Conferir no EventBridge que as três schedules estão `ENABLED`.

**Verificar:** no primeiro disparo agendado, o log do CloudWatch mostra execução
completa, e nenhum aluno recebe notificação duplicada.

**Rollback:** inverter — desligar na AWS, religar no Render.

## Passo 6 — desligar o Render

Só depois de uma semana estável.

⚠️ **Deletar apenas o web service. O Postgres permanece** — ele é a arquitetura
final, não um resíduo da migração.

**Verificar:** no Team do Render sobra somente o banco.

## Passo 7 — o que o cartão 12 ainda cobra

Não bloqueiam o desligamento, mas fecham o risco residual:

- rotacionar `JWT_SECRET` (desloga todo mundo — horário de baixo uso), senha do
  Postgres, chaves Cloudinary e credenciais SMTP, atualizando o SSM e
  redeployando
- testar um restore real do backup do Postgres
Os alarmes saíram deste passo: já estão no `serverless.yml` e sobem junto com o
deploy (passo 2b). Falta só inscrever o e-mail no tópico.
