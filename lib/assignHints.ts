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
interface BandaRow { posicion: string; member_id?: string | null }

// banda_assignments guarda el NOMBRE de la posición, no su id, y el nombre
// es único solo dentro de cada equipo (team_positions_name_active). Con
// este mapa un nombre apunta a 0 equipos (código viejo tipo "VX1", o una
// posición archivada), a 1 (el caso normal) o a >1 (ambiguo).
export function positionNameToTeams(
  sections: { teamId: string; posiciones: { nombre: string }[] }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const s of sections) for (const p of s.posiciones) {
    const key = p.nombre.trim()
    if (!map.has(key)) map.set(key, new Set())
    map.get(key)!.add(s.teamId)
  }
  return map
}

const byName = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' })
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs))

/**
 * Opciones del selector de UNA posición, ya filtradas y ordenadas.
 *  - La misma persona no puede ir dos veces a la MISMA posición: quien ya
 *    está en otro cupo de `posName` se excluye (la persona del cupo que se
 *    está editando, `currentMemberId`, sigue en la lista como seleccionada).
 *  - «Ya asignado en {equipo}» solo si la otra asignación es de un equipo
 *    DISTINTO a `teamId`. Dentro del mismo equipo (o si el equipo de esa
 *    asignación no se puede determinar con certeza) la etiqueta es neutra:
 *    «Ya tiene {posición}».
 *  - Disponibles primero; después quien ya tiene algo en este servicio;
 *    al final quien bloqueó ese día. Dentro de cada grupo, por nombre.
 */
export function buildAssignOptions(p: {
  candidates: Candidate[]
  posName: string
  teamId: string
  currentMemberId?: string
  banda: BandaRow[]
  posToTeams: Map<string, Set<string>>
  teamNames: Map<string, string>
  blockedIds: Set<string>
}): AssignOption[] {
  const posName = p.posName.trim()
  const rows = p.banda.filter(b => b.member_id)

  const out: (AssignOption & { rank: number })[] = []
  for (const m of p.candidates) {
    const mine = rows.filter(b => b.member_id === m.id)
    const inThisPosition = mine.some(b => b.posicion.trim() === posName)
    if (inThisPosition && m.id !== p.currentMemberId) continue // misma posición dos veces: no

    const others = mine.filter(b => b.posicion.trim() !== posName)
    const sameTeam: string[] = []
    const otherTeams: string[] = []
    for (const b of others) {
      const teams = p.posToTeams.get(b.posicion.trim())
      if (teams && teams.size === 1) {
        const t = Array.from(teams)[0]
        if (t === p.teamId) sameTeam.push(b.posicion.trim())
        else otherTeams.push(p.teamNames.get(t) || '')
      } else {
        sameTeam.push(b.posicion.trim()) // equipo desconocido o ambiguo: no se afirma ninguno
      }
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
