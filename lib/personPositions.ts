// Posiciones asignadas a cada persona (team_member_positions), agrupadas por
// equipo — la única fuente de verdad de «qué hace» alguien (punto 40: los
// instrumentos antiguos se retiraron de la interfaz). Pura, sobre las listas
// que ya cargan /admin y TeamPanel: un solo recorrido, sin consultas por fila.

export interface PositionGroup {
  teamId: string
  teamName: string
  teamColor?: string | null // punto 43: clave de la paleta del equipo
  positions: string[]
}

interface TeamLike { id: string; name: string; sort_order?: number | null; color?: string | null }
interface PositionLike { id: string; team_id: string; name: string; sort_order?: number | null }
interface TeamMemberLike { id: string; member_id: string; team_id: string }
interface LinkLike { team_member_id: string; team_position_id: string }

const byOrder = (a: { sort_order?: number | null; name: string }, b: { sort_order?: number | null; name: string }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')

/** memberId → grupos por equipo (equipos y posiciones en su orden real). Sin posiciones, la persona no aparece. */
export function buildPositionIndex(a: {
  teams: TeamLike[]
  positions: PositionLike[]
  teamMembers: TeamMemberLike[]
  memberPositions: LinkLike[]
}): Map<string, PositionGroup[]> {
  const teamById = new Map(a.teams.map(t => [t.id, t] as [string, TeamLike]))
  const posById = new Map(a.positions.map(p => [p.id, p] as [string, PositionLike]))
  const tmById = new Map(a.teamMembers.map(tm => [tm.id, tm] as [string, TeamMemberLike]))

  const acc = new Map<string, Map<string, PositionLike[]>>()
  for (const link of a.memberPositions) {
    const tm = tmById.get(link.team_member_id)
    const pos = posById.get(link.team_position_id)
    if (!tm || !pos || !teamById.has(tm.team_id)) continue // posición o equipo archivado/no cargado
    let byTeam = acc.get(tm.member_id)
    if (!byTeam) { byTeam = new Map(); acc.set(tm.member_id, byTeam) }
    const list = byTeam.get(tm.team_id) || []
    if (!list.some(p => p.id === pos.id)) list.push(pos)
    byTeam.set(tm.team_id, list)
  }

  const out = new Map<string, PositionGroup[]>()
  acc.forEach((byTeam, memberId) => {
    const groups = Array.from(byTeam.entries())
      .map(([teamId, list]) => ({ team: teamById.get(teamId)!, list }))
      .sort((x, y) => byOrder(x.team, y.team))
      .map(({ team, list }) => ({
        teamId: team.id, teamName: team.name, teamColor: team.color ?? null,
        positions: [...list].sort(byOrder).map(p => p.name),
      }))
    if (groups.length) out.set(memberId, groups)
  })
  return out
}
