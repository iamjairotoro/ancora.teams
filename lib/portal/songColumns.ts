// Columnas de `songs` que el portal puede recibir (en vez de `select *`, que mandaría también lo
// interno). Solo servidor la consume; es una lista de nombres, sin lógica.
//
//  · SONG_CATALOG_COLUMNS  el catálogo del portal (/api/all-songs, pestaña Canciones): lo que muestra
//                          la ficha de cada canción (tono, BPM, compás, duración, enlaces y notas).
//  · SONG_SETLIST_COLUMNS  las canciones de un setlist (/api/portal/me → detalle del servicio): las
//                          del catálogo MÁS las que ServicioDetalle lee de verdad y el catálogo no:
//                          spotify_url, apple_music_url y caratula_url.
export const SONG_CATALOG_COLUMNS =
  'id, nombre, artista, tono_original, bpm, compas, link_spotify, link_letras, link_recursos, duracion_min, notas'

export const SONG_SETLIST_COLUMNS = `${SONG_CATALOG_COLUMNS}, spotify_url, apple_music_url, caratula_url`

// Punto 59 — lo que recibe quien NO tiene acceso a la biblioteca: de cada bloque del setlist solo el detalle
// del servicio (orden, tipo, título, duración, notas DEL BLOQUE y quién lo dirige) y de la canción solo id,
// nombre y artista. Lista BLANCA a propósito: una columna nueva de service_blocks o de songs no se cuela.
// Quedan fuera service_blocks.tono y, de la canción, tono, BPM, compás, enlaces, carátula y notas.
// Sin acceso, NO se manda nada más: esta función se aplica en el servidor, antes de responder.
export function setlistWithoutLibrary(blocks: any[] | null | undefined): any[] {
  return (blocks || []).map(b => ({
    id: b.id, service_id: b.service_id, orden: b.orden, tipo: b.tipo, titulo: b.titulo,
    duracion_min: b.duracion_min, notas: b.notas, song_id: b.song_id, lead: b.lead ?? null,
    song: b.song ? { id: b.song.id, nombre: b.song.nombre, artista: b.song.artista } : null,
  }))
}
