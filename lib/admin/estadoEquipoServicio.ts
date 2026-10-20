// El estado de UN equipo en UN servicio, calculado en un solo lugar (fase 3 · B0). PURA, sin acceso a datos: recibe las filas ya recortadas a ese servicio y a ese equipo.
// La usan `resumenServicios` (lista de Servicios, Home móvil) y la pantalla del servicio en teléfono. Ninguna comparación propia de estados: las reglas son las de lib/convocatoriaEstado
// («aceptó en otro equipo» no es respuesta de este equipo y no es un rechazo).
//
// DOS formas de contar «confirmados», a propósito y las dos con el mismo texto «N de M confirmados» en pantalla:
//   · porConvocado — confirmados sobre CONVOCADOS (invitación enviada). Es lo que leen la lista de Servicios y el Home móvil (resumenServicios).
//   · porAsignado  — confirmados sobre ASIGNADOS (personas con una posición). Es lo que cuenta el panel de escritorio (computeTeamStats) y lo que leerá la pantalla del servicio.
// Con las mismas filas, `convocados ≤ asignados` salvo que se convoque a alguien que ya no está asignado. tests/portal/estado-equipo-servicio.test.js documenta y fija la diferencia
// y comprueba que `porAsignado` coincide con computeTeamStats de AdminServiceView.
import { estadoConvocatoria } from '@/lib/convocatoriaEstado'

export interface InvitacionDeEquipo { member_id: string; status?: string | null; declined_reason?: string | null; sent_at?: string | null }
export interface BandaDeEquipo { team_position_id: string | null; member_id: string | null; slot_index?: number | null }
export interface CupoDePosicion { team_position_id: string; slots_needed: number }

export interface EntradaEstadoEquipo {
  /** Ids de las posiciones del equipo. */
  posiciones: string[]
  /** Cupos de ESTE servicio (`service_position_slots`); una posición sin fila vale 1. */
  cupos: CupoDePosicion[]
  /** La banda de ESTE servicio en posiciones de ESTE equipo. */
  banda: BandaDeEquipo[]
  /** Las invitaciones de ESTE servicio hechas por ESTE equipo. */
  invitaciones: InvitacionDeEquipo[]
  /** La convocatoria sigue abierta (el servicio no terminó ni cerró): solo entonces hay «sin responder». */
  abierta: boolean
}

export interface EstadoEquipoServicio {
  /** Personas distintas con una posición del equipo. */
  asignados: number
  /** Cupos sin persona, con `slots_needed || 1` como el panel. */
  vacantes: number
  /** Asignados sin convocatoria enviada (`sent_at` vacío): lo que cuenta «Notificar a N nuevos». */
  nuevos: number
  porAsignado: { confirmados: number; rechazos: number; pendientes: number }
  porConvocado: { convocados: number; confirmados: number; rechazos: number; pendientes: number }
  /** Convocadas que no respondieron; 0 si ya no hay convocatoria abierta. */
  sinResponder: number
  estado: 'sin-convocar' | 'convocado'
}

export function estadoEquipoServicio(e: EntradaEstadoEquipo): EstadoEquipoServicio {
  const asignadosIds = new Set(e.banda.filter(b => b.member_id).map(b => b.member_id as string))

  let vacantes = 0
  for (const pid of e.posiciones) {
    const necesarios = e.cupos.find(c => c.team_position_id === pid)?.slots_needed || 1
    const llenos = new Set(e.banda.filter(b => b.team_position_id === pid && b.member_id).map(b => b.slot_index ?? 1)).size
    vacantes += Math.max(0, necesarios - llenos)
  }

  // por convocado: invitación enviada y que sea respuesta de ESTE equipo
  const convocados = new Set<string>(), confC = new Set<string>(), rechC = new Set<string>(), pendC = new Set<string>()
  for (const i of e.invitaciones) {
    if (!i.sent_at) continue
    const est = estadoConvocatoria(i)
    if (est === 'otro-equipo' || est === null) continue
    convocados.add(i.member_id)
    if (est === 'confirmado') confC.add(i.member_id); else if (est === 'rechazo') rechC.add(i.member_id); else pendC.add(i.member_id)
  }

  // por asignado: las invitaciones de este equipo a quienes tienen una posición (como computeTeamStats)
  const deAsignados = e.invitaciones.filter(i => asignadosIds.has(i.member_id))
  const distintos = (f: (i: InvitacionDeEquipo) => boolean) => new Set(deAsignados.filter(f).map(i => i.member_id)).size
  const invitados = new Set(deAsignados.filter(i => i.sent_at).map(i => i.member_id))

  return {
    asignados: asignadosIds.size,
    vacantes,
    nuevos: Array.from(asignadosIds).filter(id => !invitados.has(id)).length,
    porAsignado: {
      confirmados: distintos(i => i.status === 'confirmado'),
      rechazos: distintos(i => i.status === 'declinado' && i.declined_reason !== 'conflict'),
      pendientes: distintos(i => i.status === 'pendiente'),
    },
    porConvocado: { convocados: convocados.size, confirmados: confC.size, rechazos: rechC.size, pendientes: pendC.size },
    sinResponder: e.abierta ? pendC.size : 0,
    estado: convocados.size > 0 ? 'convocado' : 'sin-convocar',
  }
}
