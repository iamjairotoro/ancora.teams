// Paso 0 de la tipografía (neutral): reemplaza cada font-weight y cada font-size LITERAL de los CSS de teléfono por un token de app/ancora-tipo.css cuyo valor es EXACTAMENTE el de antes (ninguna diferencia visible).
// Uso: node scripts/verificacion/tipografia-codemod.js        (reescribe los archivos y app/ancora-tipo.css)       --seco: solo cuenta. Los valores con var() ajenos a --esc, em o % no se tocan (se listan al final).
const fs = require('fs'), path = require('path'), { R, archivos } = require('./css-telefono.js')
const SECO = process.argv.includes('--seco')
const PESO = { 400: 'normal', 500: 'medio', 600: 'fuerte', 700: 'negrita', 800: 'negra' }
const slug = v => 'fs-' + v.toLowerCase().replace(/var\(--esc,?\s*1?\)/g, 'esc').replace(/\./g, 'p').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const literal = v => { const s = v.replace(/var\(--esc\s*(,\s*1\s*)?\)/g, '1'); return !/var\(|[\d.]em\b|%|[a-z]{3,}(?<!calc|max|min|rem)\(/i.test(s) && /^(calc|max|min)\(|^[\d.]+(rem|px)$/.test(s.trim()) }
const tokens = new Map(), omitidos = [], otrosPesos = []
let nPeso = 0, nTam = 0
for (const f of archivos()) {
  const t = fs.readFileSync(path.join(R, f), 'utf8')
  const nuevo = t.split(/(\/\*[\s\S]*?\*\/)/).map((trozo, i) => {
    if (i % 2) return trozo   // comentarios: intactos
    trozo = trozo.replace(/(font-weight\s*:\s*)(\d{3})(?=\s*(?:!important\s*)?[;}\n]|\s*$)/g, (m, a, n) => { if (!PESO[n]) { otrosPesos.push(`${f}: ${n}`); return m } nPeso++; return `${a}var(--w-${PESO[n]})` })
    trozo = trozo.replace(/(font-size\s*:\s*)([^;}!]+?)(\s*(?:!important\s*)?(?=[;}]|$))/g, (m, a, v, c) => {
      v = v.trim(); if (/^var\(--fs-/.test(v)) return m
      if (!literal(v)) { omitidos.push(`${f}: ${v}`); return m }
      let nombre = slug(v); if (tokens.has(nombre) && tokens.get(nombre) !== v) throw new Error('colisión ' + nombre + ': ' + tokens.get(nombre) + ' / ' + v)
      tokens.set(nombre, v); nTam++; return `${a}var(--${nombre})${c}` })
    return trozo
  }).join('')
  if (!SECO && nuevo !== t) fs.writeFileSync(path.join(R, f), nuevo)
}
const ord = [...tokens.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))
const css = `/* Tokens de tipografía (paso 0, neutral). CADA token vale EXACTAMENTE lo que valía el valor suelto al que reemplazó en los CSS de teléfono (lista: scripts/verificacion/css-telefono.js), así que no hay ninguna diferencia visible.
   Pesos: normal 400 · medio 500 · fuerte 600 · negrita 700 · negra 800 (los dos últimos existen solo mientras no se cambien).
   Tamaños: un token por valor que había (nombre = el valor: «p6875rem» = .6875rem; «calc-13px-esc» = calc(13px * var(--esc, 1)); «max-11px-…» = con piso de 11 px). Las partes en rem y --esc se resuelven igual que antes (--esc vive en :root).
   Paso 1 (otra decisión): agrupar estos tamaños en la escala de roles y cambiar los pesos, desde este único archivo. NO se tocan aquí: globals.css, songs.css, app.module.css, ui.module.css, estilos en línea de TSX. */
:root {
${Object.entries(PESO).map(([n, k]) => `  --w-${k}: ${n};`).join('\n')}
${ord.map(([k, v]) => `  --${k}: ${v};`).join('\n')}
}
`
if (!SECO && tokens.size) fs.writeFileSync(path.join(R, 'app/ancora-tipo.css'), css)   // si ya está aplicado (0 tokens), no pisa el archivo
console.log(`archivos: ${archivos().length} · font-weight reemplazados: ${nPeso} · font-size reemplazados: ${nTam} · tokens de tamaño: ${tokens.size}`)
console.log('sin tocar (no literales):'); const c = {}; omitidos.forEach(o => c[o] = (c[o] || 0) + 1); Object.entries(c).forEach(([k, v]) => console.log('  ' + v + '× ' + k))
if (otrosPesos.length) console.log('pesos fuera de la tabla:', otrosPesos)
