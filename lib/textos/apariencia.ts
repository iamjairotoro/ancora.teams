// Textos de la apariencia (tema) del Perfil en teléfono: el botón redondo de arriba a la derecha y su menú. «Sistema» se dice «Automático» (sigue el tema del teléfono).
import type { ThemePref } from '@/lib/useDarkMode'

export const TEXTOS_APARIENCIA = {
  menu: 'Apariencia',
  automatico: 'Automático',
  claro: 'Claro',
  oscuro: 'Oscuro',
} as const

export const NOMBRE_TEMA: Record<ThemePref, string> = { system: TEXTOS_APARIENCIA.automatico, light: TEXTOS_APARIENCIA.claro, dark: TEXTOS_APARIENCIA.oscuro }
/** Etiqueta del botón (solo ícono): dice la opción actual. */
export const etiquetaBotonApariencia = (p: ThemePref): string => `${TEXTOS_APARIENCIA.menu}: ${NOMBRE_TEMA[p]}`
