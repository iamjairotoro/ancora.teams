// Estado de un equipo en un servicio (fase 3 · B0): una sola regla (lib/admin/estadoEquipoServicio.ts) que usa resumenServicios, con la prueba de PARIDAD contra computeTeamStats del panel de escritorio
// (AdminServiceView) y la diferencia «sobre convocados / sobre asignados» documentada y fijada. Correr: `node tests/portal/estado-equipo-servicio.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const { estadoEquipoServicio } = real('lib/admin/estadoEquipoServicio')
const { resumenServicios } = real('lib/admin/resumenServicios')
const { cuentaComoRechazo } = real('lib/convocatoriaEstado')

// computeTeamStats se toma del CÓDIGO REAL de AdminServiceView (sin los tipos) para que la prueba falle si el panel de escritorio cambia su regla.
const fuente = fs.readFileSync(path.join(RAIZ, 'components/AdminServiceView.tsx'), 'utf8')
const ini = fuente.indexOf('  function computeTeamStats('), fin = fuente.indexOf('\n  function statusDotClass', ini)
const cuerpo = fuente.slice(ini, fin).replace(/\(section: [^)]*\)\s*\{/, '(section) {').replace(/new Set<string>\(\)/g, 'new Set()')
const computeTeamStatsDe = (getSlotsNeeded, getBanda, invitations) => new Function('getSlotsNeeded', 'getBanda', 'invitations', 'cuentaComoRechazo', cuerpo + '\nreturn computeTeamStats')(getSlotsNeeded, getBanda, invitations, cuentaComoRechazo)

// generador pseudoaleatorio con semilla (reproducible)
const rng = (semilla) => () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296 }

