// Admin móvil, paso 3: el aviso de «Borrador» con «Publicar» y el estado vacío de la ficha del administrador en teléfono, según el tablero «Ficha admin · Borrador y estado vacío». Mismas acciones de siempre:
// «Publicar» = publicarBorrador, «Agregar letra» = la acción de agregar letra de la ficha, «Subir archivos» = la pantalla de Adjuntos. El escritorio conserva sus textos y su sitio. Datos inventados; sin red.
// Correr: `node tests/portal/admin-movil-ficha-vacia.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), cp = require('child_process'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const Borrador = require(path.join(RAIZ, 'components/canciones/FichaBorrador.tsx')).default, Vacia = require(path.join(RAIZ, 'components/canciones/FichaVacia.tsx')).default
const T = require(path.join(RAIZ, 'lib/textos/cancionesAdmin.ts')).TEXTOS_CANCIONES_ADMIN, N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')).TEXTOS_NUEVA

correr(async () => {
  await prueba('aviso de Borrador: ícono oculto, «Borrador», «Los músicos aún no la ven.» y, para quien administra, «Publicar» (un botón de verdad)', () => {
    const m = R(h(Borrador, { onPublicar() {}, publicando: false, error: null }))
    assert.ok(m.includes('role="status"') && m.includes('data-ficha="borrador"') && m.includes('aria-hidden="true"') && m.includes('<b>Borrador</b>') && m.includes('<span>Los músicos aún no la ven.</span>'))
    assert.match(m, /<button type="button" class="anc-fichaBorr__publicar">Publicar<\/button>/); assert.equal(T.fichaBorradorAyuda, 'Los músicos aún no la ven.') })

  await prueba('«Publicar» en curso: dice «Publicando…» y se apaga; el error sale debajo con role=alert; sin permiso de administrar no hay botón', () => {
    const en = R(h(Borrador, { onPublicar() {}, publicando: true, error: null })); assert.match(en, /<button type="button" class="anc-fichaBorr__publicar" disabled="">Publicando…<\/button>/)
    const err = R(h(Borrador, { onPublicar() {}, publicando: false, error: N.errorPublicar })); assert.ok(err.includes(`<p class="anc-fichaBorr__error" role="alert">${N.errorPublicar}</p>`))
    const sin = R(h(Borrador, { publicando: false, error: null })); assert.ok(!sin.includes('<button') && sin.includes('Borrador')) })

  await prueba('estado vacío: el título, qué hacer, «Agregar letra» y «Subir archivos» (en ese orden); sin permiso de administrar, solo el texto', () => {
    const m = R(h(Vacia, { puedeEditar: true, onAgregarLetra() {}, onSubirArchivos() {} }))
    assert.ok(m.includes('data-ficha="vacia"') && m.includes('<p class="anc-fichaVacia__titulo">Esta canción todavía no tiene letra</p>') && m.includes('Escribe la letra con sus acordes, o sube un archivo para que los músicos la vean.'))
    assert.ok(m.indexOf('Agregar letra') > 0 && m.indexOf('Agregar letra') < m.indexOf('Subir archivos'))
    assert.match(m, /<button type="button" class="anc-fichaVacia__letra">Agregar letra<\/button><button type="button" class="anc-fichaVacia__archivos">Subir archivos<\/button>/)
    const sin = R(h(Vacia, { puedeEditar: false, onAgregarLetra() {}, onSubirArchivos() {} })); assert.ok(!sin.includes('<button') && sin.includes('todavía no tiene letra')) })

  await prueba('los dos componentes solo dibujan y reenvían: sin fetch, sin supabase ni almacenamiento; cada botón llama a lo que recibe', () => {
    for (const f of ['components/canciones/FichaBorrador.tsx', 'components/canciones/FichaVacia.tsx']) assert.ok(!/fetch\(|supabase|localStorage|sessionStorage/.test(leer(f).replace(/\/\/.*$/gm, '')), f)
    assert.match(leer('components/canciones/FichaBorrador.tsx'), /className="anc-fichaBorr__publicar" onClick=\{onPublicar\} disabled=\{publicando\}/)
    const v = leer('components/canciones/FichaVacia.tsx'); assert.match(v, /className="anc-fichaVacia__letra" onClick=\{onAgregarLetra\}/); assert.match(v, /className="anc-fichaVacia__archivos" onClick=\{onSubirArchivos\}/) })

  await prueba('ficha: en teléfono el aviso de Borrador va bajo el título y el escritorio lo conserva donde estaba (con sus textos de siempre); «Publicar» solo para administradores y hace lo de siempre', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /\{telefono && esBorrador\(selectedSong\) && <FichaBorrador onPublicar=\{isAdmin \? \(\)=>publicarBorrador\(selectedSong\.id\) : undefined\} publicando=\{publicando\} error=\{errPublicar\} \/>\}/)
    assert.ok(p.indexOf('<FichaBorrador') < p.indexOf('{/* Barra: Aa (tipografía)'), 'bajo el título, antes de la barra')
    assert.ok(p.includes('{!telefono && esBorrador(selectedSong) && (') && p.includes('{TEXTOS_NUEVA.borradorAyuda}') && p.includes('onClick={()=>publicarBorrador(selectedSong.id)} disabled={publicando}'), 'escritorio: el aviso de siempre')
    assert.equal(N.borradorAyuda, 'Borrador: los músicos aún no la ven y no se ofrece en los setlists.', 'el texto del escritorio no cambia') })

  await prueba('ficha: el estado vacío del teléfono sale cuando no hay hoja con acordes ni letra y la ruta ya respondió; «Agregar letra» = la acción de siempre (abrir la edición) y «Subir archivos» = la pantalla de Adjuntos (la misma del botón «Adjuntos»)', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /telefono && !\(selectedSong\.letra\|\|''\)\.trim\(\) \? \(\s*<FichaVacia puedeEditar=\{!!isAdmin\} onAgregarLetra=\{\(\)=>setEditing\(\{\.\.\.selectedSong\}\)\} onSubirArchivos=\{\(\)=>setAttachmentsFor\(selectedSong\)\} \/>/)
    assert.ok(p.includes('isAdmin={isAdmin} onAddLyrics={()=>setEditing({...selectedSong})}'), 'LyricSheet conserva su acción de siempre'); assert.ok(p.includes('onClick={()=>setAttachmentsFor(selectedSong)}'), 'el botón «Adjuntos» sigue abriendo la misma pantalla')
    assert.ok(p.includes("import FichaVacia from './FichaVacia'") && p.includes("import FichaBorrador from './FichaBorrador'")) })

  await prueba('estilos: lo nuevo vive DENTRO de la consulta de teléfono, solo con tokens; «Publicar» y «Agregar letra» miden 44 o más; la cabecera usa píldora y círculo y el título las medidas del tablero (76, 22/800)', () => {
    const m = leer('app/songs-movil.css'), fin = m.lastIndexOf('}'), ini = m.indexOf('@media (max-width:768px){')
    for (const k of ['.anc-fichaBorr{', '.anc-fichaBorr__publicar{', '.anc-fichaBorr__error{', '.anc-fichaVacia{', '.anc-fichaVacia__letra{', '.anc-fichaVacia__archivos{', '.anc-panel:has(> .anc-fichaVacia)']) { const i = m.indexOf(k); assert.ok(i > ini && i < fin, `${k} dentro de la consulta de teléfono`) }
    const nuevo = m.slice(m.indexOf('Borrador y estado vacío de la ficha (paso 3')); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(nuevo), 'sin colores sueltos'); assert.ok(/var\(--anc-campo-foco\)/.test(nuevo) && /var\(--anc-on-accent\)/.test(nuevo))
    assert.match(m, /\.anc-fichaBorr__publicar\{[^}]*min-height:max\(44px, calc\(38px \* var\(--esc, 1\)\)\)/); assert.match(m, /\.anc-fichaVacia__letra\{[^}]*min-height:max\(44px, calc\(52px \* var\(--esc, 1\)\)\)/); assert.match(m, /\.anc-fichaVacia__archivos\{[^}]*min-height:max\(44px, calc\(48px \* var\(--esc, 1\)\)\)/)
    assert.match(m, /\.anc-fichaCab__editar\{[^}]*border-radius:999px; background:var\(--anc-sunk\)/); assert.match(m, /\.anc-fichaCab__der \.anc-rowMore\{[^}]*border-radius:50%; background:var\(--anc-sunk\)/)
    assert.ok(!/anc-ficha(Borr|Vacia)/.test(leer('app/songs.css')), 'el CSS general no los conoce') })

  await prueba('lo que no cambia: LyricSheet, HojaAcordes y FichaConAcordes siguen como en el paso 2 (y por tanto la lectura del músico)', () => {
    if (cp.spawnSync('git', ['cat-file', '-e', 'b5478d0^{commit}'], { cwd: RAIZ }).status !== 0) return
    for (const f of ['components/canciones/LyricSheet.tsx', 'components/canciones/HojaAcordes.tsx', 'components/canciones/FichaConAcordes.tsx']) assert.equal(cp.spawnSync('git', ['diff', '--quiet', 'b5478d0', '--', f], { cwd: RAIZ }).status, 0, f) })
  terminar()
})
