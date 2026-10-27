// Canciones (administración) en teléfono (bloque B3): las medidas del resto de la app, todo detrás de la media query (el escritorio no cambia). Correr: `node tests/portal/canciones-movil.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const css = fs.readFileSync(path.join(RAIZ, 'app/songs-movil.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const esc = px => `calc(${px}px * var(--esc, 1))`
const regla = sel => { const i = css.indexOf(sel + '{'); if (i < 0) throw new Error('falta la regla ' + sel); return css.slice(i + sel.length + 1, css.indexOf('}', i)) }

correr(async () => {
  await prueba('TODO el CSS está dentro de @media (max-width:768px): el escritorio no cambia', async () => {
    const t = css.trim(); assert.ok(t.startsWith('@media (max-width:768px){') && t.endsWith('}')); let depth = 0, fuera = ''
    for (const ch of t) { if (ch === '{') depth++; if (depth === 0) fuera += ch; if (ch === '}') depth-- } assert.equal(fuera.trim(), '@media (max-width:768px)', 'nada fuera de la media query'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), 'solo tokens') })
  await prueba('título 34/700; botones de 46 con radio 13; buscador de 46, radio 12 y 16 px de texto; sin chips', async () => {
    assert.ok(regla('.anc header.anc-hero h1').includes(`font-size:${esc(34)}`) && regla('.anc header.anc-hero h1').includes('font-weight:700'))
    const b = regla('.anc .anc-hero__acts .anc-btn'); assert.ok(b.includes(`min-height:max(44px, ${esc(46)})`) && b.includes(`border-radius:${esc(13)}`))
    const s = regla('.anc .anc-songTools .anc-search'); assert.ok(s.includes(`border-radius:${esc(12)}`) && s.includes(`min-height:max(44px, ${esc(46)})`)); assert.ok(regla('.anc .anc-songTools .anc-search input').includes('font-size:16px'))
    assert.ok(!/anc-chipRow|anc-chip\b/.test(css.slice(css.indexOf('@media (max-width:768px)'))), 'sin reglas de chips en teléfono: ya no se dibujan') })
  await prueba('cada canción es una ficha: relleno 14, radio 18, fondo de tarjeta; título 16/600 y artista 13 gris; sin el encabezado de columnas; el estado vacío y la hoja de letra son secciones de radio 22', async () => {
    const f = regla('.anc .anc-songRow'); assert.ok(f.includes(`padding:${esc(14)}`) && f.includes(`border-radius:${esc(18)}`) && /background:var\(--anc-panel\)/.test(f))
    assert.ok(regla('.anc .anc-songRow .anc-songTitle').includes(`font-size:${esc(16)}`) && regla('.anc .anc-songRow .anc-songTitle').includes('font-weight:600')); assert.ok(regla('.anc .anc-songRow .anc-songArtist').includes(`font-size:max(11px, ${esc(13)})`))
    assert.ok(regla('.anc .anc-panel:has(> .anc-songHead) > .anc-songHead').includes('display:none')); assert.ok(regla('.anc .anc-panel:has(> .anc-songHead) .anc-empty').includes(`border-radius:${esc(22)}`)); assert.ok(css.includes(`.anc .anc-panel:has(> .anc-sheet), .anc .anc-panel:has(> .anc-cHead){ border-radius:${esc(22)}; }`)) })
  await prueba('el detalle: la barra Aa · Editar · Adjuntos con botones de 46 y radio 13; «Agregar letra» de 46', async () => {
    const t = regla('.anc div:has(> .anc-btn--quiet > b) > .anc-btn'); assert.ok(t.includes(`min-height:max(44px, ${esc(46)})`) && t.includes(`border-radius:${esc(13)}`)); assert.ok(regla('.anc .anc-lyrEmpty .anc-btn').includes(`border-radius:${esc(13)}`)) })
  await prueba('lo compartido con otras pantallas no se toca: «.anc-empty» solo dentro de la lista de canciones; app/layout.tsx importa el archivo después de songs.css', async () => {
    assert.ok(!/(^|\n)\s*\.anc \.anc-empty\{/.test(css), '.anc-empty también lo usan Home, Servicio y Personas'); const l = fs.readFileSync(path.join(RAIZ, 'app/layout.tsx'), 'utf8'); assert.ok(l.indexOf("import './songs.css'") < l.indexOf("import './songs-movil.css'")) })
  await prueba('Adjuntos es una ventana centrada (radio 22, relleno 20/18/16, «Cerrar» de 46 y radio 13) y Editar/Nueva siguen siendo pantalla larga con campos de radio 12 (16 px) y botones de 46/13', async () => {
    const v = regla('.anc .anc-adjVentana'); assert.ok(v.includes(`border-radius:${esc(22)}`) && v.includes(`padding:${esc(20)} ${esc(18)} ${esc(16)}`)); const c = regla('.anc .anc-adjVentana .anc-adjCerrar'); assert.ok(c.includes(`border-radius:${esc(13)}`) && c.includes(`min-height:max(44px, ${esc(46)})`))
    const i = regla('.anc .anc-edicion input.anc-input, .anc .anc-edicion select.anc-input'); assert.ok(i.includes(`border-radius:${esc(12)}`) && i.includes('font-size:16px') && i.includes(`min-height:max(44px, ${esc(46)})`)); assert.ok(/margin-bottom:calc\(76px \+ var\(--safe-bottom, 0px\)\)/.test(regla('.anc .anc-edicion')), 'el formulario queda por encima del menú de abajo'); const b = regla('.anc .anc-edicion .anc-btn'); assert.ok(b.includes(`border-radius:${esc(13)}`) && b.includes(`min-height:max(44px, ${esc(46)})`))
    const p = fs.readFileSync(path.join(RAIZ, 'components/canciones/CancionesPanel.tsx'), 'utf8'); for (const k of ['anc-adjModal', 'anc-adjVentana', 'anc-adjTitulo', 'anc-adjCerrar', 'anc-edicion']) assert.ok(p.includes(k), 'falta la clase ' + k) })
  await prueba('teléfono: la lista de Canciones no dibuja los chips de filtro (quedan título, «+ Agregar canción», buscador, «Ordenar», lista, corazón y ⋯); el escritorio y la tablet los conservan; el filtro elegido no queda escondido', async () => {
    const quitar = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'), lista = quitar('components/canciones/SongList.tsx'), panel = quitar('components/canciones/CancionesPanel.tsx')
    assert.ok(/const telefono = useTelefonoYa\(\)/.test(lista)); assert.ok(/\{!telefono && \(\s*<div className="anc-chipRow">/.test(lista), 'los chips solo fuera del teléfono'); for (const k of ['anc-hero', 'anc-songTools', 'anc-search', 'p.onSort', 'anc-fav', 'anc-rowMore', '+ Agregar canción', 'Todas', 'Tocadas este mes']) assert.ok(lista.includes(k), 'sigue: ' + k)
    assert.ok(/const filtroActivo: SongFilter = telefono \? 'all' : filter/.test(panel) && !/\bfilter===/.test(panel), 'en teléfono el filtro vale «todas»: uno elegido antes de girar el aparato no deja la lista vacía')
    const T = require(require('./_banco').resolver(path.join(RAIZ, 'lib/textos/cancionesAdmin'))).TEXTOS_CANCIONES_ADMIN; assert.deepEqual([T.sinResultadosTitulo, T.sinResultadosAyudaTelefono], ['Sin resultados', 'Prueba con otro término.']); assert.ok(!/filtro/i.test(T.sinResultadosAyudaTelefono))
    assert.ok(lista.includes('Prueba con otro término o cambia el filtro.'), 'el texto del escritorio no cambia') })
  terminar()
})
