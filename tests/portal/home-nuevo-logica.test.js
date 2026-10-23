// Lógica de los Home de teléfono rediseñados (bloque A3 · paso 1): calendario semana/mes, marcas, cifras del admin, favoritos y cumpleaños de la semana. PURAS. Correr: `node tests/portal/home-nuevo-logica.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const C = real('lib/home/calendario'), A = real('lib/home/cifrasAdmin'), F = real('lib/home/favoritos'), { cumpleanosDeLaSemana } = real('lib/portal/cumpleanos'), T = real('lib/textos/homeNuevo')
const eq = (teamId, nombre, o = {}) => ({ teamId, nombre, color: 'cobalto', asignados: 0, convocados: 0, confirmados: 0, rechazos: 0, sinResponder: 0, vacantes: 0, estado: 'convocado', ...o })
const sv = (id, fecha, equipos, o = {}) => ({ id, fecha, titulo: id, horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos, ...o })
const ADMIN = { kind: 'admin' }, LIDER = ids => ({ kind: 'leader', teamIds: new Set(ids) })
const inv = (status, o = {}) => ({ status, sent_at: '2026-10-01', declined_reason: null, ...o })

correr(async () => {
  console.log('calendario')
  await prueba('semana: lunes a domingo de la fecha dada, con hoy marcado (el 21 de octubre de 2026 es miércoles)', async () => {
    const s = C.semanaDe('2026-10-21', '2026-10-21'); assert.deepEqual(s.map(d => d.numero), [19, 20, 21, 22, 23, 24, 25]); assert.deepEqual(s.map(d => d.letra), ['L', 'M', 'M', 'J', 'V', 'S', 'D']); assert.deepEqual(s.filter(d => d.esHoy).map(d => d.fecha), ['2026-10-21'])
    assert.deepEqual(C.semanaDe('2026-10-25').map(d => d.numero), [19, 20, 21, 22, 23, 24, 25], 'un domingo cierra su semana'); assert.deepEqual(C.semanaDe('2026-11-02').map(d => d.fecha.slice(5)), ['11-02', '11-03', '11-04', '11-05', '11-06', '11-07', '11-08']); assert.deepEqual(C.semanaDe('basura'), []) })
  await prueba('mes: semanas completas de siete días con los días de los meses vecinos aparte; navegar entre meses y años; título', async () => {
    const m = C.mesDe(2026, 10, '2026-10-21'); assert.ok(m.every(f => f.length === 7)); assert.equal(m.length, 5); assert.deepEqual([m[0][0].fecha, m[4][6].fecha], ['2026-09-28', '2026-11-01']); assert.equal(m.flat().filter(d => d.delMes).length, 31); assert.deepEqual(m.flat().filter(d => d.esHoy).map(d => d.fecha), ['2026-10-21'])
    assert.equal(C.mesDe(2027, 2).length, 4, 'febrero de 2027 (lunes a domingo exactos) cabe en cuatro semanas'); assert.equal(C.mesDe(2026, 2).length, 5); assert.deepEqual(C.mesDe(2026, 13), []); assert.deepEqual(C.moverMes({ anio: 2026, mes: 12 }, 1), { anio: 2027, mes: 1 }); assert.deepEqual(C.moverMes({ anio: 2026, mes: 1 }, -1), { anio: 2025, mes: 12 }); assert.equal(C.tituloMes(2026, 10), 'Octubre 2026') })
  await prueba('marcas del usuario: SOLO sus convocatorias enviadas y vigentes (relleno = servicio, anillo = ensayo, con el color de su equipo) y sus días bloqueados (raya); no cuentan las declinadas ni las sin enviar', async () => {
    const e = (id, fecha, tipo, status, team, extra) => ({ service: { id, fecha, tipo }, team: { id: team, color: team === 't1' ? 'cobalto' : 'rosa' }, invitation: inv(status, extra) })
    const m = C.marcasDeUsuario([e('s1', '2026-10-25', 'servicio', 'pendiente', 't1'), e('r1', '2026-10-25', 'ensayo', 'confirmado', 't2'), e('s2', '2026-11-01', 'servicio', 'declinado', 't1'), e('s3', '2026-11-08', 'servicio', 'declinado', 't1', { declined_reason: 'conflict' }), { service: { id: 's4', fecha: '2026-11-15', tipo: 'servicio' }, team: { id: 't1', color: 'cobalto' }, invitation: inv('pendiente', { sent_at: null }) }], ['2026-10-27', '2026-10-25'])
    assert.deepEqual(m.get('2026-10-25').map(x => x.tipo), ['servicio', 'ensayo', 'bloqueado'], 'orden: servicio, ensayo, bloqueado'); assert.deepEqual(m.get('2026-10-25').map(x => x.color), ['cobalto', 'rosa', null]); assert.deepEqual(m.get('2026-10-27').map(x => x.tipo), ['bloqueado'])
    for (const f of ['2026-11-01', '2026-11-08', '2026-11-15']) assert.equal(m.get(f), undefined, f + ' sin marcas') })
  await prueba('bloqueado en cualquiera de sus equipos: una sola fila de un solo equipo basta (a diferencia de «para todos»); el bloqueo ligado a un servicio usa la fecha del servicio', async () => {
    const d = C.diasBloqueadosEnAlguno([{ blocked_date: '2026-10-27', team_id: 't1' }, { blocked_date: null, service: { fecha: '2026-11-01' }, team_id: null }, { blocked_date: null }]); assert.deepEqual(Array.from(d).sort(), ['2026-10-27', '2026-11-01']) })
  await prueba('marcas del admin: un punto del color de cada equipo que participa; ensayo = anillo; un líder solo ve sus equipos; un servicio sin equipos lleva un punto neutro', async () => {
    const lista = [sv('s1', '2026-10-25', [eq('t1', 'Alabanza', { color: 'cobalto' }), eq('t2', 'Producción', { color: 'rosa' })]), sv('e1', '2026-10-25', [eq('t1', 'Alabanza')], { tipo: 'ensayo' }), sv('n', '2026-11-01', [])]
    const a = C.marcasDeAdmin(lista, ADMIN); assert.deepEqual(a.get('2026-10-25').map(x => x.tipo + ':' + x.color), ['servicio:cobalto', 'servicio:rosa', 'ensayo:cobalto']); assert.deepEqual(a.get('2026-11-01').map(x => x.color), [null])
    const l = C.marcasDeAdmin(lista, LIDER(['t2'])); assert.deepEqual(l.get('2026-10-25').map(x => x.color), ['rosa']); assert.equal(C.servicioDelDia(a.get('2026-10-25')).servicioId, 's1') })
  await prueba('tocar un día: con servicio o ensayo abre ese servicio; un día vacío o solo bloqueado no hace nada; se dibujan como mucho tres marcas', async () => {
    assert.equal(C.servicioDelDia(undefined), null); assert.equal(C.servicioDelDia([{ tipo: 'bloqueado', color: null }]), null); assert.deepEqual(C.servicioDelDia([{ tipo: 'ensayo', color: null, servicioId: 'e1', equipoId: 't1' }]), { servicioId: 'e1', equipoId: 't1' })
    assert.equal(C.marcasVisibles(Array.from({ length: 5 }, () => ({ tipo: 'servicio', color: null }))).length, 3) })

  console.log('cifras del admin')
  const lista = [sv('hoyEnsayo', '2026-10-22', [eq('t1', 'Alabanza', { convocados: 9 })], { tipo: 'ensayo' }), sv('p', '2026-10-25', [eq('t1', 'Alabanza', { color: 'rosa', asignados: 2, vacantes: 3, convocados: 5, confirmados: 1 }), eq('t2', 'Producción', { color: 'cobalto', asignados: 3, vacantes: 0, convocados: 3, confirmados: 0 })]), sv('q', '2026-11-01', [eq('t1', 'Alabanza', { estado: 'sin-convocar', vacantes: 3 })]), sv('r', '2026-11-08', [])]
  await prueba('el próximo servicio es el primero que no terminó y no es ensayo; barras de cobertura 2/5 y 3/3; «Voluntarios Citados» = 5 + 3 = 8; un líder ve solo lo suyo', async () => {
    const p = A.proximoServicio(lista, ADMIN); assert.equal(p.id, 'p'); assert.deepEqual(A.coberturaDe(p, ADMIN).map(c => [c.inicial, c.cubiertos, c.cupos]), [['A', 2, 5], ['P', 3, 3]]); assert.equal(A.voluntariosCitados(p, ADMIN), 8)
    assert.equal(A.voluntariosCitados(p, LIDER(['t2'])), 3); assert.deepEqual(A.coberturaDe(p, LIDER(['t2'])).map(c => c.nombre), ['Producción']); assert.equal(A.proximoServicio(lista, LIDER(['t9'])).id, 'r', 'un servicio sin equipos todavía lo ve cualquiera'); assert.equal(A.proximoServicio([sv('t', '2026-10-01', [], { terminado: true })], ADMIN), null) })
  await prueba('las tres cifras: equipos, citados y «con la app» = personas con la app instalada sobre todas las que ve (no cuenta avisos push)', async () => {
    const c = A.cifrasAdmin({ proximo: A.proximoServicio(lista, ADMIN), v: ADMIN, equipos: 4, personas: [{ instaladaApp: true }, { instaladaApp: false }, { instaladaApp: true }, { instaladaApp: false }] }); assert.deepEqual(c, { equipos: 4, citados: 8, conApp: 2, deTotal: 4 })
    assert.deepEqual(A.cifrasAdmin({ proximo: null, v: ADMIN, equipos: 0, personas: [] }), { equipos: 0, citados: 0, conApp: 0, deTotal: 0 }) })
  await prueba('tarjetas por equipo: personas, cubiertos y confirmados del próximo; un equipo que no participa dice «sin asignar»; un líder, solo sus equipos', async () => {
    const equipos = [{ id: 't1', name: 'Alabanza', color: 'rosa' }, { id: 't2', name: 'Producción', color: 'cobalto' }, { id: 't3', name: 'Montaje', color: 'verde' }], p = A.proximoServicio(lista, ADMIN)
    const t = A.tarjetasDeEquipo({ equipos, personasPorEquipo: { t1: 12, t2: 8 }, proximo: p, v: ADMIN }); assert.deepEqual(t.map(x => [x.inicial, x.personas, x.cubiertos, x.cupos, x.confirmados]), [['A', 12, 2, 5, 1], ['P', 8, 3, 3, 0], ['M', 0, null, null, null]])
    assert.deepEqual(A.tarjetasDeEquipo({ equipos, personasPorEquipo: {}, proximo: p, v: LIDER(['t2']) }).map(x => x.teamId), ['t2']); assert.equal(T.proximoCubiertos(2, 5), 'Próximo: 2 de 5 cubiertos'); assert.equal(T.proximoCubiertos(1, 1), 'Próximo: 1 de 1 cubierto'); assert.equal(T.proximoCubiertos(null, null), 'Próximo: sin asignar'); assert.equal(T.personasN(1), '1 persona'); assert.equal(T.confirmadosN(0), '0 confirmados') })
  await prueba('«Después»: los servicios siguientes como filas, sin el que ya es la ficha grande, máximo tres; un servicio nuevo sin equipos también sale', async () => {
    const d = A.despues(lista, ADMIN, A.proximoServicio(lista, ADMIN)); assert.deepEqual(d.map(f => f.servicioId), ['hoyEnsayo', 'q', 'r']); assert.equal(A.despues(lista, ADMIN, A.proximoServicio(lista, ADMIN), 1).length, 1) })

  console.log('usuario')
  await prueba('favoritos: solo los marcados, por nombre, «Tono G · 72 BPM» (sin inventar lo que falta) y hasta 12', async () => {
    const cat = [{ id: 'a', nombre: 'Sublime gracia', tono_original: 'D', bpm: 68 }, { id: 'b', nombre: 'Cuán grande es Él', tono_original: 'G', bpm: 72 }, { id: 'c', nombre: 'Sin datos' }, { id: 'd', nombre: 'No favorita', tono_original: 'A', bpm: 70 }]
    const f = F.fichasFavoritas(cat, new Set(['a', 'b', 'c'])); assert.deepEqual(f.map(x => [x.nombre, x.detalle]), [['Cuán grande es Él', 'Tono G · 72 BPM'], ['Sin datos', ''], ['Sublime gracia', 'Tono D · 68 BPM']]); assert.equal(F.detalleFavorita({ tono_original: 'E' }), 'Tono E'); assert.equal(F.detalleFavorita({ bpm: 90 }), '90 BPM'); assert.equal(F.fichasFavoritas(Array.from({ length: 20 }, (_, i) => ({ id: 'x' + i, nombre: 'C' + i })), new Set(Array.from({ length: 20 }, (_, i) => 'x' + i))).length, 12) })
  await prueba('cumpleaños: solo los de los días de la semana que se muestra (día y mes, nunca el año); sin ninguno, no hay fila', async () => {
    const cumples = [{ id: '1', nombre: 'Ana', apellido: null, avatar_url: null, dia: 24, mes: 10, enDias: 3 }, { id: '2', nombre: 'Beto', apellido: null, avatar_url: null, dia: 2, mes: 11, enDias: 12 }, { id: '3', nombre: 'Cami', apellido: null, avatar_url: null, dia: 19, mes: 10, enDias: 0 }]
    const sem = C.semanaDe('2026-10-21').map(d => d.fecha); assert.deepEqual(cumpleanosDeLaSemana(cumples, sem).map(c => c.nombre), ['Ana', 'Cami']); assert.deepEqual(cumpleanosDeLaSemana(cumples.slice(1, 2), sem), []) })
  await prueba('las reglas de datos: ningún porcentaje individual y nada de quién rechazó en la lógica ni en los textos', async () => {
    for (const f of ['lib/home/calendario.ts', 'lib/home/cifrasAdmin.ts', 'lib/home/favoritos.ts', 'lib/textos/homeNuevo.ts']) { const t = fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s%\s/g, ' MOD '); assert.ok(!/%/.test(t), f + ' sin porcentajes (el resto de una división no cuenta)'); assert.ok(!/rechaz/i.test(t), f + ' no habla de quién rechazó') } })
  terminar()
})
