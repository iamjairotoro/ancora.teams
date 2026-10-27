// «Convocado a dos equipos» (punto 4; mockups Doble-A a Doble-D). Funciones PURAS: qué convocatorias de una persona chocan, cuáles se declinan al confirmar una, cómo se ordenan las tarjetas del detalle del servicio y el texto
// que explica el cruce. El choque replica EXACTAMENTE la regla de la base (migración 037c, `convocatorias_en_conflicto`): MISMO día y horas que se traslapan (nulos = 10:00 y 14:00; traslape ESTRICTO), entre convocatorias ENVIADAS
// y de equipo (los ensayos no entran); es más amplia que «mismo servicio». Varias posiciones del MISMO equipo en un servicio son UNA convocatoria con UNA respuesta (una invitación por servicio, persona y equipo): una tarjeta por
// equipo, con sus posiciones juntas. Sin acceso a datos ni a servidor; el servidor sigue siendo quien decide (función `responder_convocatoria`). Nunca un porcentaje individual ni quién rechazó.
import { seCruzan } from '@/lib/portal/agruparServicios'
import { fechaConDia } from '@/lib/portal/fechas'
import { estadoConvocatoria, type EstadoConvocatoria } from '@/lib/convocatoriaEstado'
import { TEXTOS_DOBLE as T } from '@/lib/textos/doble'

export interface EntradaDoble {
  service: { id: string; fecha: string; tipo?: string; hora_inicio?: string | null; hora_fin?: string | null }
  team?: { id: string; name: string; color?: string | null } | null
  invitation: { id?: string; status: string; sent_at?: string | null; declined_reason?: string | null; needs_reassignment_confirm?: boolean } | null
  posiciones: string[]
  cerrada?: boolean
}

const mismaInvitacion = (a: EntradaDoble, b: EntradaDoble): boolean => a === b || (!!a.invitation?.id && a.invitation.id === b.invitation?.id)

/** ¿Cuenta para el choque? Enviada, con equipo y que no sea ensayo (igual que la base). */
export const cuentaParaChoque = (e: EntradaDoble): boolean => !!e.invitation?.sent_at && !!e.team && e.service.tipo !== 'ensayo'

/** Las OTRAS convocatorias de la persona que chocan con ésta (mismo día, horas que se traslapan). */
export function enChoque<E extends EntradaDoble>(entrada: E, todas: readonly E[]): E[] {
  if (!cuentaParaChoque(entrada)) return []
  return todas.filter(e => !mismaInvitacion(e, entrada) && cuentaParaChoque(e) && seCruzan(entrada.service, e.service))
}

/** Las que quedarían DECLINADAS al confirmar ésta: las pendientes que chocan y siguen abiertas (la base no toca las confirmadas ni las que la persona declinó). */
export const aDeclinar = <E extends EntradaDoble>(entrada: E, todas: readonly E[]): E[] =>
  enChoque(entrada, todas).filter(e => estadoConvocatoria(e.invitation) === 'pendiente' && !e.cerrada)

/** ¿Hay otra convocatoria CONFIRMADA que choca? Entonces confirmar no basta: la base pide «Aceptar aquí en su lugar» (o «Cambiar»). */
export const confirmadaEnChoque = <E extends EntradaDoble>(entrada: E, todas: readonly E[]): E | null =>
  enChoque(entrada, todas).find(e => estadoConvocatoria(e.invitation) === 'confirmado') ?? null

const PESO: Record<EstadoConvocatoria, number> = { confirmado: 0, pendiente: 1, 'otro-equipo': 2, rechazo: 3 }
/** Las convocatorias de UN servicio, listas para el detalle: solo las enviadas; la confirmada arriba, luego las sin responder, luego la declinada automática y al final la que la persona rechazó. Estable dentro de cada grupo. */
export function convocatoriasDelServicio<E extends EntradaDoble>(todas: readonly E[], servicioId: string): E[] {
  return todas
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.service.id === servicioId && !!e.invitation?.sent_at && e.service.tipo !== 'ensayo')
    .sort((a, b) => (PESO[estadoConvocatoria(a.e.invitation) ?? 'pendiente'] - PESO[estadoConvocatoria(b.e.invitation) ?? 'pendiente']) || a.i - b.i)
    .map(({ e }) => e)
}

/** ¿El detalle muestra varias tarjetas? Solo con 2 o más convocatorias enviadas del mismo servicio. */
export const esDoble = (entradas: readonly EntradaDoble[]): boolean => entradas.length > 1

/** Con una convocatoria confirmada se desbloquean el orden, el equipo y el cronograma (la que manda es la confirmada). */
export const entradaConfirmada = <E extends EntradaDoble>(entradas: readonly E[]): E | null => entradas.find(e => estadoConvocatoria(e.invitation) === 'confirmado') ?? null

/** La que se usa para el color y los paneles del detalle: la confirmada; si no hay, la primera sin responder; si no, la primera. */
export const entradaPrincipal = <E extends EntradaDoble>(entradas: readonly E[]): E | null =>
  entradaConfirmada(entradas) ?? entradas.find(e => estadoConvocatoria(e.invitation) === 'pendiente') ?? entradas[0] ?? null

/** ¿Alguna sigue sin responder y abierta? (el chip «Por responder» no se va mientras quede alguna). */
export const quedaAlgunaPorResponder = (entradas: readonly EntradaDoble[]): boolean => entradas.some(e => estadoConvocatoria(e.invitation) === 'pendiente' && !e.cerrada)

const rango = (s: EntradaDoble['service']): string => {
  const h = (v: string | null | undefined, d: string) => /^(\d{1,2}:\d{2})/.exec(v || '')?.[1]?.padStart(5, '0') ?? d
  return `${h(s.hora_inicio, '10:00')} a ${h(s.hora_fin, '14:00')}`
}
const diaLargo = (fecha: string): string => { const t = fechaConDia(fecha).replace(', ', ' '); return t ? t[0].toLocaleLowerCase('es') + t.slice(1) : '' }

/** La regla del choque, dicha en el aviso de confirmación: «Se cruzan el sábado 31 de octubre, de 10:00 a 14:00.» Si los horarios difieren, se dice cada uno. */
export function textoDelCruce(entrada: EntradaDoble, otras: readonly EntradaDoble[]): string {
  const dia = diaLargo(entrada.service.fecha), propio = rango(entrada.service)
  if (otras.every(o => rango(o.service) === propio)) return `Se cruzan el ${dia}, de ${propio}.`
  const por = [entrada, ...otras].map(e => `${e.team?.name ?? 'otro equipo'} ${rango(e.service)}`).join(' · ')
  return `Se cruzan el ${dia} (${por}).`
}
