// Paso 0a del punto 50, commit 5: el cron de recordatorios trabaja con la llave de servicio, pero SOLO después de validar CRON_SECRET.
const { assert, db, ID, S, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ, fijarReloj, soltarReloj } = require('../portal/_banco')
const fs = require('fs')
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
    db.team_members.push({ id: 'tm-ME-TB', member_id: ID.ME, team_id: ID.TB, is_leader: false })      // la invitación pendiente es del equipo TB: el cron solo recuerda a quien SIGUE en el equipo
    const r = await GET(req(OK)); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.ok(/aceptación pendiente/.test(r.body.message), r.body.message)
    assert.ok(pushes.some(p => p.id === ID.ME), 'push a la persona con invitación pendiente'); assert.ok(estado.escrituras.some(e => e.tabla === 'invitations' && e.op === 'update' && e.valor.last_reminder_at)) })
  console.log('pertenencia al equipo de la invitación (lider-cron-membresia)')
  const M = { a: 'm-a', b: 'm-b', c: 'm-c', d: 'm-d' }, EQ = { A: 'team-a', B: 'team-b' }
  const CORREO = k => `${k}@ejemplo.test`
  const mundoCron = (invs, miembros = [[M.a, EQ.A], [M.c, EQ.A]]) => {
    estado.escrituras.length = 0; correos.length = 0; pushes.length = 0; estado.fallan.clear()
    db.members = ['a', 'b', 'c', 'd'].map(k => ({ id: M[k], nombre: k.toUpperCase(), apellido: 'X', email: CORREO(k) }))
    db.teams = [{ id: EQ.A, name: 'Alabanza' }, { id: EQ.B, name: 'Producción' }]
    db.services = [{ id: 's-man', fecha: '2026-11-05', tipo: 'servicio' }, { id: 's-fut', fecha: '2026-11-20', tipo: 'servicio' }, { id: 's-ens', fecha: '2026-11-10', tipo: 'ensayo' }, { id: 's-pas', fecha: '2026-10-01', tipo: 'servicio' }]
    db.team_members = miembros.map(([m, t], i) => ({ id: 'tm' + i, member_id: m, team_id: t, is_leader: false }))
    db.banda_assignments = []; db.setlist_items = []
    db.invitations = invs.map((v, i) => ({ id: 'i' + i, token: 'tok' + i, sent_at: '2026-10-20', last_reminder_at: null, comentario: null, ...v }))
  }
  const inv = (service_id, k, team_id, status) => ({ service_id, member_id: M[k], team_id, status })
  const MUNDO_A = () => mundoCron([
    inv('s-fut', 'a', EQ.A, 'pendiente'), inv('s-fut', 'b', EQ.A, 'pendiente'), inv('s-fut', 'c', EQ.B, 'pendiente'), inv('s-fut', 'c', EQ.A, 'pendiente'), inv('s-ens', 'd', null, 'pendiente'),
    inv('s-man', 'a', EQ.A, 'confirmado'), inv('s-man', 'b', EQ.A, 'confirmado'), inv('s-man', 'c', EQ.B, 'confirmado'), inv('s-man', 'c', EQ.A, 'confirmado')])
  const conLogs = async f => { const e = console.error, i = console.info, sal = { errores: [], infos: [] }; console.error = (...a) => sal.errores.push(a.join(' ')); console.info = (...a) => sal.infos.push(a.join(' ')); try { return { ...sal, r: await f() } } finally { console.error = e; console.info = i } }
  const paraQuien = () => correos.map(c => c.to).sort()
  fijarReloj('2026-11-04T16:00:00Z')
  try {
    await prueba('solo recuerda a quien SIGUE en el equipo de la invitación (los ensayos, sin equipo, igual que antes): nada para quien salió, y una sola vez por persona con el enlace de la convocatoria vigente', async () => {
      MUNDO_A()
      const { r, infos } = await conLogs(() => GET(req(OK))); assert.equal(r.status, 200, JSON.stringify(r.body))
      assert.deepEqual(paraQuien(), [CORREO('a'), CORREO('a'), CORREO('c'), CORREO('c'), CORREO('d')], 'a y c reciben el de mañana y el de aceptación; d el del ensayo; b nada')
      assert.ok(!pushes.some(p => p.id === M.b) && !correos.some(c => c.to === CORREO('b')), 'quien salió del equipo no recibe nada')
      assert.deepEqual(pushes.map(p => `${p.id}|${p.p.tag}`).sort(), [`${M.a}|pendiente-s-fut-${EQ.A}`, `${M.a}|recordatorio-s-man`, `${M.c}|pendiente-s-fut-${EQ.A}`, `${M.c}|recordatorio-s-man`, `${M.d}|pendiente-s-ens-ensayo`].sort())
      const deManana = correos.find(c => c.to === CORREO('c') && /mañana/.test(c.subject)); assert.ok(deManana.html.includes('/portal/tok8') && !deManana.html.includes('tok7'), 'el enlace es el de la convocatoria del equipo al que SIGUE perteneciendo')
      assert.deepEqual(estado.escrituras.filter(e => e.tabla === 'invitations').flatMap(e => e.filas).sort(), ['i0', 'i3', 'i4'], 'solo se marca last_reminder_at de lo que se envió: lo omitido se reanuda si la persona vuelve al equipo')
      assert.equal(r.body.omitidasPorMembresia, 4); assert.ok(/1 recordatorio de aceptación pendiente|3 recordatorios de aceptación pendiente/.test(r.body.message), r.body.message); assert.ok(infos.some(l => /\[recordatorios\] 4 invitaciones omitidas/.test(l)))
      assert.ok(!('fallaMembresia' in r.body))
    })
    await prueba('SOLO REDUCE: en todas las combinaciones (en el equipo o no, con equipo o ensayo, pendiente o confirmada, enviada o no), los destinatarios nuevos son un subconjunto de los de antes, y la única diferencia es quien ya no está en el equipo', async () => {
      for (const miembro of [true, false]) for (const conEquipo of [true, false]) for (const estadoInv of ['pendiente', 'confirmado']) for (const enviada of [true, false]) {
        const sId = estadoInv === 'confirmado' ? 's-man' : (conEquipo ? 's-fut' : 's-ens')
        mundoCron([{ ...inv(sId, 'a', conEquipo ? EQ.A : null, estadoInv), sent_at: enviada ? '2026-10-20' : null }], miembro ? [[M.a, EQ.A]] : [])
        const antes = (estadoInv === 'confirmado' || enviada) ? [CORREO('a')] : []      // lo que enviaba el cron ANTES: confirmada de mañana, o pendiente ya enviada
        const r = (await conLogs(() => GET(req(OK)))).r; assert.equal(r.status, 200)
        const ahora = paraQuien(), nombre = JSON.stringify({ miembro, conEquipo, estadoInv, enviada })
        assert.ok(ahora.every(x => antes.includes(x)) && ahora.length <= antes.length, 'agregó un envío: ' + nombre)
        assert.deepEqual(ahora, (conEquipo && !miembro) ? [] : antes, nombre)
      }
    })
    await prueba('si la consulta de pertenencia FALLA: se OMITEN los recordatorios (no se envía como antes), responde 500, no marca nada y deja un error muy visible en los registros', async () => {
      MUNDO_A(); estado.fallan.add('team_members')
      const { r, errores } = await conLogs(() => GET(req(OK)))
      assert.equal(correos.length, 0, 'ningún correo'); assert.equal(pushes.length, 0, 'ningún push'); assert.equal(estado.escrituras.length, 0, 'ni siquiera last_reminder_at')
      assert.equal(r.status, 500); assert.equal(r.body.fallaMembresia, true)
      assert.ok(errores.some(l => /\[recordatorios\] ¡ERROR!/.test(l) && /OMITEN hoy/.test(l) && /aceptación pendiente/.test(l)), 'error del bloque de aceptación pendiente'); assert.ok(errores.some(l => /\[recordatorios\] ¡ERROR!/.test(l) && /mañana/.test(l)), 'error del bloque de mañana')
      estado.fallan.clear()
      mundoCron([inv('s-ens', 'd', null, 'pendiente')]); estado.fallan.add('team_members')
      const solo = await GET(req(OK)); assert.equal(solo.status, 200, 'sin invitaciones con equipo no hace falta la consulta'); assert.deepEqual(paraQuien(), [CORREO('d')])
    })
    await prueba('en el código: el secreto del cron se exige antes de todo, el filtro está en los dos bloques y no se agregó ninguna escritura ni envío (solo existe el update de last_reminder_at)', async () => {
      const c = fs.readFileSync(path.join(RAIZ, 'app/api/reminder/route.ts'), 'utf8').replace(/\/\/.*$/gm, '')
      assert.ok(c.indexOf('requireCronSecret(req)') > 0 && c.indexOf('requireCronSecret(req)') < c.indexOf('createAdminSupabase()'))
      assert.equal((c.match(/filtrarPorMembresia\(/g) || []).length, 2, 'los dos bloques'); assert.ok(!/\.(insert|delete|upsert)\(/.test(c))
      const updates = c.match(/\.update\(\{[^}]*\}\)/g) || []; assert.deepEqual(updates, ['.update({ last_reminder_at: new Date().toISOString() })'])
      assert.equal((c.match(/enviarCorreo\(/g) || []).length, 2); assert.equal((c.match(/sendPushToMember\(/g) || []).length, 2)
      const h = fs.readFileSync(path.join(RAIZ, 'lib/recordatorios/membresia.ts'), 'utf8').replace(/\/\/.*$/gm, ''); assert.ok(!/\.(insert|update|delete|upsert)\(|enviarCorreo|sendPush/.test(h))
    })
  } finally { soltarReloj() }
  terminar()
})
