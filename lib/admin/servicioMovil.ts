// Lo que muestran las pantallas de teléfono del servicio (components/servicio-movil): cálculos PUROS sobre los datos que la página ya tiene cargados (sin lecturas nuevas).
// El estado de cada equipo sale de la regla compartida lib/admin/estadoEquipoServicio.ts; aquí solo se arman las tarjetas, las personas y el alcance del botón «Notificar».
// Reglas que respeta todo: nada de porcentaje de una persona (la barra es del servicio entero); quien no puede ver los rechazos nunca los recibe (se muestran como «sin responder»); un líder solo ve su equipo.
import type { BandaAssignment, Invitation, ToolType } from '@/lib/types'
import type { Viewer } from '@/lib/teamBlocks'
import { esDeOtroEquipo } from '@/lib/convocatoriaEstado'
import { TEXTOS_SERVICIO } from '@/lib/textos/servicio'
import { estadoEquipoServicio, type EstadoEquipoServicio } from '@/lib/admin/estadoEquipoServicio'

export interface SeccionEquipo {
  teamId: string
  nombre: string
  color: string | null
  tools: { id: string; tool_type: ToolType }[]
  posiciones: { id: string; nombre: string }[]
}

/** El administrador ve todos los equipos; un líder, solo los que lidera. */
export const equiposVisibles = <T extends { teamId: string }>(secciones: T[], viewer: Viewer): T[] => (viewer.kind === 'admin' ? secciones : secciones.filter(s => viewer.teamIds.has(s.teamId)))

export interface DatosServicio {
  bandaItems: BandaAssignment[]
  invitations: Invitation[]
  getSlotsNeeded: (posId: string) => number
}

/** El estado de un equipo en el servicio abierto, con las MISMAS cuentas del panel de escritorio (confirmados sobre asignados). */
export function estadoDeEquipo(sec: SeccionEquipo, d: DatosServicio): EstadoEquipoServicio {
  const necesarios = new Map(sec.posiciones.map(p => [p.id, d.getSlotsNeeded(p.id)] as [string, number]))
  return estadoEquipoServicio({
    posiciones: sec.posiciones.map(p => p.id),
    cupos: sec.posiciones.map(p => ({ team_position_id: p.id, slots_needed: necesarios.get(p.id) as number })),
    banda: d.bandaItems.filter(b => !!b.team_position_id && necesarios.has(b.team_position_id) && !!b.member_id && (b.slot_index ?? 1) <= (necesarios.get(b.team_position_id as string) as number))
      .map(b => ({ team_position_id: b.team_position_id ?? null, member_id: b.member_id ?? null, slot_index: b.slot_index })),
    invitaciones: d.invitations.filter(i => i.team_id === sec.teamId),
    abierta: true,
  })
}

export interface ResumenDeServicio { asignados: number; confirmados: number; vacantes: number; nuevos: number; porcentaje: number }
/** El encabezado del servicio suma sus equipos: confirmados / asignados, posiciones sin cubrir y personas por notificar. `porcentaje` es de TODO el servicio (0 si nadie está asignado). */
export function resumenDeServicio(estados: Pick<EstadoEquipoServicio, 'asignados' | 'vacantes' | 'nuevos' | 'porAsignado'>[]): ResumenDeServicio {
  const r = estados.reduce((a, e) => ({ asignados: a.asignados + e.asignados, confirmados: a.confirmados + e.porAsignado.confirmados, vacantes: a.vacantes + e.vacantes, nuevos: a.nuevos + e.nuevos }), { asignados: 0, confirmados: 0, vacantes: 0, nuevos: 0 })
  return { ...r, porcentaje: r.asignados > 0 ? Math.round((r.confirmados / r.asignados) * 100) : 0 }
}

/** A quién llega «Notificar a N nuevos» de la cabecera. `teamId: null` = todos los equipos (administrador). Un líder solo convoca a SU equipo; si lidera varios, la cabecera no ofrece el botón
 *  (cada equipo trae el suyo). Sin nadie por notificar no hay botón. */
export function alcanceNotificar(viewer: Viewer, secciones: SeccionEquipo[], estados: Map<string, EstadoEquipoServicio>): { teamId: string | null; nuevos: number } | null {
  const visibles = equiposVisibles(secciones, viewer)
  const nuevos = visibles.reduce((n, s) => n + (estados.get(s.teamId)?.nuevos ?? 0), 0)
  if (nuevos <= 0) return null
  if (viewer.kind === 'admin') return { teamId: null, nuevos }
  return visibles.length === 1 ? { teamId: visibles[0].teamId, nuevos } : null
}

export type EstadoPersona = 'por-notificar' | 'confirmado' | 'sin-responder' | 'rechazo' | 'otro-equipo' | 'reconfirmar'
/** Cómo se lee una persona asignada. `verRechazos: false` (quien no tiene por qué saberlo) NUNCA recibe «rechazo»: queda «sin responder». */
export function estadoDePersona(inv: Invitation | undefined, opciones: { verRechazos: boolean }): EstadoPersona {
  if (!inv || !inv.sent_at) return 'por-notificar'
  if (esDeOtroEquipo(inv)) return 'otro-equipo'
  if (inv.needs_reassignment_confirm) return 'reconfirmar'
  if (inv.status === 'confirmado') return 'confirmado'
  if (inv.status === 'declinado') return opciones.verRechazos ? 'rechazo' : 'sin-responder'
  return 'sin-responder'
}
/** ¿Puede este visitante saber quién declinó en ese equipo? Administrador, sí; líder, solo en su equipo. */
export const puedeVerRechazos = (viewer: Viewer, teamId: string): boolean => viewer.kind === 'admin' || viewer.teamIds.has(teamId)

