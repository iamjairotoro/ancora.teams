// Qué variante de una sección es la «viva» (la que se lee). Lo comparten el lector del portal (lib/portal/acordesCancion.ts) y el guardado del editor (lib/admin/guardarAcordes.ts), para que digan lo mismo.
// El editor NUNCA borra: la variante que reemplaza queda como «Respaldo · …» y la nueva espera como «Nuevo · …» hasta publicarse; el lector ignora las dos. Una sección dada de baja lleva el código con «__» delante.
export const PREFIJO_RESPALDO = 'Respaldo · '
export const PREFIJO_PENDIENTE = 'Nuevo · '
export const PREFIJO_INACTIVA = '__'
export const ETIQUETA_VIVA = 'Principal'

export interface VarianteBase { id?: string; label?: string | null; is_default?: boolean | null }
export const esRespaldo = (label: unknown): boolean => typeof label === 'string' && label.startsWith(PREFIJO_RESPALDO)
export const esPendiente = (label: unknown): boolean => typeof label === 'string' && label.startsWith(PREFIJO_PENDIENTE)
/** ¿Es una variante que se lee? (ni respaldo ni pendiente). */
export const esViva = (label: unknown): boolean => !esRespaldo(label) && !esPendiente(label)
export const seccionActiva = (code: unknown): boolean => !(typeof code === 'string' && code.startsWith(PREFIJO_INACTIVA))

/** De las variantes de UNA sección: la que se lee. La del arreglo por etiqueta, si la pide; si no la predeterminada; si no, la única viva. Con varias vivas y ninguna predeterminada no se adivina: null. */
export function elegirVariante<T extends VarianteBase>(variantes: T[], etiquetaPedida?: string | null): T | null {
  const vivas = variantes.filter(v => esViva(v.label))
  return (etiquetaPedida ? vivas.find(v => v.label === etiquetaPedida) : undefined) || vivas.find(v => v.is_default) || (vivas.length === 1 ? vivas[0] : null)
}
