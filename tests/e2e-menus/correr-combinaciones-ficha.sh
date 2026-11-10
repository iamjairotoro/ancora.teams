#!/bin/bash
# Corre la prueba en navegador de la ficha de administradora (la que lee SOLO="<ancho> <tema>") en sus cuatro combinaciones (390 y 1280 px, claro y oscuro), UN PROCESO por cada una.
# Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-ficha.sh tests/e2e-menus/ficha-admin-acordes.js docs/verificacion-rediseno/ficha-admin-acordes/capturas
# Sale con 1 si alguna combinación falla; imprime solo las fallas, los avisos y el resumen de cada una.
prueba="$1"; capturas="$2"; cod=0
for c in "390 light" "390 dark" "1280 light" "1280 dark"; do
  salida=$(SOLO="$c" BASE="${BASE:-http://127.0.0.1:3168}" node "$prueba" "$capturas" 2>&1)
  c2=$?
  echo "$salida" | grep -E "FALLA|AVISO|comprobaciones"
  if [ $c2 -ne 0 ]; then cod=1; fi
done
exit $cod
