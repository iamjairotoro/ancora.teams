// «Cambiar» entre dos equipos (punto 4): la persona confirma el equipo que se había declinado solo por el cruce y declina el que tenía confirmado, de forma reversible.
// El cliente manda SOLO los dos ids de convocatoria ({ desde, hacia }); quién es la persona sale de requirePortalIdentity. La lógica vive en la base
// (migración 038: cambiar_convocatoria), que solo ejecuta la llave de servicio.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { ejecutarCambioConvocatoria } from '@/lib/portal/conflicto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const r = await ejecutarCambioConvocatoria(createAdminSupabase(), auth.identity.memberId, b?.desde, b?.hacia)
  return portalJson(r.body, r.status)
}
