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

## O que já está pronto

- API implantada nos dois stages, com domínio próprio e HTTPS válido.
- `api.gforcecoach.com` e `api-dev.gforcecoach.com` resolvem para o API Gateway.
- CORS respondendo com origem única (sem cabeçalho duplicado).
- Upload de mídia de exercício não passa mais pela Lambda — vai assinado, direto
  ao Cloudinary, então o teto de payload do API Gateway deixou de limitá-lo.
- Frontend com build apontando para `api.gforcecoach.com`.

## O que ainda não foi provado

Isto é o que separa "a API responde" de "a API pode substituir o Render":

1. **Nenhum fluxo autenticado real foi exercitado contra a AWS.** O smoke test
   cobre rotas públicas; login válido, CRUD, upload e e-mail nunca rodaram.
2. **Nenhum e-mail foi enviado a partir da Lambda.** SMTP de dentro da AWS é um
   caminho que nunca foi percorrido.
3. **Os crons nunca dispararam pelo EventBridge.** Estão implantados e
   `DISABLED` nos dois stages; quem executa hoje é o `node-cron` do Render.
4. **Dev e prod compartilham o banco de produção**, o que impede qualquer
   cenário de escrita em dev.

---

## Passo 1 — banco dev descartável

Pré-requisito de tudo que envolve escrita. Enquanto `/gforce/dev/DATABASE_URL`
apontar para produção, testar em dev é escrever em produção.

```bash
aws sso login --profile gforce-dev
```

Criar um Postgres novo no Render, apontar o parâmetro, aplicar as migrations
(o que também valida que as 26 aplicam limpo) e semear:

```bash
aws ssm put-parameter --profile gforce-dev --overwrite \
  --name /gforce/dev/DATABASE_URL --type SecureString \
  --value 'postgresql://...?connection_limit=3&sslmode=require'
```

**Verificar:** `pnpm db:migrate:deploy` contra o banco novo termina sem erro.

**Rollback:** apontar o parâmetro de volta. Nada foi destruído.

## Passo 2 — validar os fluxos que faltam, em dev

```bash
node scripts/smoke-deployed.mjs --target https://api-dev.gforcecoach.com \
  --email <professor-de-teste> --senha <senha>
```

Isso cobre login, `/auth/me` e token adulterado. **Não cobre** e o que precisa
ser feito à mão, uma vez, com o banco dev de pé:

- criar aluno, editar, mudar status
- subir mídia de exercício pelo caminho novo (assinatura → Cloudinary → confirmação)
- disparar recuperação de senha e confirmar que o e-mail chega
- invocar os três crons sob demanda:

```bash
npx serverless invoke -f cronStorageCleanup --stage dev
```

Esperado: `{"status":"executed"}` e o log completo no CloudWatch.

**Só avance com todos passando.**

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
- alarmes no CloudWatch: 5xx do API Gateway, erro e duração de Lambda, falha das
  funções de cron

Enquanto os alarmes não existirem, a única forma de descobrir uma queda em
produção é alguém reclamar. Vale tratar como parte do cutover, não como
faxina posterior.
