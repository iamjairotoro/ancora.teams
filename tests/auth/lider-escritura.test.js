// El líder escribe SOLO en SU equipo (etapa 2): las seis rutas de /api/lider/* (asignar, cupos, horario, notas, equipo, herramientas), con requireLiderDeLaSesion y las funciones de rol REALES sobre una base simulada con la semántica real.
// Por cada ruta: líder de su equipo sí; de otro equipo, persona sin rol y sin sesión no; administrador sí; un recurso que no existe, de otra organización o de otro equipo responden EXACTAMENTE lo mismo (403 genérico); no-store siempre;
// campos de más (is_leader, rol, team_id…) se rechazan; listas blancas de lo que se escribe PROPIAS de esta prueba; nadie se otorga un rol. Las MUTACIONES se corren a mano (ver el reporte): si se rompe la comprobación, esta prueba falla.
// Correr: `npm run test:auth`.
const { assert, db, estado, prueba, terminar, correr, stubs, resolver, RAIZ, fijarReloj, soltarReloj } = require('../portal/_banco')
const path = require('path')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
stubs['next/server'].NextResponse.json = (b, init) => ({ status: (init && init.status) || 200, body: JSON.parse(JSON.stringify(b)), headers: (init && init.headers) || {} })
const logs = []; const infoOriginal = console.info; console.info = (...a) => logs.push(a.join(' '))
let sesion = { email: null }
const lc = s => String(s || '').toLowerCase()
const emailDe = id => lc((db.members.find(m => m.id === id) || {}).email)
const RPC = {
  is_org_admin: a => db.organization_members.some(o => emailDe(o.person_id) === lc(a.p_email) && o.organization_id === a.p_organization_id && ['owner', 'admin'].includes(o.role)),
  is_any_team_leader: a => db.team_members.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && t.is_leader === true),
}
stubs['@/lib/supabase-server'] = { createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: sesion.email ? { email: sesion.email } : null } }) }, rpc: async (fn, a) => { assert.ok(RPC[fn], `función desconocida ${fn}`); return { data: RPC[fn](a) } } }) }
const real = n => require(resolver(path.join(RAIZ, n)))
const R = { asignar: real('app/api/lider/asignar/route'), cupos: real('app/api/lider/cupos/route'), horario: real('app/api/lider/horario/route'), notas: real('app/api/lider/notas/route'), equipo: real('app/api/lider/equipo/route'), herramientas: real('app/api/lider/herramientas/route') }
const fuente = n => require('fs').readFileSync(path.join(RAIZ, n), 'utf8')

