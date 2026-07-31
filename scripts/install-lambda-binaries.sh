#!/usr/bin/env bash
# Garante os binarios nativos das duas arquiteturas: a da maquina local e a da
# Lambda (linux/arm64). As arquiteturas vem de pnpm.supportedArchitectures no
# package.json — este script so reinstala e confere.
#
# Com --verify-only, apenas confere — sem reinstalar nada. Esse modo roda antes
# de todo `sls:package`: se um upgrade do pnpm parar de honrar
# supportedArchitectures, o binario some do node_modules e o empacotamento
# fecharia sem erro, produzindo um zip que so quebra em runtime na AWS.
set -euo pipefail

VERIFY_ONLY=false
[[ "${1:-}" == "--verify-only" ]] && VERIFY_ONLY=true

if ! $VERIFY_ONLY; then
  echo "==> instalando dependencias para todas as arquiteturas suportadas"
  pnpm install

  echo "==> prisma client com engine linux-arm64"
  pnpm db:generate
fi

echo "==> conferindo binarios linux-arm64"
ls node_modules/@img | grep -q 'sharp-linux-arm64' \
  && echo "OK: @img/sharp-linux-arm64 presente" \
  || { echo "FALHOU: @img/sharp-linux-arm64 ausente" >&2; exit 1; }

ls node_modules/.prisma/client | grep -q 'linux-arm64' \
  && echo "OK: engine linux-arm64 do Prisma presente" \
  || { echo "FALHOU: engine linux-arm64 ausente" >&2; exit 1; }
