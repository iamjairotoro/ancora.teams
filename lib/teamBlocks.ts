// Bloqueos de fecha POR EQUIPO (punto 51): lógica pura que comparten Home, la administración y el
// aviso al asignar. Las filas vienen de la función `team_blocks_in_range` (migración 031), que ya
// expande «todos los equipos» y ya filtra por quién pregunta: un administrador recibe todos los
// equipos de su organización y un líder SOLO los equipos que lidera. Acá no se decide ninguna
// privacidad: solo se ordenan las filas que la base entregó.

export type TeamBlockRow = {
  member_id: string
  team_id: string | null     // null: persona sin equipo (solo la ve la administración)
  blocked_date: string       // YYYY-MM-DD
  reason?: string | null
}

/** Una fila por (fecha, persona), sin repetir por equipo (el Home marca días y nombra personas). */
export function uniqueDateMember(rows: TeamBlockRow[]): { blocked_date: string; member_id: string }[] {
  const seen = new Set<string>()
  const out: { blocked_date: string; member_id: string }[] = []
  for (const r of rows) {
    const k = `${r.blocked_date}|${r.member_id}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ blocked_date: r.blocked_date, member_id: r.member_id })
  }
  return out
}

/** Personas bloqueadas PARA ese equipo (aviso al asignar: el cupo mira el bloqueo de SU equipo). */
export function blockedIdsForTeam(rows: TeamBlockRow[], teamId: string): Set<string> {
  const s = new Set<string>()
  for (const r of rows) if (r.team_id === teamId) s.add(r.member_id)
  return s
}

/** Todos los equipos en que cada persona está bloqueada (lista de la administración). */
export function teamsByMember(rows: TeamBlockRow[]): Map<string, { teamIds: Set<string>; reasons: Set<string> }> {
  const m = new Map<string, { teamIds: Set<string>; reasons: Set<string> }>()
  for (const r of rows) {
    const e = m.get(r.member_id) || { teamIds: new Set<string>(), reasons: new Set<string>() }
    if (r.team_id) e.teamIds.add(r.team_id)
    if (r.reason) e.reasons.add(r.reason)
    m.set(r.member_id, e)
  }
  return m
}

/** Ventana de fechas que piden Home y administración (el Home cargaba la tabla completa). */
export function blocksWindow(today: Date = new Date()): { from: string; to: string } {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const a = new Date(today); a.setDate(a.getDate() - 400)
  const b = new Date(today); b.setDate(b.getDate() + 800)
  return { from: iso(a), to: iso(b) }
}
