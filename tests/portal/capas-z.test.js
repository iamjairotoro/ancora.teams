// Escala de capas (--z-*, app/globals.css): cada capa ≥ 19 tiene nombre; el valor de cada token es el que la capa ya tenía (el orden entre capas no cambió); la ventana centrada va sobre TODO salvo el arranque.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('capas z')
const tokens = {}; for (const m of sinCom(leer('app/globals.css')).matchAll(/--z-([a-z-]+):\s*(\d+)/g)) tokens[m[1]] = Number(m[2])
const ESPERADO = { 'captura-menu': 19, nav: 20, adjuntos: 27, pdf: 28, player: 29, 'captura-picker': 29, scrim: 30, popover: 30, sheet: 31, toast: 40, 'popover-alto': 40, alert: 45, 'dia-velo': 45, 'dia-panel': 46, encabezado: 50,
  'panel-velo': 60, editor: 60, 'popover-panel': 60, panel: 61, 'editor-paleta': 65, 'hoja-editor': 70, 'editor-hoja': 71, dialogo: 80, 'dialogo-alerta': 85, 'dialogo-aviso': 90, 'modal-orden': 200, 'modal-orden-panel': 201, ventana: 1000, arranque: 2147483000 }
const archivos = d => fs.readdirSync(path.join(R, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'node_modules' || e.name === '.next' ? [] : archivos(path.join(d, e.name))) : [path.join(d, e.name)])
const todos = [...archivos('app'), ...archivos('components')]
const PROTEGIDOS = ['app/songs.css', 'components/TeamsAdminPanel.tsx', 'components/personas/nuevo.module.css', 'components/canciones/CancionesPanel.tsx']
t('cada token conserva el valor de la capa que nombra (el orden entre capas no cambió) y no sobra ni falta ninguno', () => { assert.deepEqual(tokens, ESPERADO) })
t('ningún z-index de CSS ≥ 19 queda suelto: todo pasa por var(--z-…) (salvo los cuatro archivos protegidos por una prueba de «no cambia»)', () => {
  for (const f of todos.filter(f => /\.css$/.test(f) && !PROTEGIDOS.includes(f))) for (const m of sinCom(leer(f)).matchAll(/z-index:\s*(-?\d+)/g)) assert.ok(Number(m[1]) < 19, `${f}: z-index:${m[1]} suelto`) })
t('todo var(--z-…) que se usa existe en la escala', () => {
  for (const f of todos.filter(f => /\.(css|tsx)$/.test(f))) for (const m of leer(f).matchAll(/var\(--z-([a-z-]+)\)/g)) assert.ok(m[1] in tokens, `${f}: --z-${m[1]} no existe`) })
t('la ventana centrada (--z-ventana) queda sobre la ficha de persona (60/61), los diálogos (80–90) y los modales de escritorio (200/201/300); solo el arranque la supera', () => {
  const css = sinCom(leer('components/ventanas/ventanas.module.css')); assert.match(css, /\.velo\{[^}]*z-index:var\(--z-ventana\)/)
  for (const [k, v] of Object.entries(tokens)) if (k !== 'ventana' && k !== 'arranque') assert.ok(v < tokens.ventana, k)
  assert.ok(tokens.ventana > 300 && tokens.arranque > tokens.ventana)
  assert.match(sinCom(leer('app/person-drawer.css')), /z-index:var\(--z-panel-velo\)[\s\S]*z-index:var\(--z-panel\)/) })
t('las hojas (HojaBase, --z-scrim 30/--z-sheet 31) siguen bajo la ficha de persona: ninguna hoja de HojaBase se abre dentro de la ficha (PersonDetail no la importa) y las ventanas SÍ pasan por encima', () => {
  const pd = leer('components/persona/PersonDetail.tsx'); assert.ok(!/HojaBase|admin-movil\/HojaBase|disponibilidad\/hoja\.module/.test(pd))
  const hoja = sinCom(leer('app/portal/_components/disponibilidad/hoja.module.css')); assert.match(hoja, /\.velo\{[^}]*z-index:var\(--z-scrim\)/); assert.match(hoja, /\.hoja\{[^}]*z-index:var\(--z-sheet\)/) })
console.log(`${n} comprobaciones OK`)
