#!/bin/sh
# Valida que la primera línea del mensaje siga commits convencionales.
# Ejemplo válido: feat(expedientes): detectar duplicados por CURP
set -eu
first_line="$(head -n 1 "$1")"
case "$first_line" in
  Merge\ *|Revert\ *) exit 0 ;;
esac
if printf '%s' "$first_line" | grep -Eq '^(feat|fix|test|docs|refactor|chore|security|build|ci|perf|style)(\([a-z0-9-]+\))?!?: .{1,100}$'; then
  exit 0
fi
cat >&2 << MSG
Mensaje de commit inválido:
  $first_line

Formato: tipo(modulo): descripción
Tipos: feat, fix, test, docs, refactor, chore, security, build, ci, perf, style
Ejemplo: feat(expedientes): detectar duplicados por CURP
MSG
exit 1
