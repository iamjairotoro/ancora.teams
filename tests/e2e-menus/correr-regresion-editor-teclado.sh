#!/bin/bash
# Regresión en navegador para cambios del editor móvil frente al teclado: el arnés de teclado emulado (zona segura 47 y 0), el editor v2 (texto, carril, interludio), las hojas pequeñas (campos de 16 px en hojas y la hoja Preferencias, que usa HojaBase)
# y la regresión de «Nueva canción» con su estructura, adjuntos, lectura y esqueletos. Uso: BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-regresion-editor-teclado.sh <carpeta-de-capturas>     Sale con 1 si algo falla.
cd "$(dirname "$0")/../.."; B="${BASE:-http://127.0.0.1:3168}"; CAP="${1:-/tmp/regresion-editor-teclado}"; cod=0; f='FALLA|AVISO|comprobaciones|ERROR'
echo "── editor-teclado (zona 47)"; BASE="$B" tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-teclado.js "$CAP/editor-teclado" || cod=1
echo "── editor-teclado (zona 0)"; ZONA=0 BASE="$B" tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-teclado.js "$CAP/editor-teclado" || cod=1
echo "── editor-teclado, canción NUEVA (zona 47)"; ESCENARIO=nueva BASE="$B" tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-teclado.js "$CAP/editor-teclado" || cod=1
echo "── editor-teclado, canción NUEVA (zona 0)"; ESCENARIO=nueva ZONA=0 BASE="$B" tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-teclado.js "$CAP/editor-teclado" || cod=1
for s in editor-v2-texto editor-v2-carril editor-v2-interludio; do echo "── $s"; BASE="$B" node "tests/e2e-menus/$s.js" "$CAP/$s" 2>&1 | grep -E "$f"; [ "${PIPESTATUS[0]}" -eq 0 ] || cod=1; done
echo "── lectura-c3b (hoja Preferencias, HojaBase)"; for c in "390 light" "390 dark" "360 light" "360 dark"; do SOLO="$c" BASE="$B" node tests/e2e-menus/lectura-c3b.js "$CAP/lectura-c3b" 2>&1 | grep -E "$f"; [ "${PIPESTATUS[0]}" -eq 0 ] || cod=1; done
echo "── campos de 16 px (hojas con campos)"; ESC_JSON=tests/e2e-menus/escenarios/campos-admin.json,tests/e2e-menus/escenarios/campos-portal.json,tests/e2e-menus/escenarios/campos-orden.json BASE="$B" node tests/e2e-menus/campos.js "$CAP/campos" 2>&1 | tail -3; [ "${PIPESTATUS[0]}" -eq 0 ] || cod=1
echo "── Nueva canción, estructura, adjuntos, lectura y esqueletos"; BASE="$B" EXTRA="estructura-s6a-eliminar estructura-s6b-renombrar" tests/e2e-menus/correr-regresion-nueva-cancion.sh "$CAP/nueva-cancion" | grep -E "^──|$f|RESULTADO" ; [ "${PIPESTATUS[0]}" -eq 0 ] || cod=1
echo "RESULTADO regresión editor-teclado: $([ $cod -eq 0 ] && echo 'todo en verde' || echo 'HAY FALLAS')"; exit $cod
