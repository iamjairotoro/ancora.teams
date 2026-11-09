// Endurecimiento 4: antes de pisar `songs.letra` y `tono_original` el guardado respalda lo anterior en `song_text_backups` (migrations/055-respaldo-letra-tono.sql, que NO se aplica sola). El respaldo es la PRIMERA escritura:
// si no se puede (por ejemplo, la tabla todavía no existe) el guardado se detiene con un mensaje claro y no se escribe nada. Datos inventados; sin red. Correr: `node tests/portal/endurecimiento-respaldo.test.js`
const { assert, db, ID, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ, from } = require('./_banco')
const path = require('path'), fs = require('fs')
// la tabla de respaldo «no existe» (falta la migración 055): la base responde con error en el insert; o la llamada lanza (sin red)
const falla = { modo: null }
stubs['@/lib/supabase/admin'] = { createAdminSupabase: () => ({ from: t => {
  if (t === 'song_text_backups' && falla.modo === 'sin-tabla') return { insert: () => Promise.resolve({ data: null, error: { message: 'relation "public.song_text_backups" does not exist' } }) }
  if (t === 'song_text_backups' && falla.modo === 'lanza') return { insert: () => { throw new Error('sin red') } }
  return from(t) } }) }
const ORG = '00000000-0000-0000-0000-000000000001', sesion = { rol: 'admin', org: ORG }
stubs['@/lib/auth/authorize'] = {
  requireOrgAdmin: async orgId => (sesion.rol === 'admin' && orgId === sesion.org ? { ok: true, email: 'a@b.test' } : { ok: false, response: { status: 403, body: { error: 'No autorizado' } } }),
  requireOrgAdminDeLaSesion: async () => ({ ok: true, email: 'a@b.test', organizationId: sesion.org }),
}
const { GET, POST } = require(resolver(path.join(RAIZ, 'app/api/admin/canciones/acordes/route'))), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const { TEXTOS_EDITOR: T, mensajeDeGuardado } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const TEXTO = 'VERSO 1:\nAquí va la letra\nsegunda línea\n\nCORO:\nCuán grande es Él', NUEVO = 'VERSO 1:\nOtra letra de prueba\nsegunda línea'
const A = (g, cal = '') => ({ g, cal })
const get = id => GET({ url: `http://x/api/admin/canciones/acordes?id=${id}`, headers: { get: () => null } }), post = c => POST({ json: async () => c, headers: { get: () => null } })
const preparar = ({ letra = TEXTO, tono = 'G', tabla = true } = {}) => { mundo(); estado.fallan.clear(); estado.escrituras.length = 0; sesion.rol = 'admin'; sesion.org = ORG
  const s = db.songs[0]; Object.assign(s, { tono_original: tono, letra }); db.song_sections = []; db.song_section_variants = []; if (tabla) db.song_text_backups = []; else delete db.song_text_backups; return s.id }
const cuerpoCon = async (id, letra, tono = 'G') => ({ songId: id, tono, letra, secciones: E.aSecciones({ texto: letra, anclas: [{ at: 9, acorde: A(1) }], interludios: [] }), base: (await get(id)).body.cancion.huella })

