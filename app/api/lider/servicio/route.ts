// GET /api/lider/servicio?id=… — el detalle de UN servicio para un LÍDER (Servicio-Lider-A): su equipo completo (con lo que hace falta para cambiarlo) y los demás equipos con lo mínimo (lib/lider/servicioLider.ts).
// Un servicio que no existe, que es de otra organización o un id mal escrito responden lo MISMO que quien no tiene rol (403 genérico): no se puede averiguar qué ids existen. Solo lee. Cache-Control: no-store siempre.
import { NextRequest, NextResponse } from 'next/server'
import { requireLiderDeLaSesion } from '@/lib/auth/authorize'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'
import { armarEquipos, servicioDeLista } from '@/lib/lider/servicioLider'
import { MSG } from '@/lib/textos/mensajes'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const prohibido = (status = 403) => NextResponse.json({ error: MSG.noAutorizado }, { status, headers: NO_STORE })
const falla = () => NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: NO_STORE })
const unicos = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.filter(Boolean))) as string[]

export async function GET(req: NextRequest) {
  const a = await requireLiderDeLaSesion()
  if (!a.ok) return prohibido(a.response.status)
  const id = req.nextUrl.searchParams.get('id') || ''
  if (!UUID.test(id)) return prohibido()
  const { admin, organizationId } = a
  const sv = await admin.from('services').select('id, fecha, titulo, kind, hora_inicio, hora_fin').eq('id', id).eq('organization_id', organizationId).maybeSingle()
  if (sv.error) return falla()
  if (!sv.data) return prohibido()

  const liderados = Array.from(a.equiposLiderados)
  const [asig, inv, teams, cupos] = await Promise.all([
    admin.from('banda_assignments').select('member_id, team_position_id, slot_index').eq('service_id', id),
    admin.from('invitations').select('member_id, team_id, status').eq('service_id', id),
    admin.from('teams').select('id, name, color, sort_order').eq('organization_id', organizationId).is('archived_at', null).order('sort_order'),
    admin.from('service_position_slots').select('team_position_id, slots_needed').eq('service_id', id),
  ])
  if (asig.error || inv.error || teams.error || cupos.error) return falla()
  const idsPos = unicos((asig.data || []).map((r: any) => r.team_position_id))
  const vacio = { data: [] as any[], error: null }
  const [posAsig, posPropias, membresias, tools] = await Promise.all([
    idsPos.length ? admin.from('team_positions').select('id, name, team_id, sort_order, archived_at').in('id', idsPos) : Promise.resolve(vacio),
    liderados.length ? admin.from('team_positions').select('id, name, team_id, sort_order, archived_at').in('team_id', liderados) : Promise.resolve(vacio),
    liderados.length ? admin.from('team_members').select('id, member_id, team_id').in('team_id', liderados).eq('organization_id', organizationId) : Promise.resolve(vacio),
    liderados.length ? admin.from('team_tools').select('id, team_id, tool_type, label').in('team_id', liderados) : Promise.resolve(vacio),
  ])
  if (posAsig.error || posPropias.error || membresias.error || tools.error) return falla()
  const idsMembresia = unicos((membresias.data || []).map((r: any) => r.id))
  const enlaces = idsMembresia.length ? await admin.from('team_member_positions').select('team_member_id, team_position_id').in('team_member_id', idsMembresia) : vacio
  const idsPersonas = unicos([...(asig.data || []).map((r: any) => r.member_id), ...(membresias.data || []).map((r: any) => r.member_id)])
  const personas = idsPersonas.length ? await admin.from('members').select('id, nombre, apellido').in('id', idsPersonas).eq('organization_id', organizationId) : vacio
  if (enlaces.error || personas.error) return falla()
  // Quién bloqueó ESTE día: solo de las personas de los equipos que lidera, y solo filas «todos los equipos» (team_id nulo) o de un equipo que lidera; sin el motivo. Un bloqueo de otro equipo no se lee.
  const idsDeEquipos = unicos((membresias.data || []).map((r: any) => r.member_id)), bloqueos: { member_id: string; team_id: string | null }[] = []
  for (let i = 0; i < idsDeEquipos.length; i += 80) {
    const parte = idsDeEquipos.slice(i, i + 80)
    const [paraTodos, paraEquipo] = await Promise.all([
      admin.from('date_blocks').select('member_id, team_id').eq('blocked_date', (sv.data as any).fecha).is('team_id', null).in('member_id', parte),
      admin.from('date_blocks').select('member_id, team_id').eq('blocked_date', (sv.data as any).fecha).in('team_id', liderados).in('member_id', parte),
    ])
    if (paraTodos.error || paraEquipo.error) return falla()
    bloqueos.push(...((paraTodos.data || []) as any[]), ...((paraEquipo.data || []) as any[]))
  }

  const positions = [...(posAsig.data || []), ...(posPropias.data || [])].filter((p: any, i, todas: any[]) => todas.findIndex(q => q.id === p.id) === i)
  const equipos = armarEquipos({
    teams: (teams.data || []) as any, positions: positions as any, asignaciones: (asig.data || []) as any, invitaciones: (inv.data || []) as any, miembros: (personas.data || []) as any,
    herramientas: (tools.data || []) as any, cupos: (cupos.data || []) as any, membresias: (membresias.data || []) as any, posicionesDeMembresia: (enlaces.data || []) as any, bloqueos,
  }, a.equiposLiderados)
  return NextResponse.json({ servicio: servicioDeLista(sv.data as any), cerrado: convocatoriaCerrada((sv.data as any).fecha), equipos }, { headers: NO_STORE })
}
