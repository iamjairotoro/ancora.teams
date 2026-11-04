// Los servicios del LÍDER (Home → Servicios, teléfono): lo que el servidor le devuelve a quien lidera un equipo y no es administrador. PURAS, sobre filas ya leídas con la llave de servicio.
// Cada objeto se arma CAMPO POR CAMPO, nunca copiando una fila: lo que no se nombra aquí no sale (la prueba tests/auth/lider-servicios.test.js tiene su propia lista y falla si aparece un campo nuevo).
// De los equipos AJENOS: nombre del equipo, nombre de la posición, nombre de la persona y «Confirmó» / «Sin responder». Nunca teléfono, correo, nacimiento, motivos, bloqueos ni ids de personas, posiciones o herramientas:
// sin esos ids, un error de la pantalla no puede armar una escritura contra otro equipo. De SU equipo salen además los ids que hacen falta para escribir (etapa 2) y «Declinó»; los motivos no salen en ningún caso.
import { rangoDeHoras } from '@/lib/admin/servicioMovil'

export type EstadoAjeno = 'confirmo' | 'sin-responder'
export type EstadoPropio = EstadoAjeno | 'declino'
export type TipoHerramienta = 'checklist' | 'schedule' | 'notes'
export const TIPOS_HERRAMIENTA: readonly TipoHerramienta[] = ['checklist', 'schedule', 'notes']
export interface PersonaAjena { nombre: string; apellido: string; posicion: string; estado: EstadoAjeno }
export interface SlotPropio { slot: number; persona: { id: string; nombre: string; apellido: string; estado: EstadoPropio } | null }
export interface PosicionPropia { id: string; nombre: string; cupos: number; slots: SlotPropio[] }
export interface IntegrantePropio { id: string; nombre: string; apellido: string; posiciones: string[] }
export interface HerramientaPropia { id: string; tipo: TipoHerramienta; nombre: string }
export interface EquipoAjeno { id: string; nombre: string; color: string | null; tuEquipo: false; personas: PersonaAjena[] }
export interface EquipoPropio { id: string; nombre: string; color: string | null; tuEquipo: true; posiciones: PosicionPropia[]; integrantes: IntegrantePropio[]; herramientas: HerramientaPropia[] }
export type EquipoLider = EquipoPropio | EquipoAjeno
export interface ServicioDeLista { id: string; fecha: string; titulo: string; kind: string | null; horas: string }
export interface ServicioLider { servicio: ServicioDeLista; cerrado: boolean; equipos: EquipoLider[] }

export interface FilasServicio {
  teams: { id: string; name: string; color: string | null; sort_order: number | null }[]
  positions: { id: string; name: string; team_id: string; sort_order: number | null; archived_at?: string | null }[]
  asignaciones: { member_id: string | null; team_position_id: string | null; slot_index?: number | null }[]
  invitaciones: { member_id: string | null; team_id: string | null; status: string | null }[]
  miembros: { id: string; nombre: string | null; apellido: string | null }[]
  herramientas: { id: string; team_id: string; tool_type: string | null; label?: string | null }[]
  cupos: { team_position_id: string; slots_needed: number | null }[]
  membresias: { id: string; member_id: string; team_id: string }[]
  posicionesDeMembresia: { team_member_id: string; team_position_id: string }[]
}

export const tituloSinFecha = (titulo?: string | null): string => (titulo || 'Servicio').split(' — ')[0].trim() || 'Servicio'

export function servicioDeLista(s: { id: string; fecha: string; titulo?: string | null; kind?: string | null; hora_inicio?: string | null; hora_fin?: string | null }): ServicioDeLista {
  return { id: s.id, fecha: s.fecha, titulo: tituloSinFecha(s.titulo), kind: s.kind ?? null, horas: rangoDeHoras(s.hora_inicio, s.hora_fin) }
}

const porOrden = (a: { sort_order: number | null; name: string }, b: { sort_order: number | null; name: string }) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')
const NOMBRE_HERRAMIENTA: Record<TipoHerramienta, string> = { checklist: 'Checklist', schedule: 'Horario', notes: 'Notas' }

