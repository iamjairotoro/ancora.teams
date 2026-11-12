#!/bin/bash
# Corre ficha-vacia.js en sus cinco combinaciones (390 y 360 px en claro y oscuro, y 1280 px en claro), UN PROCESO por cada una. Imprime solo las fallas, los avisos y el resumen.
# Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-ficha-vacia.sh <carpeta-de-capturas>
capturas="${1:-/tmp/ficha-vacia}"; cod=0
for c in "390 light" "390 dark" "360 light" "360 dark" "1280 light"; do
  salida=$(SOLO="$c" BASE="${BASE:-http://127.0.0.1:3168}" node "$(dirname "$0")/ficha-vacia.js" "$capturas" 2>&1); c2=$?
  echo "$salida" | grep -E "FALLA|AVISO|comprobaciones"; if [ $c2 -ne 0 ]; then cod=1; fi
done
exit $cod
