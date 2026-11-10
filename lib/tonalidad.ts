// Elegir un tono por LETRA y alteración (hoja «Previsualizar tonalidad», C3d). Funciones puras. Solo se ofrecen tonos del MISMO modo que la canción (lib/tonos.ts): una canción en menor solo cambia entre menores.
import { esTonoMenor, tonosDelMismoModo } from './tonos'

export type Alteracion = '' | 'b' | '#'
/** Las letras en el orden de la hoja (como en el mockup): C D E F G A B. */
export const LETRAS_TONO = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

/** Una letra + alteración → el tono (con «m» si la canción es menor), o null si esa combinación no existe (no hay «Cb», «Fb», «B#» ni «E#»). */
export function tonoDe(original: string, letra: string, alt: Alteracion): string | null {
  const t = letra + alt + (esTonoMenor(original) ? 'm' : '')
  return tonosDelMismoModo(original).includes(t) ? t : null
}

/** Un tono de lectura → su letra y alteración (para marcar la hoja). null si no es un tono válido. */
export function partesDeTono(tono: string): { letra: string; alt: Alteracion } | null {
  const m = /^([A-G])([#b]?)m?$/.exec(tono)
  return m ? { letra: m[1], alt: m[2] as Alteracion } : null
}

/** Al tocar una LETRA: se queda con la alteración que ya había si el tono existe; si no, la letra sola. */
export function alElegirLetra(original: string, actual: string, letra: string): string | null {
  const alt = partesDeTono(actual)?.alt ?? ''
  return tonoDe(original, letra, alt) ?? tonoDe(original, letra, '')
}

/** Al tocar ♭ o ♯: pone esa alteración a la letra actual; si ya la tenía, la quita. null si ese tono no existe para la letra (el botón va apagado). */
export function alElegirAlteracion(original: string, actual: string, alt: '' | 'b' | '#'): string | null {
  const p = partesDeTono(actual); if (!p) return null
  return tonoDe(original, p.letra, p.alt === alt ? '' : alt)
}
