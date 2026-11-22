// Estilo de botones: Personas y Equipos en teléfono (referencias taller-estilo.html y canciones-tarjetas.html). Selector «F» con íconos, buscador compacto (38 px, esquinas de 14), contador con ícono de trazo, personas en tarjetas separadas 8 px sin caja única,
// chips con el peso nuevo, «⋯» con zona táctil de 44 y Equipos con el mismo tratamiento. El escritorio no cambia. La medición en un navegador real está en tests/e2e-menus/personas-tarjetas.js.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, ''), plano = t => sinCom(t).replace(/\s+/g, ' ')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const tel = c => c.slice(c.lastIndexOf('@media (max-width:768px){')), fuera = c => c.slice(0, c.lastIndexOf('@media (max-width:768px){'))
console.log('estilo: Personas y Equipos en tarjetas (teléfono)')
const panel = plano(leer('components/PersonasPanel.tsx')), lista = plano(leer('components/PersonasList.tsx')), pe = plano(leer('components/personas/PorEquipo.tsx'))
const listaCss = plano(leer('components/personas-list.module.css')), peCss = plano(leer('components/personas/por-equipo.module.css')), celda = plano(leer('components/personas/persona-celda.module.css')), busq = plano(leer('components/campos/campo-busqueda.module.css'))

t('selector Personas | Equipos: Segmentado (selector F) con ícono de persona y de equipo, solo en teléfono; en escritorio el Segmentado de siempre; las pestañas de texto ya no existen', () => {
  assert.match(panel, /icono: User \}, \{ valor: 'equipo', texto: nombresDeVista\[1\], icono: Users \}/); assert.match(panel, /import \{ ChevronLeft, SlidersHorizontal, User, Users \} from 'lucide-react'/)
  assert.ok(!/PestanasTexto/.test(panel) && !fs.existsSync(path.join(R, 'components/personas/PestanasTexto.tsx')) && !fs.existsSync(path.join(R, 'components/personas/pestanas-texto.module.css')))
  assert.match(panel, /<Segmentado className=\{panel\.selector\}/, 'escritorio igual') })
t('buscador: Personas, Equipos y Canciones usan CampoBusqueda `compacto` (38 px y esquinas de 14 con los tokens --anc-btn-*, fondo gris plano, aro de 2 px al enfocar, zona táctil de 44); la píldora de siempre queda para quien no lo pide', () => {
  assert.match(lista, /<CampoBusqueda [^>]*etiqueta="Buscar personas" compacto \/>/); assert.match(pe, /<CampoBusqueda [^>]*etiqueta="Buscar persona" compacto \/>/)
  assert.match(busq, /\.compacto \.campo\{ height:var\(--anc-btn-alto\); padding:0 4px 0 12px; border:0; border-radius:var\(--anc-btn-esq\); background:var\(--anc-sunk\); box-shadow:none; \}/)
  assert.match(busq, /\.compacto \.campo:focus-within\{[^}]*0 0 2px var\(--anc-campo-foco\)|\.compacto \.campo:focus-within\{[^}]*box-shadow:0 0 0 2px var\(--anc-campo-foco\)/); assert.match(busq, /\.compacto \.campo::after\{ inset:-3px 0; \}/)
  assert.match(busq, /\.campo\{[^}]*height:40px;[^}]*border-radius:20px/, 'la píldora de siempre no cambia'); assert.match(plano(leer('app/portal/_components/canciones/Canciones.tsx')), /<CampoBusqueda valor=\{texto\} onCambio=\{onTexto\} placeholder="Buscar por título o artista" etiqueta="Buscar por título o artista" compacto \/>/, 'el buscador de Canciones es el mismo, compacto') })
t('contador: en teléfono un ícono de trazo de teléfono (Smartphone) en vez del emoji, peso 400 y color secundario; el escritorio conserva el emoji', () => {
  assert.match(lista, /telefono \? <span title="[^"]*"> · <span className=\{styles\.cuentaApp\}><Smartphone className=\{styles\.icoApp\} aria-hidden="true" \/>\{installed\} con la app instalada<\/span><\/span> : <span title="[^"]*"> · 📲 \{installed\} con la app instalada<\/span>/)
  const m = tel(listaCss); assert.match(m, /\.count\{ font-weight:var\(--w-normal\); color:var\(--anc-ink-3\); \}/); assert.match(m, /\.icoApp\{ flex:none; width:1\.1em; height:1\.1em; stroke-width:1\.7; \}/) })
t('lista de personas: una tarjeta por persona separadas 8 px (0,588 rem), sin la caja única, con el radio y el relleno de las tarjetas de Canciones; el escritorio conserva la caja única con filas separadas por línea', () => {
  const m = tel(listaCss), d = fuera(listaCss)
  assert.ok(m.includes('.list{ display:flex; flex-direction:column; gap:.588rem; border-radius:0; background:none; box-shadow:none; overflow:visible; }')); assert.ok(m.includes('.row, .row + .row{ border-radius:1.176rem; background:var(--anc-panel); box-shadow:var(--anc-e1); padding-right:.441rem; }'))
  assert.match(d, /\.list\{ background:var\(--anc-panel\); border-radius:var\(--anc-r-panel\); box-shadow:var\(--anc-e1\); overflow:hidden; min-width:0; \}/); assert.match(d, /\.row \+ \.row\{ box-shadow:inset 0 1px 0 var\(--anc-rule\); \}/) })
