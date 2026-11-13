// Estructura de «Nueva canción», paso S5: el menú del círculo v2 (tablero 7): «Repetir aquí», «Mover en la estructura» (‹ ›), «Quitar de la estructura» (apagado en la última aparición), «Renombrar» y «Eliminar sección» (visibles pero apagados hasta S6).
// «Repetir ×N» se retiró. Con arreglo propio todo sale apagado, con el aviso. Conexión en el editor: las acciones cambian solo la estructura (nunca el texto). DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')), Menu = require(path.join(RAIZ, 'components/canciones/nueva/MenuParte.tsx')).default
const PARTE = { abrev: 'C', clave: 'c', nombre: 'CORO', repeat: 1 }
const base = { parte: PARTE, lugar: 6, total: 9, apariciones: 3, puedeRepetir: true, puedeQuitar: true, puedeIzquierda: true, puedeDerecha: true, bloqueado: false, onRepetirAqui() {}, onMover() {}, onQuitar() {}, onCerrar() {} }
const menu = (o = {}) => R(h(Menu, { ...base, ...o }))
// el botón cuyo contenido incluye `txt` (o cuyo aria-label es `txt`) y si está apagado
const boton = (html, txt) => { const bs = [...html.matchAll(/<button type="button"([^>]*)>([\s\S]*?)<\/button>/g)]; const b = bs.find(m => m[2].includes(`>${txt}</span>`) || m[1].includes(`aria-label="${txt}"`)); assert.ok(b, 'botón «' + txt + '»'); return { apagado: /disabled=""/.test(b[1]), html: b[0] } }
const ACCIONES = ['Repetir aquí', 'Mover un lugar a la izquierda', 'Mover un lugar a la derecha', 'Quitar de la estructura', 'Renombrar', 'Eliminar sección']

