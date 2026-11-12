#!/bin/bash
# Corre lectura-estructura-s0.js en sus cuatro combinaciones (390 y 360 px en claro y oscuro), UN PROCESO por cada una. Imprime solo las fallas, los avisos y el resumen.
# Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-lectura-estructura-s0.sh <carpeta-de-capturas>
capturas="${1:-/tmp/lectura-estructura-s0}"; cod=0
for c in "390 light" "390 dark" "360 light" "360 dark"; do
  salida=$(SOLO="$c" BASE="${BASE:-http://127.0.0.1:3168}" node "$(dirname "$0")/lectura-estructura-s0.js" "$capturas" 2>&1); c2=$?
  echo "$salida" | grep -E "FALLA|AVISO|comprobaciones"; if [ $c2 -ne 0 ]; then cod=1; fi
done
exit $cod
