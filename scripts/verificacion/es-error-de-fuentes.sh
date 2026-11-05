#!/bin/bash
# Uso: es-error-de-fuentes.sh <registro-del-build>
# Sale 0 SOLO si el fallo del `next build` es la descarga de Google Fonts de next/font (transitoria, de red): el encabezado «An error occurred in `next/font`» más la marca del cargador de Google
# (el archivo @next/font/dist/google/loader.js o «from Google Fonts»), y NINGÚN otro error de compilación en el mismo registro. Cualquier otra cosa sale 1: el build debe fallar a la primera.
f="${1:-}"; [ -f "$f" ] || exit 1
grep -qF 'An error occurred in `next/font`' "$f" || exit 1
grep -qE '@next/font/dist/google/loader\.js|from Google Fonts' "$f" || exit 1
grep -qE 'Type error:|Module not found|Syntax error|Unexpected token|SyntaxError|Cannot find module' "$f" && exit 1
exit 0
