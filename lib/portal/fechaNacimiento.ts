// La fecha de nacimiento del Perfil: SOLO lo que la persona eligió. Sin fecha guardada no se muestra ni se guarda ninguna (nunca «hoy»). Pura, sin datos ni servidor.
import { TEXTOS_PERFIL_PORTAL } from '@/lib/textos/perfilPortal'

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** «1990-11-06» → true; vacío, formato raro o día imposible (1990-02-31) → false. */
export function fechaNacimientoValida(v: string | null | undefined): v is string {
  const m = typeof v === 'string' ? ISO.exec(v) : null
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

/** Lo que muestra el campo: la fecha escrita («6 de noviembre de 1990») o «Elegir fecha» si no hay ninguna válida. */
export function textoFechaNacimiento(v: string | null | undefined): string {
  if (!fechaNacimientoValida(v)) return TEXTOS_PERFIL_PORTAL.elegirFecha
  return new Date(`${v}T12:00:00Z`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Lo que se manda al guardar: la fecha tal cual si es válida; si no, cadena vacía (nunca la fecha de hoy ni un valor inventado). */
export const fechaNacimientoParaGuardar = (v: string | null | undefined): string => (fechaNacimientoValida(v) ? v : '')
