# Parâmetros SSM — `gforce-api`

Roteiro para o dono do projeto criar, na conta AWS `gforce-dev`/`gforce-prod`, os
parâmetros que o `serverless.yml` (bloco `provider.environment`, Grupo B) exige. Este
documento **não cria nenhum parâmetro** — é só o guia de comandos.

Por que não há fallback: o `serverless.yml` resolve essas variáveis como
`${ssm:/gforce/${sls:stage}/NOME}`, sem `env:` nem valor default — se o parâmetro
faltar, `serverless package`/`deploy` falha nomeando exatamente qual, em vez de subir
um segredo vazio ou de outro ambiente em silêncio.

## Tabela — Grupo B (obrigatórias)

| Nome | `/gforce/dev/...` | `/gforce/prod/...` | Tipo | O que é |
|---|---|---|---|---|
| `DATABASE_URL` | `/gforce/dev/DATABASE_URL` | `/gforce/prod/DATABASE_URL` | `SecureString` | Connection string do Postgres (Render) usada pelo Prisma. |
| `JWT_SECRET` | `/gforce/dev/JWT_SECRET` | `/gforce/prod/JWT_SECRET` | `SecureString` | Chave de assinatura dos tokens JWT (mín. 64 caracteres). |
| `LEAD_TRACKING_SALT` | `/gforce/dev/LEAD_TRACKING_SALT` | `/gforce/prod/LEAD_TRACKING_SALT` | `SecureString` | Salt usado para hashear identificadores de tracking de leads. |
| `CLOUDINARY_CLOUD_NAME` | `/gforce/dev/CLOUDINARY_CLOUD_NAME` | `/gforce/prod/CLOUDINARY_CLOUD_NAME` | `String` | Nome da conta Cloudinary usada para upload de arquivos. |
| `CLOUDINARY_API_KEY` | `/gforce/dev/CLOUDINARY_API_KEY` | `/gforce/prod/CLOUDINARY_API_KEY` | `SecureString` | API key da conta Cloudinary. |
| `CLOUDINARY_API_SECRET` | `/gforce/dev/CLOUDINARY_API_SECRET` | `/gforce/prod/CLOUDINARY_API_SECRET` | `SecureString` | API secret da conta Cloudinary. |
| `CORS_ORIGIN` | `/gforce/dev/CORS_ORIGIN` | `/gforce/prod/CORS_ORIGIN` | `String` | Origem(ns) permitida(s) para CORS (domínio do frontend). |
| `MAX_FILE_SIZE` | `/gforce/dev/MAX_FILE_SIZE` | `/gforce/prod/MAX_FILE_SIZE` | `String` | Tamanho máximo de upload aceito, em bytes. |
| `SMTP_HOST` | `/gforce/dev/SMTP_HOST` | `/gforce/prod/SMTP_HOST` | `String` | Hostname do servidor SMTP usado para envio de e-mail. |
| `SMTP_USER` | `/gforce/dev/SMTP_USER` | `/gforce/prod/SMTP_USER` | `SecureString` | Usuário de autenticação SMTP. |
| `SMTP_PASS` | `/gforce/dev/SMTP_PASS` | `/gforce/prod/SMTP_PASS` | `SecureString` | Senha de autenticação SMTP. |
| `SMTP_FROM_EMAIL` | `/gforce/dev/SMTP_FROM_EMAIL` | `/gforce/prod/SMTP_FROM_EMAIL` | `String` | Endereço de e-mail remetente usado nos envios. |
| `PRIVACY_CONTROLLER_NAME` | `/gforce/dev/PRIVACY_CONTROLLER_NAME` | `/gforce/prod/PRIVACY_CONTROLLER_NAME` | `String` | Nome/razão social do controlador de dados (LGPD). |
| `PRIVACY_CONTROLLER_DOCUMENT_TYPE` | `/gforce/dev/PRIVACY_CONTROLLER_DOCUMENT_TYPE` | `/gforce/prod/PRIVACY_CONTROLLER_DOCUMENT_TYPE` | `String` | `CPF` ou `CNPJ` — tipo do documento do controlador. |
| `PRIVACY_CONTROLLER_DOCUMENT` | `/gforce/dev/PRIVACY_CONTROLLER_DOCUMENT` | `/gforce/prod/PRIVACY_CONTROLLER_DOCUMENT` | `String` | Número do CPF/CNPJ do controlador. |
| `PRIVACY_CONTROLLER_ADDRESS` | `/gforce/dev/PRIVACY_CONTROLLER_ADDRESS` | `/gforce/prod/PRIVACY_CONTROLLER_ADDRESS` | `String` | Endereço completo do controlador de dados. |
| `PRIVACY_CONTACT_EMAIL` | `/gforce/dev/PRIVACY_CONTACT_EMAIL` | `/gforce/prod/PRIVACY_CONTACT_EMAIL` | `String` | E-mail de contato para questões de privacidade/LGPD. |

