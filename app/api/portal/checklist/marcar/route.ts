// POST /api/portal/checklist/marcar { itemId, checked }: marca o desmarca UN ítem. El servidor verifica que la posición del ítem es de esta persona (la que tiene hoy y confirmó); guarda quién y a qué hora, y responde con el estado fresco.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { marcarItemMusico } from '@/lib/portal/checklistServidor'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const r = await marcarItemMusico(createAdminSupabase(), auth.identity.memberId, b?.itemId, b?.checked)
  return portalJson(r.body, r.status)
}
