// GET /api/portal/checklist?servicio=<id>&herramienta=<id de team_tools>: el checklist por posición de ESE equipo en ESE servicio, SOLO lo que esta persona puede ver (lib/portal/checklistServidor.ts).
// La persona sale de requirePortalIdentity (sesión o enlace); el cliente nunca dice quién es. Respuestas no-store.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { leerChecklistMusico } from '@/lib/portal/checklistServidor'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const p = req.nextUrl.searchParams
  const r = await leerChecklistMusico(createAdminSupabase(), auth.identity.memberId, p.get('servicio'), p.get('herramienta'))
  return portalJson(r.body, r.status)
}
