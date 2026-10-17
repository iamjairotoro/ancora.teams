// Las horas y los días de los chats del portal (punto 54, commit 6), siempre con el DÍA DE CHILE (America/Santiago), no con la hora del navegador: «Hoy», «Ayer» o el día de la última línea de la lista, y la
// hora de cada burbuja. Sin acceso a datos ni a servidor.
import { diasHasta, fechaConDia, hoyEnSantiago } from '@/lib/portal/fechas'

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const valido = (iso: string) => !Number.isNaN(new Date(iso).getTime())

/** «14:05» en hora de Chile (24 h). */
export function horaChat(iso: string): string {
  if (!valido(iso)) return ''
  const p = new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
  return `${p.find(x => x.type === 'hour')!.value}:${p.find(x => x.type === 'minute')!.value}`
}

/** Lo que va a la derecha de una fila de la lista: la hora si fue hoy, «Ayer», el día de la semana si fue esta semana, o «5 oct». */
export function etiquetaListaChat(iso: string, ahora: Date = new Date()): string {
  if (!valido(iso)) return ''
  const dia = hoyEnSantiago(new Date(iso)), atras = diasHasta(hoyEnSantiago(ahora), dia)      // días desde el mensaje hasta hoy
  if (atras <= 0) return horaChat(iso)
  if (atras === 1) return 'Ayer'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dia)!
  if (atras < 7) return DIAS_CORTOS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).getUTCDay()]
  return `${+m[3]} ${MESES_CORTOS[+m[2] - 1]}`
}

/** El separador de día dentro de un chat: «Hoy», «Ayer» o «Domingo, 4 de octubre». */
export function separadorDiaChat(iso: string, ahora: Date = new Date()): string {
  if (!valido(iso)) return ''
  const dia = hoyEnSantiago(new Date(iso)), atras = diasHasta(hoyEnSantiago(ahora), dia)
  return atras <= 0 ? 'Hoy' : atras === 1 ? 'Ayer' : fechaConDia(dia)
}

/** El día de Chile de un mensaje (para saber cuándo cambia el día en la conversación). */
export const diaDeChat = (iso: string): string => (valido(iso) ? hoyEnSantiago(new Date(iso)) : '')
