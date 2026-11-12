// «Nueva canción» paso D: «Repetir ×N» y el campo opcional `arreglo` de la ruta de guardado. La lógica pura de las repeticiones (lib/arregloCancion.ts), la validación del campo, el plan y la ejecución del guardado (lib/admin/guardarAcordes.ts:
// SOLO se escribe default_arrangement si está vacío, comprobado en el mismo update, y nunca se pisa uno existente), el menú del círculo (MenuParte) y su conexión en el editor. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const A = require(path.join(RAIZ, 'lib/arregloCancion.ts')), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts'))
const Menu = require(path.join(RAIZ, 'components/canciones/nueva/MenuParte.tsx')).default, Sel = require(path.join(RAIZ, 'components/canciones/nueva/SelectorParte.tsx'))
const SONG = '11111111-1111-4111-8111-111111111111'
const TEXTO = 'VERSO 1:\nuna línea\n\nCORO:\nlínea del coro\n\nPUENTE:\nlínea del puente'
const secciones = () => E.aSecciones(E.docVacio(TEXTO))
const cuerpo = (o = {}) => ({ songId: SONG, tono: 'F', letra: TEXTO, secciones: secciones(), base: 'a'.repeat(32), ...o })
let n = 0; const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const AHORA = new Date('2026-11-12T15:00:00Z')
const estado = (song = {}, secs = []) => ({ song: { id: SONG, organization_id: 'ORG', tono_original: null, letra: null, default_arrangement: null, ...song }, secciones: secs })
const planDe = (e, d) => G.planificar(e, d, AHORA, nuevoId)
const PARTE = { abrev: 'C', clave: 'c', nombre: 'Coro', repeat: 2 }
const menu = (o = {}) => R(h(Menu, { parte: PARTE, posicion: 3, total: 4, repeat: 2, bloqueado: false, onRepeat() {}, onCerrar() {}, ...o }))

// una base en memoria mínima (como la de guardar-acordes.test.js) con `.is(col, null)`; `antesDelArreglo` corre justo antes del update del arreglo (para simular que otro guardado se adelantó)
function baseMem(fila) {
  const db = { songs: [{ id: SONG, organization_id: 'ORG', tono_original: null, letra: null, default_arrangement: null, ...fila }], song_sections: [], song_section_variants: [], song_text_backups: [] }, est = { escrituras: [], antesDelArreglo: null, fallaArreglo: false }
  const from = tabla => { let f = [], modo = 'sel', valor = null, pidio = false
    const api = { select() { pidio = true; return api }, eq(c, v) { f.push(r => r[c] === v); return api }, in(c, vs) { f.push(r => vs.includes(r[c])); return api }, is(c, v) { f.push(r => (v === null ? r[c] === null || r[c] === undefined : r[c] === v)); return api }, maybeSingle() { api.u = true; return api }, update(v) { modo = 'upd'; valor = v; return api }, insert(v) { modo = 'ins'; valor = v; return api },
      then(res, rej) {
        if (modo === 'upd' && valor && 'default_arrangement' in valor && est.antesDelArreglo) { est.antesDelArreglo(db); est.antesDelArreglo = null }
        if (modo === 'upd' && valor && 'default_arrangement' in valor && est.fallaArreglo) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(res, rej)
        const rows = db[tabla].filter(r => f.every(x => x(r)))
        if (modo === 'ins') { db[tabla].push({ ...valor }); return Promise.resolve({ data: null, error: null }).then(res, rej) }
        if (modo === 'upd') { rows.forEach(r => Object.assign(r, valor)); est.escrituras.push([tabla, Object.keys(valor).join('+'), rows.length]); return Promise.resolve({ data: pidio ? rows.map(r => ({ id: r.id })) : null, error: null }).then(res, rej) }
        return Promise.resolve({ data: api.u ? (rows[0] ? { ...rows[0] } : null) : rows.map(r => ({ ...r })), error: null }).then(res, rej) } }
    return api }
  return { admin: { from }, db, est }
}

