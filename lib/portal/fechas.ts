// Fechas del portal en español (punto 54, commit 2). «Domingo, 18 de octubre»: solo la primera letra del día va en mayúscula (el mes va en minúscula; antes salía «Domingo 18 De Octubre»).
// `fecha` es la de services.fecha (AAAA-MM-DD); se lee a mediodía para que ningún huso la corra de día. Sin acceso a datos ni a servidor.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function fechaConDia(fecha: string | null | undefined, conAnio = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha || '')
  if (!m) return ''
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
  const dia = DIAS[d.getUTCDay()]
  return `${dia[0].toLocaleUpperCase('es')}${dia.slice(1)}, ${+m[3]} de ${MESES[+m[2] - 1]}${conAnio ? ` de ${m[1]}` : ''}`
}

/** «el 21 y el 22 de octubre» · «el 21, el 22 y el 23 de octubre» · «el 30 de octubre y el 1 de noviembre»: el mes solo se dice al final de cada tramo del mismo mes. `fechas` son AAAA-MM-DD, en orden. */
export function listaDeDias(fechas: string[]): string {
  const ds = fechas.map(f => /^(\d{4})-(\d{2})-(\d{2})/.exec(f)).filter((m): m is RegExpExecArray => !!m).map(m => ({ mes: +m[2], dia: +m[3] }))
  const items = ds.map((d, i) => `el ${d.dia}${i === ds.length - 1 || ds[i + 1].mes !== d.mes ? ` de ${MESES[d.mes - 1]}` : ''}`)
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** La fecha de hoy en America/Santiago (AAAA-MM-DD): «Hoy» y «Mañana» se cuentan con el día de Chile, no con el reloj del aparato. */
export function hoyEnSantiago(ahora: Date = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(ahora)
  const g = (t: string) => p.find(x => x.type === t)!.value
  return `${g('year')}-${g('month')}-${g('day')}`
}

/** Días de calendario desde `hoy` hasta `fecha` (0 = hoy, 1 = mañana, negativo = ya pasó). */
export function diasHasta(fecha: string, hoy: string = hoyEnSantiago()): number {
  const u = (f: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN }
  return Math.round((u(fecha) - u(hoy)) / 86400000)
}

/** «Hoy», «Mañana», «En 5 días»; null si ya pasó o la fecha no es válida. */
export function textoRelativo(dias: number): string | null {
  if (!Number.isFinite(dias) || dias < 0) return null
  return dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`
}
