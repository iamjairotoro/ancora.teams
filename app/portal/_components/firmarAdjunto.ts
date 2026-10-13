// Pide al servidor una URL firmada NUEVA de un adjunto de una canción (punto 55): se llama AL PULSAR, nunca al cargar una lista (regla 14).
// POST /api/portal/cancion/firmar exige acceso a la biblioteca y que el adjunto sea de esa canción. Lanza con un mensaje que se pueda mostrar.
import { portalFetch } from '@/lib/portal/portalFetch'

export async function firmarAdjunto(token: string | null, songId: string, attachmentId: string): Promise<{ url: string; expiraEnSeg: number }> {
  let res: Response
  try {
    res = await portalFetch(token, '/api/portal/cancion/firmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId, attachmentId }) })
  } catch { throw new Error('Sin conexión') }
  const data = await res.json().catch(() => null)
  if (!res.ok || typeof data?.url !== 'string') throw new Error(data?.error || 'No se pudo preparar el archivo')
  return { url: data.url, expiraEnSeg: typeof data.expiraEnSeg === 'number' ? data.expiraEnSeg : 300 }
}
