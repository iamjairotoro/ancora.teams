// «Nueva canción» paso B: el editor de una canción nueva. La numeración y el alta de partes (lib/editorAcordes.ts: nombreSiguiente, agregarParte), el selector (tarjeta «Empieza por una parte» y hoja «Agregar parte»), la cabecera «‹ Datos», la edición de datos
// de una canción que ya existe y que el editor sin `nueva` no cambia. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')), P = require(path.join(RAIZ, 'lib/partesCancion.ts')), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), RS = require(path.join(RAIZ, 'lib/resumenGuardado.ts'))
const Sel = require(path.join(RAIZ, 'components/canciones/nueva/SelectorParte.tsx')), Editor = require(path.join(RAIZ, 'components/canciones/EditorCancionMovil.tsx')).default
const A = (g, cal = '') => ({ g, cal })
// agrega una parte y escribe una línea de letra debajo (como lo haría una persona)
const conParte = (doc, tipo, letra = 'línea de prueba') => { const r = E.agregarParte(doc, tipo); return E.cambiarTexto(r.doc, r.doc.texto + letra, r.doc.texto.length + letra.length).doc }
const nombres = d => E.estructura(d.texto).secciones.map(s => s.nombre)

correr(async () => {
  await prueba('numeración: el primer verso es «VERSO 1»; los demás tipos no llevan número la primera vez y luego van con el mayor + 1 (VERSO 3, CORO 2, PRE CORO 2, INTERLUDIO 2…)', () => {
    let d = E.docVacio(); assert.equal(E.nombreSiguiente(d, 'verso'), 'VERSO 1'); assert.equal(E.nombreSiguiente(d, 'coro'), 'CORO'); assert.equal(E.nombreSiguiente(d, 'precoro'), 'PRE CORO')
    for (const t of ['verso', 'precoro', 'coro', 'verso']) d = conParte(d, t)
    assert.deepEqual(nombres(d), ['VERSO 1', 'PRE CORO', 'CORO', 'VERSO 2'])
    assert.equal(E.nombreSiguiente(d, 'verso'), 'VERSO 3'); assert.equal(E.nombreSiguiente(d, 'coro'), 'CORO 2'); assert.equal(E.nombreSiguiente(d, 'precoro'), 'PRE CORO 2'); assert.equal(E.nombreSiguiente(d, 'puente'), 'PUENTE'); assert.equal(E.nombreSiguiente(d, 'final'), 'FINAL')
    d = conParte(d, 'coro'); d = conParte(d, 'coro'); assert.equal(E.nombreSiguiente(d, 'coro'), 'CORO 4', 'CORO, CORO 2, CORO 3 → CORO 4')
    d = conParte(d, 'interludio', '') ; assert.equal(E.nombreSiguiente(d, 'interludio'), 'INTERLUDIO 2'); d = conParte(d, 'interludio', ''); assert.deepEqual(nombres(d).slice(-2), ['INTERLUDIO', 'INTERLUDIO 2']) })

  await prueba('con partes que ya traen otro número (de una canción que se abrió): se sigue del mayor, no de la cuenta; «Verso» con huecos (1 y 3) da 4; sin número cuenta como 1', () => {
    const base = E.docVacio('VERSO 1:\nuno\n\nVERSO 3:\ntres\n\nCORO 2:\ndos\n\nPUENTE:\npuente')
    assert.equal(E.nombreSiguiente(base, 'verso'), 'VERSO 4'); assert.equal(E.nombreSiguiente(base, 'coro'), 'CORO 3'); assert.equal(E.nombreSiguiente(base, 'puente'), 'PUENTE 2')
    assert.equal(E.nombreSiguiente(E.docVacio('CORO (2x):\nletra'), 'coro'), 'CORO 2', 'lo de paréntesis no cuenta como número'); assert.equal(E.nombreSiguiente(E.docVacio('CORO 2 (2x):\nletra'), 'coro'), 'CORO 3', 'el número va antes del paréntesis') })

  await prueba('agregarParte agrega SIEMPRE al final y no toca lo anterior: el texto de antes queda igual como prefijo y los acordes siguen en su sitio', () => {
    const t0 = 'VERSO 1:\nAquí va la letra\n\nCORO:\nCuán grande es Él'
    let doc = E.docVacio(t0); doc = E.ponerAcorde(doc, 9, A(1)); doc = E.ponerAcorde(doc, 14, A(5)); doc = E.ponerAcorde(doc, t0.indexOf('Cuán') + 5, A(4))
    const ins = E.agregarSeccionInstrumental(doc); doc = E.ponerInterludio(ins.doc, ins.at, [{ acorde: A(4) }, { acorde: A(5) }])
    assert.equal(doc.anclas.length, 3); assert.equal(doc.interludios.length, 1)
    const r = E.agregarParte(doc, 'puente')
    assert.ok(r.doc.texto.startsWith(doc.texto)); assert.equal(r.doc.texto, doc.texto + '\n\nPUENTE:\n'); assert.deepEqual(r.doc.anclas, doc.anclas, 'los acordes siguen donde estaban'); assert.deepEqual(r.doc.interludios, doc.interludios); assert.equal(r.caret, r.doc.texto.length); assert.equal(r.nombre, 'PUENTE')
    const sinSalto = E.agregarParte(E.docVacio('VERSO 1:\nuna\n'), 'coro'); assert.equal(sinSalto.doc.texto, 'VERSO 1:\nuna\n\nCORO:\n', 'un solo salto de línea: se agrega la línea vacía que falta')
    assert.equal(E.agregarParte(E.docVacio('VERSO 1:\nuna\n\n'), 'coro').doc.texto, 'VERSO 1:\nuna\n\nCORO:\n', 'ya hay línea vacía: no se duplica') })

  await prueba('Interludio e Instrumental traen su «(instrumental)»; los demás tipos solo el encabezado, con el cursor al final listo para escribir', () => {
    for (const t of ['interludio', 'instrumental']) { const r = E.agregarParte(E.docVacio('VERSO 1:\nuna'), t); assert.ok(r.doc.texto.endsWith(`${r.nombre}:\n(instrumental)\n`), t); assert.equal(r.caret, r.doc.texto.length) }
    for (const t of ['verso', 'precoro', 'coro', 'puente', 'tag', 'final']) { const r = E.agregarParte(E.docVacio('VERSO 1:\nuna'), t); assert.ok(r.doc.texto.endsWith(`${r.nombre}:\n`) && !r.doc.texto.includes('(instrumental)'), t) } })

  await prueba('un encabezado que quedó SIN letra (recién agregado) se reemplaza por la parte nueva: no queda suelto ni vuelve «letra»', () => {
    let d = conParte(E.docVacio(), 'verso'); d = E.agregarParte(d, 'coro').doc          // «CORO:» sin letra
    const r = E.agregarParte(d, 'puente'); assert.ok(r.doc.texto.endsWith('PUENTE:\n') && !r.doc.texto.includes('CORO'), 'el CORO vacío se cambió por el PUENTE')
    assert.deepEqual(nombres(conParte(r.doc, 'puente')), ['VERSO 1', 'PUENTE'])
    const solo = E.agregarParte(E.agregarParte(E.docVacio(), 'verso').doc, 'coro'); assert.equal(solo.doc.texto, 'CORO:\n', 'sobre un documento con solo un encabezado vacío, lo reemplaza')
    const conGrito = E.agregarParte(E.docVacio('VERSO 1:\nALELUYA'), 'coro'); assert.ok(conGrito.doc.texto.startsWith('VERSO 1:\nALELUYA\n\nCORO:'), 'una línea de letra que PARECE encabezado («ALELUYA») dentro de una parte con letra no se borra')
    assert.equal(E.nombreSiguiente(E.agregarParte(E.docVacio(), 'verso').doc, 'verso'), 'VERSO 1', 'el nombre que ofrece el selector cuenta ese reemplazo') })

  await prueba('límite: 40 partes (el mismo de la ruta de guardado); con 40 ya no agrega (null)', () => {
    assert.equal(E.MAX_SECCIONES, G.LIMITES.secciones); let d = E.docVacio()
    for (let i = 0; i < 40; i++) d = conParte(d, 'coro')
    assert.equal(E.estructura(d.texto).secciones.length, 40); assert.equal(E.agregarParte(d, 'coro'), null); assert.equal(E.agregarParte(d, 'verso'), null) })

  await prueba('lo que se arma con agregarParte se puede guardar: las secciones pasan la validación de la ruta, con códigos únicos', () => {
    let d = E.docVacio(); for (const t of ['verso', 'precoro', 'coro', 'verso', 'coro', 'puente', 'interludio', 'instrumental', 'tag', 'final']) d = conParte(d, t, t === 'interludio' || t === 'instrumental' ? '' : 'letra de prueba')
    const sec = E.aSecciones(d), codigos = sec.map(s => s.codigo); assert.equal(new Set(codigos).size, codigos.length, codigos.join(' '))
    const v = G.validarCuerpo({ songId: '11111111-1111-4111-8111-111111111111', tono: 'F', letra: d.texto, secciones: sec, base: 'a'.repeat(32) }); assert.equal(v.ok, true, JSON.stringify(v))
    assert.equal(sec.length, 10); assert.ok(codigos.includes('V2') && codigos.includes('C2') && codigos.includes('INT') && codigos.includes('Inst') && codigos.includes('Tg') && codigos.includes('F'))
    const pc2 = E.aSecciones(conParte(conParte(conParte(E.docVacio(), 'precoro'), 'precoro'), 'coro')); assert.equal(pc2[1].nombre, 'PRE CORO 2'); assert.equal(pc2[1].codigo, 'PC-2', 'el código de «PRE CORO 2» queda como está (decisión de Claudia)') })

  await prueba('la tira lee bien lo que se agrega: abreviatura y color por nombre (V3, Pc2, C2, Bd, It, Is, Tg, E)', () => {
    const esperado = { 'VERSO 3': ['v', 'V3'], 'PRE CORO 2': ['pc', 'Pc2'], 'CORO 2': ['c', 'C2'], PUENTE: ['bd', 'Bd'], INTERLUDIO: ['it', 'It'], INSTRUMENTAL: ['is', 'Is'], TAG: ['tg', 'Tg'], FINAL: ['e', 'E'] }
    for (const [n, [clave, abrev]] of Object.entries(esperado)) assert.deepEqual(P.parteDe('', n), { clave, abrev }, n) })

  await prueba('selector: tarjeta «Empieza por una parte» con los ocho tipos y su círculo de color; la hoja «Agregar parte» dice qué hay y ofrece el número que recibiría cada tipo', () => {
    const vacio = R(h(Sel.TarjetaEmpieza, { doc: E.docVacio(), onElegir() {} }))
    assert.ok(vacio.includes('Empieza por una parte') && vacio.includes('Elige el tipo y escribe su letra')); assert.equal((vacio.match(/<button/g) || []).length, 8)
    for (const n of ['Verso 1', 'Pre-coro', 'Coro', 'Puente', 'Interludio', 'Instrumental', 'Tag', 'Final']) assert.ok(vacio.includes(`>${n}</span>`), n)
    for (const k of ['v', 'pc', 'c', 'bd', 'it', 'is', 'tg', 'e']) assert.ok(vacio.includes(`data-parte="${k}"`), k)
    const doc = E.docVacio('VERSO 1:\na\n\nPRE CORO:\nb\n\nCORO:\nc\n\nVERSO 2:\nd'), hoja = R(h(Sel.HojaAgregarParte, { doc, reusables: [], onReusar() {}, onElegir() {}, onCerrar() {} }))
    assert.ok(hoja.includes('role="dialog"') && hoja.includes('aria-label="Agregar a la estructura"') && hoja.includes('Parte nueva') && hoja.includes('aria-label="Cerrar"'), 'la hoja de S4: sin partes que reusar solo sale «Parte nueva»')
    for (const n of ['Verso 3', 'Pre-coro 2', 'Coro 2', 'Puente', 'Interludio', 'Instrumental', 'Tag', 'Final']) assert.ok(hoja.includes(`>${n}</span>`), n)
    assert.equal(Sel.etiquetaDeParte('PRE CORO 2'), 'Pre-coro 2') })

  await prueba('editor: con `nueva` la cabecera es «‹ Datos» (no «Cancelar»); sin `nueva` es el de siempre; lo que se dibuja mientras carga no cambia', () => {
    const base = { songId: '11111111-1111-4111-8111-111111111111', titulo: 'Canción de prueba', onCerrar() {}, onGuardado() {} }
    const sin = R(h(Editor, base)), con = R(h(Editor, { ...base, nueva: { bpm: 72, onDatos() {} } }))
    assert.ok(sin.includes('‹ Cancelar') && !sin.includes('‹ Datos') && !sin.includes('Editar datos')); assert.ok(con.includes('‹ Datos') && !con.includes('‹ Cancelar'))
    assert.equal(sin.replace(/\s+/g, ' '), R(h(Editor, base)).replace(/\s+/g, ' '), 'estable'); assert.ok(con.includes('Guardar') && con.includes('disabled')) })

  await prueba('código del editor: `nueva` es opcional y solo agrega; sin ella salir ES onCerrar; Guardar queda desactivado con el documento vacío; no hay escrituras nuevas (solo las dos peticiones de siempre)', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /nueva\?: \{ bpm: number \| null; tono\?: string \| null; onDatos: \(\) => void \}/); assert.match(f, /const salir = nueva \? nueva\.onDatos : onCerrar/); assert.match(f, /const vacioNueva = !!nueva && !doc\.texto\.trim\(\)/)
    assert.match(f, /disabled=\{estado !== 'listo' \|\| guardando \|\| vacioNueva\}/); assert.match(f, /onClick=\{salir\}>\{T\.descartarSi\}/)
    assert.match(f, /const r = agregarParte\(doc, tipo\)\s*\n\s*setAgregando\(false\)\s*\n\s*if \(!r\) \{ setError\(TEXTOS_NUEVA\.limiteSecciones\); return \}\s*\n\s*setHist\(h => registrar\(h, r\.doc\)\); setQuitados\(null\); setError\(null\); setModo\('texto'\)/, 'elegir una parte: la agrega al historial (Deshacer la quita), avisa el límite y pasa al texto')
    assert.equal((f.match(/fetch\(/g) || []).length, 2, 'solo leer y guardar'); assert.ok(!/supabase/.test(f))
    assert.match(f, /vacioNueva \? <TarjetaEmpieza doc=\{doc\} onElegir=\{elegirParte\} \/> : <>/); assert.match(f, /\{!vacioNueva && estado === 'listo' && \(\s*\n\s*<div className=\{ui\.herr\}>/) })

  await prueba('primer guardado de una canción nueva: no pide el resumen («no hay nada que pisar»); con contenido guardado sí', () => {
    const vacia = { secciones: [], arreglo: [], letra: '' }; const r = RS.resumenDeCambios(vacia, { letra: 'VERSO 1:\nuna', secciones: [{ nombre: 'VERSO 1', codigo: 'V1' }] })
    assert.equal(r.hayContenido, false); assert.deepEqual(r.afectadas, [])
    assert.equal(RS.resumenDeCambios({ secciones: [{ id: 'a', codigo: 'V1', nombre: 'VERSO 1' }], arreglo: [], letra: 'x' }, { letra: 'y', secciones: [] }).hayContenido, true) })

  await prueba('«‹ Datos»: reabre la ventana de datos de la canción que ya existe; sus botones ACTUALIZAN solo los campos de datos (nunca la letra ni publicada) y nunca crean otra canción', () => {
    const cancion = { id: 's1', nombre: 'Canción de prueba', artista: 'Grupo Inventado', tono_original: 'F', bpm: 72, compas: '4/4', duracion_min: 419, autor: 'Autor Inventado', traductor: null, ccli: '000', copyright: null, link_spotify: null, link_letras: null, link_recursos: null, notas: 'n', caratula_url: null, original_title: null }
    const d = N.datosDesdeCancion(cancion); assert.equal(d.tono, 'F'); assert.equal(d.bpm, '72'); assert.equal(d.duracion, '6:59'); assert.equal(d.traductor, ''); assert.equal(d.autor, 'Autor Inventado')
    const p = N.payloadDatos(d); assert.ok(!('letra' in p) && !('publicada' in p), 'ni letra ni publicada'); assert.equal(p.tono_original, 'F'); assert.equal(p.bpm, 72); assert.equal(p.duracion_min, 419); assert.equal(p.traductor, null)
    assert.deepEqual(N.payloadNueva(d), { ...p, letra: null, publicada: false }, 'crear = los mismos datos + sin letra + borrador')
    assert.equal(N.subtituloEditor('F', 72), 'Tono F · 72 bpm · Editar datos'); assert.equal(N.subtituloEditor('', null), 'Editar datos'); assert.equal(N.subtituloEditor('Am', 0), 'Tono Am · Editar datos')
    const v = leer('components/canciones/NuevaCancionMovil.tsx'); assert.match(v, /cancion\s*\n?\s*\? await supabase\.from\('songs'\)\.update\(payloadDatos\(d\)\)\.eq\('id', cancion\.id\)\.select\('\*'\)\.single\(\)\s*\n\s*: await supabase\.from\('songs'\)\.insert\(payloadNueva\(d\)\)/)
    const pn = leer('components/canciones/CancionesPanel.tsx')
    assert.match(pn, /const abrirEditorAcordes = \(c: Song\) => \{ setEditorAcordes\(c\); setEditorNueva\(esBorrador\(c\) && !\(c\.letra \|\| ''\)\.trim\(\)\) \}/, 'la versión «nueva» solo para un borrador sin letra')
    assert.match(pn, /onDatos: \(\) => \{ setDatosDe\(editorAcordes\); cerrarEditorAcordes\(\) \}/); assert.match(pn, /\{datosDe && <NuevaCancionMovil cancion=\{datosDe\}/) })
  terminar()
})
