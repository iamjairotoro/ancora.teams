// La lista de Servicios en teléfono (components/servicio-movil/ListaServicios.tsx), armada desde el resumen por equipo (lib/admin/resumenServicios.ts). PURAS; solo conteos y estados.
// Una fila por servicio y equipo. «N de M confirmados» cuenta sobre los CONVOCADOS (igual que el Home móvil); la vista de un servicio cuenta sobre los ASIGNADOS: son dos preguntas distintas y el texto se queda en
// «confirmados» en ambos sitios (tests/portal/lista-servicios.test.js documenta la diferencia).
import type { EquipoDeServicio, ServicioResumen } from '@/lib/admin/resumenServicios'
import { horario } from '@/lib/home/hoy'
import { MESES_CORTOS } from '@/lib/home/formato'
import { TEXTOS_HOME, confirmadosDe } from '@/lib/textos/home'
import { TEXTOS_SERVICIO as T, faltan, sinResponderN } from '@/lib/textos/servicio'

/** Cuántos servicios ya terminados muestra «Ver historial» (los más recientes). */
export const HISTORIAL_FILAS = 10

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export type EstadoFila =
  | { tipo: 'convocar' }                          // el equipo aún no fue convocado → botón «Convocar»
  | { tipo: 'faltan' | 'sin-responder' | 'completo'; texto: string }
  | { tipo: 'ninguno' }                           // servicio ya terminado: sin chip

export interface FilaLista {
  clave: string
  servicioId: string
  teamId: string
  color: string | null
  diaSemana: string       // «dom»
  dia: string             // «25»
  mes: string             // «oct»
  cuando: string          // «domingo 25 de octubre» (para lectores de pantalla)
  nombre: string          // «Alabanza» o «Ensayo · Alabanza»
  detalle: string         // «10:00 – 14:00 · 9 de 10 confirmados»
  estado: EstadoFila
  terminado: boolean
}

const partes = (fecha: string) => { const [a, m, d] = fecha.split('-').map(Number), dow = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay(); return { d, m, dow } }
/** «10:00 – 14:00» (con la raya corta que usa la lista). */
const horas = (s: ServicioResumen) => horario(s).replace(' — ', ' – ')

/** El chip (o el botón) de un equipo en un servicio: lo urgente primero (faltan posiciones), luego quién no respondió; si no hay nada pendiente, «Completo». */
export function estadoDeFila(e: Pick<EquipoDeServicio, 'estado' | 'vacantes' | 'sinResponder'>, terminado: boolean): EstadoFila {
  if (terminado) return { tipo: 'ninguno' }
  if (e.estado === 'sin-convocar') return { tipo: 'convocar' }
  if (e.vacantes > 0) return { tipo: 'faltan', texto: faltan(e.vacantes) }
  if (e.sinResponder > 0) return { tipo: 'sin-responder', texto: sinResponderN(e.sinResponder) }
  return { tipo: 'completo', texto: T.completo }
}

const detalleDe = (s: ServicioResumen, e: EquipoDeServicio): string =>
  [horas(s), e.estado === 'sin-convocar' ? TEXTOS_HOME.sinConvocar : (e.convocados > 0 ? confirmadosDe(e.confirmados, e.convocados) : 'Convocado')].filter(Boolean).join(' · ')

const filasDe = (s: ServicioResumen, equipo: string | null): FilaLista[] => {
  const { d, m, dow } = partes(s.fecha)
  return s.equipos.filter(e => !equipo || e.teamId === equipo).map(e => ({
    clave: `${s.id}-${e.teamId}`, servicioId: s.id, teamId: e.teamId, color: e.color,
    diaSemana: DIAS_CORTOS[dow], dia: String(d), mes: MESES_CORTOS[m - 1], cuando: `${DIAS[dow]} ${d} de ${MESES[m - 1]}`,
    nombre: s.tipo === 'ensayo' ? `Ensayo · ${e.nombre}` : e.nombre, detalle: detalleDe(s, e), estado: estadoDeFila(e, s.terminado), terminado: s.terminado,
  }))
}

/** Los servicios que no terminaron, en orden de fecha (el orden que ya trae el resumen). `equipo` deja solo las filas de ese equipo. */
export const filasProximas = (servicios: ServicioResumen[], equipo: string | null = null): FilaLista[] => servicios.filter(s => !s.terminado).flatMap(s => filasDe(s, equipo))

/** Los últimos `maximo` servicios terminados, del más reciente al más antiguo (el resumen ya los trae en ese orden, después de los próximos). */
export const filasHistorial = (servicios: ServicioResumen[], equipo: string | null = null, maximo = HISTORIAL_FILAS): FilaLista[] =>
  servicios.filter(s => s.terminado).slice(0, maximo).flatMap(s => filasDe(s, equipo))

/** Los equipos que aparecen en algún servicio, en el orden en que aparecen, para los chips del filtro. */
export function equiposDeLista(servicios: ServicioResumen[]): { teamId: string; nombre: string; color: string | null }[] {
  const vistos = new Map<string, { teamId: string; nombre: string; color: string | null }>()
  for (const s of servicios) for (const e of s.equipos) if (!vistos.has(e.teamId)) vistos.set(e.teamId, { teamId: e.teamId, nombre: e.nombre, color: e.color })
  return Array.from(vistos.values())
}
