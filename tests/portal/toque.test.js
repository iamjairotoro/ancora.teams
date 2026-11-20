// Movimiento, etapa M1: respuesta al toque. La regla vive en app/ancora-movimiento.css, solo en teléfono y solo sin «reducir movimiento», anima únicamente `scale` con los tokens, y excluye el menú inferior,
// lo deshabilitado, los interruptores, el editor y la lectura de canciones. Sin base de datos. Correr: `node tests/portal/toque.test.js`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sin = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: respuesta al toque (M1)')
const css = sin(leer('app/ancora-movimiento.css'))
t('todo vive dentro de UNA consulta: teléfono (≤ 768 px) y sin «reducir movimiento»; fuera de ella no hay reglas (el escritorio no cambia)', () => {
  const m = /^\s*@media \(max-width:768px\) and \(prefers-reduced-motion:no-preference\) \{/.exec(css); assert.ok(m, 'consulta de teléfono'); assert.equal(css.trimEnd().slice(-1), '}')
  let nivel = 0, fuera = ''; for (const ch of css) { if (ch === '{') nivel++; if (nivel === 0) fuera += ch; if (ch === '}') nivel-- }
  assert.equal(fuera.replace(/@media[^{]*/, '').trim(), '', 'nada fuera de la consulta') })
t('se anima solo `scale` (nunca transform, ancho, alto ni margen), con tokens: 120 ms de press y la curva --ease-out; sin duraciones sueltas', () => {
  assert.ok(!/(?<![\w-])transform\s*:/.test(css), 'sin transform'); assert.ok(!/(width|height|margin|padding|top|left)\s+var\(--anc-dur/.test(css))
  assert.match(css, /transition: scale var\(--anc-dur-press\) var\(--ease-out\);/); assert.ok(!/\d(ms|s)\b/.test(css), 'sin duraciones sueltas') })
t('botones, tarjetas y píldoras encogen a 0,97 y las filas anchas (hijas directas de una lista) a 0,98', () => {
  assert.match(css, /button, \[role="button"\], summary, li > a\[href\]\)[^{]*:active \{ scale:\.97; \}/); assert.match(css, /li > button, li > a\[href\], li > \[role="button"\]\)[^{]*:active \{ scale:\.98; \}/) })
t('excluye el menú inferior, lo deshabilitado, los interruptores y casillas, el botón heredado con escala propia, el editor y la lectura', () => {
  for (const x of [':disabled', '[aria-disabled="true"]', '[aria-checked]', '.anc-btn', 'nav *', '[data-sin-toque]', '[data-sin-toque] *']) assert.ok(css.includes(x), 'falta ' + x) })
t('los botones heredados con su propia transición suman la escala (y conservan sus propiedades)', () => { for (const c of ['.anc-rowMore', '.anc-dClose', '.anc .anc-fav']) { const k = c.split(' ').pop(); assert.match(css, new RegExp(c.replace(/\./g, '\\.') + '\\.' + k.slice(1) + ' \\{ transition:[^}]*scale var\\(--anc-dur-press\\)')) } })
t('la raíz del editor, de «Nueva canción» y de la lectura del músico llevan data-sin-toque', () => {
  assert.match(leer('components/canciones/EditorCancionMovil.tsx'), /className=\{ui\.raiz\} data-sin-toque=""/); assert.match(leer('components/canciones/NuevaCancionMovil.tsx'), /className=\{ui\.velo\} data-sin-toque=""/)
  assert.match(leer('app/portal/_components/CancionPortal.tsx'), /<div className="anc" data-sin-toque="">/); assert.ok(!leer('components/canciones/LyricSheet.tsx').includes('data-sin-toque'), 'LyricSheet y HojaAcordes se guardan byte a byte: no se tocan') })
t('la hoja se carga después de los tokens de tipografía y el oyente de toque (Safari) está en la raíz', () => { const l = leer('app/layout.tsx'); assert.ok(l.indexOf("'./ancora-movimiento.css'") > l.indexOf("'./ancora-tipo.css'") && l.includes("'./ancora-movimiento.css'")); assert.ok(/<RespuestaAlToque \/>/.test(l)); const c = leer('components/RespuestaAlToque.tsx'); assert.ok(/addEventListener\('touchstart', nada, \{ passive: true \}\)/.test(c) && /return null/.test(c)) })
t('la tira de días ya no declara su propia escala al presionar: usa la global (sus transiciones suman scale)', () => { const c = sin(leer('components/home/tira-dias.module.css')); assert.ok(!/\.(mes|btn):active/.test(c)); assert.ok((c.match(/scale var\(--anc-dur-press\) var\(--ease-out\)/g) || []).length >= 4) })
console.log(`${n} comprobaciones OK`)
