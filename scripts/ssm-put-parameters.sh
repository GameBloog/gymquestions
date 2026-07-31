#!/usr/bin/env bash
# Cria no SSM Parameter Store os parametros que o serverless.yml exige (Grupo B),
# lendo os valores de um arquivo .env local.
#
# Este script e para ser rodado POR VOCE. Ele le segredos do arquivo indicado e os
# envia para a sua conta AWS — confira o --dry-run antes de aplicar.
#
# IMPORTANTE: nao use o .env de desenvolvimento para o stage prod. Producao deve ter
# credenciais proprias, geradas separadamente.
#
# Uso:
#   ./scripts/ssm-put-parameters.sh --profile gforce-dev --stage dev --dry-run
#   ./scripts/ssm-put-parameters.sh --profile gforce-dev --stage dev
#
# Referencia: docs/aws-migration/SSM-PARAMETERS.md
set -euo pipefail

# A AWS CLI v2 abre um paginador (less) quando detecta terminal interativo, e o
# script trava esperando alguem apertar "q". Rodando sem TTY isso nao acontece,
# entao o problema so aparece na mao de quem usa.
export AWS_PAGER=""

PROFILE=""
STAGE=""
ENV_FILE=".env"
REGION="us-east-2"
DRY_RUN=false

usage() {
  cat <<'USAGE'
Uso: ./scripts/ssm-put-parameters.sh --profile <perfil> --stage <dev|prod> [opcoes]

  --profile <nome>   Perfil do AWS CLI da conta alvo (obrigatorio)
  --stage <nome>     dev ou prod (obrigatorio)
  --env-file <path>  Arquivo de onde ler os valores (padrao: .env)
  --region <nome>    Regiao AWS (padrao: us-east-2)
  --set NOME=VALOR   Define um parametro que nao esta no .env (repetivel)
  --dry-run          Mostra o que seria feito, sem enviar nada

Exemplo:
  ./scripts/ssm-put-parameters.sh --profile gforce-dev --stage dev \
    --set CORS_ORIGIN=https://www.gforcecoach.com --dry-run
USAGE
}

PENDING_SETS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)  PROFILE="$2"; shift 2 ;;
    --stage)    STAGE="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --region)   REGION="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --set)      PENDING_SETS+=("$2"); shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    *) echo "ERRO: opcao desconhecida: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "$PROFILE" ]] || { echo "ERRO: --profile e obrigatorio." >&2; usage; exit 1; }
[[ "$STAGE" == "dev" || "$STAGE" == "prod" ]] || {
  echo "ERRO: --stage deve ser dev ou prod." >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "ERRO: arquivo nao encontrado: $ENV_FILE" >&2; exit 1; }

if [[ "$STAGE" == "prod" && "$ENV_FILE" == ".env" ]]; then
  echo "ERRO: recusando enviar o .env de desenvolvimento para o stage prod." >&2
  echo "Producao precisa de credenciais proprias. Use --env-file com um arquivo separado." >&2
  exit 1
fi

# Grupo B do serverless.yml. Precisa bater exatamente com o bloco
# provider.environment — se divergir, o empacotamento falha nomeando o ausente.
SECURE=(
  DATABASE_URL
  JWT_SECRET
  LEAD_TRACKING_SALT
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
  SMTP_USER
  SMTP_PASS
)

PLAIN=(
  CLOUDINARY_CLOUD_NAME
  CORS_ORIGIN
  MAX_FILE_SIZE
  SMTP_HOST
  SMTP_FROM_EMAIL
  PRIVACY_CONTROLLER_NAME
  PRIVACY_CONTROLLER_DOCUMENT_TYPE
  PRIVACY_CONTROLLER_DOCUMENT
  PRIVACY_CONTROLLER_ADDRESS
  PRIVACY_CONTACT_EMAIL
)

