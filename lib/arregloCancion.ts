// «Repetir ×N» (paso D de «Nueva canción»): la lógica pura de las repeticiones de cada parte y del arreglo que se manda al guardar. Sin pantalla ni red.
//
// Una repetición NO crea otra sección: la parte se canta seguido N veces con la misma letra. Se guarda en `songs.default_arrangement` (entradas {sectionId, label, repeat} enlazadas por sectionId), que es lo que ya lee la lectura del músico.
// En la pantalla las repeticiones viven en memoria hasta Guardar, por parte (clave = su nombre + su lugar entre las de igual nombre, para que sobrevivan a escribir la letra: un «CORO:» sin letra y el «CORO:» con letra son la misma parte).
// Al guardar, el cuerpo lleva `arreglo: [{ indice, repeat }]` (índice de la sección en el texto) y es EL SERVIDOR quien decide si lo escribe (solo si la canción no tiene un arreglo propio) y quien pone los `sectionId`.

export const REPETICION_MIN = 1
export const REPETICION_MAX = 9
export type Repeticiones = Record<string, number>
export type EntradaArreglo = { indice: number; repeat: number }

/** Una repetición válida: entero de 1 a 9 (lo demás se lleva al extremo más cercano; lo que no es número, a 1). */
export const repeticionEntre = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? Math.min(REPETICION_MAX, Math.max(REPETICION_MIN, Math.trunc(n))) : REPETICION_MIN)

/** La clave de la parte `i` entre las partes con estos nombres: «CORO#0» la primera que se llama CORO, «CORO#1» la segunda… */
export function claveDeParte(nombres: string[], i: number): string {
  let k = 0
  for (let j = 0; j < i; j++) if (nombres[j] === nombres[i]) k++
  return `${nombres[i] ?? ''}#${k}`
}

/** Las repeticiones de cada parte (1 si no se tocó), en el orden de las partes. */
export const repeticionesDeLasPartes = (nombres: string[], r: Repeticiones): number[] => nombres.map((_, i) => repeticionEntre(r[claveDeParte(nombres, i)] ?? 1))

/** Cambia la repetición de la parte `i` (1 a 9); 1 quita la clave (vuelve a «sin repetir»). No modifica `r`. */
export function conRepeticion(r: Repeticiones, nombres: string[], i: number, n: number): Repeticiones {
  const clave = claveDeParte(nombres, i), v = repeticionEntre(n), sig = { ...r }
  if (v === REPETICION_MIN) delete sig[clave]; else sig[clave] = v
  return sig
}

/** El `arreglo` que se manda al guardar: una entrada por parte, en orden. `undefined` si ninguna se repite (entonces NO se manda nada y la canción queda sin arreglo propio: la lectura usa las secciones en orden). */
export function arregloParaGuardar(nombres: string[], r: Repeticiones): EntradaArreglo[] | undefined {
  const rep = repeticionesDeLasPartes(nombres, r)
  return rep.some(n => n > 1) ? rep.map((repeat, indice) => ({ indice, repeat })) : undefined
}

/** ¿La canción ya tiene un arreglo propio guardado? Solo `null` (o ausente) cuenta como vacío: cualquier otra cosa, aunque sea una lista vacía o rara, NO se toca. */
export const tieneArregloPropio = (arreglo: unknown): boolean => arreglo !== null && arreglo !== undefined