`SecureString`: `DATABASE_URL`, `JWT_SECRET`, `LEAD_TRACKING_SALT`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SMTP_USER`, `SMTP_PASS`. Todos os
outros dez são `String`.

Esta lista precisa bater exatamente com o bloco `provider.environment` (Grupo B) do
`serverless.yml` — se um nome aqui divergir de lá (ou faltar), o empacotamento falha
nomeando o parâmetro ausente.

### `DATABASE_URL` — sufixo obrigatório

O valor deve terminar com `?connection_limit=3&sslmode=require`, por exemplo:

```
postgresql://usuario:senha@host.render.com:5432/gforce?connection_limit=3&sslmode=require
```

Motivo: cada invocação concorrente da Lambda abre sua própria conexão Postgres; sem
limitar `connection_limit` por conexão, um pico de invocações estoura o teto de
conexões do Postgres gerenciado do Render. `sslmode=require` é necessário porque o
tráfego Lambda → Render cruza a internet pública (não há VPC peering entre as duas
contas).

### `MAX_FILE_SIZE` — valor fixo nos dois stages

Use `4194304` (4 MiB) em `dev` e em `prod`. Motivo: a Lambda aceita no máximo 6 MB de
payload síncrono, e o API Gateway infla conteúdo binário em ~33% ao codificar em
base64 no caminho HTTP API → Lambda. O teto real de upload seguro é, portanto,
~4,5 MB — `4194304` fica com folga confortável abaixo disso.

## Comandos

Substitua `VALOR` pelo valor real antes de rodar — nunca cole um segredo real em um
documento ou terminal compartilhado. Repita para `dev` e `prod` trocando o segmento
do path.

```bash
# String
aws ssm put-parameter \
  --profile gforce-dev \
  --name "/gforce/dev/CLOUDINARY_CLOUD_NAME" \
  --type String \
  --value "VALOR"

# SecureString
aws ssm put-parameter \
  --profile gforce-dev \
  --name "/gforce/dev/JWT_SECRET" \
  --type SecureString \
  --value "VALOR"
```

Repita para cada nome da tabela acima, nos dois stages (`/gforce/dev/...` e
`/gforce/prod/...`), usando o perfil AWS correspondente a cada conta.

### Conferência

```bash
aws ssm get-parameters-by-path \
  --profile gforce-dev \
  --path "/gforce/dev" \
  --recursive \
  --with-decryption \
  --query "Parameters[].Name" \
  --output table
```

Confirme que os 17 nomes da tabela do Grupo B aparecem antes de rodar
`serverless package`/`deploy`.

## Grupo C — opcionais (não criar agora)

`SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM_NAME`, `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `USDA_API_KEY`, `TACO_API_BASE_URL`,
`TACO_API_KEY`, `YOUTUBE_API_KEY` não têm parâmetro SSM nem entrada no
`provider.environment` do `serverless.yml` hoje. `src/env.ts` já trata todos como
opcionais (as três primeiras com default seguro, as demais sem valor exigido). Criar
o parâmetro SSM e adicionar a linha correspondente em `provider.environment` do
`serverless.yml` somente quando o serviço/integração associado for efetivamente
ativado (SMTP alternativo, WhatsApp via Twilio, API de nutrição TACO, cache de vídeos
do YouTube etc).
