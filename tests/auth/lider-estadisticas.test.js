// «Resumen» del LÍDER (etapa 4): GET /api/lider/estadisticas, con requireLiderDeLaSesion y las funciones de rol REALES sobre una base simulada con la semántica real, y el reloj FIJADO (hoy = 15 nov 2026, Chile).
//  · quién entra: líder sí; administrador solo si lidera un equipo; sin rol 403; sin sesión 401; no-store siempre; solo lectura;
//  · el equipo: solo uno que lidera. Ajeno, inexistente, archivado, de otra organización, mal escrito en la base o sin rol: el MISMO 403 genérico. Parámetros mal escritos 400. Sin equipoId, el primero que lidera;
//  · el recorte: SOLO los campos de la lista de ESTE archivo (si alguien agrega uno, falla); nunca teléfono, correo, foto ni nacimiento (ni en la respuesta ni en NINGUNA consulta); nada de otros equipos;
//  · las cuentas: solo confirmados y todavía asignados; ni futuros ni el de hoy ni pendientes ni declinados ni retirados; ensayos con asignación sí; el % con cupos y confirmación; sin cupos, null (no NaN); avisos.
// Correr: `npm run test:auth`.
const RealDate = Date, FIJA = new RealDate('2026-11-15T15:00:00Z').getTime()
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIJA) } static now() { return FIJA } }
const { assert, db, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
stubs['next/server'].NextResponse.json = (b, init) => ({ status: (init && init.status) || 200, body: JSON.parse(JSON.stringify(b)), headers: (init && init.headers) || {} })
let sesion = { email: null }
const lc = s => String(s || '').toLowerCase()
const emailDe = id => lc((db.members.find(m => m.id === id) || {}).email)
const RPC = {
  is_org_admin: a => db.organization_members.some(o => emailDe(o.person_id) === lc(a.p_email) && o.organization_id === a.p_organization_id && ['owner', 'admin'].includes(o.role)),
  is_any_team_leader: a => db.team_members.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && t.is_leader === true),
}
stubs['@/lib/supabase-server'] = { createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: sesion.email ? { email: sesion.email } : null } }) }, rpc: async (fn, a) => { assert.ok(RPC[fn], `función desconocida ${fn}`); return { data: RPC[fn](a) } } }) }
const real = n => require(resolver(path.join(RAIZ, n)))
const consultas = []      // cada consulta del servidor: tabla y columnas pedidas
{ const admin = stubs['@/lib/supabase/admin'], de = admin.createAdminSupabase; admin.createAdminSupabase = () => { const cli = de(); const f0 = cli.from; return { ...cli, from: t => { const api = f0(t); const c = { t, cols: '' }; consultas.push(c); const sel = api.select; api.select = cols => { c.cols = String(cols); return sel(cols) }; return api } } } }
const ruta = real('app/api/lider/estadisticas/route'), fuente = n => require('fs').readFileSync(path.join(RAIZ, n), 'utf8')
const est = real('lib/lider/estadisticas')

