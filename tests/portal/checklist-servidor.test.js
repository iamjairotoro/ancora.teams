// Checklist por posición, lado SERVIDOR y portal del músico: qué devuelve y qué deja marcar la API (probado contra la «base» simulada del banco: lecturas y escrituras reales de la lógica), pestañas por herramienta y refresco sin «en vivo». Correr: `node tests/portal/checklist-servidor.test.js`
const { assert, db, ID, S, estado, mundo, llamar, prueba, terminar, correr, from, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const SV = require(resolver(path.join(RAIZ, 'lib/portal/checklistServidor'))), PN = require(resolver(path.join(RAIZ, 'lib/portal/panelesServicio')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const U = i => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`
const admin = { from }
const { ME, O1, TA, TT, TB, P1, P2 } = ID, G33 = U(33), TOOL_A = U(210), TOOL_T = U(211), TOOL_B = U(212), CL_A = U(220), CL_T = U(221)

function escenario() {
  mundo()
  db.team_tools = [{ id: TOOL_A, team_id: TA, tool_type: 'checklist', label: 'Montaje', sort_order: 1 }, { id: TOOL_T, team_id: TT, tool_type: 'checklist', label: 'Técnica', sort_order: 1 }, { id: TOOL_B, team_id: TB, tool_type: 'setlist', label: null, sort_order: 1 }]
  db.service_checklists = [{ id: CL_A, service_id: S(1), team_id: TA, team_tool_id: TOOL_A }, { id: CL_T, service_id: S(1), team_id: TT, team_tool_id: TOOL_T }]
  db.service_checklist_groups = [{ id: U(230), service_checklist_id: CL_A, team_position_id: P1, titulo: 'Antes del servicio', sort_order: 1 }, { id: U(231), service_checklist_id: CL_A, team_position_id: G33, titulo: 'Antes del servicio', sort_order: 1 }, { id: U(232), service_checklist_id: CL_A, team_position_id: null, titulo: 'Varios', sort_order: 1 },
    { id: U(233), service_checklist_id: CL_T, team_position_id: P2, titulo: 'Antes del servicio', sort_order: 1 }]
  const it = (n, cl, grupo, pos, texto, extra = {}) => ({ id: U(300 + n), service_checklist_id: cl, group_id: grupo, team_position_id: pos, texto, checked: false, checked_by_member_id: null, checked_at: null, sort_order: n, ...extra })
  db.service_checklist_items = [it(1, CL_A, U(230), P1, 'Cables de la voz'), it(2, CL_A, U(230), P1, 'Probar micrófono', { checked: true, checked_by_member_id: O1, checked_at: '2099-01-04T13:30:00Z' }), it(3, CL_A, U(231), G33, 'SECRETO_OTRA_POSICION afinar guitarra'), it(4, CL_A, U(232), null, 'SECRETO_GENERAL cerrar la bodega'),
    it(5, CL_T, U(233), P2, 'Encender el teclado')]
  db.members.find(m => m.id === O1).nombre = 'Beto'
}
const textos = b => JSON.stringify(b)
const filas = id => db.service_checklist_items.find(i => i.id === id)

correr(async () => {
  await prueba('lectura: la persona ve SOLO los ítems de su posición; la API no manda ítems de otra posición, «General» ni ids de posiciones; quien marcó sale por nombre de pila', async () => {
    escenario(); const r = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.equal(r.status, 200)
    assert.deepEqual(r.body.posiciones.map(p => p.nombre), ['Voz 2']); assert.equal(r.body.total, 2); assert.equal(r.body.listos, 1)
    const t = textos(r.body); assert.ok(!t.includes('SECRETO_') && !t.includes(P1) && !t.includes(G33) && !t.includes(O1), 'ni otras posiciones, ni «General», ni ids de posición o de personas')
    const marcado = r.body.posiciones[0].grupos[0].items.find(i => i.checked); assert.deepEqual({ yo: marcado.marca.yo, nombre: marcado.marca.nombre, hora: marcado.marca.hora }, { yo: false, nombre: 'Beto', hora: '2099-01-04T13:30:00Z' }) })
  await prueba('sin convocatoria confirmada de ESE equipo, o con un equipo que no es suyo, la API responde igual que si no existiera (403 genérico); ids mal formados, 400', async () => {
    escenario(); const generico = (await SV.leerChecklistMusico(admin, ME, S(1), U(999))).body
    for (const tool of [TOOL_T, TOOL_B]) { const r = await SV.leerChecklistMusico(admin, ME, S(1), tool); assert.equal(r.status, 403); assert.deepEqual(r.body, generico, 'misma respuesta que un id inexistente') }     // TT: declinada por conflicto · TB: es un setlist, no un checklist
    db.invitations.find(i => i.service_id === S(1) && i.member_id === ME && i.team_id === TA).status = 'pendiente'; assert.equal((await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A)).status, 403, 'convocada sin confirmar: nada')
    assert.equal((await SV.leerChecklistMusico(admin, O1, S(2), TOOL_A)).status, 403, 'otro servicio donde no es suyo'); assert.equal((await SV.leerChecklistMusico(admin, ME, 'x', TOOL_A)).status, 400); assert.equal((await SV.leerChecklistMusico(admin, ME, S(1), undefined)).status, 400) })
  await prueba('«Cambiar» de equipo (038, SIN invitación nueva): antes ve el checklist de Alabanza; después (la anterior declinada por conflicto y la que ya existía confirmada) deja de ver el de Alabanza y ve el de Técnica', async () => {
    escenario(); const inv = (team) => db.invitations.find(i => i.service_id === S(1) && i.member_id === ME && i.team_id === team); const antes = db.invitations.length
    assert.equal((await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A)).status, 200); assert.equal((await SV.leerChecklistMusico(admin, ME, S(1), TOOL_T)).status, 403)
    Object.assign(inv(TA), { status: 'declinado', declined_reason: 'conflict', superseded_by: inv(TT).id, confirmed_position_ids: null }); Object.assign(inv(TT), { status: 'confirmado', declined_reason: null, superseded_by: null, confirmed_position_ids: [P2] }); assert.equal(db.invitations.length, antes, 'no se creó ninguna invitación')
    const a = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.equal(a.status, 403, 'deja de ver el checklist del equipo que deja'); assert.ok(!textos(a.body).includes('Cables'))
    const t = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_T); assert.equal(t.status, 200); assert.deepEqual(t.body.posiciones.map(p => p.nombre), ['Teclado']); assert.equal(t.body.posiciones[0].grupos[0].items[0].texto, 'Encender el teclado')
    assert.equal((await SV.marcarItemMusico(admin, ME, U(301), true)).status, 403, 'ya no puede marcar en Alabanza'); assert.equal(filas(U(301)).checked, false) })
  await prueba('dos posiciones en el mismo equipo: ve ambos grupos con los totales sumados; con la foto de lo confirmado solo ve las confirmadas', async () => {
    escenario(); db.banda_assignments.push({ id: 'bx', service_id: S(1), member_id: ME, posicion: null, team_position_id: G33, slot_index: 1 })
    const r = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.deepEqual(r.body.posiciones.map(p => p.nombre).sort(), ['Guitarra acústica', 'Voz 2']); assert.equal(r.body.total, 3); assert.ok(textos(r.body).includes('afinar guitarra')); assert.ok(!textos(r.body).includes('SECRETO_GENERAL'))
    db.invitations.find(i => i.service_id === S(1) && i.member_id === ME && i.team_id === TA).confirmed_position_ids = [P1]
    const solo = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.deepEqual(solo.body.posiciones.map(p => p.nombre), ['Voz 2'], 'confirmó solo una: la otra queda pendiente y no la ve') })
  await prueba('marcar: solo ítems de SU posición; guarda quién y a qué hora y responde con el estado fresco; desmarcar borra la marca; lo de otra posición, «General» o inexistente → 403 sin tocar nada', async () => {
    escenario(); const m = await SV.marcarItemMusico(admin, ME, U(301), true); assert.equal(m.status, 200)
    assert.equal(filas(U(301)).checked, true); assert.equal(filas(U(301)).checked_by_member_id, ME); assert.ok(!Number.isNaN(Date.parse(filas(U(301)).checked_at)), 'quién y hora'); assert.equal(m.body.listos, 2, 'la respuesta trae el estado fresco')
    const suyo = m.body.posiciones[0].grupos[0].items.find(i => i.id === U(301)); assert.equal(suyo.marca.yo, true)
    const d = await SV.marcarItemMusico(admin, ME, U(301), false); assert.equal(d.status, 200); assert.deepEqual([filas(U(301)).checked, filas(U(301)).checked_by_member_id, filas(U(301)).checked_at], [false, null, null])
    const antes = JSON.stringify(db.service_checklist_items)
    for (const id of [U(303), U(304), U(305), U(399)]) assert.equal((await SV.marcarItemMusico(admin, ME, id, true)).status, 403, 'ítem ' + id)      // otra posición · «General» · otro equipo · no existe
    assert.equal(JSON.stringify(db.service_checklist_items), antes, 'no se tocó nada'); assert.equal((await SV.marcarItemMusico(admin, ME, 'x', true)).status, 400); assert.equal((await SV.marcarItemMusico(admin, ME, U(301), 'si')).status, 400) })
  await prueba('si cambia la posición después de confirmar: ya no puede marcar la que dejó, lo marcado queda como estaba y la nueva no se ve hasta confirmar', async () => {
    escenario(); await SV.marcarItemMusico(admin, ME, U(301), true); const guardado = { ...filas(U(301)) }
    const fila = db.banda_assignments.find(b => b.service_id === S(1) && b.member_id === ME && b.team_position_id === P1); fila.team_position_id = G33            // la nómina la pasa a Guitarra; su foto de lo confirmado sigue diciendo Voz 2
    db.invitations.find(i => i.service_id === S(1) && i.member_id === ME && i.team_id === TA).confirmed_position_ids = [P1]
    const r = await SV.leerChecklistMusico(admin, ME, S(1), TOOL_A); assert.deepEqual(r.body.posiciones, [], 'no ve ítems de ninguna: la que confirmó ya no es suya y la nueva no la ha confirmado'); assert.equal((await SV.marcarItemMusico(admin, ME, U(301), false)).status, 403)
    assert.deepEqual(filas(U(301)), guardado, 'lo ya marcado se conserva con quién y cuándo') })
  await prueba('la persona sale de la sesión: las rutas usan requirePortalIdentity, no leen ninguna identidad del cuerpo ni de la URL, usan la llave de servicio (nunca la anon) y no abren tablas', async () => {
    for (const f of ['app/api/portal/checklist/route.ts', 'app/api/portal/checklist/marcar/route.ts']) { const c = sinCom(leer(f)); assert.ok(/requirePortalIdentity\(req, \{ invitation: true \}\)/.test(c) && /auth\.identity\.memberId/.test(c) && /createAdminSupabase\(\)/.test(c), f); assert.ok(!/member(Id|_id)?\s*[:=]\s*(b|p|body)\b|searchParams\.get\('(member|persona)/i.test(c), f + ' no toma la persona del cliente'); assert.ok(!/ANON_KEY|supabase\/server|createBrowserClient/.test(c)) }
    const sv = sinCom(leer('lib/portal/checklistServidor.ts')); assert.ok(!/ANON_KEY|createClient|createBrowserClient/.test(sv)); assert.ok(/mapa|from\('service_checklist_items'\)/.test(sv))
    const mig = sinCom(leer('migrations/051-checklist-por-posicion.sql')); assert.ok(!/create policy|grant .* to (anon|authenticated)/i.test(mig), 'la migración no abre nada') })
  await prueba('pestañas por herramienta: sin checklist = lo de siempre; Producción abre en su checklist, Alabanza en Orden; con ambas, la primera del equipo; panel viejo/ajeno cae en la primera', async () => {
    const base = ['Orden', 'Equipo', 'Mi cronograma']; assert.deepEqual(PN.panelesDelServicio(undefined).map(o => o.texto), base); assert.deepEqual(PN.panelesDelServicio([]).map(o => o.texto), base); assert.equal(PN.panelInicial([]), 'orden')
    const alabanza = [{ id: 'h1', tipo: 'setlist', nombre: null }]; assert.deepEqual(PN.panelesDelServicio(alabanza).map(o => o.texto), base, 'sin checklist nada cambia'); assert.equal(PN.panelInicial(alabanza), 'orden')
    const prod = [{ id: 'h2', tipo: 'checklist', nombre: 'Montaje' }]; assert.deepEqual(PN.panelesDelServicio(prod).map(o => o.texto), ['Montaje', 'Equipo', 'Mi cronograma']); assert.equal(PN.panelInicial(prod), 'checklist:h2'); assert.equal(PN.idDeChecklist('checklist:h2'), 'h2'); assert.equal(PN.idDeChecklist('orden'), null)
    assert.deepEqual(PN.panelesDelServicio([{ id: 'h3', tipo: 'checklist', nombre: null }]).map(o => o.texto), ['Checklist', 'Equipo', 'Mi cronograma'], 'sin nombre: «Checklist»')
    const ambasOrdenPrimero = [{ id: 'a', tipo: 'setlist', nombre: null }, { id: 'b', tipo: 'checklist', nombre: 'Montaje' }], ambasChecklistPrimero = [...ambasOrdenPrimero].reverse()
    assert.equal(PN.panelInicial(ambasOrdenPrimero), 'orden'); assert.equal(PN.panelInicial(ambasChecklistPrimero), 'checklist:b'); assert.deepEqual(PN.panelesDelServicio(ambasChecklistPrimero).map(o => o.texto), ['Montaje', 'Orden', 'Equipo', 'Mi cronograma'])
    assert.equal(PN.panelEfectivo('orden', PN.panelesDelServicio(prod)), 'checklist:h2', 'si «Orden» ya no existe, la primera'); assert.equal(PN.panelEfectivo('equipo', PN.panelesDelServicio(prod)), 'equipo') })
  await prueba('el portal manda `herramientas` solo en la tarjeta CONFIRMADA de un equipo que las tiene, en su orden', async () => {
    escenario(); db.team_tools.push({ id: U(213), team_id: TA, tool_type: 'setlist', label: null, sort_order: 2 }); estado.acceso = true
    const sv = (await llamar('me')).body.services; const tarjeta = (svc, team) => sv.find(x => x.service.id === svc && x.team && x.team.id === team)
    assert.deepEqual(tarjeta(S(1), TA).herramientas, [{ id: TOOL_A, tipo: 'checklist', nombre: 'Montaje' }, { id: U(213), tipo: 'setlist', nombre: null }])
    assert.equal(tarjeta(S(1), TB).herramientas, undefined, 'convocatoria pendiente: nada'); assert.equal(tarjeta(S(1), TT).herramientas, undefined, 'declinada por conflicto: nada'); assert.equal(sv.filter(x => x.invitation === null).every(x => x.herramientas === undefined), true) })
  await prueba('refresco SIN «en vivo»: se pide al abrir y al volver a la app (visibilitychange), hay botón «Actualizar», la respuesta de marcar trae el estado fresco; no hay sondeo ni suscripciones; el texto no promete tiempo real', async () => {
    const c = sinCom(leer('app/portal/_components/servicio/ChecklistServicio.tsx'))
    assert.ok(/useEffect\(\(\) => \{\s*void cargar\(\)/.test(c) && /addEventListener\('visibilitychange', alVolver\)/.test(c) && /removeEventListener\('visibilitychange', alVolver\)/.test(c) && /document\.visibilityState === 'visible'/.test(c)); assert.ok(!/setInterval|setTimeout|EventSource|WebSocket|\.channel\(|postgres_changes/.test(c), 'sin sondeo ni tiempo real')
    assert.ok(/onClick=\{\(\) => void cargar\(\)\}[^>]*>\{actualizando \? T\.actualizando : T\.actualizar\}/.test(c)); assert.ok(/version\.current/.test(c), 'la respuesta más nueva gana'); assert.ok(/portalFetch\(token, '\/api\/portal\/checklist\/marcar'/.test(c) && /if \(mia === version\.current && nuevo\.posiciones\) setDatos\(nuevo\)/.test(c))
    assert.ok(!/al instante|en vivo|tiempo real/i.test(c + leer('lib/textos/checklist.ts').replace(/\/\/[^\n]*/g, ''))); assert.ok(/T\.actualizaNota/.test(c)) })
  await prueba('el detalle del servicio usa las pestañas del equipo: Servicio.tsx arma las opciones con panelesDelServicio, null = la primera, y dibuja ChecklistServicio solo con la convocatoria confirmada', async () => {
    const s = sinCom(leer('app/portal/_components/servicio/Servicio.tsx')), p = sinCom(leer('app/portal/_components/PortalApp.tsx'))
    assert.ok(/const opciones = panelesDelServicio\(entrada\.herramientas\)/.test(s) && /panel === null \? opciones\[0\]\.valor : panelEfectivo\(panel, opciones\)/.test(s) && /<Segmentado opciones=\{opciones\} valor=\{panelActual\}/.test(s))
    assert.ok(/idChecklist && \(puedeVer \? <ChecklistServicio token=\{token\} servicioId=\{svc\.id\} herramientaId=\{idChecklist\}/.test(s)); assert.ok(/useState<PanelServicio \| null>\(null\)/.test(p) && /setPanelServicio\(null\)/.test(p) && /<Servicio token=\{token\}/.test(p)) })
  terminar()
})
