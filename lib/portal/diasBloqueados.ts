// Los días que la persona bloqueó para TODOS sus equipos (punto 54, commit 3), a partir de las filas de /api/portal/bloqueos. Un bloqueo vale para todos si tiene una fila sin equipo
// (team_id nulo) o si hay una fila por cada uno de sus equipos; si solo bloqueó algunos, el día NO cuenta como bloqueado (todavía puede recibir convocatorias de los otros). Sin acceso a datos.
export interface FilaBloqueo { blocked_date?: string | null; team_id?: string | null; service?: { fecha?: string | null } | null }

export function diasBloqueadosParaTodos(filas: FilaBloqueo[], equipos: { id: string }[]): Set<string> {
  const porDia = new Map<string, FilaBloqueo[]>()
  for (const f of filas) { const dia = f.blocked_date || f.service?.fecha; if (!dia) continue; const l = porDia.get(dia); if (l) l.push(f); else porDia.set(dia, [f]) }
  const out = new Set<string>()
  for (const [dia, rows] of Array.from(porDia.entries())) {
    const ids = new Set(rows.filter(r => r.team_id != null).map(r => r.team_id as string))
    if (rows.some(r => r.team_id == null) || (equipos.length > 0 && equipos.every(e => ids.has(e.id)))) out.add(dia)
  }
  return out
}
