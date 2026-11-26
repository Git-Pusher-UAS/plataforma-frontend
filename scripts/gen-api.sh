#!/bin/sh
# Regenera los tipos de TypeScript a partir de contract/openapi.yaml.
# El resultado (src/api/generated/schema.d.ts) se sube al repositorio y no se edita a mano.
set -eu
cd "$(dirname "$0")/.."
./node_modules/.bin/openapi-typescript contract/openapi.yaml -o src/api/generated/schema.d.ts
