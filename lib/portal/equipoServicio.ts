// El EQUIPO de un servicio para el músico (punto 54, commit 5). Dos mitades, sin acceso a datos ni a servidor (se prueban aparte):
//   · armarEquipoDelServicio — en el SERVIDOR (lo llama lib/portal/armarPortal.ts): de las asignaciones, las convocatorias y las posiciones del equipo saca (a) la nómina que viaja al portal y (b) las vacantes.
//     De los compañeros solo viaja «confirmó» / «sin confirmar»: quien DECLINÓ no aparece (ni como declinado ni como «no pudo»); su posición cuenta como vacante, igual que una sin asignar.
//   · agruparEquipo — en la PANTALLA: por equipo, por sección (Voces, Banda…), una fila por persona (con sus posiciones) y las vacantes al final de su sección.
// Las vacantes siguen la regla de la administración: cada posición activa del equipo pide `slots_needed` cupos (por defecto 1); si hay menos personas, falta. Se dice por posición, sin número.

type Uno<T> = T | T[] | null | undefined
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null))
const SIN_SECCION = 9999

interface Seccion { name?: string | null; sort_order?: number | null }
interface EquipoEmb { name?: string | null; color?: string | null }
export interface PosicionEmb { name?: string | null; team_id?: string | null; sort_order?: number | null; section?: Uno<Seccion>; teams?: Uno<EquipoEmb> }

/** Una asignación (banda_assignments) tal como la lee el servidor, con su posición y su equipo embebidos. */
export interface FilaBanda {
  service_id?: string
  member_id: string | null
  posicion?: string | null
  team_position_id?: string | null
  member?: Uno<{ nombre?: string | null; apellido?: string | null; avatar_url?: string | null }>
  team_position?: Uno<PosicionEmb>
}
export interface InvitacionDeEquipo { member_id: string | null; team_id: string | null; status: string; needs_reassignment_confirm?: boolean | null }
export interface PosicionActiva { id: string; name: string; team_id: string; sort_order?: number | null; section?: Uno<Seccion>; teams?: Uno<EquipoEmb> }
export interface Cupo { team_position_id: string; slots_needed: number }

export type EstadoCompanero = 'confirmo' | 'sin-confirmar'
/** Una asignación como la recibe el portal. */
export interface BandaPortal {
  member_id: string | null
  member: { nombre: string | null; apellido: string | null; avatar_url: string | null } | null
  posicion: string
  teamId: string | null
  teamName: string
  teamColor: string | null
  seccion: string | null
  seccionOrden: number
  posOrden: number
  estado: EstadoCompanero
}
export interface Vacante { teamId: string; teamName: string; teamColor: string | null; posicion: string; seccion: string | null; seccionOrden: number; posOrden: number }

export function armarEquipoDelServicio(o: {
  filas: FilaBanda[]
  /** Las convocatorias de ESTE servicio (de todas las personas). */
  invitaciones: InvitacionDeEquipo[]
  /** Las posiciones activas (sin archivar) de los equipos que aparecen en `filas`. */
  posiciones: PosicionActiva[]
  /** Cupos pedidos por posición en ESTE servicio (los que no estén, piden 1). */
  cupos: Cupo[]
  /** Convocatorias declinadas se miran con esta función (por si cambia la regla); por defecto, status === 'declinado'. */
}): { banda: BandaPortal[]; vacantes: Vacante[] } {
  const inv = new Map<string, InvitacionDeEquipo>()
  for (const i of o.invitaciones) if (i.member_id && i.team_id) inv.set(`${i.member_id}|${i.team_id}`, i)
  const declinada = (m: string | null, t: string | null) => !!(m && t) && inv.get(`${m}|${t}`)?.status === 'declinado'

  const equipos = new Set<string>()      // los equipos que están en este servicio (aunque su gente haya declinado)
  const banda: BandaPortal[] = []
  const ocupadas = new Map<string, number>()
  for (const f of o.filas) {
    const tp = uno(f.team_position)
    const teamId = tp?.team_id ?? null
    if (teamId) equipos.add(teamId)
    if (declinada(f.member_id, teamId)) continue      // quien declinó no aparece; su cupo vuelve a faltar
    if (f.team_position_id) ocupadas.set(f.team_position_id, (ocupadas.get(f.team_position_id) ?? 0) + 1)
    const i = f.member_id && teamId ? inv.get(`${f.member_id}|${teamId}`) : undefined
    const sec = uno(tp?.section), eq = uno(tp?.teams), m = uno(f.member)
    banda.push({
      member_id: f.member_id, member: m ? { nombre: m.nombre ?? null, apellido: m.apellido ?? null, avatar_url: m.avatar_url ?? null } : null,
      posicion: tp?.name || f.posicion || '—', teamId, teamName: eq?.name || '', teamColor: eq?.color ?? null,
      seccion: sec?.name || null, seccionOrden: sec ? (sec.sort_order ?? 0) : SIN_SECCION, posOrden: tp?.sort_order ?? 0,
      estado: i?.status === 'confirmado' && !i.needs_reassignment_confirm ? 'confirmo' : 'sin-confirmar',
    })
  }

  const cupo = new Map(o.cupos.map(c => [c.team_position_id, c.slots_needed]))
  const vacantes: Vacante[] = []
  for (const p of o.posiciones) {
    if (!equipos.has(p.team_id)) continue
    if ((ocupadas.get(p.id) ?? 0) >= (cupo.get(p.id) || 1)) continue
    const sec = uno(p.section), eq = uno(p.teams)
    vacantes.push({ teamId: p.team_id, teamName: eq?.name || '', teamColor: eq?.color ?? null, posicion: p.name, seccion: sec?.name || null, seccionOrden: sec ? (sec.sort_order ?? 0) : SIN_SECCION, posOrden: p.sort_order ?? 0 })
  }
  return { banda, vacantes }
}