read_env() {
  # Le a ultima definicao da chave, tolera aspas, espacos ao redor do "=" e
  # comentario no fim da linha (ex.: `MAX_FILE_SIZE=5242880  # 5MB em bytes`).
  local key="$1" line value
  line=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" | tail -1 || true)
  [[ -n "$line" ]] || return 1
  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"

  # So remove comentario em valor sem aspas: um "#" dentro de aspas e conteudo,
  # nao comentario — senha com "#" seria truncada silenciosamente.
  if [[ "$value" != \"* && "$value" != \'* ]]; then
    value="${value%%[[:space:]]#*}"
  fi

  value="${value%"${value##*[![:space:]]}"}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

# Sem arrays associativos: o bash do macOS e 3.2 e nao os suporta.

# Valores que NAO vem do .env: sao decisao de arquitetura, nao configuracao local.
# MAX_FILE_SIZE cai para 4MB nos stages AWS — a Lambda aceita 6MB de payload
# sincrono e o API Gateway infla binario em ~33% ao codificar, entao o teto real
# e ~4,5MB. O dev local segue com o valor do .env dele.
read_fixed() {
  case "$1" in
    MAX_FILE_SIZE) printf '%s' 4194304 ;;
    *) return 1 ;;
  esac
}

# Sobrescritas passadas na linha de comando, para o que nao esta no .env.
read_override() {
  local key="$1" pair
  for pair in ${PENDING_SETS+"${PENDING_SETS[@]}"}; do
    [[ "$pair" == *=* ]] || { echo "ERRO: --set espera NOME=VALOR, recebeu: $pair" >&2; exit 1; }
    if [[ "${pair%%=*}" == "$key" ]]; then printf '%s' "${pair#*=}"; return 0; fi
  done
  return 1
}

put() {
  local name="$1" type="$2" value="$3"
  local path="/gforce/${STAGE}/${name}"

  if $DRY_RUN; then
    printf '  [dry-run] %-40s %-12s (%d caracteres)\n' "$path" "$type" "${#value}"
    return
  fi

  aws ssm put-parameter \
    --profile "$PROFILE" --region "$REGION" \
    --name "$path" --type "$type" --value "$value" --overwrite >/dev/null
  printf '  OK  %-40s %s\n' "$path" "$type"
}

echo "==> conferindo identidade em $PROFILE"
aws sts get-caller-identity --profile "$PROFILE" --region "$REGION" \
  --query 'Account' --output text

echo "==> stage: $STAGE | regiao: $REGION | origem dos valores: $ENV_FILE"
$DRY_RUN && echo "==> MODO DRY-RUN: nada sera enviado"

MISSING=()

resolve() {
  # Precedencia: --set na linha de comando > valor fixo por arquitetura > .env
  local name="$1"
  read_override "$name" && return 0
  read_fixed "$name" && return 0
  read_env "$name"
}

# Resolve TUDO antes de escrever qualquer coisa. Se faltar uma chave no meio da
# lista, escrever a primeira metade e abortar deixaria o stage pela metade — e
# um deploy nesse estado falha citando um parametro so, escondendo os outros.
RESOLVED_NAMES=()
RESOLVED_TYPES=()
RESOLVED_VALUES=()

collect() {
  local name="$1" type="$2" value
  if value=$(resolve "$name"); then
    RESOLVED_NAMES+=("$name")
    RESOLVED_TYPES+=("$type")
    RESOLVED_VALUES+=("$value")
  else
    MISSING+=("$name")
  fi
}

for name in "${SECURE[@]}"; do collect "$name" SecureString; done
for name in "${PLAIN[@]}";  do collect "$name" String;       done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo >&2
  echo "AUSENTES em $ENV_FILE — nada foi enviado." >&2
  echo "Passe cada uma com --set NOME=VALOR, ou veja docs/aws-migration/SSM-PARAMETERS.md:" >&2
  printf '  - %s\n' "${MISSING[@]}" >&2
  exit 1
fi

for i in $(seq 0 $((${#RESOLVED_NAMES[@]} - 1))); do
  put "${RESOLVED_NAMES[$i]}" "${RESOLVED_TYPES[$i]}" "${RESOLVED_VALUES[$i]}"
done

echo
echo "==> concluido. Conferir com:"
echo "aws ssm get-parameters-by-path --profile $PROFILE --region $REGION \\"
echo "  --path /gforce/$STAGE --recursive --query 'Parameters[].Name' --output table"