t('sin barra negra en teléfono: la fila seleccionada es una tarjeta como las demás (fondo de tarjeta y sombra propia); el escritorio conserva su barra y su fondo gris (marcador de la ficha fija)', () => {
  assert.match(fuera(listaCss), /\.row\[data-sel="true"\]\{ background:var\(--anc-sunk\); box-shadow:inset 3px 0 0 var\(--anc-ink\); \}/, 'escritorio igual')
  const m = tel(listaCss); assert.ok(m.includes('.row[data-sel="true"], .row[data-sel="true"] + .row{ background:var(--anc-panel); box-shadow:var(--anc-e1); }')); assert.ok(!/inset \.21rem|inset 3px/.test(m), 'ninguna barra en teléfono') })
t('nombre con peso de título; posiciones en peso 400 y color secundario separadas por « · »; chips con el peso nuevo (--w-fuerte): «Propietario» neutro y «Sin equipo» con su relleno de aviso', () => {
  assert.match(celda, /\.nm\{[^}]*font-weight:var\(--w-nombre\)/); assert.match(celda, /\.sub\{[^}]*font-weight:var\(--w-normal\); color:var\(--anc-ink-3\)/); assert.match(celda, /\.etiqueta\{[^}]*background:var\(--anc-sunk\)[^}]*font-weight:var\(--w-fuerte\)/)
  assert.match(lista, /names\.slice\(0, 3\)\.join\(' · '\)/); assert.match(lista, /<span className=\{styles\.noTeam\}>Sin equipo<\/span>/)
  assert.match(fuera(listaCss), /\.noTeam\{[^}]*color:var\(--anc-pe\); background:var\(--anc-pe-bg\)/); assert.match(tel(listaCss), /\.noTeam\{ font-size:var\(--fs-11px\); font-weight:var\(--w-fuerte\); padding:\.088rem \.515rem; border-radius:999px; \}/) })
t('«⋯»: 24 px visibles con zona táctil de 44 px (::after de −10 px); los puntos de color de equipo y el menú siguen a la derecha de cada tarjeta', () => {
  const m = tel(listaCss); assert.ok(m.includes('.menuWrap :global(.anc-rowMore){ position:relative; }') && m.includes(".menuWrap :global(.anc-rowMore)::after{ content:''; position:absolute; inset:-10px; }"))
  assert.match(lista, /<span className=\{styles\.dots\}> \{ids\.map\(id => <TeamDot /); assert.match(lista, /className="anc-rowMore" aria-label=\{`Acciones para \$\{m\.nombre\}`\}/) })
t('Equipos: una tarjeta por equipo (las personas de dentro siguen siendo filas separadas por línea, no tarjetas anidadas) separadas 8 px con el radio de las tarjetas de Canciones; contador y rótulo en peso 400; dentro, la misma celda de persona; el escritorio no cambia', () => {
  const m = tel(peCss); for (const k of ['.raiz{ gap:.588rem; }', '.bloque{ border-radius:1.176rem; }', '.cuenta{ font-weight:var(--w-normal); }', '.etiqueta{ font-weight:var(--w-normal); }', '.nombre{ font-size:var(--fs-calc-17px-esc); }']) assert.ok(m.includes(k), k)
  assert.match(fuera(peCss), /\.raiz\{ display:flex; flex-direction:column; gap:0\.75rem; \}/); assert.match(fuera(peCss), /\.bloque\{ border-radius:1rem;/); assert.match(pe, /telefonoYa \? <PersonaCelda /); assert.match(fuera(peCss), /\.persona\{[^}]*border-top:1px solid var\(--anc-rule\)/); assert.ok(!/\.persona\{[^}]*box-shadow/.test(tel(peCss)), 'la fila de persona no es tarjeta') })
t('lo que NO cambia: «+» negro de agregar (BotonNuevo), «Modo Usuario» y «Gestionar equipos» siguen como estaban', () => {
  const R0 = 'pre-diagnostico-viewport-2026-11-21', cp = require('child_process')
  for (const f of ['components/personas/BotonNuevo.tsx', 'components/personas/nuevo.module.css', 'components/AppShell.tsx']) assert.equal(cp.spawnSync('git', ['diff', '--quiet', R0, '--', f], { cwd: R }).status, 0, f + ' cambió')
  assert.match(panel, /<button type="button" className=\{panel\.gestionar\} onClick=\{\(\) => irAGestion\(\{ modo: 'equipos' \}\)\}>/) })
console.log(`${n} comprobaciones OK`)
