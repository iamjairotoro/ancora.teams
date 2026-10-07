// El servidor escribe `last_seen` e `instalado_pwa_at` (antes los escribía el navegador con la
// llave pública). Solo toca a la persona identificada; el cliente no manda ningún id.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { memberId } = auth.identity
  const body = await req.json().catch(() => ({}))
  const admin = createAdminSupabase()
  const now = new Date().toISOString()

  const seen = await admin.from('members').update({ last_seen: now }).eq('id', memberId)
  if (seen.error) return portalJson({ error: 'No se pudo guardar' }, 500)
  // La app corre «instalada» (pantalla de inicio): se registra UNA vez (solo si aún es null).
  if (body?.standalone === true) {
    const pwa = await admin.from('members').update({ instalado_pwa_at: now }).eq('id', memberId).is('instalado_pwa_at', null)
    if (pwa.error) return portalJson({ error: 'No se pudo guardar' }, 500)
  }
  return portalJson({ ok: true })
}
