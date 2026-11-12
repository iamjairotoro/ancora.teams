// Admin móvil, paso 2: la cabecera de la ficha de la canción del administrador en teléfono («‹ Canciones», «✎ Editar», portada, título, artista y pastillas), según los tableros «Canción · Móvil · Detalle» y «Ficha admin · Borrador y estado vacío» (los medidas del segundo mandan: portada de 76, título 22/800, pastillas debajo), SIN «Agregar a servicio»,
// «Transponer» ni «Usada N veces» (no son funciones que existan). Datos inventados; sin red. Correr: `node tests/portal/admin-movil-ficha-cabecera.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), cp = require('child_process'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const Cabecera = require(path.join(RAIZ, 'components/canciones/FichaCabeceraMovil.tsx')).default
const T = require(path.join(RAIZ, 'lib/textos/cancionesAdmin.ts')).TEXTOS_CANCIONES_ADMIN
const CANCION = { id: 's1', nombre: 'Canción de prueba', artista: 'Grupo inventado', tono_original: 'G', bpm: 72, compas: '4/4' }
const ver = (c, hijos) => R(h(Cabecera, { cancion: c, onVolver() {}, onEditar() {} }, hijos))

correr(async () => {
  await prueba('cabecera: «‹ Canciones» y «✎ Editar» como botones de verdad, con los iconos ocultos para los lectores de pantalla', () => {
    const m = ver(CANCION)
    assert.match(m, /<button type="button" class="anc-fichaCab__volver"><svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>Canciones<\/button>/)
    assert.match(m, /<button type="button" class="anc-fichaCab__editar"><svg[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>Editar<\/button>/)
    assert.equal(T.fichaVolver, 'Canciones'); assert.equal(T.fichaEditar, 'Editar'); assert.equal(T.fichaSeccionLetra, 'Letra y acordes') })

  await prueba('bloque de título: el título es el h1 (uno solo), el artista, y las pastillas «Tono G», «72 bpm» y «4/4» en ese orden', () => {
    const m = ver(CANCION)
    assert.equal((m.match(/<h1/g) || []).length, 1); assert.ok(m.includes('<h1 class="anc-fichaTit__titulo">Canción de prueba</h1>') && m.includes('<p class="anc-fichaTit__artista">Grupo inventado</p>'))
    assert.ok(m.includes('<ul class="anc-fichaTit__pastillas"><li>Tono G</li><li>72 bpm</li><li>4/4</li></ul>')); assert.equal(T.fichaTono('Dm'), 'Tono Dm'); assert.equal(T.fichaBpm(68.5), '68.5 bpm') })

  await prueba('lo que la canción no tiene no se muestra: sin artista, sin tono, sin bpm y sin compás no hay párrafo ni pastillas vacías', () => {
    const m = ver({ id: 's2', nombre: 'Solo título' })
    assert.ok(m.includes('Solo título') && !m.includes('anc-fichaTit__artista') && !m.includes('anc-fichaTit__pastillas') && !m.includes('<li>'))
    const parcial = ver({ id: 's3', nombre: 'Con tono', tono_original: 'A' }); assert.ok(parcial.includes('<li>Tono A</li>') && !parcial.includes('bpm') && (parcial.match(/<li>/g) || []).length === 1) })

  await prueba('portada: con carátula, la imagen (alt vacío: es decoración); sin ella, un cuadro neutro con la nota musical oculta; nunca se inventa una imagen', () => {
    const con = ver({ ...CANCION, caratula_url: 'https://ejemplo.test/portada.jpg' }); assert.ok(con.includes('<img class="anc-fichaTit__portada" src="https://ejemplo.test/portada.jpg" alt=""/>') && !con.includes('portada--vacia'))
    const sin = ver(CANCION); assert.ok(sin.includes('anc-fichaTit__portada--vacia') && sin.includes('aria-hidden="true"') && !sin.includes('<img')) })

  await prueba('el menú «⋯» llega como hijo, dentro del grupo de la derecha junto a «Editar»; sin hijo, no hay nada más', () => {
    const m = ver(CANCION, h('i', { id: 'menu-prueba' }, 'x'))
    assert.match(m, /<div class="anc-fichaCab__der"><button type="button" class="anc-fichaCab__editar">[\s\S]*?Editar<\/button><i id="menu-prueba">x<\/i><\/div>/)
    assert.equal((m.match(/menu-prueba/g) || []).length, 1, 'el menú se dibuja una sola vez'); assert.ok(!ver(CANCION).includes('<i ')) })

  await prueba('solo dibuja y reenvía: sin fetch, sin supabase ni almacenamiento; «volver» y «Editar» son los manejadores que recibe', () => {
    const c = leer('components/canciones/FichaCabeceraMovil.tsx'); assert.ok(!/fetch\(|supabase|localStorage|sessionStorage/.test(c.replace(/\/\/.*$/gm, '')))
    assert.match(c, /className="anc-fichaCab__volver" onClick=\{onVolver\}/); assert.match(c, /className="anc-fichaCab__editar" onClick=\{onEditar\}/) })

  await prueba('ficha: en teléfono usa la cabecera nueva con las MISMAS acciones (volver a la lista, abrir «Editar»); en escritorio, la cabecera de siempre; el menú «⋯» es el mismo en los dos', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /\{telefono \? \(\s*<FichaCabeceraMovil cancion=\{selectedSong\} onVolver=\{\(\)=>setView\('list'\)\} onEditar=\{\(\)=>setEditing\(\{\.\.\.selectedSong\}\)\}>\s*\{menuDetalle\}\s*<\/FichaCabeceraMovil>\s*\) : \(\s*<div style=\{\{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14\}\}>\s*<button className="anc-btn anc-btn--quiet" onClick=\{\(\)=>setView\('list'\)\}>← Canciones<\/button>\s*\{menuDetalle\}\s*<\/div>\s*\)\}/)
    assert.equal((p.match(/const menuDetalle = /g) || []).length, 1, 'un solo menú «⋯»'); assert.ok(p.includes('const menuDetalle = selectedSong && ('), 'el menú existe en teléfono y en escritorio (sin condición de pantalla)'); assert.equal((p.match(/<MenuFlotante titulo=\{`Acciones para \$\{selectedSong\.nombre\}`\}/g) || []).length, 1)
    assert.ok(p.includes("import FichaCabeceraMovil from './FichaCabeceraMovil'")) })

  await prueba('barra de botones: «Editar» sale de ella SOLO en teléfono (ya está en la cabecera); Tipografía, «Editar con acordes» y Adjuntos siguen donde estaban', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /\{!telefono && <button className="anc-btn anc-btn--quiet" onClick=\{\(\)=>\{setEditing\(\{\.\.\.selectedSong\}\)\}\}>Editar<\/button>\}\n/); assert.ok(!/<\/button>\}\s+\{\/\*/.test(p), 'sin comentarios JSX en la misma línea (crearían nodos de texto y cambiarían el HTML del escritorio)')
    assert.ok(p.includes('<b>Aa</b>&nbsp;Tipografía') && p.includes('{TEXTOS_EDITOR.entrada}') && p.includes('TEXTOS_ADJUNTOS.botonConConteo(attachmentsCount)')) })

  await prueba('«Letra y acordes»: el título de la sección aparece solo en teléfono y solo si hay hoja con acordes o letra; la hoja no repite el título (se oculta por CSS) y LyricSheet y HojaAcordes no cambian', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /\{telefono && \(!!ficha\.hojaFicha\?\.hoja \|\| !!\(selectedSong\.letra\|\|''\)\.trim\(\)\) && <h2 className="anc-fichaSeccion">\{TEXTOS_CANCIONES_ADMIN\.fichaSeccionLetra\}<\/h2>\}/)
    assert.ok(p.includes("<div className={`anc-panel${telefono ? ' anc-fichaHoja' : ''}`} style={{marginBottom:16}}>"))
    let hayRango = cp.spawnSync('git', ['cat-file', '-e', 'cf09fde^{commit}'], { cwd: RAIZ }).status === 0
    if (hayRango) for (const f of ['components/canciones/LyricSheet.tsx', 'components/canciones/HojaAcordes.tsx', 'components/canciones/FichaConAcordes.tsx']) assert.equal(cp.spawnSync('git', ['diff', '--quiet', 'cf09fde', '--', f], { cwd: RAIZ }).status, 0, f + ' queda igual que en el paso 1') })

  await prueba('estilos: las reglas de la cabecera y del título viven DENTRO de la consulta de teléfono (el escritorio no cambia), con zona táctil de 44 y tokens --anc-*; el CSS general no las conoce', () => {
    const m = leer('app/songs-movil.css'), fin = m.lastIndexOf('}'), ini = m.indexOf('@media (max-width:768px){')
    for (const k of ['.anc-fichaCab{', '.anc-fichaCab__volver', '.anc-fichaCab__editar{', '.anc-fichaTit{', '.anc-fichaTit__portada{', '.anc-fichaTit__titulo{', '.anc-fichaTit__pastillas li{', '.anc-fichaHoja .anc-sTitle{ display:none; }', '.anc-fichaSeccion{']) { const i = m.indexOf(k); assert.ok(i > ini && i < fin, `${k} dentro de la consulta de teléfono`) }
    assert.match(m, /\.anc-fichaCab__volver, \.anc \.anc-fichaCab__editar\{[^}]*min-height:max\(44px, calc\(46px \* var\(--esc, 1\)\)\)/); assert.match(m, /\.anc-fichaTit__titulo\{[^}]*font-size:calc\(22px \* var\(--esc, 1\)\); font-weight:800/)
    assert.match(m, /\.anc-fichaTit__portada\{[^}]*width:calc\(76px \* var\(--esc, 1\)\); height:calc\(76px \* var\(--esc, 1\)\); border-radius:calc\(18px \* var\(--esc, 1\)\)/)
    const ficha = m.slice(m.indexOf('Ficha de la canción del administrador (paso 2')); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(ficha), 'solo tokens, sin colores sueltos'); assert.ok(!/anc-ficha(Cab|Tit|Hoja|Seccion)/.test(leer('app/songs.css'))) })

  await prueba('sin lo que no existe: ni «Agregar a servicio», ni «Transponer», ni «Usada … veces» en la ficha (están anotados como ideas futuras en PENDIENTES)', () => {
    const todo = leer('components/canciones/FichaCabeceraMovil.tsx') + leer('components/canciones/CancionesPanel.tsx') + leer('lib/textos/cancionesAdmin.ts')
    assert.ok(!/Agregar a servicio|Transponer|Usada \d|Usada \$/.test(todo)); const pend = leer('docs/PENDIENTES-code.md'); assert.ok(/Ficha del admin en teléfono[\s\S]*Agregar a servicio[\s\S]*Transponer[\s\S]*Usada N veces/.test(pend)) })
  terminar()
})
