#!/bin/bash
# Construye el ÁRBOL DE TRABAJO (con lo que no está confirmado) y lo sirve para las capturas. Incluye la página de prueba /portal/t65 (el portal sin identidad, para los simuladores de tests/e2e-menus).
# Uso: scripts/verificacion/construir.sh [puerto]      (3168 por defecto)       Variables: WORK (como en verificar.sh)
set -u
R="$(cd "$(dirname "$0")/../.." && pwd)"; WORK="${WORK:-${TMPDIR:-/tmp}/ancora-verificacion}"; PUERTO="${1:-3168}"; mkdir -p "$WORK"
pkill -f "next start -p $PUERTO"; sleep 1
[ -d "$WORK/nm" ] || { cp -cR "$R/node_modules" "$WORK/nm" 2>/dev/null || cp -R "$R/node_modules" "$WORK/nm"; }
rm -rf "$WORK/w" && mkdir -p "$WORK/w"
rsync -a --exclude node_modules --exclude .next --exclude .git --exclude docs --exclude tests --exclude test-schema "$R/" "$WORK/w/"
{ cp -cR "$WORK/nm" "$WORK/w/node_modules" 2>/dev/null || cp -R "$WORK/nm" "$WORK/w/node_modules"; }
mkdir -p "$WORK/w/app/portal/t65"; printf "'use client'\nimport PortalApp from '../_components/PortalApp'\nexport default function T65() { return <PortalApp token={null} /> }\n" > "$WORK/w/app/portal/t65/page.tsx"
cd "$WORK/w" && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder SUPABASE_SERVICE_ROLE_KEY=placeholder npx next build > "$WORK/construir-build.txt" 2>&1 || { tail -20 "$WORK/construir-build.txt"; exit 1; }
( NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder SUPABASE_SERVICE_ROLE_KEY=placeholder nohup npx next start -p "$PUERTO" > "$WORK/construir-start.txt" 2>&1 & )
sleep 5; echo "listo en http://127.0.0.1:$PUERTO"
