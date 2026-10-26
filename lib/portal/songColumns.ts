// Columnas de `songs` que el portal puede recibir (en vez de `select *`, que mandaría también lo
// interno). Solo servidor la consume; es una lista de nombres, sin lógica.
//
//  · SONG_CATALOG_COLUMNS  el catálogo del portal (/api/all-songs, pestaña Canciones): lo que muestra
//                          la ficha de cada canción (tono, BPM, compás, duración, enlaces y notas).
//  · SONG_SETLIST_COLUMNS  las canciones de un setlist (/api/portal/me → detalle del servicio): las
//                          del catálogo MÁS la que ServicioDetalle lee de verdad y el catálogo no:
//                          caratula_url. (spotify_url y apple_music_url ya no se mandan: el portal no
//                          muestra Spotify ni Apple Music; las columnas siguen en la base, sin tocar.)
export const SONG_CATALOG_COLUMNS =
  'id, nombre, artista, tono_original, bpm, compas, link_spotify, link_letras, link_recursos, duracion_min, notas'

// Punto 55 — la hoja de letra del portal (/api/portal/cancion): lo que LyricSheet dibuja y nada más. La letra y los créditos
// legales NO van en el catálogo (/api/all-songs): se piden de una canción a la vez y solo con acceso a la biblioteca.
export const SONG_LYRIC_COLUMNS = 'id, nombre, original_title, autor, traductor, letra, ccli, copyright'

export const SONG_SETLIST_COLUMNS = `${SONG_CATALOG_COLUMNS}, caratula_url`

// Punto 59 — lo que recibe quien NO tiene acceso a la biblioteca: de cada bloque del setlist solo el detalle
// del servicio (orden, tipo, título, duración, notas DEL BLOQUE, el TONO del bloque y quién lo dirige) y de la canción solo id,
// nombre y artista. Lista BLANCA a propósito: una columna nueva de service_blocks o de songs no se cuela.
// El tono del bloque (service_blocks.tono) es dato DEL SERVICIO —lo que se toca ese día—, no de la biblioteca: llega a quien está convocado y confirmó.
// Quedan fuera, de la canción, tono original, BPM, compás, enlaces, carátula y notas; y del bloque, `lead_id` (ningún id nuevo sale del servidor).
// «¿Lo lidera quien consulta?» se calcula AQUÍ, en el servidor, y viaja como un booleano (`lead_es_yo`); `lead` sigue siendo solo el nombre.
// Sin acceso, NO se manda nada más: esta función se aplica en el servidor, antes de responder.
export function setlistWithoutLibrary(blocks: any[] | null | undefined, memberId?: string | null): any[] {
  return (blocks || []).map(b => ({
    id: b.id, service_id: b.service_id, orden: b.orden, tipo: b.tipo, titulo: b.titulo,
    duracion_min: b.duracion_min, notas: b.notas, tono: b.tono ?? null, song_id: b.song_id, lead: b.lead ?? null,
    lead_es_yo: liderEsYo(b, memberId),
    song: b.song ? { id: b.song.id, nombre: b.song.nombre, artista: b.song.artista } : null,
  }))
}

/** ¿La canción (bloque) la lidera la persona que consulta? Un booleano; nunca el id del líder. */
export const liderEsYo = (b: any, memberId?: string | null): boolean => !!memberId && !!b?.lead_id && b.lead_id === memberId

/** Con acceso a la biblioteca el bloque viaja completo (como siempre) y además trae `lead_es_yo`. */
export const setlistWithLibrary = (blocks: any[] | null | undefined, memberId?: string | null): any[] => (blocks || []).map(b => ({ ...b, lead_es_yo: liderEsYo(b, memberId) }))
