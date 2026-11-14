// Estructura de «Nueva canción», paso S6-A: «Eliminar sección». Pide confirmar («¿Eliminar «Coro»?» / «Se borra su letra y sus acordes, y sus 3 apariciones en la estructura. Puedes deshacerlo antes de guardar.»); al confirmar borra el texto de la sección y TODAS sus referencias
// en la estructura, y las demás referencias mantienen su lugar (aunque cambie la clave de las partes que se llaman igual). Deshacer y Rehacer restauran también la estructura. Con arreglo propio sigue apagado. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), S = require(path.join(RAIZ, 'lib/estructuraCancion.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')), Menu = require(path.join(RAIZ, 'components/canciones/nueva/MenuParte.tsx')).default

const TEXTO = 'VERSO 1:\nlínea uno\n\nCORO:\nlínea del coro\n\nVERSO 2:\nlínea dos\n\nCORO:\notro coro igual de nombre\n\nPUENTE:\nlínea del puente'
const doc = E.docVacio(TEXTO), nombresDe = d => E.partesDeDocumento(d.texto).map(p => p.nombre)
const NOMBRES = nombresDe(doc), K = S.clavesDeLasPartes(NOMBRES)       // VERSO 1#0, CORO#0, VERSO 2#0, CORO#1, PUENTE#0
const base = { parte: { abrev: 'C', clave: 'c', nombre: 'CORO', repeat: 1 }, lugar: 2, total: 5, apariciones: 2, puedeRepetir: true, puedeQuitar: true, puedeIzquierda: true, puedeDerecha: true, bloqueado: false, onRepetirAqui() {}, onMover() {}, onQuitar() {}, onEliminar() {}, onCerrar() {} }
const menu = (o = {}) => R(h(Menu, { ...base, ...o }))

