// Estructura de «Nueva canción», paso S6-B: «Renombrar». Reutiliza la hoja de tipos de «Parte nueva» con el título «Renombrar parte». Elegir un tipo cambia el encabezado de esa sección con la numeración de siempre y REMAPEA las referencias de la estructura para que cada una mantenga su lugar.
// Con arreglo propio sigue apagado. Deshacer y Rehacer restauran también la estructura. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), S = require(path.join(RAIZ, 'lib/estructuraCancion.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')), Sel = require(path.join(RAIZ, 'components/canciones/nueva/SelectorParte.tsx')), Menu = require(path.join(RAIZ, 'components/canciones/nueva/MenuParte.tsx')).default

const TEXTO_P = 'VERSO 1:\nlínea uno\n\nCORO (2x):\nlínea del coro\n\nVERSO 2:\nlínea dos\n\nCORO:\notro coro\n\nPUENTE:\nlínea del puente'
const TEXTO = 'VERSO 1:\nlínea uno\n\nCORO:\nlínea del coro\n\nVERSO 2:\nlínea dos\n\nCORO:\notro coro\n\nPUENTE:\nlínea del puente'
const doc = E.docVacio(TEXTO), nombresDe = d => E.partesDeDocumento(d.texto).map(p => p.nombre)
const NOMBRES = nombresDe(doc), K = S.clavesDeLasPartes(NOMBRES)       // VERSO 1#0, CORO (2x)#0 ?, …
const base = { parte: { abrev: 'C', clave: 'c', nombre: 'CORO', repeat: 1 }, lugar: 2, total: 5, apariciones: 2, puedeRepetir: true, puedeQuitar: true, puedeRenombrar: true, puedeIzquierda: true, puedeDerecha: true, bloqueado: false, onRepetirAqui() {}, onMover() {}, onQuitar() {}, onRenombrar() {}, onEliminar() {}, onCerrar() {} }
const menu = (o = {}) => R(h(Menu, { ...base, ...o }))
const apagado = (html, txt) => { const m = [...html.matchAll(/<button type="button"([^>]*)>([\s\S]*?)<\/button>/g)].find(x => x[2].includes(`>${txt}</span>`)); assert.ok(m, txt); return /disabled=""/.test(m[1]) }

