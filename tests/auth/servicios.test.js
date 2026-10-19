// Paso 0a del punto 50, commit 4: update-service, delete-service, duplicate-service y service-blocks.
// 1) Listas blancas: las columnas se SACAN del código de las pantallas reales (AdminServiceView) y se comprueba que la lista blanca las cubre todas (si una pantalla manda una columna nueva y nadie la agrega, esta prueba falla en vez de romper la pantalla en silencio);
//    y los cuerpos reales de esas pantallas se ejecutan contra las rutas.
// 2) Seguridad: sin sesión → 401, sin permiso u otra organización → 403, columnas o ids ajenos → 400/403, sin escribir nada.
const { assert, db, ID, S, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
let quien = 'admin'
stubs['@/lib/auth/authorize'] = { requireOrgAdmin: async org => quien === 'nadie' ? { ok: false, response: { status: 401, body: { error: 'No autorizado' } } } : quien === 'admin' && org === ID.ORG ? { ok: true, email: 'admin@ejemplo.test' } : { ok: false, response: { status: 403, body: { error: 'No autorizado' } } } }
const upd = real('app/api/update-service/route'), del = real('app/api/delete-service/route'), dup = real('app/api/duplicate-service/route'), blk = real('app/api/service-blocks/route')
const req = cuerpo => ({ json: async () => cuerpo }), get = id => ({ nextUrl: { searchParams: new URLSearchParams(id ? 'serviceId=' + id : '') } })
const preparar = () => { mundo(); quien = 'admin'; estado.escrituras.length = 0; db.service_blocks.forEach((b, i) => { b.id = `00000000-0000-4000-8000-${String(700 + i).padStart(12, '0')}` }) }      // ids con forma de uuid, como los de la base real
const S1 = S(1), AJS = () => ID.AJ.service
const fuente = fs.readFileSync(path.join(RAIZ, 'components/AdminServiceView.tsx'), 'utf8')
const claves = cuerpo => [...cuerpo.matchAll(/(?:^|[,{\s])([a-z_]+)\s*:/g)].map(m => m[1])

correr(async () => {
  console.log('listas blancas ← llamadores reales')
  await prueba('update-service: todas las columnas que manda AdminServiceView están en la lista blanca (y es exactamente esa)', async () => {
    const enviadas = new Set([...fuente.matchAll(/api\/update-service[^\n]*?JSON\.stringify\(\{id:[^,}]+,(\w+):/g)].map(m => m[1]))
    assert.deepEqual([...enviadas].sort(), ['hora_fin', 'hora_inicio']); assert.deepEqual([...enviadas].sort(), [...upd.CAMPOS_SERVICIO_EDITABLES].sort()) })
  await prueba('service-blocks POST: las columnas de addBlock están en la lista blanca; PATCH: todas las de updateBlock/EditPanel/reordenar también', async () => {
    const nuevo = fuente.match(/const payload=\{([^}]*)\}/)[1]; const claveNuevo = new Set(nuevo.split(/,(?![^(]*\))/).map(t => (t.match(/^\s*(\w+)/) || [])[1]).filter(Boolean));      // claves del objeto (incluye las abreviadas «orden,tipo»)
     for (const k of ['service_id', 'orden', 'tipo', 'titulo', 'duracion_min']) assert.ok(claveNuevo.has(k), k)
    for (const k of claveNuevo) assert.ok(blk.CAMPOS_BLOQUE_NUEVO.includes(k), 'POST: ' + k)
    const edit = new Set()
    for (const m of fuente.matchAll(/updateBlock\([^,()]+(?:\([^)]*\))?,\s*\{([^}]*)\}/g)) claves(m[1]).forEach(k => edit.add(k))
    for (const m of fuente.matchAll(/onUpdate\(block\.id,\s*\{([\s\S]*?)\}\s*as any\)/g)) claves(m[1]).forEach(k => edit.add(k))
    for (const m of fuente.matchAll(/api\/service-blocks',\{method:'PATCH'[^\n]*?JSON\.stringify\(\{([^}]*)\}\)/g)) claves(m[1]).forEach(k => edit.add(k))
    edit.delete('id'); assert.ok(edit.size >= 7, 'se leyeron las columnas reales: ' + [...edit]); for (const k of edit) assert.ok(blk.CAMPOS_BLOQUE_EDITABLES.includes(k), 'PATCH: ' + k) })

  console.log('update-service')
  await prueba('los cuerpos reales ({id, hora_inicio} y {id, hora_fin}) funcionan', async () => {
    preparar(); let r = await upd.POST(req({ id: S1, hora_inicio: '09:30' })); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(db.services.find(s => s.id === S1).hora_inicio, '09:30')
    r = await upd.POST(req({ id: S1, hora_fin: '12:15' })); assert.equal(r.status, 200); assert.equal(db.services.find(s => s.id === S1).hora_fin, '12:15') })
  await prueba('columnas no permitidas (organization_id, fecha, tipo, id…) → 400 con su nombre y SIN escribir; valores raros → 400', async () => {
    preparar(); const antes = JSON.stringify(db.services.find(s => s.id === S1))
    for (const extra of [{ organization_id: ID.ORG2 }, { fecha: '2030-01-01' }, { tipo: 'ensayo' }, { titulo: 'x', hora_inicio: '10:00' }]) { const r = await upd.POST(req({ id: S1, ...extra })); assert.equal(r.status, 400); assert.ok(/no permitidos/.test(r.body.error), r.body.error) }
    assert.ok((await upd.POST(req({ id: S1, organization_id: ID.ORG2 }))).body.error.includes('organization_id'))
    for (const v of ['', 'las diez', '25', { $ne: 1 }, 10]) assert.equal((await upd.POST(req({ id: S1, hora_inicio: v }))).status, 400, JSON.stringify(v)); assert.equal((await upd.POST(req({ id: S1 }))).status, 400, 'sin nada que actualizar')
    assert.equal(estado.escrituras.length, 0); assert.equal(JSON.stringify(db.services.find(s => s.id === S1)), antes) })
  await prueba('sin sesión → 401; sin permiso → 403; servicio de otra organización → 403; id roto → 400; inexistente → 404: sin escrituras', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; assert.equal((await upd.POST(req({ id: S1, hora_inicio: '09:00' }))).status, q === 'nadie' ? 401 : 403) }
    preparar(); assert.equal((await upd.POST(req({ id: AJS(), hora_inicio: '09:00' }))).status, 403); assert.equal((await upd.POST(req({ id: 'x', hora_inicio: '09:00' }))).status, 400); assert.equal((await upd.POST(req(null))).status, 400)
    assert.equal((await upd.POST(req({ id: '00000000-0000-0000-0000-00000000ffff', hora_inicio: '09:00' }))).status, 404); assert.equal(estado.escrituras.length, 0) })

  console.log('delete-service y duplicate-service')
  await prueba('delete-service: sin sesión/sin permiso/otra organización no borra; el administrador de la organización sí', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; assert.equal((await del.POST(req({ serviceId: S1 }))).status, q === 'nadie' ? 401 : 403); assert.equal(estado.escrituras.length, 0) }
    preparar(); assert.equal((await del.POST(req({ serviceId: AJS() }))).status, 403); assert.equal((await del.POST(req({ serviceId: 'x' }))).status, 400); assert.equal(estado.escrituras.length, 0)
    assert.equal((await del.POST(req({ serviceId: S1 }))).status, 200); assert.ok(!db.services.some(s => s.id === S1)) })
  await prueba('duplicate-service: el servicio nuevo nace en la organización del original; sin permiso/otra organización no copia; fecha rota → 400', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; assert.equal((await dup.POST(req({ serviceId: S1, newFecha: '2099-05-03' }))).status, q === 'nadie' ? 401 : 403); assert.equal(estado.escrituras.length, 0) }
    preparar(); assert.equal((await dup.POST(req({ serviceId: AJS(), newFecha: '2099-05-03' }))).status, 403); assert.equal((await dup.POST(req({ serviceId: S1, newFecha: 'mañana' }))).status, 400); assert.equal((await dup.POST(req({ serviceId: 'x', newFecha: '2099-05-03' }))).status, 400); assert.equal(estado.escrituras.length, 0)
    const r = await dup.POST(req({ serviceId: S1, newFecha: '2099-05-03' })); assert.equal(r.status, 200, JSON.stringify(r.body)); const nuevo = db.services.find(s => s.id === r.body.serviceId); assert.equal(nuevo.organization_id, ID.ORG); assert.equal(nuevo.fecha, '2099-05-03') })

  console.log('service-blocks')
  await prueba('los cuerpos reales de las pantallas funcionan (alta, edición de cada columna, reordenar, borrar, listar)', async () => {
    preparar(); let r = await blk.POST(req({ service_id: S1, orden: 9, tipo: 'cancion', titulo: 'Nueva canción', duracion_min: 300 })); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.block.service_id, S1); const id = '00000000-0000-4000-8000-0000000008bb'; db.service_blocks.find(b => b.id === r.body.block.id).id = id      // el banco falso no inventa uuid como la base real
    for (const cuerpo of [{ tipo: 'cancion', titulo: 'Nueva canción' }, { song_id: ID.SG1, titulo: 'Canción Uno' }, { titulo: 'Otro' }, { tono: 'G' }, { lead_id: ID.O1 }, { duracion_min: 240 }, { notas: 'ojo con el puente' }, { orden: 3 },
      { song_id: ID.SG1, titulo: 'Canción Uno', tono: 'G', lead_id: ID.O1, notas: 'x' }, { titulo: 'Receso', duracion_min: 120, notas: '' }]) { r = await blk.PATCH(req({ id, ...cuerpo })); assert.equal(r.status, 200, JSON.stringify(cuerpo) + JSON.stringify(r.body)) }
    const fila = db.service_blocks.find(b => b.id === id); assert.equal(fila.titulo, 'Receso'); assert.equal(fila.service_id, S1)
    r = await blk.GET(get(S1)); assert.equal(r.status, 200); assert.ok(r.body.blocks.length >= 3); assert.equal((await blk.DELETE(req({ id }))).status, 200); assert.ok(!db.service_blocks.some(b => b.id === id)) })
  await prueba('columnas no permitidas → 400 con su nombre y SIN escribir: no se mueve un bloque a otro servicio ni se cambia id/organization_id', async () => {
    preparar(); const id = db.service_blocks[0].id, antes = JSON.stringify(db.service_blocks)
    for (const extra of [{ service_id: AJS() }, { service_id: S1 }, { organization_id: ID.ORG2 }, { song: {} }, { titulo: 'x', created_at: 'hoy' }]) {
      const r = await blk.PATCH(req({ id: db.service_blocks[0].id, ...extra })); assert.equal(r.status, 400, JSON.stringify(extra)); assert.ok(/no permitidos/.test(r.body.error)) }
    for (const extra of [{ lead_id: ID.O1 }, { song_id: ID.SG1 }, { notas: 'n' }, { organization_id: ID.ORG2 }]) assert.equal((await blk.POST(req({ service_id: S1, orden: 1, tipo: 'bloque', titulo: 't', ...extra }))).status, 400, 'POST: ' + JSON.stringify(extra))
    for (const mal of [{ orden: 'uno' }, { orden: 1.5 }, { tipo: 'otro' }, { titulo: 5 }, { song_id: 'x' }, { duracion_min: 'mucho' }]) assert.equal((await blk.PATCH(req({ id, ...mal }))).status, 400, JSON.stringify(mal))
    assert.equal((await blk.PATCH(req({ id }))).status, 400); assert.equal(estado.escrituras.length, 0); assert.equal(JSON.stringify(db.service_blocks), antes) })
  await prueba('PATCH: una canción o una persona de OTRA organización → 403 sin escribir; POST a un servicio ajeno → 403', async () => {
    preparar(); const id = db.service_blocks[0].id
    assert.equal((await blk.PATCH(req({ id, song_id: ID.AJ.song }))).status, 403); assert.equal((await blk.PATCH(req({ id, lead_id: ID.AJ.member }))).status, 403); assert.equal((await blk.PATCH(req({ id, song_id: '00000000-0000-0000-0000-00000000ffff' }))).status, 403)
    assert.equal((await blk.POST(req({ service_id: AJS(), orden: 1, tipo: 'bloque', titulo: 't' }))).status, 403); assert.equal(estado.escrituras.length, 0) })
  await prueba('sin sesión → 401; sin permiso → 403 en GET/POST/PATCH/DELETE; un bloque de un servicio de otra organización → 403; nada escrito', async () => {
    for (const q of ['nadie', 'otro']) { preparar(); quien = q; const id = db.service_blocks[0].id, cod = q === 'nadie' ? 401 : 403
      assert.equal((await blk.GET(get(S1))).status, cod); assert.equal((await blk.POST(req({ service_id: S1, orden: 1, tipo: 'bloque', titulo: 't' }))).status, cod); assert.equal((await blk.PATCH(req({ id, titulo: 'x' }))).status, cod); assert.equal((await blk.DELETE(req({ id }))).status, cod); assert.equal(estado.escrituras.length, 0) }
    preparar(); db.service_blocks.push({ id: '00000000-0000-4000-8000-0000000009aa', service_id: AJS(), orden: 1, tipo: 'bloque', titulo: 'ajeno' }); const aj = '00000000-0000-4000-8000-0000000009aa'
    assert.equal((await blk.PATCH(req({ id: aj, titulo: 'x' }))).status, 403); assert.equal((await blk.DELETE(req({ id: aj }))).status, 403); assert.equal((await blk.GET(get(AJS()))).status, 403); assert.equal(estado.escrituras.length, 0) })
  await prueba('ids rotos → 400, inexistentes → 404; GET sin serviceId sigue devolviendo lista vacía', async () => {
    preparar(); assert.equal((await blk.PATCH(req({ id: 'x', titulo: 'a' }))).status, 400); assert.equal((await blk.DELETE(req({}))).status, 400); assert.equal((await blk.GET(get('nope'))).status, 400)
    assert.equal((await blk.PATCH(req({ id: '00000000-0000-0000-0000-00000000ffff', titulo: 'a' }))).status, 404); assert.equal((await blk.PATCH(req(null))).status, 400); assert.deepEqual((await blk.GET(get(null))).body, { blocks: [] }) })
  terminar()
})