const ORG = 'org-1', ORG2 = 'org-2'
const U = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TA = U(10), TB = U(11), TC = U(12), TARCH = U(13), TX = U(14)
const PV = U(20), PB = U(21), PARCH = U(22), PS = U(23)
const M = { ana: U(1), cami: U(2), gus: U(3), ita: U(4), luz: U(5), exa: U(6), beto: U(7), rita: U(8), mia: U(9), lia: U(30), dani: U(31), sofi: U(32), fer: U(33) }
const S = n => U(200 + n)
const CANARIOS = ['CANARIO-TEL', 'canario-correo', '1999-12-31', 'CANARIO-AVATAR']
const mundo = () => {
  estado.escrituras.length = 0; estado.fallan.clear(); consultas.length = 0
  const m = (id, nombre, apellido, extra = {}) => ({ id, nombre, apellido, email: `canario-correo-${nombre.toLowerCase()}@ejemplo.test`, telefono: 'CANARIO-TEL', fecha_nacimiento: '1999-12-31', avatar_url: 'CANARIO-AVATAR', organization_id: ORG, ...extra })
  db.members = [m(M.ana, 'Ana', 'Lider', { email: 'ana@ejemplo.test' }), m(M.cami, 'Cami', 'Sonido'), m(M.gus, 'Gus', 'Bajo'), m(M.ita, 'Ita', 'Nueva'), m(M.luz, 'Luz', 'Pausa'), m(M.exa, 'Exa', 'Salio'), m(M.beto, 'Beto', 'Produccion', { email: 'beto@ejemplo.test' }),
    m(M.rita, 'Rita', 'Luces'), m(M.mia, 'Mia', 'Vacia', { email: 'mia@ejemplo.test' }), m(M.lia, 'Lia', 'Dos', { email: 'lia@ejemplo.test' }), m(M.dani, 'Dani', 'Admin', { email: 'dani@ejemplo.test' }), m(M.sofi, 'Sofi', 'SinRol', { email: 'sofi@ejemplo.test' }), m(M.fer, 'Fer', 'OtraOrg', { organization_id: ORG2 })]
  const eq = (id, name, o = ORG, extra = {}) => ({ id, name, color: 'cobalto', sort_order: 1, organization_id: o, archived_at: null, ...extra })
  db.teams = [eq(TA, 'Alabanza', ORG, { sort_order: 1 }), eq(TB, 'Producción', ORG, { sort_order: 2 }), eq(TC, 'Vacío', ORG, { sort_order: 3 }), eq(TARCH, 'Archivado', ORG, { sort_order: 4, archived_at: '2026-01-01' }), eq(TX, 'De otra org', ORG2)]
  db.team_positions = [{ id: PV, name: 'Voz', team_id: TA, organization_id: ORG, archived_at: null }, { id: PB, name: 'Bajo', team_id: TA, organization_id: ORG, archived_at: null }, { id: PARCH, name: 'Vieja', team_id: TA, organization_id: ORG, archived_at: '2026-01-01' }, { id: PS, name: 'Sonido', team_id: TB, organization_id: ORG, archived_at: null }]
  const tm = (id, miembro, team, lider = false) => ({ id, member_id: miembro, team_id: team, organization_id: ORG, is_leader: lider })
  db.team_members = [tm('1', M.ana, TA, true), tm('2', M.cami, TA), tm('3', M.gus, TA), tm('4', M.ita, TA), tm('5', M.luz, TA), tm('6', M.beto, TB, true), tm('7', M.rita, TB), tm('8', M.mia, TC, true), tm('9', M.lia, TA, true), tm('10', M.lia, TB, true), tm('11', M.ana, TARCH, true)]
  db.organization_members = [{ person_id: M.dani, organization_id: ORG, role: 'admin' }]
  const sv = (n, fecha, tipo = 'servicio', o = ORG) => ({ id: S(n), fecha, tipo, titulo: 'S' + n, organization_id: o })
  db.services = [sv(1, '2026-11-08'), sv(2, '2026-11-01'), sv(3, '2026-10-25'), sv(4, '2026-09-20'), sv(5, '2026-11-22'), sv(6, '2026-11-15'), sv(7, '2026-11-02', 'ensayo'), sv(8, '2026-11-05'), sv(10, '2026-11-03'), sv(11, '2026-11-04'), sv(12, '2026-11-10'), sv(13, '2026-03-01'), sv(14, '2024-01-01'), sv(15, '2026-11-06', 'servicio', ORG2)]
  let n = 0
  const as = (s, pos, miembro, slot = 1) => ({ id: 'a' + (++n), service_id: S(s), team_position_id: pos, member_id: miembro, slot_index: slot })
  db.banda_assignments = [as(1, PV, M.ana), as(1, PB, M.cami), as(2, PV, M.ana), as(2, PB, M.cami), as(2, PB, M.gus, 2), as(3, PV, M.ana), as(3, PB, M.cami), as(4, PV, M.luz), as(4, PB, M.cami), as(5, PV, M.ana), as(6, PV, M.ana), as(7, PV, M.ana),
    as(10, PV, M.ana), as(11, PV, M.gus), as(13, PV, M.ana), as(13, PB, M.exa), as(14, PV, M.ita), as(8, PS, M.beto), as(8, PS, M.rita, 2), as(12, PS, M.beto), as(12, PS, M.rita, 2), as(15, PV, M.ana)]
  const inv = (s, miembro, team, status) => ({ id: 'i' + (++n), service_id: S(s), member_id: miembro, team_id: team, status })
  db.invitations = [inv(1, M.ana, TA, 'confirmado'), inv(1, M.cami, TA, 'confirmado'), inv(2, M.ana, TA, 'confirmado'), inv(2, M.cami, TA, 'pendiente'), inv(2, M.gus, TA, 'confirmado'), inv(3, M.ana, TA, 'confirmado'), inv(3, M.cami, TA, 'confirmado'),
    inv(4, M.luz, TA, 'confirmado'), inv(4, M.cami, TA, 'confirmado'), inv(5, M.ana, TA, 'confirmado'), inv(6, M.ana, TA, 'confirmado'), inv(7, M.ana, TA, 'confirmado'), inv(10, M.ana, TA, 'declinado'), inv(11, M.cami, TA, 'confirmado'), inv(11, M.gus, TA, 'pendiente'),
    inv(13, M.ana, TA, 'confirmado'), inv(13, M.exa, TA, 'confirmado'), inv(14, M.ita, TA, 'confirmado'), inv(8, M.beto, TB, 'confirmado'), inv(8, M.rita, TB, 'confirmado'), inv(12, M.beto, TB, 'confirmado'), inv(12, M.rita, TB, 'confirmado'), inv(8, M.ana, TB, 'confirmado'), inv(15, M.ana, TA, 'confirmado')]
  db.service_position_slots = [{ id: 'c1', service_id: S(2), team_position_id: PB, slots_needed: 2 }, { id: 'c2', service_id: S(8), team_position_id: PS, slots_needed: 2 }, { id: 'c3', service_id: S(12), team_position_id: PS, slots_needed: 2 }]
}
const GET = async (email, qs = '') => { sesion = { email }; const url = 'http://x/api/lider/estadisticas' + (qs ? '?' + qs : ''); return ruta.GET({ nextUrl: new URL(url), url }) }
const sinCache = r => assert.equal((r.headers || {})['Cache-Control'], 'no-store', `falta no-store (estado ${r.status})`)
const llaves = o => Object.keys(o).sort()
const GENERICO = { error: 'No autorizado' }
const CAMPOS = { raiz: ['avisos', 'cubiertasPct', 'equipoId', 'equipos', 'periodo', 'personas', 'personasQueSirvieron', 'servicios'], equipo: ['color', 'id', 'nombre'], persona: ['apellido', 'cantidad', 'id', 'nombre', 'ultimaVez'], aviso: ['personaId', 'tipo'] }
const cuenta = (r, nombre) => r.body.personas.find(p => p.nombre === nombre)

