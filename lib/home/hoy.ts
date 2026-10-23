// Fecha larga y horario de un servicio (los usan la lista de Servicios y las pantallas de servicio y de equipo en teléfono). PURAS. (El Home de teléfono vive en lib/home/cifrasAdmin.ts y lib/home/calendario.ts.)
import type { ServicioResumen } from '@/lib/admin/resumenServicios'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const hora = (h: string | null) => (h ? h.slice(0, 5) : '')

/** «Domingo, 25 de octubre». */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number), dia = new Date(Date.UTC(a, m - 1, d, 12))
  return `${DIAS[dia.getUTCDay()]}, ${d} de ${MESES[m - 1]}`
}
/** «10:00 — 14:00» (o solo la hora de inicio; vacío si no hay horario). */
export const horario = (s: Pick<ServicioResumen, 'horaInicio' | 'horaFin'>): string => (s.horaInicio ? (s.horaFin ? `${hora(s.horaInicio)} — ${hora(s.horaFin)}` : hora(s.horaInicio)) : '')
