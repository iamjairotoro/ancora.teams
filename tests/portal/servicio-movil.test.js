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
    assert.deepEqual(voluntarios.map(v => [v.nombre, v.iniciales, v.posicion]), [['pepe diaz', 'PD', 'Pos v'], ['Jairo Toro', 'JT', 'Pos k']]); assert.deepEqual(vacantes, [{ posicionId: 'g', nombre: 'Pos g', faltan: 2, primerSlotLibre: 1 }])
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

  console.log('asignar y cupos (B4)')
  const mapas = (secs) => ({ posTeam: new Map(secs.flatMap(x => x.posiciones.map(q => [q.id, x.teamId]))), posNames: new Map(secs.flatMap(x => x.posiciones.map(q => [q.id, q.nombre]))), teamNames: new Map(secs.map(x => [x.teamId, x.nombre])) })
  await prueba('la hoja de asignar dice «Toca {posición}», «Ya asignada en {equipo}», «Ya tiene {posición}» y «Bloqueó este día»; solo «No disponible» quien bloqueó; se avisa, nunca se impide', async () => {
    const alab = sec('alab', ['dr', 'vz']), prod = sec('prod', ['son']); alab.nombre = 'Alabanza'; prod.nombre = 'Producción'; alab.posiciones[0].nombre = 'Drums'; alab.posiciones[1].nombre = 'Voces'; prod.posiciones[0].nombre = 'Sonido'
    const gente = [{ id: 'ana', nombre: 'Ana', apellido: 'Mora' }, { id: 'luis', nombre: 'Luis', apellido: 'Muñoz' }, { id: 'pedro', nombre: 'Pedro', apellido: 'Soto' }, { id: 'rosa', nombre: 'Rosa', apellido: 'Vera' }]
    const ops = M.opcionesParaAsignar({ candidatos: gente, posicionId: 'dr', posicionNombre: 'Drums', teamId: 'alab', banda: [banda('son', 'ana'), banda('vz', 'rosa')], ...mapas([alab, prod]), bloqueados: new Set(['luis']) })
    const por = Object.fromEntries(ops.map(o => [o.id, o]))
    assert.equal(por.ana.detalle, 'Ya asignada en Producción'); assert.equal(por.ana.disponible, true); assert.equal(por.ana.nombre, 'Ana M.')
    assert.equal(por.luis.detalle, 'Bloqueó este día'); assert.equal(por.luis.disponible, false); assert.equal(por.pedro.detalle, 'Toca Drums'); assert.equal(por.pedro.disponible, true); assert.equal(por.rosa.detalle, 'Ya tiene Voces')
    assert.deepEqual(ops.map(o => o.id), ['pedro', 'ana', 'rosa', 'luis'].sort((a, b) => ops.map(o => o.id).indexOf(a) - ops.map(o => o.id).indexOf(b)), 'orden'); assert.equal(ops[ops.length - 1].id, 'luis', 'quien bloqueó va al final'); assert.equal(ops.length, 4, 'nadie se excluye por tener otra asignación') })
  await prueba('los avisos del selector de escritorio no cambiaron (solo se exportaron sus textos): «Ya asignado en», «Ya tiene», «Bloqueó este día», «Disponible»', async () => {
    const H = real('lib/assignHints'); assert.equal(H.AVISO_YA_ASIGNADO_EN, 'Ya asignado en '); assert.equal(H.AVISO_YA_TIENE, 'Ya tiene '); assert.equal(H.AVISO_BLOQUEO, 'Bloqueó este día'); assert.equal(H.AVISO_DISPONIBLE, 'Disponible')
    const o = H.buildAssignOptions({ candidates: [{ id: 'a', nombre: 'A', apellido: 'B' }], posId: 'dr', teamId: 'x', banda: [banda('son', 'a')], posTeam: new Map([['son', 'y'], ['dr', 'x']]), posNames: new Map(), teamNames: new Map([['y', 'Producción']]), blockedIds: new Set(['a']) })
    assert.deepEqual(o[0].tags.map(t => t.text), ['Ya asignado en Producción', 'Bloqueó este día']) })
  await prueba('quien ya está en OTRO cupo de la misma posición no se ofrece, y la persona del cupo que se cambia sí (marcada como actual)', async () => {
    const eq = sec('a', ['dr']), ops = M.opcionesParaAsignar({ candidatos: [{ id: 'm1', nombre: 'A', apellido: 'B' }, { id: 'm2', nombre: 'C', apellido: 'D' }], posicionId: 'dr', posicionNombre: 'Drums', teamId: 'a', actualId: 'm1', banda: [banda('dr', 'm1', 1), banda('dr', 'm2', 2)], ...mapas([eq]), bloqueados: new Set() })
    assert.deepEqual(ops.map(o => [o.id, o.esActual]), [['m1', true]]) })
  await prueba('la búsqueda ignora mayúsculas y tildes; el mensaje vacío nombra la posición y lleva el enlace a Personas', async () => {
    const ops = [{ nombreCompleto: 'María Muñoz' }, { nombreCompleto: 'Pedro Soto' }]
    assert.equal(M.filtrarOpciones(ops, 'maria').length, 1); assert.equal(M.filtrarOpciones(ops, 'MUÑ').length, 1); assert.equal(M.filtrarOpciones(ops, '  ').length, 2); assert.equal(M.filtrarOpciones(ops, 'zzz').length, 0)
    assert.equal(T.nadieTienePosicion('Drums'), 'Nadie tiene la posición Drums en su perfil. Agrégala en Personas.'); assert.equal(T.tienenEnPerfil('Drums'), 'Tienen Drums en su perfil'); assert.equal(T.asignarA('Drums'), 'Asignar Drums')
    const h = leer('components/servicio-movil/HojasEquipo.tsx'); assert.ok(/nadieTienePosicion\(posicion\.nombre\)/.test(h) && /T\.irAPersonas/.test(h) && /onIrAPersonas/.test(h)); assert.ok(!/Otras personas|Crear persona nueva/.test(h + leer('lib/textos/servicio.ts')), 'fuera de esta fase') })
  await prueba('«Nadie tiene la posición…» solo si de verdad nadie la tiene en su perfil; si todas esas personas ya están asignadas, el mensaje es otro y sin enlace a Personas', async () => {
    assert.equal(T.yaEstanTodas('Coros'), 'Ya están asignadas todas las personas que tienen Coros en su perfil.')
    const h = leer('components/servicio-movil/HojasEquipo.tsx'); assert.ok(/perfilVacio \? nadieTienePosicion\(posicion\.nombre\) : yaEstanTodas\(posicion\.nombre\)/.test(h)); assert.ok(/\{perfilVacio && <button[^]*?T\.irAPersonas/.test(h))
    assert.ok(/perfilVacio=\{p\.membersFor\(pos\.posicionId\)\.length === 0\}/.test(leer('components/servicio-movil/ServicioMovil.tsx'))) })
  await prueba('un líder asigna y cambia cupos solo en su equipo; el administrador, en todos', async () => {
    assert.equal(M.puedeAsignar(ADMIN, 'x'), true); assert.equal(M.puedeAsignar(LIDER(['a']), 'a'), true); assert.equal(M.puedeAsignar(LIDER(['a']), 'b'), false); assert.equal(M.puedeAsignar(LIDER([]), 'a'), false) })
  await prueba('cupos: UNA sola función decide el mínimo (lo ya asignado, nunca menos de 1) y el tope es 20; el cupo pedido siempre queda dentro de los límites', async () => {
    assert.equal(M.cupoMinimo(0), 1); assert.equal(M.cupoMinimo(3), 3); assert.equal(M.CUPO_MAXIMO, 20)
    assert.equal(M.cupoDentroDeLimites(0, 0), 1, 'no baja de 1'); assert.equal(M.cupoDentroDeLimites(1, 3), 3, 'no baja de lo asignado'); assert.equal(M.cupoDentroDeLimites(25, 2), 20, 'no pasa de 20'); assert.equal(M.cupoDentroDeLimites(5, 2), 5); assert.equal(M.cupoDentroDeLimites(4.6, 1), 5)
    // el mínimo vive en un solo lugar: ninguna pantalla ni hoja repite la cuenta
    for (const f of ['PantallaEquipo.tsx', 'HojasEquipo.tsx', 'ServicioMovil.tsx', 'PantallaServicio.tsx']) assert.ok(!/Math\.max\(1[,)]/.test(leer(`components/servicio-movil/${f}`)), f + ' no debe recalcular el mínimo')
    assert.equal((leer('lib/admin/servicioMovil.ts').match(/Math\.max\(1, ultimoOcupado\)/g) || []).length, 1) })
  await prueba('el mínimo del cupo es el ÚLTIMO CUPO OCUPADO: quitar a la persona del cupo 1 cuando la del cupo 2 sigue no permite bajar a 1 (la del 2 quedaría oculta y aún convocada)', async () => {
    const s = sec('a', ['v']), d = { bandaItems: [banda('v', 'y', 2)], getSlotsNeeded: () => 2 }, p = M.posicionesDeEquipo(s, d, () => undefined)[0]
    assert.deepEqual([p.asignadas, p.ultimoOcupado, p.minimo, p.libres], [1, 2, 2, [1]]); assert.equal(M.cupoDentroDeLimites(1, p.ultimoOcupado), 2, 'pedir 1 deja 2'); assert.equal(M.cupoDentroDeLimites(2, 0), 2)
    const vacio = M.posicionesDeEquipo(s, { bandaItems: [], getSlotsNeeded: () => 4 }, () => undefined)[0]; assert.deepEqual([vacio.ultimoOcupado, vacio.minimo], [0, 1]) })
  await prueba('una tarjeta por posición: cupos, quién la ocupa y los cupos libres; «Voluntarios · 2 de 5» cuenta cupos llenos sobre cupos pedidos (no personas)', async () => {
    const s = sec('a', ['dr', 'ke', 'vz', 'ag', 'ba']), d = { bandaItems: [banda('vz', 'x', 1), banda('ba', 'y', 1)], getSlotsNeeded: () => 1 }
    const ps = M.posicionesDeEquipo(s, d, id => ({ nombre: id, apellido: 'Z' }))
    assert.deepEqual(ps.map(q => [q.posicionId, q.cupos, q.asignadas, q.libres.length, q.minimo, q.maximo]), [['dr', 1, 0, 1, 1, 20], ['ke', 1, 0, 1, 1, 20], ['vz', 1, 1, 0, 1, 20], ['ag', 1, 0, 1, 1, 20], ['ba', 1, 1, 0, 1, 20]])
    assert.deepEqual(M.cuposLlenos(ps), { llenos: 2, total: 5 }); assert.equal(T.voluntariosN(2, 5), 'Voluntarios · 2 de 5')
    const dos = M.posicionesDeEquipo(sec('a', ['v', 'k']), { bandaItems: [banda('v', 'm', 1), banda('k', 'm', 1)], getSlotsNeeded: () => 1 }, () => undefined); assert.deepEqual(M.cuposLlenos(dos), { llenos: 2, total: 2 }, 'quien tiene dos posiciones llena dos cupos')
    const g = M.posicionesDeEquipo(sec('a', ['v']), { bandaItems: [banda('v', 'x', 1), banda('v', 'y', 3)], getSlotsNeeded: () => 3 }, () => undefined)[0]; assert.deepEqual([g.cupos, g.asignadas, g.ultimoOcupado, g.minimo, g.libres], [3, 2, 3, 3, [2]], 'con personas en los cupos 1 y 3 el mínimo es 3 (el último ocupado), no 2 (cuántas hay)') })
  await prueba('el estado de una persona nunca depende solo del color: el punto lleva su etiqueta de lectura («Por notificar», «Confirmó»…) en la tarjeta y en la hoja', async () => {
    assert.equal(T.TEXTO_ESTADO_PERSONA['por-notificar'], 'Por notificar'); assert.equal(T.TEXTO_ESTADO_PERSONA.confirmado, 'Confirmó'); assert.equal(T.TEXTO_ESTADO_PERSONA['sin-responder'], 'Sin responder'); assert.equal(T.TEXTO_ESTADO_PERSONA.rechazo, 'No puede')
    const f = M.fichaDePersona({ inv: inv('m', 'a', { status: 'confirmado' }), verRechazos: true, bloqueados: new Set(['m']), memberId: 'm', aceptoEn: 'Aceptó en Producción' }); assert.deepEqual(f, { estado: 'confirmado', texto: 'Confirmó', bloqueo: true })
    assert.equal(M.fichaDePersona({ inv: inv('m', 'a', { status: 'declinado', declined_reason: 'conflict' }), verRechazos: true, bloqueados: new Set(), memberId: 'm', aceptoEn: 'Aceptó en Producción' }).texto, 'Aceptó en Producción')
    assert.equal(M.fichaDePersona({ inv: inv('m', 'a', { status: 'declinado' }), verRechazos: false, bloqueados: new Set(), memberId: 'm', aceptoEn: '' }).texto, 'Sin responder', 'quien no puede ver los rechazos no los recibe')
    assert.ok(/role="img" aria-label=\{ficha\.texto\}/.test(leer('components/servicio-movil/PantallaEquipo.tsx'))); assert.ok(/role="img" aria-label=\{f\.ficha\.texto\}/.test(leer('components/servicio-movil/HojasEquipo.tsx'))) })
  await prueba('la hoja de posición: sin nadie abre en la lista de personas (Equipo-H); con gente, en sus personas con «Falta {posición} N» y «Asignar» (Equipo-G); stepper con − y + desactivados en el mínimo y en el tope; «Listo» cierra', async () => {
    const h = leer('components/servicio-movil/HojasEquipo.tsx')
    assert.ok(/posicion\.asignadas === 0 \? \{ tipo: 'lista', slot: posicion\.libres\[0\] \?\? 1 \} : \{ tipo: 'personas' \}/.test(h)); assert.ok(/disabled=\{posicion\.cupos <= posicion\.minimo\}/.test(h)); assert.ok(/disabled=\{posicion\.cupos >= posicion\.maximo\}/.test(h))
    assert.ok(/faltaCupo\(posicion\.nombre, slot\)/.test(h) && /T\.asignar/.test(h)); assert.ok(/posicionN\(posicion\.nombre, f\.slotIndex\)/.test(h)); assert.ok(/cerrar\(\)\}>\{T\.listo\}/.test(h)); assert.ok(/T\.verPersona/.test(h) && /T\.cambiarPersona/.test(h) && /T\.quitarDePosicion/.test(h))
    assert.equal(T.faltaCupo('Voces', 2), 'Falta Voces 2'); assert.equal(T.posicionN('Voces', 1), 'Voces 1'); assert.equal(T.TEXTOS_SERVICIO.personasEnPosicion, 'Personas en esta posición'); assert.equal(T.TEXTOS_SERVICIO.ayudaStepper, 'Puedes bajar hasta el número de personas asignadas.') })
  await prueba('la base se toca SOLO a través de assignBanda y updateSlotsNeeded de la página (así la fase de seguridad las cambia en un solo lugar): una llamada de cada una, en ServicioMovil, con permiso y con el cupo dentro de los límites', async () => {
    const m = leer('components/servicio-movil/ServicioMovil.tsx'); assert.equal((m.match(/p\.assignBanda\(/g) || []).length, 1); assert.equal((m.match(/p\.updateSlotsNeeded\(/g) || []).length, 1)
    assert.ok(/function asignar\([^)]*\) \{ if \(equipo && puedeAsignar\(viewer, equipo\.teamId\)\) p\.assignBanda\(/.test(m)); assert.ok(/function cambiarCupo\([^)]*\) \{ if \(equipo && puedeAsignar\(viewer, equipo\.teamId\)\) p\.updateSlotsNeeded\(posicionId, cupoDentroDeLimites\(nuevo, ultimoOcupado\)\)/.test(m))
    for (const f of ['PantallaEquipo', 'PantallaServicio', 'HojasEquipo', 'HojasServicio', 'PantallaHerramienta', 'BarraSuperior']) assert.ok(!/assignBanda|updateSlotsNeeded/.test(leer(`components/servicio-movil/${f}.tsx`)), f + ' no escribe por su cuenta')
    assert.ok(/onElegir=\{\(slot, id\) => asignar\(pos\.posicionId, id, slot\)\}/.test(m)); assert.ok(/onQuitar=\{slot => asignar\(pos\.posicionId, '', slot\)\}/.test(m)); assert.ok(/onCupos=\{n => cambiarCupo\(pos\.posicionId, n, pos\.ultimoOcupado\)\}/.test(m)) })
  await prueba('la tarjeta de una posición solo abre la hoja con permiso; «Editar las posiciones del equipo» está en el «⋯» de la pantalla del equipo (solo administrador) y abre la gestión de ESE equipo en Personas', async () => {
    const e = leer('components/servicio-movil/PantallaEquipo.tsx'); assert.ok(/puedeAsignar && <button[^>]*onClick=\{\(\) => onAbrirPosicion\(pos\.posicionId\)\}/.test(e)); assert.ok(!/Gestionar posiciones|gestionarPosiciones/.test(e), 'la tarjeta ya no trae «Gestionar posiciones»')
    const m = leer('components/servicio-movil/ServicioMovil.tsx'); assert.ok(/onEditarPosiciones=\{equipo && !vista\.herramienta && viewer\.kind === 'admin' \? \(\) => onEditarPosiciones\(equipo\.teamId\) : undefined\}/.test(m))
    assert.ok(/\{onEditarPosiciones && <li>[^]*T\.editarPosicionesEquipo/.test(leer('components/servicio-movil/HojasServicio.tsx')))
    const pg = crudo('app/admin/page.tsx'); assert.ok(/onEditarPosiciones=\{teamId=>router\.push\(`\/admin\?tab=personas&gestion=equipo&team=\$\{encodeURIComponent\(teamId\)\}`\)\}/.test(pg)) })

  console.log('las reglas en el código')
  const ARCHIVOS = ['BarraSuperior', 'HojasServicio', 'HojasEquipo', 'PantallaServicio', 'PantallaEquipo', 'PantallaHerramienta', 'ServicioMovil', 'iconos']
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
  await prueba('quién declinó: las fichas de personas solo llevan «rechazo» si puedeVerRechazos(viewer, equipo)', async () => {
    const f = leer('components/servicio-movil/fichas.ts'); assert.ok(/verRechazos = puedeVerRechazos\(viewer, teamId\)/.test(f)); assert.ok(/fichaDePersona\(\{ inv, verRechazos, bloqueados, memberId,/.test(f)); assert.ok(/fichaDe=\{fichasDeEquipo\(p, equipo\.teamId, viewer\)\}/.test(leer('components/servicio-movil/ServicioMovil.tsx'))) })
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