correr(async () => {
  await prueba('remapear + mapaBorrar: al borrar la parte k sus referencias se van y las que venían después suben un lugar; lo que ya no existía se suelta', () => {
    const antes = ['VERSO 1', 'CORO', 'VERSO 2', 'CORO', 'PUENTE'], despues = ['VERSO 1', 'VERSO 2', 'CORO', 'PUENTE']
    const est = [K[0], K[1], K[2], K[3], K[1], K[4], K[3]]
    assert.deepEqual(S.remapear(est, antes, despues, S.mapaBorrar(1)), ['VERSO 1#0', 'VERSO 2#0', 'CORO#0', 'PUENTE#0', 'CORO#0'], 'sin las dos referencias al primer coro; las del segundo coro pasan a ser «CORO#0»')
    assert.deepEqual(S.remapear(['FANTASMA#0', K[0]], antes, despues, S.mapaBorrar(1)), ['VERSO 1#0'], 'una clave que no existía se suelta')
    assert.deepEqual(S.remapear([K[0]], ['VERSO 1'], [], S.mapaBorrar(0)), [], 'la única parte: no queda nada')
    assert.deepEqual([0, 1, 2, 3].map(S.mapaBorrar(1)), [0, null, 1, 2]); assert.deepEqual([0, 1, 2].map(S.mapaIgual), [0, 1, 2])
    assert.deepEqual(S.remapear([K[0]], antes, despues, () => 99), [], 'un índice fuera de rango se suelta'); assert.deepEqual(S.remapear([K[0]], antes, despues, () => -1), []); assert.deepEqual(S.remapear([K[0]], antes, despues, () => 1.5), [])
    const e = Object.freeze([K[0], K[1]]); S.remapear(e, antes, despues, S.mapaBorrar(1)) })

  await prueba('eliminarSeccion (con el texto real): el texto pierde esa sección (encabezado, letra y acordes) y la estructura pierde TODAS sus apariciones; las demás mantienen su lugar', () => {
    const est = [K[0], K[1], K[2], K[1], K[3], K[4], K[1]]          // V1 C V2 C C2 P C
    const r = S.eliminarSeccion(doc, est, 2)                         // se elimina VERSO 2
    assert.ok(r && !r.doc.texto.includes('VERSO 2') && !r.doc.texto.includes('línea dos') && r.doc.texto.includes('línea uno') && r.doc.texto.includes('línea del puente'))
    assert.deepEqual(r.nombres, ['VERSO 1', 'CORO', 'CORO', 'PUENTE']); assert.deepEqual(r.estructura, ['VERSO 1#0', 'CORO#0', 'CORO#0', 'CORO#1', 'PUENTE#0', 'CORO#0'], 'sin V2; los coros siguen donde estaban')
    assert.equal(S.aparicionesDe(r.estructura, 'VERSO 2#0'), 0) })

  await prueba('con dos partes del mismo nombre: borrar la PRIMERA no confunde las referencias (las del segundo coro pasan a «CORO#0» y siguen en su lugar)', () => {
    const est = [K[0], K[1], K[2], K[3], K[3], K[4]]                 // V1 C V2 C2 C2 P
    const r = S.eliminarSeccion(doc, est, 1)                         // se elimina el PRIMER coro
    assert.deepEqual(r.nombres, ['VERSO 1', 'VERSO 2', 'CORO', 'PUENTE']); assert.deepEqual(r.estructura, ['VERSO 1#0', 'VERSO 2#0', 'CORO#0', 'CORO#0', 'PUENTE#0'])
    assert.ok(r.doc.texto.includes('otro coro igual de nombre') && !r.doc.texto.includes('línea del coro'), 'se fue la letra del primero y quedó la del segundo')
    const r2 = S.eliminarSeccion(doc, est, 3)                        // se elimina el SEGUNDO coro
    assert.deepEqual(r2.estructura, ['VERSO 1#0', 'CORO#0', 'VERSO 2#0', 'PUENTE#0']) })

  await prueba('la estructura por defecto que queda tras eliminar es la de por defecto de los nombres nuevos (no se guarda como propia); eliminar la única parte deja el texto y la estructura vacíos; una sección que no existe → null', () => {
    const solo = S.eliminarSeccion(E.docVacio(TEXTO), S.estructuraPorDefecto(NOMBRES), 4)
    assert.ok(S.esPorDefecto(solo.estructura, solo.nombres)); assert.equal(solo.nombres.length, 4)
    const unica = S.eliminarSeccion(E.docVacio('VERSO 1:\nuna línea'), ['VERSO 1#0'], 0); assert.ok(unica && unica.doc.texto.trim() === '' && unica.estructura.length === 0 && unica.nombres.length === 0)
    assert.equal(S.eliminarSeccion(doc, [K[0]], 9), null); assert.equal(S.eliminarSeccion(doc, [K[0]], -1), null) })

  await prueba('eliminar cuenta lo que se llevó (acordes) para avisarlo y poder deshacer; el documento original no se modifica', () => {
    const ant = JSON.stringify(doc), r = S.eliminarSeccion(doc, [K[0], K[1]], 1); assert.equal(JSON.stringify(doc), ant, 'inmutable'); assert.deepEqual(Object.keys(r.quitados).sort(), ['acordes', 'interludios']) })

  await prueba('textos del diálogo, los de Claudia: «¿Eliminar «CORO»?», «Se borra su letra y sus acordes, y sus 3 apariciones en la estructura.» (con 1: «y su única aparición en la estructura.») y «Puedes deshacerlo antes de guardar.»; botones «Eliminar» y «Cancelar»', () => {
    const T = N.TEXTOS_NUEVA
    assert.equal(T.eliminarTitulo('CORO'), '¿Eliminar «CORO»?'); assert.equal(T.eliminarCuerpo(3), 'Se borra su letra y sus acordes, y sus 3 apariciones en la estructura.'); assert.equal(T.eliminarCuerpo(1), 'Se borra su letra y sus acordes, y su única aparición en la estructura.')
    assert.equal(T.eliminarDeshacer, 'Puedes deshacerlo antes de guardar.'); assert.equal(T.eliminarBoton, 'Eliminar'); assert.equal(T.eliminarCancelar, 'Cancelar') })

  await prueba('el editor: «Eliminar» abre el diálogo (no borra de una); Cancelar no cambia nada; Eliminar borra el texto y las referencias, avisa lo quitado y entra al historial; el aviso «Puedes deshacerlo» solo está porque Deshacer también restaura la estructura', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const pedirEliminar = \(k: number\) => \{ const i = parteDeReferencia\(pasos, nombresPartes, k\); setMenuPaso\(null\); if \(i < 0\) return; setDialogo\(\{ tipo: 'eliminar', k: i, nombre: partesTira\[k\]\?\.nombre \?\? '', n: usosPorParte\[i\] \?\? 1 \}\) \}/)
    assert.match(f, /const confirmarEliminar = \(i: number\) => \{\s*\n\s*setDialogo\(null\)\s*\n\s*const r = eliminarSeccion\(doc, pasos, i\); if \(!r\) return/)
    assert.match(f, /setHist\(h => registrar\(h, r\.doc\)\); avisarQuitados\(r\.quitados\)/); assert.match(f, /setHist\(h => registrar\(h, r\.doc\)\); avisarQuitados\(r\.quitados\); setError\(null\); setPropia\(propiaDespues\); setPasoSel\(p => Math\.min\(p, Math\.max\(0, r\.estructura\.length - 1\)\)\); setActivaSec\(a => Math\.min\(a, Math\.max\(0, r\.nombres\.length - 1\)\)\)/, 'entra al historial, actualiza la estructura y deja un lugar activo que existe'); assert.match(f, /cambiosEst\.current\.push\(\{ antes: doc, despues: r\.doc, propiaAntes: propia, propiaDespues \}\)/)
    assert.match(f, /<h3 id="ed-dlg-t">\{TEXTOS_NUEVA\.eliminarTitulo\(dialogo\.nombre\)\}<\/h3>\s*\n\s*<p>\{TEXTOS_NUEVA\.eliminarCuerpo\(dialogo\.n\)\} \{TEXTOS_NUEVA\.eliminarDeshacer\}<\/p>/)
    assert.match(f, /className=\{`\$\{ui\.principal\} \$\{ui\.eliminar\}`\} onClick=\{\(\) => confirmarEliminar\(dialogo\.k\)\}>\{TEXTOS_NUEVA\.eliminarBoton\}/); assert.match(f, /<button type="button" onClick=\{\(\) => setDialogo\(null\)\}>\{TEXTOS_NUEVA\.eliminarCancelar\}<\/button>/)
    assert.match(f, /if \(previo === c\.despues && doc === c\.antes\) \{ setPropia\(c\.propiaAntes\); return \}/); assert.match(f, /if \(previo === c\.antes && doc === c\.despues\) \{ setPropia\(c\.propiaDespues\); return \}/, 'Deshacer y Rehacer del texto también restauran la estructura')
    assert.match(f, /setPropia\(null\); setPasoSel\(0\); cambiosEst\.current = \[\]/); assert.equal((f.match(/fetch\(/g) || []).length, 2, 'sin peticiones nuevas'); assert.ok(!/supabase/.test(f)) })

  await prueba('el menú: «Eliminar sección» está activa (roja) y llama a onEliminar; con arreglo propio sigue apagada; «Quitar de la estructura» en la última aparición sigue apagado', () => {
    const m = menu(), btn = m.match(/<button type="button" class="fila peligro"([^>]*)>/)
    assert.ok(btn && !/disabled/.test(btn[1])); assert.ok(m.includes('Borra la letra y sus 2 apariciones'))
    assert.ok(/<button type="button" class="fila peligro"[^>]*disabled=""/.test(menu({ bloqueado: true })), 'con arreglo propio apagada')
    assert.ok(/<button type="button" class="fila"[^>]*disabled=""><span class="icono" aria-hidden="true"><svg[^>]*>[\s\S]*?<\/svg><\/span><span class="texto"><span class="titulo">Quitar de la estructura/.test(menu({ puedeQuitar: false, apariciones: 1 })), 'Quitar sigue apagado en la última aparición')
    assert.match(leer('components/canciones/nueva/MenuParte.tsx'), /className=\{`\$\{ui\.fila\} \$\{ui\.peligro\}`\} onClick=\{onEliminar\} disabled=\{bloqueado\}/) })

  await prueba('estilos: el botón «Eliminar» es rojo con texto blanco (contraste ≥ 4.5) y vive en el CSS del editor; la estructura no hace peticiones', () => {
    const css = leer('components/canciones/editor-cancion-movil.module.css'); assert.match(css, /\.botones button\.principal\.eliminar\{ background:#C92A2A; color:#fff; \}/)
    const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
    assert.ok((1.05) / (lum('#C92A2A') + 0.05) >= 4.5, 'contraste del botón rojo') })
  terminar()
})
