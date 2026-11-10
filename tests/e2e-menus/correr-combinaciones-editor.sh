#!/bin/bash
# Corre la prueba en navegador de el editor móvil de acordes (la que lee SOLO="<ancho> <tema>") en sus cuatro combinaciones (390 y 360 px, claro y oscuro), UN PROCESO por cada una.
# Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-instrumental-tag.js docs/verificacion-rediseno/editor-instrumental-tag/capturas
# Sale con 1 si alguna combinación falla; imprime solo las fallas, los avisos y el resumen de cada una.
prueba="$1"; capturas="$2"; cod=0
for c in "390 light" "390 dark" "360 light" "360 dark"; do
  salida=$(SOLO="$c" BASE="${BASE:-http://127.0.0.1:3168}" node "$prueba" "$capturas" 2>&1)
  c2=$?
  echo "$salida" | grep -E "FALLA|AVISO|comprobaciones"
  if [ $c2 -ne 0 ]; then cod=1; fi
done
exit $cod
