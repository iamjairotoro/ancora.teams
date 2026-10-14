// «Aceptar aquí en su lugar» (punto 52): la persona deja el equipo donde ya había confirmado (sus posiciones quedan vacantes) y confirma en este.
// El cliente manda SOLO el id de la convocatoria ({ invitacion }); quién es la persona sale de requirePortalIdentity. La lógica vive en la base
// (migración 037c: aceptar_aqui_en_su_lugar), que solo ejecuta la llave de servicio.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { ejecutarAccionConflicto } from '@/lib/portal/conflicto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const r = await ejecutarAccionConflicto(createAdminSupabase(), 'aceptar-aqui', auth.identity.memberId, b?.invitacion)
  return portalJson(r.body, r.status)
}