correr(async () => {
  await prueba('repeticionEntre: entero de 1 a 9; lo de fuera de rango va al extremo, los decimales se truncan y lo que no es número vale 1', () => {
    for (const [x, y] of [[1, 1], [2, 2], [9, 9], [10, 9], [99, 9], [0, 1], [-3, 1], [2.9, 2], [NaN, 1], [Infinity, 1], ['3', 1], [null, 1], [undefined, 1]]) assert.equal(A.repeticionEntre(x), y, String(x))
    assert.equal(A.REPETICION_MIN, 1); assert.equal(A.REPETICION_MAX, 9) })

  await prueba('claves de las partes: nombre + lugar entre las de igual nombre (CORO#0, CORO#1); las repeticiones siguen a la parte aunque cambie el texto', () => {
    const nombres = ['VERSO 1', 'CORO', 'VERSO 2', 'CORO']
    assert.deepEqual(nombres.map((_, i) => A.claveDeParte(nombres, i)), ['VERSO 1#0', 'CORO#0', 'VERSO 2#0', 'CORO#1'])
    let r = A.conRepeticion({}, nombres, 1, 3); assert.deepEqual(A.repeticionesDeLasPartes(nombres, r), [1, 3, 1, 1])
    const masNombres = ['VERSO 1', 'CORO', 'VERSO 2', 'CORO', 'PUENTE']; assert.deepEqual(A.repeticionesDeLasPartes(masNombres, r), [1, 3, 1, 1, 1], 'agregar una parte al final no mueve la repetición del primer coro')
    assert.deepEqual(A.repeticionesDeLasPartes(['CORO'], A.conRepeticion({}, ['CORO'], 0, 2)), [2], '«CORO:» sin letra y el mismo «CORO:» con letra son la misma parte') })

  await prueba('conRepeticion: no modifica lo anterior; ×1 quita la clave; fuera de rango se lleva al extremo', () => {
    const base = Object.freeze({}); const nombres = ['VERSO 1', 'CORO']
    const r2 = A.conRepeticion(base, nombres, 1, 2); assert.deepEqual(base, {}); assert.deepEqual(r2, { 'CORO#0': 2 })
    assert.deepEqual(A.conRepeticion(r2, nombres, 1, 1), {}, '×1 = sin repetir: no queda clave'); assert.deepEqual(A.conRepeticion(r2, nombres, 1, 99), { 'CORO#0': 9 }); assert.deepEqual(A.conRepeticion(r2, nombres, 1, 0), {}) })

  await prueba('arregloParaGuardar: nada que mandar si ninguna parte se repite; si alguna sí, una entrada por parte, en orden, con ×1 en las demás', () => {
    const nombres = ['VERSO 1', 'CORO', 'PUENTE']
    assert.equal(A.arregloParaGuardar(nombres, {}), undefined); assert.equal(A.arregloParaGuardar([], {}), undefined)
    assert.deepEqual(A.arregloParaGuardar(nombres, A.conRepeticion({}, nombres, 1, 2)), [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 1 }])
    assert.deepEqual(A.arregloParaGuardar(nombres, A.conRepeticion(A.conRepeticion({}, nombres, 0, 9), nombres, 2, 4)).map(x => x.repeat), [9, 1, 4]) })

  await prueba('tieneArregloPropio: solo null o ausente cuenta como vacío; una lista vacía o rara NO se toca', () => {
    assert.equal(A.tieneArregloPropio(null), false); assert.equal(A.tieneArregloPropio(undefined), false)
    for (const x of [[], [{ sectionId: 'a', label: 'C', repeat: 2 }], {}, 'x', 0, [null]]) assert.equal(A.tieneArregloPropio(x), true, JSON.stringify(x)) })

  await prueba('validarCuerpo acepta `arreglo` opcional y rechaza lo raro: no lista, de más, llaves de más, índices fuera de rango, repetidos o decimales, repeticiones fuera de 1–9 o no enteras', () => {
    assert.equal(G.validarCuerpo(cuerpo()).ok, true, 'sin arreglo'); assert.equal(G.validarCuerpo(cuerpo({ arreglo: [] })).ok, true)
    assert.equal(G.validarCuerpo(cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 9 }] })).ok, true)
    const malos = [['x'], 'x', null, 5, { indice: 0, repeat: 2 }, [{ indice: 3, repeat: 2 }], [{ indice: -1, repeat: 2 }], [{ indice: 0.5, repeat: 2 }], [{ indice: '0', repeat: 2 }], [{ indice: 0, repeat: 0 }], [{ indice: 0, repeat: 10 }], [{ indice: 0, repeat: 2.5 }], [{ indice: 0, repeat: '2' }],
      [{ indice: 0, repeat: 2 }, { indice: 0, repeat: 3 }], [{ indice: 0, repeat: 2, extra: 1 }], [{ indice: 0 }], [{ repeat: 2 }], [null], Array(41).fill({ indice: 0, repeat: 2 })]
    for (const a of malos) { const r = G.validarCuerpo(cuerpo({ arreglo: a })); assert.equal(r.ok, false, JSON.stringify(a)); assert.equal(r.campo, 'arreglo', JSON.stringify(a)) }
    assert.equal(G.validarCuerpo({ ...cuerpo(), sectionId: 'x' }).campo, 'cuerpo', 'las demás llaves siguen prohibidas') })

  await prueba('armarArreglo (canción SIN arreglo propio): con alguna repetición escribe UNA entrada por sección, en orden, con el sectionId de cada una y el código como label; la última operación del plan', () => {
    const d = cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 1 }] }), ops = planDe(estado(), d)
    const ult = ops[ops.length - 1]; assert.equal(ult.tipo, 'arreglo'); assert.equal(ult.paso, 6); assert.equal(ult.tabla, 'songs'); assert.equal(ult.id, SONG); assert.deepEqual(Object.keys(ult.valores), ['default_arrangement'])
    const nuevas = ops.filter(o => o.tipo === 'insert' && o.tabla === 'song_sections'), arr = ult.valores.default_arrangement
    assert.equal(arr.length, 3, 'TODAS las secciones (la lectura solo muestra lo que está en el arreglo)'); assert.deepEqual(arr.map(x => x.sectionId), nuevas.map(o => o.valores.id)); assert.deepEqual(arr.map(x => x.label), ['V1', 'C', 'P']); assert.deepEqual(arr.map(x => x.repeat), [1, 2, 1])
    assert.equal(ops.filter(o => o.tipo === 'arreglo').length, 1)
    const parcial = planDe(estado(), cuerpo({ arreglo: [{ indice: 1, repeat: 2 }] })); assert.deepEqual(parcial[parcial.length - 1].valores.default_arrangement.map(x => x.repeat), [1, 2, 1], 'un arreglo parcial: las secciones sin entrada van en ×1, y siguen estando todas') })

  await prueba('armarArreglo con secciones que ya existen: reutiliza SUS ids (por posición, como el resto del guardado) y crea los de las nuevas', () => {
    const e = estado({}, [{ id: 's1', code: 'V1', name: 'VERSO 1', sort_order: 0, variantes: [] }, { id: 's2', code: 'C', name: 'CORO', sort_order: 1, variantes: [] }])
    const ops = planDe(e, cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 3 }, { indice: 2, repeat: 1 }] })), arr = ops[ops.length - 1].valores.default_arrangement
    const creada = ops.find(o => o.tipo === 'insert' && o.tabla === 'song_sections').valores.id; assert.deepEqual(arr.map(x => x.sectionId), ['s1', 's2', creada]); assert.deepEqual(arr.map(x => x.repeat), [1, 3, 1]) })

  await prueba('NUNCA pisa un arreglo existente: con cualquier default_arrangement distinto de null (lista, lista vacía o algo raro) el plan no trae operación de arreglo; tampoco sin `arreglo` ni con todo en ×1', () => {
    const d = cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 1 }] })
    for (const a of [[{ sectionId: 's1', label: 'V1', repeat: 1 }], [], {}, 'x']) assert.equal(planDe(estado({ default_arrangement: a }), d).filter(o => o.tipo === 'arreglo').length, 0, JSON.stringify(a))
    assert.equal(planDe(estado(), cuerpo()).filter(o => o.tipo === 'arreglo').length, 0, 'sin `arreglo` en el cuerpo')
    assert.equal(planDe(estado(), cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 1 }, { indice: 2, repeat: 1 }] })).filter(o => o.tipo === 'arreglo').length, 0, 'con todo en ×1 la canción queda sin arreglo propio')
    assert.equal(planDe(estado(), cuerpo({ arreglo: [] })).filter(o => o.tipo === 'arreglo').length, 0)
    const sin = planDe(estado(), cuerpo()).map(o => [o.paso, o.tipo, o.tabla]), con = planDe(estado(), d).slice(0, -1).map(o => [o.paso, o.tipo, o.tabla]); assert.deepEqual(sin, con, 'lo demás del plan es idéntico, con o sin arreglo') })

  await prueba('ejecutar: el arreglo se escribe al final y SOLO si en ese momento sigue vacío (is null dentro del propio update); si otro guardado se adelantó, no se pisa y el guardado sigue completo', async () => {
    const d = cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 1 }] })
    let m = baseMem({}); let r = await G.ejecutar(m.admin, planDe(estado(), d)); assert.equal(r.ok, true)
    assert.deepEqual(m.db.songs[0].default_arrangement.map(x => x.repeat), [1, 2, 1]); assert.deepEqual(m.db.songs[0].default_arrangement.map(x => x.sectionId), m.db.song_sections.map(x => x.id), 'enlazado por los ids reales de las secciones guardadas')
    const ant = JSON.stringify(m.db.songs[0].default_arrangement), e2 = estado({ default_arrangement: m.db.songs[0].default_arrangement })     // un SEGUNDO guardado con arreglo en el cuerpo: la canción ya tiene uno
    r = await G.ejecutar(m.admin, planDe(e2, { ...d, arreglo: [{ indice: 0, repeat: 9 }, { indice: 1, repeat: 9 }, { indice: 2, repeat: 9 }] })); assert.equal(r.ok, true); assert.equal(JSON.stringify(m.db.songs[0].default_arrangement), ant, 'el existente no se toca')
    m = baseMem({}); m.est.antesDelArreglo = db => { db.songs[0].default_arrangement = [{ sectionId: 'otra', label: 'X', repeat: 5 }] }      // otro guardado escribe un arreglo entre la lectura y el update
    r = await G.ejecutar(m.admin, planDe(estado(), d)); assert.equal(r.ok, true, 'no es un fallo'); assert.deepEqual(m.db.songs[0].default_arrangement, [{ sectionId: 'otra', label: 'X', repeat: 5 }], 'NO se pisó')
    const filas = m.est.escrituras.filter(x => x[1] === 'default_arrangement'); assert.equal(filas[0][2], 0, 'el update no tocó ninguna fila') })

  await prueba('si el update del arreglo falla de verdad, el guardado se detiene en el paso 6 (lo demás ya quedó escrito)', async () => {
    const d = cuerpo({ arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 1 }] }), m = baseMem({}); m.est.fallaArreglo = true
    const ops = planDe(estado(), d), r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, false); assert.equal(r.paso, 6); assert.equal(r.fallo, ops.length - 1); assert.equal(m.db.songs[0].default_arrangement, null); assert.equal(m.db.songs[0].letra, TEXTO, 'la letra y las secciones sí quedaron') })

  await prueba('la carga dice si la canción tiene arreglo propio (`arregloPropio`): null/ausente no; lista, lista vacía o cualquier cosa sí; sin tocar la huella', () => {
    const c = x => G.construirCarga(estado(x === undefined ? {} : { default_arrangement: x }))
    assert.equal(c(null).arregloPropio, false); assert.equal(c(undefined).arregloPropio, false); assert.equal(c([]).arregloPropio, true); assert.equal(c([{ sectionId: 'a', label: 'C', repeat: 1 }]).arregloPropio, true)
    assert.equal(c(null).huella, c([{ sectionId: 'a', label: 'C', repeat: 1 }]).huella, 'el arreglo no cambia la huella (no es un cambio del contenido)') })

  await prueba('menú del círculo (tablero 5): hoja «Parte» con la parte (círculo, nombre, «Parte 3 de 4»), «Repetir» con su explicación y ×N, y Renombrar, Mover (más adelante) y Eliminar parte apagados', () => {
    const m = menu()
    assert.ok(m.includes('role="dialog"') && m.includes('aria-modal="true"') && m.includes('aria-label="Parte"')); assert.ok(m.includes('>Coro</span>') && m.includes('Parte 3 de 4') && m.includes('data-parte="c"') && m.includes('>C</span>'))
    assert.ok(m.includes('Repetir') && m.includes('Se canta seguido, con la misma letra') && m.includes('>×2</span>') && m.includes('aria-label="Una repetición menos"') && m.includes('aria-label="Una repetición más"') && m.includes('aria-label="Cerrar"'))
    for (const t of ['Renombrar', 'Mover (más adelante)', 'Eliminar parte']) assert.match(m, new RegExp(`<button type="button" class="accion[^"]*" disabled=""><span class="icono" aria-hidden="true">[\\s\\S]*?</span>${t.replace(/[()]/g, '\\$&')}</button>`), t + ' apagado')
    assert.ok(!m.includes('orden propio'), 'sin aviso cuando se puede repetir') })

  await prueba('el contador: «−» apagado en ×1 y «+» apagado en ×9; en medio los dos activos; el valor se anuncia («Sin repetir», «Se repite 3 veces»)', () => {
    const botones = x => { const html = menu({ repeat: x }), a = /<button type="button" class="paso"([^>]*)aria-label="Una repetición menos"/.exec(html), b = /<button type="button" class="paso mas"([^>]*)aria-label="Una repetición más"/.exec(html); return [/disabled/.test(a[1]), /disabled/.test(b[1]), html] }
    let [menos, mas, html] = botones(1); assert.equal(menos, true); assert.equal(mas, false); assert.ok(html.includes('aria-label="Sin repetir"') && html.includes('>×1</span>'))
    ;[menos, mas, html] = botones(9); assert.equal(menos, false); assert.equal(mas, true); assert.ok(html.includes('>×9</span>') && html.includes('aria-label="Se repite 9 veces"'))
    ;[menos, mas, html] = botones(3); assert.equal(menos, false); assert.equal(mas, false); assert.ok(html.includes('aria-label="Se repite 3 veces"')) })

  await prueba('menú con arreglo propio (tablero 5b): «Repetir» apagado y en ×1, sus botones apagados y el aviso «Esta canción ya tiene un orden propio guardado…»', () => {
    const m = menu({ bloqueado: true, repeat: 4 })
    assert.ok(m.includes('class="fila repetir apagada"') && m.includes('aria-disabled="true"') && m.includes('>×1</span>'), 'siempre ×1 y apagado, aunque se pase otro valor')
    assert.equal((m.match(/class="paso[^"]*"[^>]*disabled=""/g) || []).length, 2); assert.ok(m.includes('Esta canción ya tiene un orden propio guardado. Para no pisarlo, «Repetir» no se puede cambiar aquí.') && m.includes('role="note"'))
    assert.ok(!menu().includes('apagada"'), 'sin arreglo propio no está apagado') })

  await prueba('la hoja «Agregar parte» trae el consejo de la maqueta: «¿El coro se repite con la misma letra? No agregues otro: toca su círculo y elige «Repetir».»', () => {
    const hoja = R(h(Sel.HojaAgregarParte, { doc: E.docVacio(TEXTO), existentes: ['V1', 'C', 'P'], onElegir() {}, onCerrar() {} }))
    assert.ok(hoja.includes('¿El coro se repite con la misma letra? No agregues otro: toca su círculo y elige «Repetir».') && hoja.includes('role="note"')); assert.ok(!R(h(Sel.TarjetaEmpieza, { doc: E.docVacio(), onElegir() {} })).includes('se repite') , 'la tarjeta de inicio no lleva el consejo') })

  await prueba('la tira: con `onMenu`, un toque en la parte activa y el toque largo abren el menú (en vez del globo); sin `onMenu` sigue el globo de siempre; la lectura no lo pasa', () => {
    const t = leer('components/canciones/lectura/TiraPartes.tsx')
    assert.match(t, /if \(i === activa\) \{ if \(onMenu\) onMenu\(i\); else mostrar\(i, e\.currentTarget\); return \}/); assert.match(t, /fueLargo\.current = true; if \(onMenu\) onMenu\(i\); else mostrar\(i, el\)/)
    assert.ok(!/onMenu=/.test(leer('app/portal/_components/lectura/LecturaCancion.tsx')), 'la lectura no abre menús') })

  await prueba('el editor: el menú solo en el flujo nuevo; «Repetir» guarda con conRepeticion en memoria; el guardado manda `arreglo` solo en el flujo nuevo y sin arreglo propio; el menú sale bloqueado con `arregloPropio`; la tira lleva las repeticiones', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const entradas = nueva && !carga\.arregloPropio \? estructuraParaGuardar\(pasos, nombresPartes\) : undefined/); assert.match(f, /\.\.\.\(entradas \? \{ estructura: entradas \} : \{\}\) \}\)/)
    assert.match(f, /\{menuPaso !== null && nueva && partesTira\[menuPaso\] && <MenuParte parte=\{partesTira\[menuPaso\]\} posicion=\{menuPaso \+ 1\} total=\{partesTira\.length\} repeat=\{seguidasEn\(pasos, menuPaso\)\} maximo=\{Math\.min\(REPETICION_MAX, seguidasEn\(pasos, menuPaso\) \+ MAX_PASOS - pasos\.length\)\} bloqueado=\{!!carga\?\.arregloPropio\} onRepeat=\{n => \{ const r = fijarSeguidas\(pasos, menuPaso, n\)/)
    assert.match(f, /onMenu=\{alMenu\}/); assert.match(f, /const alMenu = \(k: number\) => \{ setPasoSel\(k\); setActivaSec\([^\n]*setMenuPaso\(k\) \}/); assert.equal((f.match(/fetch\(/g) || []).length, 2, 'la estructura viaja en el guardado de siempre, sin peticiones nuevas'); assert.ok(!/supabase/.test(f))
    assert.match(f, /type Cargado = \{ arregloPropio\?: boolean;/)
    assert.match(f, /const toqueSec = useRef<number \| null>\(null\)/); assert.match(f, /setActivaSec\(i\); toqueSec\.current = i/, 'tocar un círculo recuerda la parte tocada')
    assert.match(f, /const alFinal = c\.scrollTop >= c\.scrollHeight - c\.clientHeight - 2\s*\n\s*if \(!alFinal\) toqueSec\.current = null/, 'al alejarse del final vuelve la regla normal'); assert.match(f, /setActivaSec\(alFinal && toqueSec\.current !== null \? toqueSec\.current : calculada\)/, 'al final del desplazamiento manda la parte tocada') })

  await prueba('la ruta y el esquema no cambian: la ruta de guardado sigue igual (el campo viaja en `d`), sin migraciones nuevas; las protecciones (huella, 409 del arreglo, respaldo) están intactas', () => {
    const ruta = leer('app/api/admin/canciones/acordes/route.ts'); assert.match(ruta, /const afectadas = seccionesDelArregloAfectadas\(a\.estado, d\)/); assert.match(ruta, /construirCarga\(a\.estado\)\.huella !== d\.base/); assert.match(ruta, /planificar\(a\.estado, d, new Date\(\), randomUUID\)/)
    const g = leer('lib/admin/guardarAcordes.ts'); assert.match(g, /op\.previo === null \? q\.is\('default_arrangement', null\) : q\.eq\('default_arrangement', JSON\.stringify\(op\.previo\)\)\)\.select\('id'\)/, 'sin arreglo, la comprobación «sigue vacío» (is null) va dentro del propio update'); assert.ok(!fs.readdirSync(path.join(RAIZ, 'migrations')).some(x => /^056[a-z]?-.*arreglo|^057/.test(x)), 'sin migraciones nuevas') })
  terminar()
})
