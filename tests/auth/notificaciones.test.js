// Paso 0a del punto 50, commit 2: las 4 rutas que llama el disparador de la base (chat, respuesta de convocatoria, setlist, nómina).
// Comprueba: sin secreto o con secreto malo → 401 sin leer ni enviar nada; ids de otra organización → 403 sin enviar push; el camino correcto sigue funcionando. Correr: `npm run test:auth`.
const { assert, db, ID, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const push = { aMiembros: [], aMiembro: [] }
stubs['@/lib/push'] = { isVapidReady: () => true, getVapidError: () => null,
  sendPushToMembers: async (ids, p) => { push.aMiembros.push({ ids, p }); return { totalSubs: ids.length, totalDelivered: ids.length, membersWithNoSub: 0 } },
  sendPushToMember: async (id, p) => { push.aMiembro.push({ id, p }); return { subs: 1, delivered: 1 } } }
const ruta = n => require(resolver(path.join(RAIZ, `app/api/${n}/route`)))
const chat = ruta('chat-notify'), rsvp = ruta('rsvp-notify'), setlist = ruta('setlist-notify'), nomina = ruta('nomina-notify')
const SECRETO = 'secreto-interno-de-prueba-123'
process.env.INTERNAL_API_SECRET = SECRETO; delete process.env.INTERNAL_API_SECRET_NUEVO
const req = (cuerpo, secreto = SECRETO) => ({ headers: { get: n => (n === 'x-internal-secret' ? secreto : null) }, json: async () => cuerpo })
const limpiar = () => { mundo(); estado.escrituras.length = 0; push.aMiembros.length = 0; push.aMiembro.length = 0; estado.consultas = 0 }
const mundoAvisos = () => {
  limpiar(); const { ME, O1, O2, TA } = ID, AJ = ID.AJ, S1 = db.services[1].id
  db.banda_assignments = [{ id: 'b1', service_id: S1, member_id: O1 }]; db.invitations = [{ id: 'i1', service_id: S1, member_id: O2, status: 'confirmado' }, { id: 'i2', service_id: S1, member_id: ME, status: 'pendiente' }]
  db.team_admins = [{ id: 'a1', member_id: O1, team_id: null, organization_id: ID.ORG }, { id: 'a2', member_id: AJ.member, team_id: null, organization_id: ID.ORG2 }, { id: 'a3', member_id: O2, team_id: TA, organization_id: ID.ORG }]
  db.chat_presence = []; return { S1 }
}

correr(async () => {
  const todas = [['chat-notify', chat, () => ({ senderMemberId: ID.ME, content: 'hola' })], ['rsvp-notify', rsvp, () => ({ memberId: ID.ME, status: 'confirmado' })],
    ['setlist-notify', setlist, () => ({ serviceId: db.services[1].id })], ['nomina-notify', nomina, () => ({ memberId: ID.ME, serviceId: db.services[1].id })]]
  console.log('secreto interno obligatorio')
  for (const [nombre, m, cuerpo] of todas) {
    await prueba(`${nombre}: sin cabecera, con cabecera mala o sin secreto en el entorno → 401, sin consultar ni enviar nada`, async () => {
      mundoAvisos()
      for (const s of [null, '', 'otro', SECRETO + ' ']) { const r = await m.POST(req(cuerpo(), s)); assert.equal(r.status, 401, String(s)) }
      const guardado = process.env.INTERNAL_API_SECRET; delete process.env.INTERNAL_API_SECRET
      try { const r = await m.POST(req(cuerpo(), 'cualquiera')); assert.equal(r.status, 401, 'sin INTERNAL_API_SECRET nunca pasa'); assert.equal((await m.POST(req(cuerpo(), ''))).status, 401) } finally { process.env.INTERNAL_API_SECRET = guardado }
      assert.equal(estado.consultas, 0); assert.equal(estado.escrituras.length, 0); assert.equal(push.aMiembros.length + push.aMiembro.length, 0) })
  }
  await prueba('rotación: con INTERNAL_API_SECRET_NUEVO también pasa el nuevo (y sigue pasando el viejo)', async () => {
    mundoAvisos(); process.env.INTERNAL_API_SECRET_NUEVO = 'nuevo-secreto-de-prueba-456'
    try { assert.equal((await setlist.POST(req({ serviceId: db.services[1].id }, 'nuevo-secreto-de-prueba-456'))).status, 200); assert.equal((await setlist.POST(req({ serviceId: db.services[1].id }, SECRETO))).status, 200) } finally { delete process.env.INTERNAL_API_SECRET_NUEVO } })

  console.log('chat-notify')
  await prueba('chat general: avisa SOLO a las personas de la organización de quien escribe (no a otra organización) y no a quien escribió', async () => {
    mundoAvisos(); const r = await chat.POST(req({ senderMemberId: ID.ME, content: 'hola a todos' })); assert.equal(r.status, 200)
    const ids = push.aMiembros[0].ids; assert.ok(ids.includes(ID.O1) && ids.includes(ID.O2)); assert.ok(!ids.includes(ID.ME)); assert.ok(!ids.includes(ID.AJ.member), 'una persona de OTRA organización no recibe el aviso')
    for (const id of ids) assert.equal(db.members.find(m => m.id === id).organization_id, ID.ORG) })
  await prueba('chat de servicio: avisa a quienes participan de ese día; un servicio de otra organización → 403 sin push', async () => {
    const { S1 } = mundoAvisos(); const r = await chat.POST(req({ senderMemberId: ID.ME, serviceId: S1, content: 'x' })); assert.equal(r.status, 200); assert.deepEqual(push.aMiembros[0].ids.sort(), [ID.O1, ID.O2].sort())
    push.aMiembros.length = 0; const r2 = await chat.POST(req({ senderMemberId: ID.ME, serviceId: ID.AJ.service, content: 'x' })); assert.equal(r2.status, 403); assert.equal(push.aMiembros.length, 0) })
  await prueba('mensaje directo: a una persona de la misma organización va; a una de otra → 403 sin push', async () => {
    mundoAvisos(); assert.equal((await chat.POST(req({ senderMemberId: ID.ME, recipientMemberId: ID.O1, content: 'x' }))).status, 200); assert.deepEqual(push.aMiembros[0].ids, [ID.O1])
    push.aMiembros.length = 0; assert.equal((await chat.POST(req({ senderMemberId: ID.ME, recipientMemberId: ID.AJ.member, content: 'x' }))).status, 403); assert.equal(push.aMiembros.length, 0) })
  await prueba('chat: remitente inexistente → 404; ids que no son uuid o cuerpo incompleto → 400', async () => {
    mundoAvisos(); assert.equal((await chat.POST(req({ senderMemberId: '00000000-0000-0000-0000-00000000ffff', content: 'x' }))).status, 404)
    assert.equal((await chat.POST(req({ senderMemberId: "x' or '1'='1", content: 'x' }))).status, 400); assert.equal((await chat.POST(req({ senderMemberId: ID.ME, serviceId: 'no-uuid', content: 'x' }))).status, 400)
    assert.equal((await chat.POST(req({ senderMemberId: ID.ME }))).status, 400); assert.equal((await chat.POST(req(null))).status, 400); assert.equal(push.aMiembros.length, 0) })
  await prueba('chat: no avisa a quien está viendo ese chat ahora mismo', async () => {
    mundoAvisos(); db.chat_presence = [{ member_id: ID.O1, chat_id: 'team', updated_at: new Date().toISOString() }]
    await chat.POST(req({ senderMemberId: ID.ME, content: 'x' })); assert.ok(!push.aMiembros[0].ids.includes(ID.O1)); assert.ok(push.aMiembros[0].ids.includes(ID.O2)) })

  console.log('rsvp-notify')
  await prueba('avisa a los administradores de la organización de quien respondió (no a los de otra) y no a esa misma persona', async () => {
    const { S1 } = mundoAvisos(); const r = await rsvp.POST(req({ memberId: ID.ME, serviceId: S1, teamId: ID.TA, status: 'confirmado' })); assert.equal(r.status, 200)
    assert.deepEqual(push.aMiembros[0].ids, [ID.O1], 'solo el admin global de la organización: O1 (O2 es admin de un equipo, no global)'); assert.ok(!push.aMiembros[0].ids.includes(ID.AJ.member)) })
  await prueba('un servicio o un equipo de otra organización → 403 sin push; declinación por conflicto no avisa a nadie', async () => {
    const { S1 } = mundoAvisos()
    assert.equal((await rsvp.POST(req({ memberId: ID.ME, serviceId: ID.AJ.service, status: 'confirmado' }))).status, 403); assert.equal((await rsvp.POST(req({ memberId: ID.ME, serviceId: S1, teamId: ID.AJ.team, status: 'confirmado' }))).status, 403)
    const r = await rsvp.POST(req({ memberId: ID.ME, serviceId: S1, status: 'declinado', declinedReason: 'conflict' })); assert.equal(r.status, 200); assert.equal(r.body.targeted, 0); assert.equal(push.aMiembros.length, 0) })
  await prueba('quien responde de OTRA organización nunca avisa a los admins de la primera (aquí su único admin es él mismo: no se avisa a nadie)', async () => {
    mundoAvisos(); const r = await rsvp.POST(req({ memberId: ID.AJ.member, status: 'confirmado' })); assert.equal(r.status, 200); assert.equal(r.body.targeted, 0); assert.equal(push.aMiembros.length, 0)
    db.team_admins.push({ id: 'a9', member_id: ID.O2, team_id: null, organization_id: ID.ORG2 }); await rsvp.POST(req({ memberId: ID.AJ.member, status: 'confirmado' })); assert.deepEqual(push.aMiembros[0].ids, [ID.O2], 'solo los admins de su organización (los lee por organization_id)') })
  await prueba('rsvp: persona inexistente → 404; datos incompletos o no uuid → 400', async () => {
    mundoAvisos(); assert.equal((await rsvp.POST(req({ memberId: '00000000-0000-0000-0000-00000000ffff', status: 'x' }))).status, 404); assert.equal((await rsvp.POST(req({ memberId: 'nope', status: 'x' }))).status, 400); assert.equal((await rsvp.POST(req({}))).status, 400) })

  console.log('setlist-notify')
  await prueba('avisa a quienes confirmaron ese servicio; servicio inexistente → 404; id que no es uuid → 400', async () => {
    const { S1 } = mundoAvisos(); const r = await setlist.POST(req({ serviceId: S1 })); assert.equal(r.status, 200); assert.deepEqual(push.aMiembros[0].ids, [ID.O2])
    assert.equal((await setlist.POST(req({ serviceId: '00000000-0000-0000-0000-00000000ffff' }))).status, 404); assert.equal((await setlist.POST(req({ serviceId: 'x' }))).status, 400); assert.equal((await setlist.POST(req({}))).status, 400) })

  console.log('nomina-notify')
  await prueba('avisa a la persona de la organización del servicio; una persona de otra organización → 403 sin push; ids malos → 400/404', async () => {
    const { S1 } = mundoAvisos(); assert.equal((await nomina.POST(req({ memberId: ID.ME, serviceId: S1 }))).status, 200); assert.equal(push.aMiembro[0].id, ID.ME)
    push.aMiembro.length = 0; assert.equal((await nomina.POST(req({ memberId: ID.AJ.member, serviceId: S1 }))).status, 403); assert.equal(push.aMiembro.length, 0)
    assert.equal((await nomina.POST(req({ memberId: ID.ME, serviceId: ID.AJ.service }))).status, 403); assert.equal((await nomina.POST(req({ memberId: ID.ME, serviceId: '00000000-0000-0000-0000-00000000ffff' }))).status, 404)
    assert.equal((await nomina.POST(req({ memberId: 'x', serviceId: S1 }))).status, 400); assert.equal((await nomina.POST(req({ memberId: ID.ME }))).status, 400) })
  terminar()
})
