// Movimiento, arreglo de M2: toda hoja que use hoja.module.css (la comparten Disponibilidad, Chats, la tira vía su propio CSS no, y ~12 hojas del admin, el líder, el servicio, el Orden y la lectura) tiene SIEMPRE una animación de entrada en teléfono:
// o pasa por la presencia (data-hoja: entrada y salida en app/ancora-movimiento.css) o cae en la entrada por defecto de hoja.module.css (.hoja:not([data-hoja]): 240 ms, curva de drawer, tokens). Nunca ninguna.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: entrada de todas las hojas de hoja.module.css (arreglo de M2)')
const css = sinCom(leer('app/portal/_components/disponibilidad/hoja.module.css')), mov = sinCom(leer('app/ancora-movimiento.css'))
const bloque = (c, cab) => { const i = c.indexOf(cab); assert.ok(i >= 0, 'falta ' + cab); let d = 0, j = c.indexOf('{', i); const ini = j; for (; j < c.length; j++) { if (c[j] === '{') d++; else if (c[j] === '}' && --d === 0) break } return c.slice(ini + 1, j) }
const archivos = []; const recorrer = d => { for (const e of fs.readdirSync(path.join(R, d), { withFileTypes: true })) { if (['node_modules', '.next', '.git', 'tests', 'docs'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) recorrer(p); else if (/\.tsx$/.test(e.name)) archivos.push(p) } }
recorrer('app'); recorrer('components')
const usan = archivos.filter(f => /import \w+ from '[^']*disponibilidad\/hoja\.module\.css'|import \w+ from '\.\/hoja\.module\.css'|import \w+ from '\.\.\/disponibilidad\/hoja\.module\.css'/.test(leer(f)))

t('hay hojas que usan hoja.module.css (la lista no puede quedar vacía por un cambio de ruta)', () => assert.ok(usan.length >= 12, usan.length + ' archivos: ' + usan.join(', ')))
t('en teléfono, las hojas sin presencia tienen entrada: .hoja:not([data-hoja]) sube en --anc-dur-sheet con --anc-ease-drawer y su velo hace un fundido', () => {
  const tel = bloque(css, '@media (max-width:768px) and (prefers-reduced-motion:no-preference)')
  assert.match(tel, /\.velo:not\(\[data-hoja-velo\]\)\{ animation:anc-hoja-velo var\(--anc-dur-sheet\) var\(--ease-out\); \}/); assert.match(tel, /\.hoja:not\(\[data-hoja\]\)\{ animation:anc-hoja-sube var\(--anc-dur-sheet\) var\(--anc-ease-drawer\); \}/)
  assert.match(css, /@keyframes anc-hoja-sube\{ from\{ translate:0 100% \} to\{ translate:0 0 \} \}/); assert.match(css, /@keyframes anc-hoja-velo\{ from\{ opacity:0 \} to\{ opacity:1 \} \}/) })
t('entre 640 y 768 px (ventana centrada) la entrada por defecto es un fundido con un pequeño ascenso que no pisa el centrado', () => {
  const c = bloque(css, '@media (min-width:640px) and (max-width:768px) and (prefers-reduced-motion:no-preference)'); assert.match(c, /animation-name:anc-hoja-aparece/)
  assert.match(css, /@keyframes anc-hoja-aparece\{ from\{ translate:0 1\.5rem; opacity:0 \} to\{ translate:0 0; opacity:1 \} \}/) })
t('«reducir movimiento»: solo un fundido de --anc-dur-reduced (con !important: la regla global apaga todas las animaciones)', () => {
  const r = bloque(css, '@media (max-width:768px) and (prefers-reduced-motion:reduce)'); assert.match(r, /animation:anc-hoja-fundido var\(--anc-dur-reduced\) linear !important/); assert.match(css, /@keyframes anc-hoja-fundido\{ from\{ opacity:0 \} to\{ opacity:1 \} \}/) })
t('no se solapan: las hojas con presencia (data-hoja) quedan fuera de la entrada por defecto y llevan la suya (transición) en ancora-movimiento.css', () => {
  assert.ok(!/\.hoja\{[^}]*animation/.test(css.replace(/@media \(min-width:769px\)\{[\s\S]*?\}\s*\}/, '').replace(/@media \(prefers-reduced-motion:reduce\)\{[^{}]*\{[^}]*\}\s*\}/, '')), 'ninguna regla base de .hoja anima fuera de escritorio (el «animation:none» de reducir movimiento lo pisa la entrada de fundido)')
  assert.match(mov, /:where\(\[data-hoja\]\) \{ translate:0 100%; transition:translate/) })
t('escritorio (> 768 px): las animaciones de siempre, intactas', () => { const e = bloque(css, '@media (min-width:769px)'); assert.match(e, /\.velo\{ animation:disp-velo 180ms ease-out; \}/); assert.match(e, /\.hoja\{ animation:disp-aparece 200ms cubic-bezier\(\.23,1,\.32,1\); \}/) })
t('toda hoja que usa hoja.velo / hoja.hoja pasa por la presencia COMPLETA (velo y hoja) o por ninguna (así nunca hay una sola mitad migrada)', () => {
  const mal = []
  for (const f of usan) { const s = sinCom(leer(f)); const velos = (s.match(/className=\{`?hoja\.velo|className=\{hoja\.velo/g) || []).length, hojas = (s.match(/hoja\.hoja/g) || []).length, atv = (s.match(/atributosHoja\([^)]*,\s*true\)/g) || []).length, ath = (s.match(/atributosHoja\((?![^)]*,\s*true\))[^)]*\)/g) || []).length
    if (atv || ath) { if (atv !== velos || ath !== hojas) mal.push(`${f}: ${atv}/${velos} velos y ${ath}/${hojas} hojas con presencia`); if (!/usePresencia\(/.test(s)) mal.push(f + ': usa atributosHoja sin usePresencia') } }
  assert.deepEqual(mal, [], '\n' + mal.join('\n')) })
t('las hojas migradas a la presencia siguen siendo exactamente las de M2 (el resto debe animarse por la entrada por defecto hasta M3)', () => {
  const con = usan.filter(f => /atributosHoja\(/.test(leer(f))).sort(); assert.deepEqual(con, ['app/portal/_components/chats/HojaDirecto.tsx', 'app/portal/_components/disponibilidad/Disponibilidad.tsx']) })
console.log(`${n} comprobaciones OK`)
