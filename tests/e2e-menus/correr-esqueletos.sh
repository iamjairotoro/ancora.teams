#!/bin/bash
# Corre esqueletos-carga.js en todas sus combinaciones (5 escenarios × 390 y 360 px × claro y oscuro), UN PROCESO por cada una. Imprime solo las fallas y el resumen.
# Uso: BASE=http://127.0.0.1:3171 tests/e2e-menus/correr-esqueletos.sh <carpeta-de-capturas>      (SIN_ESQUELETOS=1 invierte las comprobaciones para medir el «antes» en una compilación vieja)
capturas="${1:-/tmp/esqueletos-carga}"; cod=0; n=0
for e in lista ficha-hoja ficha musico nueva; do for a in 390 360; do for t in light dark; do
  salida=$(BASE="${BASE:-http://127.0.0.1:3171}" node "$(dirname "$0")/esqueletos-carga.js" "$e" "$a" "$t" "$capturas" 2>&1); c2=$?
  n=$((n+1)); echo "$salida" | grep -E "FALLA|ERROR|CLS" ; if [ $c2 -ne 0 ]; then cod=1; fi
done; done; done
echo "$n combinaciones, código $cod"; exit $cod
