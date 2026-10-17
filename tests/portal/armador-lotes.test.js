// El armador de datos del portal (lib/portal/armarPortal.ts): lecturas por lotes que no se truncan con el tope de 1000 filas de PostgREST, y que no regalan lo que aún no se
// puede ver (banda y setlist solo con la convocatoria confirmada). Correr: `npm run test:portal`.
const { assert, db, ID, S, estado, mundo, llamar, prueba, terminar, correr } = require('./_banco')

correr(async () => {
  console.log('qué ve cada ruta')
  await prueba('sin confirmar no se ve la banda ni el setlist; confirmada sí; el servicio cerrado no sale', async () => {
    mundo(); estado.acceso = true; const b = (await llamar('me')).body.services
    const conf = b.find(x => x.service.id === S(1) && x.team && x.team.id === ID.TA); assert.ok(conf.banda.length === 4 && conf.setlist.length === 3, 'la fila de quien declinó (yo en Técnica) no viaja')
    const conflicto = b.find(x => x.service.id === S(1) && x.team && x.team.id === ID.TT); assert.deepEqual([conflicto.invitation.declined_reason, conflicto.reemplazadaPor && conflicto.reemplazadaPor.name, conflicto.banda, conflicto.setlist], ['conflict', 'Alabanza', [], []])
    const pendiente = b.find(x => x.service.id === S(2)); assert.deepEqual([pendiente.banda, pendiente.setlist], [[], []])
    assert.ok(!b.some(x => x.service.id === S(9)), 'el servicio cerrado no sale'); assert.ok(!JSON.stringify(b).includes('esEnsayo') && !JSON.stringify(b).includes('asignado')) })
  await prueba('el equipo del servicio (punto 54, commit 5): confirmó / sin confirmar, sin quién declinó, con vacantes y cronograma del equipo de la tarjeta', async () => {
    mundo(); estado.acceso = true; const b = (await llamar('me')).body.services
    const conf = b.find(x => x.service.id === S(1) && x.team && x.team.id === ID.TA)
    const fila = (m, pos) => conf.banda.find(x => x.member_id === m && x.posicion === pos)
    assert.equal(fila(ID.ME, 'Voz 2').estado, 'confirmo'); assert.equal(fila(ID.O1, 'Voz 2').estado, 'confirmo'); assert.equal(fila(ID.O2, 'Recepción').estado, 'sin-confirmar', 'sin convocatoria = sin confirmar')
    assert.equal(fila(ID.ME, 'Teclado'), undefined, 'quien declinó no aparece'); assert.ok(conf.banda.every(x => x.estado === 'confirmo' || x.estado === 'sin-confirmar')); assert.ok(!JSON.stringify(conf.banda).includes('declin'))
    assert.deepEqual([fila(ID.ME, 'Voz 2').seccion, fila(ID.ME, 'Voz 2').teamName, fila(ID.ME, 'Voz 2').teamColor], ['Voces', 'Alabanza', 'cobalto'])
    assert.deepEqual(conf.vacantes.map(v => v.teamName + ':' + v.posicion).sort(), ['Alabanza:Guitarra acústica', 'Alabanza:Voz 2', 'Técnica:Sonido'].sort(), 'Voz 2 pide 3 cupos y hay 2; la archivada no cuenta; Teclado lo cubre la fila sin persona')
    assert.deepEqual(conf.cronograma, [{ hora: '09:00', texto: 'Llegada' }, { hora: '09:30', texto: 'Prueba de sonido' }], 'solo el cronograma de MI equipo, en su orden')
    const sinConfirmar = b.find(x => x.service.id === S(2)); assert.ok(!('vacantes' in sinConfirmar) && !('cronograma' in sinConfirmar)); assert.ok(!JSON.stringify(b).includes('SECRETO_CRONO'))
    const bienvenida = b.find(x => x.service.id === S(1) && x.team && x.team.id === ID.TB); assert.deepEqual([bienvenida.banda, 'cronograma' in bienvenida], [[], false])
    const mp = (await llamar('mp')).body.services.find(x => x.service.id === S(1) && x.team.id === ID.TA); assert.deepEqual([mp.vacantes.length, mp.cronograma.length], [3, 2]) })
  await prueba('la tarjeta vacía (sin convocatoria) lleva nominaSent y no lleva cerrada; la no enviada, nominaSent false', async () => {
    mundo(); const b = (await llamar('me')).body.services; const vacia = b.find(x => x.service.id === S(3))
    assert.deepEqual([vacia.invitation, vacia.team, vacia.nominaSent, 'cerrada' in vacia], [null, null, true, false]); assert.equal(b.find(x => x.service.id === S(4)).nominaSent, false) })
  await prueba('el enlace: solo servicios con asignación y convocatoria enviada; los ensayos aparte, con sus canciones aunque no estén confirmados', async () => {
    mundo(); estado.acceso = true; const r = (await llamar('mp')).body
    assert.deepEqual(r.services.map(x => x.service.id + ':' + (x.team && x.team.name)).sort(), [`${S(1)}:Alabanza`, `${S(1)}:Bienvenida`, `${S(1)}:Técnica`, `${S(2)}:Alabanza`].sort())
    const e7 = r.ensayos.find(x => x.service.id === S(7)); assert.deepEqual(e7.setlist, [{ orden: 1, song: { nombre: 'Canción Dos', artista: 'Artista B' } }]); assert.equal(e7.banda.length, 0) })

  console.log('por lotes')
  await prueba('las consultas casi no crecen con la cantidad de servicios (un lote más cada 10), no una por servicio', async () => {
    mundo(); estado.acceso = true; const base = (await llamar('me')).consultas
    for (let k = 20; k < 60; k++) {
      db.services.push({ id: S(k), fecha: `2099-06-${String(k - 19).padStart(2, '0')}`, tipo: 'servicio', titulo: 'X', hora_inicio: '10:00:00', hora_fin: '12:00:00' })
      db.invitations.push({ id: 'ix' + k, service_id: S(k), member_id: ID.ME, team_id: ID.TA, token: 'tx' + k, status: 'confirmado', sent_at: '2026-10-01', declined_reason: null, superseded_by: null })
      db.banda_assignments.push({ id: 'bx' + k, service_id: S(k), member_id: ID.ME, team_position_id: ID.P1, posicion: null, slot_index: 1 }) }
    const despues = (await llamar('me')).consultas; assert.ok(despues <= base + 20, `${base} → ${despues}`) })
  await prueba('30 servicios con 120 posiciones y 110 convocatorias cada uno (cada lote llega al tope de 1000 filas y se relee servicio por servicio): nada se trunca', async () => {
    mundo(); estado.acceso = true
    for (let k = 20; k < 50; k++) {
      db.services.push({ id: S(k), fecha: `2099-07-${String(k - 19).padStart(2, '0')}`, tipo: 'servicio', titulo: 'V' + k, hora_inicio: '10:00:00', hora_fin: '12:00:00' })
      db.invitations.push({ id: 'iv' + k, service_id: S(k), member_id: ID.ME, team_id: ID.TA, token: 'tv' + k, status: 'confirmado', sent_at: '2026-10-01', declined_reason: null, superseded_by: null })
      for (let j = 0; j < 110; j++) db.invitations.push({ id: `ivo${k}-${j}`, service_id: S(k), member_id: j % 2 ? ID.O1 : ID.O2, team_id: ID.TT, token: `tvo${k}-${j}`, status: 'pendiente', sent_at: '2026-10-01', declined_reason: null, superseded_by: null })
      db.banda_assignments.push({ id: 'bv' + k, service_id: S(k), member_id: ID.ME, team_position_id: ID.P1, posicion: null, slot_index: 1 })
      for (let j = 0; j < 119; j++) db.banda_assignments.push({ id: `bvo${k}-${j}`, service_id: S(k), member_id: ID.O1, team_position_id: ID.P2, posicion: null, slot_index: j + 2 })
      for (let j = 0; j < 3; j++) db.service_blocks.push({ id: `blv${k}-${j}`, service_id: S(k), orden: j + 1, tipo: 'bloque', titulo: 'B' + j, song_id: null, lead_id: null, duracion_min: 5 }) }
    for (let k = 100; k < 130; k++) {      // sin convocatoria mía pero con la nómina enviada: lo único que cambia su texto es nominaSent
      db.services.push({ id: S(k), fecha: `2099-09-${String(k - 99).padStart(2, '0')}`, tipo: 'servicio', titulo: 'W' + k, hora_inicio: '10:00:00', hora_fin: '12:00:00' })
      for (let j = 0; j < 110; j++) db.invitations.push({ id: `iw${k}-${j}`, service_id: S(k), member_id: ID.O1, team_id: ID.TT, token: `tw${k}-${j}`, status: 'pendiente', sent_at: '2026-10-01', declined_reason: null, superseded_by: null }) }
    assert.ok(db.invitations.length > 6600 && db.banda_assignments.length > 3500)
    const r = (await llamar('me')).body.services
    for (let k = 20; k < 50; k++) { const e = r.find(x => x.service.id === S(k) && x.team && x.team.id === ID.TA); assert.ok(e, 'tarjeta ' + k); assert.equal(e.banda.length, 120, 'banda completa del servicio ' + k); assert.equal(e.setlist.length, 3, 'setlist ' + k) }
    for (let k = 100; k < 130; k++) assert.equal(r.find(x => x.service.id === S(k)).nominaSent, true, 'nominaSent del servicio ' + k)
    const e = (await llamar('mp')).body.services.filter(x => x.team && x.team.id === ID.TA && String(x.service.titulo).startsWith('V')); assert.equal(e.length, 30); assert.ok(e.every(x => x.banda.length === 120 && x.setlist.length === 3)) })
  terminar()
})
