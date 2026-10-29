// Plantillas del checklist (servidor, teléfono): listar, previsualizar, aplicar y guardar; y la SEGURIDAD: un líder solo toca las de su equipo, solo el admin reemplaza la predeterminada, y renombrar / archivar / marcar predeterminada no existen en esta ruta.
// Contra la «base» simulada del banco. Correr: `node tests/portal/checklist-plantillas.test.js`
const { assert, db, ID, S, mundo, estado, prueba, terminar, correr, from, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const L = require(resolver(path.join(RAIZ, 'lib/admin/checklistLider'))), PL = require(resolver(path.join(RAIZ, 'lib/admin/checklistPlantillas'))), C = require(resolver(path.join(RAIZ, 'lib/checklist/posiciones')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const U = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const { O1, TA, TT, P1 } = ID, ORG = '00000000-0000-0000-0000-000000000001', G33 = U(33), TOOL_A = U(210), TOOL_T = U(211), CL_A = U(220), CL_T = U(221), CL_E = U(222)
const TPL = { nueva: U(401), vieja: U(402), pred: U(403), otroEq: U(404), archivada: U(405) }
const admin = { from }
const quien = { equipos: new Set(), esAdmin: false }
const autorizar = async (teamId) => (quien.equipos.has(teamId) ? { ok: true, memberId: O1, esAdmin: quien.esAdmin } : { ok: false, status: 403 })
const llamar = e => L.ejecutarComoLider(admin, autorizar, e)
const cop = x => JSON.parse(JSON.stringify(x))
const filas = () => cop([db.service_checklist_items, db.service_checklist_groups, db.service_checklists, db.tool_templates])
const item = id => db.service_checklist_items.find(i => i.id === id)
const tpl = id => db.tool_templates.find(t => t.id === id)
const escrituraEnPlantillas = () => estado.escrituras.filter(w => w.tabla === 'tool_templates')
const GENERICO = { status: 403, body: { error: 'No autorizado' } }

function escenario({ lider = true, admin: esAdmin = false } = {}) {
  mundo(); quien.equipos = new Set(lider ? [TA] : []); quien.esAdmin = esAdmin; estado.escrituras.length = 0
  db.team_tools = [{ id: TOOL_A, team_id: TA, tool_type: 'checklist', label: 'Montaje', sort_order: 1 }, { id: TOOL_T, team_id: TT, tool_type: 'checklist', label: 'Técnica', sort_order: 1 }]
  // servicios anteriores del equipo: uno normal viejo (2020), uno normal reciente (2098-12-28, el que debe elegir), uno SIN ítems (2098-12-30), un ensayo (2098-12-31) y uno posterior (S(2), 2099-01-11)
  const svc = (id, fecha, tipo = 'servicio') => ({ id, fecha, tipo, titulo: id, hora_inicio: '10:00:00', hora_fin: '12:00:00', organization_id: ORG })
  db.services.push(svc(S(20), '2098-12-28'), svc(S(21), '2098-12-30'), svc(S(22), '2098-12-31', 'ensayo'))
  const ck = (id, service, team, tool) => ({ id, service_id: service, team_id: team, team_tool_id: tool })
  db.service_checklists = [ck(CL_A, S(1), TA, TOOL_A), ck(CL_T, S(1), TT, TOOL_T), ck(CL_E, S(2), TA, TOOL_A), ck(U(223), S(9), TA, TOOL_A), ck(U(224), S(20), TA, TOOL_A), ck(U(225), S(21), TA, TOOL_A), ck(U(226), S(22), TA, TOOL_A)]
  const g = (n, cl, pos, titulo) => ({ id: U(230 + n), service_checklist_id: cl, team_position_id: pos, titulo, sort_order: n })
  db.service_checklist_groups = [g(0, CL_A, P1, 'Antes del servicio'), g(1, CL_A, G33, 'Guitarra'), g(2, CL_A, null, 'Varios'), g(3, U(223), P1, 'Viejo'), g(4, U(224), P1, 'Antes del servicio'), g(5, U(224), null, 'Varios'), g(6, U(226), P1, 'Ensayo')]
  const mk = (n, cl, grupo, pos, texto, extra = {}) => ({ id: U(300 + n), service_checklist_id: cl, group_id: grupo, team_position_id: pos, texto, checked: false, checked_by_member_id: null, checked_at: null, sort_order: n, ...extra })
  db.service_checklist_items = [mk(1, CL_A, U(230), P1, 'Cables de la voz'), mk(2, CL_A, U(230), P1, 'Probar micrófono', { checked: true, checked_by_member_id: O1, checked_at: '2099-01-04T13:30:00Z' }), mk(3, CL_A, U(231), G33, 'Afinar guitarra'), mk(4, CL_A, U(232), null, 'Cerrar la bodega'),
    mk(5, CL_T, null, ID.P2, 'Encender el teclado'), mk(6, U(223), U(233), P1, 'Del 2020'),
    mk(7, U(224), U(234), P1, 'Cables de la voz', { checked: true, checked_by_member_id: O1, checked_at: '2098-12-28T10:00:00Z' }), mk(8, U(224), U(234), P1, 'Revisar baterías'), mk(9, U(224), U(235), null, 'Barrer el escenario'), mk(10, U(224), null, G33, 'Cambiar cuerdas'),
    mk(11, U(226), U(236), P1, 'Solo del ensayo')]
  const c = (id, team, name, content, extra = {}) => ({ id, organization_id: ORG, team_id: team, tool: 'checklist', name, content, default_for_kind: null, archived_at: null, created_by: null, ...extra })
  db.tool_templates = [
    c(TPL.nueva, TA, 'Montaje domingo', [{ texto: 'Cables de la voz', positionId: P1, positionNombre: 'Voz 2', grupo: 'Antes del servicio' }, { texto: 'Cerrar el micrófono', positionId: P1, positionNombre: 'Voz 2', grupo: 'Al terminar' }, { texto: 'Afinar guitarra', positionId: G33, positionNombre: 'Guitarra acústica', grupo: 'Guitarra' },
      { texto: 'Cerrar la bodega', positionId: null, grupo: 'Varios' }, { texto: 'Encender reflectores', positionId: U(77), positionNombre: 'Luces', grupo: 'Antes' }]),
    c(TPL.vieja, TA, 'Plantilla vieja', [{ texto: 'Cable A' }, { texto: 'Cable B' }, { texto: 'cable a' }]),
    c(TPL.pred, TA, 'Domingo regular', [{ texto: 'Revisar el escenario', positionId: P1, positionNombre: 'Voz 2', grupo: 'Antes del servicio' }], { default_for_kind: 'service' }),
    c(TPL.otroEq, TT, 'Técnica semanal', [{ texto: 'SECRETO_PLANTILLA_DE_OTRO_EQUIPO' }]),
    c(TPL.archivada, TA, 'Archivada', [{ texto: 'x' }], { archived_at: '2026-01-01T00:00:00Z' }),
  ]
  db.members.find(m => m.id === O1).apellido = 'Prueba'
}
let nUuid = 700
const uuidear = () => {      // el banco numera lo que inserta («n1-0»); la base real pone uuid. Se reasigna conservando las referencias entre filas.
  const malo = id => !/^[0-9a-f]{8}-/.test(id), nuevo = new Map()
  for (const t of ['service_checklists', 'service_checklist_groups', 'service_checklist_items', 'tool_templates']) for (const f of db[t]) if (malo(f.id)) { nuevo.set(f.id, U(nUuid++)); f.id = nuevo.get(f.id) }
  for (const g of db.service_checklist_groups) { if (nuevo.has(g.service_checklist_id)) g.service_checklist_id = nuevo.get(g.service_checklist_id) }
  for (const i of db.service_checklist_items) { if (nuevo.has(i.group_id)) i.group_id = nuevo.get(i.group_id); if (nuevo.has(i.service_checklist_id)) i.service_checklist_id = nuevo.get(i.service_checklist_id) }
}
const de = (accion, extra = {}) => llamar({ accion, checklistId: CL_A, ...extra })

correr(async () => {
  // ── listar ──
  await prueba('listar: el líder ve las plantillas activas de SU equipo con «N ítems · M posiciones» (las viejas, solo ítems), cuál es la predeterminada y si hay un domingo pasado; nada de otro equipo ni de archivadas, y nunca el contenido', async () => {
    escenario(); const r = await de('plantillas-listar'); assert.equal(r.status, 200)
    const por = id => r.body.plantillas.find(p => p.id === id)
    assert.deepEqual(r.body.plantillas.map(p => p.id).sort(), [TPL.nueva, TPL.vieja, TPL.pred].sort()); assert.deepEqual(por(TPL.nueva), { id: TPL.nueva, nombre: 'Montaje domingo', items: 5, posiciones: 3, predeterminada: false })
    assert.deepEqual(por(TPL.vieja), { id: TPL.vieja, nombre: 'Plantilla vieja', items: 3, posiciones: null, predeterminada: false }); assert.equal(por(TPL.pred).predeterminada, true)
    assert.ok(!JSON.stringify(r.body).includes('SECRETO_PLANTILLA_DE_OTRO_EQUIPO') && !JSON.stringify(r.body).includes('Cables de la voz'), 'ni el contenido ni lo de otro equipo'); assert.deepEqual(r.body.domingoPasado, { disponible: true, items: 4, fecha: '2098-12-28' }, 'el último anterior con ítems: se saltan el vacío y el ensayo')
    assert.equal(r.body.esAdmin, false) })
  await prueba('«domingo pasado»: sin servicios anteriores con ítems queda no disponible; un ensayo y un checklist vacío no cuentan; solo del mismo equipo y la misma herramienta', async () => {
    escenario(); db.service_checklists = db.service_checklists.filter(c => ![U(223), U(224)].includes(c.id)); let r = await de('plantillas-listar'); assert.deepEqual(r.body.domingoPasado, { disponible: false }, 'quedan un vacío y un ensayo: ninguno sirve')
    const ap = await de('plantilla-aplicar', { origen: 'domingo-pasado' }); assert.equal(ap.status, 400, 'no hay de dónde copiar')
    escenario(); db.service_checklists.find(c => c.id === U(224)).team_tool_id = TOOL_T; r = await de('plantillas-listar'); assert.equal(r.body.domingoPasado.fecha, '2020-01-05', 'el de otra herramienta no cuenta: sigue el de 2020') })

  // ── previsualizar y aplicar ──
  await prueba('previsualizar no escribe nada y dice cuántos se agregan, cuántos se omiten y cuántos van a «General» por posición que no existe', async () => {
    escenario(); const antes = filas(); const r = await de('plantilla-previsualizar', { origen: 'plantilla', plantillaId: TPL.nueva }); assert.equal(r.status, 200)
    assert.deepEqual(r.body, { agregar: 2, omitir: 3, sinPosiciones: 0, aGeneral: [{ nombre: 'Luces', items: 1 }] }, '«Cables de la voz», «Afinar guitarra» y «Cerrar la bodega» ya estaban (misma posición y sección): se agrega «Cerrar el micrófono» y el de la posición que no existe')
    assert.deepEqual(filas(), antes, 'previsualizar no cambia nada') })
  await prueba('aplicar una plantilla nueva: SOLO agrega (crea la sección que falta, usa la que existe), nada se borra ni se cambia, lo marcado conserva quién y cuándo; los de una posición inexistente van a «General»', async () => {
    escenario(); const antes = cop(db.service_checklist_items); const r = await de('plantilla-aplicar', { origen: 'plantilla', plantillaId: TPL.nueva, esperados: { agregar: 2 } }); assert.equal(r.status, 200); uuidear()
    assert.deepEqual(r.body.aplicado, { agregar: 2, omitir: 3, sinPosiciones: 0, aGeneral: [{ nombre: 'Luces', items: 1 }] })
    for (const a of antes) assert.deepEqual(item(a.id), a, 'ningún ítem de antes cambió (ni su marca)'); assert.equal(db.service_checklist_items.length, antes.length + 2)
    const alTerminar = db.service_checklist_groups.find(g => g.titulo === 'Al terminar'); assert.ok(alTerminar && alTerminar.team_position_id === P1 && alTerminar.service_checklist_id === CL_A, 'la sección que faltaba se creó en su posición')
    const cerrar = db.service_checklist_items.find(i => i.texto === 'Cerrar el micrófono'); assert.deepEqual([cerrar.group_id, cerrar.team_position_id, cerrar.checked, cerrar.checked_by_member_id ?? null], [alTerminar.id, P1, false, null])
    assert.equal(db.service_checklist_groups.filter(g => g.titulo === 'Antes del servicio' && g.service_checklist_id === CL_A).length, 1, 'la sección que ya existía no se duplicó')
    const luces = db.service_checklist_items.find(i => i.texto === 'Encender reflectores'), gl = db.service_checklist_groups.find(g => g.id === luces.group_id); assert.deepEqual([luces.team_position_id, gl.team_position_id, gl.titulo], [null, null, 'Luces · Antes'], 'a «General», en una sección con el nombre de la posición original')
    assert.ok(db.service_checklist_items.filter(i => i.service_checklist_id === CL_A).every(i => Number.isFinite(i.sort_order)), 'los nuevos quedan al final con su orden'); assert.ok(cerrar.sort_order > Math.max(...antes.filter(i => i.service_checklist_id === CL_A).map(i => i.sort_order)))
    assert.ok(r.body.posiciones.find(p => p.positionId === null).grupos.some(g => g.titulo === 'Luces · Antes'), 'la respuesta trae la vista fresca') })
  await prueba('aplicar dos veces la misma plantilla no cambia nada la segunda vez', async () => {
    escenario(); await de('plantilla-aplicar', { origen: 'plantilla', plantillaId: TPL.nueva }); uuidear(); const despues = filas(); const r = await de('plantilla-aplicar', { origen: 'plantilla', plantillaId: TPL.nueva }); assert.equal(r.status, 200)
    assert.deepEqual(r.body.aplicado, { agregar: 0, omitir: 5, sinPosiciones: 0, aGeneral: [] }); assert.deepEqual(filas(), despues, 'la segunda vez no escribe nada') })
  await prueba('plantilla VIEJA (lista plana): todos sus ítems van a «General» en una sola sección sin título (suelto, sin posición), con el aviso; se omite el repetido', async () => {
    escenario(); const pre = await de('plantilla-previsualizar', { origen: 'plantilla', plantillaId: TPL.vieja }); assert.deepEqual(pre.body, { agregar: 2, omitir: 1, sinPosiciones: 2, aGeneral: [] }, '«cable a» repite a «Cable A» dentro de la propia plantilla')
    const r = await de('plantilla-aplicar', { origen: 'plantilla', plantillaId: TPL.vieja }); uuidear(); assert.equal(r.status, 200)
    const nuevos = db.service_checklist_items.filter(i => ['Cable A', 'Cable B'].includes(i.texto)); assert.equal(nuevos.length, 2); assert.ok(nuevos.every(i => i.group_id === null && i.team_position_id === null && i.checked === false), 'sueltos en General, sin marcar')
    const general = r.body.posiciones.find(p => p.positionId === null); assert.ok(general.grupos.some(g => g.titulo === null && g.items.some(i => i.texto === 'Cable A')), 'el líder los ve en «General», en la sección sin título')
    assert.equal(db.service_checklist_groups.filter(g => g.service_checklist_id === CL_A).length, 3, 'no se crearon secciones') })
  await prueba('los ítems de «General» solo los ve el líder (el músico de una posición no): y el líder puede moverlos a una posición con «mover-item»', async () => {
    escenario(); await de('plantilla-aplicar', { origen: 'plantilla', plantillaId: TPL.vieja }); uuidear(); const cable = db.service_checklist_items.find(i => i.texto === 'Cable A')
    const V = C.vistaDelMusico(ID.ME, { teamId: TA, posiciones: [{ id: P1, nombre: 'Voz 2', orden: 1 }], nomina: [{ memberId: ID.ME, positionId: P1 }], convocatorias: [{ memberId: ID.ME, teamId: TA, status: 'confirmado', confirmedPositionIds: [P1] }],
      grupos: [], items: db.service_checklist_items.filter(i => i.service_checklist_id === CL_A).map(i => ({ id: i.id, groupId: i.group_id, positionId: i.team_position_id, texto: i.texto, checked: i.checked, orden: i.sort_order })) })
    assert.ok(!JSON.stringify(V).includes('Cable A') && !JSON.stringify(V).includes('Cerrar la bodega'), 'el músico no ve «General»')
    const mover = await llamar({ accion: 'mover-item', itemId: cable.id, positionId: P1 }); assert.equal(mover.status, 200); assert.equal(item(cable.id).team_position_id, P1, 'el líder lo mueve a una posición'); assert.equal(item(cable.id).group_id, null)
    assert.ok(/mover-item/.test(sinCom(leer('lib/admin/checklistLider.ts'))), 'el «⋯ › Mover a otro grupo» ya existía (commit 4)') })
  await prueba('«Empezar con el del domingo pasado»: copia SIN marcar los ítems del último checklist anterior del equipo (con sus posiciones y secciones) con las mismas reglas, y omite lo que ya estaba', async () => {
    escenario(); const pre = await de('plantilla-previsualizar', { origen: 'domingo-pasado' }); assert.deepEqual(pre.body, { agregar: 3, omitir: 1, sinPosiciones: 0, aGeneral: [] }, '«Cables de la voz» ya estaba')
    const r = await de('plantilla-aplicar', { origen: 'domingo-pasado' }); uuidear(); assert.equal(r.status, 200); assert.equal(db.service_checklist_items.filter(i => i.service_checklist_id === CL_A).length, 4 + 3)
    for (const t of ['Revisar baterías', 'Barrer el escenario', 'Cambiar cuerdas']) { const i = db.service_checklist_items.find(x => x.texto === t && x.service_checklist_id === CL_A); assert.ok(i, t); assert.deepEqual([i.checked, i.checked_by_member_id ?? null, i.checked_at ?? null], [false, null, null], 'sin marcar') }
    assert.ok(!db.service_checklist_items.some(i => i.service_checklist_id === CL_A && ['Solo del ensayo', 'Del 2020'].includes(i.texto)), 'ni el ensayo ni uno más viejo')
    const bar = db.service_checklist_items.find(i => i.texto === 'Barrer el escenario' && i.service_checklist_id === CL_A); assert.equal(bar.team_position_id, null, 'lo de «General» sigue en General') })
  await prueba('si el checklist cambió mientras la persona decidía (los números ya no son los confirmados) responde 409 con los números nuevos y no escribe', async () => {
    escenario(); const antes = filas(); const r = await de('plantilla-aplicar', { origen: 'plantilla', plantillaId: TPL.nueva, esperados: { agregar: 99 } })
    assert.equal(r.status, 409); assert.equal(r.body.codigo, 'cambio'); assert.equal(r.body.resumen.agregar, 2); assert.deepEqual(filas(), antes) })

  // ── guardar ──
  await prueba('guardar con un nombre nuevo: lo arma EL SERVIDOR desde el checklist (lo que mande el cliente como contenido se ignora), sin marcas ni personas, no predeterminada, del equipo y la organización del checklist', async () => {
    escenario(); const antes = db.tool_templates.length; const r = await de('plantilla-guardar', { nombre: '  Sonido   domingo ', contenido: [{ texto: 'MALICIOSO' }], team_id: TT, organization_id: 'otra', default_for_kind: 'service' }); assert.equal(r.status, 200); uuidear()
    assert.equal(db.tool_templates.length, antes + 1); const n = db.tool_templates.find(t => t.name === 'Sonido domingo'); assert.ok(n, 'nombre limpio'); assert.deepEqual([n.team_id, n.organization_id, n.tool, n.default_for_kind ?? null, n.archived_at ?? null], [TA, ORG, 'checklist', null, null])
    assert.ok(!JSON.stringify(n.content).includes('MALICIOSO') && !JSON.stringify(n.content).includes('checked') && !JSON.stringify(n.content).includes(O1), 'el contenido sale de la base, sin marcas ni personas'); assert.equal(n.created_by, O1)
    assert.deepEqual(C.leerPlantilla(n.content).map(i => i.texto).sort(), ['Afinar guitarra', 'Cables de la voz', 'Cerrar la bodega', 'Probar micrófono'].sort()); assert.equal(r.body.guardada.nombre, 'Sonido domingo'); assert.equal(r.body.guardada.reemplazo, false); assert.ok(r.body.plantillas.some(p => p.nombre === 'Sonido domingo')) })
  await prueba('ida y vuelta: lo guardado se aplica a otro checklist (de otro domingo) con las mismas posiciones y secciones', async () => {
    escenario(); await de('plantilla-guardar', { nombre: 'Para el otro domingo' }); uuidear(); const id = db.tool_templates.find(t => t.name === 'Para el otro domingo').id
    const r = await llamar({ accion: 'plantilla-aplicar', checklistId: CL_E, origen: 'plantilla', plantillaId: id }); assert.equal(r.status, 200); uuidear()
    const nuevos = db.service_checklist_items.filter(i => i.service_checklist_id === CL_E); assert.equal(nuevos.length, 4); assert.ok(nuevos.every(i => i.checked === false && (i.checked_by_member_id ?? null) === null))
    assert.deepEqual(nuevos.map(i => i.team_position_id).sort(), [P1, P1, G33, null].sort(), 'cada uno en su posición'); assert.ok(db.service_checklist_groups.some(g => g.service_checklist_id === CL_E && g.titulo === 'Antes del servicio' && g.team_position_id === P1)) })
  await prueba('nombre repetido (sin distinguir mayúsculas ni tildes): sin «reemplazar» pregunta (409 «existe»); con «reemplazar» cambia SOLO el contenido (mismo id, nombre y estado); el nombre inválido o un checklist sin ítems se rechazan', async () => {
    escenario(); const antes = db.tool_templates.length
    const pregunta = await de('plantilla-guardar', { nombre: ' montaje DOMINGO ' }); assert.deepEqual([pregunta.status, pregunta.body.codigo, pregunta.body.nombre, pregunta.body.predeterminada], [409, 'existe', 'Montaje domingo', false]); assert.equal(db.tool_templates.length, antes); assert.equal(tpl(TPL.nueva).content.length, 5, 'no cambió nada')
    const r = await de('plantilla-guardar', { nombre: 'Montaje domingo', reemplazar: true }); assert.equal(r.status, 200); assert.equal(r.body.guardada.reemplazo, true); assert.equal(db.tool_templates.length, antes, 'no se creó otra')
    const t = tpl(TPL.nueva); assert.deepEqual([t.id, t.name, t.default_for_kind, t.archived_at, t.team_id], [TPL.nueva, 'Montaje domingo', null, null, TA], 'mismo id, nombre, predeterminada y archivado'); assert.equal(C.leerPlantilla(t.content).length, 4, 'el contenido ahora es el del checklist actual')
    for (const n of ['', '   ', 'x'.repeat(61), null, 5, undefined]) assert.equal((await de('plantilla-guardar', { nombre: n })).status, 400, String(n))
    db.service_checklist_items = db.service_checklist_items.filter(i => i.service_checklist_id !== CL_A); const vacio = await de('plantilla-guardar', { nombre: 'Vacía' }); assert.deepEqual([vacio.status, vacio.body.codigo], [400, 'vacio'])
    escenario(); db.tool_templates.push({ ...cop(tpl(TPL.nueva)), id: U(499), name: 'MONTAJE domingo' }); const amb = await de('plantilla-guardar', { nombre: 'Montaje domingo', reemplazar: true }); assert.deepEqual([amb.status, amb.body.codigo], [409, 'ambiguo'], 'dos con ese nombre: no se adivina') })

  // ── SEGURIDAD ──
  await prueba('un líder de OTRO equipo no puede listar, previsualizar, aplicar ni guardar sobre el checklist de este equipo: 403 genérico y nada cambia; un id inexistente se trata igual', async () => {
    escenario({ lider: false }); quien.equipos = new Set([TT]); const antes = filas(); estado.escrituras.length = 0
    for (const e of [{ accion: 'plantillas-listar' }, { accion: 'plantilla-previsualizar', origen: 'plantilla', plantillaId: TPL.nueva }, { accion: 'plantilla-aplicar', origen: 'plantilla', plantillaId: TPL.nueva }, { accion: 'plantilla-aplicar', origen: 'domingo-pasado' },
      { accion: 'plantilla-guardar', nombre: 'Intruso' }, { accion: 'plantilla-guardar', nombre: 'Montaje domingo', reemplazar: true }]) { const r = await de(e.accion, e); assert.deepEqual([r.status, r.body], [GENERICO.status, GENERICO.body], e.accion) }
    for (const e of [{ accion: 'plantillas-listar', checklistId: U(999) }, { accion: 'plantilla-guardar', checklistId: 'no-es-uuid', nombre: 'x' }, { accion: 'plantilla-aplicar', checklistId: null }]) { const r = await llamar(e); assert.deepEqual([r.status, r.body], [GENERICO.status, GENERICO.body], 'id inexistente o mal formado') }
    assert.deepEqual(filas(), antes, 'nada cambió'); assert.equal(estado.escrituras.length, 0, 'ni una escritura') })
  await prueba('un líder no puede usar con SU checklist una plantilla de otro equipo, archivada o inexistente (403 genérico, nada cambia); ni reemplazar la de otro equipo guardando con su nombre', async () => {
    escenario(); const antes = filas()
    for (const id of [TPL.otroEq, TPL.archivada, U(998)]) for (const acc of ['plantilla-previsualizar', 'plantilla-aplicar']) { const r = await de(acc, { origen: 'plantilla', plantillaId: id }); assert.deepEqual([r.status, r.body], [GENERICO.status, GENERICO.body], `${acc} ${id}`) }
    for (const id of ['no-es-uuid', null, 5]) for (const acc of ['plantilla-previsualizar', 'plantilla-aplicar']) assert.equal((await de(acc, { origen: 'plantilla', plantillaId: id })).status, 400, 'malformado: 400')
    assert.deepEqual(filas(), antes)
    const g = await de('plantilla-guardar', { nombre: 'Técnica semanal', reemplazar: true }); assert.equal(g.status, 200); assert.deepEqual(tpl(TPL.otroEq).content, [{ texto: 'SECRETO_PLANTILLA_DE_OTRO_EQUIPO' }], 'la de otro equipo no se toca: se creó una de ESTE equipo'); assert.equal(db.tool_templates.filter(t => t.name === 'Técnica semanal').length, 2) })
  await prueba('un líder NO puede reemplazar la plantilla predeterminada: recibe el motivo y una sugerencia de otro nombre, con o sin «reemplazar», y nada cambia', async () => {
    escenario(); const antes = cop(tpl(TPL.pred)); estado.escrituras.length = 0
    for (const extra of [{}, { reemplazar: true }]) { const r = await de('plantilla-guardar', { nombre: 'Domingo regular', ...extra }); assert.equal(r.status, 403); assert.equal(r.body.codigo, 'predeterminada'); assert.equal(r.body.sugerencia, 'Domingo regular (copia)') }
    assert.deepEqual(tpl(TPL.pred), antes, 'la predeterminada quedó igual'); assert.equal(escrituraEnPlantillas().length, 0, 'ni una escritura en tool_templates')
    const r = await de('plantilla-guardar', { nombre: 'Domingo regular (copia)' }); assert.equal(r.status, 200, 'con otro nombre sí'); assert.equal(db.tool_templates.find(t => t.name === 'Domingo regular (copia)').default_for_kind ?? null, null) })
  await prueba('carrera: si el admin marca la plantilla como predeterminada justo entre la lectura y la escritura del líder, el reemplazo del líder NO la pisa (la condición va en la propia escritura)', async () => {
    escenario(); const alterado = { from: t => { const q = from(t); if (t !== 'tool_templates') return q; const u = q.update.bind(q); q.update = v => { tpl(TPL.nueva).default_for_kind = 'service'; return u(v) }; return q } }
    const r = await L.ejecutarComoLider(alterado, autorizar, { accion: 'plantilla-guardar', checklistId: CL_A, nombre: 'Montaje domingo', reemplazar: true })
    assert.deepEqual([r.status, r.body.codigo], [403, 'predeterminada']); assert.equal(tpl(TPL.nueva).content.length, 5, 'el contenido no se pisó') })
  await prueba('un líder SÍ puede guardar con nombre nuevo y reemplazar una NO predeterminada de su equipo (con confirmación)', async () => {
    escenario(); assert.equal((await de('plantilla-guardar', { nombre: 'Montaje domingo', reemplazar: true })).status, 200); assert.equal((await de('plantilla-guardar', { nombre: 'Otra mía' })).status, 200) })
  await prueba('renombrar, archivar y marcar como predeterminada NO existen en esta ruta (ni para el líder ni para el admin): se rechazan sin escribir nada; el código no escribe name, archived_at ni default_for_kind de una plantilla existente', async () => {
    for (const admin of [false, true]) {
      escenario({ admin }); const antes = filas(); estado.escrituras.length = 0
      for (const acc of ['plantilla-renombrar', 'plantilla-archivar', 'plantilla-predeterminada', 'plantilla-marcar-predeterminada', 'plantilla-eliminar', 'plantilla-borrar']) { const r = await de(acc, { plantillaId: TPL.nueva, nombre: 'Nuevo nombre', default_for_kind: 'service', archived_at: 'ahora' }); assert.ok([400, 403].includes(r.status), `${acc} admin=${admin}`) }
      assert.deepEqual(filas(), antes); assert.equal(escrituraEnPlantillas().length, 0) }
    const fuente = sinCom(leer('lib/admin/checklistPlantillas.ts')); assert.ok(!/\.update\(\{[^}]*\b(name|archived_at|default_for_kind)\b/.test(fuente), 'el update solo cambia content'); assert.ok(!/\.delete\(/.test(fuente), 'no hay deletes'); assert.ok(/\.update\(\{ content: contenido \}\)/.test(fuente))
    const ins = fuente.match(/from\('tool_templates'\)\.insert\(\{[^}]*\}\)/)[0]; assert.ok(!/default_for_kind|archived_at/.test(ins), 'una plantilla nueva nunca nace predeterminada ni archivada'); assert.deepEqual([...PL.ACCIONES_PLANTILLA], ['plantillas-listar', 'plantilla-previsualizar', 'plantilla-aplicar', 'plantilla-guardar']) })
  await prueba('el admin SÍ puede todo lo de esta ruta: guardar nuevas, reemplazar una no predeterminada y reemplazar la predeterminada (cambia solo el contenido y sigue siendo predeterminada); la confirmación le avisa que es la predeterminada', async () => {
    escenario({ admin: true }); const listar = await de('plantillas-listar'); assert.equal(listar.body.esAdmin, true)
    assert.equal((await de('plantilla-guardar', { nombre: 'Del admin' })).status, 200); assert.equal((await de('plantilla-guardar', { nombre: 'Montaje domingo', reemplazar: true })).status, 200)
    const pregunta = await de('plantilla-guardar', { nombre: 'Domingo regular' }); assert.deepEqual([pregunta.status, pregunta.body.codigo, pregunta.body.predeterminada], [409, 'existe', true], 'el admin sí puede, pero se le pregunta (y la pantalla avisa que es la predeterminada)')
    const r = await de('plantilla-guardar', { nombre: 'Domingo regular', reemplazar: true }); assert.equal(r.status, 200); const t = tpl(TPL.pred); assert.deepEqual([t.name, t.default_for_kind, t.archived_at ?? null], ['Domingo regular', 'service', null]); assert.equal(C.leerPlantilla(t.content).length, 4, 'el contenido cambió')
    assert.equal(db.tool_templates.filter(x => x.default_for_kind === 'service').length, 1, 'sigue habiendo una sola predeterminada') })
  await prueba('sin rol de administrador declarado se trata como líder (lo más restringido); la ruta decide «es admin» con is_org_admin y sin sesión no hay acceso; no hay migraciones ni políticas nuevas de tool_templates', async () => {
    escenario(); quien.esAdmin = undefined; assert.equal((await de('plantilla-guardar', { nombre: 'Domingo regular', reemplazar: true })).status, 403, 'esAdmin ausente = líder')
    const ruta = sinCom(leer('app/api/admin/checklist/route.ts')); assert.ok(/rpc\('is_org_admin', \{ p_email: a\.email, p_organization_id: orgId \}\)/.test(ruta) && /esAdmin: esAdmin === true/.test(ruta), 'el rol sale del servidor, nunca del cuerpo'); assert.ok(!/body\.esAdmin|b\.esAdmin|entrada\.esAdmin|e\.esAdmin/.test(ruta + sinCom(leer('lib/admin/checklistLider.ts'))))
    const migs = fs.readdirSync(path.join(RAIZ, 'migrations')).filter(f => /tool_templates/.test(leer('migrations/' + f))); assert.deepEqual(migs.sort(), ['025-tool-templates.sql', '026-checklist-templates-backfill.sql'], 'ninguna migración nueva toca tool_templates')
    const pol = leer('migrations/025-tool-templates.sql'); assert.equal((pol.match(/create policy "[^"]*" on tool_templates/g) || []).length, 1, 'tool_templates tiene UNA sola política: la de administradores'); assert.ok(/create policy "org admins all tool_templates" on tool_templates/.test(pol)) })
  terminar()
})
