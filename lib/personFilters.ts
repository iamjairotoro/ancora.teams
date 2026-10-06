// Filtros de la lista de Personas (punto 44): «Todos», un equipo o «Sin
// equipo», más el buscador (nombre, correo, teléfono, equipo y posición, sin
// distinguir tildes ni mayúsculas). Puro, sobre las listas que /admin ya carga: sin
// consultas por fila.

import type { PositionGroup } from './personPositions'

/** 'all' | 'none' (sin equipo) | 'admins' (administradores: owner y admin) | id de un equipo */
export type PersonFilter = 'all' | 'none' | string

interface MemberLike { id: string; nombre?: string | null; apellido?: string | null; email?: string | null; telefono?: string | null }
interface TeamLike { id: string; name: string }
interface TeamMemberLike { member_id: string; team_id: string }

/** minúsculas y sin tildes: «Producción» se encuentra escribiendo «produccion». */
export function normalizeText(s: string | null | undefined): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** memberId → ids de los equipos (de `teams`, o sea los activos) a los que pertenece. */
export function teamIdsByMember(teams: TeamLike[], teamMembers: TeamMemberLike[]): Map<string, string[]> {
  const known = new Set(teams.map(t => t.id))
  const out = new Map<string, string[]>()
  for (const tm of teamMembers) {
    if (!known.has(tm.team_id)) continue
    const list = out.get(tm.member_id) || []
    if (!list.includes(tm.team_id)) list.push(tm.team_id)
    out.set(tm.member_id, list)
  }
  return out
}

export function filterMembers<M extends MemberLike>(a: {
  members: M[]
  query: string
  filter: PersonFilter
  teams: TeamLike[]
  teamIds: Map<string, string[]>
  positionIndex: Map<string, PositionGroup[]>
  // personas con rol de owner o admin (solo lo tiene quien puede verlo)
  adminIds?: Set<string>
}): M[] {
  const q = normalizeText(a.query)
  // Teléfono: además del texto, se compara solo por dígitos, así «5551» encuentra «555-1 234».
  const qDigits = q.replace(/\D/g, '')
  const teamName = new Map(a.teams.map(t => [t.id, t.name] as [string, string]))
  return a.members.filter(m => {
    const ids = a.teamIds.get(m.id) || []
    if (a.filter === 'none') { if (ids.length) return false }
    else if (a.filter === 'admins') { if (!a.adminIds?.has(m.id)) return false }
    else if (a.filter !== 'all' && !ids.includes(a.filter)) return false
    if (!q) return true
    if (qDigits.length >= 3 && (m.telefono || '').replace(/\D/g, '').includes(qDigits)) return true
    const haystack = normalizeText([
      m.nombre, m.apellido, m.email, m.telefono,
      ...ids.map(id => teamName.get(id) || ''),
      ...(a.positionIndex.get(m.id) || []).flatMap(g => g.positions),
    ].join(' '))
    return haystack.includes(q)
  })
}

/** Conteos de los chips (sobre TODAS las personas, no sobre la búsqueda). */
export function filterCounts(members: MemberLike[], teams: TeamLike[], teamIds: Map<string, string[]>, adminIds?: Set<string>) {
  const byTeam = new Map<string, number>(teams.map(t => [t.id, 0] as [string, number]))
  let none = 0
  let admins = 0
  for (const m of members) {
    const ids = teamIds.get(m.id) || []
    if (!ids.length) none++
    if (adminIds?.has(m.id)) admins++
    for (const id of ids) byTeam.set(id, (byTeam.get(id) || 0) + 1)
  }
  return { all: members.length, none, admins, byTeam }
}