correr(async () => {
  console.log('quién entra y qué equipo')
  mundo()
  const rA = await GET('ana@ejemplo.test', `equipoId=${TA}&periodo=mes`)
  await prueba('un líder recibe su resumen (no-store); sin rol 403; sin sesión 401; un administrador que no lidera nada 403', async () => {
    assert.equal(rA.status, 200); sinCache(rA)
    const sr = await GET('sofi@ejemplo.test', `equipoId=${TA}`); assert.equal(sr.status, 403); assert.deepEqual(sr.body, GENERICO); sinCache(sr)
    const ns = await GET(null); assert.equal(ns.status, 401); sinCache(ns)
    const ad = await GET('dani@ejemplo.test', `equipoId=${TA}`); assert.equal(ad.status, 403); assert.deepEqual(ad.body, GENERICO); sinCache(ad)
  })
  await prueba('un equipo ajeno, inexistente, archivado, de otra organización o sin permiso dan EXACTAMENTE lo mismo (403 genérico, mismos encabezados)', async () => {
    const ref = await GET('ana@ejemplo.test', `equipoId=${TB}`); assert.equal(ref.status, 403); assert.deepEqual(ref.body, GENERICO); sinCache(ref)
    for (const eq of [U(99), TX, TARCH]) { const r = await GET('ana@ejemplo.test', `equipoId=${eq}`); assert.equal(r.status, 403, eq); assert.deepEqual(r.body, ref.body); assert.deepEqual(r.headers, ref.headers) }
    assert.equal((await GET('beto@ejemplo.test', `equipoId=${TA}`)).status, 403, 'el líder de Producción no ve Alabanza')
    assert.equal((await GET('mia@ejemplo.test', `equipoId=${TA}`)).status, 403)
  })
  await prueba('parámetros mal escritos: 400 (periodo desconocido, «año» con eñe, equipoId que no es un id); el periodo por defecto es «mes»', async () => {
    for (const qs of ['periodo=semana', 'periodo=a%C3%B1o', 'periodo=', `equipoId=${TA}&periodo=MES`, 'equipoId=no-es-un-id', 'equipoId=', `equipoId=${TA}x`]) { const r = await GET('ana@ejemplo.test', qs); assert.equal(r.status, 400, qs); sinCache(r) }
    const d = await GET('ana@ejemplo.test'); assert.equal(d.status, 200); assert.equal(d.body.periodo, 'mes'); assert.equal(d.body.equipoId, TA, 'sin equipoId: el primero que lidera')
    for (const p of ['mes', '3m', 'anio']) assert.equal((await GET('ana@ejemplo.test', `periodo=${p}`)).body.periodo, p)
  })
  await prueba('quien lidera dos equipos ve sus dos en el selector (solo los suyos, sin el archivado) y puede pedir cada uno; el administrador que lidera uno ve solo ese', async () => {
    const r = await GET('lia@ejemplo.test'); assert.deepEqual(r.body.equipos.map(e => e.nombre), ['Alabanza', 'Producción']); assert.equal((await GET('lia@ejemplo.test', `equipoId=${TB}`)).body.equipoId, TB)
    const a = await GET('ana@ejemplo.test'); assert.deepEqual(a.body.equipos.map(e => e.nombre), ['Alabanza'], 'el equipo archivado donde es líder no sale')
    assert.ok(!JSON.stringify(a.body).includes('Producción') && !JSON.stringify(a.body).includes('De otra org'))
  })

  console.log('el recorte')
  await prueba('la respuesta tiene SOLO los campos de la lista', async () => {
    assert.deepEqual(llaves(rA.body), CAMPOS.raiz)
    for (const e of rA.body.equipos) assert.deepEqual(llaves(e), CAMPOS.equipo)
    for (const p of rA.body.personas) assert.deepEqual(llaves(p), CAMPOS.persona)
    for (const x of rA.body.avisos) assert.deepEqual(llaves(x), CAMPOS.aviso)
  })
  await prueba('ni teléfono, correo, foto ni nacimiento en la respuesta, y ninguna consulta los pide (de members, solo id, nombre y apellido); nada de otros equipos', async () => {
    for (const email of ['ana@ejemplo.test', 'lia@ejemplo.test', 'beto@ejemplo.test']) for (const p of ['mes', '3m', 'anio']) {
      consultas.length = 0; const t = JSON.stringify((await GET(email, `periodo=${p}`)).body)
      for (const c of CANARIOS) assert.ok(!t.includes(c), `apareció «${c}»`); assert.ok(!/telefono|email|avatar|nacimiento/i.test(t))
      const SESION = ['id, email, nombre', 'organization_id']      // la búsqueda de la persona de la SESIÓN (requireLiderDeLaSesion), no la ruta
      for (const c of consultas.filter(c => !(c.t === 'members' && SESION.includes(c.cols)))) assert.ok(!/telefono|email|avatar|nacimiento|birth|reason|motivo/i.test(c.cols), `${c.t} pidió «${c.cols}»`)
      assert.ok(consultas.filter(c => c.t === 'members' && !SESION.includes(c.cols)).every(c => c.cols === 'id, nombre, apellido'))
    }
    const t = JSON.stringify(rA.body); for (const c of ['Beto', 'Rita', 'Fer', 'Sofi', 'Dani', 'Producción', 'Exa']) assert.ok(!t.includes(c), `«${c}» no es de este equipo`)
    assert.equal((await GET('lia@ejemplo.test', `equipoId=${TA}`)).body.personas.some(p => p.nombre === 'Rita'), false, 'quien lidera dos equipos recibe solo el que pidió')
  })

  console.log('las cuentas (este mes: 1 al 14 de noviembre de 2026)')
  await prueba('solo cuentan los CONFIRMADOS y todavía asignados, en servicios YA pasados: ni pendientes, ni declinados, ni retirados, ni el servicio de hoy ni los futuros', async () => {
    assert.equal(cuenta(rA, 'Ana').cantidad, 3, 'servicios 1, 2 y el ensayo 7; no el 10 (declinó), el 5 (futuro) ni el 6 (hoy)')
    assert.equal(cuenta(rA, 'Cami').cantidad, 1, 'el 1; no el 2 (pendiente) ni el 11 (confirmó pero ya no está asignada)')
    assert.equal(cuenta(rA, 'Gus').cantidad, 1, 'el 2; no el 11 (pendiente)')
    assert.equal(cuenta(rA, 'Luz').cantidad, 0); assert.equal(cuenta(rA, 'Ita').cantidad, 0)
    assert.equal(rA.body.servicios, 5, 'servicios 1, 2, 7, 10 y 11: con asignación del equipo; no el 8 (solo Producción), ni los futuros, ni el de hoy, ni los de antes del mes')
    assert.equal(rA.body.personasQueSirvieron, 3)
  })
  await prueba('«última vez»: la más reciente confirmada, mirando más allá del período; sin servicios, null; quien dejó el equipo no aparece en la lista', async () => {
    assert.equal(cuenta(rA, 'Ana').ultimaVez, '2026-11-08'); assert.equal(cuenta(rA, 'Gus').ultimaVez, '2026-11-01'); assert.equal(cuenta(rA, 'Luz').ultimaVez, '2026-09-20'); assert.equal(cuenta(rA, 'Ita').ultimaVez, null, 'su único servicio fue hace más de 400 días')
    assert.ok(!rA.body.personas.some(p => p.nombre === 'Exa'))
    assert.deepEqual(rA.body.personas.map(p => p.nombre), ['Ana', 'Cami', 'Gus', 'Luz', 'Ita', 'Lia'], 'más veces primero; luego la última vez más reciente; sin servicios al final, por nombre')
  })
  await prueba('% de posiciones cubiertas = cupos cubiertos CON confirmación / cupos pedidos (posiciones archivadas sin asignación no cuentan; los cupos de un servicio se respetan)', async () => {
    assert.equal(rA.body.cubiertasPct, 45, '5 de 11')
  })
  await prueba('«3 meses» y «este año» suman más servicios (y las personas con ellos)', async () => {
    const m3 = await GET('ana@ejemplo.test', 'periodo=3m'), an = await GET('ana@ejemplo.test', 'periodo=anio')
    assert.equal(m3.body.servicios, 7); assert.equal(cuenta(m3, 'Ana').cantidad, 4); assert.equal(cuenta(m3, 'Cami').cantidad, 3); assert.equal(cuenta(m3, 'Luz').cantidad, 1)
    assert.equal(an.body.servicios, 8); assert.equal(cuenta(an, 'Ana').cantidad, 5); assert.ok(!an.body.personas.some(p => p.nombre === 'Exa'))
    assert.deepEqual([est.desdeDelPeriodo('mes', '2026-11-15'), est.desdeDelPeriodo('3m', '2026-11-15'), est.desdeDelPeriodo('anio', '2026-11-15'), est.desdeDelPeriodo('3m', '2026-02-10')], ['2026-11-01', '2026-09-01', '2026-01-01', '2025-12-01'])
  })
  await prueba('avisos: «sirvió en todos los servicios» (con 2 o más) y «no sirve hace más de 6 semanas» solo a quien ya sirvió; quien nunca sirvió no tiene aviso', async () => {
    assert.deepEqual(rA.body.avisos, [{ tipo: 'inactiva', personaId: M.luz }], 'Luz: última vez hace 56 días; Ita (sin servicios) no; Ana sirvió en 3 de 5')
    const b = await GET('beto@ejemplo.test', 'periodo=mes'); assert.deepEqual(b.body.avisos.filter(x => x.tipo === 'todos').map(x => x.personaId).sort(), [M.beto, M.rita].sort(), 'los 2 servicios del mes')
    assert.equal(b.body.servicios, 2); assert.equal(b.body.cubiertasPct, 100, 'dos cupos cubiertos en cada uno de los 2 servicios'); assert.equal(cuenta(b, 'Beto').cantidad, 2)
    assert.equal(cuenta(b, 'Ana'), undefined, 'Ana confirmó en Producción (invitación 8) pero no es de ese equipo')
    const solo1 = est.armarResumen({ hoy: '2026-11-15', periodo: 'mes', servicios: [{ id: 'a', fecha: '2026-11-01' }], posiciones: [{ id: 'p' }], asignaciones: [{ service_id: 'a', team_position_id: 'p', member_id: 'x', slot_index: 1 }], cupos: [], confirmadas: [{ service_id: 'a', member_id: 'x' }], integrantes: [{ id: 'x', nombre: 'X', apellido: 'Y' }] })
    assert.deepEqual(solo1.avisos, [], 'con un solo servicio «sirvió en todos» no avisa')
  })
  await prueba('aunque la consulta trajera el servicio de hoy o uno futuro, la cuenta no los toma (doble defensa en lib/lider/estadisticas)', async () => {
    const f = (fecha) => ({ hoy: '2026-11-15', periodo: 'mes', servicios: [{ id: 'a', fecha }], posiciones: [{ id: 'p' }], asignaciones: [{ service_id: 'a', team_position_id: 'p', member_id: 'x', slot_index: 1 }], cupos: [], confirmadas: [{ service_id: 'a', member_id: 'x' }], integrantes: [{ id: 'x', nombre: 'X', apellido: 'Y' }] })
    for (const fecha of ['2026-11-15', '2026-11-16']) { const r = est.armarResumen(f(fecha)); assert.equal(r.servicios, 0, fecha); assert.equal(r.personas[0].cantidad, 0); assert.equal(r.cubiertasPct, null) }
    assert.equal(est.armarResumen(f('2026-11-14')).servicios, 1)
  })
  await prueba('equipo sin servicios ni posiciones: ceros, sin porcentaje (null, nunca NaN) y la lista con sus personas; los números salen enteros', async () => {
    const c = await GET('mia@ejemplo.test'); assert.equal(c.status, 200); assert.equal(c.body.servicios, 0); assert.equal(c.body.personasQueSirvieron, 0); assert.equal(c.body.cubiertasPct, null)
    assert.deepEqual(c.body.personas.map(p => [p.nombre, p.cantidad, p.ultimaVez]), [['Mia', 0, null]]); assert.deepEqual(c.body.avisos, [])
    assert.ok(!/NaN|Infinity/.test(JSON.stringify(c.body)))
    for (const r of [rA, await GET('ana@ejemplo.test', 'periodo=anio')]) assert.ok(Number.isInteger(r.body.cubiertasPct) && r.body.cubiertasPct >= 0 && r.body.cubiertasPct <= 100)
  })
  await prueba('si una lectura falla se responde 500 con no-store y sin cifras a medias', async () => {
    for (const t of ['teams', 'services', 'invitations', 'banda_assignments', 'team_members', 'members', 'team_positions', 'service_position_slots']) { estado.fallan.add(t); const r = await GET('ana@ejemplo.test'); estado.fallan.delete(t); assert.ok([403, 500].includes(r.status), t); assert.ok(!('servicios' in r.body), t); sinCache(r) }
    estado.fallan.add('invitations'); assert.equal((await GET('ana@ejemplo.test')).status, 500); estado.fallan.clear()
  })
  await prueba('la ruta solo LEE: ninguna escritura, y el código no contiene escrituras, rpc, columnas de contacto ni exports de más', async () => {
    assert.equal(estado.escrituras.length, 0)
    for (const f of ['app/api/lider/estadisticas/route.ts', 'lib/lider/estadisticas.ts']) { const c = fuente(f).replace(/\/\/.*$/gm, ''); assert.ok(!/\.(insert|update|upsert|delete)\(|\.rpc\(/.test(c), f); assert.ok(!/telefono|email|avatar_url|fecha_nacimiento|date_blocks/i.test(c), `${f}: contacto, foto o nacimiento`) }
    const r = fuente('app/api/lider/estadisticas/route.ts').replace(/\/\/.*$/gm, ''); assert.deepEqual(r.match(/^export (?:const|async function|function) \w+/gm).map(x => x.split(' ').pop()).sort(), ['GET', 'dynamic'], 'next build rechaza otros exports en una ruta')
  })
  terminar()
})
