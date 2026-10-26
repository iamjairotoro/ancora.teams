// Punto 59 en el SERVIDOR: una persona SIN acceso a la biblioteca no recibe nada de la biblioteca en /api/portal/me ni en /api/member-portal.
// Textos «SECRETO_…» puestos en el tono, el bpm, el compás, las notas, los enlaces, la carátula y la letra de las canciones, ninguno puede salir.
// Las notas del BLOQUE y el TONO del bloque (dato del servicio) sí van a quien confirmó; el líder viaja solo como `lead_es_yo` (booleano calculado en el servidor), nunca `lead_id`. Correr: `npm run test:portal`.
const { assert, estado, mundo, llamar, prueba, terminar, correr, ID } = require('./_banco')

const PROHIBIDAS = ['lead_id', 'tono_original', 'bpm', 'compas', 'link_spotify', 'link_letras', 'link_recursos', 'caratula_url', 'letra', 'spotify_url', 'apple_music_url']
const claves = (x, acc = new Set()) => { if (Array.isArray(x)) x.forEach(v => claves(v, acc)); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { acc.add(k); claves(v, acc) } return acc }
const BLANCA = new Set(['id', 'service_id', 'orden', 'tipo', 'titulo', 'duracion_min', 'notas', 'tono', 'song_id', 'lead', 'lead_es_yo', 'song'])      // lo que sí viaja de cada bloque sin acceso (songColumns.ts)

correr(async () => {
  console.log('punto 59: SIN acceso a la biblioteca no se filtra nada de la biblioteca')
  for (const [nombre, modo] of [['/api/portal/me', 'me'], ['/api/member-portal', 'mp']]) await prueba(`${nombre}: ni un texto secreto ni una clave de la biblioteca (tono_original, bpm, compas, enlaces, carátula, letra, notas de la canción)`, async () => {
    mundo(); estado.acceso = false; const r = await llamar(modo); assert.equal(r.status, 200); assert.equal(r.body.libraryAccess, false)
    const txt = JSON.stringify(r.body), colado = txt.match(/SECRETO\w*|SECRETA\w*|987654|123456/); assert.ok(!colado, 'se coló: ' + (colado && colado[0]))
    const ks = claves(r.body); for (const p of PROHIBIDAS) assert.ok(!ks.has(p), `clave prohibida «${p}» en ${nombre}`)
    assert.ok(txt.includes('NOTA_DEL_BLOQUE_QUE_SI_VA'), 'las notas del bloque deben ir')
    assert.ok([...r.body.services, ...(r.body.ensayos || [])].filter(x => x.setlist.length).length >= 2, 'la prueba debe tener setlists con qué probar') })

  await prueba('lista blanca: cada bloque del setlist trae solo id, service_id, orden, tipo, titulo, duracion_min, notas y tono (del bloque), song_id, lead, lead_es_yo y song{id, nombre, artista}', async () => {
    mundo(); estado.acceso = false
    for (const modo of ['me', 'mp']) for (const e of (await llamar(modo)).body.services) for (const b of e.setlist) {
      for (const k of Object.keys(b)) assert.ok(BLANCA.has(k), `${modo}: clave fuera de la lista blanca «${k}»`)
      if (b.song) for (const k of Object.keys(b.song)) assert.ok(['id', 'nombre', 'artista'].includes(k), `${modo}: song.${k}`) } })

  await prueba('el sondeo SÍ detecta: la misma persona CON acceso recibe esos textos (si no, las pruebas de arriba no probarían nada)', async () => {
    for (const modo of ['me', 'mp']) { mundo(); estado.acceso = true; const txt = JSON.stringify((await llamar(modo)).body)
      for (const x of ['SECRETO_TONO_ORIGINAL', 'SECRETO_COMPAS', 'SECRETO_NOTAS_DE_LA_CANCION', 'SECRETO_CARATULA', 'SECRETO_LINK_YOUTUBE']) assert.ok(txt.includes(x), `${modo} CON acceso debería traer ${x}`)
      assert.ok(!txt.includes('SECRETA_LETRA'), 'la letra nunca viaja en estas rutas, ni con acceso (se pide de una canción a la vez)') } })

  await prueba('el TONO del bloque es dato del servicio: llega a quien confirmó aunque no tenga biblioteca; el BPM, el tono original y lo demás de la canción no', async () => {
    for (const modo of ['me', 'mp']) { mundo(); estado.acceso = false; const r = (await llamar(modo)).body, txt = JSON.stringify(r)
      assert.ok(txt.includes('TONO_DEL_SERVICIO_G'), `${modo}: el tono del servicio debe llegar sin biblioteca`)
      for (const e of r.services) for (const b of e.setlist) if (b.tipo === 'cancion') assert.equal(b.tono, 'TONO_DEL_SERVICIO_G')
      for (const e of r.services) for (const b of e.setlist) if (b.song) { assert.ok(!('bpm' in b.song) && !('tono_original' in b.song), `${modo}: la canción trae ${Object.keys(b.song)}`) } } })

  await prueba('«lo lidero yo»: el servidor manda un booleano (lead_es_yo), con y sin biblioteca; nunca el id del líder; solo es true en las canciones que lidera quien consulta', async () => {
    for (const acceso of [false, true]) for (const modo of ['me', 'mp']) {
      mundo(); estado.acceso = acceso; const r = (await llamar(modo)).body, bloques = r.services.flatMap(e => e.setlist)
      assert.ok(bloques.length >= 2); assert.ok(bloques.every(b => typeof b.lead_es_yo === 'boolean'), `${modo}/${acceso}: falta lead_es_yo`)
      const mios = bloques.filter(b => b.lead_es_yo); assert.ok(mios.length >= 1, `${modo}/${acceso}: debería haber una canción liderada por mí`)
      assert.ok(bloques.some(b => !b.lead_es_yo && b.lead && b.lead.nombre), 'hay canciones lideradas por otra persona: lead_es_yo = false y solo viaja su nombre')
      if (!acceso) { const txt = JSON.stringify(r); assert.ok(!txt.includes('lead_id'), 'sin biblioteca no viaja lead_id'); assert.ok(!JSON.stringify(bloques).includes(ID.O1), 'ni el id del otro líder en el setlist') }
      else for (const b of bloques) assert.equal(b.lead_es_yo, b.lead_id === ID.ME, 'con biblioteca el booleano coincide con lead_id') } })

  await prueba('tampoco se ensancha lo que ve el enlace: la invitación sigue recortada (sin member_id ni datos del correo)', async () => {
    mundo(); estado.acceso = true; const r = (await llamar('mp')).body
    for (const e of r.services) assert.deepEqual(Object.keys(e.invitation).sort(), ['comentario', 'declined_reason', 'id', 'needs_reassignment_confirm', 'sent_at', 'status', 'token'])
    for (const e of r.ensayos) assert.deepEqual(Object.keys(e.invitation).sort(), ['comentario', 'sent_at', 'status', 'token']) })
  terminar()
})
