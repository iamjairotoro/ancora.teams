// Resumen de servicios por equipo (lista de Servicios y Home «Hoy» en teléfono). Parte pura (lib/admin/resumenServicios.ts) y ruta GET /api/admin/servicios-resumen.
// Pura: conteos por equipo con las reglas compartidas; una convocatoria cerrada o un servicio terminado NO cuentan en «sin responder»; historial acotado a 10; sin datos personales.
// Ruta: 401 sin sesión, 403 sin permiso, la organización sale de la SESIÓN (un parámetro no la cambia; un admin de otra organización solo ve la suya), solo lectura, sin datos personales.
const { assert, db, ID, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ, fijarReloj, soltarReloj } = require('../portal/_banco')
const path = require('path')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
const real = n => require(resolver(path.join(RAIZ, n)))
let sesion = { email: null, admins: {} }       // admins: correo → organización de la que es administrador
stubs['@/lib/supabase-server'] = { createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: sesion.email ? { email: sesion.email } : null } }) }, rpc: async (fn, a) => ({ data: fn === 'is_org_admin' && sesion.admins[a.p_email] === a.p_organization_id }) }) }
const { resumenServicios, HISTORIAL_MAXIMO } = real('lib/admin/resumenServicios')
const ruta = real('app/api/admin/servicios-resumen/route')

const AHORA = new Date('2026-10-19T15:00:00Z')      // 12:00 en Chile
const svc = (id, fecha, ini = '10:00:00', fin = '14:00:00', extra = {}) => ({ id, fecha, titulo: id, hora_inicio: ini, hora_fin: fin, tipo: 'servicio', ...extra })
const teams = [{ id: 't1', name: 'Alabanza', color: 'cobalto', sort_order: 1 }, { id: 't2', name: 'Producción', color: 'naranja', sort_order: 2 }, { id: 't3', name: 'Archivado', color: null, sort_order: 3, archived_at: '2026-01-01' }]
const positions = [{ id: 'p1', team_id: 't1' }, { id: 'p2', team_id: 't1' }, { id: 'p3', team_id: 't2' }]
const inv = (service_id, member_id, team_id, status, extra = {}) => ({ service_id, member_id, team_id, status, declined_reason: null, sent_at: '2026-10-01', ...extra })
const banda = (service_id, team_position_id, member_id, slot_index = 1) => ({ service_id, team_position_id, member_id, slot_index })

