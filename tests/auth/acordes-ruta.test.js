// Etapa C2: /api/admin/canciones/acordes (GET carga, POST guarda). Permisos: la organización sale de la CANCIÓN; sin sesión 401; sin rol, otra organización o canción que no existe → el MISMO 403 genérico;
// solo propietario y administrador. Además: sin tono → 400 con su mensaje, grados inválidos → 400, letra y chart distintos → 400, edición de otra persona → 409, y NADA se escribe en ningún rechazo.
const { assert, db, ID, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const { from } = require('../portal/_banco')
// la base real de la prueba, pero con la escritura en `songs` rota a pedido (las lecturas siguen funcionando) para probar un guardado que se corta a la mitad
stubs['@/lib/supabase/admin'] = { createAdminSupabase: () => ({ from: t => { const a = from(t); if (t === 'songs' && estado.cortarSongs) a.update = () => ({ eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) }); return a } }) }
const ORG = '00000000-0000-0000-0000-000000000001'
const sesion = { rol: 'admin', org: ORG, email: true }                           // quién llama: rol 'admin' | 'miembro' | null (sin sesión), y de qué organización es administrador
const respuesta = (status, error) => ({ status, body: { error } })
stubs['@/lib/auth/authorize'] = {
  requireOrgAdmin: async orgId => !sesion.email ? { ok: false, response: respuesta(401, 'No autorizado') } : (sesion.rol === 'admin' && orgId === sesion.org ? { ok: true, email: 'a@b.test' } : { ok: false, response: respuesta(403, 'No autorizado') }),
  requireOrgAdminDeLaSesion: async () => !sesion.email ? { ok: false, response: respuesta(401, 'No autorizado') } : (sesion.rol === 'admin' ? { ok: true, email: 'a@b.test', organizationId: sesion.org } : { ok: false, response: respuesta(403, 'No autorizado') }),
}
const { GET, POST } = require(resolver(path.join(RAIZ, 'app/api/admin/canciones/acordes/route'))), E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const TEXTO = 'VERSO 1:\nAquí va la letra\nsegunda línea\n\nCORO:\nCuán grande es Él'
const A = (g, cal = '') => ({ g, cal })
const secciones = () => E.aSecciones({ texto: TEXTO, anclas: [{ at: 9, acorde: A(1) }, { at: 49, acorde: A(6, 'm') }], interludios: [{ at: 39, items: [{ acorde: A(1) }, { texto: '|' }] }] })
const get = id => GET({ url: `http://x/api/admin/canciones/acordes?id=${id}`, headers: { get: () => null } })
const post = cuerpo => POST({ json: async () => cuerpo, headers: { get: () => null } })
const preparar = () => { mundo(); estado.fallan.clear(); estado.escrituras.length = 0; Object.assign(sesion, { rol: 'admin', org: ORG, email: true })
  const s = db.songs[0]; Object.assign(s, { tono_original: 'G', letra: TEXTO }); db.song_sections = []; db.song_section_variants = []
  const ajena = db.songs.find(x => x.organization_id === ID.ORG2); return { id: s.id, ajena: ajena && ajena.id } }
const huella = async id => (await get(id)).body.cancion.huella
const cuerpo = async (id, o = {}) => ({ songId: id, tono: 'G', letra: TEXTO, secciones: secciones(), base: await huella(id), ...o })
const sinEscrituras = () => assert.equal(estado.escrituras.length, 0, JSON.stringify(estado.escrituras).slice(0, 200))

