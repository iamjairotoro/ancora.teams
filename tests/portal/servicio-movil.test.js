// El servicio en teléfono (fase 3 · B2 y B3): lo que calculan las pantallas (servicio, equipo, herramienta) y las reglas que no se negocian: sin porcentaje de una persona, quien no puede ver los rechazos no los
// recibe, un líder solo ve y convoca a su equipo, se pregunta antes de convocar, ninguna lectura ni escritura nueva desde el navegador, y los textos salen de lib/textos. Correr: `node tests/portal/servicio-movil.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const M = real('lib/admin/servicioMovil'), { estadoEquipoServicio } = real('lib/admin/estadoEquipoServicio'), { cuentaComoRechazo } = real('lib/convocatoriaEstado')
const T = real('lib/textos/servicio')
const crudo = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), leer = f => crudo(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const ADMIN = { kind: 'admin' }, LIDER = ids => ({ kind: 'leader', teamIds: new Set(ids) })
const sec = (teamId, posiciones, tools = []) => ({ teamId, nombre: teamId.toUpperCase(), color: null, tools, posiciones: posiciones.map(id => ({ id, nombre: 'Pos ' + id })) })
const banda = (pos, member, slot = 1) => ({ id: pos + member + slot, service_id: 's', team_position_id: pos, member_id: member, slot_index: slot })
const inv = (member, team, o = {}) => ({ id: member + team, service_id: 's', member_id: member, team_id: team, token: 't', status: 'pendiente', sent_at: '2026-10-01', ...o })

// computeTeamStats real (de AdminServiceView), para la paridad
const fuente = crudo('components/AdminServiceView.tsx'), ini = fuente.indexOf('  function computeTeamStats('), fin = fuente.indexOf('\n  function statusDotClass', ini)
const cuerpo = fuente.slice(ini, fin).replace(/\(section: [^)]*\)\s*\{/, '(section) {').replace(/new Set<string>\(\)/g, 'new Set()')
const computeTeamStatsDe = (getSlotsNeeded, getBanda, invitations) => new Function('getSlotsNeeded', 'getBanda', 'invitations', 'cuentaComoRechazo', cuerpo + '\nreturn computeTeamStats')(getSlotsNeeded, getBanda, invitations, cuentaComoRechazo)
const rng = (semilla) => () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296 }

