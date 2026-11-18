// Tipografía, paso 0: en los CSS de teléfono (lista en scripts/verificacion/css-telefono.js) NO vuelve a haber font-weight ni font-size sueltos: todo sale de los tokens de app/ancora-tipo.css, y cada token vale lo que valía
// el valor al que reemplazó (sin diferencia visible). Excepciones de font-size que se quedan a propósito: valores que dependen de otra variable que NO es --esc (--anc-letra-size, --nav-label-size, --ac-fs…) o de em. Sin base de datos.
const assert = require('node:assert/strict'), path = require('path')
const { leerCrudo, cargar } = require('./_tokens.js'), { archivos, R } = require('../../scripts/verificacion/css-telefono.js')
const leer = f => leerCrudo(path.join(R, f), 'utf8'), sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const tokens = cargar(), lista = archivos()
console.log('tipografía: tokens (paso 0)')
t('hay unos 70 CSS de teléfono y el archivo de tokens existe', () => { assert.ok(lista.length >= 60, String(lista.length)); assert.ok(Object.keys(tokens).length > 60) })
t('los pesos valen 400, 500, 600, 700 y 800 (los de siempre)', () => assert.deepEqual(['normal', 'medio', 'fuerte', 'negrita', 'negra'].map(k => tokens['--w-' + k]), ['400', '500', '600', '700', '800']))
t('ningún token se apoya en otra variable que no sea --esc (así valen lo mismo que el valor suelto)', () => { for (const [k, v] of Object.entries(tokens)) assert.ok(!/var\(--(?!esc\b)/.test(v), `${k}: ${v}`) })
t('ningún font-weight suelto en los CSS de teléfono', () => { for (const f of lista) for (const m of sinComentarios(leer(f)).matchAll(/font-weight\s*:\s*([^;}!]+)/g)) assert.ok(/^var\(--w-(normal|medio|fuerte|negrita|negra)\)$/.test(m[1].trim()) || m[1].trim() === 'inherit', `${f}: font-weight:${m[1]}`) })
t('ningún font-size literal suelto en los CSS de teléfono', () => { for (const f of lista) for (const m of sinComentarios(leer(f)).matchAll(/font-size\s*:\s*([^;}!]+)/g)) { const v = m[1].trim(); assert.ok(/^var\(--fs-[\w-]+\)$/.test(v) || /var\(--(anc-letra-size|nav-label-size|ac-fs)|[\d.]em\b|^inherit$/.test(v), `${f}: font-size:${v}`) } })
t('cada token que se usa está definido, y cada token definido se usa', () => {
  const usados = new Set(); for (const f of lista) for (const m of leer(f).matchAll(/var\((--(?:w|fs)-[\w-]+)\)/g)) usados.add(m[1])
  for (const u of usados) assert.ok(u in tokens, `${u} sin definir`)
  for (const k of Object.keys(tokens)) assert.ok(usados.has(k), `${k} definido y sin uso`)
})
t('los CSS compartidos con el escritorio y los estilos en línea no se tocaron (sin tokens de tipografía)', () => { for (const f of ['app/globals.css', 'app/songs.css', 'components/app.module.css', 'components/ui.module.css', 'app/ancora-tokens-v5.css', 'components/team-blocks-calendar.module.css', 'components/canciones/linea-con-acordes.module.css']) assert.ok(!/var\(--(w|fs)-/.test(leer(f)), f) })
t('app/layout.tsx importa los tokens después de los de colores', () => { const l = leer('app/layout.tsx'); assert.ok(l.indexOf("'./ancora-tipo.css'") > l.indexOf("'./ancora-tokens-v5.css'") && l.includes("'./ancora-tipo.css'")) })
console.log(`${n} comprobaciones OK`)
