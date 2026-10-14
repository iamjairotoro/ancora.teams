// Cómo se LEE el estado de una convocatoria (punto 52). Una invitación declinada puede ser DOS cosas distintas:
//   · la persona dijo «no puedo»                          → rechazo («No pudo»)
//   · la persona aceptó en OTRO equipo que se cruza        → declined_reason = 'conflict': NO es un rechazo, no cuenta como «No pudo» en ningún conteo.
// Una sola regla para el portal, Home, el historial de la persona, la nómina y EnsayoPanel: ningún lugar compara `status === 'declinado'` por su cuenta.
// Sin acceso a datos ni a servidor.

export interface InvEstado { status?: string | null; declined_reason?: string | null }

export type EstadoConvocatoria = 'confirmado' | 'pendiente' | 'rechazo' | 'otro-equipo'

/** Declinada porque la persona aceptó en otro equipo (mismo día y horario que se cruza). */
export const esDeOtroEquipo = (i: InvEstado | null | undefined): boolean => i?.status === 'declinado' && i?.declined_reason === 'conflict'

/** Declinada por decisión de la persona. Es lo ÚNICO que cuenta como «No pudo». */
export const cuentaComoRechazo = (i: InvEstado | null | undefined): boolean => i?.status === 'declinado' && i?.declined_reason !== 'conflict'

/** El estado que se dibuja; null si no hay invitación. */
export function estadoConvocatoria(i: InvEstado | null | undefined): EstadoConvocatoria | null {
  if (!i?.status) return null
  if (esDeOtroEquipo(i)) return 'otro-equipo'
  if (i.status === 'confirmado') return 'confirmado'
  if (i.status === 'declinado') return 'rechazo'
  return 'pendiente'
}

/** «Aceptó en Producción»; sin nombre (el enlace se perdió), «Aceptó en otro equipo». */
export const textoAceptoEn = (equipo?: string | null): string => (equipo?.trim() ? `Aceptó en ${equipo.trim()}` : 'Aceptó en otro equipo')

/** «Declinada · aceptaste en Producción» (lo que lee la propia persona, en segunda persona). */
export const textoDeclinadaPersona = (equipo?: string | null): string => (equipo?.trim() ? `Declinada · aceptaste en ${equipo.trim()}` : 'Declinada · aceptaste en otro equipo')