correr(async () => {
  await prueba('con la tabla: guardar una letra distinta deja UNA fila de respaldo con la letra y el tono de antes, de la organización de la canción (no la del valor por omisión), y es la PRIMERA escritura', async () => {
    const id = preparar(); const OTRA = '00000000-0000-0000-0000-0000000000aa'; db.songs[0].organization_id = OTRA; sesion.org = OTRA      // una organización distinta de la de por omisión: el respaldo tiene que llevar la de la canción
    const r = await post(await cuerpoCon(id, NUEVO, 'A')); assert.equal(r.status, 200, JSON.stringify(r.body))
    assert.equal(db.song_text_backups.length, 1); const b = db.song_text_backups[0]; assert.equal(b.letra, TEXTO); assert.equal(b.tono_original, 'G'); assert.equal(b.song_id, id); assert.equal(b.organization_id, OTRA); assert.equal(b.motivo, 'editor-acordes'); assert.ok(b.id)
    assert.equal(estado.escrituras[0].tabla, 'song_text_backups', 'primera escritura'); assert.equal(estado.escrituras.filter(e => e.tabla === 'song_text_backups').length, 1); assert.equal(db.songs[0].letra, NUEVO); assert.equal(db.songs[0].tono_original, 'A')
    assert.ok(!estado.escrituras.some(e => e.op === 'delete'), 'nada borrado')
  })
  await prueba('solo se respalda lo que se pisa: sin cambio de letra ni tono no hay respaldo; solo cambia el tono → respaldo; letra y tono vacíos de antes → nada que respaldar (no hace falta la tabla)', async () => {
    let id = preparar(); assert.equal((await post(await cuerpoCon(id, TEXTO))).status, 200); assert.equal(db.song_text_backups.length, 0, 'misma letra y mismo tono: no se respalda')
    id = preparar(); assert.equal((await post(await cuerpoCon(id, TEXTO, 'D'))).status, 200); assert.equal(db.song_text_backups.length, 1); assert.deepEqual([db.song_text_backups[0].letra, db.song_text_backups[0].tono_original], [TEXTO, 'G'])
    id = preparar({ letra: null, tono: null, tabla: false }); assert.equal((await post(await cuerpoCon(id, NUEVO))).status, 200, 'una canción sin letra ni tono guarda aunque la tabla no exista: no hay nada que perder')
    id = preparar({ letra: '   ', tono: null, tabla: false }); assert.equal((await post(await cuerpoCon(id, NUEVO))).status, 200, 'solo espacios tampoco cuenta')
    id = preparar({ letra: null, tono: 'G' }); assert.equal((await post(await cuerpoCon(id, NUEVO, 'A'))).status, 200); assert.equal(db.song_text_backups.length, 1, 'un tono previo sí se respalda'); assert.equal(db.song_text_backups[0].letra, null)
  })
  await prueba('SIN LA TABLA (el código se publicó antes que la migración): guardar → 500 con el mensaje claro, campo «respaldo», parcial:false, y NO se escribe nada: ni secciones, ni variantes, ni la canción', async () => {
    for (const modo of ['sin-tabla', 'lanza', 'tabla-falla']) {
      const id = preparar({ tabla: true }); falla.modo = modo === 'tabla-falla' ? null : modo; if (modo === 'tabla-falla') estado.fallan.add('song_text_backups')
      const antes = JSON.parse(JSON.stringify([db.songs, db.song_sections, db.song_section_variants])); const c = await cuerpoCon(id, NUEVO, 'A'); estado.escrituras.length = 0
      const r = await post(c); assert.equal(r.status, 500, modo); assert.equal(r.body.error, T.sinRespaldo); assert.equal(r.body.campo, 'respaldo'); assert.equal(r.body.parcial, false)
      assert.equal(estado.escrituras.filter(e => e.tabla !== 'song_text_backups').length, 0, modo + ': ninguna escritura fuera del intento de respaldo'); assert.deepEqual(JSON.parse(JSON.stringify([db.songs, db.song_sections, db.song_section_variants])), antes, modo + ': nada cambió'); assert.equal(db.songs[0].letra, TEXTO); assert.equal(db.song_text_backups.length, 0)
      estado.fallan.clear(); falla.modo = null
    }
  })
  await prueba('al reintentar con la tabla ya creada, el mismo guardado termina bien y respalda; el mensaje del editor sale tal cual y no confunde con un guardado a medias', async () => {
    const id = preparar(); falla.modo = 'sin-tabla'; const c = await cuerpoCon(id, NUEVO, 'A'); assert.equal((await post(c)).status, 500)
    falla.modo = null; const r = await post(c); assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(db.song_text_backups.length, 1); assert.equal(db.songs[0].letra, NUEVO)
    const m = mensajeDeGuardado(500, { error: T.sinRespaldo, campo: 'respaldo', parcial: false }); assert.equal(m.texto, T.sinRespaldo); assert.equal(m.conflicto, false); assert.notEqual(m.texto, T.guardadoIncompleto)
    assert.ok(T.sinRespaldo.includes('no se cambió nada') && T.sinRespaldo.includes('siguen en el editor'))
  })
  await prueba('planificar: el respaldo es la operación 0 y las demás quedan como estaban (mismo orden y número de pasos 1 a 5)', () => {
    const e = { song: { id: 'S', organization_id: 'O', tono_original: 'G', letra: 'vieja' }, secciones: [] }, d = { songId: 'S', tono: 'A', letra: NUEVO, secciones: E.aSecciones({ texto: NUEVO, anclas: [], interludios: [] }), base: 'a'.repeat(32) }
    let n = 0; const ops = G.planificar(e, d, new Date('2026-11-10T00:00:00Z'), () => `id-${++n}-0000000000`)
    assert.equal(ops[0].paso, 0); assert.equal(ops[0].tabla, 'song_text_backups'); assert.deepEqual(ops.slice(1).map(o => o.paso), [1, 2, 4, 5].filter(p => ops.slice(1).some(o => o.paso === p)).reduce((a, p) => a.concat(ops.slice(1).filter(o => o.paso === p).map(() => p)), []), 'el resto sigue en orden de paso')
    const sin = G.planificar({ ...e, song: { ...e.song, letra: NUEVO, tono_original: 'A' } }, d, new Date(), () => 'x'.repeat(10)); assert.ok(!sin.some(o => o.paso === 0))
  })
  await prueba('la migración 055: una tabla con llave a songs (borrar la canción borra sus respaldos), organization_id NOT NULL con el valor por omisión de la organización #1 y llave a organizations (como en 001), RLS activa SIN políticas, índices; sin comentarios ni nada que borre', () => {
    const m = leer('migrations/055-respaldo-letra-tono.sql')
    assert.ok(/create table if not exists public\.song_text_backups/.test(m)); assert.ok(/song_id uuid not null references public\.songs\(id\) on delete cascade/.test(m))
    assert.ok(/organization_id uuid not null default '00000000-0000-0000-0000-000000000001' references public\.organizations\(id\)/.test(m)); assert.ok(/enable row level security/.test(m) && !/create policy/i.test(m))
    assert.ok(/idx_song_text_backups_song/.test(m) && /idx_song_text_backups_organization_id/.test(m)); assert.ok(!/--|\/\*/.test(m), 'sin comentarios'); assert.ok(!/\b(drop|truncate)\b|delete\s+from/i.test(m), 'aditiva')
    assert.ok(/organization_id uuid/.test(leer('migrations/001-organizations.sql')) && /set default '00000000-0000-0000-0000-000000000001'/.test(leer('migrations/001-organizations.sql')), 'el valor por omisión coincide con 001')
    for (const sql of m.split('\n').filter(Boolean)) assert.ok(sql.trim().endsWith(';'), 'una instrucción por línea, cerrada: ' + sql.slice(0, 40))
    assert.ok(!/;\s*$/.test(leer('migrations/055-verificacion.sql').trim()), 'la consulta de verificación va sin punto y coma final')
  })
  terminar()
})