const ORG = 'org-1', ORG2 = 'org-2'
const U = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TA = U(10), TB = U(11), TX = U(12)
const PA1 = U(20), PA2 = U(21), PB1 = U(22), PARCH = U(23), PX = U(24)
const S1 = U(30), SPASADO = U(31), SX = U(32), NOEXISTE = U(99)
const T_SCHED_A = U(40), T_NOTES_A = U(41), T_SCHED_B = U(42), T_CHECK_A = U(43)
const M = { ana: U(1), beto: U(2), cami: U(3), pablo: U(4), rita: U(5), zoe: U(6), dani: U(7), fer: U(8), luz: U(9) }
const mundo = () => {
  estado.escrituras.length = 0; estado.fallan.clear(); logs.length = 0; db.n = 0
  const m = (id, nombre, email, org = ORG) => ({ id, nombre, apellido: 'Prueba', email, telefono: '+56 9 CANARIO', fecha_nacimiento: '1999-12-31', organization_id: org })
  db.members = [m(M.ana, 'Ana', 'ana@ejemplo.test'), m(M.beto, 'Beto', 'beto@ejemplo.test'), m(M.cami, 'Cami', 'cami@ejemplo.test'), m(M.pablo, 'Pablo', 'pablo@ejemplo.test'), m(M.rita, 'Rita', 'rita@ejemplo.test'), m(M.zoe, 'Zoe', 'zoe@ejemplo.test'), m(M.dani, 'Dani', 'dani@ejemplo.test'), m(M.fer, 'Fer', 'fer@ejemplo.test', ORG2), m(M.luz, 'Luz', 'luz@ejemplo.test')]
  db.teams = [{ id: TA, name: 'Alabanza', organization_id: ORG, archived_at: null }, { id: TB, name: 'Producción', organization_id: ORG, archived_at: null }, { id: TX, name: 'De otra org', organization_id: ORG2, archived_at: null }]
  db.team_positions = [{ id: PA1, name: 'Voz', team_id: TA, organization_id: ORG, archived_at: null, sort_order: 1 }, { id: PA2, name: 'Bajo', team_id: TA, organization_id: ORG, archived_at: null, sort_order: 2 }, { id: PB1, name: 'Sonido', team_id: TB, organization_id: ORG, archived_at: null, sort_order: 1 },
    { id: PARCH, name: 'Archivada', team_id: TA, organization_id: ORG, archived_at: '2026-01-01', sort_order: 3 }, { id: PX, name: 'Otra org', team_id: TX, organization_id: ORG2, archived_at: null, sort_order: 1 }]
  db.team_members = [{ id: U(50), member_id: M.ana, team_id: TA, organization_id: ORG, is_leader: true }, { id: U(51), member_id: M.beto, team_id: TB, organization_id: ORG, is_leader: true }, { id: U(52), member_id: M.cami, team_id: TA, organization_id: ORG, is_leader: false },
    { id: U(53), member_id: M.pablo, team_id: TA, organization_id: ORG, is_leader: false }, { id: U(54), member_id: M.rita, team_id: TB, organization_id: ORG, is_leader: false }, { id: U(55), member_id: M.dani, team_id: TA, organization_id: ORG, is_leader: false }, { id: U(56), member_id: M.luz, team_id: TA, organization_id: ORG, is_leader: true }]
  db.team_member_positions = [{ team_member_id: U(52), team_position_id: PA1 }]
  db.organization_members = [{ person_id: M.dani, organization_id: ORG, role: 'admin' }]
  db.team_admins = []
  const svc = (id, fecha, org = ORG) => ({ id, fecha, titulo: 'Servicio', organization_id: org })
  db.services = [svc(S1, '2099-01-04'), svc(SPASADO, '2020-01-05'), svc(SX, '2099-01-04', ORG2)]
  db.service_position_slots = [{ id: 'sl1', service_id: S1, team_position_id: PA1, slots_needed: 2 }, { id: 'sl2', service_id: S1, team_position_id: PA2, slots_needed: 1 }]
  db.banda_assignments = [{ id: 'b1', service_id: S1, team_position_id: PA1, member_id: M.pablo, slot_index: 2 }]
  db.team_tools = [{ id: T_CHECK_A, team_id: TA, tool_type: 'checklist', sort_order: 1 }, { id: T_SCHED_A, team_id: TA, tool_type: 'schedule', sort_order: 2 }, { id: T_NOTES_A, team_id: TA, tool_type: 'notes', sort_order: 3 }, { id: T_SCHED_B, team_id: TB, tool_type: 'schedule', sort_order: 1 }]
  db.service_schedule_items = [{ id: U(60), service_id: S1, team_id: TA, team_tool_id: T_SCHED_A, hora: '09:00', texto: 'Llegada', sort_order: 0 }, { id: U(61), service_id: S1, team_id: TB, team_tool_id: T_SCHED_B, hora: '09:30', texto: 'Prueba', sort_order: 0 }]
  db.service_notes = [{ id: U(70), service_id: S1, team_id: TA, team_tool_id: T_NOTES_A, texto: 'Nota vieja' }]
  db.invitations = []
}
const llamar = async (ruta, metodo, email, cuerpo, url = 'http://x/') => { sesion = { email }; const u = new URL(url); const req = { nextUrl: u, url, json: async () => { if (cuerpo === 'MAL') throw new Error('json'); return cuerpo } }; return R[ruta][metodo](req) }
const post = (ruta, email, cuerpo) => llamar(ruta, 'POST', email, cuerpo)
const GENERICO = { error: 'No autorizado' }
const sinCache = r => assert.equal((r.headers || {})['Cache-Control'], 'no-store')
const escrituras = () => estado.escrituras.slice()
const NO_ESCRIBIO = () => assert.equal(estado.escrituras.length, 0, 'no debió escribir: ' + JSON.stringify(estado.escrituras))
const llaves = o => Object.keys(o).sort()
// Listas blancas PROPIAS: qué columnas se pueden escribir en cada tabla (si una ruta escribe una columna nueva, esta prueba falla).
const ESCRIBIBLE = { banda_assignments: ['member_id', 'service_id', 'slot_index', 'team_position_id'], service_position_slots: ['service_id', 'slots_needed', 'team_position_id'], service_schedule_items: ['hora', 'service_id', 'sort_order', 'team_id', 'team_tool_id', 'texto'],
  service_notes: ['service_id', 'team_id', 'team_tool_id', 'texto', 'updated_at'], team_members: ['is_leader', 'member_id', 'organization_id', 'team_id'], team_member_positions: ['team_member_id', 'team_position_id'], team_tools: ['sort_order', 'team_id', 'tool_type'] }
