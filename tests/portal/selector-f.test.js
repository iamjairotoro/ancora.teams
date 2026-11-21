// Estilo de botones, paso 3: el selector «F» solo sobre el componente compartido Segmentado, y solo en teléfono. Estructura (la medición en un navegador real está en tests/e2e-menus/selector-f.js).
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), cp = require('child_process')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('estilo: selector F (paso 3)')
const css = sinCom(leer('app/portal/_components/segmentado/segmentado.module.css')), tsx = sinCom(leer('app/portal/_components/segmentado/Segmentado.tsx')), tipo = sinCom(leer('app/ancora-tipo.css'))
const tel = css.slice(css.lastIndexOf('@media (max-width:768px)'))
t('los tokens del selector viven solo en el bloque de teléfono de ancora-tipo.css', () => { const bloque = tipo.slice(tipo.indexOf('@media (max-width:768px)')); for (const k of ['--anc-sel-gap: 6px', '--anc-sel-ico: 15px', '--anc-sel-pad: 11px', '--anc-sel-sep: 7px']) assert.ok(bloque.includes(k), k); assert.ok(!/--anc-sel-/.test(tipo.slice(0, tipo.indexOf('@media (max-width:768px)')))) })
t('cuadrícula de columnas iguales con 6 px de separación, sin caja contenedora; opción con alto y esquinas de botón; zona táctil de 44 px', () => {
  assert.match(tel, /\.seg\{ --gap:var\(--anc-sel-gap\); gap:var\(--gap\); padding:0; border-radius:0; background:transparent; box-shadow:none; \}/)
  assert.match(tel, /\.opcion\{[^}]*height:var\(--anc-btn-alto\); padding:0 var\(--anc-sel-pad\); border-radius:var\(--anc-btn-esq\); background:var\(--anc-panel\); box-shadow:var\(--anc-e1\)/); assert.match(tel, /\.opcion::after\{[^}]*height:var\(--anc-btn-toque\)/) })
t('inactiva: tarjeta con el aro y texto secundario; activa: tinta con texto del color de la tarjeta sobre una pieza que se desliza con transform, --anc-ease-drawer y --anc-dur-sheet', () => {
  assert.match(tel, /color:var\(--anc-ink-2\)/); assert.match(tel, /\.opcion\[aria-checked="true"\]\{ background:transparent; box-shadow:none; color:var\(--anc-panel-solid\)/); assert.match(tel, /\.pieza\{[^}]*background:var\(--anc-ink\)/)
  assert.match(tel, /transition:transform var\(--anc-dur-sheet\) var\(--anc-ease-drawer\)/); assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{ \.pieza\{ transition:none; \} \}/) })
t('nunca se sale del margen: el texto se recorta con «…»; con menos de ~345 px de selector (container query) se ocultan los íconos y el texto se centra', () => {
  assert.match(tel, /\.txt\{[^}]*overflow:hidden; text-overflow:ellipsis;/); assert.match(tel, /\.caja\{ container-type:inline-size; \}/); assert.match(tel, /@container \(max-width:345px\)\{ \.opcion:has\(\.ico\)\{ justify-content:center; \} \.ico\{ display:none; \} \}/) })
t('los íconos y la caja solo se dibujan en teléfono (useTelefonoYa): el HTML de escritorio no cambia; se conserva la accesibilidad (radiogroup, aria-checked, teclado, foco)', () => {
  assert.match(tsx, /const telefono = useTelefonoYa\(\)/); assert.match(tsx, /return telefono \? <div className=\{ui\.caja\}>\{selector\}<\/div> : selector/); assert.match(tsx, /\{telefono\s*\n\s*\? <>\{o\.icono/)
  for (const k of ['role="radiogroup"', 'role="radio"', 'aria-checked={valor === o.valor}', "e.key === 'ArrowRight'", 'tabIndex={i === indice ? 0 : -1}']) assert.ok(tsx.includes(k), k); assert.match(css, /\.opcion:focus-visible\{ outline:2px solid var\(--anc-ink\)/) })
t('los íconos de la referencia: Convocatorias = calendario, Disponibilidad = círculo con check, Todas = nota musical, Favoritas = corazón, Del domingo = calendario', () => {
  const s = sinCom(leer('app/portal/_components/servicios/Servicios.tsx')), c = sinCom(leer('app/portal/_components/canciones/Canciones.tsx'))
  assert.match(s, /texto: 'Convocatorias', icono: CalendarDays/); assert.match(s, /texto: 'Disponibilidad', icono: CircleCheck/); assert.match(c, /texto: 'Todas', icono: Music2/); assert.match(c, /texto: 'Favoritas', icono: Heart/); assert.match(c, /texto: 'Del domingo', icono: CalendarDays/) })
t('lo que NO se toca (decisión aparte): las pestañas de texto de Inicio, Personas y administración y los radiogroups de las hojas siguen byte a byte como antes del paso 3', () => {
  const sin = ['components/personas/PestanasTexto.tsx', 'components/personas/pestanas-texto.module.css', 'components/home/Home.tsx', 'components/TeamsAdminPanel.tsx', 'app/portal/_components/lectura/HojaTonalidad.tsx', 'app/portal/_components/lectura/HojaPreferencias.tsx', 'components/servicio-movil/HojaNuevoServicio.tsx']
  for (const f of sin) if (fs.existsSync(path.join(R, f))) assert.equal(cp.spawnSync('git', ['diff', '--quiet', 'pre-estilo-botones-2026-11-20', '--', f], { cwd: R }).status, 0, f + ' cambió') })
console.log(`${n} comprobaciones OK`)