correr(async () => {
  await prueba('renombrar a un tipo con otra numeración: el encabezado cambia con la numeración de siempre y las referencias mantienen SU lugar aunque cambie la clave (VERSO 2 → CORO: «CORO#1» y el otro coro pasa a «CORO#2»)', () => {
    assert.deepEqual(NOMBRES, ['VERSO 1', 'CORO', 'VERSO 2', 'CORO', 'PUENTE'])
    const est = [K[0], K[1], K[2], K[3], K[2], K[4], K[3]]                            // V1 C V2 C2 V2 P C2
    const r = S.renombrarSeccion(doc, est, 2, 'coro')
    assert.ok(r && r.doc.texto.includes('CORO:\nlínea dos') && !r.doc.texto.includes('VERSO 2'), 'el encabezado cambió y la letra quedó donde estaba')
    assert.deepEqual(r.nombres, ['VERSO 1', 'CORO', 'CORO', 'CORO', 'PUENTE'])
    assert.deepEqual(r.estructura, ['VERSO 1#0', 'CORO#0', 'CORO#1', 'CORO#2', 'CORO#1', 'PUENTE#0', 'CORO#2'], 'cada referencia sigue apuntando a su parte: V1 C [ex-V2] C2 [ex-V2] P C2')
    assert.deepEqual(S.estructuraPorDefecto(r.nombres).slice(0, 2), ['VERSO 1#0', 'CORO#0']) })

  await prueba('renombrar a verso: recibe el número siguiente al mayor que ya hay (sin contarse a sí misma) y conserva lo que tenga entre paréntesis («CORO (2x):» → «VERSO 3 (2x):»)', () => {
    const dp = E.docVacio(TEXTO_P), np = nombresDe(dp); assert.deepEqual(np, ['VERSO 1', 'CORO (2x)', 'VERSO 2', 'CORO', 'PUENTE'], 'el «(2x)» es parte del nombre de la parte')
    const r = S.renombrarSeccion(dp, S.estructuraPorDefecto(np), 1, 'verso')
    assert.ok(r.doc.texto.includes('VERSO 3 (2x):\nlínea del coro')); assert.deepEqual(r.nombres, ['VERSO 1', 'VERSO 3 (2x)', 'VERSO 2', 'CORO', 'PUENTE'])
    assert.deepEqual(r.estructura, ['VERSO 1#0', 'VERSO 3 (2x)#0', 'VERSO 2#0', 'CORO#0', 'PUENTE#0'], 'la estructura por defecto sigue siendo la de por defecto de los nombres nuevos')
    assert.ok(S.esPorDefecto(r.estructura, r.nombres)) })

  await prueba('lo que NO cambia nada devuelve null: el mismo tipo con el mismo nombre, una sección sin encabezado o que no existe; el documento original no se modifica y el resto del texto queda igual', () => {
    const ant = JSON.stringify(doc)
    assert.equal(S.renombrarSeccion(doc, [K[0]], 4, 'puente'), null, 'PUENTE → Puente: el mismo nombre'); assert.equal(S.renombrarSeccion(doc, [K[0]], 3, 'coro'), null, 'CORO → Coro: el mismo nombre'); assert.equal(S.renombrarSeccion(doc, [K[0]], 0, 'verso').nombres[0], 'VERSO 3', 'la numeración de siempre: un verso elegido «Verso» recibe el número siguiente al mayor que ya hay (la hoja lo muestra así)')
    assert.equal(S.renombrarSeccion(doc, [K[0]], 9, 'coro'), null); assert.equal(S.renombrarSeccion(doc, [K[0]], -1, 'coro'), null)
    assert.equal(S.renombrarSeccion(E.docVacio('una línea sin encabezado'), [], 0, 'coro'), null, 'sin encabezado')
    const r = S.renombrarSeccion(doc, [K[0]], 4, 'final'); assert.equal(JSON.stringify(doc), ant, 'inmutable'); assert.ok(r.doc.texto.includes('FINAL:\nlínea del puente') && r.doc.texto.includes('VERSO 1:\nlínea uno') && r.doc.texto.includes('CORO:\notro coro')) })

  await prueba('renombrar nunca quita ni agrega partes ni cambia de lugar ninguna referencia: la estructura tiene el mismo largo y el mismo orden de PARTES (por índice)', () => {
    const est = [K[3], K[0], K[3], K[1], K[2], K[4], K[1]]
    for (const tipo of E.TIPOS_SECCION) for (let i = 0; i < NOMBRES.length; i++) {
      const r = S.renombrarSeccion(doc, est, i, tipo); if (!r) continue
      assert.equal(r.estructura.length, est.length, `${tipo} en ${i}`)
      const ia = est.map(c => S.clavesDeLasPartes(NOMBRES).indexOf(c)), ib = r.estructura.map(c => S.clavesDeLasPartes(r.nombres).indexOf(c)); assert.deepEqual(ib, ia, `${tipo} en ${i}: cada referencia sigue en su parte`) } })

  await prueba('la hoja «Renombrar parte»: título, un solo grupo con los ocho tipos y, en cada uno, el nombre que recibiría ESTA parte (versos con su número; el resto sin número); sin «Volver a usar»', () => {
    const m = R(h(Sel.HojaRenombrarParte, { doc, nombreDe: t => E.nombreDeTipo(doc, t, 1), onElegir() {}, onCerrar() {} }))
    assert.ok(m.includes('role="dialog"') && m.includes('aria-modal="true"') && m.includes('aria-label="Renombrar parte"') && m.includes('<h2>Renombrar parte</h2>') && m.includes('aria-label="Cerrar"'))
    assert.ok(m.includes('role="group" aria-label="Renombrar parte"') && !m.includes('Volver a usar') && !m.includes('Parte nueva'))
    for (const n of ['Verso 3', 'Pre-coro', 'Coro', 'Puente', 'Interludio', 'Instrumental', 'Tag', 'Final']) assert.ok(m.includes(`>${n}</span>`), n)
    assert.ok(!m.includes('>Coro 2</span>'), 'no usa la numeración de «Parte nueva»'); assert.equal((m.match(/<button/g) || []).length, 1 + 8)
    const nueva = R(h(Sel.HojaAgregarParte, { doc, reusables: [], onReusar() {}, onElegir() {}, onCerrar() {} })); assert.ok(nueva.includes('>Coro 2</span>'), '«Parte nueva» no cambió') })

  await prueba('el menú: «Renombrar» está activo (abre la hoja); apagado con arreglo propio o si la parte no tiene encabezado; Eliminar y los demás como antes', () => {
    assert.equal(apagado(menu(), 'Renombrar'), false); assert.equal(apagado(menu({ bloqueado: true }), 'Renombrar'), true); assert.equal(apagado(menu({ puedeRenombrar: false }), 'Renombrar'), true)
    assert.equal(apagado(menu(), 'Eliminar sección'), false); assert.match(leer('components/canciones/nueva/MenuParte.tsx'), /onClick=\{onRenombrar\} disabled=\{bloqueado \|\| !puedeRenombrar\}/) })

  await prueba('el editor: elegir un tipo cambia el encabezado y remapea la estructura; entra al historial y se registra para Deshacer/Rehacer; la hoja solo existe en el flujo nuevo; sin peticiones nuevas', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const pedirRenombrar = \(k: number\) => \{ const i = parteDeReferencia\(pasos, nombresPartes, k\); setMenuPaso\(null\); if \(i >= 0\) setRenombrando\(i\) \}/)
    assert.match(f, /const confirmarRenombrar = \(i: number, tipo: TipoSeccion\) => \{\s*\n\s*setRenombrando\(null\)\s*\n\s*const r = renombrarSeccion\(doc, pasos, i, tipo\); if \(!r\) return/)
    assert.match(f, /cambiosEst\.current\.push\(\{ antes: doc, despues: r\.doc, propiaAntes: propia, propiaDespues \}\)\s*\n\s*setHist\(h => registrar\(h, r\.doc\)\); setQuitados\(null\); setError\(null\); setPropia\(propiaDespues\)/)
    assert.match(f, /\{renombrando !== null && nueva && <HojaRenombrarParte doc=\{doc\} nombreDe=\{tipo => nombreDeTipo\(doc, tipo, renombrando\)\} onElegir=\{tipo => confirmarRenombrar\(renombrando, tipo\)\} onCerrar=\{\(\) => setRenombrando\(null\)\} \/>\}/)
    assert.match(f, /puedeRenombrar=\{!!nombresPartes\[parteDeReferencia\(pasos, nombresPartes, menuPaso\)\]\}/); assert.match(f, /onRenombrar=\{\(\) => pedirRenombrar\(menuPaso\)\}/); assert.equal((f.match(/fetch\(/g) || []).length, 2) })

  await prueba('textos: «Renombrar parte»; el resto de la hoja de tipos no cambia', () => { assert.equal(N.TEXTOS_NUEVA.renombrarTitulo, 'Renombrar parte'); assert.equal(N.TEXTOS_NUEVA.parteNuevaTitulo, 'Parte nueva') })
  terminar()
})