/** Los equipos del servicio: primero los que lidera (con todo lo que ve y puede cambiar el líder de su equipo), después los demás con lo mínimo. */
export function armarEquipos(f: FilasServicio, lideradosIds: ReadonlySet<string>): EquipoLider[] {
  const nombreDe = new Map(f.miembros.map(m => [m.id, m] as const))
  const posicion = new Map(f.positions.map(p => [p.id, p] as const))
  const inv = (memberId: string, teamId: string) => f.invitaciones.find(i => i.member_id === memberId && i.team_id === teamId)
  const equipos = f.teams.slice().sort((a, b) => porOrden({ sort_order: a.sort_order, name: a.name }, { sort_order: b.sort_order, name: b.name }))
  const estadoPropio = (memberId: string, teamId: string): EstadoPropio => { const st = inv(memberId, teamId)?.status; return st === 'confirmado' ? 'confirmo' : st === 'declinado' ? 'declino' : 'sin-responder' }
  const armar = (t: FilasServicio['teams'][number]): EquipoLider => {
    if (lideradosIds.has(t.id)) {
      const posiciones: PosicionPropia[] = f.positions.filter(p => p.team_id === t.id && !p.archived_at).sort(porOrden).map(p => {
        const asignadas = f.asignaciones.filter(a => a.team_position_id === p.id && a.member_id)
        const cupos = Math.max(1, f.cupos.find(c => c.team_position_id === p.id)?.slots_needed ?? 1)
        const ultimo = Math.max(0, ...asignadas.map(a => a.slot_index ?? 1))
        const slots: SlotPropio[] = []
        for (let n = 1; n <= Math.max(cupos, ultimo); n++) {
          const a = asignadas.find(x => (x.slot_index ?? 1) === n); const m = a?.member_id ? nombreDe.get(a.member_id) : undefined
          slots.push({ slot: n, persona: a && m ? { id: m.id, nombre: m.nombre || '', apellido: m.apellido || '', estado: estadoPropio(m.id, t.id) } : null })
        }
        return { id: p.id, nombre: p.name, cupos, slots }
      })
      const integrantes: IntegrantePropio[] = f.membresias.filter(x => x.team_id === t.id).map(x => ({ x, m: nombreDe.get(x.member_id) })).filter(y => y.m)
        .sort((a, b) => (a.m!.nombre || '').localeCompare(b.m!.nombre || '', 'es'))
        .map(({ x, m }) => ({ id: m!.id, nombre: m!.nombre || '', apellido: m!.apellido || '', posiciones: f.posicionesDeMembresia.filter(l => l.team_member_id === x.id).map(l => l.team_position_id) }))
      const herramientas: HerramientaPropia[] = f.herramientas.filter(h => h.team_id === t.id && (TIPOS_HERRAMIENTA as readonly string[]).includes(h.tool_type || ''))
        .map(h => ({ id: h.id, tipo: h.tool_type as TipoHerramienta, nombre: (h.label || '').trim() || NOMBRE_HERRAMIENTA[h.tool_type as TipoHerramienta] }))
      return { id: t.id, nombre: t.name, color: t.color ?? null, tuEquipo: true, posiciones, integrantes, herramientas }
    }
    const personas: PersonaAjena[] = f.asignaciones
      .filter(a => a.member_id && a.team_position_id && posicion.get(a.team_position_id)?.team_id === t.id)
      .map(a => ({ pos: posicion.get(a.team_position_id as string)!, persona: nombreDe.get(a.member_id as string), memberId: a.member_id as string }))
      .filter(x => x.persona)
      .sort((a, b) => porOrden(a.pos, b.pos) || (a.persona!.nombre || '').localeCompare(b.persona!.nombre || '', 'es'))
      .map(x => ({ nombre: x.persona!.nombre || '', apellido: x.persona!.apellido || '', posicion: x.pos.name, estado: inv(x.memberId, t.id)?.status === 'confirmado' ? 'confirmo' : 'sin-responder' }))
    return { id: t.id, nombre: t.name, color: t.color ?? null, tuEquipo: false, personas }
  }
  const todos = equipos.map(armar)
  return [...todos.filter(e => e.tuEquipo), ...todos.filter(e => !e.tuEquipo)]
}
