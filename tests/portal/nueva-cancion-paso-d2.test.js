// «Nueva canción» paso D2: al guardar, si la canción YA tiene un arreglo propio, el servidor agrega AL FINAL de `default_arrangement` SOLO las secciones creadas en ese mismo guardado (filas nuevas), con repeat 1, sin tocar ni reordenar las entradas existentes y sin
// agregar secciones que ya existían y no estaban en el arreglo (se omitieron a propósito). Sin arreglo (null) sigue la regla de D (solo si hay repeticiones). El update comprueba, dentro de sí mismo, que el arreglo sigue como se leyó: si otro guardado se adelantó, no pisa. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const SONG = '11111111-1111-4111-8111-111111111111'
const TEXTO3 = 'VERSO 1:\nuna línea\n\nCORO:\nlínea del coro\n\nPUENTE:\nlínea del puente'
const TEXTO2 = 'VERSO 1:\nuna línea\n\nCORO:\nlínea del coro'
const cuerpo = (texto, o = {}) => ({ songId: SONG, tono: 'F', letra: texto, secciones: E.aSecciones(E.docVacio(texto)), base: 'a'.repeat(32), ...o })
let n = 0; const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const AHORA = new Date('2026-11-12T15:00:00Z')
const sec = (id, code, name, i) => ({ id, code, name, sort_order: i, variantes: [] })
const estado = (arreglo, secs = []) => ({ song: { id: SONG, organization_id: 'ORG', tono_original: 'F', letra: null, default_arrangement: arreglo }, secciones: secs })
const E_VC = [sec('s1', 'V1', 'VERSO 1', 0), sec('s2', 'C', 'CORO', 1)]            // la canción ya tiene VERSO 1 y CORO
const planDe = (e, d) => G.planificar(e, d, AHORA, nuevoId)
const opArreglo = ops => ops.filter(o => o.tipo === 'arreglo')
const entradas = (...ids) => ids.map(([sectionId, label, repeat]) => ({ sectionId, label, repeat }))

