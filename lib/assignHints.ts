// Avisos del selector de asignar (punto 32) — lógica pura, sin React ni base.
// Se AVISA, nunca se impide: el líder decide. Solo usa datos que la
// organización ya ve en el servicio (banda_assignments) y los bloqueos de
// la FECHA del servicio (date_blocks.blocked_date). Un bloqueo vale POR
// EQUIPO (punto 51): `blockedIds` trae solo a quienes bloquearon el equipo
// del cupo (lib/teamBlocks.ts → blockedIdsForTeam). Nunca nombra un
// bloqueo de otro equipo.

export type HintTag = { kind: 'ok' | 'no' | 'neu'; text: string }

export interface AssignOption {
  id: string
  name: string
  initials: string
  tags: HintTag[]
  isCurrent: boolean
}

interface Candidate { id: string; nombre?: string; apellido?: string }
// team_position_id: la posición por id (punto 52). `posicion` (texto) solo trae las filas heredadas, sin id.
// team_position: el join (nombre y equipo) que trae la carga del servicio; sirve para posiciones ARCHIVADAS, que ya no están en las secciones.
interface BandaRow { team_position_id?: string | null; posicion?: string | null; member_id?: string | null; team_position?: { name?: string | null; team_id?: string | null } | null }

// banda_assignments guarda el ID de la posición (migración 037a): el nombre puede repetirse en otro equipo o cambiar, el id no. Estos mapas se arman
// con las secciones de equipo ya cargadas. Un id que no está (fila heredada sin id, o una posición ARCHIVADA) no apunta a ningún equipo.
export function positionMaps(
  sections: { teamId: string; posiciones: { id: string; nombre: string }[] }[],
): { posTeam: Map<string, string>; posNames: Map<string, string> } {
  const posTeam = new Map<string, string>()
  const posNames = new Map<string, string>()
  for (const s of sections) for (const p of s.posiciones) { posTeam.set(p.id, s.teamId); posNames.set(p.id, p.nombre.trim()) }
  return { posTeam, posNames }
}

const byName = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' })
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs))

/**
 * Opciones del selector de UNA posición, ya filtradas y ordenadas.
 *  - La misma persona no puede ir dos veces a la MISMA posición: quien ya
 *    está en otro cupo de `posId` se excluye (la persona del cupo que se
 *    está editando, `currentMemberId`, sigue en la lista como seleccionada).
 *  - «Ya asignado en {equipo}» solo si la otra asignación es de un equipo
 *    DISTINTO a `teamId`. Dentro del mismo equipo (o si el equipo de esa
 *    asignación no se puede determinar: fila heredada sin id, posición
 *    archivada) la etiqueta es neutra: «Ya tiene {posición}».
 *  - Disponibles primero; después quien ya tiene algo en este servicio;
 *    al final quien bloqueó ese día. Dentro de cada grupo, por nombre.
 */
export function buildAssignOptions(p: {
  candidates: Candidate[]
  posId: string
  teamId: string
  currentMemberId?: string
  banda: BandaRow[]
  posTeam: Map<string, string>     // id de posición → equipo (positionMaps)
  posNames: Map<string, string>    // id de posición → nombre actual
  teamNames: Map<string, string>
  blockedIds: Set<string>
}): AssignOption[] {
  const rows = p.banda.filter(b => b.member_id)
  const labelOf = (b: BandaRow) => (b.team_position_id && p.posNames.get(b.team_position_id)) || b.team_position?.name?.trim() || (b.posicion || '').trim() || 'otra posición'
  const teamOf = (b: BandaRow) => (b.team_position_id ? p.posTeam.get(b.team_position_id) : undefined) ?? b.team_position?.team_id ?? undefined

  const out: (AssignOption & { rank: number })[] = []
  for (const m of p.candidates) {
    const mine = rows.filter(b => b.member_id === m.id)
    const inThisPosition = mine.some(b => b.team_position_id === p.posId)
    if (inThisPosition && m.id !== p.currentMemberId) continue // misma posición dos veces: no

    const others = mine.filter(b => b.team_position_id !== p.posId)
    const sameTeam: string[] = []
    const otherTeams: string[] = []
    for (const b of others) {
      const t = teamOf(b)
      if (t && t !== p.teamId) otherTeams.push(p.teamNames.get(t) || '')
      else sameTeam.push(labelOf(b)) // mismo equipo, o equipo desconocido: no se afirma ningún otro
    }

    const tags: HintTag[] = []
    if (otherTeams.filter(Boolean).length) tags.push({ kind: 'neu', text: `Ya asignado en ${uniq(otherTeams.filter(Boolean)).join(', ')}` })
    if (sameTeam.length) tags.push({ kind: 'neu', text: `Ya tiene ${uniq(sameTeam).join(' · ')}` })
    const blocked = p.blockedIds.has(m.id)
    if (blocked) tags.push({ kind: 'no', text: 'Bloqueó este día' })
    if (!tags.length) tags.push({ kind: 'ok', text: 'Disponible' })

    const name = `${m.nombre || ''} ${m.apellido || ''}`.trim()
    out.push({
      id: m.id, name,
      initials: `${m.nombre?.[0] || ''}${m.apellido?.[0] || ''}`.toUpperCase(),
      tags, isCurrent: m.id === p.currentMemberId,
      rank: blocked ? 2 : others.length ? 1 : 0,
    })
  }
  out.sort((a, b) => a.rank - b.rank || byName(a.name, b.name))
  return out.map(({ rank: _r, ...o }) => o)
}
