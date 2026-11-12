// Estructura de «Nueva canción», paso S2: el servidor. El cuerpo del guardado admite `estructura` (entradas {indice, repeat}, el MISMO índice puede repetirse, también no seguido); se valida, se compacta y se escribe en `default_arrangement` (con el mismo
// «solo si sigue como se leyó»). Solo en una canción SIN arreglo propio; con arreglo propio se ignora (D2 sigue igual). El GET entrega `estructuraGuardada`. Sin cliente que lo use todavía. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), X = require(path.join(RAIZ, 'lib/estructuraCancion.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const SONG = '11111111-1111-4111-8111-111111111111'
const TEXTO5 = 'VERSO 1:\nlínea uno\n\nVERSO 2:\nlínea dos\n\nCORO:\nlínea del coro\n\nPUENTE:\nlínea del puente\n\nVERSO 3:\nlínea tres'
const TEXTO3 = 'VERSO 1:\nlínea uno\n\nCORO:\nlínea del coro\n\nPUENTE:\nlínea del puente'
const cuerpo = (texto, o = {}) => ({ songId: SONG, tono: 'F', letra: texto, secciones: E.aSecciones(E.docVacio(texto)), base: 'a'.repeat(32), ...o })
let n = 0; const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const AHORA = new Date('2026-11-12T15:00:00Z')
const sec = (id, code, name, i) => ({ id, code, name, sort_order: i, variantes: [] })
const estado = (arreglo, secs = []) => ({ song: { id: SONG, organization_id: 'ORG', tono_original: 'F', letra: null, default_arrangement: arreglo }, secciones: secs })
const planDe = (e, d) => G.planificar(e, d, AHORA, nuevoId)
const opArreglo = ops => ops.filter(o => o.tipo === 'arreglo')
const ent = (...pares) => pares.map(([indice, repeat = 1]) => ({ indice, repeat }))
const NO_SEGUIDAS = ent(...[0, 1, 2, 0, 1, 2, 3, 4, 2].map(i => [i]))      // V1, V2, C, V1, V2, C, Bd, V3, C (índices de las 5 secciones de TEXTO5)

// la misma base en memoria que usa D2: `.is(col, null)` y `.eq(col, <json>)` sobre jsonb; `antesDelArreglo` corre justo antes del update del arreglo (otro guardado que se adelanta)
function baseMem(fila) {
  const db = { songs: [{ id: SONG, organization_id: 'ORG', tono_original: null, letra: null, default_arrangement: null, ...fila }], song_sections: [], song_section_variants: [], song_text_backups: [] }, est = { escrituras: [], antesDelArreglo: null }
  const from = tabla => { let f = [], modo = 'sel', valor = null, pidio = false
    const api = { select() { pidio = true; return api }, eq(c, v) { f.push(r => r[c] === v || (r[c] !== null && typeof r[c] === 'object' && JSON.stringify(r[c]) === v)); return api }, in(c, vs) { f.push(r => vs.includes(r[c])); return api }, is(c, v) { f.push(r => (v === null ? r[c] === null || r[c] === undefined : r[c] === v)); return api }, maybeSingle() { api.u = true; return api }, update(v) { modo = 'upd'; valor = v; return api }, insert(v) { modo = 'ins'; valor = v; return api },
      then(res, rej) {
        if (modo === 'upd' && valor && 'default_arrangement' in valor && est.antesDelArreglo) { est.antesDelArreglo(db); est.antesDelArreglo = null }
        const rows = db[tabla].filter(r => f.every(x => x(r)))
        if (modo === 'ins') { db[tabla].push({ ...valor }); return Promise.resolve({ data: null, error: null }).then(res, rej) }
        if (modo === 'upd') { rows.forEach(r => Object.assign(r, valor)); est.escrituras.push([tabla, Object.keys(valor).join('+'), rows.length]); return Promise.resolve({ data: pidio ? rows.map(r => ({ id: r.id })) : null, error: null }).then(res, rej) }
        return Promise.resolve({ data: api.u ? (rows[0] ? { ...rows[0] } : null) : rows.map(r => ({ ...r })), error: null }).then(res, rej) } }
    return api }
  return { admin: { from }, db, est }
}

