// La lista de Servicios en teléfono (components/servicio-movil/ListaServicios.tsx, mockup Servicios-B), armada desde el resumen por equipo (lib/admin/resumenServicios.ts). PURAS; solo conteos y estados.
// UNA FILA POR SERVICIO (no por equipo): el día, el nombre con los cuadritos de los equipos que participan y, debajo, «horario · estado» y lo que falta en ámbar («5 sin cubrir», «2 sin responder»), todo como texto.
// Un servicio recién creado (sin asignados, convocados ni cupos) NO tiene equipos «participantes» en el resumen (`equipos: []`, ver resumenServicios): igual tiene su fila, sin cuadritos y «Sin convocar».
// Quien es líder ve solo SU equipo: sus cuadritos y sus números; un servicio en el que participan otros equipos pero no el suyo no sale (uno sin ningún equipo todavía sí: no revela nada).
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { equiposVisiblesDelResumen } from '@/lib/admin/equiposDelResumen'
import { nombreDeServicio } from '@/lib/admin/nombreDeServicio'
import { horario } from '@/lib/home/hoy'
import { MESES_CORTOS } from '@/lib/home/formato'
import type { Viewer } from '@/lib/teamBlocks'
import { TEXTOS_HOME } from '@/lib/textos/home'
import { TEXTOS_SERVICIO as T, sinCubrirN, sinResponderN } from '@/lib/textos/servicio'

/** Cuántos servicios ya terminados muestra «Ver historial» (los más recientes). */
export const HISTORIAL_FILAS = 10
/** Cuántos cuadritos de equipo caben en la fila; el resto va en «+N». */
export const MAX_CUADRITOS = 5

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const ADMIN: Viewer = { kind: 'admin' }

export interface CuadritoEquipo { teamId: string; nombre: string; color: string | null; inicial: string }
export interface FilaServicio {
  servicioId: string
  diaSemana: string       // «dom»
  dia: string             // «25»
  mes: string             // «oct»
  cuando: string          // «domingo 25 de octubre» (para lectores de pantalla)
  nombre: string          // «Servicio Ancora», «Ensayo»
  equipos: CuadritoEquipo[]
  horario: string         // «10:00 – 14:00» (puede ir vacío)
  estado: string          // «Sin convocar» · «Convocado» · «Completo» · «Terminado»
  /** Lo que falta, en ámbar: «5 sin cubrir», «2 sin responder». Siempre texto (el estado nunca depende solo del color). */
  ambar: string[]
  terminado: boolean
}

const partes = (fecha: string) => { const [a, m, d] = fecha.split('-').map(Number), dow = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay(); return { d, m, dow } }
export { nombreDeServicio }

function filaDe(s: ServicioResumen, viewer: Viewer): FilaServicio | null {
  const equipos = equiposVisiblesDelResumen(s.equipos, viewer)
  if (viewer.kind === 'leader' && s.equipos.length > 0 && equipos.length === 0) return null
  const { d, m, dow } = partes(s.fecha)
  const sinCubrir = equipos.reduce((n, e) => n + e.vacantes, 0), sinResponder = equipos.reduce((n, e) => n + e.sinResponder, 0)
  const convocado = equipos.some(e => e.estado === 'convocado')
  const ambar = s.terminado ? [] : [...(sinCubrir > 0 ? [sinCubrirN(sinCubrir)] : []), ...(sinResponder > 0 ? [sinResponderN(sinResponder)] : [])]
  const estado = s.terminado ? T.terminado : !convocado ? TEXTOS_HOME.sinConvocar : ambar.length === 0 ? T.completo : T.convocado
  return {
    servicioId: s.id, diaSemana: DIAS_CORTOS[dow], dia: String(d), mes: MESES_CORTOS[m - 1], cuando: `${DIAS[dow]} ${d} de ${MESES[m - 1]}`,
    nombre: nombreDeServicio(s), equipos: equipos.map(e => ({ teamId: e.teamId, nombre: e.nombre, color: e.color, inicial: (e.nombre.trim()[0] || '?').toLocaleUpperCase('es') })),
    horario: horario(s).replace(' — ', ' – '), estado, ambar, terminado: s.terminado,
  }
}

/** Los servicios que no terminaron, en orden de fecha (el orden que ya trae el resumen). */
export const filasProximas = (servicios: ServicioResumen[], viewer: Viewer = ADMIN): FilaServicio[] =>
  servicios.filter(s => !s.terminado).map(s => filaDe(s, viewer)).filter((f): f is FilaServicio => f !== null)

/** Los últimos `maximo` servicios terminados, del más reciente al más antiguo (el resumen ya los trae en ese orden, después de los próximos). */
export const filasHistorial = (servicios: ServicioResumen[], viewer: Viewer = ADMIN, maximo = HISTORIAL_FILAS): FilaServicio[] =>
  servicios.filter(s => s.terminado).map(s => filaDe(s, viewer)).filter((f): f is FilaServicio => f !== null).slice(0, maximo)

/** Los cuadritos que caben y cuántos equipos quedan en «+N». */
export const cuadritosVisibles = (equipos: CuadritoEquipo[], maximo = MAX_CUADRITOS): { items: CuadritoEquipo[]; mas: number } => ({ items: equipos.slice(0, maximo), mas: Math.max(0, equipos.length - maximo) })