// una base en memoria mínima con `.is(col, null)` y `.eq(col, <json>)` sobre jsonb (compara por JSON, como lo hace jsonb); `antesDelArreglo` corre justo antes del update del arreglo (otro guardado que se adelanta)
function baseMem(fila) {
  const db = { songs: [{ id: SONG, organization_id: 'ORG', tono_original: null, letra: null, default_arrangement: null, ...fila }], song_sections: [], song_section_variants: [], song_text_backups: [] }, est = { escrituras: [], antesDelArreglo: null, fallaArreglo: false }
  const from = tabla => { let f = [], modo = 'sel', valor = null, pidio = false
    const api = { select() { pidio = true; return api }, eq(c, v) { f.push(r => r[c] === v || (r[c] !== null && typeof r[c] === 'object' && JSON.stringify(r[c]) === v)); return api }, in(c, vs) { f.push(r => vs.includes(r[c])); return api }, is(c, v) { f.push(r => (v === null ? r[c] === null || r[c] === undefined : r[c] === v)); return api }, maybeSingle() { api.u = true; return api }, update(v) { modo = 'upd'; valor = v; return api }, insert(v) { modo = 'ins'; valor = v; return api },
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
  await prueba('arreglo existente + sección NUEVA: se agrega AL FINAL con repeat 1 y su código como label; las entradas existentes quedan idénticas y en su orden (con repeticiones propias incluidas)', () => {
    const previo = entradas(['s2', 'C', 3], ['s1', 'V1', 1])      // un orden propio: primero el coro ×3 y luego el verso
    const ops = planDe(estado(previo, E_VC), cuerpo(TEXTO3)), a = opArreglo(ops)
    assert.equal(a.length, 1); assert.equal(a[0].paso, 6); assert.equal(ops[ops.length - 1], a[0], 'la última operación'); assert.deepEqual(a[0].previo, previo, 'lleva lo que se leyó, para escribir sin pisar')
    const creada = ops.find(o => o.tipo === 'insert' && o.tabla === 'song_sections').valores, nuevo = a[0].valores.default_arrangement
    assert.deepEqual(nuevo.slice(0, 2), previo, 'las existentes: mismas entradas, mismo orden, mismas repeticiones'); assert.equal(nuevo.length, 3); assert.deepEqual(nuevo[2], { sectionId: creada.id, label: creada.code, repeat: 1 }); assert.equal(creada.name, 'PUENTE')
    assert.deepEqual(previo, entradas(['s2', 'C', 3], ['s1', 'V1', 1]), 'el arreglo leído no se modificó') })

  await prueba('varias secciones nuevas: se agregan en el orden del texto, todas con repeat 1', () => {
    const texto = TEXTO3 + '\n\nFINAL:\nlínea del final', previo = entradas(['s1', 'V1', 1], ['s2', 'C', 2])
    const ops = planDe(estado(previo, E_VC), cuerpo(texto)), nuevo = opArreglo(ops)[0].valores.default_arrangement, creadas = ops.filter(o => o.tipo === 'insert' && o.tabla === 'song_sections').map(o => o.valores)
    assert.deepEqual(creadas.map(c => c.name), ['PUENTE', 'FINAL']); assert.deepEqual(nuevo.slice(0, 2), previo); assert.deepEqual(nuevo.slice(2).map(x => x.sectionId), creadas.map(c => c.id)); assert.deepEqual(nuevo.slice(2).map(x => x.repeat), [1, 1]); assert.deepEqual(nuevo.slice(2).map(x => x.label), creadas.map(c => c.code)) })

  await prueba('arreglo existente + sección YA EXISTENTE omitida a propósito (CORO existe pero no está en el arreglo): NO se agrega; sin secciones nuevas no hay operación; si se crea una nueva, se agrega solo ella', () => {
    const previo = entradas(['s1', 'V1', 1])            // el arreglo omitió el CORO (s2) a propósito
    assert.equal(opArreglo(planDe(estado(previo, E_VC), cuerpo(TEXTO2))).length, 0, 'mismas secciones que ya había: nada que agregar (el CORO sigue fuera)')
    const ops = planDe(estado(previo, E_VC), cuerpo(TEXTO3)), nuevo = opArreglo(ops)[0].valores.default_arrangement, creada = ops.find(o => o.tipo === 'insert' && o.tabla === 'song_sections').valores.id
    assert.deepEqual(nuevo.map(x => x.sectionId), ['s1', creada], 'solo la creada en este guardado; s2 (existente y omitida) no se agrega'); assert.ok(!nuevo.some(x => x.sectionId === 's2')) })

  await prueba('arreglo null: se mantiene la regla de D (solo se escribe si hay repeticiones, con TODAS las secciones); sin repeticiones o sin `arreglo` en el cuerpo, nada', () => {
    const rep = (i) => [{ indice: 0, repeat: 1 }, { indice: 1, repeat: i }]
    const a = opArreglo(planDe(estado(null), cuerpo(TEXTO2, { arreglo: rep(2) }))); assert.equal(a.length, 1); assert.equal(a[0].previo, null); assert.deepEqual(a[0].valores.default_arrangement.map(x => x.repeat), [1, 2]); assert.equal(a[0].valores.default_arrangement.length, 2)
    assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO2, { arreglo: rep(1) }))).length, 0, 'todo ×1: la canción queda sin arreglo propio'); assert.equal(opArreglo(planDe(estado(null), cuerpo(TEXTO2))).length, 0, 'sin `arreglo` en el cuerpo')
    assert.equal(opArreglo(planDe(estado(null, E_VC), cuerpo(TEXTO3))).length, 0, 'agregar una sección a una canción SIN arreglo no crea uno (la lectura usa todas las secciones)')
    assert.equal(opArreglo(planDe(estado(undefined), cuerpo(TEXTO2, { arreglo: rep(2) }))).length, 1, 'ausente cuenta como null') })

  await prueba('con arreglo propio las repeticiones del cuerpo se IGNORAN (nunca se modifican las entradas existentes), aunque haya secciones nuevas', () => {
    const previo = entradas(['s1', 'V1', 1], ['s2', 'C', 1]), d = cuerpo(TEXTO3, { arreglo: [{ indice: 0, repeat: 9 }, { indice: 1, repeat: 9 }, { indice: 2, repeat: 9 }] })
    const nuevo = opArreglo(planDe(estado(previo, E_VC), d))[0].valores.default_arrangement; assert.deepEqual(nuevo.slice(0, 2), previo); assert.equal(nuevo[2].repeat, 1)
    assert.equal(opArreglo(planDe(estado(previo, E_VC), cuerpo(TEXTO2, { arreglo: [{ indice: 1, repeat: 9 }] }))).length, 0, 'sin secciones nuevas, las repeticiones del cuerpo no hacen nada') })

  await prueba('lista vacía, valor raro o un arreglo que no apunta a ninguna sección de la canción: NO se toca (la lectura usaría todas las secciones y agregar cambiaría lo que se ve)', () => {
    for (const a of [[], {}, 'x', 0, [null], entradas(['otra-cancion', 'X', 2]), [{ sectionId: 5 }]]) assert.equal(opArreglo(planDe(estado(a, E_VC), cuerpo(TEXTO3))).length, 0, JSON.stringify(a))
    assert.equal(opArreglo(planDe(estado(entradas(['s1', 'V1', 1]), E_VC), cuerpo(TEXTO3))).length, 1, 'con una entrada que sí apunta a una sección de la canción, sí') })

  await prueba('ejecutar: el update agrega al final dentro de sí mismo; si el arreglo ya no es el que se leyó (otro guardado se adelantó), no pisa nada y el guardado sigue completo', async () => {
    const previo = entradas(['s1', 'V1', 1], ['s2', 'C', 2])
    let m = baseMem({ default_arrangement: previo }); let ops = planDe(estado(previo, E_VC), cuerpo(TEXTO3)); let r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, true)
    const guardado = m.db.songs[0].default_arrangement; assert.equal(guardado.length, 3); assert.deepEqual(guardado.slice(0, 2), previo); assert.equal(guardado[2].repeat, 1); assert.deepEqual(m.est.escrituras.filter(x => x[1] === 'default_arrangement')[0].slice(2), [1], 'tocó una fila')
    m = baseMem({ default_arrangement: previo }); const otro = [{ sectionId: 's2', label: 'C', repeat: 7 }]; m.est.antesDelArreglo = db => { db.songs[0].default_arrangement = otro }
    ops = planDe(estado(previo, E_VC), cuerpo(TEXTO3)); r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, true, 'no es un fallo'); assert.deepEqual(m.db.songs[0].default_arrangement, otro, 'NO se pisó lo que otro escribió'); assert.equal(m.est.escrituras.filter(x => x[1] === 'default_arrangement')[0][2], 0, 'no tocó ninguna fila')
    m = baseMem({ default_arrangement: null }); m.est.antesDelArreglo = db => { db.songs[0].default_arrangement = previo }      // el caso de D: estaba vacío y otro escribió uno
    ops = planDe(estado(null), cuerpo(TEXTO2, { arreglo: [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }] })); r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, true); assert.deepEqual(m.db.songs[0].default_arrangement, previo, 'D sigue sin pisar') })

  await prueba('dos guardados seguidos: el primero agrega la sección nueva; el segundo (ya sin secciones nuevas) no vuelve a agregarla ni duplica entradas', async () => {
    const previo = entradas(['s1', 'V1', 1], ['s2', 'C', 1]), m = baseMem({ default_arrangement: previo })
    const e1 = estado(previo, E_VC); let r = await G.ejecutar(m.admin, planDe(e1, cuerpo(TEXTO3))); assert.equal(r.ok, true); const tras = m.db.songs[0].default_arrangement; assert.equal(tras.length, 3)
    const creada = tras[2].sectionId, e2 = estado(tras, [...E_VC, sec(creada, 'P', 'PUENTE', 2)]); r = await G.ejecutar(m.admin, planDe(e2, cuerpo(TEXTO3))); assert.equal(r.ok, true); assert.deepEqual(m.db.songs[0].default_arrangement, tras, 'sin cambios') })

  await prueba('si el update falla de verdad, el guardado se detiene en el paso 6 (lo demás ya quedó escrito)', async () => {
    const previo = entradas(['s1', 'V1', 1]), m = baseMem({ default_arrangement: previo }); m.est.fallaArreglo = true
    const ops = planDe(estado(previo, E_VC), cuerpo(TEXTO3)), r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, false); assert.equal(r.paso, 6); assert.equal(r.fallo, ops.length - 1); assert.deepEqual(m.db.songs[0].default_arrangement, previo) })

  await prueba('lo demás del plan no cambia con D2: con o sin arreglo propio, las operaciones 0–5 son las mismas; la ruta y la validación del cuerpo siguen igual', () => {
    const sin = planDe(estado(null, E_VC), cuerpo(TEXTO3)).map(o => [o.paso, o.tipo, o.tabla]), con = planDe(estado(entradas(['s1', 'V1', 1]), E_VC), cuerpo(TEXTO3)).slice(0, -1).map(o => [o.paso, o.tipo, o.tabla]); assert.deepEqual(sin, con)
    const g = leer('lib/admin/guardarAcordes.ts'); assert.match(g, /op\.previo === null \? q\.is\('default_arrangement', null\) : q\.eq\('default_arrangement', JSON\.stringify\(op\.previo\)\)\)\.select\('id'\)/, 'la comprobación va dentro del propio update')
    const ruta = leer('app/api/admin/canciones/acordes/route.ts'); assert.match(ruta, /planificar\(a\.estado, d, new Date\(\), randomUUID\)/); assert.ok(!fs.readdirSync(path.join(RAIZ, 'migrations')).some(x => /^057/.test(x)), 'sin migraciones nuevas') })
  terminar()
})
