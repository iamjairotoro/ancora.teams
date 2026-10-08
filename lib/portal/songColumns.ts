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
