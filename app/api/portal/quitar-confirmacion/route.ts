// «Quitar mi confirmación» (punto 52): la convocatoria vuelve a pendiente y SOLO vuelven las que esa confirmación había desplazado. El cliente manda
// únicamente { invitacion }; la persona sale de requirePortalIdentity. La lógica vive en la base (migración 037c: quitar_confirmacion).
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { ejecutarAccionConflicto } from '@/lib/portal/conflicto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const r = await ejecutarAccionConflicto(createAdminSupabase(), 'quitar-confirmacion', auth.identity.memberId, b?.invitacion)
  return portalJson(r.body, r.status)
}
