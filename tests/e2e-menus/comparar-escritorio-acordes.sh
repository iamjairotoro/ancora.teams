#!/bin/bash
# «Escritorio y tableta idénticos a main» para la lectura y el detalle de canción. Compara dos builds servidos (A = main, B = el árbol de trabajo): PNG al píxel (claro y oscuro) y HTML normalizado, en cada ancho.
# Una comparación NO vale si está vacía: antes de comparar se comprueba que las dos corridas llegaron al detalle de la canción (el HTML contiene la letra y la página esperada), que no hay hoja con acordes ni «Editar con acordes» (solo teléfono),
# y que salieron todas las capturas. Si algo falla se repite (hasta 3 veces); un resultado vacío o incompleto cuenta como FALLA, nunca como «idéntico».
# Uso: A=http://127.0.0.1:3171 B=http://127.0.0.1:3168 OUT=/tmp/cmp bash tests/e2e-menus/comparar-escritorio-acordes.sh [anchos…]   (por defecto 1280 1024 900 820)
cd "$(dirname "$0")/../.." || exit 1
A="${A:-http://127.0.0.1:3171}"; B="${B:-http://127.0.0.1:3168}"; OUT="${OUT:-/tmp/comparar-escritorio-acordes}"; ANCHOS="${*:-1280 1024 900 820}"; E=tests/e2e-menus/escenarios; rm -rf "$OUT"; mkdir -p "$OUT"
# nombre | escenario | id del estado | mock | texto que debe contener el HTML | marca de la página esperada
CASOS=(
  "portal-formato1|desk-portal-formato1|portal-cancion-formato1|./portal-mock.js|esplendor|portal-root"
  "portal-formato2|desk-acordes-lectura|portal-cancion-acordes|./portal-mock.js|esplendor|portal-root"
  "admin-con-letra|desk-admin-cancion|admin-cancion-detalle|./inv5-letra-mock.js|esplendor|app_top"
)
corrida() { # lado base nombre escenario id mock ancho
  BASE="$2" ANCHO="$7" ESC_JSON="$E/$4.json" MOCK_FILE="$6" PUERTO=9573 node tests/e2e-menus/desk.js "$OUT/$1-$3-$7" > "$OUT/$1-$3-$7.log" 2>&1
}
revisar() { # lado nombre id ancho texto marca → imprime el problema o nada
  local d="$OUT/$1-$2-$4" h="$OUT/$1-$2-$4/html/$3.html"
  [ -f "$h" ] || { echo "falta el HTML"; return; }
  [ -f "$d/capturas/$3__dark.png" ] && [ -f "$d/capturas/$3__light.png" ] || { echo "faltan capturas"; return; }
  grep -q "$5" "$h" || { echo "el HTML NO contiene la letra «$5» (no llegó al detalle)"; return; }
  grep -q "$6" "$h" || { echo "no es la página esperada («$6»)"; return; }
  grep -q 'data-a=' "$h" && { echo "hay hoja con acordes en escritorio/tableta"; return; }
  grep -q 'Editar con acordes' "$h" && { echo "aparece «Editar con acordes» en escritorio/tableta"; return; }
}
fallas=0; comparaciones=0
for W in $ANCHOS; do for caso in "${CASOS[@]}"; do IFS='|' read -r n esc id mock texto marca <<< "$caso"
  resultado=""
  for intento in 1 2 3; do
    for lado in A B; do base="$A"; [ $lado = B ] && base="$B"; rm -rf "$OUT/$lado-$n-$W"; corrida $lado "$base" "$n" "$esc" "$id" "$mock" "$W"; done
    pa=$(revisar A "$n" "$id" "$W" "$texto" "$marca"); pb=$(revisar B "$n" "$id" "$W" "$texto" "$marca")
    if [ -n "$pa$pb" ]; then resultado="VACÍA/INCOMPLETA (intento $intento): A: ${pa:-ok} · B: ${pb:-ok}"; continue; fi
    png=$(node tests/e2e-menus/pngdiff.js "$OUT/A-$n-$W" "$OUT/B-$n-$W" 2>&1); html=$(cmp -s "$OUT/A-$n-$W/html/$id.html" "$OUT/B-$n-$W/html/$id.html" && echo "html idéntico" || echo "HTML DISTINTO")
    if echo "$png" | grep -q "0 con diferencias" && [ "$html" = "html idéntico" ]; then resultado="OK     $(echo "$png" | tail -1) · $html · $(wc -c < "$OUT/B-$n-$W/html/$id.html" | tr -d ' ') bytes · letra presente en A y en B · intento $intento"; break
    else resultado="DIFERENCIA (intento $intento): $(echo "$png" | tr '\n' ' ') · $html"; fi
  done
  comparaciones=$((comparaciones + 1)); case "$resultado" in OK*) ;; *) fallas=$((fallas + 1));; esac
  printf '%-16s @%-4s %s\n' "$n" "$W" "$resultado"
done; done
echo; echo "$comparaciones comparaciones (anchos: $ANCHOS) · $fallas con falla o vacías"; exit $((fallas ? 1 : 0))
