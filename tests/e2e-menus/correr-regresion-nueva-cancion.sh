#!/bin/bash
# La regresión en navegador del flujo «Nueva canción» y lo que lo rodea, a 390 y 360 px, claro y oscuro (un proceso por combinación): pasos A, B, C, adjuntos, estructura S3/S4/S5 (el paso D «Repetir ×N» se retiró en S5), lectura C3a, tira fija de la lectura y esqueletos de carga.
# Corre varios grupos A LA VEZ (cada uno con su puerto de Chrome: CDP_DESFASE) y junta los resultados en orden. Súmale scripts con EXTRA="…" y quítale con QUITAR="…".
# Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-regresion-nueva-cancion.sh <carpeta-de-capturas>        Sale con 1 si algo falla; imprime solo fallas, avisos y el resumen de cada uno.
cd "$(dirname "$0")/../.."; B="${BASE:-http://127.0.0.1:3168}"; CAP="${1:-/tmp/regresion-nueva-cancion}"; OUT="$(mktemp -d)"; cod=0
PASOS="nueva-cancion-paso-a nueva-cancion-paso-b nueva-cancion-paso-c adjuntos-pantalla estructura-s3-tira estructura-s4-hoja estructura-s5-menu ${EXTRA:-}"; for q in ${QUITAR:-}; do PASOS=" $PASOS "; PASOS="${PASOS/ $q / }"; done
d=0; grupos=()
for s in $PASOS; do s="${s#tests/e2e-menus/}"; s="${s%.js}"; d=$((d+1)); grupos+=("$s")
  ( CDP_DESFASE=$d BASE="$B" tests/e2e-menus/correr-combinaciones-editor.sh "tests/e2e-menus/$s.js" "$CAP/$s" > "$OUT/$s.txt" 2>&1; echo "salida $?" >> "$OUT/$s.txt" ) &
  if [ $((d % 4)) -eq 0 ]; then wait; fi
done; wait
( CDP_DESFASE=1 ; for c in "390 light" "390 dark" "360 light" "360 dark"; do CDP_DESFASE=1 SOLO="$c" BASE="$B" node tests/e2e-menus/lectura-c3a.js "$CAP/lectura-c3a" 2>&1 | grep -E "FALLA|AVISO|comprobaciones"; [ "${PIPESTATUS[0]}" -eq 0 ] || echo "salida 1"; done > "$OUT/lectura-c3a.txt"; echo "salida 0" >> "$OUT/lectura-c3a.txt" ) &
( CDP_DESFASE=2 BASE="$B" tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-tira-fija.js "$CAP/lectura-tira-fija" > "$OUT/lectura-tira-fija.txt" 2>&1; echo "salida $?" >> "$OUT/lectura-tira-fija.txt" ) &
( CDP_DESFASE=3 BASE="$B" tests/e2e-menus/correr-esqueletos.sh "$CAP/esqueletos" > "$OUT/esqueletos.txt" 2>&1; echo "salida $?" >> "$OUT/esqueletos.txt" ) &
wait
for s in "${grupos[@]}" lectura-c3a lectura-tira-fija esqueletos; do echo "── $s"; grep -v "^salida" "$OUT/$s.txt"; grep -q "^salida [^0]" "$OUT/$s.txt" && cod=1; done
echo "RESULTADO regresión: $([ $cod -eq 0 ] && echo 'todo en verde' || echo 'HAY FALLAS')"; exit $cod
