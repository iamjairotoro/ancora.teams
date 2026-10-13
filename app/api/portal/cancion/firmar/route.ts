// Firma AL PULSAR el enlace de un adjunto de una canción (punto 55, commit 3; regla 14: los enlaces se firman al pulsar, no al cargar
// una lista). Exige identidad del portal CON ACCESO A LA BIBLIOTECA (punto 59) o sesión de administración, y comprueba que el
// adjunto sea DE ESA canción. Hoy solo PDFs. La llave de servicio vive solo en este archivo (servidor); al cliente solo le llega la
// URL firmada, que vence en 5 minutos. Nunca se devuelve la ruta del archivo.
// POST { songId, attachmentId }  →  { url, expiraEnSeg, nombre, tamano }
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireLibraryAccess } from '@/lib/auth/libraryAccess'
import { BUCKET_ADJUNTOS, TTL_FIRMA_PDF_SEG, esAdjuntoPdf } from '@/lib/portal/adjuntos'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const admin = createAdminSupabase()
  const auth = await requireLibraryAccess(req, admin)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => null)
  const songId = typeof body?.songId === 'string' ? body.songId : ''
  const attachmentId = typeof body?.attachmentId === 'string' ? body.attachmentId : ''
  if (!UUID.test(songId) || !UUID.test(attachmentId)) return json({ error: 'Datos no válidos' }, 400)

  // El adjunto tiene que ser de ESA canción: un id de otra canción (o inventado) no firma nada.
  const { data: fila, error } = await admin.from('song_attachments')
    .select('id, kind, url, filename, size').eq('id', attachmentId).eq('song_id', songId).maybeSingle()
  if (error) return json({ error: 'No se pudo leer' }, 500)
  if (!fila) return json({ error: 'Adjunto no encontrado' }, 404)
  if (!esAdjuntoPdf(fila) || typeof fila.url !== 'string' || !fila.url) return json({ error: 'Por ahora solo se pueden abrir PDFs' }, 415)

  const firmada = await admin.storage.from(BUCKET_ADJUNTOS).createSignedUrl(fila.url, TTL_FIRMA_PDF_SEG)
  if (firmada.error || !firmada.data?.signedUrl) return json({ error: 'No se pudo preparar el archivo' }, 502)
  return json({ url: firmada.data.signedUrl, expiraEnSeg: TTL_FIRMA_PDF_SEG, nombre: fila.filename || 'Partitura.pdf', tamano: typeof fila.size === 'number' ? fila.size : null })
}
