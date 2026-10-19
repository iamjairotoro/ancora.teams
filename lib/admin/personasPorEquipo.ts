// «Personas · por equipo» (Personas · A): un bloque por equipo con sus personas, más «Sin equipo». PURA, sobre las listas que TeamPanel ya carga (sin consultas por fila).
// NO lleva estados de cumplimiento ni de confirmación por persona: solo quién es, si lidera y qué posiciones tiene en ESE equipo.
import { normalizeText } from '@/lib/personFilters'

interface MiembroLike { id: string; nombre?: string | null; apellido?: string | null; avatar_url?: string | null }
interface EquipoLike { id: string; name: string; color?: string | null }
interface MembresiaLike { member_id: string; team_id: string; is_leader: boolean }
interface GrupoDePosiciones { teamId: string; positions: string[] }

export interface PersonaDeGrupo { id: string; nombre: string; apellido: string; avatar_url: string | null; lider: boolean; posiciones: string[] }
export interface GrupoPorEquipo {
  /** id del equipo, o 'sin-equipo'. */
  clave: string
  /** null en «Sin equipo». */
  teamId: string | null
  nombre: string
  color: string | null
  /** Cuántas personas tiene el equipo (sin filtrar por la búsqueda). */
  total: number
  /** Las que se muestran (filtradas por la búsqueda): líderes primero, luego por nombre. */
  personas: PersonaDeGrupo[]
}

const nombreCompleto = (m: { nombre?: string | null; apellido?: string | null }) => `${m.nombre ?? ''} ${m.apellido ?? ''}`.trim()

export function textoPersonas(n: number): string { return n === 1 ? '1 persona' : `${n} personas` }

export function agruparPorEquipo(a: {
  members: MiembroLike[]
  /** Equipos activos, ya en su orden. */
  teams: EquipoLike[]
  teamMembers: MembresiaLike[]
  positionIndex?: Map<string, GrupoDePosiciones[]>
  consulta?: string
}): GrupoPorEquipo[] {
  const q = normalizeText(a.consulta ?? '')
  const miembro = new Map(a.members.map(m => [m.id, m] as [string, MiembroLike]))
  const activos = new Set(a.teams.map(t => t.id))
  const persona = (m: MiembroLike, lider: boolean, teamId: string | null): PersonaDeGrupo => ({
    id: m.id, nombre: m.nombre ?? '', apellido: m.apellido ?? '', avatar_url: m.avatar_url ?? null, lider,
    posiciones: teamId ? (a.positionIndex?.get(m.id)?.find(g => g.teamId === teamId)?.positions ?? []) : [],
  })
  const coincide = (m: MiembroLike) => !q || normalizeText(nombreCompleto(m)).includes(q)
  const orden = (x: PersonaDeGrupo, y: PersonaDeGrupo) => Number(y.lider) - Number(x.lider) || nombreCompleto(x).localeCompare(nombreCompleto(y), 'es')

  const grupos: GrupoPorEquipo[] = a.teams.map(t => {
    const todos: PersonaDeGrupo[] = []
    const vistos = new Set<string>()
    for (const tm of a.teamMembers) {
      if (tm.team_id !== t.id || vistos.has(tm.member_id)) continue
      const m = miembro.get(tm.member_id); if (!m) continue
      vistos.add(tm.member_id); todos.push(persona(m, tm.is_leader, t.id))
    }
    return { clave: t.id, teamId: t.id, nombre: t.name, color: t.color ?? null, total: todos.length, personas: todos.filter(p => coincide(p)).sort(orden) }
  })

  const enAlguno = new Set(a.teamMembers.filter(tm => activos.has(tm.team_id)).map(tm => tm.member_id))
  const sin = a.members.filter(m => !enAlguno.has(m.id)).map(m => persona(m, false, null))
  if (sin.length) grupos.push({ clave: 'sin-equipo', teamId: null, nombre: 'Sin equipo', color: null, total: sin.length, personas: sin.filter(p => coincide(p)).sort(orden) })

  // con búsqueda solo quedan los bloques que tienen a alguien
  return q ? grupos.filter(g => g.personas.length > 0) : grupos
}
