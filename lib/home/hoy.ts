// La vista «Hoy» del Home en teléfono, armada desde el resumen de servicios por equipo (lib/admin/resumenServicios.ts). PURAS. Solo conteos y estados; el recorte por rol se hace aquí:
// el administrador ve todos los equipos; un líder, solo los que lidera.
import type { EquipoDeServicio, ServicioResumen } from '@/lib/admin/resumenServicios'
import { MESES_CORTOS } from '@/lib/home/formato'
import type { Viewer } from '@/lib/teamBlocks'
import { TEXTOS_HOME } from '@/lib/textos/home'

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

/** «9 de 10» (confirmados de convocados), o «Sin convocar». */
export const textoConfirmados = (e: Pick<EquipoDeServicio, 'confirmados' | 'convocados' | 'estado'>): string => (e.estado === 'sin-convocar' ? TEXTOS_HOME.sinConvocar : `${e.confirmados} de ${e.convocados}`)
export const textoEstado = (e: Pick<EquipoDeServicio, 'estado'>): string => (e.estado === 'sin-convocar' ? TEXTOS_HOME.sinConvocar : 'Convocado')

const visibles = (s: ServicioResumen, v: Viewer): EquipoDeServicio[] => (v.kind === 'admin' ? s.equipos : s.equipos.filter(e => v.teamIds.has(e.teamId)))

export const MAX_LINEAS_TARJETA = 3

export interface TarjetaHoy {
  servicioId: string
  titulo: string          // «Domingo, 25 de octubre»
  horario: string
  /** Administrador: hasta 3 líneas (una por equipo), el resto va en `masEquipos`. Líder: la de SU equipo (con barra). */
  equipos: EquipoDeServicio[]
  masEquipos: number
  modo: 'servicio' | 'equipo'
}

/** El próximo SERVICIO (no ensayo) que aún no terminó y en el que participa alguien que el visitante puede ver. Administrador: una tarjeta por servicio. Líder: una por equipo que lidera. */
export function tarjetasHoy(servicios: ServicioResumen[], v: Viewer): TarjetaHoy[] {
  const s = servicios.find(x => !x.terminado && x.tipo === 'servicio' && visibles(x, v).length > 0)
  if (!s) return []
  const equipos = visibles(s, v), base = { servicioId: s.id, titulo: fechaLarga(s.fecha), horario: horario(s) }
  if (v.kind === 'admin') return [{ ...base, equipos: equipos.slice(0, MAX_LINEAS_TARJETA), masEquipos: Math.max(0, equipos.length - MAX_LINEAS_TARJETA), modo: 'servicio' }]
  return equipos.map(e => ({ ...base, equipos: [e], masEquipos: 0, modo: 'equipo' as const }))
}

export interface FilaProximoEquipo {
  clave: string
  servicioId: string
  teamId: string
  color: string | null
  dia: string             // «25»
  mes: string             // «oct»
  nombre: string          // «Alabanza» o «Ensayo · Alabanza»
  detalle: string         // «10:00 – 14:00 · 9 de 10»
  sinConvocar: boolean
}

/** «Próximos servicios»: una fila por servicio y equipo (los que no terminaron), en orden de fecha. */
export function filasProximos(servicios: ServicioResumen[], v: Viewer, maximo = 5): { filas: FilaProximoEquipo[]; total: number } {
  const todas: FilaProximoEquipo[] = []
  for (const s of servicios) {
    if (s.terminado) continue
    const [, m, d] = s.fecha.split('-').map(Number), hr = s.horaInicio ? `${hora(s.horaInicio)}${s.horaFin ? ` – ${hora(s.horaFin)}` : ''}` : ''
    for (const e of visibles(s, v)) {
      todas.push({ clave: `${s.id}-${e.teamId}`, servicioId: s.id, teamId: e.teamId, color: e.color, dia: String(d), mes: MESES_CORTOS[m - 1], nombre: s.tipo === 'ensayo' ? `Ensayo · ${e.nombre}` : e.nombre,
        detalle: [hr, textoConfirmados(e)].filter(Boolean).join(' · '), sinConvocar: e.estado === 'sin-convocar' })
    }
  }
  return { filas: todas.slice(0, maximo), total: todas.length }
}
