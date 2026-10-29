// /api/admin/checklist — el checklist por posición del LÍDER y el admin (lib/admin/checklistLider.ts).
//   GET  ?servicio=<id>&herramienta=<id de team_tools>  → la vista completa del equipo (posiciones, estado, grupos, ítems).
//   POST { accion, … }  → crear-checklist · crear-grupo · renombrar-grupo · eliminar-grupo · crear-item · editar-item · mover-item · eliminar-item · marcar · plantillas-listar · plantilla-previsualizar · plantilla-aplicar · plantilla-guardar; cada una responde con la vista fresca.
// Se autoriza con requireTeamAccess sobre el equipo del RECURSO (un líder solo toca su equipo; el admin, cualquiera de su organización). La persona sale de la sesión. Respuestas no-store; errores genéricos.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireTeamAccess } from '@/lib/auth/authorize'
import { createServerSupabase } from '@/lib/supabase-server'
import { findMemberByEmail } from '@/lib/findMemberByEmail'
import { ejecutarComoLider, type Autorizar } from '@/lib/admin/checklistLider'
import { MSG } from '@/lib/textos/mensajes'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }

function autorizador(admin: ReturnType<typeof createAdminSupabase>): Autorizar {
  return async (teamId, orgId) => {
    const a = await requireTeamAccess(teamId, orgId)
    if (!a.ok) return { ok: false, status: a.response.status }
    const found = await findMemberByEmail(a.email, admin)
    // ¿Administra la organización (no solo lidera este equipo)? Lo mismo que exige la política de tool_templates; con él se decide quién puede reemplazar la plantilla predeterminada.
    const { data: esAdmin } = await createServerSupabase().rpc('is_org_admin', { p_email: a.email, p_organization_id: orgId })
    return { ok: true, memberId: found.status === 'found' ? found.id : null, esAdmin: esAdmin === true }
  }
}

async function atender(entrada: any) {
  let admin
  try { admin = createAdminSupabase() } catch { return NextResponse.json({ error: MSG.servicioNoDisponible }, { status: 503, headers: NO_STORE }) }
  const r = await ejecutarComoLider(admin, autorizador(admin), entrada)
  return NextResponse.json(r.body, { status: r.status, headers: NO_STORE })
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  return atender({ accion: 'leer', servicio: p.get('servicio'), herramienta: p.get('herramienta') })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return NextResponse.json({ error: MSG.noSePudoGuardar }, { status: 400, headers: NO_STORE })
  return atender(b)
}