correr(async () => {
  await prueba('validar: la estructura V1, V2, C, V1, V2, C, Bd, V3, C (el mismo índice varias veces, no seguido) es válida; también con repeat; `arreglo` y `estructura` juntos se aceptan', () => {
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { estructura: NO_SEGUIDAS })).ok, true)
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { estructura: ent([0], [1], [2, 3], [3], [4], [2, 2]) })).ok, true)
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { estructura: NO_SEGUIDAS, arreglo: ent([0], [1], [2], [3], [4]) })).ok, true)
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5)).ok, true, 'sin estructura, como siempre') })

  await prueba('validar: rechaza (campo «estructura») lo que no es lista, llaves de más, índices o repeat raros, una sección que no aparece, y los topes (60 pasos = suma de repeat)', () => {
    const malo = (estructura, motivo) => { const v = G.validarCuerpo(cuerpo(TEXTO5, { estructura })); assert.equal(v.ok, false, motivo); assert.equal(v.campo, 'estructura', motivo) }
    malo('x', 'texto'); malo({}, 'objeto'); malo(null, 'null'); malo([], 'vacía con 5 secciones: faltan todas')
    malo(ent([0], [1], [2], [3]), 'falta VERSO 3'); malo([...NO_SEGUIDAS, { indice: 0, repeat: 1, extra: 1 }], 'llave de más'); malo([{ indice: 0 }, ...NO_SEGUIDAS], 'sin repeat')
    for (const i of [-1, 5, 1.5, '1', null]) malo([...NO_SEGUIDAS, { indice: i, repeat: 1 }], 'índice ' + JSON.stringify(i))
    for (const r of [0, 10, 1.5, '2', null, -1]) malo([...NO_SEGUIDAS, { indice: 0, repeat: r }], 'repeat ' + JSON.stringify(r))
    malo(ent(...[0, 1, 2, 3, 4].map(i => [i, 9]), [0, 9], [1, 9]), '63 pasos (más de 60 en suma de repeat)'); malo(Array.from({ length: 61 }, (_, i) => ({ indice: i % 5, repeat: 1 })), '61 entradas')
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { estructura: Array.from({ length: 60 }, (_, i) => ({ indice: i % 5, repeat: 1 })) })).ok, true, '60 entradas de 1: justo el tope')
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { estructura: ent(...[0, 1, 2, 3, 4, 0].map(i => [i, 9]), [1, 6]) })).ok, true, '60 pasos de suma: justo el tope')
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { estructura: ent(...[0, 1, 2, 3, 4, 0].map(i => [i, 9]), [1, 7]) })).ok, false, '61 pasos de suma')
    const sinSecciones = G.validarCuerpo({ ...cuerpo(''), secciones: [], estructura: [] }); assert.equal(sinSecciones.ok, true, 'sin secciones, estructura vacía')
    assert.equal(G.validarCuerpo({ ...cuerpo(''), secciones: [], estructura: ent([0]) }).ok, false, 'sin secciones no hay a qué apuntar') })

  await prueba('lo de `arreglo` (paso D) no cambió: sigue pidiendo un índice por sección sin repetir', () => {
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { arreglo: ent([0], [0]) })).ok, false); assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { arreglo: ent([0], [1, 3]) })).ok, true)
    assert.equal(G.validarCuerpo(cuerpo(TEXTO5, { arreglo: ent([0], [0]) })).campo, 'arreglo') })

  await prueba('canción SIN arreglo: la estructura no seguida se escribe tal cual, una entrada por paso, con el id y el código de la sección; la operación es la última (paso 6) y lleva `previo` null', () => {
    const ops = planDe(estado(null), cuerpo(TEXTO5, { estructura: NO_SEGUIDAS })), a = opArreglo(ops)
    assert.equal(a.length, 1); assert.equal(a[0].paso, 6); assert.equal(ops[ops.length - 1], a[0]); assert.equal(a[0].previo, null)
    const creadas = ops.filter(o => o.tipo === 'insert' && o.tabla === 'song_sections').map(o => o.valores), nuevo = a[0].valores.default_arrangement
    assert.equal(creadas.length, 5); assert.equal(nuevo.length, 9)
    assert.deepEqual(nuevo.map(x => x.sectionId), NO_SEGUIDAS.map(x => creadas[x.indice].id)); assert.deepEqual(nuevo.map(x => x.label), NO_SEGUIDAS.map(x => creadas[x.indice].code)); assert.ok(nuevo.every(x => x.repeat === 1)) })

  await prueba('las seguidas se comprimen en UNA entrada con repeat; el servidor compacta aunque el cliente mande entradas sueltas (dos entradas seguidas a la misma sección se funden; una tanda de más de 9 se parte)', () => {
    const nuevoDe = estructura => opArreglo(planDe(estado(null), cuerpo(TEXTO5, { estructura })))[0].valores.default_arrangement
    assert.deepEqual(nuevoDe(ent([0], [1], [2, 3], [3], [4])).map(x => x.repeat), [1, 1, 3, 1, 1], 'C ×3 seguido y luego el puente')
    assert.deepEqual(nuevoDe(ent([0], [1], [2], [2], [2], [3], [4])).map(x => x.repeat), [1, 1, 3, 1, 1], 'tres entradas sueltas del coro → una con repeat 3')
    assert.deepEqual(nuevoDe(ent([0], [1], [2, 5], [2, 5], [3], [4])).map(x => x.repeat), [1, 1, 9, 1, 1, 1], '5 + 5 seguidas = 9 + 1')
    assert.deepEqual(nuevoDe(ent([0], [1], [2], [3], [4], [2, 3])).map(x => x.repeat), [1, 1, 1, 1, 1, 3], 'el mismo coro más adelante es otra entrada') })

  await prueba('la estructura por defecto (cada sección una vez y en orden) NO escribe arreglo; con repeat o fuera de orden, sí', () => {
    assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO5, { estructura: ent([0], [1], [2], [3], [4]) }))).length, 0)
    assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO5, { estructura: ent([0], [1], [2, 2], [3], [4]) }))).length, 1)
    assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO5, { estructura: ent([1], [0], [2], [3], [4]) }))).length, 1)
    assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO5, { estructura: ent([0], [1], [2], [3], [4], [4]) }))).length, 1)
    assert.equal(opArreglo(planDe(estado(undefined), cuerpo(TEXTO5, { estructura: NO_SEGUIDAS }))).length, 1, 'arreglo ausente cuenta como null') })

  await prueba('si llegan las dos, MANDA `estructura` (también cuando es la de por defecto: entonces el `arreglo` con repeticiones no escribe nada)', () => {
    const rep = ent([0], [1], [2, 4], [3], [4])
    assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO5, { arreglo: rep, estructura: ent([0], [1], [2], [3], [4]) }))).length, 0)
    const nuevo = opArreglo(planDe(estado(null), cuerpo(TEXTO5, { arreglo: rep, estructura: NO_SEGUIDAS })))[0].valores.default_arrangement; assert.equal(nuevo.length, 9, 'la estructura, no las repeticiones de `arreglo`')
    const d = opArreglo(planDe(estado(null), cuerpo(TEXTO5, { arreglo: rep })))[0].valores.default_arrangement; assert.deepEqual(d.map(x => x.repeat), [1, 1, 4, 1, 1], 'sin estructura, la regla de D como siempre') })

  await prueba('canción CON arreglo propio: `estructura` se IGNORA (no se toca ni reordena nada); solo rige D2 (las secciones creadas en este guardado se agregan al final con repeat 1)', () => {
    const previo = [{ sectionId: 's2', label: 'C', repeat: 3 }, { sectionId: 's1', label: 'V1', repeat: 1 }], E_VC = [sec('s1', 'V1', 'VERSO 1', 0), sec('s2', 'C', 'CORO', 1)]
    const totalmente = ent([0, 9], [1, 9], [2, 9])
    assert.equal(opArreglo(planDe(estado(previo, E_VC), cuerpo('VERSO 1:\nuna línea\n\nCORO:\nlínea del coro', { estructura: ent([1], [0], [1, 5]) }))).length, 0, 'sin secciones nuevas no hay nada que agregar')
    const nuevo = opArreglo(planDe(estado(previo, E_VC), cuerpo(TEXTO3, { estructura: totalmente })))[0].valores.default_arrangement
    assert.deepEqual(nuevo.slice(0, 2), previo, 'las entradas existentes, idénticas y en su orden'); assert.equal(nuevo.length, 3); assert.equal(nuevo[2].repeat, 1)
    for (const a of [[], {}, 'x']) assert.equal(opArreglo(planDe(estado(a, E_VC), cuerpo(TEXTO3, { estructura: totalmente }))).length, 0, 'un arreglo raro tampoco se toca: ' + JSON.stringify(a)) })

  await prueba('ejecutar: se escribe con `is null`; si otro guardado puso un arreglo entre la lectura y ahora, NO se pisa y el guardado sigue completo', async () => {
    let m = baseMem({ default_arrangement: null }), r = await G.ejecutar(m.admin, planDe(estado(null), cuerpo(TEXTO5, { estructura: NO_SEGUIDAS }))); assert.equal(r.ok, true)
    assert.equal(m.db.songs[0].default_arrangement.length, 9); assert.deepEqual(m.est.escrituras.filter(x => x[1] === 'default_arrangement')[0].slice(2), [1], 'tocó una fila')
    m = baseMem({ default_arrangement: null }); const otro = [{ sectionId: 'x', label: 'V1', repeat: 2 }]; m.est.antesDelArreglo = db => { db.songs[0].default_arrangement = otro }
    r = await G.ejecutar(m.admin, planDe(estado(null), cuerpo(TEXTO5, { estructura: NO_SEGUIDAS }))); assert.equal(r.ok, true, 'no es un fallo'); assert.deepEqual(m.db.songs[0].default_arrangement, otro, 'NO se pisó lo que otro escribió'); assert.equal(m.est.escrituras.filter(x => x[1] === 'default_arrangement')[0][2], 0) })

  await prueba('ida y vuelta por el servidor: guardar la estructura, leer la canción y pedir `estructuraGuardada` devuelve la misma estructura; el GET la lleva y `arregloPropio` es true', async () => {
    const m = baseMem({ default_arrangement: null }), enviada = ent([0], [1], [2, 2], [0], [1], [2, 3], [3], [4], [2])
    assert.equal((await G.ejecutar(m.admin, planDe(estado(null), cuerpo(TEXTO5, { estructura: enviada })))).ok, true)
    const leido = await G.leerEstado(m.admin, SONG); assert.ok(leido, 'se pudo leer')
    assert.deepEqual(G.estructuraGuardada(leido), X.compactar(enviada), 'las seguidas con repeat y las no seguidas como entradas separadas')
    const carga = G.construirCarga(leido); assert.deepEqual(carga.estructuraGuardada, X.compactar(enviada)); assert.equal(carga.arregloPropio, true)
    const nombres = E.estructura(TEXTO5).secciones.map(s => s.nombre); assert.deepEqual(X.desdeEntradas(carga.estructuraGuardada, nombres), X.desdeEntradas(enviada, nombres), 'y la pantalla la expande en círculos') })

  await prueba('estructuraGuardada: null sin arreglo (o raro o que no apunta a ninguna sección); salta lo que apunta a otra cosa o a una sección dada de baja; un repeat raro cuenta 1', () => {
    const secs = [sec('s1', 'V1', 'VERSO 1', 0), sec('s2', 'C', 'CORO', 1), sec('s3', '__B', 'BAJA', 2)]
    for (const a of [null, undefined, [], {}, 'x', 0, [null], [{ sectionId: 'otra' }], [{ sectionId: 's3', repeat: 1 }]]) assert.equal(G.estructuraGuardada(estado(a, secs)), null, JSON.stringify(a))
    assert.deepEqual(G.estructuraGuardada(estado([{ sectionId: 's2', label: 'C', repeat: 2 }, { sectionId: 'otra', repeat: 1 }, { sectionId: 's1', label: 'V1', repeat: 'x' }, { sectionId: 's2', label: 'C', repeat: 1 }], secs)), ent([1, 2], [0, 1], [1, 1])) })

  await prueba('lo demás no cambia: las operaciones 0–5 son las mismas con o sin `estructura`; la ruta, la comprobación `is null` y la huella siguen igual; sin migraciones nuevas', () => {
    const sin = planDe(estado(null), cuerpo(TEXTO5)).map(o => [o.paso, o.tipo, o.tabla]), con = planDe(estado(null), cuerpo(TEXTO5, { estructura: NO_SEGUIDAS })).slice(0, -1).map(o => [o.paso, o.tipo, o.tabla]); assert.deepEqual(sin, con)
    const g = leer('lib/admin/guardarAcordes.ts'); assert.match(g, /op\.previo === null \? q\.is\('default_arrangement', null\) : q\.eq\('default_arrangement', JSON\.stringify\(op\.previo\)\)\)\.select\('id'\)/)
    assert.ok(!/estructura|arreglo/.test(g.slice(g.indexOf('const resumen = JSON.stringify'), g.indexOf('.digest(')) .replace(/e\.song\.letra/g, '')), 'la huella (base del guardado) no incluye el arreglo ni la estructura')
    assert.match(leer('app/api/admin/canciones/acordes/route.ts'), /planificar\(a\.estado, d, new Date\(\), randomUUID\)/); assert.ok(!fs.readdirSync(path.join(RAIZ, 'migrations')).some(x => /^057/.test(x)), 'sin migraciones nuevas')
    assert.deepEqual(X.compactar(ent([0], [0], [1])), ent([0, 2], [1]), 'compactar')
    assert.ok(X.entradasPorDefecto(ent([0], [1], [2]), 3) && !X.entradasPorDefecto(ent([0], [1], [2]), 4) && !X.entradasPorDefecto(ent([0], [2], [1]), 3) && !X.entradasPorDefecto(ent([0, 2], [1]), 2)) })

  terminar()
})
