// Foto de perfil del PORTAL. El servidor valida (solo imágenes, tipo comprobado por los
// primeros bytes —no por lo que declare el navegador—, máximo 2 MB), sube con la llave de
// servicio con un nombre ALEATORIO y guarda la dirección en members.avatar_url. Las fotos
// que ya existen conservan su dirección; la anterior se borra solo si era de esta persona.
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024
const BUCKET = 'avatars'

function sniff(b: Buffer): { ext: string; type: string } | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' }
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' }
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', type: 'image/webp' }
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { memberId } = auth.identity

  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > MAX_BYTES + 64 * 1024) return portalJson({ error: 'La imagen debe pesar menos de 2 MB' }, 413)
  let file: FormDataEntryValue | null = null
  try { file = (await req.formData()).get('file') } catch { return portalJson({ error: 'Datos no válidos' }, 400) }
  if (!file || typeof file === 'string') return portalJson({ error: 'Falta la imagen' }, 400)
  if (file.size > MAX_BYTES) return portalJson({ error: 'La imagen debe pesar menos de 2 MB' }, 413)
  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.length > MAX_BYTES) return portalJson({ error: 'La imagen debe pesar menos de 2 MB' }, 413)
  const kind = sniff(bytes)
  if (!kind) return portalJson({ error: 'Solo se aceptan imágenes JPG, PNG o WebP' }, 400)

  const admin = createAdminSupabase()
  const path = `${memberId}/${randomUUID()}.${kind.ext}`
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false })
  if (up.error) return portalJson({ error: 'No se pudo subir la imagen' }, 500)
  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

  const { data: before } = await admin.from('members').select('avatar_url').eq('id', memberId).maybeSingle()
  const { error } = await admin.from('members').update({ avatar_url: url }).eq('id', memberId)
  if (error) {
    await admin.storage.from(BUCKET).remove([path]) // no dejar una foto huérfana
    return portalJson({ error: 'No se pudo guardar la imagen' }, 500)
  }

  // La foto anterior: solo si está en este bucket y es de ESTA persona (`<id>/…` o el nombre
  // antiguo `<id>.<ext>`); nunca una ruta que no pueda atribuirse a ella.
  const old = String(before?.avatar_url || '').split('?')[0]
  const marker = `/${BUCKET}/`
  const i = old.indexOf(marker)
  if (i >= 0) {
    let oldPath = ''
    try { oldPath = decodeURIComponent(old.slice(i + marker.length)) } catch {}
    if (oldPath && oldPath !== path && (oldPath.startsWith(`${memberId}/`) || oldPath.startsWith(`${memberId}.`))) {
      await admin.storage.from(BUCKET).remove([oldPath]).catch(() => {})
    }
  }
  return portalJson({ avatar_url: url })
}
