// Subida de un archivo a una canción desde la administración (punto 55, paso 4 + ajuste de Claudia): valida, sube con un tipo CANÓNICO y registra la
// fila. La subida va a una URL firmada (createSignedUploadUrl) con XMLHttpRequest para tener progreso REAL (lib/subidaConProgreso.ts).
// El cliente de Supabase y el XHR se inyectan (las pruebas usan falsos). El tipo con el que se sube NUNCA es el que declara el navegador
// (iOS declara los .m4a como audio/x-m4a y, a veces, nada): sale de la extensión (lib/subidaArchivos.ts) y es siempre uno de los que
// aceptan los buckets (migración 036: song-audio; migrations/036b: song-attachments), así la subida no choca con sus restricciones.
import { BYTES_CABECERA, mensajeDeErrorSubida, rutaAdjunto, rutaAudio, validarArchivo, type DestinoSubida } from './subidaArchivos'
import { subirConXhr, type XhrLike } from './subidaConProgreso'

export interface ClienteSubida {
  storage: { from(bucket: string): {
    createSignedUploadUrl(ruta: string): PromiseLike<{ data: { signedUrl: string; token: string; path: string } | null; error: { message?: string; statusCode?: string | number } | null }>
    remove(rutas: string[]): PromiseLike<unknown>
  } }
  from(tabla: string): { insert(fila: Record<string, unknown>): PromiseLike<{ error: { message?: string } | null }> }
}

export interface ArchivoASubir {
  name: string
  size: number
  slice(desde: number, hasta?: number, tipo?: string): Blob
}

export type ResultadoSubida =
  | { ok: true; kind: 'audio' | 'pdf' | 'image'; bucket: DestinoSubida; ruta: string }
  | { ok: false; mensaje: string; cancelado?: boolean; reintentable?: boolean }

export async function subirAdjunto(cliente: ClienteSubida, o: {
  archivo: ArchivoASubir
  songId: string
  memberId: string | null
  organizationId: string
  ahora?: () => number
  /** Cabeceras públicas de la API (apikey) para la petición XHR: supabase-js las pone solo, el XHR no. */
  headers?: Record<string, string>
  senal?: AbortSignal
  onProgreso?: (bytes: number, total: number) => void
  /** Se avisa al terminar de subir los bytes y empezar a registrar la fila. */
  onRegistrando?: () => void
  crearXhr?: () => XhrLike
}): Promise<ResultadoSubida> {
  const v = validarArchivo(o.archivo, new Uint8Array(await o.archivo.slice(0, BYTES_CABECERA).arrayBuffer()))
  if (!v.ok) return { ok: false, mensaje: v.mensaje, reintentable: false }   // tipo o tamaño no válidos: repetirlo falla igual
  if (o.senal?.aborted) return { ok: false, mensaje: 'Subida cancelada.', cancelado: true }

  const marca = (o.ahora ?? Date.now)()
  // La organización va por delante en la ruta del audio (las políticas de la 036 la comparan); PDF e imágenes siguen en {song_id}/…
  const ruta = v.bucket === 'song-audio' ? rutaAudio(o.organizationId, o.songId, o.archivo.name, marca) : rutaAdjunto(o.songId, o.archivo.name, marca)
  const almacen = cliente.storage.from(v.bucket)

  // La URL firmada de subida solo se concede a quien tendría permiso para subir (mismas políticas que un upload directo).
  const firma = await almacen.createSignedUploadUrl(ruta)
  if (firma.error || !firma.data?.signedUrl) return { ok: false, mensaje: mensajeDeErrorSubida(firma.error ?? { message: 'sin url' }, v.bucket) }
  if (o.senal?.aborted) return { ok: false, mensaje: 'Subida cancelada.', cancelado: true }

  // El tipo viaja en el propio Blob (la parte del archivo en el FormData): se fija el CANÓNICO.
  const sube = await subirConXhr({
    url: firma.data.signedUrl, archivo: o.archivo.slice(0, o.archivo.size, v.contentType), headers: o.headers,
    senal: o.senal, onProgreso: o.onProgreso, crearXhr: o.crearXhr,
  })
  if (!sube.ok) {
    if (sube.cancelado) { await almacen.remove([ruta]); return { ok: false, mensaje: 'Subida cancelada.', cancelado: true } }   // por si el servidor alcanzó a guardarlo
    if (sube.status === 0) return { ok: false, mensaje: 'Se cortó la conexión mientras se subía el archivo. Inténtalo de nuevo.' }
    return { ok: false, mensaje: mensajeDeErrorSubida({ message: sube.mensaje, statusCode: sube.status }, v.bucket) }
  }

  o.onRegistrando?.()
  const fila: Record<string, unknown> = { song_id: o.songId, kind: v.kind, url: ruta, filename: o.archivo.name, size: o.archivo.size, uploaded_by: o.memberId }
  if (v.bucket === 'song-audio') fila.bucket = 'song-audio'     // solo el audio manda `bucket`: los PDF no dependen de la migración 036
  const ins = await cliente.from('song_attachments').insert(fila)
  if (ins.error) {
    await almacen.remove([ruta])                                  // no dejar un archivo huérfano si no se pudo registrar
    return { ok: false, mensaje: v.bucket === 'song-audio' ? 'No se pudo registrar el audio (¿corriste la migración 036?). El archivo no se guardó.' : 'No se pudo registrar el adjunto. El archivo no se guardó.' }
  }
  return { ok: true, kind: v.kind, bucket: v.bucket, ruta }
}
