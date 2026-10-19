// Paso 0a del punto 50, commit 5: el cron de recordatorios trabaja con la llave de servicio, pero SOLO después de validar CRON_SECRET.
const { assert, db, ID, S, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const real = n => require(resolver(path.join(RAIZ, n)))
const correos = [], pushes = []
stubs['@/lib/email'] = { ...real('lib/email'), enviarCorreo: async m => { correos.push(m); return { ok: true } } }
stubs['@/lib/push'] = { isVapidReady: () => true, sendPushToMember: async (id, p) => { pushes.push({ id, p }); return { subs: 1, delivered: 1 } }, sendPushToMembers: async () => ({}) }
stubs['@/lib/auth/libraryAccess'] = { ...stubs['@/lib/auth/libraryAccess'], libraryAccessChecker: () => async () => false }
const { GET } = real('app/api/reminder/route')
const req = h => ({ headers: { get: n => (n.toLowerCase() === 'authorization' ? h : null) } })
process.env.CRON_SECRET = 'cron-secreto-de-prueba-123'; process.env.NEXT_PUBLIC_APP_URL = 'https://app.ejemplo.test'
const OK = 'Bearer cron-secreto-de-prueba-123'

correr(async () => {
  await prueba('sin la cabecera correcta (o sin CRON_SECRET) → 401: no consulta, no escribe y no envía nada', async () => {
    mundo(); estado.escrituras.length = 0; estado.consultas = 0; correos.length = 0; pushes.length = 0
    for (const h of [null, '', 'Bearer otro', 'cron-secreto-de-prueba-123']) assert.equal((await GET(req(h))).status, 401, String(h))
    const g = process.env.CRON_SECRET, ne = process.env.NODE_ENV; delete process.env.CRON_SECRET; process.env.NODE_ENV = 'production'
    try { assert.equal((await GET(req(OK))).status, 401, 'sin CRON_SECRET en producción cierra') } finally { process.env.CRON_SECRET = g; process.env.NODE_ENV = ne }
    assert.equal(estado.consultas, 0); assert.equal(estado.escrituras.length, 0); assert.equal(correos.length + pushes.length, 0) })
  await prueba('con el secreto correcto: recuerda a quien tiene una aceptación pendiente (correo + push) y marca last_reminder_at', async () => {
    mundo(); estado.escrituras.length = 0; correos.length = 0; pushes.length = 0
    db.members.find(m => m.id === ID.ME).email = 'ana@ejemplo.test'
    const r = await GET(req(OK)); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.ok(/aceptación pendiente/.test(r.body.message), r.body.message)
    assert.ok(pushes.some(p => p.id === ID.ME), 'push a la persona con invitación pendiente'); assert.ok(estado.escrituras.some(e => e.tabla === 'invitations' && e.op === 'update' && e.valor.last_reminder_at)) })
  terminar()
})
