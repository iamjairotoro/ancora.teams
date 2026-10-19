// Home en teléfono (Home · D): la vista en la URL, el recorte por rol (un líder no recibe respuesta ni carga ni cumpleaños de equipos ajenos; el administrador, las MISMAS listas), los textos cortos, los cumpleaños
// (5, 30 días, solo día y mes) y que el Home de ESCRITORIO (Home.tsx) no haya cambiado. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs'), crypto = require('crypto')
const real = n => require(resolver(path.join(RAIZ, n)))
const { vistaDeUrl, urlConVista, VISTAS_HOME } = real('lib/home/vistaMovil')
const { personasDeEquipos, respuestasVisibles, cargaVisible, personasVisibles } = real('lib/home/recorteLider')
const { nombreCorto, cuandoCumple, textoServicios } = real('lib/home/formato')
const { proximosCumpleanos } = real('lib/portal/cumpleanos')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const H = 'http://x.test/home'

correr(async () => {
  console.log('la vista en la URL')
  await prueba('?vista= elige Hoy, Calendario o Equipos; lo desconocido o ausente es «Hoy»; «Hoy» no deja parámetro y cambiar de vista conserva lo demás', async () => {
    assert.deepEqual(VISTAS_HOME.map(v => v.texto), ['Hoy', 'Calendario', 'Equipos'])
    for (const [q, v] of [['', 'hoy'], ['vista=calendario', 'calendario'], ['vista=equipos', 'equipos'], ['vista=hoy', 'hoy'], ['vista=otra', 'hoy'], ['vista=', 'hoy']]) assert.equal(vistaDeUrl(new URLSearchParams(q)), v, q)
    assert.equal(urlConVista(H, 'calendario'), '/home?vista=calendario'); assert.equal(urlConVista(H + '?x=1&vista=calendario#a', 'equipos'), '/home?x=1&vista=equipos#a'); assert.equal(urlConVista(H + '?vista=equipos', 'hoy'), '/home'); assert.equal(urlConVista(H, 'hoy'), null); assert.equal(urlConVista(H + '?vista=equipos', 'equipos'), null) })
  await prueba('la vista se escribe con history.replaceState(null, …) y se lee al cargar (así «atrás» vuelve a la misma vista)', async () => {
    const p = leer('app/home/page.tsx'); assert.ok(/window\.history\.replaceState\(null, '', nueva\)/.test(p) && /vistaDeUrl\(new URLSearchParams\(window\.location\.search\)\)/.test(p)) })

  console.log('recorte por rol')
  const admin = { kind: 'admin' }, lider = { kind: 'leader', teamIds: new Set(['t1']) }
  const tm = [{ member_id: 'a', team_id: 't1' }, { member_id: 'b', team_id: 't1' }, { member_id: 'b', team_id: 't2' }, { member_id: 'c', team_id: 't2' }]
  const respuestas = [{ teamId: 't1', confirmedPct: 90 }, { teamId: 't2', confirmedPct: 80 }]
  const carga = [{ personId: 'c', count: 9, maxCount: 9 }, { personId: 'a', count: 4, maxCount: 9 }, { personId: 'b', count: 2, maxCount: 9 }]
  const personas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const mis = personasDeEquipos(tm, lider.teamIds)
  await prueba('un LÍDER solo ve la respuesta de su equipo, la carga de las personas de su equipo (con la escala del grupo que ve) y a las personas de su equipo', async () => {
    assert.deepEqual([...mis].sort(), ['a', 'b']); assert.deepEqual(respuestasVisibles(respuestas, lider), [respuestas[0]])
    assert.deepEqual(cargaVisible(carga, lider, mis), [{ personId: 'a', count: 4, maxCount: 4 }, { personId: 'b', count: 2, maxCount: 4 }], 'c es de otro equipo; la escala pasa de 9 a 4')
    assert.deepEqual(personasVisibles(personas, lider, mis).map(p => p.id), ['a', 'b']) })
  await prueba('un líder sin equipos no ve nada; el recorte no inventa datos', async () => {
    const nada = { kind: 'leader', teamIds: new Set() }; assert.deepEqual(respuestasVisibles(respuestas, nada), []); assert.deepEqual(cargaVisible(carga, nada, personasDeEquipos(tm, nada.teamIds)), []); assert.deepEqual(personasVisibles(personas, nada, new Set()), []) })
  await prueba('el ADMINISTRADOR recibe las MISMAS listas (misma referencia): su Home no cambia', async () => {
    assert.equal(respuestasVisibles(respuestas, admin), respuestas); assert.equal(cargaVisible(carga, admin, mis), carga); assert.equal(personasVisibles(personas, admin, mis), personas) })
  await prueba('la página aplica el recorte a las listas del escritorio Y del teléfono (no solo al teléfono)', async () => {
    const p = leer('app/home/page.tsx'); assert.ok(/teamResponses: teamResponsesVisibles,\s*volunteerLoad: volunteerLoadVisible,/.test(p)); assert.ok(/respuestas: teamResponsesVisibles, carga: volunteerLoadVisible/.test(p)); assert.ok(/const birthdayEntries = useMemo\(\(\) => miembrosVisibles/.test(p)); assert.ok(/proximosCumpleanos\(miembrosVisibles/.test(p)) })

  console.log('textos y cumpleaños')
  await prueba('nombres cortos («Ana M.»), «Hoy / Mañana / 24 oct» (sin año) y «1 servicio / 11 servicios»', async () => {
    assert.equal(nombreCorto('Ana', 'Mora'), 'Ana M.'); assert.equal(nombreCorto('Ana', ''), 'Ana'); assert.equal(nombreCorto('', ''), '—'); assert.equal(nombreCorto('ana', 'ñandú'), 'ana Ñ.')
    assert.equal(cuandoCumple({ dia: 19, mes: 10, enDias: 0 }), 'Hoy'); assert.equal(cuandoCumple({ dia: 20, mes: 10, enDias: 1 }), 'Mañana'); assert.equal(cuandoCumple({ dia: 24, mes: 10, enDias: 5 }), '24 oct'); assert.equal(cuandoCumple({ dia: 2, mes: 11, enDias: 14 }), '2 nov')
    assert.equal(textoServicios(1), '1 servicio'); assert.equal(textoServicios(11), '11 servicios'); assert.equal(textoServicios(0), '0 servicios') })
  await prueba('cumpleaños: hasta 5, ventana de 30 días, cruzando de mes, ordenados por cercanía, solo día y mes (nunca el año)', async () => {
    const filas = [['a', 5, 10], ['b', 24, 10], ['c', 2, 11], ['d', 10, 11], ['e', 15, 11], ['f', 18, 11], ['g', 30, 12]].map(([id, d, m]) => ({ id, nombre: id.toUpperCase(), fecha_nacimiento: `1990-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }))
    filas.push({ id: 'hoy', nombre: 'Hoy', fecha_nacimiento: '1985-10-19' })
    const c = proximosCumpleanos(filas, '2026-10-19', { limite: 5, ventana: 30 }); assert.deepEqual(c.map(x => x.id), ['hoy', 'b', 'c', 'd', 'e'], 'los 5 más cercanos; «f» (18 nov) cae fuera del tope y «g» (30 dic) fuera de la ventana')
    assert.deepEqual(c.map(x => cuandoCumple(x)), ['Hoy', '24 oct', '2 nov', '10 nov', '15 nov']); for (const x of c) assert.ok(!('anio' in x) && !('fecha_nacimiento' in x), 'sin año') })

  console.log('escritorio y «Hoy»')
  await prueba('Home.tsx (el Home de ESCRITORIO) no cambió: el archivo tiene el mismo contenido de siempre', async () => {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, 'components/home/Home.tsx'))).digest('hex'); assert.equal(h, '4f077557772eb3acaaf04a4f4beaca55bae90431affb52908c6c9c22309487b4', 'si cambia a propósito (rediseño de escritorio), se actualiza este valor') })
  await prueba('«Necesita atención» NO está en la vista Hoy del teléfono, y su cálculo sigue en la página (lo usa el escritorio)', async () => {
    const hoy = leer('components/home/VistaHoy.tsx').replace(/\/\/.*$/gm, ''); assert.ok(!/atenci/i.test(hoy) && !/attention/.test(hoy)); const p = leer('app/home/page.tsx'); assert.ok(/const attention: AttentionItem\[\] = useMemo/.test(p) && /attention,\n    upcoming,/.test(p)) })
  await prueba('el teléfono usa HomeMovil y el escritorio el Home de siempre, según el ancho (con un hueco mientras se mide para no pintar el equivocado)', async () => {
    const p = leer('app/home/page.tsx'); assert.ok(/telefono === null \? <div aria-hidden="true"[^>]*\/> : telefono \? homeMovil : <Home \{\.\.\.homeProps\} \/>/.test(p)) })
  terminar()
})
