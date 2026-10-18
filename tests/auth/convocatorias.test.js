// Paso 0a del punto 50, commit 3: send-invites, send-ensayo-invites y reassignment-notify (convocatorias y reinvitación).
// Comprueba: sin sesión → 401 y sin escribir ni enviar nada; sesión sin permiso o de otra organización → 403; ids de otra organización → no se convoca ni se escribe a nadie ajeno; el camino correcto sigue funcionando.
const { assert, db, ID, S, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const real = n => require(resolver(path.join(RAIZ, n)))
const correos = [], pushes = []; let quien = 'admin'      // admin = administrador de la organización #1; otro = sesión sin permiso; nadie = sin sesión
stubs['@/lib/auth/authorize'] = { requireOrgAdmin: async org => quien === 'nadie' ? { ok: false, response: { status: 401, body: { error: 'No autorizado' } } } : quien === 'admin' && org === ID.ORG ? { ok: true, email: 'admin@ejemplo.test' } : { ok: false, response: { status: 403, body: { error: 'No autorizado' } } } }
stubs['@/lib/auth/libraryAccess'] = { ...stubs['@/lib/auth/libraryAccess'], libraryAccessChecker: () => async () => false }
stubs['@/lib/email'] = { ...real('lib/email'), enviarCorreo: async m => { correos.push(m); return { ok: true } } }
stubs['@/lib/emailDominio'] = { crearValidadorCorreo: () => async () => ({ estado: 'ok' }) }
stubs['@/lib/push'] = { isVapidReady: () => true, getVapidError: () => null, sendPushToMember: async (id, p) => { pushes.push({ id, p }); return { subs: 1, delivered: 1 } }, sendPushToMembers: async () => ({}) }
process.env.NEXT_PUBLIC_APP_URL = 'https://app.ejemplo.test'
const ruta = n => real(`app/api/${n}/route`)
const invites = ruta('send-invites'), ensayo = ruta('send-ensayo-invites'), reasig = ruta('reassignment-notify')
const req = cuerpo => ({ json: async () => cuerpo })
const preparar = () => { mundo(); quien = 'admin'; estado.escrituras.length = 0; correos.length = 0; pushes.length = 0 }
const sinEfectos = () => { assert.equal(estado.escrituras.length, 0, 'no escribió nada'); assert.equal(correos.length, 0, 'no mandó correos'); assert.equal(pushes.length, 0, 'no mandó push') }

correr(async () => {
  const S1 = S(1), E1 = S(6)
  console.log('send-invites')
  await prueba('sin sesión → 401; sesión sin permiso → 403; administrador de OTRA organización sobre este servicio → 403: nada escrito ni enviado', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; const r = await invites.POST(req({ serviceId: S1, force: true })); assert.equal(r.status, q === 'nadie' ? 401 : 403); sinEfectos() }
    preparar(); db.services.find(s => s.id === S1).organization_id = ID.ORG2; assert.equal((await invites.POST(req({ serviceId: S1, force: true }))).status, 403); sinEfectos() })
  await prueba('un serviceId que no es uuid → 400 sin consultar; inexistente → 404', async () => {
    preparar(); assert.equal((await invites.POST(req({ serviceId: "x' or '1'='1" }))).status, 400); assert.equal((await invites.POST(req({}))).status, 400)
    assert.equal((await invites.POST(req({ serviceId: '00000000-0000-0000-0000-00000000ffff' }))).status, 404); sinEfectos() })
  await prueba('administrador de la organización: convoca a las personas asignadas de su organización; una persona de otra organización asignada por error NO recibe invitación ni correo', async () => {
    preparar(); db.banda_assignments.push({ id: 'bx', service_id: S1, member_id: ID.AJ.member, team_position_id: ID.P1, slot_index: 3 }); db.members.find(m => m.id === ID.AJ.member).email = 'ajena@ejemplo.test'
    db.members.find(m => m.id === ID.ME).email = 'ana@ejemplo.test'
    const r = await invites.POST(req({ serviceId: S1, force: true, teamId: ID.TA })); assert.equal(r.status, 200, JSON.stringify(r.body))
    const a = r.body.results.map(x => x.memberId); assert.ok(a.includes(ID.ME)); assert.ok(!a.includes(ID.AJ.member), 'la persona de otra organización no entra')
    assert.ok(estado.escrituras.filter(e => e.tabla === 'invitations' && e.op === 'upsert').every(e => e.valor.member_id !== ID.AJ.member)); assert.ok(!correos.some(c => c.to === 'ajena@ejemplo.test')); assert.ok(correos.some(c => c.to === 'ana@ejemplo.test')) })

  console.log('send-ensayo-invites')
  await prueba('sin sesión → 401; sesión sin permiso → 403; ensayo de otra organización → 403: nada escrito ni enviado', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; assert.equal((await ensayo.POST(req({ serviceId: E1 }))).status, q === 'nadie' ? 401 : 403); sinEfectos() }
    preparar(); db.services.find(s => s.id === E1).organization_id = ID.ORG2; assert.equal((await ensayo.POST(req({ serviceId: E1 }))).status, 403); sinEfectos() })
  await prueba('convoca solo a personas de la organización del ensayo: una persona convocable de OTRA organización no recibe nada, ni pidiéndola por id', async () => {
    preparar(); const aj = db.members.find(m => m.id === ID.AJ.member); Object.assign(aj, { instrumentos: ['Bajo'], email: 'ajena@ejemplo.test' }); db.members.find(m => m.id === ID.ME).email = 'ana@ejemplo.test'
    for (const cuerpo of [{ serviceId: E1 }, { serviceId: E1, memberIds: [ID.ME, ID.AJ.member] }]) {
      correos.length = 0; estado.escrituras.length = 0; const r = await ensayo.POST(req(cuerpo)); assert.equal(r.status, 200, JSON.stringify(r.body))
      assert.ok(!r.body.results.some(x => x.memberId === ID.AJ.member)); assert.ok(!correos.some(c => c.to === 'ajena@ejemplo.test')); assert.ok(correos.some(c => c.to === 'ana@ejemplo.test'))
      assert.ok(estado.escrituras.filter(e => e.tabla === 'invitations').every(e => e.valor.member_id !== ID.AJ.member)) }
    correos.length = 0; assert.equal((await ensayo.POST(req({ serviceId: E1, reintentarCorreoDe: ID.AJ.member }))).status, 404, 'reintento sobre una persona ajena') })
  await prueba('serviceId que no es uuid → 400', async () => { preparar(); assert.equal((await ensayo.POST(req({ serviceId: 'nope' }))).status, 400); sinEfectos() })

  console.log('reassignment-notify')
  await prueba('sin sesión → 401; sesión sin permiso → 403; servicio de otra organización → 403: no reinicia ninguna invitación', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; assert.equal((await reasig.POST(req({ memberId: ID.ME, serviceId: S1, teamId: ID.TA }))).status, q === 'nadie' ? 401 : 403); sinEfectos() }
    preparar(); db.services.find(s => s.id === S1).organization_id = ID.ORG2; assert.equal((await reasig.POST(req({ memberId: ID.ME, serviceId: S1, teamId: ID.TA }))).status, 403); sinEfectos() })
  await prueba('una persona o un equipo de OTRA organización → 403 sin escribir ni enviar; ids malos o cuerpo roto → 400', async () => {
    preparar(); assert.equal((await reasig.POST(req({ memberId: ID.AJ.member, serviceId: S1, teamId: ID.TA }))).status, 403); assert.equal((await reasig.POST(req({ memberId: ID.ME, serviceId: S1, teamId: ID.AJ.team }))).status, 403); sinEfectos()
    assert.equal((await reasig.POST(req({ memberId: 'x', serviceId: S1, teamId: ID.TA }))).status, 400); assert.equal((await reasig.POST(req(null))).status, 400); assert.equal((await reasig.POST(req({ memberId: ID.ME }))).status, 400); sinEfectos() })
  await prueba('camino correcto: el administrador reinvita a alguien de su organización (reinicia la invitación, manda correo y push)', async () => {
    preparar(); db.members.find(m => m.id === ID.ME).email = 'ana@ejemplo.test'
    const r = await reasig.POST(req({ memberId: ID.ME, serviceId: S1, teamId: ID.TA })); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.ok(/reinvit/.test(r.body.message), r.body.message)
    assert.ok(estado.escrituras.some(e => e.tabla === 'invitations' && e.op === 'update' && e.valor.status === 'pendiente')); assert.equal(correos.length, 1); assert.equal(pushes.length, 1) })
  terminar()
})
