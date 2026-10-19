// Personas con Equipos desplegable (Personas · A): el agrupado por equipo, las URLs (incluido el enlace viejo ?tab=equipos), y que «Equipos» ya no sea una pestaña ni un ítem del menú. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { agruparPorEquipo, textoPersonas } = require(resolver(path.join(RAIZ, 'lib/admin/personasPorEquipo')))
const { urlConPestana, gestionDeUrl, urlConGestion, urlConEquipo } = require(resolver(path.join(RAIZ, 'lib/admin/urlPestana')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const H = 'http://x.test/admin'
const P = new URLSearchParams

correr(async () => {
  console.log('agrupado por equipo')
  const members = [{ id: 'a', nombre: 'Ana', apellido: 'Mora' }, { id: 'b', nombre: 'Beto', apellido: 'Paz' }, { id: 'c', nombre: 'Cami', apellido: 'Ruiz' }, { id: 'd', nombre: 'Dani', apellido: 'Soto' }, { id: 'e', nombre: 'Álvaro', apellido: 'Vera' }]
  const teams = [{ id: 't1', name: 'Alabanza', color: 'cobalto' }, { id: 't2', name: 'Producción', color: 'naranja' }, { id: 't3', name: 'Vacío', color: null }]
  const teamMembers = [{ member_id: 'a', team_id: 't1', is_leader: false }, { member_id: 'b', team_id: 't1', is_leader: true }, { member_id: 'b', team_id: 't2', is_leader: false }, { member_id: 'c', team_id: 't2', is_leader: false }, { member_id: 'd', team_id: 'archivado', is_leader: false }]
  const positionIndex = new Map([['a', [{ teamId: 't1', positions: ['Voz', 'Coros'] }]], ['b', [{ teamId: 't1', positions: ['Bajo'] }, { teamId: 't2', positions: ['Sonido'] }]]])
  const g = agruparPorEquipo({ members, teams, teamMembers, positionIndex })
  await prueba('un bloque por equipo activo, en su orden, con color y cantidad; «Sin equipo» al final con quienes no están en ningún equipo ACTIVO', async () => {
    assert.deepEqual(g.map(x => x.nombre), ['Alabanza', 'Producción', 'Vacío', 'Sin equipo']); assert.deepEqual(g.map(x => x.total), [2, 2, 0, 2]); assert.deepEqual(g.map(x => x.color), ['cobalto', 'naranja', null, null])
    assert.deepEqual(g[3].personas.map(p => p.id).sort(), ['d', 'e'], 'd está solo en un equipo archivado; e en ninguno'); assert.equal(g[3].teamId, null) })
  await prueba('una persona en dos equipos aparece en los dos, con SUS posiciones de cada equipo; los líderes van primero y se marcan', async () => {
    assert.deepEqual(g[0].personas.map(p => p.id), ['b', 'a']); assert.equal(g[0].personas[0].lider, true); assert.deepEqual(g[0].personas[0].posiciones, ['Bajo']); assert.deepEqual(g[0].personas[1].posiciones, ['Voz', 'Coros'])
    assert.deepEqual(g[1].personas.find(p => p.id === 'b').posiciones, ['Sonido']); assert.equal(g[1].personas.find(p => p.id === 'b').lider, false) })
  await prueba('SIN estados de cumplimiento ni de confirmación por persona: solo quién es, si lidera y sus posiciones', async () => {
    for (const grupo of g) for (const p of grupo.personas) assert.deepEqual(Object.keys(p).sort(), ['apellido', 'avatar_url', 'id', 'lider', 'nombre', 'posiciones'])
    const fuente = leer('components/personas/PorEquipo.tsx') + leer('lib/admin/personasPorEquipo.ts'); assert.ok(!/cumpl|confirm|status|estado/i.test(fuente.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'sin vocabulario de estados') })
  await prueba('la búsqueda ignora mayúsculas y acentos, deja solo los bloques con coincidencias y no cambia el total del equipo', async () => {
    const q = agruparPorEquipo({ members, teams, teamMembers, positionIndex, consulta: 'alvaro' }); assert.deepEqual(q.map(x => x.nombre), ['Sin equipo']); assert.deepEqual(q[0].personas.map(p => p.id), ['e'])
    const r = agruparPorEquipo({ members, teams, teamMembers, positionIndex, consulta: 'BETO' }); assert.deepEqual(r.map(x => x.nombre), ['Alabanza', 'Producción']); assert.equal(r[0].total, 2); assert.equal(r[0].personas.length, 1)
    assert.deepEqual(agruparPorEquipo({ members, teams, teamMembers, positionIndex, consulta: 'zzz' }), []) })
  await prueba('sin personas ni equipos no hay bloques; textoPersonas concuerda en singular y plural', async () => {
    assert.deepEqual(agruparPorEquipo({ members: [], teams: [], teamMembers: [] }), []); assert.equal(textoPersonas(1), '1 persona'); assert.equal(textoPersonas(0), '0 personas'); assert.equal(textoPersonas(12), '12 personas') })

  console.log('URLs')
  await prueba('compatibilidad: el enlace viejo ?tab=equipos pasa a ?tab=personas&gestion=… (con team → equipo; sin team → equipos) y se entiende al cargar', async () => {
    assert.equal(urlConPestana(H + '?tab=equipos', 'personas'), '/admin?tab=personas&gestion=equipos'); assert.equal(urlConPestana(H + '?tab=equipos&team=t1&filter=all', 'personas'), '/admin?tab=personas&team=t1&filter=all&gestion=equipo')
    assert.deepEqual(gestionDeUrl(new URLSearchParams('tab=equipos')), { modo: 'equipos' }); assert.deepEqual(gestionDeUrl(new URLSearchParams('tab=equipos&team=t1')), { modo: 'equipo', teamId: 't1' })
    assert.deepEqual(gestionDeUrl(new URLSearchParams('tab=personas&gestion=equipo&team=t9')), { modo: 'equipo', teamId: 't9' }); assert.deepEqual(gestionDeUrl(new URLSearchParams('tab=personas&gestion=equipos')), { modo: 'equipos' }); assert.equal(gestionDeUrl(new URLSearchParams('tab=personas')), null) })
  await prueba('urlConGestion entra y sale de la gestión; salir limpia team y filter; urlConEquipo escribe y quita team y filter', async () => {
    assert.equal(urlConGestion(H + '?tab=personas', { modo: 'equipo', teamId: 't1' }), '/admin?tab=personas&gestion=equipo&team=t1&filter=all'); assert.equal(urlConGestion(H + '?tab=personas', { modo: 'equipos' }), '/admin?tab=personas&gestion=equipos')
    assert.equal(urlConGestion(H + '?tab=personas&gestion=equipo&team=t1&filter=all', null), '/admin?tab=personas'); assert.equal(urlConGestion(H + '?tab=personas', null), null)
    assert.equal(urlConEquipo(H + '?tab=personas&gestion=equipos', 't2', 'leaders'), '/admin?tab=personas&gestion=equipos&team=t2&filter=leaders'); assert.equal(urlConEquipo(H + '?tab=personas&gestion=equipos&team=t2&filter=leaders', null, 'all'), '/admin?tab=personas&gestion=equipos'); assert.equal(urlConEquipo(H + '?x=1', null, 'all'), null) })
  await prueba('al salir de Personas se van gestion, team, filter y person', async () => {
    assert.equal(urlConPestana(H + '?tab=personas&gestion=equipo&team=t1&filter=all&person=a', 'canciones'), '/admin?tab=canciones') })

  console.log('«Equipos» ya no es pestaña ni ítem de menú')
  await prueba('PersonasPanel no tiene la pestaña Equipos; TeamsAdminPanel ya no usa router.replace; el menú de teléfono no tiene Equipos', async () => {
    const panel = leer('components/PersonasPanel.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); assert.ok(!/role="tab"[^>]*>Equipos</.test(panel)); assert.ok(/Gestionar equipos/.test(panel) && /Lista/.test(panel) && /Por equipo/.test(panel))
    const t = leer('components/TeamsAdminPanel.tsx').replace(/\/\/.*$/gm, ''); assert.ok(!/router\./.test(t) && /urlConEquipo/.test(t)); assert.ok(!/Equipos/.test(leer('lib/admin/menuMovil.ts').match(/ITEMS_MENU[\s\S]*?\]\n/)[0])) })
  await prueba('la vista por defecto es «Por equipo» en teléfono y «Lista» en escritorio, y la elección de la persona manda', async () => {
    const panel = leer('components/PersonasPanel.tsx'); assert.ok(/vistaElegida \?\? \(telefono \? 'equipo' : 'lista'\)/.test(panel)) })
  terminar()
})
