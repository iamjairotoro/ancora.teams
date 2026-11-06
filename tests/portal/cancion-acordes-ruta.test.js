// Etapa C1: /api/portal/cancion entrega `acordes` solo cuando la canción tiene tono y TODAS las variantes que se usarían están en formato 2; en cualquier otro caso (formato 1, sin tono, error al leer) la letra viaja igual que siempre y `acordes` es null.
const { assert, db, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('./_banco')
const path = require('path')
stubs['@/lib/auth/libraryAccess'] = { requireLibraryAccess: async () => ({ ok: true }) }
const { GET } = require(resolver(path.join(RAIZ, 'app/api/portal/cancion/route')))
const L = [{ kind: 'lyric', segments: [{ text: 'Aquí ', acorde: { g: 1, cal: '' } }, { text: 'va' }] }]
const pedir = id => GET({ url: `http://x/api/portal/cancion?id=${id}`, headers: { get: () => null } })
const preparar = (tono, formato) => {
  mundo(); estado.fallan.clear(); const s = db.songs[0]; s.tono_original = tono; s.default_arrangement = null; s.letra = 'VERSO\nAquí va'
  db.song_attachments = []; db.song_sections = [{ id: 'sec1', song_id: s.id, code: 'V1', name: 'Verso', sort_order: 0 }, { id: 'sec2', song_id: s.id, code: 'C', name: 'Coro', sort_order: 1 }]
  db.song_section_variants = [{ id: 'v1', section_id: 'sec1', label: 'Principal', lines: L, is_default: true, formato }, { id: 'v2', section_id: 'sec2', label: 'Principal', lines: L, is_default: true, formato }]
  return s.id }

correr(async () => {
  await prueba('formato 2 y con tono → viaja `acordes` con el tono y las secciones; la letra y los adjuntos viajan igual', async () => {
    const id = preparar('G', 2); const r = await pedir(id); assert.equal(r.status ?? 200, 200); const b = r.body ?? await r.json()
    assert.equal(b.acordes.tono, 'G'); assert.deepEqual(b.acordes.secciones.map(s => s.code), ['V1', 'C']); assert.equal(b.song.letra, 'VERSO\nAquí va'); assert.deepEqual(b.adjuntos, []); assert.equal(b.adjuntosError, false) })
  await prueba('formato 1 (como hoy) → `acordes` null y la letra intacta', async () => {
    const id = preparar('G', 1); const b = (await pedir(id)).body ?? null; const j = b ?? await (await pedir(id)).json()
    assert.equal(j.acordes, null); assert.equal(j.song.letra, 'VERSO\nAquí va') })
  await prueba('mezcla (una variante en formato 1) o sin tono → null; una canción sin secciones → null y sin error', async () => {
    let id = preparar('G', 2); db.song_section_variants[1].formato = 1; assert.equal(((await pedir(id)).body).acordes, null)
    id = preparar(null, 2); assert.equal(((await pedir(id)).body).acordes, null); id = preparar('', 2); assert.equal(((await pedir(id)).body).acordes, null)
    id = preparar('G', 2); db.song_sections = []; const b = (await pedir(id)).body; assert.equal(b.acordes, null); assert.equal(b.song.letra, 'VERSO\nAquí va') })
  await prueba('si falla la lectura de secciones o variantes, la letra se entrega igual y `acordes` es null (nunca un 500 por los acordes)', async () => {
    for (const tabla of ['song_sections', 'song_section_variants']) { const id = preparar('G', 2); estado.fallan.add(tabla); const r = await pedir(id); assert.notEqual(r.status, 500, tabla); const b = r.body; assert.equal(b.acordes, null, tabla); assert.equal(b.song.letra, 'VERSO\nAquí va') } })
  await prueba('la columna de la hoja de letra no cambia (SONG_LYRIC_COLUMNS) y la ruta solo lee, nunca escribe', async () => {
    const id = preparar('G', 2); estado.escrituras.length = 0; const b = (await pedir(id)).body
    assert.ok(Object.keys(b.song).every(k => ['ccli', 'copyright', 'autor', 'id', 'letra', 'nombre', 'original_title', 'traductor'].includes(k)), 'ninguna columna de más (ni tono ni arreglo salen en `song`)'); assert.equal(estado.escrituras.length, 0) })
  terminar()
})
