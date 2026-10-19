// Home en teléfono (Home · D): la vista en la URL, el recorte por rol (un líder no recibe respuesta ni carga ni cumpleaños de equipos ajenos; el administrador, las MISMAS listas), los textos cortos, los cumpleaños
// (5, 30 días, solo día y mes) y que el Home de ESCRITORIO (Home.tsx) no haya cambiado. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ, fijarReloj, soltarReloj } = require('./_banco')
const path = require('path'), fs = require('fs'), crypto = require('crypto')
const real = n => require(resolver(path.join(RAIZ, n)))
const { vistaDeUrl, urlConVista, VISTAS_HOME } = real('lib/home/vistaMovil')
const { personasDeEquipos, respuestasVisibles, cargaVisible, personasVisibles } = real('lib/home/recorteLider')
const { nombreCorto, cuandoCumple, textoServicios } = real('lib/home/formato')
const { proximosCumpleanos } = real('lib/portal/cumpleanos')
const { hoyEnSantiago } = real('lib/portal/fechas')
const { tarjetasHoy, filasProximos, fechaLarga, horario, textoConfirmados, textoEstado, MAX_LINEAS_TARJETA } = real('lib/home/hoy')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const H = 'http://x.test/home'

// El Home depende de «hoy» (cumpleaños, próximos, «terminado»): se FIJA el reloj en un lunes 19 de octubre de 2026, 12:00 en Chile, y no se lee la hora real.
fijarReloj('2026-10-19T15:00:00Z')
correr(async () => {
  console.log('el reloj fijo')
  await prueba('con el reloj fijo, «hoy» en Chile es el 19 de octubre de 2026 y es el que usa el Home para sus cumpleaños (el cumpleaños de ese día sale «Hoy»)', async () => {
    assert.equal(hoyEnSantiago(), '2026-10-19'); assert.equal(new Date().toISOString(), '2026-10-19T15:00:00.000Z'); assert.equal(Date.now(), new Date('2026-10-19T15:00:00Z').getTime()); assert.equal(new Date('2020-02-02T00:00:00Z').getUTCFullYear(), 2020, 'con argumentos, Date no cambia')
    const c = proximosCumpleanos([{ id: 'x', nombre: 'Ana', fecha_nacimiento: '1990-10-19' }, { id: 'y', nombre: 'Beto', fecha_nacimiento: '1985-10-24' }], hoyEnSantiago(), { limite: 5, ventana: 30 }); assert.deepEqual(c.map(k => [k.id, k.enDias]), [['x', 0], ['y', 5]]) })
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

  console.log('vista Hoy (desde el resumen)')
  const eq = (teamId, nombre, convocados, confirmados, estado = 'convocado') => ({ teamId, nombre, color: null, asignados: convocados, convocados, confirmados, rechazos: 0, sinResponder: convocados - confirmados, vacantes: 0, estado })
  const sv = (id, fecha, equipos, extra = {}) => ({ id, fecha, titulo: id, horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos, ...extra })
  const cinco = ['t1', 't2', 't3', 't4', 't5'].map((t, i) => eq(t, 'Equipo ' + (i + 1), 10, 9))
  const servicios = [sv('pasado', '2026-10-12', [eq('t1', 'Alabanza', 10, 10)], { terminado: true }), sv('ensayo', '2026-10-22', [eq('t1', 'Alabanza', 4, 2)], { tipo: 'ensayo' }), sv('s25', '2026-10-25', [eq('t1', 'Alabanza', 10, 9), eq('t2', 'Producción', 4, 4), eq('t3', 'Bienvenida', 0, 0, 'sin-convocar')]), sv('s1', '2026-11-01', [eq('t1', 'Alabanza', 10, 0, 'sin-convocar')])]
  await prueba('textos: «Domingo, 25 de octubre», «10:00 — 14:00», «9 de 10» y Convocado / Sin convocar', async () => {
    assert.equal(fechaLarga('2026-10-25'), 'Domingo, 25 de octubre'); assert.equal(fechaLarga('2026-11-01'), 'Domingo, 1 de noviembre'); assert.equal(horario({ horaInicio: '10:00:00', horaFin: '14:00:00' }), '10:00 — 14:00'); assert.equal(horario({ horaInicio: '19:30:00', horaFin: null }), '19:30'); assert.equal(horario({ horaInicio: null, horaFin: null }), '')
    assert.equal(textoConfirmados(eq('t', 'x', 10, 9)), '9 de 10'); assert.equal(textoConfirmados(eq('t', 'x', 0, 0, 'sin-convocar')), 'Sin convocar'); assert.equal(textoEstado(eq('t', 'x', 1, 1)), 'Convocado'); assert.equal(textoEstado(eq('t', 'x', 0, 0, 'sin-convocar')), 'Sin convocar') })
  await prueba('ADMINISTRADOR: UNA tarjeta por SERVICIO (el próximo servicio que no terminó, no el ensayo ni el pasado) con una línea por equipo, sin barra sumada', async () => {
    const t = tarjetasHoy(servicios, admin); assert.equal(t.length, 1); assert.equal(t[0].servicioId, 's25'); assert.equal(t[0].modo, 'servicio'); assert.equal(t[0].titulo, 'Domingo, 25 de octubre'); assert.equal(t[0].horario, '10:00 — 14:00')
    assert.deepEqual(t[0].equipos.map(e => e.nombre), ['Alabanza', 'Producción', 'Bienvenida']); assert.equal(t[0].masEquipos, 0); assert.ok(!('progreso' in t[0]) && !('confirmados' in t[0]), 'sin datos sumados') })
  await prueba('máximo 3 líneas y «+N» si hay más equipos', async () => {
    const t = tarjetasHoy([sv('grande', '2026-10-25', cinco)], admin)[0]; assert.equal(MAX_LINEAS_TARJETA, 3); assert.equal(t.equipos.length, 3); assert.equal(t.masEquipos, 2) })
  await prueba('LÍDER: la tarjeta de SU equipo (una por equipo que lidera) y nada de los demás; si su equipo no participa, no hay tarjeta', async () => {
    const l1 = { kind: 'leader', teamIds: new Set(['t2']) }, t = tarjetasHoy(servicios, l1); assert.equal(t.length, 1); assert.equal(t[0].modo, 'equipo'); assert.deepEqual(t[0].equipos.map(e => e.nombre), ['Producción']); assert.equal(t[0].servicioId, 's25')
    assert.equal(tarjetasHoy(servicios, { kind: 'leader', teamIds: new Set(['t9']) }).length, 0); assert.deepEqual(tarjetasHoy(servicios, { kind: 'leader', teamIds: new Set(['t1', 't2']) }).map(x => x.equipos[0].nombre), ['Alabanza', 'Producción']) })
  await prueba('«Próximos servicios»: una fila por servicio y equipo, en orden de fecha, sin lo terminado; el ensayo lleva «Ensayo ·»; «Sin convocar» sin número', async () => {
    const { filas, total } = filasProximos(servicios, admin, 10); assert.equal(total, 5); assert.deepEqual(filas.map(f => f.nombre), ['Ensayo · Alabanza', 'Alabanza', 'Producción', 'Bienvenida', 'Alabanza'])
    assert.deepEqual(filas.map(f => `${f.dia} ${f.mes}`), ['22 oct', '25 oct', '25 oct', '25 oct', '1 nov']); assert.equal(filas[1].detalle, '10:00 – 14:00 · 9 de 10'); assert.equal(filas[3].detalle, '10:00 – 14:00 · Sin convocar'); assert.ok(filas[3].sinConvocar && !filas[1].sinConvocar) })
  await prueba('el tope de filas lo respeta y dice cuántas hay; el líder solo ve filas de su equipo', async () => {
    const r = filasProximos(servicios, admin, 3); assert.equal(r.filas.length, 3); assert.equal(r.total, 5)
    assert.deepEqual(filasProximos(servicios, { kind: 'leader', teamIds: new Set(['t2']) }).filas.map(f => f.nombre), ['Producción']) })
  await prueba('la vista Hoy sale del resumen: el administrador del servidor (ruta que exige administrador) y el líder del mismo cálculo puro sobre los datos que el Home ya carga', async () => {
    const p = leer('app/home/page.tsx'); assert.ok(/useResumenServicios\(viewerIsAdmin && telefono === true && vista === 'hoy'\)/.test(p)); assert.ok(/servicios: viewerIsAdmin \? resumenAdmin\.servicios : resumenLider/.test(p)); assert.ok(/resumenServicios\(\{ services: svs/.test(p))
    const h = leer('components/home/useResumenServicios.ts'); assert.ok(h.includes("fetch('/api/admin/servicios-resumen'")) })

  console.log('escritorio y «Hoy»')
  await prueba('Home.tsx (el Home de ESCRITORIO) no cambió: el archivo tiene el mismo contenido de siempre', async () => {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(RAIZ, 'components/home/Home.tsx'))).digest('hex'); assert.equal(h, '1439bae30cc00a8c3f38e80530637c50f775c295c59e84e6742bd3c53fa3f7b8', 'si cambia a propósito (rediseño de escritorio), se actualiza este valor') })
  await prueba('«Necesita atención» NO está en la vista Hoy del teléfono, y su cálculo sigue en la página (lo usa el escritorio)', async () => {
    const hoy = leer('components/home/VistaHoy.tsx').replace(/\/\/.*$/gm, ''); assert.ok(!/atenci/i.test(hoy) && !/attention/.test(hoy)); const p = leer('app/home/page.tsx'); assert.ok(/const attention: AttentionItem\[\] = useMemo/.test(p) && /attention,\n    upcoming,/.test(p)) })
  await prueba('el teléfono usa HomeMovil y el escritorio el Home de siempre, según el ancho (con un hueco mientras se mide para no pintar el equivocado)', async () => {
    const p = leer('app/home/page.tsx'); assert.ok(/telefono === null \? <div aria-hidden="true"[^>]*\/> : telefono \? homeMovil : <Home \{\.\.\.homeProps\} \/>/.test(p)) })
  soltarReloj()
  terminar()
})
