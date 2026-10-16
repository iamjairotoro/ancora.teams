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
