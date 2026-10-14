// El VENCIMIENTO de una convocatoria (punto 52, commit 5): se puede responder hasta el FINAL del día del servicio en America/Santiago; desde las 00:00 del
// día siguiente (hora de Chile) ya no. La regla de verdad vive en la base (migración 037d: convocatoria_cerrada, dentro de las funciones que responden);
// esta es su gemela para PINTAR la pantalla (ocultar botones, decir «ya cerró») y se prueba contra la función SQL en los bordes. Comparar FECHA contra FECHA
// (no horas) hace que el cambio de horario de Chile —que ocurre a medianoche— no mueva el cierre. Sin acceso a datos ni a servidor.

export const ZONA_CONVOCATORIAS = 'America/Santiago'
export const TEXTO_CERRADA = 'Esta convocatoria ya cerró'

// en-CA da AAAA-MM-DD, que ordena igual que una fecha.
const FORMATO = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_CONVOCATORIAS, year: 'numeric', month: '2-digit', day: '2-digit' })

/** La fecha de hoy en Chile, como AAAA-MM-DD. */
export function hoyEnSantiago(ahora: Date = new Date()): string {
  return FORMATO.format(ahora)
}

/** ¿Ya pasó el día del servicio (en Chile)? `fecha` es la de services.fecha (AAAA-MM-DD). Sin fecha válida no se afirma nada: abierta. */
export function convocatoriaCerrada(fecha: string | null | undefined, ahora: Date = new Date()): boolean {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return false
  return hoyEnSantiago(ahora) > fecha.slice(0, 10)
}