correr(async () => {
  console.log('la regla')
  const base = { posiciones: ['p1', 'p2'], cupos: [{ team_position_id: 'p1', slots_needed: 2 }], abierta: true }
  await prueba('asignados, vacantes (cupos − ocupados, con `slots_needed || 1`), nuevos y sin responder', async () => {
    const e = estadoEquipoServicio({ ...base, banda: [{ team_position_id: 'p1', member_id: 'm1', slot_index: 1 }, { team_position_id: 'p2', member_id: 'm2', slot_index: 1 }, { team_position_id: 'p2', member_id: 'm1', slot_index: 2 }],
      invitaciones: [{ member_id: 'm1', status: 'confirmado', sent_at: 'x' }, { member_id: 'm2', status: 'pendiente', sent_at: null }] })
    assert.equal(e.asignados, 2, 'm1 en dos posiciones cuenta una vez'); assert.equal(e.vacantes, 1, 'p1: 2 cupos, 1 ocupado; p2: 1 cupo (por defecto), ocupado'); assert.equal(e.nuevos, 1, 'm2 sin convocatoria enviada')
    assert.deepEqual(e.porConvocado, { convocados: 1, confirmados: 1, rechazos: 0, pendientes: 0 }); assert.equal(e.estado, 'convocado'); assert.equal(e.sinResponder, 0) })
  await prueba('«aceptó en otro equipo» no es respuesta de este equipo ni un rechazo; una convocatoria cerrada no deja «sin responder»', async () => {
    const e = estadoEquipoServicio({ ...base, abierta: false, banda: [{ team_position_id: 'p1', member_id: 'm1' }, { team_position_id: 'p1', member_id: 'm2', slot_index: 2 }, { team_position_id: 'p2', member_id: 'm3' }],
      invitaciones: [{ member_id: 'm1', status: 'declinado', declined_reason: 'conflict', sent_at: 'x' }, { member_id: 'm2', status: 'declinado', declined_reason: 'no puedo', sent_at: 'x' }, { member_id: 'm3', status: 'pendiente', sent_at: 'x' }] })
    assert.deepEqual(e.porConvocado, { convocados: 2, confirmados: 0, rechazos: 1, pendientes: 1 }, 'm1 no cuenta como convocado de este equipo'); assert.equal(e.sinResponder, 0)
    assert.deepEqual(e.porAsignado, { confirmados: 0, rechazos: 1, pendientes: 1 }, 'en el panel tampoco es un rechazo') })
  await prueba('sin invitaciones enviadas el equipo está «sin convocar»', async () => {
    assert.equal(estadoEquipoServicio({ ...base, banda: [{ team_position_id: 'p1', member_id: 'm1' }], invitaciones: [{ member_id: 'm1', status: 'pendiente', sent_at: null }] }).estado, 'sin-convocar')
    assert.equal(estadoEquipoServicio({ ...base, banda: [], invitaciones: [] }).vacantes, 3) })

  console.log('paridad con el panel de escritorio (computeTeamStats)')
  await prueba('el código real de computeTeamStats se encuentra y corre (la prueba no se queda en el aire)', async () => {
    assert.ok(ini > 0 && fin > ini && /assignedCount/.test(cuerpo) && /newToInvite/.test(cuerpo)) })
  await prueba('300 servicios al azar: asignados, confirmados, rechazos, pendientes y nuevos son los MISMOS que cuenta el panel', async () => {
    const r = rng(20261019)
    for (let k = 0; k < 300; k++) {
      const posiciones = ['p1', 'p2', 'p3'].slice(0, 1 + Math.floor(r() * 3)), necesarios = {}
      for (const p of posiciones) necesarios[p] = 1 + Math.floor(r() * 3)
      const cupos = posiciones.filter(() => r() < 0.7).map(p => ({ team_position_id: p, slots_needed: necesarios[p] }))
      const cupoDe = p => cupos.find(c => c.team_position_id === p)?.slots_needed || 1
      const banda = [], gente = ['a', 'b', 'c', 'd', 'e', 'f']
      for (const p of posiciones) for (let s = 1; s <= cupoDe(p); s++) if (r() < 0.6) banda.push({ team_position_id: p, member_id: gente[Math.floor(r() * gente.length)], slot_index: s })
      const invitaciones = gente.filter(() => r() < 0.8).map(m => { const q = r(); return { member_id: m, team_id: 'T', status: q < 0.4 ? 'confirmado' : q < 0.7 ? 'pendiente' : 'declinado', declined_reason: r() < 0.4 ? 'conflict' : null, sent_at: r() < 0.75 ? '2026-10-01' : null } })
      const getBanda = (pid, slot) => banda.find(b => b.team_position_id === pid && b.slot_index === slot)
      const viejo = computeTeamStatsDe(cupoDe, getBanda, invitaciones)({ teamId: 'T', posiciones: posiciones.map(id => ({ id })) })
      const nuevo = estadoEquipoServicio({ posiciones, cupos, banda, invitaciones, abierta: true })
      const donde = JSON.stringify({ k, banda, invitaciones, cupos })
      assert.equal(nuevo.asignados, viejo.assignedCount, 'asignados ' + donde); assert.equal(nuevo.porAsignado.confirmados, viejo.confirmed, 'confirmados ' + donde)
      assert.equal(nuevo.porAsignado.rechazos, viejo.declined, 'rechazos ' + donde); assert.equal(nuevo.porAsignado.pendientes, viejo.pending, 'pendientes ' + donde); assert.equal(nuevo.nuevos, viejo.newToInvite, 'nuevos ' + donde)
    } })

  console.log('la diferencia documentada')
  await prueba('sobre convocados (lista, Home móvil) ≠ sobre asignados (servicio): mismas filas, dos denominadores, los dos «confirmados»', async () => {
    // 3 asignados; solo 2 convocados (uno aún sin convocar): la lista dice «1 de 2», el servicio «1 de 3».
    const e = estadoEquipoServicio({ ...base, banda: [{ team_position_id: 'p1', member_id: 'a' }, { team_position_id: 'p1', member_id: 'b', slot_index: 2 }, { team_position_id: 'p2', member_id: 'c' }],
      invitaciones: [{ member_id: 'a', status: 'confirmado', sent_at: 'x' }, { member_id: 'b', status: 'pendiente', sent_at: 'x' }, { member_id: 'c', status: 'pendiente', sent_at: null }] })
    assert.equal(`${e.porConvocado.confirmados} de ${e.porConvocado.convocados}`, '1 de 2'); assert.equal(`${e.porAsignado.confirmados} de ${e.asignados}`, '1 de 3') })
  await prueba('resumenServicios entrega EXACTAMENTE lo que calcula la regla (por convocado) y no cuenta lo que ya no es de este equipo', async () => {
    const r = resumenServicios({ ahora: new Date('2026-10-19T15:00:00Z'), teams: [{ id: 'T', name: 'Alabanza', color: 'cobalto' }], positions: [{ id: 'p1', team_id: 'T' }, { id: 'p2', team_id: 'T' }],
      services: [{ id: 's', fecha: '2026-10-25', hora_inicio: '10:00', hora_fin: '14:00' }], slots: [{ service_id: 's', team_position_id: 'p1', slot_index: 1, slots_needed: 2 }],
      assignments: [{ service_id: 's', team_position_id: 'p1', member_id: 'a', slot_index: 1 }, { service_id: 's', team_position_id: 'p2', member_id: 'b', slot_index: 1 }],
      invitations: [{ service_id: 's', member_id: 'a', team_id: 'T', status: 'confirmado', sent_at: 'x' }, { service_id: 's', member_id: 'b', team_id: 'T', status: 'declinado', declined_reason: 'conflict', sent_at: 'x' }] })
    const e = r[0].equipos[0]; assert.deepEqual({ asignados: e.asignados, convocados: e.convocados, confirmados: e.confirmados, vacantes: e.vacantes, estado: e.estado }, { asignados: 2, convocados: 1, confirmados: 1, vacantes: 1, estado: 'convocado' }) })
  await prueba('resumenServicios usa la regla compartida y ya no compara estados por su cuenta', async () => {
    const s = fs.readFileSync(path.join(RAIZ, 'lib/admin/resumenServicios.ts'), 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n'); assert.ok(/estadoEquipoServicio\(/.test(s)); assert.ok(!/estadoConvocatoria/.test(s)) })
  terminar()
})
