// GET /api/lider/servicio?id=… — el detalle de UN servicio para un LÍDER (Servicio-Lider-A): su equipo completo y los demás equipos con lo mínimo (lib/lider/servicioLider.ts).
// Un servicio que no existe, que es de otra organización o un id mal escrito responden lo MISMO que quien no tiene rol (403 genérico): no se puede averiguar qué ids existen. Solo lee. Cache-Control: no-store siempre.
import { NextRequest, NextResponse } from 'next/server'
import { requireLiderDeLaSesion } from '@/lib/auth/authorize'
import { armarEquipos, servicioDeLista } from '@/lib/lider/servicioLider'
import { MSG } from '@/lib/textos/mensajes'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const prohibido = (status = 403) => NextResponse.json({ error: MSG.noAutorizado }, { status, headers: NO_STORE })
const falla = () => NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: NO_STORE })

export async function GET(req: NextRequest) {
  const a = await requireLiderDeLaSesion()
  if (!a.ok) return prohibido(a.response.status)
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!UUID.test(id)) return prohibido()
  const { admin, organizationId } = a
  const sv = await admin.from('services').select('id, fecha, titulo, kind, hora_inicio, hora_fin').eq('id', id).eq('organization_id', organizationId).maybeSingle()
  if (sv.error) return falla()
  if (!sv.data) return prohibido()

  const [asig, inv, teams] = await Promise.all([
    admin.from('banda_assignments').select('member_id, team_position_id').eq('service_id', id),
    admin.from('invitations').select('member_id, team_id, status').eq('service_id', id),
    admin.from('teams').select('id, name, color, sort_order').eq('organization_id', organizationId).is('archived_at', null).order('sort_order'),
  ])
  if (asig.error || inv.error || teams.error) return falla()
  const idsPos = Array.from(new Set((asig.data || []).map((r: any) => r.team_position_id).filter(Boolean))) as string[]
  const idsPersonas = Array.from(new Set((asig.data || []).map((r: any) => r.member_id).filter(Boolean))) as string[]
  const idsLiderados = Array.from(a.equiposLiderados)
  const [pos, personas, tools] = await Promise.all([
    idsPos.length ? admin.from('team_positions').select('id, name, team_id, sort_order').in('id', idsPos) : Promise.resolve({ data: [], error: null }),
    idsPersonas.length ? admin.from('members').select('id, nombre, apellido').in('id', idsPersonas).eq('organization_id', organizationId) : Promise.resolve({ data: [], error: null }),
    idsLiderados.length ? admin.from('team_tools').select('id, team_id, tool_type, label').in('team_id', idsLiderados) : Promise.resolve({ data: [], error: null }),
  ])
  if (pos.error || personas.error || tools.error) return falla()

  const equipos = armarEquipos({
    teams: (teams.data || []) as any, positions: (pos.data || []) as any, asignaciones: (asig.data || []) as any,
    invitaciones: (inv.data || []) as any, miembros: (personas.data || []) as any, herramientas: (tools.data || []) as any,
  }, a.equiposLiderados)
  return NextResponse.json({ servicio: servicioDeLista(sv.data as any), equipos }, { headers: NO_STORE })
}
