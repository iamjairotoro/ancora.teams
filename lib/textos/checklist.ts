// Textos del checklist por posición (teléfono). Tuteo chileno neutro. NADA promete actualización en vivo: la pantalla se actualiza al abrirla, al volver a la app y con el botón «Actualizar».
import { contar } from './plural'

export const TEXTOS_CHECKLIST = {
  tuPosicion: 'Tu posición',
  tusPosiciones: 'Tus posiciones',
  soloLoTuyo: 'Solo ves lo de tu posición. El líder del equipo ve el checklist completo.',
  soloLoTuyoVarias: 'Solo ves lo de tus posiciones. El líder del equipo ve el checklist completo.',
  liderIntro: 'Se divide por posición. Cada persona ve solo la suya.',
  nominaNota: 'Las posiciones salen de la nómina de este domingo. Si una posición no tiene persona, solo tú ves sus ítems.',
  sinPersona: 'Sin persona este domingo',
  pendiente: 'Pendiente de confirmar',
  general: 'General',
  actualizaNota: 'Se actualiza al abrir esta pantalla y cada vez que vuelves a la app. Si no ves un cambio, toca «Actualizar».',
  actualizar: 'Actualizar',
  actualizando: 'Actualizando…',
  noSePudoActualizar: 'No se pudo actualizar. Revisa tu conexión e inténtalo de nuevo.',
  sinItems: 'Esta posición todavía no tiene ítems.',
  sinChecklist: 'Tu equipo todavía no tiene un checklist para este servicio.',
  anadirItem: 'Añadir ítem',
} as const

export const listosDe = (listos: number, total: number): string => `${listos} de ${total} listos`
export const faltan = (n: number): string => `Faltan ${n}`
export const marcadoPor = (quien: string, hora: string): string => `${quien} · ${hora}`
export const loMarcasteTu = (hora: string): string => `Lo marcaste tú · ${hora}`
/** Aviso al líder cuando una plantilla trae posiciones que ese domingo no existen. */
export const plantillaFuera = (nombres: string[]): string => (nombres.length === 1 ? `Esta posición no existe este domingo y no se aplicó: ${nombres[0]}.` : `Estas posiciones no existen este domingo y no se aplicaron: ${nombres.join(', ')}.`)
export const itemsDe = (n: number): string => contar(n, 'ítem', 'ítems')
