// Subida de un archivo a una canción desde la administración (punto 55, paso 4): valida, sube con un tipo CANÓNICO y registra la fila.
// El cliente de Supabase se inyecta (las pruebas usan uno falso). El tipo con el que se sube NUNCA es el que declara el navegador
// (iOS declara los .m4a como audio/x-m4a y, a veces, nada): sale de la extensión (lib/subidaArchivos.ts) y es siempre uno de los que
// aceptan los buckets (migración 036: song-audio; migrations/036b: song-attachments), así la subida no choca con sus restricciones.
import { BYTES_CABECERA, mensajeDeErrorSubida, rutaAdjunto, rutaAudio, validarArchivo, type DestinoSubida } from './subidaArchivos'

export interface ClienteSubida {
  storage: { from(bucket: string): {
    upload(ruta: string, archivo: unknown, opciones: { upsert: boolean; contentType: string }): PromiseLike<{ error: { message?: string; statusCode?: string | number } | null }>
    remove(rutas: string[]): PromiseLike<unknown>
  } }
  from(tabla: string): { insert(fila: Record<string, unknown>): PromiseLike<{ error: { message?: string } | null }> }
}

export interface ArchivoASubir { name: string; size: number; slice(desde: number, hasta: number): { arrayBuffer(): Promise<ArrayBuffer> } }

export type ResultadoSubida = { ok: true; kind: 'audio' | 'pdf' | 'image'; bucket: DestinoSubida; ruta: string } | { ok: false; mensaje: string }

export async function subirAdjunto(cliente: ClienteSubida, o: {
  archivo: ArchivoASubir
  songId: string
  memberId: string | null
  organizationId: string
  ahora?: () => number
}): Promise<ResultadoSubida> {
  const v = validarArchivo(o.archivo, new Uint8Array(await o.archivo.slice(0, BYTES_CABECERA).arrayBuffer()))
  if (!v.ok) return { ok: false, mensaje: v.mensaje }

  const marca = (o.ahora ?? Date.now)()
  // La organización va por delante en la ruta del audio (las políticas de la 036 la comparan); PDF e imágenes siguen en {song_id}/…
  const ruta = v.bucket === 'song-audio' ? rutaAudio(o.organizationId, o.songId, o.archivo.name, marca) : rutaAdjunto(o.songId, o.archivo.name, marca)

  const sube = await cliente.storage.from(v.bucket).upload(ruta, o.archivo, { upsert: false, contentType: v.contentType })
  if (sube.error) return { ok: false, mensaje: mensajeDeErrorSubida(sube.error, v.bucket) }

  const fila: Record<string, unknown> = { song_id: o.songId, kind: v.kind, url: ruta, filename: o.archivo.name, size: o.archivo.size, uploaded_by: o.memberId }
  if (v.bucket === 'song-audio') fila.bucket = 'song-audio'     // solo el audio manda `bucket`: los PDF no dependen de la migración 036
  const ins = await cliente.from('song_attachments').insert(fila)
  if (ins.error) {
    await cliente.storage.from(v.bucket).remove([ruta])          // no dejar un archivo huérfano si no se pudo registrar
    return { ok: false, mensaje: v.bucket === 'song-audio' ? 'No se pudo registrar el audio (¿corriste la migración 036?). El archivo no se guardó.' : 'No se pudo registrar el adjunto. El archivo no se guardó.' }
  }
  return { ok: true, kind: v.kind, bucket: v.bucket, ruta }
}
