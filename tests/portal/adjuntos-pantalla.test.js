// Adjuntos en su propia pantalla («Adjuntos – <canción>»): la pantalla compartida, el estado vacío, la lista del músico, el clip siempre visible, el botón de la pantalla de letra y la ficha del administrador sin el bloque de abajo.
// Datos inventados; sin red. Correr: `node tests/portal/adjuntos-pantalla.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const Pantalla = require(path.join(RAIZ, 'components/adjuntos/PantallaAdjuntos.tsx')), T = require(path.join(RAIZ, 'lib/textos/pantallaAdjuntos.ts')).TEXTOS_ADJUNTOS
const Adjuntos = require(path.join(RAIZ, 'app/portal/_components/AdjuntosCancion.tsx')).default
const FILA = { id: 'a1', nombre: 'Partitura de prueba.pdf', tamano: 120000, subidoPor: 'Ana', fecha: '2026-10-01T10:00:00Z' }

correr(async () => {
  await prueba('la pantalla: diálogo con el nombre «Adjuntos – <canción>», flecha de volver con nombre accesible y el contenido que se le pone', () => {
    const html = R(h(Pantalla.default, { nombre: 'Canción de prueba', onVolver() {} }, h('p', null, 'contenido')))
    assert.ok(html.includes('role="dialog"') && html.includes('aria-modal="true"') && html.includes('aria-label="Adjuntos – Canción de prueba"'))
    assert.ok(html.includes('aria-label="Volver"') && html.includes('<h2') && html.includes('Adjuntos – Canción de prueba</h2>') && html.includes('<p>contenido</p>'))
    assert.equal(T.titulo('X'), 'Adjuntos – X', 'raya «–» como en el diseño') })

  await prueba('capa: por defecto no fija z-index en línea (vale el de la hoja de estilos, 27); con `capa` lo fija (la ficha del administrador usa 52)', () => {
    assert.ok(!R(h(Pantalla.default, { nombre: 'X', onVolver() {} }, null)).includes('z-index')); assert.ok(R(h(Pantalla.default, { nombre: 'X', onVolver() {}, capa: 52 }, null)).includes('z-index:52')) })

  await prueba('estado vacío: «Aún no hay archivos» siempre; «Sube archivos para comenzar» SOLO donde se puede subir', () => {
    const sin = R(h(Pantalla.AdjuntosVacio, { puedeSubir: false })), con = R(h(Pantalla.AdjuntosVacio, { puedeSubir: true }))
    assert.ok(sin.includes('Aún no hay archivos') && !sin.includes('Sube archivos para comenzar')); assert.ok(con.includes('Aún no hay archivos') && con.includes('Sube archivos para comenzar')); assert.ok(sin.includes('role="status"')) })

  await prueba('lista del músico: sin archivos muestra el vacío (sin invitar a subir); con archivos, la fila con «Ver»; ya no lleva su propio encabezado «Adjuntos» ni «ACORDES Y PARTITURAS»; el error de carga se avisa', () => {
    const base = { token: null, songId: 's1' }
    const v = R(h(Adjuntos, { ...base, adjuntos: [] })); assert.ok(v.includes('Aún no hay archivos') && !v.includes('Sube archivos') && !v.includes('<h3') && !v.includes('ACORDES Y PARTITURAS'))
    const l = R(h(Adjuntos, { ...base, adjuntos: [FILA] })); assert.ok(l.includes('Partitura de prueba.pdf') && l.includes('aria-label="Ver Partitura de prueba.pdf"') && !l.includes('Aún no hay archivos'))
    const e = R(h(Adjuntos, { ...base, adjuntos: [], errorLista: true })); assert.ok(e.includes('role="alert"') && e.includes('No se pudieron cargar los adjuntos') && !e.includes('Aún no hay archivos'), 'con error no se afirma «no hay»') })

  await prueba('músico: la sección de abajo se quitó (ni `adjuntos-cancion` ni la lista dentro de la canción); la pantalla se abre con el clip y con «Adjuntos · N» de la pantalla de letra; se cierra al cambiar de canción; el visor queda por encima', () => {
    const c = leer('app/portal/_components/CancionPortal.tsx')
    assert.ok(!c.includes('adjuntos-cancion') && !c.includes('scrollIntoView'), 'sin la sección de abajo ni el desplazamiento del clip')
    assert.match(c, /onAdjuntos=\{\(\) => setAdjAbiertos\(true\)\}/); assert.match(c, /<PantallaAdjuntos nombre=\{song\.nombre\} onVolver=\{\(\) => setAdjAbiertos\(false\)\}>\s*<AdjuntosCancion/)
    assert.match(c, /onClick=\{\(\) => setAdjAbiertos\(true\)\} aria-haspopup="dialog">[\s\S]*TEXTOS_ADJUNTOS\.botonConConteo\(adjuntos\.length\) : TEXTOS_ADJUNTOS\.boton/); assert.match(c, /setAdjAbiertos\(false\); cargarHoja\(\)/)
    assert.ok(c.includes("{estado === 'listo' && adjAbiertos && ("), 'la pantalla se dibuja cuando está abierta'); assert.equal((c.match(/<AdjuntosCancion/g) || []).length, 1, 'una sola instancia, dentro de la pantalla')
    const z = n => Number((leer('components/adjuntos/pantalla-adjuntos.module.css').match(/\.velo\{[^}]*z-index:(\d+)/) || [])[1]), pdf = Number((leer('app/globals.css').match(/--z-pdf:\s*(\d+)/) || [])[1]), nav = Number((leer('app/globals.css').match(/--z-nav:\s*(\d+)/) || [])[1])
    assert.ok(z() > nav && z() < pdf, `la pantalla (${z()}) queda sobre el menú (${nav}) y bajo el visor de PDF (${pdf})`) })

  await prueba('administración: «Adjuntos · N» abre la misma pantalla con la lista y la subida de siempre; el bloque fijo de abajo ya no existe; el conteo se lee con una consulta de SOLO conteo', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.ok(!p.includes('<h2>Adjuntos</h2>') && !p.includes('AttachmentsModal') && !p.includes('anc-adjModal'), 'sin el bloque fijo ni la ventana de antes')
    assert.equal((p.match(/<AttachmentsList /g) || []).length, 1, 'una sola lista, dentro de la pantalla'); assert.match(p, /<PantallaAdjuntos capa=\{52\} nombre=\{attachmentsFor\.nombre\} onVolver=\{\(\) => setAttachmentsFor\(null\)\}>\s*<AttachmentsList song=\{attachmentsFor\}/)
    assert.match(p, /from\('song_attachments'\)\.select\('id', \{ count: 'exact', head: true \}\)\.eq\('song_id', selectedId\)/); assert.match(p, /\}, \[selectedId, attachmentsRefreshToken\]\)/, 'se relee al cambiar de canción y tras subir o borrar')
    assert.match(p, /<AdjuntosVacio puedeSubir=\{!!isAdmin\} \/>/); assert.match(p, /TEXTOS_ADJUNTOS\.botonConConteo\(attachmentsCount\) : TEXTOS_ADJUNTOS\.boton/) })

  await prueba('almacenamiento, permisos y esquema NO cambian: la subida, la firma, el borrado y el alta de enlaces siguen como estaban', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    for (const k of ["supabase.storage.from(bucket).createSignedUrl(it.url, it.kind === 'audio' ? TTL_FIRMA_AUDIO_SEG : TTL_FIRMA_PDF_SEG)", "await supabase.from('song_attachments').insert({ song_id: song.id, kind:'link', url: url.trim(), filename: label, uploaded_by: memberId })", "await supabase.from('song_attachments').delete().eq('id', id)", "await supabase.storage.from(bucket).remove([it.url])"]) assert.ok(p.includes(k), k.slice(0, 60))
    const a = leer('app/portal/_components/AdjuntosCancion.tsx'); assert.ok(a.includes('firmarAdjunto(token, songId, adjuntoId)') && a.includes('pesaDemasiado(a.tamano)'))
    assert.ok(!/\.insert\(|\.delete\(|\.update\(|storage/.test(leer('components/adjuntos/PantallaAdjuntos.tsx')), 'la pantalla compartida no escribe nada') })
  terminar()
})
