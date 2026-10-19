// Textos cortos del Home en teléfono. PURAS.
/** «Ana M.»: el nombre y la inicial del apellido (en teléfono no se muestra el apellido completo). */
export function nombreCorto(nombre?: string | null, apellido?: string | null): string {
  const n = (nombre ?? '').trim(), a = (apellido ?? '').trim()
  return a ? `${n} ${a[0].toLocaleUpperCase('es')}.`.trim() : n || '—'
}

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Cuándo es un cumpleaños: «Hoy», «Mañana» o «24 oct». Solo día y mes (nunca el año ni la edad). */
export function cuandoCumple(c: { dia: number; mes: number; enDias: number }): string {
  return c.enDias === 0 ? 'Hoy' : c.enDias === 1 ? 'Mañana' : `${c.dia} ${MESES_CORTOS[c.mes - 1]}`
}

/** «1 servicio», «11 servicios». */
export const textoServicios = (n: number): string => (n === 1 ? '1 servicio' : `${n} servicios`)
