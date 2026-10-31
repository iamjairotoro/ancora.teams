// El checklist del LÍDER y el acceso por equipo (etapa 1 del líder). Ejercita requireTeamAccess y requireLiderDeLaSesion REALES, con un cliente simulado cuyas funciones de la base (is_team_admin,
// is_team_leader, is_org_admin, is_any_team_leader) tienen la MISMA semántica que las de migrations/002 y 023: el árbol de equipos para is_team_admin, el equipo exacto para is_team_leader, los correos sin
// distinguir mayúsculas y la organización. El hueco de antes era que las pruebas del checklist usaban un autorizador falso. Correr: `npm run test:auth`.
const { assert, db, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
stubs['next/server'].NextResponse.json = (b, init) => ({ status: (init && init.status) || 200, body: JSON.parse(JSON.stringify(b)), headers: (init && init.headers) || {} })
let sesion = { email: null }
const lc = s => String(s || '').toLowerCase()
const emailDe = id => lc((db.members.find(m => m.id === id) || {}).email)
const cadena = (teamId) => { const out = new Set(); let t = db.teams.find(x => x.id === teamId); while (t && !out.has(t.id)) { out.add(t.id); t = db.teams.find(x => x.id === t.parent_team_id) } return out }
const RPC = {
  is_org_admin: a => db.organization_members.some(o => emailDe(o.person_id) === lc(a.p_email) && o.organization_id === a.p_organization_id && ['owner', 'admin'].includes(o.role)),
  is_team_admin: a => { const ch = cadena(a.p_team_id); return db.team_admins.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && (t.team_id == null || ch.has(t.team_id))) },
  is_team_leader: a => db.team_members.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && t.team_id === a.p_team_id && t.is_leader === true),
  is_any_team_leader: a => db.team_members.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && t.is_leader === true),
}
stubs['@/lib/supabase-server'] = { createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: sesion.email ? { email: sesion.email } : null } }) }, rpc: async (fn, a) => { assert.ok(RPC[fn], `función desconocida ${fn}`); return { data: RPC[fn](a) } } }) }
const { requireTeamAccess, requireLiderDeLaSesion } = require(resolver(path.join(RAIZ, 'lib/auth/authorize')))

const ORG = 'org-1', ORG2 = 'org-2'
const TA = 'team-a', TA1 = 'team-a-hijo', TB = 'team-b', TX = 'team-x-otra-org'
const mundo = () => {
  estado.escrituras.length = 0
  db.members = [
    { id: 'm-ana', email: 'Ana.LiderA@Ejemplo.test', organization_id: ORG }, { id: 'm-beto', email: 'beto.liderb@ejemplo.test', organization_id: ORG }, { id: 'm-cami', email: 'cami.sinrol@ejemplo.test', organization_id: ORG },
    { id: 'm-dani', email: 'dani.admin@ejemplo.test', organization_id: ORG }, { id: 'm-eli', email: 'eli.exadmin@ejemplo.test', organization_id: ORG }, { id: 'm-fer', email: 'fer.lider-x@ejemplo.test', organization_id: ORG2 },
    { id: 'm-gus', email: 'gus.adminA@ejemplo.test', organization_id: ORG }, { id: 'm-hana', email: 'hana.dos@ejemplo.test', organization_id: ORG }, { id: 'm-hana2', email: 'HANA.DOS@ejemplo.test', organization_id: ORG },
  ]
  db.teams = [{ id: TA, organization_id: ORG, parent_team_id: null }, { id: TA1, organization_id: ORG, parent_team_id: TA }, { id: TB, organization_id: ORG, parent_team_id: null }, { id: TX, organization_id: ORG2, parent_team_id: null }]
  db.team_members = [
    { member_id: 'm-ana', team_id: TA, organization_id: ORG, is_leader: true }, { member_id: 'm-beto', team_id: TB, organization_id: ORG, is_leader: true }, { member_id: 'm-cami', team_id: TA, organization_id: ORG, is_leader: false },
    { member_id: 'm-fer', team_id: TX, organization_id: ORG2, is_leader: true },
  ]
  db.organization_members = [{ person_id: 'm-dani', organization_id: ORG, role: 'admin' }, { person_id: 'm-eli', organization_id: ORG, role: 'admin' }]
  db.team_admins = [{ member_id: 'm-dani', team_id: null, organization_id: ORG }, { member_id: 'm-gus', team_id: TA, organization_id: ORG }]      // Eli es administradora SIN fila de team_admins; Gus es administrador solo del equipo A
}
const acceso = async (email, team, org = ORG) => { sesion = { email }; return requireTeamAccess(team, org) }
const GENERICO = { status: 403, body: { error: 'No autorizado' } }
const es403 = r => !r.ok && r.response.status === 403 && JSON.stringify(r.response.body) === JSON.stringify(GENERICO.body)

