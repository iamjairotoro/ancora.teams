// Adjuntos de una canción para el portal (punto 55, commit 3). Hoy SOLO PDFs. Funciones puras: el servidor las usa para decidir qué
// adjuntos se muestran y qué datos salen (la ruta del archivo en el almacenamiento NUNCA sale: solo la firma, al pulsar «Ver»).

/** Bucket privado de los PDF y las imágenes (creado a mano en el panel; tope opcional en migrations/036b). */
export const BUCKET_ADJUNTOS = 'song-attachments'
/** Bucket privado del audio propio (migración 036: 20 MB, solo mp3 / m4a / aac; ruta {organization_id}/{song_id}/{archivo}). */
export const BUCKET_AUDIO = 'song-audio'
/** Los únicos buckets que se firman: lo que diga la base nunca elige un bucket fuera de esta lista. */
export const BUCKETS_FIRMABLES: readonly string[] = [BUCKET_ADJUNTOS, BUCKET_AUDIO]
/** Vencimiento de la URL firmada de un PDF: se descarga ENTERO al abrir, así que 5 minutos sobran. */
export const TTL_FIRMA_PDF_SEG = 300
/** Vencimiento de la URL firmada de un audio: dura lo que dura escucharlo; si vence a mitad, el cliente vuelve a firmar (lib/audioFirma.ts). */
export const TTL_FIRMA_AUDIO_SEG = 3600

export const SONG_ATTACHMENT_COLUMNS = 'id, kind, filename, size, created_at, uploaded_by_member:members(nombre)'

export interface AdjuntoCrudo {
  id: string
  kind?: string | null
  filename?: string | null
  size?: number | null
  created_at?: string | null
  uploaded_by_member?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

/** Lo que sabe el cliente de un adjunto: nunca la ruta ni una URL. */
export interface AdjuntoPublico { id: string; nombre: string; tamano: number | null; subidoPor: string | null; fecha: string | null }

/** ¿Es un PDF? Por `kind` (así lo guarda la administración) o, para archivos viejos sin tipo, por la extensión. */
export function esAdjuntoPdf(a: { kind?: string | null; filename?: string | null }): boolean {
  if (a.kind === 'pdf') return true
  return a.kind === 'file' && /\.pdf$/i.test(a.filename || '')
}

export function adjuntoPublico(a: AdjuntoCrudo, nombrePorDefecto = 'Partitura.pdf'): AdjuntoPublico {
  const quien = Array.isArray(a.uploaded_by_member) ? a.uploaded_by_member[0] : a.uploaded_by_member
  return {
    id: a.id,
    nombre: (a.filename || nombrePorDefecto).slice(0, 200),
    tamano: typeof a.size === 'number' && a.size >= 0 ? a.size : null,
    subidoPor: quien?.nombre ? String(quien.nombre).slice(0, 60) : null,
    fecha: a.created_at || null,
  }
}

export const soloPdfs = (filas: AdjuntoCrudo[] | null | undefined): AdjuntoPublico[] =>
  (filas || []).filter(esAdjuntoPdf).map(a => adjuntoPublico(a))

/** ¿Es un audio propio (archivo subido, no un enlace)? */
export const esAdjuntoAudio = (a: { kind?: string | null }): boolean => a.kind === 'audio'

/**
 * En qué bucket está el archivo. `song_attachments.bucket` (migración 036) manda si es uno de los firmables; sin la columna (la
 * migración aún no corrió) o con un valor raro, es el bucket de siempre. Un bucket que no esté en la lista NUNCA se firma.
 */
export function bucketDe(fila: { bucket?: string | null }): string {
  return typeof fila.bucket === 'string' && BUCKETS_FIRMABLES.includes(fila.bucket) ? fila.bucket : BUCKET_ADJUNTOS
}

export type TipoFirmable = 'pdf' | 'audio'
/** Qué se puede firmar de una fila y por cuánto tiempo; null = no se firma (enlaces, imágenes...). */
export function firmaDe(fila: { kind?: string | null; filename?: string | null; bucket?: string | null }): { tipo: TipoFirmable; bucket: string; ttl: number } | null {
  if (esAdjuntoPdf(fila)) return { tipo: 'pdf', bucket: BUCKET_ADJUNTOS, ttl: TTL_FIRMA_PDF_SEG }   // los PDF viven en song-attachments
  if (esAdjuntoAudio(fila)) return { tipo: 'audio', bucket: bucketDe(fila), ttl: TTL_FIRMA_AUDIO_SEG }
  return null
}

/** Los audios propios de la canción (metadatos, nunca rutas ni URLs): el reproductor firma al dar play. */
export const soloAudios = (filas: AdjuntoCrudo[] | null | undefined): AdjuntoPublico[] =>
  (filas || []).filter(esAdjuntoAudio).map(a => adjuntoPublico(a, 'Audio'))
