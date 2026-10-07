// Preferencia de tema del PORTAL (members.theme: 'light' | 'dark' | null = Sistema). Solo el
// portal usa esta ruta; la administración sigue guardando directo con su sesión de Google.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase().from('members').select('theme').eq('id', auth.identity.memberId).maybeSingle()
  if (error) return portalJson({ error: 'No se pudo leer' }, 500)
  return portalJson({ theme: data?.theme === 'light' || data?.theme === 'dark' ? data.theme : null })
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const body = await req.json().catch(() => null)
  const theme = body?.theme
  if (theme !== 'light' && theme !== 'dark' && theme !== null) return portalJson({ error: 'Valor no válido' }, 400)
  const { error } = await createAdminSupabase().from('members').update({ theme }).eq('id', auth.identity.memberId)
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