const TABLAS_NUNCA = ['organization_members', 'team_admins', 'members', 'teams', 'team_positions', 'services', 'invitations', 'service_blocks', 'tool_templates']
const revisarEscrituras = () => { for (const w of estado.escrituras) { assert.ok(ESCRIBIBLE[w.tabla], `escribió en una tabla no permitida: ${w.tabla}`); assert.ok(!TABLAS_NUNCA.includes(w.tabla)); for (const v of [].concat(w.valor || [])) for (const k of Object.keys(v)) assert.ok(ESCRIBIBLE[w.tabla].includes(k), `columna no permitida ${w.tabla}.${k}`) } }

correr(async () => {
  fijarReloj('2026-11-02T16:00:00Z')
  try {
    console.log('asignar')
    mundo()
    const base = { servicio: S1, posicion: PA1, slot: 1, persona: M.cami }
    await prueba('el líder de Alabanza asigna a una persona de SU equipo en una posición de su equipo: escribe SOLO banda_assignments con las 4 columnas', async () => {
      const r = await post('asignar', 'ana@ejemplo.test', base); assert.equal(r.status, 200); sinCache(r)
      assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['banda_assignments', 'upsert']]); assert.deepEqual(llaves(escrituras()[0].valor), ESCRIBIBLE.banda_assignments); assert.equal(escrituras()[0].valor.member_id, M.cami); revisarEscrituras()
      assert.ok(logs.some(l => l.includes('[lider-cambio]') && l.includes('"accion":"asignar"') && l.includes(M.ana)) && !logs.some(l => l.includes('@')), 'deja una línea con quién y qué, sin correos')
    })
    mundo()
    await prueba('quitar (persona null) en su equipo funciona; en el cupo 2 (hay 2 cupos) funciona', async () => { assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, persona: null })).status, 200); assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, slot: 2, persona: M.cami })).status, 200) })
    mundo()
    const ajena = await post('asignar', 'ana@ejemplo.test', { ...base, posicion: PB1, persona: null })
    await prueba('en una posición de OTRO equipo no puede ni asignar ni quitar: 403 genérico y no se escribe nada en banda_assignments', async () => {
      assert.equal(ajena.status, 403); assert.deepEqual(ajena.body, GENERICO); sinCache(ajena)
      assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, posicion: PB1, persona: M.rita })).status, 403)
      assert.equal((await post('asignar', 'beto@ejemplo.test', base)).status, 403, 'el líder de Producción tampoco escribe en Alabanza'); NO_ESCRIBIO()
    })
    await prueba('una posición que no existe, de otra organización, un servicio inexistente, de otra organización o un id mal escrito responden EXACTAMENTE lo mismo que «equipo ajeno»', async () => {
      for (const c of [{ posicion: NOEXISTE }, { posicion: PX }, { servicio: NOEXISTE }, { servicio: SX }]) { const r = await post('asignar', 'ana@ejemplo.test', { ...base, ...c }); assert.equal(r.status, 403, JSON.stringify(c)); assert.deepEqual(r.body, ajena.body); assert.deepEqual(r.headers, ajena.headers) }
      NO_ESCRIBIO()
    })
    await prueba('persona sin rol: 403; sin sesión: 401; el administrador asigna en CUALQUIER equipo de su organización', async () => {
      assert.equal((await post('asignar', 'cami@ejemplo.test', base)).status, 403); assert.equal((await post('asignar', null, base)).status, 401); NO_ESCRIBIO()
      assert.equal((await post('asignar', 'dani@ejemplo.test', base)).status, 200); assert.equal((await post('asignar', 'dani@ejemplo.test', { ...base, posicion: PB1, persona: M.rita })).status, 200)
    })
    mundo()
    await prueba('validaciones: persona de otro equipo o inexistente (409), servicio cerrado (409), posición archivada (409), cupo que no existe (400), cuerpo con campos de más (400): nada se escribe', async () => {
      assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, persona: M.rita })).status, 409); assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, persona: NOEXISTE })).status, 409)
      assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, servicio: SPASADO })).status, 409)
      assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, posicion: PARCH })).status, 409)
      assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, slot: 3 })).status, 400); assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, slot: 0 })).status, 400)
      for (const extra of [{ is_leader: true }, { rol: 'admin' }, { team_id: TB }, { organization_id: ORG2 }, { posicion_texto: 'Voz' }]) assert.equal((await post('asignar', 'ana@ejemplo.test', { ...base, ...extra })).status, 400, JSON.stringify(extra))
      assert.equal((await post('asignar', 'ana@ejemplo.test', 'MAL')).status, 400); assert.equal((await post('asignar', 'ana@ejemplo.test', [])).status, 400); NO_ESCRIBIO()
    })

    console.log('cupos')
    mundo()
    const cp = { servicio: S1, posicion: PA1, cupos: 3 }
    await prueba('el líder cambia los cupos de una posición de su equipo (solo service_position_slots); no baja de los ya asignados; en otro equipo 403; fuera de 1–20, 400; servicio cerrado 409', async () => {
      assert.equal((await post('cupos', 'ana@ejemplo.test', cp)).status, 200); assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['service_position_slots', 'upsert']]); assert.deepEqual(llaves(escrituras()[0].valor), ESCRIBIBLE.service_position_slots); revisarEscrituras()
      assert.equal((await post('cupos', 'ana@ejemplo.test', { ...cp, cupos: 1 })).status, 409, 'Pablo está en el cupo 2')
      estado.escrituras.length = 0
      assert.equal((await post('cupos', 'ana@ejemplo.test', { ...cp, posicion: PB1 })).status, 403); assert.equal((await post('cupos', 'beto@ejemplo.test', cp)).status, 403); assert.equal((await post('cupos', 'cami@ejemplo.test', cp)).status, 403); assert.equal((await post('cupos', null, cp)).status, 401)
      assert.equal((await post('cupos', 'ana@ejemplo.test', { ...cp, cupos: 0 })).status, 400); assert.equal((await post('cupos', 'ana@ejemplo.test', { ...cp, cupos: 21 })).status, 400); assert.equal((await post('cupos', 'ana@ejemplo.test', { ...cp, servicio: SPASADO })).status, 409)
      assert.equal((await post('cupos', 'ana@ejemplo.test', { ...cp, is_leader: true })).status, 400); NO_ESCRIBIO()
      assert.equal((await post('cupos', 'dani@ejemplo.test', { ...cp, posicion: PB1 })).status, 200)
    })

    console.log('horario')
    mundo()
    const hz = { servicio: S1, herramienta: T_SCHED_A }
    await prueba('el líder crea, edita y elimina filas del horario de SU equipo (solo service_schedule_items); GET lee las suyas', async () => {
      const c = await post('horario', 'ana@ejemplo.test', { ...hz, accion: 'crear', hora: '10:00', texto: 'Ensayo general' }); assert.equal(c.status, 200); assert.deepEqual(llaves(escrituras()[0].valor), ESCRIBIBLE.service_schedule_items); assert.equal(escrituras()[0].valor.team_id, TA, 'el equipo sale de la herramienta'); revisarEscrituras()
      assert.equal((await post('horario', 'ana@ejemplo.test', { ...hz, accion: 'editar', fila: U(60), texto: 'Llegada del equipo' })).status, 200)
      assert.equal((await post('horario', 'ana@ejemplo.test', { ...hz, accion: 'eliminar', fila: U(60) })).status, 200); revisarEscrituras()
      const g = await llamar('horario', 'GET', 'ana@ejemplo.test', null, `http://x/?servicio=${S1}&herramienta=${T_SCHED_A}`); assert.equal(g.status, 200); sinCache(g); assert.deepEqual(llaves(g.body), ['cerrado', 'filas']); for (const f of g.body.filas) assert.deepEqual(llaves(f), ['hora', 'id', 'orden', 'texto'])
    })
    mundo()
    await prueba('el horario de OTRO equipo, una herramienta de otro tipo, una fila de otra herramienta o de otro servicio: 403 genérico idéntico; nada se escribe', async () => {
      const ref = await post('horario', 'ana@ejemplo.test', { servicio: S1, herramienta: T_SCHED_B, accion: 'crear', texto: 'x' }); assert.equal(ref.status, 403); assert.deepEqual(ref.body, GENERICO); sinCache(ref)
      for (const c of [{ herramienta: NOEXISTE, accion: 'crear', texto: 'x' }, { herramienta: T_NOTES_A, accion: 'crear', texto: 'x' }, { ...hz, accion: 'editar', fila: U(61), texto: 'x' }, { ...hz, accion: 'eliminar', fila: NOEXISTE }, { ...hz, servicio: SX, accion: 'crear', texto: 'x' }]) { const r = await post('horario', 'ana@ejemplo.test', { servicio: S1, ...c }); assert.equal(r.status, 403, JSON.stringify(c)); assert.deepEqual(r.body, ref.body) }
      assert.equal((await post('horario', 'beto@ejemplo.test', { ...hz, accion: 'crear', texto: 'x' })).status, 403); assert.equal((await post('horario', 'cami@ejemplo.test', { ...hz, accion: 'crear', texto: 'x' })).status, 403)
      const g = await llamar('horario', 'GET', 'ana@ejemplo.test', null, `http://x/?servicio=${S1}&herramienta=${T_SCHED_B}`); assert.equal(g.status, 403); assert.deepEqual(g.body, GENERICO); sinCache(g); NO_ESCRIBIO()
      assert.equal((await post('horario', 'ana@ejemplo.test', { ...hz, servicio: SPASADO, accion: 'crear', texto: 'x' })).status, 409)
      assert.equal((await post('horario', 'ana@ejemplo.test', { ...hz, accion: 'crear', texto: '' })).status, 400); assert.equal((await post('horario', 'ana@ejemplo.test', { ...hz, accion: 'crear', texto: 'x', hora: 'x'.repeat(30) })).status, 400)
      assert.equal((await post('horario', 'ana@ejemplo.test', { ...hz, accion: 'crear', texto: 'x', team_id: TB })).status, 400); NO_ESCRIBIO()
      assert.equal((await post('horario', 'dani@ejemplo.test', { servicio: S1, herramienta: T_SCHED_B, accion: 'crear', texto: 'admin' })).status, 200)
    })

    console.log('notas')
    mundo()
    const nt = { servicio: S1, herramienta: T_NOTES_A }
    await prueba('el líder guarda las notas de su equipo (actualiza la existente; si no hay, crea): solo service_notes; el texto es lo único libre', async () => {
      assert.equal((await post('notas', 'ana@ejemplo.test', { ...nt, texto: 'Traer cables' })).status, 200); assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['service_notes', 'update']]); revisarEscrituras()
      db.service_notes.length = 0; estado.escrituras.length = 0
      assert.equal((await post('notas', 'ana@ejemplo.test', { ...nt, texto: 'Primera nota' })).status, 200); assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['service_notes', 'insert']]); assert.equal(escrituras()[0].valor.team_id, TA); revisarEscrituras()
      const g = await llamar('notas', 'GET', 'ana@ejemplo.test', null, `http://x/?servicio=${S1}&herramienta=${T_NOTES_A}`); assert.deepEqual(g.body, { cerrado: false, texto: 'Primera nota' }); sinCache(g)
    })
    mundo()
    await prueba('notas de otro equipo, herramienta de otro tipo, sin rol, sin sesión, cerrado, demasiado largo o con campos de más: rechazado y sin escribir', async () => {
      const ref = await post('notas', 'beto@ejemplo.test', { ...nt, texto: 'x' }); assert.equal(ref.status, 403); assert.deepEqual(ref.body, GENERICO)
      assert.equal((await post('notas', 'ana@ejemplo.test', { servicio: S1, herramienta: T_SCHED_A, texto: 'x' })).status, 403); assert.equal((await post('notas', 'cami@ejemplo.test', { ...nt, texto: 'x' })).status, 403); assert.equal((await post('notas', null, { ...nt, texto: 'x' })).status, 401)
      assert.equal((await post('notas', 'ana@ejemplo.test', { ...nt, servicio: SPASADO, texto: 'x' })).status, 409); assert.equal((await post('notas', 'ana@ejemplo.test', { ...nt, texto: 'x'.repeat(5001) })).status, 400); assert.equal((await post('notas', 'ana@ejemplo.test', { ...nt, texto: 'x', team_id: TB })).status, 400); NO_ESCRIBIO()
      assert.equal((await post('notas', 'dani@ejemplo.test', { ...nt, texto: 'admin' })).status, 200)
    })

    console.log('equipo (composición)')
    mundo()
    await prueba('el líder agrega a una persona EXISTENTE a su equipo: team_members con is_leader SIEMPRE false; el equipo del pedido se valida contra los que lidera', async () => {
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, persona: M.zoe })).status, 200); assert.deepEqual(llaves(escrituras()[0].valor), ESCRIBIBLE.team_members); assert.equal(escrituras()[0].valor.is_leader, false); assert.equal(escrituras()[0].valor.organization_id, ORG); revisarEscrituras()
      estado.escrituras.length = 0
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: TB, persona: M.zoe })).status, 403, 'otro equipo'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: TX, persona: M.zoe })).status, 403, 'equipo de otra organización')
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: NOEXISTE, persona: M.zoe })).status, 403); assert.equal((await post('equipo', 'cami@ejemplo.test', { accion: 'agregar', equipo: TA, persona: M.zoe })).status, 403)
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, persona: M.pablo })).status, 409, 'ya está'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, persona: M.fer })).status, 409, 'persona de otra organización'); NO_ESCRIBIO()
    })
    mundo()
    await prueba('NADIE se otorga ni quita un rol: is_leader, rol, administrador, team_admins y similares se rechazan (400) en todas las acciones, y la base queda igual', async () => {
      const antes = JSON.stringify(db.team_members)
      for (const extra of [{ is_leader: true }, { esLider: true }, { rol: 'admin' }, { role: 'owner' }, { team_admins: true }, { organization_members: true }]) {
        assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, persona: M.zoe, ...extra })).status, 400, JSON.stringify(extra))
        assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'posiciones', integrante: U(52), posiciones: [], ...extra })).status, 400)
        assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(52), ...extra })).status, 400)
      }
      NO_ESCRIBIO(); assert.equal(JSON.stringify(db.team_members), antes)
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(50) })).status, 409, 'no puede quitarse a sí misma (es líder)'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(56) })).status, 409, 'ni quitar a otra líder de su equipo'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'cambiar-lider', integrante: U(52) })).status, 400, 'no existe esa acción')
      assert.equal((await post('equipo', 'dani@ejemplo.test', { accion: 'quitar', integrante: U(55) })).status, 409, 'ni siquiera un administrador se quita a sí mismo desde aquí'); NO_ESCRIBIO()
    })
    mundo()
    await prueba('quitar a una persona de SU equipo (borra su fila y sus posiciones); no a un líder; el equipo sale de la fila: una fila de otro equipo, inexistente o de otra organización dan el mismo 403', async () => {
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(52) })).status, 200); assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['team_member_positions', 'delete'], ['team_members', 'delete']]); estado.escrituras.length = 0
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(51) })).status, 403, 'es de Producción'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: NOEXISTE })).status, 403)
      assert.equal((await post('equipo', 'beto@ejemplo.test', { accion: 'quitar', integrante: U(53) })).status, 403); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(50) })).status, 409); NO_ESCRIBIO()
      assert.equal((await post('equipo', 'dani@ejemplo.test', { accion: 'quitar', integrante: U(54) })).status, 200, 'el administrador sí, en cualquier equipo')
    })
    mundo()
    await prueba('no se puede quitar a quien tiene servicios PRÓXIMOS en ese equipo: 409 que dice cuántas y en qué servicios (fecha y título) y «Pide a quien administra que lo resuelva»; no se escribe nada', async () => {
      const quitar = (id, quien = 'ana@ejemplo.test') => post('equipo', quien, { accion: 'quitar', integrante: id })
      const conAsig = await quitar(U(53))      // Pablo: asignado en una posición de Alabanza en un servicio futuro
      assert.equal(conAsig.status, 409); sinCache(conAsig); assert.ok(/1 asignación/.test(conAsig.body.error) && /\(Servicio\)/.test(conAsig.body.error) && /Pide a quien administra que lo resuelva\./.test(conAsig.body.error), conAsig.body.error); assert.ok(!/convocatoria/.test(conAsig.body.error)); NO_ESCRIBIO()
      db.invitations = [{ id: 'iv1', service_id: S1, member_id: M.cami, team_id: TA, status: 'pendiente' }]
      const conInv = await quitar(U(52)); assert.equal(conInv.status, 409); assert.ok(/1 convocatoria/.test(conInv.body.error) && !/asignación/.test(conInv.body.error), conInv.body.error); NO_ESCRIBIO()
      db.banda_assignments.push({ id: 'b2', service_id: S1, team_position_id: PA2, member_id: M.cami, slot_index: 1 })
      const ambas = await quitar(U(52)); assert.equal(ambas.status, 409); assert.ok(/1 asignación y 1 convocatoria/.test(ambas.body.error), ambas.body.error); NO_ESCRIBIO()
      assert.equal((await quitar(U(52), 'dani@ejemplo.test')).status, 409, 'el administrador por esta ruta tiene el mismo bloqueo')
      assert.equal((await quitar(U(52), 'cami@ejemplo.test')).status, 403, 'sin rol, el 403 de siempre (no se averigua nada)'); NO_ESCRIBIO()
    })
    mundo()
    await prueba('el mensaje lista hasta 5 servicios con «y N más»', async () => {
      db.services.push(...[11, 12, 13, 14, 15].map(n => ({ id: U(80 + n), fecha: `2099-02-${String(n).padStart(2, '0')}`, titulo: 'Servicio — otro', organization_id: ORG })))
      db.invitations = [S1, ...[11, 12, 13, 14, 15].map(n => U(80 + n))].map((sid, i) => ({ id: 'iv' + i, service_id: sid, member_id: M.cami, team_id: TA, status: 'pendiente' }))
      const r = await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(52) }); assert.equal(r.status, 409); assert.ok(/6 convocatorias/.test(r.body.error) && / y 1 más\./.test(r.body.error), r.body.error); NO_ESCRIBIO()
    })
    mundo()
    await prueba('NO cuenta lo de otro equipo, lo de otra organización ni lo pasado: se puede quitar', async () => {
      db.invitations = [{ id: 'a', service_id: S1, member_id: M.cami, team_id: TB, status: 'pendiente' }, { id: 'b', service_id: SX, member_id: M.cami, team_id: TA, status: 'pendiente' }, { id: 'c', service_id: SPASADO, member_id: M.cami, team_id: TA, status: 'confirmado' }]
      db.banda_assignments.push({ id: 'b3', service_id: S1, team_position_id: PB1, member_id: M.cami, slot_index: 1 }, { id: 'b4', service_id: SPASADO, team_position_id: PA1, member_id: M.cami, slot_index: 1 })
      const r = await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(52) }); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['team_member_positions', 'delete'], ['team_members', 'delete']])
      assert.ok(!estado.escrituras.some(w => ['banda_assignments', 'invitations'].includes(w.tabla)), 'esta ruta no toca asignaciones ni convocatorias')
    })
    mundo()
    await prueba('el equipo sale de la FILA del integrante, nunca del pedido: un «equipo» de más en «quitar» se ignora (no cambia a quién se quita ni qué se revisa)', async () => {
      db.invitations = [{ id: 'iv', service_id: S1, member_id: M.rita, team_id: TB, status: 'pendiente' }]
      const ajena = await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(54), equipo: TA }); assert.equal(ajena.status, 403, 'Rita es de Producción: el equipo del pedido no la acerca a Ana'); NO_ESCRIBIO()
      const propia = await post('equipo', 'ana@ejemplo.test', { accion: 'quitar', integrante: U(52), equipo: TB }); assert.equal(propia.status, 200)
      assert.deepEqual(escrituras().map(w => [w.tabla, w.filas && w.filas.length]), [['team_member_positions', 1], ['team_members', 1]]); assert.ok(!db.team_members.some(t => t.id === U(52)) && db.team_members.some(t => t.id === U(54)))
    })
    mundo()
    await prueba('las posiciones de una persona de su equipo: agrega y quita (solo team_member_positions); solo posiciones ACTIVAS del mismo equipo; is_leader no cambia', async () => {
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'posiciones', integrante: U(52), posiciones: [PA2] })).status, 200); assert.deepEqual(escrituras().map(w => [w.tabla, w.op]), [['team_member_positions', 'delete'], ['team_member_positions', 'insert']]); revisarEscrituras(); estado.escrituras.length = 0
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'posiciones', integrante: U(52), posiciones: [PB1] })).status, 400, 'posición de otro equipo'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'posiciones', integrante: U(52), posiciones: [PARCH] })).status, 400, 'archivada')
      assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'posiciones', integrante: U(54), posiciones: [PB1] })).status, 403, 'integrante de otro equipo'); assert.equal((await post('equipo', 'ana@ejemplo.test', { accion: 'posiciones', integrante: U(52), posiciones: 'x' })).status, 400); NO_ESCRIBIO()
      assert.deepEqual(db.team_members.filter(t => t.is_leader).map(t => t.member_id).sort(), [M.ana, M.beto, M.luz].sort())
    })
    mundo()
    await prueba('GET de la composición: solo de un equipo que lidera; devuelve ids, nombres y posiciones, sin teléfono, correo ni nacimiento', async () => {
      const g = await llamar('equipo', 'GET', 'ana@ejemplo.test', null, `http://x/?equipo=${TA}`); assert.equal(g.status, 200); sinCache(g); assert.deepEqual(llaves(g.body), ['integrantes', 'posiciones'], 'ya no entrega la lista de personas: el selector usa la búsqueda por nombre (/api/lider/personas/buscar)')
      for (const i of g.body.integrantes) assert.deepEqual(llaves(i), ['apellido', 'esLider', 'id', 'nombre', 'posiciones']); for (const p of g.body.posiciones) assert.deepEqual(llaves(p), ['id', 'nombre'])
      const t = JSON.stringify(g.body); for (const c of ['CANARIO', '1999-12-31', '@ejemplo.test']) assert.ok(!t.includes(c), c)
      assert.ok(!g.body.posiciones.some(p => p.nombre === 'Archivada')); assert.ok(!t.includes(M.zoe) && !t.includes(M.fer), 'ninguna persona que no es del equipo')
      for (const eq of [TB, TX, NOEXISTE, 'mal']) { const r = await llamar('equipo', 'GET', 'ana@ejemplo.test', null, `http://x/?equipo=${eq}`); assert.equal(r.status, 403); assert.deepEqual(r.body, GENERICO); sinCache(r) }
    })

    console.log('herramientas')
    mundo()
    db.team_tools = db.team_tools.filter(t => t.id !== T_NOTES_A)
    await prueba('el líder AGREGA una herramienta a su equipo (solo team_tools; checklist, horario o notas); no puede quitarla ni agregar Orden ni archivos; otro equipo 403; ya existe 409', async () => {
      assert.equal((await post('herramientas', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, tipo: 'notes' })).status, 200); assert.deepEqual(llaves(escrituras()[0].valor), ESCRIBIBLE.team_tools); revisarEscrituras(); estado.escrituras.length = 0
      assert.equal((await post('herramientas', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, tipo: 'notes' })).status, 409)
      for (const tipo of ['setlist', 'file_upload', 'otra']) assert.equal((await post('herramientas', 'ana@ejemplo.test', { accion: 'agregar', equipo: TA, tipo })).status, 400, tipo)
      assert.equal((await post('herramientas', 'ana@ejemplo.test', { accion: 'quitar', equipo: TA, tipo: 'notes' })).status, 400, 'quitar no existe para el líder'); assert.equal((await post('herramientas', 'ana@ejemplo.test', { accion: 'agregar', equipo: TB, tipo: 'checklist' })).status, 403)
      assert.equal((await post('herramientas', 'cami@ejemplo.test', { accion: 'agregar', equipo: TA, tipo: 'checklist' })).status, 403); assert.equal((await post('herramientas', null, { accion: 'agregar', equipo: TA, tipo: 'checklist' })).status, 401); NO_ESCRIBIO()
      assert.equal((await post('herramientas', 'dani@ejemplo.test', { accion: 'agregar', equipo: TB, tipo: 'notes' })).status, 200)
      assert.ok(!estado.escrituras.some(w => w.op === 'delete'), 'ninguna ruta del líder borra herramientas')
    })

    console.log('código')
    await prueba('ninguna ruta del líder toca roles ni tablas fuera de su alcance; todas usan no-store, la sesión y el recorte por equipo', async () => {
      for (const n of ['asignar', 'cupos', 'horario', 'notas', 'equipo', 'herramientas']) {
        const c = fuente(`app/api/lider/${n}/route.ts`).replace(/\/\/.*$/gm, '')
        assert.ok(/lib\/lider\/escritura/.test(c), n); assert.ok(!/organization_members|team_admins|from\('members'\)\.(insert|update|delete|upsert)|\.rpc\(/.test(c), n); assert.ok(!/is_leader\s*:\s*(true|b\.|body)/.test(c), n)
        assert.ok(/CAMPOS/.test(c), `${n}: lista de campos`)
      }
      const h = fuente('lib/lider/escritura.ts').replace(/\/\/.*$/gm, ''); assert.ok(/NO_STORE/.test(h) && /requireLiderDeLaSesion/.test(h) && /equiposLiderados/.test(h))
    })
  } finally { soltarReloj(); console.info = infoOriginal }
  terminar()
})
