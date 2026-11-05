// «Personas» del LÍDER (etapa 3): GET /api/lider/personas y GET /api/lider/personas/buscar, con requireLiderDeLaSesion y las funciones de rol REALES sobre una base simulada con la semántica real. Lo que se comprueba:
//  · quién entra: líder y administrador sí; sin rol 403; sin sesión 401; no-store siempre; solo lectura;
//  · el recorte: de SU equipo, teléfono y correo; de los demás equipos solo nombre y posiciones, sin ids de personas ni de posiciones; NUNCA la foto. Las listas de campos de ESTE archivo son propias (si alguien agrega un
//    campo sin actualizarlas, la prueba falla) y los valores «canario» sembrados (teléfono, correo, nacimiento y foto de quienes no son de su equipo, y la foto de todos) no pueden salir;
//  · la búsqueda: solo id, nombre y apellido; máximo 30; al menos 2 letras; sin quienes ya están en el equipo ni de otra organización; los comodines de LIKE se escapan; equipo ajeno, inexistente o de otra organización,
//    el mismo 403 genérico. Correr: `npm run test:auth`.
const { assert, db, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder'
stubs['next/server'].NextResponse.json = (b, init) => ({ status: (init && init.status) || 200, body: JSON.parse(JSON.stringify(b)), headers: (init && init.headers) || {} })
let sesion = { email: null }
const lc = s => String(s || '').toLowerCase()
const emailDe = id => lc((db.members.find(m => m.id === id) || {}).email)
const RPC = {
  is_org_admin: a => db.organization_members.some(o => emailDe(o.person_id) === lc(a.p_email) && o.organization_id === a.p_organization_id && ['owner', 'admin'].includes(o.role)),
  is_any_team_leader: a => db.team_members.some(t => emailDe(t.member_id) === lc(a.p_email) && t.organization_id === a.p_organization_id && t.is_leader === true),
}
stubs['@/lib/supabase-server'] = { createServerSupabase: () => ({ auth: { getUser: async () => ({ data: { user: sesion.email ? { email: sesion.email } : null } }) }, rpc: async (fn, a) => { assert.ok(RPC[fn], `función desconocida ${fn}`); return { data: RPC[fn](a) } } }) }
const real = n => require(resolver(path.join(RAIZ, n)))
const consultas = []      // cada consulta a members del servidor: columnas pedidas e ids
{ const admin = stubs['@/lib/supabase/admin'], de = admin.createAdminSupabase; admin.createAdminSupabase = () => { const cli = de(); const f0 = cli.from; return { ...cli, from: t => { const api = f0(t); if (t !== 'members') return api; const c = { t, cols: '', ids: null }; consultas.push(c); const sel = api.select, en = api.in; api.select = cols => { c.cols = String(cols); return sel(cols) }; api.in = (col, ids) => { if (col === 'id') c.ids = ids; return en(col, ids) }; return api } } } }
const lista = real('app/api/lider/personas/route'), buscar = real('app/api/lider/personas/buscar/route'), fuente = n => require('fs').readFileSync(path.join(RAIZ, n), 'utf8')

const ORG = 'org-1', ORG2 = 'org-2'
const U = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const TA = U(10), TB = U(11), TC = U(12), TX = U(13)
const PA1 = U(20), PA2 = U(21), PB1 = U(22), PARCH = U(23)
const M = { ana: U(1), luz: U(2), cami: U(3), beto: U(4), rita: U(5), zoe: U(6), dani: U(7), fer: U(8), sinrol: U(9) }
const CANARIOS_AJENOS = ['CANARIO-TEL-AJENO', 'canario-correo-ajeno', '1999-12-31']
const mundo = () => {
  estado.escrituras.length = 0; estado.fallan.clear()
  const m = (id, nombre, apellido, extra = {}) => ({ id, nombre, apellido, email: `${nombre.toLowerCase()}@ejemplo.test`, telefono: 'CANARIO-TEL-AJENO', fecha_nacimiento: '1999-12-31', avatar_url: 'CANARIO-AVATAR', organization_id: ORG, ...extra })
  db.members = [m(M.ana, 'Ana', 'Lider', { telefono: '+56 9 1111 1111', email: 'ana@ejemplo.test' }), m(M.luz, 'Luz', 'Lider', { telefono: '+56 9 2222 2222', email: 'luz@ejemplo.test' }), m(M.cami, 'Cami', 'Sonido', { telefono: '+56 9 3333 3333', email: 'cami@ejemplo.test' }),
    m(M.beto, 'Beto', 'Producción'), m(M.rita, 'Rita', 'Luces', { email: 'canario-correo-ajeno@ejemplo.test' }), m(M.zoe, 'Zoe', 'SinEquipo'), m(M.dani, 'Dani', 'Admin', { email: 'dani@ejemplo.test' }), m(M.fer, 'Fer', 'OtraOrg', { organization_id: ORG2 }), m(M.sinrol, 'Sofi', 'SinRol', { email: 'sofi@ejemplo.test' })]
  for (let i = 0; i < 40; i++) db.members.push(m(U(100 + i), `Gonzalo ${String(i).padStart(2, '0')}`, 'Prueba', { email: `gonzalo${i}@ejemplo.test` }))
  Object.assign(db.members.find(x => x.id === U(100)), { telefono: '+56 9 0000 0000', email: 'g00@ejemplo.test' })      // Gonzalo 00 SÍ es de Alabanza: su contacto no es «canario»
  db.members.push(m(U(150), 'Gonzalo', 'DeOtraOrg', { organization_id: ORG2 }), m(U(151), 'Gonzalo', 'Con%Signo'))
  db.teams = [{ id: TA, name: 'Alabanza', color: 'cobalto', sort_order: 1, organization_id: ORG, archived_at: null }, { id: TB, name: 'Producción', color: 'rosa', sort_order: 2, organization_id: ORG, archived_at: null },
    { id: TC, name: 'Archivado', color: null, sort_order: 3, organization_id: ORG, archived_at: '2026-01-01' }, { id: TX, name: 'De otra org', color: null, sort_order: 1, organization_id: ORG2, archived_at: null }]
  db.team_positions = [{ id: PA1, name: 'Voz', team_id: TA, organization_id: ORG, sort_order: 1, archived_at: null }, { id: PA2, name: 'Bajo', team_id: TA, organization_id: ORG, sort_order: 2, archived_at: null },
    { id: PB1, name: 'Sonido', team_id: TB, organization_id: ORG, sort_order: 1, archived_at: null }, { id: PARCH, name: 'Archivada', team_id: TA, organization_id: ORG, sort_order: 3, archived_at: '2026-01-01' }]
  db.team_members = [{ id: 'tm-ana', member_id: M.ana, team_id: TA, organization_id: ORG, is_leader: true }, { id: 'tm-luz', member_id: M.luz, team_id: TA, organization_id: ORG, is_leader: true }, { id: 'tm-cami', member_id: M.cami, team_id: TA, organization_id: ORG, is_leader: false },
    { id: 'tm-beto', member_id: M.beto, team_id: TB, organization_id: ORG, is_leader: true }, { id: 'tm-rita', member_id: M.rita, team_id: TB, organization_id: ORG, is_leader: false }, { id: 'tm-cami-b', member_id: M.cami, team_id: TB, organization_id: ORG, is_leader: false },
    { id: 'tm-g00', member_id: U(100), team_id: TA, organization_id: ORG, is_leader: false }]
  db.team_member_positions = [{ team_member_id: 'tm-cami', team_position_id: PA1 }, { team_member_id: 'tm-cami', team_position_id: PA2 }, { team_member_id: 'tm-cami', team_position_id: PARCH }, { team_member_id: 'tm-rita', team_position_id: PB1 }, { team_member_id: 'tm-cami-b', team_position_id: PB1 }]
  db.organization_members = [{ person_id: M.dani, organization_id: ORG, role: 'admin' }]
}
const GET = async (ruta, email, url = 'http://x/') => { sesion = { email }; const u = new URL(url); return ruta.GET({ nextUrl: u, url }) }
const ver = email => GET(lista, email)
const buscarQ = (email, equipo, q) => GET(buscar, email, `http://x/api/lider/personas/buscar?equipo=${encodeURIComponent(equipo)}&q=${encodeURIComponent(q)}`)
const sinCache = r => assert.equal((r.headers || {})['Cache-Control'], 'no-store', `falta no-store (estado ${r.status})`)
const llaves = o => Object.keys(o).sort()
const GENERICO = { error: 'No autorizado' }
const CAMPOS = { raiz: ['equipos'], propio: ['catalogo', 'color', 'id', 'nombre', 'personas', 'tuEquipo'], personaPropia: ['apellido', 'email', 'esLider', 'esYo', 'integrante', 'nombre', 'posiciones', 'telefono'], posicion: ['id', 'nombre'],
  ajeno: ['color', 'id', 'nombre', 'personas', 'tuEquipo'], personaAjena: ['apellido', 'nombre', 'posiciones'], busqueda: ['apellido', 'id', 'nombre'] }

correr(async () => {
  console.log('la lista de personas')
  mundo()
  const rA = await ver('ana@ejemplo.test')
  await prueba('un líder recibe la lista (no-store); un administrador también; sin rol 403; sin sesión 401', async () => {
    assert.equal(rA.status, 200); sinCache(rA); assert.equal((await ver('dani@ejemplo.test')).status, 200)
    const sr = await ver('sofi@ejemplo.test'); assert.equal(sr.status, 403); assert.deepEqual(sr.body, GENERICO); sinCache(sr)
    const ns = await ver(null); assert.equal(ns.status, 401); sinCache(ns)
    estado.fallan.add('team_members'); const f = await ver('ana@ejemplo.test'); assert.equal(f.status, 500); sinCache(f); estado.fallan.clear()
  })
  await prueba('la respuesta tiene SOLO los campos de la lista (equipo propio, personas, posiciones, equipos ajenos)', async () => {
    assert.deepEqual(llaves(rA.body), CAMPOS.raiz)
    for (const e of rA.body.equipos) {
      if (e.tuEquipo) { assert.deepEqual(llaves(e), CAMPOS.propio); for (const p of e.catalogo) assert.deepEqual(llaves(p), CAMPOS.posicion); for (const p of e.personas) { assert.deepEqual(llaves(p), CAMPOS.personaPropia); for (const x of p.posiciones) assert.deepEqual(llaves(x), CAMPOS.posicion) } }
      else { assert.deepEqual(llaves(e), CAMPOS.ajeno); for (const p of e.personas) assert.deepEqual(llaves(p), CAMPOS.personaAjena) }
    }
  })
  await prueba('SU equipo, con teléfono y correo, primero y ordenado; esYo solo en quien pide; el catálogo sin posiciones archivadas; el equipo archivado y los de otra organización no salen', async () => {
    assert.deepEqual(rA.body.equipos.map(e => [e.nombre, e.tuEquipo]), [['Alabanza', true], ['Producción', false]])
    const a = rA.body.equipos[0]; assert.deepEqual(a.catalogo, [{ id: PA1, nombre: 'Voz' }, { id: PA2, nombre: 'Bajo' }])
    assert.deepEqual(a.personas.map(p => [p.nombre, p.esLider, p.esYo]), [['Ana', true, true], ['Cami', false, false], ['Gonzalo 00', false, false], ['Luz', true, false]])
    const cami = a.personas.find(p => p.nombre === 'Cami'); assert.equal(cami.telefono, '+56 9 3333 3333'); assert.equal(cami.email, 'cami@ejemplo.test'); assert.equal(cami.integrante, 'tm-cami')
    assert.deepEqual(cami.posiciones, [{ id: PA1, nombre: 'Voz' }, { id: PA2, nombre: 'Bajo' }], 'sin la posición archivada')
    assert.equal(a.personas.find(p => p.nombre === 'Gonzalo 00').posiciones.length, 0)
  })
  await prueba('de los demás equipos SOLO nombre y posiciones (nombres): nada de teléfono, correo, nacimiento ni ids de personas, de integrantes o de posiciones', async () => {
    const prod = rA.body.equipos[1]; assert.deepEqual(prod.personas, [{ nombre: 'Beto', apellido: 'Producción', posiciones: [] }, { nombre: 'Cami', apellido: 'Sonido', posiciones: ['Sonido'] }, { nombre: 'Rita', apellido: 'Luces', posiciones: ['Sonido'] }])
    const t = JSON.stringify(prod); for (const c of [...CANARIOS_AJENOS, 'CANARIO-AVATAR', 'tm-', PB1, M.beto, M.rita, M.cami, '@ejemplo.test', '+56']) assert.ok(!t.includes(c), `apareció «${c}» en un equipo ajeno`)
  })
  await prueba('NUNCA la foto, y ningún dato de contacto de quien no es de su equipo (ni de quien no tiene equipo ni de otra organización), en toda la respuesta', async () => {
    for (const email of ['ana@ejemplo.test', 'beto@ejemplo.test', 'dani@ejemplo.test']) { const t = JSON.stringify((await ver(email)).body); assert.ok(!t.includes('CANARIO-AVATAR') && !/avatar/i.test(t), 'foto en ' + email); assert.ok(!t.includes('1999-12-31') && !/nacimiento/i.test(t)) }
    const tA = JSON.stringify(rA.body); assert.ok(!tA.includes('Zoe') && !tA.includes('OtraOrg') && !tA.includes('Sofi'), 'sin equipo / otra organización / sin rol: no son de ningún equipo de esta lista')
    assert.ok(!tA.includes('canario-correo-ajeno') && !tA.includes('CANARIO-TEL-AJENO'), 'el contacto de Producción no sale para el líder de Alabanza')
  })
  await prueba('el teléfono y el correo se LEEN solo de las personas de los equipos que lidera: ninguna consulta pide esas columnas para personas de otros equipos (no basta con recortar después)', async () => {
    consultas.length = 0; await ver('ana@ejemplo.test')
    const propios = new Set([M.ana, M.luz, M.cami, U(100)]), soloAjenos = [M.beto, M.rita]
    const conContacto = consultas.filter(c => /telefono/.test(c.cols)); assert.ok(conContacto.length >= 1, 'se pidió el contacto de su equipo')
    for (const c of conContacto) { assert.ok(c.ids && c.ids.length > 0); for (const id of c.ids) assert.ok(propios.has(id), `se pidió el contacto de ${id}, que no es de su equipo`); for (const id of soloAjenos) assert.ok(!c.ids.includes(id)) }
    assert.ok(consultas.filter(c => c.ids && !/telefono/.test(c.cols)).every(c => /^id, nombre, apellido$/.test(c.cols)), 'de las demás consultas por id: solo id, nombre y apellido')
  })
  await prueba('el líder de Producción ve Producción como suyo (con contacto) y Alabanza como ajeno; un administrador que no lidera nada ve todos como ajenos (sin contacto)', async () => {
    const r = await ver('beto@ejemplo.test'); assert.deepEqual(r.body.equipos.map(e => [e.nombre, e.tuEquipo]), [['Producción', true], ['Alabanza', false]])
    const dani = await ver('dani@ejemplo.test'); assert.deepEqual(dani.body.equipos.map(e => e.tuEquipo), [false, false]); assert.ok(!JSON.stringify(dani.body).includes('@ejemplo.test'))
  })
  await prueba('la lista no escribe nada', async () => { assert.equal(estado.escrituras.length, 0) })

  console.log('la búsqueda')
  mundo()
  await prueba('devuelve SOLO id, nombre y apellido, máximo 30, ordenado; sin quien ya está en el equipo ni de otra organización; no-store', async () => {
    const r = await buscarQ('ana@ejemplo.test', TA, 'gonzalo'); assert.equal(r.status, 200); sinCache(r); assert.deepEqual(llaves(r.body), ['personas'])
    assert.equal(r.body.personas.length, 30, '41 coinciden y se entregan 30'); for (const p of r.body.personas) assert.deepEqual(llaves(p), CAMPOS.busqueda)
    const ids = r.body.personas.map(p => p.id); assert.ok(!ids.includes(U(100)), 'Gonzalo 00 ya está en el equipo'); assert.ok(!ids.includes(U(150)), 'de otra organización')
    assert.deepEqual(r.body.personas.map(p => p.nombre), r.body.personas.map(p => p.nombre).slice().sort((a, b) => a.localeCompare(b, 'es')))
    const t = JSON.stringify(r.body); for (const c of ['CANARIO', '@ejemplo.test', '1999-12-31', 'avatar']) assert.ok(!t.includes(c), c)
    const chico = await buscarQ('ana@ejemplo.test', TA, 'zoe'); assert.deepEqual(chico.body.personas, [{ id: M.zoe, nombre: 'Zoe', apellido: 'SinEquipo' }])
    assert.deepEqual((await buscarQ('ana@ejemplo.test', TA, 'sinequipo')).body.personas.map(p => p.nombre), ['Zoe'], 'también por apellido')
  })
  await prueba('al menos 2 letras (con menos, lista vacía: ninguna ruta entrega la lista completa); los comodines de LIKE se escapan', async () => {
    for (const q of ['', 'g', ' g ', '%', '_']) { const r = await buscarQ('ana@ejemplo.test', TA, q); assert.equal(r.status, 200); assert.deepEqual(r.body.personas, [], JSON.stringify(q)) }
    assert.deepEqual((await buscarQ('ana@ejemplo.test', TA, 'g_')).body.personas, [], '«g_» no es «g» seguido de cualquier letra')
    assert.deepEqual((await buscarQ('ana@ejemplo.test', TA, 'n%')).body.personas.map(p => p.apellido), ['Con%Signo'], '«%» es un carácter, no un comodín')
    assert.equal((await buscarQ('ana@ejemplo.test', TA, 'x'.repeat(500))).status, 200)
  })
  await prueba('quién puede buscar: el líder para SU equipo; un equipo ajeno, inexistente, de otra organización o mal escrito dan el mismo 403 genérico; sin rol 403; sin sesión 401; el administrador sí', async () => {
    const ref = await buscarQ('ana@ejemplo.test', TB, 'gonzalo'); assert.equal(ref.status, 403); assert.deepEqual(ref.body, GENERICO); sinCache(ref)
    for (const eq of [U(99), TX, 'no-es-un-id', '']) { const r = await buscarQ('ana@ejemplo.test', eq, 'gonzalo'); assert.equal(r.status, 403, eq); assert.deepEqual(r.body, ref.body); assert.deepEqual(r.headers, ref.headers) }
    assert.equal((await buscarQ('beto@ejemplo.test', TA, 'gonzalo')).status, 403, 'el líder de Producción no busca para Alabanza'); assert.equal((await buscarQ('sofi@ejemplo.test', TA, 'gonzalo')).status, 403); assert.equal((await buscarQ(null, TA, 'gonzalo')).status, 401)
    assert.equal((await buscarQ('dani@ejemplo.test', TB, 'gonzalo')).status, 200)
    assert.equal((await GET(buscar, 'ana@ejemplo.test', 'http://x/api/lider/personas/buscar?q=gonzalo')).status, 403, 'sin equipo')
    estado.fallan.add('teams'); const f = await buscarQ('ana@ejemplo.test', TA, 'gonzalo'); assert.equal(f.status, 500); sinCache(f); estado.fallan.clear()
  })
  await prueba('las dos rutas solo LEEN: ninguna escritura, y el código no contiene escrituras ni rpc', async () => {
    assert.equal(estado.escrituras.length, 0)
    for (const f of ['app/api/lider/personas/route.ts', 'app/api/lider/personas/buscar/route.ts', 'lib/lider/personasLider.ts']) { const c = fuente(f).replace(/\/\/.*$/gm, ''); assert.ok(!/\.(insert|update|upsert|delete)\(|\.rpc\(/.test(c), f); assert.ok(!/avatar_url|fecha_nacimiento|bloque/i.test(c), `${f}: nunca foto, nacimiento ni bloqueos`) }
  })
  terminar()
})
