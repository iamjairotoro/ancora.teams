#!/bin/bash
# Verifica el HEAD EXACTO: tsc, `next build` sobre un export limpio de HEAD y las cuatro suites (test:portal, test:auth, test:correo, test:textos), cada una con su resultado.
# Uso: scripts/verificacion/verificar.sh            (en la rama o con `git checkout --detach <sha>` para verificar un commit anterior)
# Código de salida: 0 SOLO si todos los pasos pasan; 1 si falla cualquiera (tsc, preparación, build o cualquier suite). Al final imprime «RESULTADO: …» con la lista de lo que falló.
# Variables: WORK = carpeta de trabajo (por defecto $TMPDIR/ancora-verificacion; se puede borrar sin perder nada).
set -u
FALLAS=""; falla() { FALLAS="$FALLAS $1"; }   # cada paso que falla se anota aquí; el código de salida sale de esta lista
R="$(cd "$(dirname "$0")/../.." && pwd)"; WORK="${WORK:-${TMPDIR:-/tmp}/ancora-verificacion}"; mkdir -p "$WORK"
cd "$R" || exit 1
echo "HEAD $(git rev-parse --short HEAD)"; [ -n "$(git status --porcelain --untracked-files=no | grep -v '^ M .gitignore\|tsconfig.tsbuildinfo')" ] && echo "OJO: cambios sin confirmar en archivos versionados"
echo "== tsc"; npx tsc --noEmit -p . 2>&1 | head -5; [ "${PIPESTATUS[0]}" -eq 0 ] && echo "tsc OK" || { echo "TSC FALLÓ"; falla tsc; }
# node_modules clonado una vez (APFS: instantáneo); el build usa su propia copia para no ensuciar el repo
[ -d "$WORK/nm" ] || { cp -cR "$R/node_modules" "$WORK/nm" 2>/dev/null || cp -R "$R/node_modules" "$WORK/nm"; } || { echo "PREPARACIÓN FALLÓ (node_modules)"; falla preparacion; }
rm -rf "$WORK/exp" && mkdir -p "$WORK/exp" && git archive HEAD | tar -x -C "$WORK/exp" && { cp -cR "$WORK/nm" "$WORK/exp/node_modules" 2>/dev/null || cp -R "$WORK/nm" "$WORK/exp/node_modules"; } || { echo "PREPARACIÓN FALLÓ (export de HEAD)"; falla preparacion; }
echo "== next build (HEAD exacto)"
construir() { ( cd "$WORK/exp" && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder SUPABASE_SERVICE_ROLE_KEY=placeholder npx next build > "$WORK/vb-build.txt" 2>&1 ); }
# Un ÚNICO reintento, y solo si el error es exactamente la descarga de Google Fonts de next/font (scripts/verificacion/es-error-de-fuentes.sh). Cualquier otro error del build falla a la primera.
if construir; then echo "build OK"
elif bash "$R/scripts/verificacion/es-error-de-fuentes.sh" "$WORK/vb-build.txt"; then
  echo "build: falló la descarga de Google Fonts de next/font (de red, no del código); reintento 1 de 1"; cp "$WORK/vb-build.txt" "$WORK/vb-build-intento1.txt"
  if construir; then echo "build OK (tras un reintento por la descarga de Google Fonts)"; else echo "BUILD FALLÓ (también en el reintento)"; tail -15 "$WORK/vb-build.txt"; falla build; fi
else echo "BUILD FALLÓ"; tail -15 "$WORK/vb-build.txt"; falla build; fi
cd "$R"
for t in test:portal test:auth test:correo test:textos; do
  salida=$(npm run -s $t 2>&1); cod=$?; n=$(echo "$salida" | grep -c "comprobaciones OK"); total=$(echo "$salida" | grep "comprobaciones OK" | awk '{s+=$1} END {print s+0}')
  if [ $cod -eq 0 ]; then echo "$t: OK ($n suites, $total comprobaciones)"; else echo "$t: FALLÓ (código $cod)"; echo "$salida" | grep -B2 -A8 "FALL\|Error" | head -30; falla "$t"; fi
done
if [ -z "$FALLAS" ]; then echo "RESULTADO: TODO OK (código de salida 0)"; exit 0; else echo "RESULTADO: FALLÓ:$FALLAS (código de salida 1)"; exit 1; fi
