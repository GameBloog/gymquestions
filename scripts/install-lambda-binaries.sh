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
