// Lo que el Perfil del portal necesita de la persona (punto 54, commit 1): «Mis equipos y posiciones» y si se le ofrece la fila «Administración».
// Todo se decide en el SERVIDOR y viaja ya resuelto; la pantalla solo lo dibuja.
//   · equiposDePersona: sus equipos ACTIVOS con sus posiciones ACTIVAS (nunca instrumentos), en el orden real; un equipo sin posiciones sale con la lista vacía.
//   · administracionDe: SOLO con sesión de Google (una sesión de enlace de acceso o de invitación NUNCA la ve). owner y admin → /admin; líder de un equipo activo → /home;
//     sin rol, null (la fila no existe). Ante cualquier error de lectura se cierra: null.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

export interface EquipoPerfil { id: string; name: string; color: string | null; posiciones: string[] }
export interface Administracion { destino: '/admin' | '/home'; rol: 'admin' | 'lider' }

interface TeamRow { id: string; name: string; color?: string | null; sort_order?: number | null }
interface PosRow { id: string; team_id: string; name: string; sort_order?: number | null }
interface TmRow { id: string; team_id: string }
interface LinkRow { team_member_id: string; team_position_id: string }

const orden = (a: { sort_order?: number | null; name: string }, b: { sort_order?: number | null; name: string }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')

/** Pura. `teams` y `positions` ya vienen filtrados a lo activo; `teamMembers` y `links` son SOLO de la persona. */
export function equiposDePersona(a: { teams: TeamRow[]; positions: PosRow[]; teamMembers: TmRow[]; links: LinkRow[] }): EquipoPerfil[] {
  const tmPorEquipo = new Map<string, string>(); for (const tm of a.teamMembers) tmPorEquipo.set(tm.team_id, tm.id)
  const posPorId = new Map(a.positions.map(p => [p.id, p] as [string, PosRow]))
  const mias = new Map<string, Set<string>>()                       // team_member_id → ids de sus posiciones
  for (const l of a.links) { const s = mias.get(l.team_member_id) ?? new Set<string>(); s.add(l.team_position_id); mias.set(l.team_member_id, s) }
  return a.teams.filter(t => tmPorEquipo.has(t.id)).sort(orden).map(t => {
    const ids = mias.get(tmPorEquipo.get(t.id)!) ?? new Set<string>()
    const posiciones = Array.from(ids).map(id => posPorId.get(id)).filter((p): p is PosRow => !!p && p.team_id === t.id).sort(orden).map(p => p.name)
    return { id: t.id, name: t.name, color: t.color ?? null, posiciones }
  })
}

export async function equiposDeLaPersona(admin: SupabaseClient, memberId: string): Promise<EquipoPerfil[]> {
  const { data: tms } = await admin.from('team_members').select('id, team_id').eq('member_id', memberId)
  const teamMembers = (tms || []) as TmRow[]
  if (!teamMembers.length) return []
  const teamIds = Array.from(new Set(teamMembers.map(t => t.team_id)))
  const [{ data: teams }, { data: links }, { data: positions }] = await Promise.all([
    admin.from('teams').select('id, name, color, sort_order').in('id', teamIds).eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null),
    admin.from('team_member_positions').select('team_member_id, team_position_id').in('team_member_id', teamMembers.map(t => t.id)),
    admin.from('team_positions').select('id, team_id, name, sort_order').in('team_id', teamIds).is('archived_at', null),
  ])
  return equiposDePersona({ teams: (teams || []) as TeamRow[], positions: (positions || []) as PosRow[], teamMembers, links: (links || []) as LinkRow[] })
}

/** `via` es cómo se identificó la persona (lib/auth/portalIdentity.ts). */
export async function administracionDe(admin: SupabaseClient, memberId: string, via: 'google' | 'link' | 'invitation' | null | undefined): Promise<Administracion | null> {
  if (via !== 'google') return null            // una sesión de enlace de acceso (o el token del correo) nunca la ve
  try {
    const org = await admin.from('organization_members').select('role').eq('person_id', memberId).eq('organization_id', DEFAULT_ORGANIZATION_ID)
    if (org.error) return null
    if ((org.data || []).some((r: { role: string }) => r.role === 'owner' || r.role === 'admin')) return { destino: '/admin', rol: 'admin' }
    const lead = await admin.from('team_members').select('team_id').eq('member_id', memberId).eq('is_leader', true)
    if (lead.error) return null
    const ids = Array.from(new Set((lead.data || []).map((r: { team_id: string }) => r.team_id)))
    if (!ids.length) return null
    const act = await admin.from('teams').select('id').in('id', ids).eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null)
    if (act.error) return null
    return (act.data || []).length > 0 ? { destino: '/home', rol: 'lider' } : null
  } catch { return null }
}
