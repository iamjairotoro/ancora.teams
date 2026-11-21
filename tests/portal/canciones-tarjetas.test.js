// Estilo de botones, paso 6: la lista de Canciones en tarjetas, solo en teléfono (referencia docs/mockups/canciones-tarjetas.html). Estructura y medidas (la medición en un navegador real está en tests/e2e-menus/medir-estilo.js).
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('estilo: lista de Canciones en tarjetas (paso 6)')
const tsx = sinCom(leer('app/portal/_components/canciones/Canciones.tsx')), css = sinCom(leer('app/portal/_components/canciones/canciones.module.css'))
const tel = css.slice(css.lastIndexOf('@media (max-width:768px)')), desktop = css.slice(0, css.lastIndexOf('@media (max-width:768px)'))
t('teléfono: una tarjeta por canción, separadas 8 px (0,588 rem de 13,6 px) y sin caja única; el escritorio conserva la caja única con filas separadas por línea', () => {
  assert.match(tel, /\.lista\{[^}]*gap:\.588rem; border-radius:0; background:none; box-shadow:none; overflow:visible;/); assert.match(tel, /\.fila\{[^}]*border-top:0; border-radius:1\.176rem; background:var\(--anc-panel\); box-shadow:var\(--anc-e1\)/)
  assert.match(desktop, /\.lista\{[^}]*overflow:hidden; \}/); assert.match(desktop, /\.fila\{ display:flex; align-items:stretch; border-top:1px solid var\(--anc-rule\); \}/) })
t('línea 1 título con «…» y peso de título; línea 2 «artista · bpm» en peso normal y color secundario; sin artista solo el bpm; sin ninguno de los dos no hay línea', () => {
  assert.match(tsx, /const sub = \[c\.artista, c\.bpm \? `\$\{c\.bpm\} bpm` : ''\]\.filter\(Boolean\)\.join\(' · '\)/); assert.match(tsx, /\{sub \? <span className=\{ui\.artista\}>\{sub\}<\/span> : null\}/)
  assert.match(tel, /\.artista\{ font-size:var\(--fs-calc-15px-esc\); font-weight:var\(--w-normal\); \}/); assert.match(desktop, /\.nombre\{[^}]*font-weight:var\(--w-nombre\);[^}]*text-overflow:ellipsis; white-space:nowrap;/) })
t('a la derecha el acorde como ficha (alto 22 px = 1,62 rem, esquinas 7 px, peso normal, fondo gris plano, ancho mínimo 24 px) y solo si hay tono; junto al corazón de 19 px con zona táctil de 44 px', () => {
  assert.match(tsx, /\{tono \? <span className=\{ui\.acorde\}>\{tono\}<\/span> : null\}/); assert.match(tsx, /<Heart size=\{19\}/)
  const a = /\.acorde\{([^}]*)\}/.exec(tel)[1]; for (const k of ['min-width:1.76rem', 'height:1.62rem', 'border-radius:.515rem', 'background:var(--anc-sunk)', 'font-weight:var(--w-normal)', 'font-size:var(--fs-11px)']) assert.ok(a.includes(k), k)
  assert.match(tel, /\.fav\{ position:relative; align-self:stretch; width:max\(44px, 2\.5rem\); \}/); assert.match(tel, /\.fav::after\{[^}]*height:max\(44px, 3\.25rem\); transform:translateY\(-50%\);/) })
t('solo en teléfono (useTelefonoYa): el HTML de escritorio y tablet no cambia; el buscador, el contador y el selector se conservan', () => {
  assert.match(tsx, /if \(telefono\) \{/); assert.match(tsx, /return \(\s*<li className=\{ui\.fila\}>\s*<button type="button" className=\{ui\.abrir\}[^>]*>\s*<span className=\{ui\.txt\}>[^]*?<span className=\{ui\.tono\}>/)
  for (const k of ['<Segmentado opciones={OPCIONES}', 'CampoBusqueda valor={texto}', 'role="status" aria-live="polite">{visibles.length === 1']) assert.ok(tsx.includes(k), k) })
console.log(`${n} comprobaciones OK`)