correr(async () => {
  console.log('quién ve qué')
  await prueba('el administrador ve todos los equipos; un líder, solo los que lidera', async () => {
    const todos = [sec('a', ['p1']), sec('b', ['p2']), sec('c', ['p3'])]
    assert.deepEqual(M.equiposVisibles(todos, ADMIN).map(s => s.teamId), ['a', 'b', 'c']); assert.deepEqual(M.equiposVisibles(todos, LIDER(['b'])).map(s => s.teamId), ['b']); assert.deepEqual(M.equiposVisibles(todos, LIDER([])), []) })
  await prueba('quien no puede ver los rechazos NUNCA recibe «rechazo» (queda «sin responder»); un líder los ve solo en su equipo', async () => {
    const declino = inv('m', 'a', { status: 'declinado', declined_reason: null })
    assert.equal(M.estadoDePersona(declino, { verRechazos: true }), 'rechazo'); assert.equal(M.estadoDePersona(declino, { verRechazos: false }), 'sin-responder')
    assert.equal(M.puedeVerRechazos(ADMIN, 'a'), true); assert.equal(M.puedeVerRechazos(LIDER(['a']), 'a'), true); assert.equal(M.puedeVerRechazos(LIDER(['a']), 'b'), false)
    for (const verRechazos of [true, false]) for (const status of ['pendiente', 'confirmado', 'declinado']) for (const razon of [null, 'conflict']) for (const sent_at of [null, 'x']) for (const reasig of [false, true]) {
      const e = M.estadoDePersona(inv('m', 'a', { status, declined_reason: razon, sent_at, needs_reassignment_confirm: reasig }), { verRechazos }); if (!verRechazos) assert.notEqual(e, 'rechazo') } })
  await prueba('el estado de una persona: por notificar, otro equipo (no es un rechazo), reconfirmar, confirmó, sin responder', async () => {
    const o = { verRechazos: true }
    assert.equal(M.estadoDePersona(undefined, o), 'por-notificar'); assert.equal(M.estadoDePersona(inv('m', 'a', { sent_at: null }), o), 'por-notificar')
    assert.equal(M.estadoDePersona(inv('m', 'a', { status: 'declinado', declined_reason: 'conflict' }), o), 'otro-equipo'); assert.equal(M.estadoDePersona(inv('m', 'a', { needs_reassignment_confirm: true, status: 'confirmado' }), o), 'reconfirmar')
    assert.equal(M.estadoDePersona(inv('m', 'a', { status: 'confirmado' }), o), 'confirmado'); assert.equal(M.estadoDePersona(inv('m', 'a'), o), 'sin-responder') })
  await prueba('«Notificar a N nuevos» de la cabecera: el administrador, a todos; un líder, solo a SU equipo y con SUS nuevos; si lidera varios, la cabecera no lo ofrece', async () => {
    const todos = [sec('a', ['p1']), sec('b', ['p2'])], est = new Map([['a', { nuevos: 2 }], ['b', { nuevos: 3 }]])
    assert.deepEqual(M.alcanceNotificar(ADMIN, todos, est), { teamId: null, nuevos: 5 }); assert.deepEqual(M.alcanceNotificar(LIDER(['b']), todos, est), { teamId: 'b', nuevos: 3 })
    assert.equal(M.alcanceNotificar(LIDER(['a', 'b']), todos, est), null); assert.equal(M.alcanceNotificar(LIDER(['zz']), todos, est), null)
    assert.equal(M.alcanceNotificar(ADMIN, todos, new Map([['a', { nuevos: 0 }], ['b', { nuevos: 0 }]])), null); assert.equal(M.alcanceNotificar(LIDER(['a']), todos, new Map([['a', { nuevos: 0 }], ['b', { nuevos: 9 }]])), null, 'los nuevos de otro equipo no cuentan') })

  console.log('las cuentas')
  await prueba('los casos del mockup: 0 de 2 confirmados, Faltan 3, 5 sin cubrir, 2 por notificar', async () => {
    const pos = ['dr', 'ke', 'ag'], a = sec('alab', ['v', 'b', ...pos]), b = sec('prod', ['son']), c = sec('log', ['x'])
    const d = { bandaItems: [banda('v', 'pd'), banda('b', 'jt')], invitations: [], getSlotsNeeded: id => 1 }
    const est = new Map([a, b, c].map(s => [s.teamId, M.estadoDeEquipo(s, d)]))
    assert.equal(est.get('alab').asignados, 2); assert.equal(est.get('alab').vacantes, 3); assert.equal(est.get('alab').nuevos, 2); assert.equal(est.get('prod').vacantes, 1)
    const r = M.resumenDeServicio([...est.values()]); assert.deepEqual({ a: r.asignados, c: r.confirmados, v: r.vacantes, n: r.nuevos, p: r.porcentaje }, { a: 2, c: 0, v: 5, n: 2, p: 0 }) })
  await prueba('el porcentaje es del SERVICIO entero (confirmados sobre asignados) y 0 si nadie está asignado; nunca hay uno por persona', async () => {
    assert.equal(M.resumenDeServicio([]).porcentaje, 0); assert.equal(M.resumenDeServicio([{ asignados: 4, vacantes: 0, nuevos: 0, porAsignado: { confirmados: 1 } }, { asignados: 4, vacantes: 0, nuevos: 0, porAsignado: { confirmados: 3 } }]).porcentaje, 50)
    for (const f of ['PantallaEquipo', 'HojasServicio', 'PantallaHerramienta']) assert.ok(!/porcentaje|\d\s*%|%'|width:\s*`\$\{/.test(leer(`components/servicio-movil/${f}.tsx`)), f + ' no debe dibujar porcentajes')
    assert.equal((leer('components/servicio-movil/PantallaServicio.tsx').match(/porcentaje/g) || []).length, 1, 'el único porcentaje es el de la barra del servicio') })
  await prueba('paridad: con 200 servicios al azar, estadoDeEquipo da lo mismo que computeTeamStats del panel de escritorio', async () => {
    const r = rng(77)
    for (let k = 0; k < 200; k++) {
      const posIds = ['p1', 'p2', 'p3'].slice(0, 1 + Math.floor(r() * 3)), need = {}; for (const p of posIds) need[p] = 1 + Math.floor(r() * 3)
      const bi = [], gente = ['a', 'b', 'c', 'd', 'e']; for (const p of posIds) for (let s = 1; s <= need[p]; s++) if (r() < 0.6) bi.push(banda(p, gente[Math.floor(r() * gente.length)], s))
      const invs = gente.filter(() => r() < 0.8).map(m => { const q = r(); return inv(m, 'T', { status: q < 0.4 ? 'confirmado' : q < 0.7 ? 'pendiente' : 'declinado', declined_reason: r() < 0.4 ? 'conflict' : null, sent_at: r() < 0.75 ? 'x' : null }) })
      const getBanda = (pid, slot) => bi.find(b => b.team_position_id === pid && b.slot_index === slot), s = sec('T', posIds)
      const viejo = computeTeamStatsDe(id => need[id], getBanda, invs)({ teamId: 'T', posiciones: posIds.map(id => ({ id })) }), nuevo = M.estadoDeEquipo(s, { bandaItems: bi, invitations: invs, getSlotsNeeded: id => need[id] })
      assert.deepEqual([nuevo.asignados, nuevo.porAsignado.confirmados, nuevo.porAsignado.rechazos, nuevo.porAsignado.pendientes, nuevo.nuevos], [viejo.assignedCount, viejo.confirmed, viejo.declined, viejo.pending, viejo.newToInvite], JSON.stringify({ k, bi, invs })) } })

  console.log('las tarjetas')
  await prueba('voluntarios: una tarjeta por posición ocupada (con iniciales) y las posiciones con cupos libres, agrupadas, en el orden del equipo', async () => {
    const s = sec('a', ['v', 'k', 'g']), nombres = { pd: { nombre: 'pepe', apellido: 'diaz' }, jt: { nombre: 'Jairo', apellido: 'Toro' } }
    const { voluntarios, vacantes } = M.voluntariosDeEquipo(s, { bandaItems: [banda('v', 'pd'), banda('k', 'jt', 1)], getSlotsNeeded: id => (id === 'g' ? 2 : 1) }, id => nombres[id])
    assert.deepEqual(voluntarios.map(v => [v.nombre, v.iniciales, v.posicion]), [['pepe diaz', 'PD', 'Pos v'], ['Jairo Toro', 'JT', 'Pos k']]); assert.deepEqual(vacantes, [{ posicionId: 'g', nombre: 'Pos g', faltan: 2 }])
    assert.equal(T.faltaPosicion('Drums', 1), 'Falta Drums'); assert.equal(T.faltaPosicion('Guitar', 2), 'Faltan 2 · Guitar') })
  await prueba('los círculos de una tarjeta de equipo: personas y cupos libres (punteados), como mucho 5 y el resto en «+N»', async () => {
    assert.deepEqual(M.avataresDeTarjeta(['PD', 'JT'], 3), { items: ['PD', 'JT', null, null, null], mas: 0 }); assert.deepEqual(M.avataresDeTarjeta(['A', 'B', 'C', 'D'], 12), { items: ['A', 'B', 'C', 'D', null], mas: 11 }); assert.deepEqual(M.avataresDeTarjeta([], 0), { items: [], mas: 0 }) })
  await prueba('herramientas: «Subir archivo» no se ofrece; «Setlist» es «orden» en la URL y se encuentra aunque no se diga el equipo; una herramienta de otro equipo no se abre', async () => {
    const s1 = sec('a', ['p'], [{ id: 't1', tool_type: 'setlist' }, { id: 't2', tool_type: 'schedule' }, { id: 't3', tool_type: 'file_upload' }]), s2 = sec('b', ['q'], [{ id: 't4', tool_type: 'checklist' }])
    assert.deepEqual(M.herramientasDeTelefono(s1.tools).map(t => t.id), ['t1', 't2']); assert.equal(M.claveDeHerramienta(s1.tools[0]), 'orden'); assert.equal(M.claveDeHerramienta(s1.tools[1]), 't2')
    assert.equal(M.herramientaDeClave([s1, s2], null, 'orden').seccion.teamId, 'a'); assert.equal(M.herramientaDeClave([s1, s2], 'b', 't4').tool.id, 't4'); assert.equal(M.herramientaDeClave([s1, s2], 'a', 't4'), null); assert.equal(M.herramientaDeClave([s2], null, 'orden'), null)
    assert.equal(T.nombreDeHerramienta('setlist'), 'Orden'); assert.equal(T.nombreDeHerramienta('schedule'), 'Cronograma') })
  await prueba('fechas y horas de las pantallas', async () => {
    assert.equal(M.fechaCorta('2026-10-25'), 'dom 25 oct'); assert.equal(M.fechaMedia('2026-10-25'), 'Domingo 25 oct'); assert.equal(M.rangoDeHoras('10:00:00', '14:00:00'), '10:00 – 14:00'); assert.equal(M.rangoDeHoras(null, null), '10:00 – 14:00')
    assert.equal(M.etiquetaDeServicio({ fecha: '2026-10-25', titulo: 'Servicio Ancora — domingo 25 octubre 2026' }), 'Servicio Ancora · dom 25 oct'); assert.equal(M.etiquetaDeServicio({ fecha: '2026-10-27', titulo: 'Ensayo — martes', kind: 'rehearsal' }), 'Ensayo · mar 27 oct · Ensayo') })

  console.log('las reglas en el código')
  const ARCHIVOS = ['BarraSuperior', 'HojasServicio', 'PantallaServicio', 'PantallaEquipo', 'PantallaHerramienta', 'ServicioMovil', 'iconos']
  await prueba('ninguna lectura ni escritura nueva desde el navegador: nada de supabase ni `.from(` en las pantallas; el único fetch es /api/update-service del horario (la ruta de hoy)', async () => {
    for (const f of ARCHIVOS) { const c = leer(`components/servicio-movil/${f}.tsx`); assert.ok(!/supabase|\.from\(['"`]|\.rpc\(/.test(c), f + ' no debe leer ni escribir tablas'); if (f !== 'HojasServicio') assert.ok(!/fetch\(/.test(c), f + ' no debe llamar a la red') }
    const h = leer('components/servicio-movil/HojasServicio.tsx'); assert.equal((h.match(/fetch\(/g) || []).length, 2); assert.equal((h.match(/api\/update-service/g) || []).length, 2) })
  await prueba('«Notificar»: se pregunta ANTES en una hoja (no un confirm del navegador), «Notificar» recién ahí llama a sendInvites, y las pantallas nunca lo llaman por su cuenta; el líder pasa por alcanceNotificar', async () => {
    const m = leer('components/servicio-movil/ServicioMovil.tsx'); assert.ok(!/window\.confirm|\bconfirm\(/.test(m), 'nada de confirm del navegador'); assert.ok(/function notificar\(teamId: string \| null, nuevos: number\) \{ if \(!p\.sending\) setHoja\(\{ notificar: \{ teamId, nuevos \} \}\) \}/.test(m))
    assert.equal((m.match(/sendInvites\(/g) || []).length, 1); assert.ok(/<HojaConfirmarNotificar nuevos=\{hoja\.notificar\.nuevos\}[^>]*onConfirmar=\{\(\) => p\.sendInvites\(hoja\.notificar\.teamId \?\? undefined\)\}/.test(m))
    for (const f of ['PantallaServicio', 'PantallaEquipo']) assert.ok(!/sendInvites/.test(leer(`components/servicio-movil/${f}.tsx`)), f); assert.ok(/alcanceNotificar\(viewer, secciones, estados\)/.test(m)); assert.ok(/equiposVisibles\(p\.equipoSections, viewer\)/.test(m))
    const h = leer('components/servicio-movil/HojasServicio.tsx'); assert.ok(/export function HojaConfirmarNotificar/.test(h) && /cerrar\(onConfirmar\)/.test(h) && /cerrar\(\)\}>\{T\.cancelar\}/.test(h))
    assert.equal(T.confirmarNotificarTitulo(2), '¿Notificar a 2 personas nuevas?'); assert.equal(T.confirmarNotificarTitulo(1), '¿Notificar a 1 persona nueva?'); assert.equal(T.TEXTOS_SERVICIO.confirmarNotificarCuerpo, 'Les llegará la convocatoria por correo.'); assert.ok(!/notificaci[oó]n/i.test(T.TEXTOS_SERVICIO.confirmarNotificarCuerpo), 'la notificación en la app no está activa')
    assert.equal(T.TEXTOS_SERVICIO.notificar, 'Notificar'); assert.equal(T.TEXTOS_SERVICIO.cancelar, 'Cancelar'); assert.equal(T.notificarNuevos(1), 'Notificar a 1 nuevo'); assert.equal(T.notificarNuevos(2), 'Notificar a 2 nuevos') })
  await prueba('«Eliminar servicio» pide confirmación como en escritorio: el «⋯» llama a deleteService de la página, que pregunta antes de borrar (y escritorio y teléfono usan la misma función)', async () => {
    const pg = crudo('app/admin/page.tsx'); assert.ok(/async function deleteService\(id: string\) \{\s*\n\s*if\(!confirm\('¿Eliminar este servicio\?'\)\) return\s*\n\s*await fetch\('\/api\/delete-service'/.test(pg), 'deleteService pregunta ANTES de llamar a la ruta')
    assert.ok(/onEliminar=\{\(\) => p\.deleteService\(servicio\.id\)\}/.test(leer('components/servicio-movil/ServicioMovil.tsx'))); assert.ok(/deleteService: deleteService/.test(pg)) })
  await prueba('quién declinó: la pantalla del equipo solo pasa verRechazos si puedeVerRechazos(viewer, equipo)', async () => {
    const e = leer('components/servicio-movil/PantallaEquipo.tsx'); assert.ok(/verRechazos = puedeVerRechazos\(viewer, teamId\)/.test(e)); assert.ok(/estadoDePersona\(inv, \{ verRechazos \}\)/.test(e)) })
  await prueba('un solo acceso a «Nuevo servicio» por pantalla: el «⋯» (y en la lista, el «+»); ni el servicio ni el equipo traen otro botón', async () => {
    for (const f of ['PantallaServicio', 'PantallaEquipo', 'BarraSuperior', 'PantallaHerramienta']) assert.ok(!/nuevoServicio|HojaNuevoServicio/.test(leer(`components/servicio-movil/${f}.tsx`)), f)
    assert.equal((leer('components/servicio-movil/ServicioMovil.tsx').match(/<HojaNuevoServicio/g) || []).length, 1); assert.equal((leer('components/servicio-movil/HojasServicio.tsx').match(/T\.nuevoServicio/g) || []).length, 1) })
  await prueba('los textos salen de lib/textos: ninguna pantalla nueva lleva texto ni etiquetas escritos a mano', async () => {
    for (const f of ARCHIVOS) {
      const c = leer(`components/servicio-movil/${f}.tsx`)
      const sueltos = [...c.matchAll(/(?<![=/-])>([^<>{}\n]*[A-Za-zÁ-úñÑ¿¡]{2,}[^<>{}\n]*)</g)].map(m => m[1].trim()).filter(Boolean); assert.deepEqual(sueltos, [], f + ' tiene texto suelto')
      const attrs = [...c.matchAll(/\b(aria-label|placeholder|title|alt)="([^"]*[A-Za-zÁ-úñÑ][^"]*)"/g)].map(m => m[2]); assert.deepEqual(attrs, [], f + ' tiene etiquetas escritas a mano') } })
  await prueba('el escritorio no cambia en reposo: AdminServiceView solo importa de servicio-movil el TIPO de sus props y la hoja de confirmar (que solo se dibuja al pulsar «Notificar»), y la página le da las mismas props que a las pantallas de teléfono', async () => {
    const v = crudo('components/AdminServiceView.tsx'); assert.deepEqual([...v.matchAll(/from '\.\/servicio-movil\/([^']+)'/g)].map(m => m[1]).sort(), ['HojasServicio', 'tipos']); assert.ok(/import type \{ ServicioAdminProps \} from '\.\/servicio-movil\/tipos'/.test(v))
    const pg = crudo('app/admin/page.tsx'); assert.ok(/const servicioProps: ServicioAdminProps = \{/.test(pg)); assert.ok(/<AdminServiceView \{\.\.\.servicioProps\} \/>/.test(pg)) })
  await prueba('«Servicios» en la barra inferior, estando dentro de un servicio, vuelve a la lista; la URL conserva servicio/equipo/herramienta al navegar', async () => {
    const pg = crudo('app/admin/page.tsx'); assert.ok(/k==='setlist' && tab==='setlist' && urlSrv\.servicio\) irServicio\(VISTA_VACIA\)/.test(pg))
    const m = leer('components/servicio-movil/ServicioMovil.tsx'); assert.ok(/irA\(\{ servicio: servicioId, equipo: null, herramienta: null, \.\.\.v \}\)/.test(m)) })
  terminar()
})
