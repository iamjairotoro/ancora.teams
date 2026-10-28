// Checklist por posición, lado del LÍDER (servidor): quién puede qué, armar desde cero, grupos, ítems, mover, marcar, estados. Contra la «base» simulada del banco. Correr: `node tests/portal/checklist-lider.test.js`
const { assert, db, ID, S, mundo, prueba, terminar, correr, from, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const L = require(resolver(path.join(RAIZ, 'lib/admin/checklistLider'))), SV = require(resolver(path.join(RAIZ, 'lib/portal/checklistServidor')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const U = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const admin = { from }
const { ME, O1, TA, TT, P1, P2 } = ID, G33 = U(33), TOOL_A = U(210), TOOL_T = U(211), TOOL_S = U(212), CL_A = U(220), CL_T = U(221), ORG = ID.ORG
const equipos = new Set()
const autorizar = async (teamId) => (equipos.has(teamId) ? { ok: true, memberId: O1 } : { ok: false, status: 403 })      // quien llama es O1 (líder)
const llamar = e => L.ejecutarComoLider(admin, autorizar, e)
const items = () => db.service_checklist_items, it = id => items().find(i => i.id === id)

function escenario(lideraA = true) {
  mundo(); equipos.clear(); if (lideraA) equipos.add(TA)
  db.team_tools = [{ id: TOOL_A, team_id: TA, tool_type: 'checklist', label: 'Montaje', sort_order: 1 }, { id: TOOL_T, team_id: TT, tool_type: 'checklist', label: 'Técnica', sort_order: 1 }, { id: TOOL_S, team_id: TA, tool_type: 'setlist', label: null, sort_order: 2 }]
  db.service_checklists = [{ id: CL_A, service_id: S(1), team_id: TA, team_tool_id: TOOL_A }, { id: CL_T, service_id: S(1), team_id: TT, team_tool_id: TOOL_T }]
  db.service_checklist_groups = [{ id: U(230), service_checklist_id: CL_A, team_position_id: P1, titulo: 'Antes del servicio', sort_order: 1 }, { id: U(231), service_checklist_id: CL_A, team_position_id: G33, titulo: 'Guitarra', sort_order: 1 }, { id: U(232), service_checklist_id: CL_A, team_position_id: null, titulo: 'Varios', sort_order: 1 }, { id: U(233), service_checklist_id: CL_T, team_position_id: P2, titulo: 'Antes', sort_order: 1 }]
  const mk = (n, cl, g, pos, texto, extra = {}) => ({ id: U(300 + n), service_checklist_id: cl, group_id: g, team_position_id: pos, texto, checked: false, checked_by_member_id: null, checked_at: null, sort_order: n, ...extra })
  db.service_checklist_items = [mk(1, CL_A, U(230), P1, 'Cables de la voz'), mk(2, CL_A, U(230), P1, 'Probar micrófono', { checked: true, checked_by_member_id: O1, checked_at: '2099-01-04T13:30:00Z' }), mk(3, CL_A, U(231), G33, 'Afinar guitarra'), mk(4, CL_A, U(232), null, 'Cerrar la bodega'), mk(5, CL_T, U(233), P2, 'Encender el teclado')]
  db.members.find(m => m.id === O1).apellido = 'Prueba'
}
let nUuid = 500
const uuidear = () => { for (const t of ['service_checklist_groups', 'service_checklist_items', 'service_checklists']) for (const f of db[t]) if (!/^[0-9a-f]{8}-/.test(f.id)) f.id = U(nUuid++) }      // el banco numera lo que inserta («n1-0»); la base real pone uuid
const textos = r => JSON.stringify(r.body)
const nombresPos = r => r.body.posiciones.map(p => p.nombre)
const pos = (r, id) => r.body.posiciones.find(p => p.positionId === id)

correr(async () => {
  await prueba('leer como líder: ve TODAS las posiciones del equipo con su estado, sus ítems (también los de una posición sin persona) y «General»; solo su equipo', async () => {
    escenario(); const r = await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A }); assert.equal(r.status, 200)
    assert.ok(nombresPos(r).includes('Voz 2') && nombresPos(r).includes('Guitarra acústica') && nombresPos(r).includes('General')); assert.equal(pos(r, P1).estado, 'confirmada'); assert.equal(pos(r, G33).estado, 'sin-persona', 'nadie en Guitarra: aviso ámbar'); assert.equal(r.body.total, 4)
    assert.ok(textos(r).includes('Afinar guitarra') && textos(r).includes('Cerrar la bodega') && !textos(r).includes('Encender el teclado'), 've todo lo de su equipo y nada de otro'); assert.ok(pos(r, P1).confirmadas.length >= 1)
    const m = pos(r, P1).grupos.flatMap(g => g.items).find(i => i.checked); assert.equal(m.marca.yo, true, 'la marca del propio líder se reconoce'); assert.equal(typeof m.marca.hora, 'string') })
  await prueba('un líder NO toca el checklist de otro equipo: leer, marcar, crear, mover, borrar → 403 sin cambiar nada; ids de otro equipo se tratan igual que uno inexistente', async () => {
    escenario(); const antes = JSON.stringify([db.service_checklist_items, db.service_checklist_groups, db.service_checklists])
    const ajeno = { status: 403, body: { error: 'No autorizado' } }
    for (const e of [{ accion: 'leer', servicio: S(1), herramienta: TOOL_T }, { accion: 'marcar', itemId: U(305), checked: true }, { accion: 'editar-item', itemId: U(305), texto: 'x' }, { accion: 'eliminar-item', itemId: U(305) }, { accion: 'mover-item', itemId: U(305), grupoId: null }, { accion: 'crear-item', checklistId: CL_T, grupoId: null, positionId: P2, texto: 'x' }, { accion: 'crear-grupo', checklistId: CL_T, positionId: P2, titulo: 'x' }, { accion: 'renombrar-grupo', grupoId: U(233), titulo: 'x' }, { accion: 'eliminar-grupo', grupoId: U(233) }, { accion: 'crear-checklist', servicio: S(1), herramienta: TOOL_T }]) {
      const r = await llamar(e); assert.deepEqual([r.status, r.body], [ajeno.status, ajeno.body], e.accion) }
    assert.equal(JSON.stringify([db.service_checklist_items, db.service_checklist_groups, db.service_checklists]), antes, 'nada cambió')
    for (const e of [{ accion: 'marcar', itemId: U(399), checked: true }, { accion: 'leer', servicio: S(1), herramienta: U(999) }, { accion: 'borrar-todo' }, null]) { const r = await llamar(e); assert.deepEqual([r.status, r.body], [403, ajeno.body], 'inexistente o desconocido: igual de genérico') }
    const h = await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_S }); assert.equal(h.status, 403, 'una herramienta que no es checklist') })
  await prueba('el admin (autorizado en los dos equipos) sí puede; mezclar recursos de otro checklist o posiciones de otro equipo se rechaza (400) aunque el líder sea de uno de ellos', async () => {
    escenario(); equipos.add(TT); assert.equal((await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_T })).status, 200); equipos.delete(TT)
    const antes = JSON.stringify([db.service_checklist_items, db.service_checklist_groups])
    for (const e of [{ accion: 'crear-item', checklistId: CL_A, grupoId: U(233), texto: 'x' }, { accion: 'mover-item', itemId: U(301), grupoId: U(233) }, { accion: 'crear-grupo', checklistId: CL_A, positionId: P2, titulo: 'x' }, { accion: 'crear-item', checklistId: CL_A, grupoId: null, positionId: P2, texto: 'x' }, { accion: 'crear-item', checklistId: CL_A, grupoId: 'no-es-id', texto: 'x' }]) assert.equal((await llamar(e)).status, 400, JSON.stringify(e))
    assert.equal(JSON.stringify([db.service_checklist_items, db.service_checklist_groups]), antes) })
  await prueba('armar DESDE CERO: un equipo sin checklist en este servicio lo crea (una sola vez), queda vacío y listo para añadir ítems; no sirve con un servicio de otra organización', async () => {
    escenario(); db.service_checklists = db.service_checklists.filter(c => c.id !== CL_A); db.service_checklist_groups = db.service_checklist_groups.filter(g => g.service_checklist_id !== CL_A); db.service_checklist_items = db.service_checklist_items.filter(i => i.service_checklist_id !== CL_A)
    const vacio = await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A }); assert.equal(vacio.body.sinChecklist, true); assert.equal(vacio.body.checklistId, null)
    const c = await llamar({ accion: 'crear-checklist', servicio: S(1), herramienta: TOOL_A }); assert.equal(c.status, 200); assert.equal(c.body.sinChecklist, false); assert.equal(c.body.total, 0)
    const fila = db.service_checklists.filter(x => x.service_id === S(1) && x.team_tool_id === TOOL_A); assert.equal(fila.length, 1); assert.equal(fila[0].team_id, TA)
    await llamar({ accion: 'crear-checklist', servicio: S(1), herramienta: TOOL_A }); assert.equal(db.service_checklists.filter(x => x.team_tool_id === TOOL_A).length, 1, 'idempotente: no duplica')
    assert.equal((await llamar({ accion: 'crear-checklist', servicio: ID.AJ.service, herramienta: TOOL_A })).status, 403, 'servicio de otra organización') })
  await prueba('armar: «Nueva sección» en una posición, «Añadir ítem» dentro de la sección, suelto en la posición y en «General»; textos vacíos o largos se rechazan', async () => {
    escenario(); const g = await llamar({ accion: 'crear-grupo', checklistId: CL_A, positionId: G33, titulo: '  Al   terminar ' }); assert.equal(g.status, 200)
    uuidear(); const nuevo = db.service_checklist_groups.find(x => x.titulo === 'Al terminar'); assert.ok(nuevo && nuevo.team_position_id === G33 && nuevo.service_checklist_id === CL_A, 'título limpio, en esa posición'); assert.ok(nuevo.sort_order >= 2)
    const a = await llamar({ accion: 'crear-item', checklistId: CL_A, grupoId: nuevo.id, texto: 'Guardar las cuerdas' }); const i1 = items().find(i => i.texto === 'Guardar las cuerdas'); assert.deepEqual([i1.group_id, i1.team_position_id, i1.checked], [nuevo.id, G33, false], 'la posición sale del grupo'); assert.ok(textos(a).includes('Guardar las cuerdas'))
    await llamar({ accion: 'crear-item', checklistId: CL_A, grupoId: null, positionId: P1, texto: 'Suelto en Voz' }); const i2 = items().find(i => i.texto === 'Suelto en Voz'); assert.deepEqual([i2.group_id, i2.team_position_id], [null, P1])
    await llamar({ accion: 'crear-item', checklistId: CL_A, grupoId: null, positionId: null, texto: 'Para el líder' }); const i3 = items().find(i => i.texto === 'Para el líder'); assert.deepEqual([i3.group_id, i3.team_position_id], [null, null], '«General»')
    const antes = items().length; for (const texto of ['', '   ', 'x'.repeat(L.MAX_TEXTO + 1), 5, null]) assert.equal((await llamar({ accion: 'crear-item', checklistId: CL_A, grupoId: null, positionId: null, texto })).status, 400); assert.equal((await llamar({ accion: 'crear-grupo', checklistId: CL_A, positionId: null, titulo: 'x'.repeat(L.MAX_TITULO + 1) })).status, 400); assert.equal(items().length, antes) })
  await prueba('grupos: renombrar; eliminar una sección con ítems NO borra los ítems (quedan sueltos en su posición y el líder los sigue viendo)', async () => {
    escenario(); await llamar({ accion: 'renombrar-grupo', grupoId: U(230), titulo: 'Antes de las 9:30' }); assert.equal(db.service_checklist_groups.find(g => g.id === U(230)).titulo, 'Antes de las 9:30'); assert.equal((await llamar({ accion: 'renombrar-grupo', grupoId: U(230), titulo: ' ' })).status, 400)
    const r = await llamar({ accion: 'eliminar-grupo', grupoId: U(230) }); assert.equal(r.status, 200); assert.ok(!db.service_checklist_groups.some(g => g.id === U(230)))
    assert.ok(items().some(i => i.id === U(301)) && items().some(i => i.id === U(302)), 'los ítems siguen en la base'); const voz = pos(r, P1).grupos.flatMap(g => g.items).map(i => i.texto); assert.deepEqual(voz.sort(), ['Cables de la voz', 'Probar micrófono'], 'y el líder los ve en su posición (sin sección)') })
  await prueba('mover ítem: a un grupo de OTRA posición (cambia de posición), a «General» o dentro de la misma; lo marcado conserva quién y cuándo; el músico de la posición anterior deja de verlo', async () => {
    escenario(); const guardada = { checked: it(U(302)).checked, por: it(U(302)).checked_by_member_id, hora: it(U(302)).checked_at }
    const antes = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.ok(JSON.stringify(antes.body).includes('Probar micrófono'), 'antes lo ve la persona de Voz 2')
    const r = await llamar({ accion: 'mover-item', itemId: U(302), grupoId: U(231) }); assert.equal(r.status, 200); assert.deepEqual([it(U(302)).group_id, it(U(302)).team_position_id], [U(231), G33])
    assert.deepEqual({ checked: it(U(302)).checked, por: it(U(302)).checked_by_member_id, hora: it(U(302)).checked_at }, guardada, 'lo marcado conserva su marca'); assert.ok(pos(r, G33).grupos.flatMap(g => g.items).some(i => i.id === U(302) && i.checked))
    const despues = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.ok(!JSON.stringify(despues.body).includes('Probar micrófono'), 'la persona de la posición anterior deja de verlo')
    await llamar({ accion: 'mover-item', itemId: U(301), grupoId: null }); assert.deepEqual([it(U(301)).group_id, it(U(301)).team_position_id], [null, null], '«General»'); assert.ok(!JSON.stringify((await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A)).body).includes('Cables de la voz'))
    await llamar({ accion: 'mover-item', itemId: U(301), grupoId: U(230) }); assert.equal(it(U(301)).team_position_id, P1, 'vuelve a Voz 2: la persona lo ve de nuevo'); assert.ok(JSON.stringify((await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A)).body).includes('Cables de la voz')) })
  await prueba('editar y eliminar ítems; el líder marca y desmarca CUALQUIER ítem (también «General») y queda quién y cuándo', async () => {
    escenario(); await llamar({ accion: 'editar-item', itemId: U(301), texto: ' Cables  nuevos ' }); assert.equal(it(U(301)).texto, 'Cables nuevos'); assert.equal((await llamar({ accion: 'editar-item', itemId: U(301), texto: '' })).status, 400)
    for (const id of [U(301), U(303), U(304)]) { const r = await llamar({ accion: 'marcar', itemId: id, checked: true }); assert.equal(r.status, 200); assert.deepEqual([it(id).checked, it(id).checked_by_member_id], [true, O1]); assert.ok(!Number.isNaN(Date.parse(it(id).checked_at))) }
    await llamar({ accion: 'marcar', itemId: U(304), checked: false }); assert.deepEqual([it(U(304)).checked, it(U(304)).checked_by_member_id, it(U(304)).checked_at], [false, null, null]); assert.equal((await llamar({ accion: 'marcar', itemId: U(304), checked: 'si' })).status, 400)
    const e = await llamar({ accion: 'eliminar-item', itemId: U(303) }); assert.equal(e.status, 200); assert.ok(!items().some(i => i.id === U(303))); assert.ok(!textos(e).includes('Afinar guitarra')) })
  await prueba('estados: «Sin persona este domingo» (nadie o declinó), «Pendiente de confirmar» (solo convocados sin responder) y confirmada; una posición sin cupo y sin nadie no aparece', async () => {
    escenario(); const inv = (m) => db.invitations.find(i => i.service_id === S(1) && i.member_id === m && i.team_id === TA)
    assert.equal(pos(await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A }), P1).estado, 'confirmada')
    inv(ME).status = 'pendiente'; inv(O1).status = 'pendiente'; const p = pos(await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A }), P1); assert.equal(p.estado, 'pendiente'); assert.equal(p.pendientes.length, 2, 'con nombres, para el líder')
    inv(ME).status = 'declinado'; inv(O1).status = 'declinado'; assert.equal(pos(await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A }), P1).estado, 'sin-persona')
    db.service_position_slots.push({ service_id: S(1), team_position_id: G33, slots_needed: 0 }); const sin = await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A }); assert.ok(!nombresPos(sin).includes('Guitarra acústica'), 'sin cupo y sin nadie: la posición no aparece'); assert.ok(pos(sin, null).grupos.flatMap(g => g.items).some(i => i.texto === 'Afinar guitarra'), 'sus ítems pasan a «General»: no se pierden') })
  await prueba('un líder de OTRO equipo no puede ni ver la vista de este (ni con su propio id de herramienta ni con el de este)', async () => {
    escenario(false); equipos.add(TT); assert.equal((await llamar({ accion: 'leer', servicio: S(1), herramienta: TOOL_A })).status, 403); assert.equal((await llamar({ accion: 'marcar', itemId: U(301), checked: true })).status, 403); assert.equal(it(U(301)).checked, false) })
  await prueba('la ruta autoriza con requireTeamAccess sobre el equipo del recurso, saca la persona de la sesión, usa la llave de servicio y no abre tablas', async () => {
    const c = sinCom(leer('app/api/admin/checklist/route.ts')); assert.ok(/requireTeamAccess\(teamId, orgId\)/.test(c) && /findMemberByEmail\(a\.email, admin\)/.test(c) && /createAdminSupabase\(\)/.test(c) && /ejecutarComoLider\(admin, autorizador\(admin\), entrada\)/.test(c)); assert.ok(!/ANON_KEY|createBrowserClient/.test(c))
    const m = sinCom(leer('lib/admin/checklistLider.ts')); assert.ok(!/ANON_KEY|createClient|createBrowserClient/.test(m)); assert.ok(/case 'leer': case 'crear-checklist'/.test(m)); assert.ok(!/e\.teamId|e\.team_id|e\.organizationId|e\.orgId/.test(m), 'el equipo y la organización NUNCA salen del cuerpo de la petición') })
  await prueba('pantalla del líder (solo teléfono): PantallaHerramienta dibuja ChecklistLider en lugar de ChecklistTool; escritorio y tablet siguen con ChecklistTool (los ítems de allí caen en «General»); acciones por /api/admin/checklist, sin escrituras directas', async () => {
    const ph = sinCom(leer('components/servicio-movil/PantallaHerramienta.tsx')); assert.ok(/<ChecklistLider servicioId=\{servicio\.id\} herramientaId=\{tool\.id\}/.test(ph) && !/ChecklistTool/.test(ph))
    assert.ok(/ChecklistTool/.test(sinCom(leer('components/AdminServiceView.tsx'))), 'escritorio: sin cambios'); assert.ok(!/ChecklistLider/.test(sinCom(leer('components/AdminServiceView.tsx'))))
    const c = sinCom(leer('components/servicio-movil/ChecklistLider.tsx')); assert.ok(!/supabase/i.test(c), 'sin acceso directo a la base'); assert.ok(/fetch\(`\/api\/admin\/checklist\?servicio=/.test(c) && /fetch\('\/api\/admin\/checklist', \{ method: 'POST'/.test(c))
    assert.ok(!/setInterval|EventSource|WebSocket|\.channel\(|postgres_changes/.test(c), 'sin sondeo ni tiempo real'); assert.ok(/addEventListener\('visibilitychange', alVolver\)/.test(c))
    for (const a of ['crear-checklist', 'crear-grupo', 'renombrar-grupo', 'eliminar-grupo', 'crear-item', 'editar-item', 'mover-item', 'eliminar-item', 'marcar']) assert.ok(c.includes(`'${a}'`), a)
    assert.ok(/T\.anadirItem/.test(c) && /T\.nuevaSeccion/.test(c) && /T\.sinPersona/.test(c) && /T\.pendiente/.test(c) && /T\.moverAOtroGrupo/.test(c) && /pasaraA\(d\.posNombre\)/.test(c), 'los botones del mockup')
    assert.ok(/i\.checked && !\(await confirmar\(confirmarEliminarMarcado/.test(c), 'confirma solo si estaba marcado'); assert.ok(/g\.items\.length > 0 && !\(await confirmar\(confirmarEliminarSeccion/.test(c))
    const t = require(resolver(path.join(RAIZ, 'lib/textos/checklist'))); assert.equal(t.pasaraA('Luces'), 'Pasará a Luces'); assert.equal(t.confirmarEliminarMarcado, 'Este ítem ya está marcado. Si lo eliminas, se pierde quién y cuándo lo marcó.')
    assert.equal(t.confirmarEliminarSeccion('Al terminar', 2), 'Los 2 ítems de «Al terminar» quedan sueltos en su posición. ¿Eliminar la sección?'); assert.equal(t.confirmarEliminarSeccion('Al terminar', 1), 'El ítem de «Al terminar» queda suelto en su posición. ¿Eliminar la sección?'); assert.ok(!/al instante|en vivo|tiempo real/i.test(c + sinCom(leer('lib/textos/checklist.ts')))) })
  terminar()
})
