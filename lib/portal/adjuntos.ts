// Adjuntos de una canción para el portal (punto 55, commit 3). Hoy SOLO PDFs. Funciones puras: el servidor las usa para decidir qué
// adjuntos se muestran y qué datos salen (la ruta del archivo en el almacenamiento NUNCA sale: solo la firma, al pulsar «Ver»).

/** Bucket privado de los PDF y las imágenes (creado a mano en el panel; límites en el bloque opcional de la migración 036). */
export const BUCKET_ADJUNTOS = 'song-attachments'
/** Vencimiento de la URL firmada de un PDF: se descarga ENTERO al abrir, así que 5 minutos sobran. */
export const TTL_FIRMA_PDF_SEG = 300

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

export function adjuntoPublico(a: AdjuntoCrudo): AdjuntoPublico {
  const quien = Array.isArray(a.uploaded_by_member) ? a.uploaded_by_member[0] : a.uploaded_by_member
  return {
    id: a.id,
    nombre: (a.filename || 'Partitura.pdf').slice(0, 200),
    tamano: typeof a.size === 'number' && a.size >= 0 ? a.size : null,
    subidoPor: quien?.nombre ? String(quien.nombre).slice(0, 60) : null,
    fecha: a.created_at || null,
  }
}

export const soloPdfs = (filas: AdjuntoCrudo[] | null | undefined): AdjuntoPublico[] =>
  (filas || []).filter(esAdjuntoPdf).map(adjuntoPublico)
