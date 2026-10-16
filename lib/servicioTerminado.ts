// ¿Ya TERMINÓ un servicio? (punto 54, commit 2; lo usará también la tarjeta destacada del Inicio). Un servicio termina a su hora de fin EN America/Santiago, no a la del aparato ni a la
// del servidor; sin hora de fin, a las 14:00 (como en el resto de la app). Si la hora de fin no es posterior a la de inicio (un servicio que cruza la medianoche), termina al día siguiente.
// No es lo mismo que «la convocatoria cerró» (fin del DÍA, lib/convocatoriaCerrada.ts): las listas conservan el servicio hasta el cierre, pero lo que se ofrece como «el próximo» es el que aún
// no terminó. Sin acceso a datos ni a servidor.
import { ZONA_CONVOCATORIAS } from './convocatoriaCerrada'

export const HORA_FIN_POR_DEFECTO = '14:00'

const partes = (instante: number) => {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_CONVOCATORIAS, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p: Record<string, number> = {}
  for (const x of f.formatToParts(new Date(instante))) if (x.type !== 'literal') p[x.type] = Number(x.value)
  return p
}
// cuánto se adelanta la hora de pared de Chile respecto de UTC en ese instante (negativo: -3 h o -4 h)
const desfase = (instante: number) => { const p = partes(Math.floor(instante / 1000) * 1000); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instante / 1000) * 1000 }

/** El instante (ms UTC) en que en Chile son `fecha` (AAAA-MM-DD) y `hora` (HH:MM o HH:MM:SS). null si no se pueden leer. */
export function instanteEnSantiago(fecha: string, hora: string): number | null {
  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || ''), h = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(hora || '')
  if (!f || !h) return null
  const pared = Date.UTC(+f[1], +f[2] - 1, +f[3], +h[1], +h[2], +(h[3] || 0))
  const d1 = desfase(pared); let t = pared - d1
  const d2 = desfase(t); if (d2 !== d1) t = pared - d2        // el cambio de horario cae entre medio: se corrige con el desfase real de ese instante
  return t
}

const minutos = (hora?: string | null) => { const h = /^(\d{1,2}):(\d{2})/.exec(hora || ''); return h ? +h[1] * 60 + +h[2] : null }

const diaSiguiente = (fecha: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha)!; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + 1, 12)).toISOString().slice(0, 10) }

export function servicioTerminado(fecha: string | null | undefined, horaFin?: string | null, ahora: Date = new Date(), horaInicio?: string | null): boolean {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return false
  const fin = horaFin && minutos(horaFin) !== null ? horaFin : HORA_FIN_POR_DEFECTO
  const ini = minutos(horaInicio), f = minutos(fin)
  // Si la hora de fin no es posterior a la de inicio, el servicio cruza la medianoche: termina a esa hora del DÍA SIGUIENTE (en hora de pared de Chile, no sumando 24 h: un cambio de horario lo correría).
  const cruza = ini !== null && f !== null && f <= ini
  const t = instanteEnSantiago(cruza ? diaSiguiente(fecha) : fecha, fin)
  return t !== null && ahora.getTime() >= t
}
