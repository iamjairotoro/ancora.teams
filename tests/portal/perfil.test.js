// Perfil del portal en el SERVIDOR (punto 54, commit 1): «Mis equipos y posiciones», la fila «Administración» y guardar «Mis datos». Correr: `npm run test:portal`.
const { assert, db, ID, estado, mundo, llamar, parchar, prueba, terminar, correr } = require('./_banco')

const ORG = '00000000-0000-0000-0000-000000000001'
const ME = ID.ME
const yo = () => db.members.find(m => m.id === ME)
const poner = (modo, via = 'google') => { estado.via = via; estado.fallan.clear() }

correr(async () => {
  console.log('Mis equipos y posiciones')
  for (const modo of ['me', 'mp']) await prueba(`${modo === 'me' ? '/api/portal/me' : '/api/member-portal'}: sus equipos ACTIVOS con sus posiciones ACTIVAS, en el orden real; un equipo sin posiciones sale vacío; nada de otros`, async () => {
    mundo(); poner(); const r = (await llamar(modo)).body
    assert.deepEqual(r.equipos, [
      { id: ID.TA, name: 'Alabanza', color: 'cobalto', posiciones: ['Guitarra acústica', 'Voz 2'] },      // por sort_order de la posición, no por orden de alta
      { id: ID.TT, name: 'Técnica', color: 'rosa', posiciones: ['Teclado'] },
      { id: '00000000-0000-4000-8000-000000000024', name: 'Sin posiciones', color: null, posiciones: [] },
    ])
    const txt = JSON.stringify(r.equipos); for (const x of ['Archivado', 'Posición archivada', 'Sonido', 'Recepción', 'tm1', 'instrumentos', 'Bajo']) assert.ok(!txt.includes(x), 'no debe salir «' + x + '»') })
  await prueba('sin equipos → lista vacía (no falla)', async () => { mundo(); poner(); db.team_members = []; assert.deepEqual((await llamar('me')).body.equipos, []) })

  console.log('la fila «Administración»: calculada en el servidor, solo con sesión de Google y con rol')
  const adm = async via => { estado.fallan.clear(); estado.via = via; return (await llamar('me')).body.administracion }
  await prueba('sesión de Google sin rol ni liderazgo → null (la fila no existe)', async () => { mundo(); assert.equal(await adm('google'), null) })
  await prueba('owner y admin → /admin', async () => { for (const role of ['owner', 'admin']) { mundo(); db.organization_members.push({ person_id: ME, organization_id: ORG, role }); assert.deepEqual(await adm('google'), { destino: '/admin', rol: 'admin' }, role) } })
  await prueba('líder de un equipo activo → /home; si además es admin, manda /admin', async () => {
    mundo(); db.team_members.find(t => t.id === 'tm1').is_leader = true; assert.deepEqual(await adm('google'), { destino: '/home', rol: 'lider' })
    db.organization_members.push({ person_id: ME, organization_id: ORG, role: 'admin' }); assert.deepEqual(await adm('google'), { destino: '/admin', rol: 'admin' }) })
  await prueba('líder SOLO de un equipo archivado, o rol «member» → null', async () => {
    mundo(); db.team_members.find(t => t.id === 'tm3').is_leader = true; assert.equal(await adm('google'), null)
    db.organization_members.push({ person_id: ME, organization_id: ORG, role: 'member' }); assert.equal(await adm('google'), null) })
  await prueba('una sesión de ENLACE DE ACCESO o el token del correo NUNCA la ven, aunque la persona sea owner o líder', async () => {
    mundo(); db.organization_members.push({ person_id: ME, organization_id: ORG, role: 'owner' }); db.team_members.find(t => t.id === 'tm1').is_leader = true
    for (const via of ['link', 'invitation', undefined, null]) assert.equal(await adm(via), null, String(via))
    poner(); assert.equal((await llamar('mp')).body.administracion, null, 'por el enlace del correo, siempre null') })
  await prueba('ante un error de lectura se cierra: null (nunca se ofrece por equivocación), aunque el rol exista', async () => {
    const caso = async (tabla, prep) => { mundo(); prep(); estado.via = 'google'; estado.fallan.clear(); estado.fallan.add(tabla); const a = (await llamar('me')).body.administracion; estado.fallan.clear(); return a }
    assert.equal(await caso('organization_members', () => db.organization_members.push({ person_id: ME, organization_id: ORG, role: 'admin' })), null, 'no se pudo leer el rol')
    assert.equal(await caso('team_members', () => {}), null, 'no se pudo leer el liderazgo')
    assert.equal(await caso('teams', () => { db.team_members.find(t => t.id === 'tm1').is_leader = true }), null, 'no se pudo comprobar que el equipo esté activo') })

  console.log('guardar «Mis datos»')
  for (const modo of ['me', 'mp']) {
    await prueba(`${modo}: guardar nombre, apellido, teléfono y nacimiento SIN mandar instrumentos NO vacía la columna instrumentos`, async () => {
      mundo(); poner(); const r = await parchar(modo, { nombre: 'Ana María', apellido: 'Paz', telefono: '+56 9 1111 2222', fecha_nacimiento: '1990-05-17' }); assert.deepEqual([r.status, r.body], [200, { ok: true }])
      assert.deepEqual([yo().nombre, yo().apellido, yo().telefono, yo().fecha_nacimiento], ['Ana María', 'Paz', '+56 9 1111 2222', '1990-05-17']); assert.deepEqual(yo().instrumentos, ['Bajo', 'Voz'], 'instrumentos intactos') })
    await prueba(`${modo}: si un cliente VIEJO sí manda instrumentos, se guardan (compatibilidad); vacía la fecha → null`, async () => {
      mundo(); poner(); await parchar(modo, { nombre: 'Ana', apellido: '', telefono: '', fecha_nacimiento: '', instrumentos: ['Piano', 5, 'Bateria'] }); assert.deepEqual(yo().instrumentos, ['Piano', 'Bateria']); assert.equal(yo().fecha_nacimiento, null) })
    await prueba(`${modo}: nombre vacío → 400; fecha imposible → 400; en ningún caso se escribe nada`, async () => {
      mundo(); poner(); const antes = JSON.stringify(yo())
      assert.equal((await parchar(modo, { nombre: '   ' })).status, 400); assert.equal((await parchar(modo, { nombre: 'Ana', fecha_nacimiento: '1990-02-31' })).status, 400); assert.equal((await parchar(modo, { nombre: 'Ana', fecha_nacimiento: 'ayer' })).status, 400)
      assert.equal(JSON.stringify(yo()), antes) })
    await prueba(`${modo}: los textos se recortan a 200 caracteres`, async () => { mundo(); poner(); await parchar(modo, { nombre: 'x'.repeat(500) }); assert.equal(yo().nombre.length, 200) })
  }
  await prueba('la persona sale de la identidad (me) o del token (enlace): un cuerpo con memberId ajeno no escribe en otra persona', async () => {
    mundo(); poner(); const antes = JSON.stringify(db.members.find(m => m.id === ID.O1)); await parchar('me', { nombre: 'Intruso', memberId: ID.O1, member_id: ID.O1, id: ID.O1 }); assert.equal(JSON.stringify(db.members.find(m => m.id === ID.O1)), antes); assert.equal(yo().nombre, 'Intruso') })
  await prueba('un enlace que no existe → 404 y no escribe', async () => { mundo(); poner(); const antes = JSON.stringify(yo()); const r = await require('./_banco').mp.PATCH({ json: async () => ({ token: 'no-existe', nombre: 'X' }) }); assert.equal(r.status, 404); assert.equal(JSON.stringify(yo()), antes) })
  terminar()
})