correr(async () => {
  await prueba('menú del círculo (tablero 7): hoja «Parte» con el círculo, el nombre y «Lugar 6 de 9 · aparece 3 veces»; «Repetir aquí», «Mover en la estructura» (‹ ›), «Quitar de la estructura», «Renombrar» y «Eliminar sección», con sus ayudas', () => {
    const m = menu()
    assert.ok(m.includes('role="dialog"') && m.includes('aria-modal="true"') && m.includes('aria-label="Parte"')); assert.ok(m.includes('>CORO</span>') && m.includes('Lugar 6 de 9 · aparece 3 veces') && m.includes('data-parte="c"') && m.includes('>C</span>') && m.includes('aria-label="Cerrar"'))
    for (const t of ['Repetir aquí', 'Agrega otra aparición justo después', 'Mover en la estructura', 'Quitar de la estructura', 'La letra se queda; solo sale este lugar', 'Renombrar', 'Eliminar sección', 'Borra la letra y sus 3 apariciones']) assert.ok(m.includes(`>${t}</span>`), t)
    assert.ok(m.includes('role="group" aria-label="Mover en la estructura"') && m.includes('aria-label="Mover un lugar a la izquierda"') && m.includes('aria-label="Mover un lugar a la derecha"'))
    assert.ok(m.indexOf('Repetir aquí') < m.indexOf('Mover en la estructura') && m.indexOf('Mover en la estructura') < m.indexOf('Quitar de la estructura') && m.indexOf('Quitar de la estructura') < m.indexOf('Renombrar') && m.indexOf('Renombrar') < m.indexOf('Eliminar sección'), 'el orden del tablero')
    assert.ok(!m.includes('role="note"'), 'sin aviso cuando se puede editar') })

  await prueba('con todo disponible: Repetir, las dos flechas y Quitar están activos; Renombrar y Eliminar sección están apagados SIEMPRE (hasta S6)', () => {
    const m = menu(); for (const a of ['Repetir aquí', 'Mover un lugar a la izquierda', 'Mover un lugar a la derecha', 'Quitar de la estructura']) assert.equal(boton(m, a).apagado, false, a)
    for (const a of ['Renombrar', 'Eliminar sección']) assert.equal(boton(m, a).apagado, true, a + ' apagado')
    assert.ok(/class="fila peligro"[^>]*disabled=""/.test(m), 'Eliminar sección va en rojo y apagada') })

  await prueba('última aparición: «Quitar» apagado con «Es su única aparición. Para sacarla, usa «Eliminar sección»» y «Eliminar sección» dice «su única aparición»; plural de «aparece»: 1 vez / 3 veces', () => {
    const m = menu({ puedeQuitar: false, apariciones: 1 }); assert.equal(boton(m, 'Quitar de la estructura').apagado, true); assert.ok(m.includes('Es su única aparición. Para sacarla, usa «Eliminar sección»') && !m.includes('La letra se queda'))
    assert.ok(m.includes('Lugar 6 de 9 · aparece 1 vez<') && m.includes('Borra la letra y su única aparición')); assert.ok(menu({ apariciones: 3 }).includes('aparece 3 veces<')) })

  await prueba('los bordes: sin lugar a la izquierda la flecha ‹ se apaga; sin lugar a la derecha, la ›; a 60 lugares «Repetir aquí» se apaga y dice «La estructura admite hasta 60 lugares.»', () => {
    let m = menu({ puedeIzquierda: false }); assert.equal(boton(m, 'Mover un lugar a la izquierda').apagado, true); assert.equal(boton(m, 'Mover un lugar a la derecha').apagado, false)
    m = menu({ puedeDerecha: false }); assert.equal(boton(m, 'Mover un lugar a la derecha').apagado, true); assert.equal(boton(m, 'Mover un lugar a la izquierda').apagado, false)
    m = menu({ puedeRepetir: false }); assert.equal(boton(m, 'Repetir aquí').apagado, true); assert.ok(m.includes('La estructura admite hasta 60 lugares.') && !m.includes('Agrega otra aparición justo después')) })

  await prueba('con arreglo propio (`bloqueado`): TODO apagado y el aviso «Esta canción ya tiene un orden propio guardado. Para no pisarlo, la estructura no se puede cambiar aquí.»; el botón de cerrar sigue activo', () => {
    const m = menu({ bloqueado: true }); for (const a of ACCIONES) assert.equal(boton(m, a).apagado, true, a)
    assert.ok(m.includes('Esta canción ya tiene un orden propio guardado. Para no pisarlo, la estructura no se puede cambiar aquí.') && m.includes('role="note"')); assert.equal(boton(m, 'Cerrar').apagado, false)
    assert.ok(m.includes('class="fila apagada"'), 'la fila de «Mover» también se ve apagada') })

  await prueba('«Repetir ×N» ya no existe: ni el contador, ni sus textos, ni sus botones; «Mover (más adelante)» y «Eliminar parte» tampoco; el aviso ya no habla de «Repetir»', () => {
    const m = menu(); for (const t of ['×', 'Una repetición', 'Se canta seguido', 'más adelante', 'Eliminar parte']) assert.ok(!m.includes(t), t)
    for (const k of ['repetir', 'repetirAyuda', 'repeticionMenos', 'repeticionMas', 'repeticionActual', 'moverPronto', 'eliminarParte', 'arregloPropio', 'parteNumero']) assert.ok(!(k in N.TEXTOS_NUEVA), k)
    assert.ok(!/Repetir»/.test(JSON.stringify(Object.values(N.TEXTOS_NUEVA).map(String))), 'ningún texto manda a «Repetir»'); assert.ok(!leer('components/canciones/nueva/MenuParte.tsx').includes('REPETICION')) })

  await prueba('el editor: las acciones cambian SOLO la estructura (sin tocar el texto ni el historial); «Repetir aquí» y «Quitar» cierran el menú y dejan activo el lugar; «Mover» lo deja abierto y lo sigue', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const alRepetirAqui = \(k: number\) => \{ const r = repetirAqui\(pasos, k\); setMenuPaso\(null\); if \(!r\) \{ setError\(TEXTOS_NUEVA\.limiteEstructura\); return \} guardarPasos\(r\); setError\(null\); setPasoSel\(k \+ 1\) \}/)
    assert.match(f, /const alMover = \(k: number, d: -1 \| 1\) => \{ const r = moverReferencia\(pasos, k, d\); if \(!r\) return; guardarPasos\(r\); setPasoSel\(k \+ d\); setMenuPaso\(k \+ d\) \}/)
    assert.match(f, /const alQuitar = \(k: number\) => \{ const r = quitarReferencia\(pasos, k\); setMenuPaso\(null\); if \(!r\) return; guardarPasos\(r\); setPasoSel\(Math\.min\(k, r\.length - 1\)\) \}/)
    const cuerpo = f.slice(f.indexOf('const alRepetirAqui'), f.indexOf('const alMenu')); assert.ok(!/registrar\(|setHist|aSecciones|setQuitados/.test(cuerpo), 'no toca el documento')
    assert.match(f, /<MenuParte parte=\{partesTira\[menuPaso\]\} lugar=\{menuPaso \+ 1\} total=\{partesTira\.length\} apariciones=\{usosPorParte\[parteDeReferencia\(pasos, nombresPartes, menuPaso\)\] \?\? 1\} puedeRepetir=\{pasos\.length < MAX_PASOS\} puedeQuitar=\{puedeQuitar\(pasos, menuPaso\)\} puedeIzquierda=\{moverReferencia\(pasos, menuPaso, -1\) !== null\} puedeDerecha=\{moverReferencia\(pasos, menuPaso, 1\) !== null\} bloqueado=\{!!carga\?\.arregloPropio\} onRepetirAqui=\{\(\) => alRepetirAqui\(menuPaso\)\} onMover=\{d => alMover\(menuPaso, d\)\} onQuitar=\{\(\) => alQuitar\(menuPaso\)\} onCerrar=\{\(\) => setMenuPaso\(null\)\} \/>/)
    const mp = leer('components/canciones/nueva/MenuParte.tsx'); assert.match(mp, /onClick=\{\(\) => onMover\(-1\)\} disabled=\{bloqueado \|\| !puedeIzquierda\}/); assert.match(mp, /onClick=\{\(\) => onMover\(1\)\} disabled=\{bloqueado \|\| !puedeDerecha\}/, 'cada flecha mueve hacia SU lado')
    assert.ok(!/repeticiones|conRepeticion|fijarSeguidas|seguidasEn/.test(f), 'sin restos de «Repetir ×N»'); assert.equal((f.match(/fetch\(/g) || []).length, 2, 'sin peticiones nuevas') })

  await prueba('lo que valen las operaciones que usa el menú: repetir aquí inserta justo después; quitar solo si queda otra aparición; mover intercambia con la vecina (no entre iguales ni en los bordes)', () => {
    const S = require(path.join(RAIZ, 'lib/estructuraCancion.ts')), [V1, V2, C] = S.clavesDeLasPartes(['VERSO 1', 'VERSO 2', 'CORO'])
    assert.deepEqual(S.repetirAqui([V1, C, V2], 1), [V1, C, C, V2]); assert.equal(S.repetirAqui(Array(60).fill(C), 0), null)
    assert.equal(S.quitarReferencia([V1, C, V2], 1), null, 'única aparición'); assert.deepEqual(S.quitarReferencia([V1, C, V2, C], 1), [V1, V2, C]); assert.equal(S.puedeQuitar([V1, C, V2, C], 3), true)
    assert.deepEqual(S.moverReferencia([V1, C, V2], 1, 1), [V1, V2, C]); assert.equal(S.moverReferencia([V1, C, V2], 0, -1), null); assert.equal(S.moverReferencia([V1, C, V2], 2, 1), null); assert.equal(S.moverReferencia([V1, C, C], 1, 1), null, 'entre iguales no cambiaría nada') })

  await prueba('estilos: la fila de acción y los botones ‹ › viven en el CSS del menú (todo lo que se toca mide 44 px o más); sin tamaños sueltos nuevos', () => {
    const css = leer('components/canciones/nueva/menu-parte.module.css'); assert.match(css, /\.fila\{[^}]*min-height:52px/); assert.match(css, /\.paso\{[^}]*width:44px; height:44px/); assert.ok(!/\.accion\{|\.valor\{|\.mas\{/.test(css), 'sin los estilos del contador') })
  terminar()
})
