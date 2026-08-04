#!/usr/bin/env bash
# Copia os parametros /gforce/<origem>/* para /gforce/<destino>/*, possivelmente
# entre contas AWS diferentes, preservando o tipo (SecureString vs String).
#
# Este script e para ser rodado POR VOCE: ele le segredos decifrados de uma conta
# e escreve na outra. Confira o --dry-run antes de aplicar.
#
# Uso:
#   ./scripts/ssm-copy-parameters.sh --from dev --to prod \
#     --from-profile gforce-dev --to-profile gforce-prod --dry-run
#
# Referencia: docs/aws-migration/SSM-PARAMETERS.md
set -euo pipefail

# A AWS CLI v2 abre um paginador quando ha terminal interativo e o script trava.
export AWS_PAGER=""

FROM_STAGE=""; TO_STAGE=""
FROM_PROFILE=""; TO_PROFILE=""
REGION="us-east-2"
DRY_RUN=false

usage() {
  cat <<'USAGE'
Uso: ./scripts/ssm-copy-parameters.sh --from <stage> --to <stage> \
       --from-profile <perfil> --to-profile <perfil> [--region <r>] [--dry-run]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)         FROM_STAGE="$2"; shift 2 ;;
    --to)           TO_STAGE="$2"; shift 2 ;;
    --from-profile) FROM_PROFILE="$2"; shift 2 ;;
    --to-profile)   TO_PROFILE="$2"; shift 2 ;;
    --region)       REGION="$2"; shift 2 ;;
    --dry-run)      DRY_RUN=true; shift ;;
    -h|--help)      usage; exit 0 ;;
    *) echo "ERRO: opcao desconhecida: $1" >&2; usage; exit 1 ;;
  esac
done

for v in FROM_STAGE TO_STAGE FROM_PROFILE TO_PROFILE; do
  [[ -n "${!v}" ]] || { echo "ERRO: --${v,,} e obrigatorio." >&2; usage; exit 1; }
done
[[ "$FROM_STAGE" != "$TO_STAGE" ]] || { echo "ERRO: origem e destino iguais." >&2; exit 1; }

echo "==> origem:  $FROM_PROFILE  conta $(aws sts get-caller-identity --profile "$FROM_PROFILE" --region "$REGION" --query Account --output text)  /gforce/$FROM_STAGE"
echo "==> destino: $TO_PROFILE  conta $(aws sts get-caller-identity --profile "$TO_PROFILE" --region "$REGION" --query Account --output text)  /gforce/$TO_STAGE"
$DRY_RUN && echo "==> MODO DRY-RUN: nada sera escrito"

# Le tudo primeiro: escrever metade e abortar deixaria o destino inconsistente,
# e um deploy nesse estado falha citando um parametro so, escondendo os demais.
LINHAS=$(aws ssm get-parameters-by-path \
  --profile "$FROM_PROFILE" --region "$REGION" \
  --path "/gforce/$FROM_STAGE" --recursive --with-decryption \
  --query 'Parameters[].[Name,Type,Value]' --output text)

[[ -n "$LINHAS" ]] || { echo "ERRO: nenhum parametro em /gforce/$FROM_STAGE." >&2; exit 1; }

TOTAL=0
while IFS=$'\t' read -r nome tipo valor; do
  [[ -n "$nome" ]] || continue
  destino="/gforce/${TO_STAGE}/${nome##*/}"
  TOTAL=$((TOTAL + 1))

  if $DRY_RUN; then
    printf '  [dry-run] %-46s %-12s (%d caracteres)\n' "$destino" "$tipo" "${#valor}"
    continue
  fi

  aws ssm put-parameter --profile "$TO_PROFILE" --region "$REGION" \
    --name "$destino" --type "$tipo" --value "$valor" --overwrite >/dev/null
  printf '  OK  %-46s %s\n' "$destino" "$tipo"
done <<< "$LINHAS"

echo
echo "==> $TOTAL parametro(s). Conferir com:"
echo "aws ssm get-parameters-by-path --profile $TO_PROFILE --region $REGION \\"
echo "  --path /gforce/$TO_STAGE --recursive --query 'Parameters[].Name' --output table"
