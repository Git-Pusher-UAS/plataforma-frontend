#!/bin/sh
# Trae el contrato del backend a una referencia concreta (etiqueta, rama o commit).
#
# Uso:
#   BACKEND_REPO_URL=git@github.com:ORG/REPO-BACKEND.git REF=contract-v1 sh scripts/sync-contract.sh
#   BACKEND_REPO_URL=... sh scripts/sync-contract.sh check     # solo verifica, no modifica
#
# En modo "check" se usa la referencia guardada en contract/CONTRACT_REF.
set -eu
cd "$(dirname "$0")/.."

: "${BACKEND_REPO_URL:?Define BACKEND_REPO_URL con la URL del repositorio del backend}"

mode="${1:-sync}"
if [ "$mode" = "check" ]; then
  REF="$(tr -d '[:space:]' < contract/CONTRACT_REF)"
fi
: "${REF:?Define REF con la etiqueta o commit del contrato, por ejemplo contract-v1}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

git init -q "$tmp"
git -C "$tmp" remote add origin "$BACKEND_REPO_URL"
git -C "$tmp" fetch -q --depth 1 origin "$REF"
git -C "$tmp" checkout -q FETCH_HEAD

if [ ! -f "$tmp/api/openapi.yaml" ]; then
  echo "No se encontró api/openapi.yaml en el backend en la referencia $REF" >&2
  exit 1
fi

if [ "$mode" = "check" ]; then
  if diff -u contract/openapi.yaml "$tmp/api/openapi.yaml" >/dev/null; then
    echo "OK: contract/openapi.yaml coincide con el backend en $REF"
    exit 0
  fi
  echo "ERROR: contract/openapi.yaml difiere del backend en $REF" >&2
  diff -u contract/openapi.yaml "$tmp/api/openapi.yaml" || true
  exit 1
fi

cp "$tmp/api/openapi.yaml" contract/openapi.yaml
printf '%s\n' "$REF" > contract/CONTRACT_REF
sh scripts/gen-api.sh
echo "Contrato sincronizado en $REF. Revisa los cambios y súbelos en tu solicitud."