correr(async () => {
  console.log('resumen por equipo (parte pura)')
  const base = {
    services: [svc('s25', '2026-10-25')], teams, positions,
    invitations: [inv('s25', 'm1', 't1', 'confirmado'), inv('s25', 'm2', 't1', 'pendiente'), inv('s25', 'm3', 't1', 'declinado'), inv('s25', 'm4', 't1', 'declinado', { declined_reason: 'conflict' }), inv('s25', 'm5', 't1', 'pendiente', { sent_at: null }), inv('s25', 'm1', 't2', 'pendiente')],
    assignments: [banda('s25', 'p1', 'm1'), banda('s25', 'p1', 'm2', 2), banda('s25', 'p3', 'm1')],
    slots: [{ service_id: 's25', team_position_id: 'p1', slots_needed: 3 }], ahora: AHORA,
  }
  const r = resumenServicios(base)
  await prueba('conteos por equipo: asignados, convocados, confirmados, rechazos, sin responder y vacantes; «aceptó en otro equipo» y lo no enviado no cuentan; los equipos archivados no salen', async () => {
    assert.equal(r.length, 1); const [a, p] = r[0].equipos; assert.equal(r[0].equipos.length, 2, 'Alabanza y Producción (t3 está archivado)')
    assert.deepEqual({ ...a, color: undefined }, { teamId: 't1', nombre: 'Alabanza', color: undefined, asignados: 2, convocados: 3, confirmados: 1, rechazos: 1, sinResponder: 1, vacantes: 2, estado: 'convocado' }, 'p1 pide 3 y tiene 2 → 1; p2 pide 1 (por defecto) y no tiene a nadie → 1')
    assert.equal(a.color, 'cobalto'); assert.deepEqual([p.convocados, p.sinResponder, p.vacantes, p.estado], [1, 1, 0, 'convocado']) })
  await prueba('una persona en dos equipos cuenta en CADA equipo y una sola vez dentro de cada uno', async () => {
    const x = resumenServicios({ ...base, invitations: [inv('s25', 'm1', 't1', 'confirmado'), inv('s25', 'm1', 't1', 'confirmado'), inv('s25', 'm1', 't2', 'confirmado')] })[0].equipos
    assert.deepEqual(x.map(e => e.convocados), [1, 1]); assert.deepEqual(x.map(e => e.confirmados), [1, 1]) })
  await prueba('«sin convocar»: un equipo con gente asignada y ninguna invitación enviada; un equipo que no participa del servicio no aparece', async () => {
    const x = resumenServicios({ ...base, invitations: [], slots: [] })[0].equipos; assert.deepEqual(x.map(e => [e.nombre, e.estado, e.convocados]), [['Alabanza', 'sin-convocar', 0], ['Producción', 'sin-convocar', 0]])
    const y = resumenServicios({ ...base, invitations: [], assignments: [banda('s25', 'p3', 'm1')], slots: [] })[0].equipos; assert.deepEqual(y.map(e => e.nombre), ['Producción']) })
  await prueba('REGLAS COMPARTIDAS: en un servicio TERMINADO o con la convocatoria CERRADA nadie queda «sin responder» (aunque su invitación siga pendiente); en uno abierto sí', async () => {
    const mk = s => resumenServicios({ ...base, services: [s], invitations: [inv(s.id, 'm2', 't1', 'pendiente'), inv(s.id, 'm1', 't1', 'confirmado')], assignments: [banda(s.id, 'p1', 'm1')], slots: [] })[0]
    assert.equal(mk(svc('ayer', '2026-10-18')).equipos[0].sinResponder, 0, 'cerrada: el día ya pasó'); assert.equal(mk(svc('ayer', '2026-10-18')).terminado, true)
    assert.equal(mk(svc('hoy-temprano', '2026-10-19', '06:00:00', '07:00:00')).equipos[0].sinResponder, 0, 'terminó hoy a las 07:00'); assert.equal(mk(svc('hoy-temprano', '2026-10-19', '06:00:00', '07:00:00')).terminado, true)
    assert.equal(mk(svc('hoy-en-curso', '2026-10-19', '08:00:00', '23:00:00')).equipos[0].sinResponder, 1, 'hoy y todavía no termina'); assert.equal(mk(svc('manana', '2026-10-20')).equipos[0].sinResponder, 1)
    assert.equal(mk(svc('ayer', '2026-10-18')).equipos[0].convocados, 2, 'sigue contando a los convocados: solo cambia «sin responder»') })
  await prueba(`historial acotado: los próximos van completos y de los terminados solo los últimos ${HISTORIAL_MAXIMO}, del más reciente al más antiguo; primero los próximos, en orden`, async () => {
    const pas = Array.from({ length: 13 }, (_, i) => svc('p' + String(i + 1).padStart(2, '0'), `2026-09-${String(i + 1).padStart(2, '0')}`)), fut = [svc('f2', '2026-11-08'), svc('f1', '2026-10-25'), svc('f3', '2026-11-15')]
    const x = resumenServicios({ ...base, services: [...pas, ...fut], invitations: [], assignments: [], slots: [] })
    assert.equal(HISTORIAL_MAXIMO, 10); assert.deepEqual(x.map(s => s.id), ['f1', 'f2', 'f3', 'p13', 'p12', 'p11', 'p10', 'p09', 'p08', 'p07', 'p06', 'p05', 'p04'])
    assert.deepEqual(resumenServicios({ ...base, services: [...pas, ...fut], invitations: [], assignments: [], slots: [], historial: 2 }).map(s => s.id), ['f1', 'f2', 'f3', 'p13', 'p12']) })
  await prueba('el resumen NO lleva datos personales: ni ids de personas ni correos ni nombres; solo conteos, estados, equipos y datos del servicio', async () => {
    const texto = JSON.stringify(r); for (const dato of ['m1', 'm2', 'm3', 'member', 'email', 'correo', 'nombre_persona']) assert.ok(!texto.includes(dato), dato)
    assert.deepEqual(Object.keys(r[0]).sort(), ['equipos', 'fecha', 'horaFin', 'horaInicio', 'id', 'terminado', 'tipo', 'titulo']); assert.deepEqual(Object.keys(r[0].equipos[0]).sort(), ['asignados', 'color', 'confirmados', 'convocados', 'estado', 'nombre', 'rechazos', 'sinResponder', 'teamId', 'vacantes']) })

  console.log('ruta GET /api/admin/servicios-resumen (reloj fijo: la ruta lee la hora; no la real)')
  fijarReloj('2026-10-19T15:00:00Z')
  const preparar = () => { mundo(); estado.escrituras.length = 0; sesion = { email: 'ana@ejemplo.test', admins: { 'ana@ejemplo.test': ID.ORG } } }
  const llamar = async (url = 'http://x/api/admin/servicios-resumen') => ruta.GET({ url, nextUrl: new URL(url) })
  await prueba('sin sesión → 401; con sesión pero sin ser administrador → 403; persona que no está en la base → 403: sin leer ni escribir nada', async () => {
    preparar(); sesion.email = null; estado.consultas = 0; assert.equal((await llamar()).status, 401)
    preparar(); sesion.admins = {}; assert.equal((await llamar()).status, 403)
    preparar(); sesion.email = 'nadie@ejemplo.test'; sesion.admins = { 'nadie@ejemplo.test': ID.ORG }; assert.equal((await llamar()).status, 403)
    assert.equal(estado.escrituras.length, 0) })
  await prueba('la organización sale de la SESIÓN: un administrador ve los servicios de SU organización, y un parámetro ?organization_id= o ?org= no cambia nada', async () => {
    preparar(); const sinParam = await llamar(), conParam = await llamar(`http://x/api/admin/servicios-resumen?organization_id=${ID.ORG2}&org=${ID.ORG2}&serviceId=${ID.AJ.service}`)
    assert.equal(sinParam.status, 200); assert.deepEqual(conParam.body, { ...sinParam.body, generado: conParam.body.generado }); const ids = sinParam.body.servicios.map(s => s.id)
    assert.ok(ids.length >= 5 && !ids.includes(ID.AJ.service), 'solo servicios de la organización #1: ' + ids) })
  await prueba('un administrador de OTRA organización solo ve la suya (y no la primera)', async () => {
    preparar(); const aj = db.members.find(m => m.id === ID.AJ.member); aj.email = 'ajena@ejemplo.test'; sesion = { email: 'ajena@ejemplo.test', admins: { 'ajena@ejemplo.test': ID.ORG2 } }
    const r2 = await llamar(); assert.equal(r2.status, 200); assert.deepEqual(r2.body.servicios.map(s => s.id), [ID.AJ.service]) })
  await prueba('un administrador de la organización #1 NO puede pedir los datos de la #2 por la organización de la persona: si su fila dice #2 pero solo es admin de #1 → 403', async () => {
    preparar(); sesion = { email: 'ana@ejemplo.test', admins: { 'ana@ejemplo.test': ID.ORG } }; db.members.find(m => m.id === ID.ME).organization_id = ID.ORG2; assert.equal((await llamar()).status, 403) })
  await prueba('solo lectura: la ruta solo exporta GET, no escribe nada y la respuesta no lleva datos personales (ni ids de personas, ni correos, ni nombres)', async () => {
    preparar(); assert.deepEqual(Object.keys(ruta).filter(k => k !== 'dynamic'), ['GET']); estado.escrituras.length = 0
    const r3 = await llamar(); const texto = JSON.stringify(r3.body); assert.equal(r3.status, 200); assert.equal(estado.escrituras.length, 0)
    for (const dato of ['ana@ejemplo.test', 'Prueba', 'Ana', 'Beto', 'Cami', ID.ME, ID.O1, ID.O2]) assert.ok(!texto.includes(dato), dato)
    const s1 = r3.body.servicios.find(s => s.id === db.services[1].id); assert.ok(s1.equipos.length > 0 && s1.equipos.every(e => typeof e.convocados === 'number')) })
  await prueba('error de lectura → 500 genérico (no entrega un resumen a medias) y sin detalles', async () => {
    preparar(); estado.fallan.add('invitations'); const r4 = await llamar(); estado.fallan.clear(); assert.equal(r4.status, 500); assert.ok(!JSON.stringify(r4.body).includes('boom')) })
  soltarReloj()
  terminar()
})