// ── la pantalla ──
export interface FilaPersona { tipo: 'persona'; memberId: string; nombre: string; avatarUrl: string | null; posiciones: string[]; estado: EstadoCompanero; esYo: boolean }
export interface FilaVacante { tipo: 'vacante'; posicion: string }
export interface GrupoEquipo { titulo: string | null; /** El grupo mezcla posiciones: cada persona dice la suya debajo del nombre. */ mezcla: boolean; filas: (FilaPersona | FilaVacante)[] }
export interface EquipoAgrupado { team: { id: string; name: string; color: string | null }; grupos: GrupoEquipo[] }

const porNombre = (a: string, b: string) => a.localeCompare(b, 'es', { sensitivity: 'base' })

export function agruparEquipo(banda: BandaPortal[], vacantes: Vacante[], yoId: string | null | undefined): EquipoAgrupado[] {
  const equipos = new Map<string, { team: EquipoAgrupado['team']; banda: BandaPortal[]; vac: Vacante[] }>()
  const ficha = (id: string | null, name: string, color: string | null) => {
    const k = id ?? 'otros'
    let e = equipos.get(k); if (!e) { e = { team: { id: k, name: name || 'Otros', color }, banda: [], vac: [] }; equipos.set(k, e) }
    return e
  }
  for (const b of banda) ficha(b.teamId, b.teamName, b.teamColor).banda.push(b)
  for (const v of vacantes) ficha(v.teamId, v.teamName, v.teamColor).vac.push(v)

  return Array.from(equipos.values()).sort((a, b) => porNombre(a.team.name, b.team.name)).map(({ team, banda: bs, vac }) => {
    const haySecciones = bs.some(b => b.seccion) || vac.some(v => v.seccion)
    const claves = new Map<string, { titulo: string | null; orden: number; banda: BandaPortal[]; vac: Vacante[] }>()
    const grupo = (seccion: string | null, orden: number) => {
      const k = seccion ?? ''
      let g = claves.get(k); if (!g) { g = { titulo: seccion ?? (haySecciones ? 'Otros' : null), orden, banda: [], vac: [] }; claves.set(k, g) }
      return g
    }
    for (const b of bs) grupo(b.seccion, b.seccionOrden).banda.push(b)
    for (const v of vac) grupo(v.seccion, v.seccionOrden).vac.push(v)
    const grupos = Array.from(claves.values()).sort((a, b) => a.orden - b.orden || porNombre(a.titulo ?? '', b.titulo ?? '')).map(g => {
      const personas = new Map<string, { b: BandaPortal; pos: { n: string; o: number }[] }>()
      for (const b of g.banda) {
        const k = b.member_id ?? `?${b.posicion}`
        const p = personas.get(k); if (p) p.pos.push({ n: b.posicion, o: b.posOrden }); else personas.set(k, { b, pos: [{ n: b.posicion, o: b.posOrden }] })
      }
      const nombreDe = (b: BandaPortal) => [b.member?.nombre, b.member?.apellido].filter(Boolean).join(' ') || '—'
      const filasPersona: FilaPersona[] = Array.from(personas.values()).sort((x, y) => Math.min(...x.pos.map(p => p.o)) - Math.min(...y.pos.map(p => p.o)) || porNombre(nombreDe(x.b), nombreDe(y.b))).map(({ b, pos }) => ({
        tipo: 'persona', memberId: b.member_id ?? '', nombre: nombreDe(b), avatarUrl: b.member?.avatar_url ?? null,
        posiciones: pos.sort((p, q) => p.o - q.o).map(p => p.n), estado: b.estado, esYo: !!yoId && b.member_id === yoId,
      }))
      const filasVacante: FilaVacante[] = g.vac.sort((a, b) => a.posOrden - b.posOrden || porNombre(a.posicion, b.posicion)).map(v => ({ tipo: 'vacante', posicion: v.posicion }))
      const nombres = new Set<string>([...filasPersona.flatMap(f => f.posiciones), ...filasVacante.map(f => f.posicion)])
      return { titulo: g.titulo, mezcla: nombres.size > 1, filas: [...filasPersona, ...filasVacante] }
    })
    return { team, grupos }
  })
}
