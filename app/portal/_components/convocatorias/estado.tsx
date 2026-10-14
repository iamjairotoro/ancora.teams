'use client'
// El ESTADO de una convocatoria, leído por la FORMA y por el texto — nunca solo por el color (punto 52).
//   confirmado  → círculo lleno con ✓           pendiente → círculo hueco con relleno ámbar        cambio de rol → círculo ámbar con «!»
//   rechazo     → círculo TACHADO en rojo       otro equipo (aceptó en otro) → círculo TACHADO en gris neutro (NO es un rechazo)
import { estadoConvocatoria, textoDeclinadaPersona } from '@/lib/convocatoriaEstado'
import type { EntradaConvocatoria } from './tipos'
import ui from './convocatorias.module.css'

export type VistaEstado = 'confirmado' | 'pendiente' | 'rechazo' | 'otro-equipo' | 'cambio-de-rol'

export function vistaDeEntrada(e: Pick<EntradaConvocatoria, 'invitation'>): VistaEstado | null {
  const est = estadoConvocatoria(e.invitation)
  if (!est) return null
  if (est === 'confirmado' && e.invitation?.needs_reassignment_confirm) return 'cambio-de-rol'
  return est
}

/** La frase que lee la propia persona. */
export function textoEstado(e: EntradaConvocatoria): string {
  switch (vistaDeEntrada(e)) {
    case 'confirmado': return 'Confirmada'
    case 'cambio-de-rol': return 'Tu rol cambió — aún no confirmas'
    case 'rechazo': return 'Dijiste que no puedes'
    case 'otro-equipo': return textoDeclinadaPersona(e.reemplazadaPor?.name)
    case 'pendiente': return 'Pendiente de tu respuesta'
    default: return ''
  }
}

const CLASE: Record<VistaEstado, string> = {
  confirmado: ui.dotOk, pendiente: ui.dotPe, 'cambio-de-rol': ui.dotRol, rechazo: ui.dotNo, 'otro-equipo': ui.dotOtro,
}

/** El círculo de estado. Decorativo (aria-hidden): el texto de al lado dice lo mismo. */
export function IndicadorEstado({ vista }: { vista: VistaEstado }) {
  return <span className={`${ui.dot} ${CLASE[vista]}`} aria-hidden="true">{vista === 'confirmado' ? '✓' : vista === 'cambio-de-rol' ? '!' : ''}</span>
}
