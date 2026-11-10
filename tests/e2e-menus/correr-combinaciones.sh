#!/bin/bash
# Corre una prueba en navegador de la lectura (la que tiene SOLO="<ancho> <tema>") en sus cuatro combinaciones, UN PROCESO por cada una (en un solo proceso Chrome se llegó a colgar sin cerrar).
# Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-c3b.js docs/verificacion-rediseno/lectura-c3/capturas
# Sale con 1 si alguna combinación falla o no termina; imprime solo las fallas y el resumen de cada una.
prueba="$1"; capturas="$2"; cod=0
for c in "390 light" "390 dark" "360 light" "360 dark"; do
  salida=$(SOLO="$c" BASE="${BASE:-http://127.0.0.1:3168}" node "$prueba" "$capturas" 2>&1)
  c2=$?
  echo "$salida" | grep -E "FALLA|AVISO|comprobaciones"
  if [ $c2 -ne 0 ]; then cod=1; fi
done
exit $cod