correr(async () => {
  console.log('requireTeamAccess (checklist del líder)')
  mundo()
  await prueba('un líder pasa en SU equipo', async () => { assert.equal((await acceso('ana.lidera@ejemplo.test', TA)).ok, true) })
  await prueba('un líder de otro equipo recibe el 403 genérico (y no puede tocar el checklist de A)', async () => { assert.ok(es403(await acceso('beto.liderb@ejemplo.test', TA))); assert.ok(es403(await acceso('ana.lidera@ejemplo.test', TB))) })
  await prueba('una persona sin rol (aunque esté en el equipo, sin ser líder) recibe el 403 genérico', async () => { assert.ok(es403(await acceso('cami.sinrol@ejemplo.test', TA))) })
  await prueba('un correo que no es de nadie, y uno de otra organización con su propio equipo, reciben el 403 genérico', async () => { assert.ok(es403(await acceso('nadie@ejemplo.test', TA))); assert.ok(es403(await acceso('fer.lider-x@ejemplo.test', TA))); assert.ok(es403(await acceso('fer.lider-x@ejemplo.test', TX, ORG))) })
  await prueba('el administrador pasa en cualquier equipo', async () => { assert.equal((await acceso('dani.admin@ejemplo.test', TA)).ok, true); assert.equal((await acceso('dani.admin@ejemplo.test', TB)).ok, true) })
  await prueba('el administrador de un equipo hereda a los hijos (como siempre); el LÍDER no hereda a los equipos hijos', async () => {
    assert.equal((await acceso('gus.admina@ejemplo.test', TA1)).ok, true, 'is_team_admin sube por el árbol')
    assert.ok(es403(await acceso('ana.lidera@ejemplo.test', TA1)), 'is_team_leader es del equipo exacto')
  })
  await prueba('quien perdió su fila de team_admins y no lidera nada (administradora sin la fila) ya no pasa por requireTeamAccess', async () => { assert.ok(es403(await acceso('eli.exadmin@ejemplo.test', TA))) })
  await prueba('sin sesión: 401', async () => { const r = await acceso(null, TA); assert.equal(r.ok, false); assert.equal(r.response.status, 401) })
  await prueba('el correo se compara sin distinguir mayúsculas', async () => { assert.equal((await acceso('ANA.LIDERA@EJEMPLO.TEST', TA)).ok, true) })
  await prueba('todos los rechazos de un líder o de una persona sin rol son IDÉNTICOS entre sí (no se distingue el motivo)', async () => {
    const a = await acceso('beto.liderb@ejemplo.test', TA), b = await acceso('cami.sinrol@ejemplo.test', TA), c = await acceso('nadie@ejemplo.test', TA)
    assert.deepEqual(a.response, b.response); assert.deepEqual(b.response, c.response)
  })

  console.log('requireLiderDeLaSesion (rutas /api/lider/*)')
  const lider = async email => { sesion = { email }; return requireLiderDeLaSesion() }
  await prueba('un líder: ok, con SUS equipos (no los de otro); la organización sale de la sesión', async () => {
    const r = await lider('ana.lidera@ejemplo.test'); assert.equal(r.ok, true); assert.equal(r.esAdmin, false); assert.equal(r.organizationId, ORG); assert.deepEqual([...r.equiposLiderados], [TA])
    const o = await lider('beto.liderb@ejemplo.test'); assert.deepEqual([...o.equiposLiderados], [TB])
  })
  await prueba('un administrador: ok y esAdmin; una persona sin rol: 403 genérico; sin sesión: 401', async () => {
    const d = await lider('dani.admin@ejemplo.test'); assert.equal(d.ok, true); assert.equal(d.esAdmin, true)
    const c = await lider('cami.sinrol@ejemplo.test'); assert.equal(c.ok, false); assert.equal(c.response.status, 403)
    const n = await lider(null); assert.equal(n.ok, false); assert.equal(n.response.status, 401)
  })
  await prueba('dos personas con el mismo correo (solo cambian las mayúsculas) no se adivinan: 403', async () => { const r = await lider('hana.dos@ejemplo.test'); assert.equal(r.ok, false); assert.equal(r.response.status, 403) })
  await prueba('ninguna de estas comprobaciones escribe en la base', async () => { assert.equal(estado.escrituras.length, 0) })
  terminar()
})
