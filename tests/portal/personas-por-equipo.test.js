// Personas con Equipos desplegable (Personas · A): el agrupado por equipo, las URLs (incluido el enlace viejo ?tab=equipos), y que «Equipos» ya no sea una pestaña ni un ítem del menú. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
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
    const panel = leer('components/PersonasPanel.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); assert.ok(!/role="tab"[^>]*>Equipos</.test(panel)); assert.ok(/Gestionar equipos/.test(panel) && /TEXTOS_PERSONAS\.vistaListaEscritorio/.test(panel) && /TEXTOS_PERSONAS\.vistaPorEquipoEscritorio/.test(panel))
    const t = leer('components/TeamsAdminPanel.tsx').replace(/\/\/.*$/gm, ''); assert.ok(!/router\./.test(t) && /urlConEquipo/.test(t)); assert.ok(!/Equipos/.test(leer('lib/admin/menuMovil.ts').match(/ITEMS_MENU[\s\S]*?\]\n/)[0])) })
  await prueba('al entrar a Personas abre SIEMPRE la vista «Personas» (la lista), también en teléfono; solo ?vista=equipos abre «Equipos»; la elección de la persona manda mientras está ahí y no se guarda en ninguna parte', async () => {
    const panel = leer('components/PersonasPanel.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
    assert.ok(/const vista = vistaElegida \?\? vistaDeLaUrl/.test(panel)); assert.ok(!/telefono \? 'equipo'/.test(panel), 'ya no hay una vista por defecto distinta en teléfono'); assert.ok(!/localStorage|sessionStorage|indexedDB/.test(panel), 'no se recuerda la vista')
    assert.ok(/vistaDePersonasDeUrl\(params\)/.test(panel))
    const { vistaDePersonasDeUrl, urlConPestana } = real('lib/admin/urlPestana'), P = q => new URLSearchParams(q)
    assert.equal(vistaDePersonasDeUrl(P('')), 'lista'); assert.equal(vistaDePersonasDeUrl(P('tab=personas')), 'lista'); assert.equal(vistaDePersonasDeUrl(P('tab=personas&vista=equipos')), 'equipo'); assert.equal(vistaDePersonasDeUrl(P('vista=calendario')), 'lista'); assert.equal(vistaDePersonasDeUrl(P('vista=Equipos')), 'lista', 'solo el valor exacto')
    // el parámetro no se queda: al salir de Personas se va; entre Personas y Admins se conserva
    assert.equal(urlConPestana('http://x.test/admin?tab=personas&vista=equipos', 'canciones'), '/admin?tab=canciones'); assert.equal(urlConPestana('http://x.test/admin?tab=personas&vista=equipos', 'admins'), '/admin?tab=admins&vista=equipos'); assert.equal(urlConPestana('http://x.test/admin?tab=personas&vista=equipos', 'setlist'), '/admin?tab=setlist') })
  await prueba('«Equipos» en teléfono abre con TODOS los equipos cerrados: ya no se despliega el primero solo; solo se abre el que la persona toca o el que la URL pide (?team=<id>); nada se recuerda', async () => {
    const f = leer('components/personas/PorEquipo.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
    assert.ok(/useMediaQuery\('\(max-width: 768px\)'\)/.test(f)); assert.ok(/if \(telefono !== false\) return\s*\n\s*const primero = grupos\.find/.test(f), 'el primer equipo con gente solo se abre solo si ya se midió que NO es teléfono (escritorio sin cambios)')
    assert.ok(/useState<Set<string>>\(\(\) => new Set\(abrirAlEntrar \? \[abrirAlEntrar\] : \[\]\)\)/.test(f)); assert.ok(/if \(abrirAlEntrar\) \{ if \(grupos\.some\(g => g\.clave === abrirAlEntrar\)\) \{ setAbiertos\(new Set\(\[abrirAlEntrar\]\)\)/.test(f), 'con un equipo pedido, solo ese')
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(f), 'no se recuerda qué equipo estaba abierto')
    const { equipoAbiertoDeUrl, vistaDePersonasDeUrl, urlConPestana } = real('lib/admin/urlPestana'), P = q => new URLSearchParams(q)
    assert.equal(equipoAbiertoDeUrl(P('')), null); assert.equal(equipoAbiertoDeUrl(P('tab=personas&vista=equipos')), null); assert.equal(equipoAbiertoDeUrl(P('tab=personas&vista=equipos&team=t2')), 't2'); assert.equal(equipoAbiertoDeUrl(P('team=3fa8-12ab')), '3fa8-12ab')
    assert.equal(equipoAbiertoDeUrl(P('gestion=equipo&team=t2')), null, 'con gestion el team es el de «Gestionar equipo»'); assert.equal(equipoAbiertoDeUrl(P('team=a%20b')), null); assert.equal(equipoAbiertoDeUrl(P('team=' + 'x'.repeat(65))), null)
    assert.equal(vistaDePersonasDeUrl(P('tab=personas&team=t2')), 'equipo', 'un equipo explícito abre «Equipos»'); assert.equal(vistaDePersonasDeUrl(P('tab=personas&gestion=equipo&team=t2')), 'lista')
    assert.equal(urlConPestana('http://x.test/admin?tab=personas&vista=equipos&team=t2', 'canciones'), '/admin?tab=canciones', 'al salir de Personas se van vista y team')
    const panel = leer('components/PersonasPanel.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'); assert.ok(/equipoAbiertoDeUrl\(params\)/.test(panel) && /vistaDePersonasDeUrl\(params\)/.test(panel) && /useSearchParams\(\)/.test(panel), 'la vista y el equipo se leen de useSearchParams: con router.push (tarjeta del Home) window.location todavía trae la URL anterior'); assert.ok(!/window\.location\.search/.test(panel)); assert.ok(/equipoAbierto=\{equipoDeLaUrl\}/.test(panel))
    assert.ok(/abrirAlEntrar=\{equipoAbierto\}/.test(leer('components/TeamPanel.tsx'))) })
  await prueba('el selector se llama «Personas» y «Equipos» en teléfono; el ESCRITORIO conserva «Lista» y «Por equipo» (no cambia sin OK); los textos salen de lib/textos/personas.ts', async () => {
    const T = real('lib/textos/personas').TEXTOS_PERSONAS; assert.deepEqual([T.vistaPersonas, T.vistaEquipos, T.vistaListaEscritorio, T.vistaPorEquipoEscritorio, T.comoVer], ['Personas', 'Equipos', 'Lista', 'Por equipo', 'Cómo ver a las personas'])
    const panel = leer('components/PersonasPanel.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
    assert.ok(/telefono === true \? \[TEXTOS_PERSONAS\.vistaPersonas, TEXTOS_PERSONAS\.vistaEquipos\] : \[TEXTOS_PERSONAS\.vistaListaEscritorio, TEXTOS_PERSONAS\.vistaPorEquipoEscritorio\]/.test(panel))
    assert.ok(!/texto: 'Lista'|texto: 'Por equipo'|etiqueta="Cómo ver/.test(panel), 'ningún texto del selector escrito a mano') })
  await prueba('teléfono: Personas no tiene chips de filtro (queda buscador, contador y lista) y «Gestionar equipos» solo está en la vista Equipos; el escritorio y la tablet conservan chips y botón', async () => {
    const quitar = f => leer(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'), lista = quitar('components/PersonasList.tsx'), panel = quitar('components/PersonasPanel.tsx')
    assert.ok(/const telefono = useTelefonoYa\(\)/.test(lista)); assert.ok(/\{!telefono && \(\s*<div className=\{styles\.chips\}/.test(lista), 'los chips solo se dibujan fuera del teléfono'); assert.ok(/<input ref=\{searchRef\}/.test(lista) && /className=\{styles\.count\}/.test(lista) && /role="list"/.test(lista), 'quedan buscador, contador y lista')
    assert.ok(/\(!telefonoYa \|\| vista === 'equipo'\) && \(\s*<button type="button" className=\{panel\.gestionar\}/.test(panel), '«Gestionar equipos» solo en Equipos en teléfono, siempre en escritorio')
    const T = real('lib/textos/personas').TEXTOS_PERSONAS; assert.deepEqual([T.sinResultadosTitulo, T.sinResultadosAyuda], ['No hay nadie con ese nombre', 'Prueba con otra búsqueda.']); assert.ok(!/filtro/i.test(T.sinResultadosTitulo + T.sinResultadosAyuda), 'sin hablar de un filtro que ya no existe')
    assert.ok(/No hay nadie con ese filtro/.test(lista), 'el texto del escritorio no cambia') })
  await prueba('seguir la URL: la pestaña pedida solo cuenta si difiere de la actual; «Ir a Personas» y «Editar las posiciones» piden Personas (y su gestión) desde Servicio', async () => {
    const { pestanaPedida } = real('lib/admin/urlPestana'), { pestanaInicial } = real('lib/admin/pestanas'), conv = t => pestanaInicial(t)
    assert.equal(pestanaPedida('personas', 'setlist', conv), 'personas'); assert.equal(pestanaPedida('personas', 'personas', conv), null, 'igual a la actual: es el eco de nuestra escritura'); assert.equal(pestanaPedida(null, 'setlist', conv), null); assert.equal(pestanaPedida('', 'setlist', conv), null)
    assert.equal(pestanaPedida('equipos', 'setlist', conv), 'personas', 'el enlace viejo ?tab=equipos'); assert.equal(pestanaPedida('equipos', 'personas', conv), null); assert.equal(pestanaPedida('canciones', 'personas', conv), 'canciones'); assert.equal(pestanaPedida('cosa-rara', pestanaInicial('cosa-rara'), conv), null, 'un valor raro cae en la pestaña por defecto, igual que al entrar')
    const { gestionPedida } = real('lib/admin/urlPestana'), G = q => new URLSearchParams(q), eq = t => ({ modo: 'equipo', teamId: t })
    assert.deepEqual(gestionPedida(G('tab=personas&gestion=equipo&team=t1'), null), eq('t1'), '«Editar las posiciones del equipo»'); assert.deepEqual(gestionPedida(G('tab=personas&gestion=equipo'), null), { modo: 'equipos' }, '«Ir a Personas»'); assert.equal(gestionPedida(G('tab=personas'), null), undefined)
    assert.equal(gestionPedida(G('tab=personas'), { modo: 'equipos' }), null, 'una URL sin gestión vuelve a Personas'); assert.deepEqual(gestionPedida(G('gestion=equipo&team=t2'), eq('t1')), eq('t2'), 'otro equipo pedido') })
  await prueba('seguir la URL no pelea con nuestras escrituras: el eco de irAGestion, de urlConEquipo y el «volver a la lista» interno no cambian el estado', async () => {
    const { gestionPedida, urlConGestion, urlConEquipo, pedidoDeVista } = real('lib/admin/urlPestana'), eco = (url, s) => gestionPedida(new URL('http://x.test' + url).searchParams, s), eq = t => ({ modo: 'equipo', teamId: t })
    for (const g of [null, { modo: 'equipos' }, eq('t1')]) { const u = urlConGestion('http://x.test/admin?tab=personas', g) || '/admin?tab=personas'; assert.equal(eco(u, g), undefined, 'eco de irAGestion ' + JSON.stringify(g)) }
    const u0 = urlConGestion('http://x.test/admin?tab=personas', { modo: 'equipos' }), u1 = urlConEquipo('http://x.test' + u0, 't9', 'all'); assert.equal(eco(u1, { modo: 'equipos' }), undefined, 'elegir un equipo dentro de «Gestionar equipos» (gestion=equipos&team=t9)')
    const u2 = urlConGestion('http://x.test/admin?tab=personas', eq('t1')), u3 = urlConEquipo('http://x.test' + u2, null, 'all'); assert.equal(eco(u2, eq('t1')), undefined); assert.equal(eco(u3, eq('t1')), undefined, 'volver a la lista desde el detalle de un equipo: no se remonta ni se baja de equipo a lista')
    const P = q => new URLSearchParams(q), ninguno = { vista: null, equipo: null }
    assert.deepEqual(pedidoDeVista(P('vista=equipos'), ninguno), { vista: 'equipo', equipo: null }); assert.deepEqual(pedidoDeVista(P('vista=equipos&team=t2'), ninguno), { vista: 'equipo', equipo: 't2' }); assert.equal(pedidoDeVista(P(''), ninguno), null)
    assert.equal(pedidoDeVista(P('vista=equipos'), { vista: 'equipos', equipo: null }), null, 'un ?vista=equipos que ya estaba no resetea lo que la persona eligió'); assert.equal(pedidoDeVista(P('vista=equipos&gestion=equipo&team=t2'), { vista: 'equipos', equipo: 't2' }), null, 'entrar a la gestión no es un pedido')
    assert.equal(pedidoDeVista(P('vista=equipos'), { vista: 'equipos', equipo: null }), null, 'volver de la gestión (se fueron gestion y team) no resetea la vista'); assert.deepEqual(pedidoDeVista(P('vista=equipos&team=t3'), { vista: 'equipos', equipo: 't2' }), { vista: 'equipo', equipo: 't3' }, 'otro equipo pedido') })
  await prueba('el cableado: /admin sigue a la pestaña pedida y monta Personas con la gestión de la URL de ESE momento; PersonasPanel sigue gestión, vista y equipo; «Equipos» se vuelve a montar al pedir otro equipo', async () => {
    const q = f => leer(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'), pag = q('app/admin/page.tsx'), panel = q('components/PersonasPanel.tsx'), tp = q('components/TeamPanel.tsx')
    assert.ok(/pestanaPedida\(urlTab, tab, t => pestanaInicial\(t\)\)[\s\S]{0,80}setTab\(pedida as Tab\)[\s\S]{0,160}\[urlTab\]/.test(pag), 'la pestaña sigue a la URL y solo cuando urlTab cambia (no en cada cambio de tab)')
    assert.ok(/const gestionInicial = urlTab === 'equipos' \|\| urlTab === 'personas' \? gestionDeUrl\(searchParams\) : null/.test(pag) && !/const \[gestionInicial\]/.test(pag), 'la gestión inicial se calcula con la URL de ese momento')
    assert.ok(/gestionPedida\(params, gestionRef\.current\)/.test(panel) && /pedidoDeVista\(params, previoVista\.current\)/.test(panel) && /\[firmaUrl\]/.test(panel), 'PersonasPanel sigue gestion, team y vista'); assert.ok(/<PorEquipo key=\{equipoAbierto \?\? ''\}/.test(tp)) })
  terminar()
})