export interface Voluntario { clave: string; memberId: string; nombre: string; iniciales: string; posicion: string; posicionId: string; slotIndex: number }
export interface PosicionVacante { posicionId: string; nombre: string; faltan: number }
/** Las personas asignadas (una tarjeta por posición ocupada) y las posiciones con cupos sin persona, en el orden de las posiciones del equipo. */
export function voluntariosDeEquipo(sec: SeccionEquipo, d: Pick<DatosServicio, 'bandaItems' | 'getSlotsNeeded'>, memberNombre: (id: string) => { nombre: string; apellido?: string } | undefined): { voluntarios: Voluntario[]; vacantes: PosicionVacante[] } {
  const voluntarios: Voluntario[] = [], vacantes: PosicionVacante[] = []
  for (const pos of sec.posiciones) {
    const n = d.getSlotsNeeded(pos.id)
    let libres = 0
    for (let slot = 1; slot <= n; slot++) {
      const b = d.bandaItems.find(x => x.team_position_id === pos.id && (x.slot_index ?? 1) === slot && x.member_id)
      if (!b?.member_id) { libres++; continue }
      const m = b.member ?? memberNombre(b.member_id)
      const nombre = m ? `${m.nombre} ${m.apellido || ''}`.trim() : TEXTOS_SERVICIO.persona
      voluntarios.push({ clave: `${pos.id}-${slot}`, memberId: b.member_id, nombre, iniciales: iniciales(m), posicion: pos.nombre, posicionId: pos.id, slotIndex: slot })
    }
    if (libres > 0) vacantes.push({ posicionId: pos.id, nombre: pos.nombre, faltan: libres })
  }
  return { voluntarios, vacantes }
}
const iniciales = (m?: { nombre?: string; apellido?: string }) => `${m?.nombre?.[0] || ''}${m?.apellido?.[0] || ''}`.toLocaleUpperCase('es') || '?'

/** Los círculos de la tarjeta de un equipo: personas (iniciales) y, punteados, los cupos libres; como mucho `maximo` y el resto en «+N». */
export function avataresDeTarjeta(iniciales: string[], vacantes: number, maximo = 5): { items: (string | null)[]; mas: number } {
  const todos: (string | null)[] = [...iniciales, ...Array.from({ length: vacantes }, () => null)]
  return { items: todos.slice(0, maximo), mas: Math.max(0, todos.length - maximo) }
}

/** La herramienta de la URL: «orden» es la del servicio (la «Setlist» del equipo, o la primera que haya); cualquier otra es el id de team_tools y debe ser de ese equipo. */
export function herramientaDeClave(secciones: SeccionEquipo[], equipo: string | null, clave: string): { seccion: SeccionEquipo; tool: { id: string; tool_type: ToolType } } | null {
  const candidatas = equipo ? secciones.filter(s => s.teamId === equipo) : secciones
  for (const seccion of candidatas) {
    const tool = clave === 'orden' ? seccion.tools.find(t => t.tool_type === 'setlist') : seccion.tools.find(t => t.id === clave)
    if (tool) return { seccion, tool }
  }
  return null
}
/** La clave de URL de una herramienta (lib/admin/urlServicio.ts). */
export const claveDeHerramienta = (tool: { id: string; tool_type: ToolType }): string => (tool.tool_type === 'setlist' ? 'orden' : tool.id)
/** Las herramientas que el teléfono ofrece: «Subir archivo» queda fuera mientras diga «Todavía no está disponible». */
export const herramientasDeTelefono = <T extends { tool_type: ToolType }>(tools: T[]): T[] => tools.filter(t => t.tool_type !== 'file_upload')

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
/** «dom 25 oct». */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number), dia = new Date(Date.UTC(a, m - 1, d, 12))
  return `${DIAS_CORTOS[dia.getUTCDay()]} ${d} ${MESES_CORTOS[m - 1]}`
}
/** «Servicio Ancora · dom 25 oct» (el título sin la fecha que `createService` le agrega después de « — »); los ensayos y «otros» llevan su sufijo. */
export function etiquetaDeServicio(s: { fecha: string; titulo?: string | null; kind?: string | null }): string {
  const titulo = (s.titulo || 'Servicio').split(' — ')[0].trim() || 'Servicio'
  return `${titulo} · ${fechaCorta(s.fecha)}${s.kind === 'rehearsal' ? ' · Ensayo' : s.kind === 'other' ? ' · Otro' : ''}`
}
/** «10:00 – 14:00»; sin horas guardadas, las de siempre (10:00 y 14:00), como la vista de escritorio. */
export const rangoDeHoras = (inicio?: string | null, fin?: string | null): string => `${(inicio || '10:00').slice(0, 5)} – ${(fin || '14:00').slice(0, 5)}`
/** «Domingo 25 oct» (el título del «‹» de la pantalla de un equipo). */
export function fechaMedia(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number), dia = new Date(Date.UTC(a, m - 1, d, 12))
  return `${DIAS_LARGOS[dia.getUTCDay()]} ${d} ${MESES_CORTOS[m - 1]}`
}
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
