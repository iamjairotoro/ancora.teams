// Bloqueos de fecha POR EQUIPO (punto 51): lógica pura que comparten Home, la administración y el
// aviso al asignar. Las filas vienen de la función `team_blocks_in_range` (migración 031), que ya
// expande «todos los equipos» y ya filtra por quién pregunta: un administrador recibe todos los
// equipos de su organización y un líder SOLO los equipos que lidera. La base es la que filtra; acá,
// además, el LÍDER nunca ve más de lo suyo aunque llegaran filas de más (defensa en profundidad).
// Se CONSERVA el team_id: nada colapsa «persona bloqueada» sin decir en qué equipos (punto 60).

export type TeamBlockRow = {
  member_id: string
  team_id: string | null     // null: persona sin equipo (solo la ve la administración)
  blocked_date: string       // YYYY-MM-DD
  reason?: string | null
}

/** Personas bloqueadas PARA ese equipo (aviso al asignar: el cupo mira el bloqueo de SU equipo). */
export function blockedIdsForTeam(rows: TeamBlockRow[], teamId: string): Set<string> {
  const s = new Set<string>()
  for (const r of rows) if (r.team_id === teamId) s.add(r.member_id)
  return s
}

/** Ventana de fechas que piden Home y administración (el Home cargaba la tabla completa). */
export function blocksWindow(today: Date = new Date()): { from: string; to: string } {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const a = new Date(today); a.setDate(a.getDate() - 400)
  const b = new Date(today); b.setDate(b.getDate() + 800)
  return { from: iso(a), to: iso(b) }
}

/** Quién mira: la administración ve todos los equipos; un líder, solo los que lidera. */
export type Viewer = { kind: 'admin' } | { kind: 'leader'; teamIds: ReadonlySet<string> }

export type DayBlockPerson = {
  memberId: string
  teamIds: string[]     // equipos BLOQUEADOS visibles para quien mira (sin repetir)
  noTeam: boolean       // fila sin equipo activo (solo la administración)
  reasons: string[]
}
export type DayBlocks = {
  people: DayBlockPerson[]
  byTeam: Map<string, string[]>   // equipo → PERSONAS DISTINTAS que bloquearon para él
  noTeam: string[]                // personas sin equipo activo
}

/** Las filas de UNA fecha agrupadas por persona y por equipo, conservando el team_id. */
export function dayBlocks(rows: TeamBlockRow[], date: string, viewer: Viewer): DayBlocks {
  const people = new Map<string, DayBlockPerson>()
  for (const r of rows) {
    if (r.blocked_date !== date) continue
    // El líder NUNCA ve filas de equipos que no lidera ni de personas «sin equipo».
    if (viewer.kind === 'leader' && (!r.team_id || !viewer.teamIds.has(r.team_id))) continue
    let p = people.get(r.member_id)
    if (!p) { p = { memberId: r.member_id, teamIds: [], noTeam: false, reasons: [] }; people.set(r.member_id, p) }
    if (r.team_id) { if (!p.teamIds.includes(r.team_id)) p.teamIds.push(r.team_id) } else p.noTeam = true
    if (r.reason && !p.reasons.includes(r.reason)) p.reasons.push(r.reason)
  }
  const byTeam = new Map<string, string[]>()
  const noTeam: string[] = []
  people.forEach(p => {
    p.teamIds.forEach(t => byTeam.set(t, [...(byTeam.get(t) || []), p.memberId]))
    if (p.noTeam) noTeam.push(p.memberId)
  })
  return { people: Array.from(people.values()), byTeam, noTeam }
}

export const joinNames = (a: string[]): string => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1])

/**
 * La frase de una persona en el panel «Por persona».
 *  · líder:  «Bloqueó {su equipo}» (nunca «Disponible en…» ni «todos sus equipos»);
 *  · admin:  «Bloqueó todos sus equipos» o «Bloqueó A y B. Disponible en C.»;
 *  · sin equipo: «Sin equipo».
 */
export function personPhrase(a: { viewer: Viewer; blockedNames: string[]; availableNames: string[]; allBlocked: boolean; onlyTeam: boolean; noTeam: boolean }): string {
  if (a.noTeam && !a.blockedNames.length) return 'Sin equipo'
  if (a.viewer.kind === 'leader') return `Bloqueó ${joinNames(a.blockedNames)}`
  if (a.allBlocked && !a.onlyTeam) return 'Bloqueó todos sus equipos'
  if (!a.availableNames.length) return `Bloqueó ${joinNames(a.blockedNames)}.`
  return `Bloqueó ${joinNames(a.blockedNames)}. Disponible en ${joinNames(a.availableNames)}.`
}

/** Posiciones de la persona SOLO en los equipos indicados (los bloqueados), sin repetir. */
export function positionsInTeams(positionsOf: (memberId: string, teamId: string) => string[], memberId: string, teamIds: string[]): string[] {
  const out: string[] = []
  for (const t of teamIds) for (const n of positionsOf(memberId, t)) if (!out.includes(n)) out.push(n)
  return out
}