correr(async () => {
  await prueba('sin sesión → 401 (GET y POST), también para una canción que no existe; nada escrito', async () => {
    const { id } = preparar(); sesion.email = false
    assert.equal((await get(id)).status, 401); assert.equal((await get('99999999-9999-4999-8999-999999999999')).status, 401)
    assert.equal((await post({ songId: id, tono: 'G', letra: TEXTO, secciones: secciones(), base: 'a'.repeat(32) })).status, 401); sinEscrituras() })
  await prueba('sin rol (miembro o líder) → 403; administrador de OTRA organización → 403; canción que no existe → 403: las tres respuestas son IDÉNTICAS (no se filtra si la canción existe) y no se escribe', async () => {
    const { id, ajena } = preparar(); assert.ok(ajena, 'hay una canción de otra organización en el banco')
    const body = { songId: id, tono: 'G', letra: TEXTO, secciones: secciones(), base: 'a'.repeat(32) }
    sesion.rol = 'miembro'; const a = await get(id), b = await post(body); sesion.rol = 'admin'; sesion.org = ID.ORG2; const c = await get(id), d = await post(body)
    sesion.org = ORG; const e = await get(ajena), f = await post({ ...body, songId: ajena }); const g = await get('99999999-9999-4999-8999-999999999999'), h = await post({ ...body, songId: '99999999-9999-4999-8999-999999999999' })
    for (const r of [a, b, c, d, e, f, g, h]) { assert.equal(r.status, 403); assert.deepEqual(r.body, { error: 'No autorizado' }) }
    sinEscrituras() })
  await prueba('la organización sale de la canción, nunca del cuerpo: un cuerpo con organization_id (o cualquier llave de más) → 400; un songId de otra organización no se acepta aunque el administrador lo sea de la suya', async () => {
    const { id, ajena } = preparar(); const c = await cuerpo(id)
    for (const extra of [{ organization_id: ORG }, { organizationId: ORG }, { orgId: ORG }, { org: ORG }]) assert.equal((await post({ ...c, ...extra })).status, 400)
    assert.equal((await post({ ...c, songId: ajena })).status, 403); sinEscrituras() })
  await prueba('administrador de la organización → GET devuelve la carga (letra, tono, origen, huella); id mal formado → 400', async () => {
    const { id } = preparar(); const r = await get(id); assert.equal(r.status, 200); assert.equal(r.body.cancion.tono, 'G'); assert.equal(r.body.cancion.letra, TEXTO); assert.equal(r.body.cancion.origen, 'ninguno'); assert.match(r.body.cancion.huella, /^[0-9a-f]{32}$/)
    assert.equal((await get('no-es-uuid')).status, 400); assert.equal((await get('')).status, 400) })
  await prueba('POST feliz: crea secciones y variantes en formato 2, deja letra y tono, devuelve la huella nueva; el lector ve la canción; nada se borró', async () => {
    const { id } = preparar(); const r = await post(await cuerpo(id)); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.ok, true)
    assert.equal(db.song_sections.length, 2); assert.equal(db.song_section_variants.filter(v => v.is_default && v.formato === 2 && v.label === 'Principal').length, 2)
    assert.ok(!estado.escrituras.some(e => e.op === 'delete')); const c = (await get(id)).body.cancion; assert.equal(c.origen, 'formato2'); assert.equal(c.huella, r.body.huella)
    const orden = estado.escrituras.map(e => e.tabla + ':' + e.op); assert.deepEqual(orden, ['song_sections:insert', 'song_sections:insert', 'song_section_variants:insert', 'song_section_variants:insert', 'songs:update', 'song_section_variants:update', 'song_section_variants:update']) })
  await prueba('guardar de nuevo: lo anterior queda como Respaldo con las mismas líneas (nada borrado, ninguna fila menos)', async () => {
    const { id } = preparar(); await post(await cuerpo(id)); const antes = JSON.parse(JSON.stringify(db.song_section_variants)); estado.escrituras.length = 0
    const nuevo = E.aSecciones({ texto: TEXTO, anclas: [{ at: 9, acorde: A(4) }], interludios: [] }); const r = await post(await cuerpo(id, { secciones: nuevo })); assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.ok(!estado.escrituras.some(e => e.op === 'delete')); assert.equal(db.song_section_variants.length, antes.length + 2)
    for (const v of antes) { const ahora = db.song_section_variants.find(x => x.id === v.id); assert.deepEqual(ahora.lines, v.lines); assert.equal(ahora.is_default, false); assert.match(ahora.label, /^Respaldo · \d{4}-\d{2}-\d{2} · /) }
    assert.equal(db.song_section_variants.filter(v => v.is_default).length, 2) })
  await prueba('SIN TONO → 400 con «Para guardar con acordes, elige el tono de la canción» y nada escrito; tono inválido → 400', async () => {
    const { id } = preparar(); const r = await post(await cuerpo(id, { tono: '' })); assert.equal(r.status, 400); assert.equal(r.body.error, 'Para guardar con acordes, elige el tono de la canción'); assert.equal(r.body.campo, 'tono')
    for (const t of ['sol', 'H', 'Gm7', 5, null]) assert.equal((await post(await cuerpo(id, { tono: t }))).status, 400, String(t)); sinEscrituras() })
  await prueba('GRADOS INVÁLIDOS por la ruta: cada variante rota → 400 con «Valor no válido en secciones» y NADA escrito', async () => {
    const { id } = preparar(); const rota = f => { const s = secciones(); f(s); return s }
    for (const s of [rota(s => { s[0].lineas[0].segments[0].acorde.g = 0 }), rota(s => { s[0].lineas[0].segments[0].acorde.g = 8 }), rota(s => { s[0].lineas[0].segments[0].acorde.g = 2.5 }), rota(s => { s[0].lineas[0].segments[0].acorde.g = '3' }), rota(s => { s[0].lineas[0].segments[0].acorde.alt = 'x' }),
      rota(s => { s[0].lineas[0].segments[0].acorde.cal = 'zzz' }), rota(s => { s[0].lineas[0].segments[0].acorde.bajo = { g: 9 } }), rota(s => { s[0].lineas[0].segments[0].chord = 'C' }), rota(s => { s[0].lineas[0].segments[0].acorde.extra = 1 }), rota(s => { s[0].lineas[2].items[0].acorde.g = 0 }), rota(s => { s[0].lineas[2].items.push({ texto: 'con espacio' }) })]) {
      const r = await post(await cuerpo(id, { secciones: s })); assert.equal(r.status, 400); assert.equal(r.body.error, 'Valor no válido en secciones') }
    sinEscrituras() })
  await prueba('la letra y el chart deben decir LO MISMO: otro texto, otro número de secciones o un interludio antes de la primera línea → 400 y nada escrito', async () => {
    const { id } = preparar(); const c = await cuerpo(id)
    assert.equal((await post({ ...c, letra: TEXTO + '\nextra' })).status, 400); assert.equal((await post({ ...c, secciones: c.secciones.slice(0, 1) })).status, 400)
    const antes = secciones(); antes[0].lineas.unshift({ kind: 'bars', items: [{ acorde: A(1) }] }); assert.equal((await post({ ...c, secciones: antes })).status, 400); sinEscrituras() })
  await prueba('si alguien más cambió la canción después de abrirla → 409 y nada escrito; con la huella nueva se guarda', async () => {
    const { id } = preparar(); const c = await cuerpo(id); db.songs[0].letra = TEXTO + ' '; const r = await post(c); assert.equal(r.status, 409); assert.equal(r.body.error, 'Alguien más cambió esta canción. Recarga para ver los cambios.'); sinEscrituras()
    db.songs[0].letra = TEXTO; assert.equal((await post(await cuerpo(id))).status, 200) })
  await prueba('si una lectura de la base falla → 500 genérico y nada escrito; el cuerpo mal formado → 400', async () => {
    const { id } = preparar(); const c = await cuerpo(id); estado.fallan.add('song_sections'); const r = await post(c); assert.equal(r.status, 500); assert.deepEqual(r.body, { error: 'No se pudo leer' }); estado.fallan.clear(); sinEscrituras()
    for (const mal of [null, 'x', [], {}, { songId: id }]) assert.equal((await post(mal)).status, 400) })
  await prueba('un guardado que se corta a la mitad → 500 con el aviso y parcial:true, nada borrado, la canción queda solo con letra y se puede RECUPERAR desde los pendientes', async () => {
    const { id } = preparar(); await post(await cuerpo(id)); estado.escrituras.length = 0
    const nuevo = E.aSecciones({ texto: TEXTO, anclas: [{ at: 9, acorde: A(4) }], interludios: [] }); const c = await cuerpo(id, { secciones: nuevo })
    estado.cortarSongs = true; const r = await post(c); estado.cortarSongs = false
    assert.equal(r.status, 500); assert.equal(r.body.error, 'No se pudo terminar de guardar. Tus cambios siguen en el editor; vuelve a intentarlo.'); assert.equal(r.body.parcial, true); assert.ok(!estado.escrituras.some(e => e.op === 'delete'))
    assert.equal(db.song_section_variants.filter(v => v.is_default).length, 0, 'ninguna variante viva: solo letra'); const g = (await get(id)).body.cancion; assert.equal(g.origen, 'pendiente'); assert.equal(g.secciones[0][0].segments[0].acorde.g, 4)
    assert.equal((await post(await cuerpo(id, { secciones: nuevo }))).status, 200, 'con la huella nueva el segundo intento termina'); assert.equal(db.song_section_variants.filter(v => v.is_default).length, 2) })
  terminar()
})
