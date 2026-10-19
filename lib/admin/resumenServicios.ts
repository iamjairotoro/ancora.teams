// Resumen de servicios por EQUIPO para la administración en teléfono (lista de Servicios, Home «Hoy»). PURA, sin acceso a datos: la ruta /api/admin/servicios-resumen le pasa las filas y devuelve esto.
// Solo CONTEOS Y ESTADOS: nada de correos, nombres ni ids de personas.
// Reglas COMPARTIDAS (ninguna comparación propia de estados): estadoConvocatoria / esDeOtroEquipo (lib/convocatoriaEstado), convocatoriaCerrada y servicioTerminado. Una convocatoria cerrada o de un servicio
// terminado NUNCA cuenta en «sin responder». «Vacantes» es lo que el panel ya calcula: posiciones (cupos) sin persona, con `slots_needed || 1` como en Home.
import { estadoConvocatoria } from '@/lib/convocatoriaEstado'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'
import { servicioTerminado } from '@/lib/servicioTerminado'

/** Cuántos servicios ya terminados se devuelven (los más recientes); los próximos van completos. */
export const HISTORIAL_MAXIMO = 10

interface ServicioFila { id: string; fecha: string; titulo?: string | null; hora_inicio?: string | null; hora_fin?: string | null; tipo?: string | null; kind?: string | null }
interface InvitacionFila { service_id: string; member_id: string; team_id: string | null; status?: string | null; declined_reason?: string | null; sent_at?: string | null }
interface AsignacionFila { service_id: string; team_position_id: string | null; member_id: string | null; slot_index?: number | null }
interface PosicionFila { id: string; team_id: string }
interface CupoFila { service_id: string; team_position_id: string; slots_needed: number }
interface EquipoFila { id: string; name: string; color?: string | null; sort_order?: number | null; archived_at?: string | null }

export type EstadoEquipoServicio = 'sin-convocar' | 'convocado'

export interface EquipoDeServicio {
  teamId: string
  nombre: string
  color: string | null
  /** Personas distintas con una posición de este equipo en el servicio. */
  asignados: number
  /** Personas distintas convocadas (con invitación enviada) por este equipo; «aceptó en otro equipo» no cuenta como respuesta de este. */
  convocados: number
  confirmados: number
  rechazos: number
  /** Convocadas que no respondieron. 0 si el servicio terminó o la convocatoria cerró. */
  sinResponder: number
  /** Cupos sin persona. */
  vacantes: number
  estado: EstadoEquipoServicio
}

export interface ServicioResumen {
  id: string
  fecha: string
  titulo: string
  horaInicio: string | null
  horaFin: string | null
  tipo: 'servicio' | 'ensayo'
  terminado: boolean
  equipos: EquipoDeServicio[]
}

const orden = (a: EquipoFila, b: EquipoFila) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')
const porFecha = (a: ServicioFila, b: ServicioFila) => a.fecha.localeCompare(b.fecha) || (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')

export function resumenServicios(a: {
  services: ServicioFila[]
  invitations: InvitacionFila[]
  assignments: AsignacionFila[]
  positions: PosicionFila[]
  slots: CupoFila[]
  teams: EquipoFila[]
  ahora?: Date
  historial?: number
}): ServicioResumen[] {
  const ahora = a.ahora ?? new Date(), maxHistorial = a.historial ?? HISTORIAL_MAXIMO
  const equipos = a.teams.filter(t => !t.archived_at).sort(orden)
  const posDeEquipo = new Map<string, string[]>()
  for (const p of a.positions) { const l = posDeEquipo.get(p.team_id) ?? []; l.push(p.id); posDeEquipo.set(p.team_id, l) }
  const equipoDePos = new Map(a.positions.map(p => [p.id, p.team_id] as [string, string]))

  const terminado = (s: ServicioFila) => servicioTerminado(s.fecha, s.hora_fin, ahora, s.hora_inicio)
  const proximos = a.services.filter(s => !terminado(s)).sort(porFecha)
  const pasados = a.services.filter(s => terminado(s)).sort((x, y) => porFecha(y, x)).slice(0, maxHistorial)

  const armar = (s: ServicioFila): ServicioResumen => {
    const fin = terminado(s), abierta = !fin && !convocatoriaCerrada(s.fecha, ahora)
    const invs = a.invitations.filter(i => i.service_id === s.id), banda = a.assignments.filter(b => b.service_id === s.id), cupos = a.slots.filter(c => c.service_id === s.id)
    const lista: EquipoDeServicio[] = []
    for (const t of equipos) {
      const invsEquipo = invs.filter(i => i.team_id === t.id)
      const bandaEquipo = banda.filter(b => b.team_position_id && equipoDePos.get(b.team_position_id) === t.id)
      const cuposEquipo = cupos.filter(c => equipoDePos.get(c.team_position_id) === t.id)
      const asignados = new Set(bandaEquipo.filter(b => b.member_id).map(b => b.member_id as string))
      const convocados = new Set<string>(), confirmados = new Set<string>(), rechazos = new Set<string>(), pendientes = new Set<string>()
      for (const i of invsEquipo) {
        if (!i.sent_at) continue
        const e = estadoConvocatoria(i)
        if (e === 'otro-equipo' || e === null) continue            // «aceptó en otro equipo» no es respuesta de ESTE equipo
        convocados.add(i.member_id)
        if (e === 'confirmado') confirmados.add(i.member_id); else if (e === 'rechazo') rechazos.add(i.member_id); else pendientes.add(i.member_id)
      }
      if (!asignados.size && !convocados.size && !cuposEquipo.length) continue      // el equipo no participa de este servicio
      let vacantes = 0
      for (const pid of posDeEquipo.get(t.id) ?? []) {
        const necesarios = cuposEquipo.find(c => c.team_position_id === pid)?.slots_needed || 1
        const llenos = new Set(bandaEquipo.filter(b => b.team_position_id === pid && b.member_id).map(b => b.slot_index ?? 1)).size
        vacantes += Math.max(0, necesarios - llenos)
      }
      lista.push({
        teamId: t.id, nombre: t.name, color: t.color ?? null,
        asignados: asignados.size, convocados: convocados.size, confirmados: confirmados.size, rechazos: rechazos.size,
        sinResponder: abierta ? pendientes.size : 0,
        vacantes, estado: convocados.size > 0 ? 'convocado' : 'sin-convocar',
      })
    }
    return {
      id: s.id, fecha: s.fecha, titulo: s.titulo ?? '', horaInicio: s.hora_inicio ?? null, horaFin: s.hora_fin ?? null,
      tipo: s.tipo === 'ensayo' || s.kind === 'rehearsal' ? 'ensayo' : 'servicio', terminado: fin, equipos: lista,
    }
  }
  return [...proximos.map(armar), ...pasados.map(armar)]
}
