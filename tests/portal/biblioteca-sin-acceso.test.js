// Punto 59 en el SERVIDOR: una persona SIN acceso a la biblioteca no recibe nada de la biblioteca en /api/portal/me ni en /api/member-portal.
// Textos «SECRETO_…» puestos en el tono, el bpm, el compás, las notas, los enlaces, la carátula y la letra de las canciones, y en service_blocks.tono: ninguno puede salir.
// Las notas del BLOQUE sí van (son para todos los asignados). Correr: `npm run test:portal`.
const { assert, estado, mundo, llamar, prueba, terminar, correr } = require('./_banco')

const PROHIBIDAS = ['tono', 'tono_original', 'bpm', 'compas', 'link_spotify', 'link_letras', 'link_recursos', 'caratula_url', 'letra', 'spotify_url', 'apple_music_url']
const claves = (x, acc = new Set()) => { if (Array.isArray(x)) x.forEach(v => claves(v, acc)); else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { acc.add(k); claves(v, acc) } return acc }
const BLANCA = new Set(['id', 'service_id', 'orden', 'tipo', 'titulo', 'duracion_min', 'notas', 'song_id', 'lead', 'song'])      // lo que sí viaja de cada bloque sin acceso (songColumns.ts)

correr(async () => {
  console.log('punto 59: SIN acceso a la biblioteca no se filtra nada de la biblioteca')
  for (const [nombre, modo] of [['/api/portal/me', 'me'], ['/api/member-portal', 'mp']]) await prueba(`${nombre}: ni un texto secreto ni una clave de la biblioteca (tono, tono_original, bpm, compas, enlaces, carátula, letra, notas de la canción)`, async () => {
    mundo(); estado.acceso = false; const r = await llamar(modo); assert.equal(r.status, 200); assert.equal(r.body.libraryAccess, false)
    const txt = JSON.stringify(r.body), colado = txt.match(/SECRETO\w*|SECRETA\w*|987654|123456/); assert.ok(!colado, 'se coló: ' + (colado && colado[0]))
    const ks = claves(r.body); for (const p of PROHIBIDAS) assert.ok(!ks.has(p), `clave prohibida «${p}» en ${nombre}`)
    assert.ok(txt.includes('NOTA_DEL_BLOQUE_QUE_SI_VA'), 'las notas del bloque deben ir')
    assert.ok([...r.body.services, ...(r.body.ensayos || [])].filter(x => x.setlist.length).length >= 2, 'la prueba debe tener setlists con qué probar') })

  await prueba('lista blanca: cada bloque del setlist trae solo id, service_id, orden, tipo, titulo, duracion_min, notas (del bloque), song_id, lead y song{id, nombre, artista}', async () => {
    mundo(); estado.acceso = false
    for (const modo of ['me', 'mp']) for (const e of (await llamar(modo)).body.services) for (const b of e.setlist) {
      for (const k of Object.keys(b)) assert.ok(BLANCA.has(k), `${modo}: clave fuera de la lista blanca «${k}»`)
      if (b.song) for (const k of Object.keys(b.song)) assert.ok(['id', 'nombre', 'artista'].includes(k), `${modo}: song.${k}`) } })

  await prueba('el sondeo SÍ detecta: la misma persona CON acceso recibe esos textos (si no, las pruebas de arriba no probarían nada)', async () => {
    for (const modo of ['me', 'mp']) { mundo(); estado.acceso = true; const txt = JSON.stringify((await llamar(modo)).body)
      for (const x of ['SECRETO_TONO_DEL_BLOQUE', 'SECRETO_TONO_ORIGINAL', 'SECRETO_COMPAS', 'SECRETO_NOTAS_DE_LA_CANCION', 'SECRETO_CARATULA', 'SECRETO_LINK_YOUTUBE']) assert.ok(txt.includes(x), `${modo} CON acceso debería traer ${x}`)
      assert.ok(!txt.includes('SECRETA_LETRA'), 'la letra nunca viaja en estas rutas, ni con acceso (se pide de una canción a la vez)') } })

  await prueba('tampoco se ensancha lo que ve el enlace: la invitación sigue recortada (sin member_id ni datos del correo)', async () => {
    mundo(); estado.acceso = true; const r = (await llamar('mp')).body
    for (const e of r.services) assert.deepEqual(Object.keys(e.invitation).sort(), ['comentario', 'declined_reason', 'id', 'needs_reassignment_confirm', 'sent_at', 'status', 'token'])
    for (const e of r.ensayos) assert.deepEqual(Object.keys(e.invitation).sort(), ['comentario', 'sent_at', 'status', 'token']) })
  terminar()
})
