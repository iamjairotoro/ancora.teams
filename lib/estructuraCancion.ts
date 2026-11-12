// La ESTRUCTURA de una canción en «Nueva canción» (paso S1): la lista, en orden, de REFERENCIAS a sus partes. La misma parte puede aparecer varias veces, también no seguidas (V1, V2, C, V1, V2, C, Bd, V3, C); la letra de cada parte se escribe UNA sola vez
// en el texto. Lógica pura: sin pantalla ni red (la pantalla llega en S3; el servidor, en S2).
//
// · Una referencia es la CLAVE de la parte (`claveDeParte`: su nombre + su lugar entre las de igual nombre, la misma que usa «Repetir ×N» del paso D): sobrevive a escribir la letra y es la que se manda al servidor como índice de la parte.
// · Se guarda en `songs.default_arrangement` ({sectionId, label, repeat}, lo que ya lee la lectura del músico): las referencias SEGUIDAS a la misma parte se comprimen en UNA entrada con `repeat` (de 1 a 9; una tanda más larga se parte en otra entrada) y las NO seguidas
//   son entradas separadas. Al abrir, `repeat` se vuelve a expandir en círculos seguidos.
// · La estructura por defecto (cada parte una vez y en el orden del texto) NO escribe arreglo: la lectura usa las secciones en orden, como siempre.
// · Reglas: toda parte aparece al menos una vez (no se puede quitar su última aparición; para eso está «Eliminar sección»), como máximo MAX_PASOS referencias en total.
import { claveDeParte, REPETICION_MAX, repeticionEntre, type EntradaArreglo } from '@/lib/arregloCancion'

/** Tope de referencias en una estructura (los círculos de la tira). */
export const MAX_PASOS = 60
/** Tope de referencias seguidas a la misma parte que caben en UNA entrada del arreglo (el `repeat` máximo). */
export const MAX_SEGUIDAS = REPETICION_MAX

/** La estructura: una clave de parte por paso, en orden. */
export type Estructura = string[]

/** Las claves de las partes del texto, en su orden. */
export const clavesDeLasPartes = (nombres: string[]): string[] => nombres.map((_, i) => claveDeParte(nombres, i))

/** La estructura por defecto: cada parte una vez, en el orden del texto. */
export const estructuraPorDefecto = (nombres: string[]): Estructura => clavesDeLasPartes(nombres)

const iguales = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/** ¿Esta estructura es la de por defecto de estas partes? (Solo entonces no se escribe arreglo.) */
export const esPorDefecto = (est: Estructura, nombres: string[]): boolean => iguales(est, estructuraPorDefecto(nombres))

/** Cuántas veces aparece la parte `clave` en la estructura. */
export const aparicionesDe = (est: Estructura, clave: string): number => est.filter(c => c === clave).length

/** La estructura bien formada para estas partes: se sueltan las referencias a partes que ya no existen (y las que sobran sobre el tope) y las partes que no aparecen entran al final, en el orden del texto. */
export function normalizar(est: Estructura, nombres: string[]): Estructura {
  const claves = clavesDeLasPartes(nombres), validas = new Set(claves)
  const sig = est.filter(c => validas.has(c)).slice(0, MAX_PASOS)
  for (const c of claves) if (!sig.includes(c) && sig.length < MAX_PASOS) sig.push(c)
  return sig
}

/** El texto cambió de partes: de `antes` a `despues`. Si la estructura era la de por defecto de antes, sigue al texto (por defecto de después). Si era propia: se sueltan las referencias a partes que ya no están y las partes nuevas entran AL FINAL (una parte escrita a mano en el modo Texto,
 *  o renombrada a mano, se agrega sola al final de la estructura). */
export function sincronizar(est: Estructura, antes: string[], despues: string[]): Estructura {
  if (esPorDefecto(est, antes)) return estructuraPorDefecto(despues)
  return normalizar(est, despues)
}

/** Las entradas {indice, repeat} que se mandan al servidor (el índice es el de la parte en el texto): las referencias seguidas a la misma parte van en UNA entrada (hasta 9; una tanda más larga se parte); las no seguidas, en entradas separadas. */
export function aEntradas(est: Estructura, nombres: string[]): EntradaArreglo[] {
  const indice = new Map(clavesDeLasPartes(nombres).map((c, i) => [c, i] as const)), out: EntradaArreglo[] = []
  for (const c of est) {
    const i = indice.get(c)
    if (i === undefined) continue
    const ult = out[out.length - 1]
    if (ult && ult.indice === i && ult.repeat < MAX_SEGUIDAS) ult.repeat++
    else out.push({ indice: i, repeat: 1 })
  }
  return out
}

/** Las mismas entradas en su forma CANÓNICA (la que guarda el servidor): se expanden a una referencia por paso y se vuelven a comprimir; así dos entradas seguidas a la misma parte se funden (hasta 9) y una tanda larga se parte. El servidor no se fía de que el cliente comprima bien. */
export function compactar(entradas: EntradaArreglo[]): EntradaArreglo[] {
  const out: EntradaArreglo[] = []
  for (const e of entradas) for (let k = 0; k < e.repeat; k++) {
    const ult = out[out.length - 1]
    if (ult && ult.indice === e.indice && ult.repeat < MAX_SEGUIDAS) ult.repeat++
    else out.push({ indice: e.indice, repeat: 1 })
  }
  return out
}

/** ¿Estas entradas (ya compactadas) son la estructura de por defecto de `n` partes: cada una una vez y en orden? */
export const entradasPorDefecto = (entradas: EntradaArreglo[], n: number): boolean => entradas.length === n && entradas.every((e, i) => e.indice === i && e.repeat === 1)

/** Lo que se manda al guardar: `undefined` si la estructura (normalizada) es la de por defecto (entonces NO se manda nada y la canción queda sin arreglo propio); si no, las entradas. */
export function estructuraParaGuardar(est: Estructura, nombres: string[]): EntradaArreglo[] | undefined {
  const n = normalizar(est, nombres)
  return esPorDefecto(n, nombres) ? undefined : aEntradas(n, nombres)
}

/** El camino de vuelta: de las entradas {indice, repeat} (lo guardado) a la estructura. Cada `repeat` se expande en referencias seguidas. Un índice fuera de las partes se salta; no se completa nada (es lo que guardó el arreglo, tal cual). Se corta en MAX_PASOS. */
export function desdeEntradas(entradas: EntradaArreglo[], nombres: string[]): Estructura {
  const claves = clavesDeLasPartes(nombres), out: Estructura = []
  for (const e of entradas) {
    const c = Number.isInteger(e?.indice) ? claves[e.indice] : undefined
    if (c === undefined) continue
    for (let k = repeticionEntre(e.repeat); k > 0 && out.length < MAX_PASOS; k--) out.push(c)
  }
  return out
}

/* ───────── operaciones de edición (cada una devuelve la estructura nueva o null si no se puede; nunca modifica la que recibe) ───────── */

/** «Volver a usar»: agrega al final una referencia a una parte que ya existe. Sin crear sección ni letra. */
export function agregarReferencia(est: Estructura, clave: string, nombres: string[]): Estructura | null {
  if (est.length >= MAX_PASOS || !clavesDeLasPartes(nombres).includes(clave)) return null
  return [...est, clave]
}

/** «Parte nueva»: la parte acaba de crearse al final del texto (está en `nombres`); su referencia entra al final de la estructura. Es `agregarReferencia` sobre la parte recién creada. */
export const agregarParteNueva = agregarReferencia

/** «Repetir aquí»: una copia de la referencia `i` justo después de ella. */
export function repetirAqui(est: Estructura, i: number): Estructura | null {
  if (!Number.isInteger(i) || i < 0 || i >= est.length || est.length >= MAX_PASOS) return null
  return [...est.slice(0, i + 1), est[i], ...est.slice(i + 1)]
}

/** ¿Se puede quitar la referencia `i`? No si es la ÚLTIMA aparición de su parte: entonces se ofrece «Eliminar sección». */
export const puedeQuitar = (est: Estructura, i: number): boolean => Number.isInteger(i) && i >= 0 && i < est.length && aparicionesDe(est, est[i]) > 1

/** «Quitar de la estructura»: quita la referencia `i` (no la parte ni su letra). */
export const quitarReferencia = (est: Estructura, i: number): Estructura | null => (puedeQuitar(est, i) ? [...est.slice(0, i), ...est.slice(i + 1)] : null)

/** «Mover» ‹ ›: cambia de sitio la referencia `i` con su vecina. null en los bordes o si las dos son la misma parte (no cambiaría nada). */
export function moverReferencia(est: Estructura, i: number, delta: -1 | 1): Estructura | null {
  const j = i + delta
  if (!Number.isInteger(i) || i < 0 || i >= est.length || j < 0 || j >= est.length || est[i] === est[j]) return null
  const sig = [...est]; [sig[i], sig[j]] = [sig[j], sig[i]]
  return sig
}

/** «Eliminar sección»: sin la parte `clave` y todas sus apariciones (la letra la quita el texto). */
export const sinParte = (est: Estructura, clave: string): Estructura => est.filter(c => c !== clave)

/** La parte (índice en el texto) a la que apunta la referencia `i`: es a la que salta tocar el círculo. -1 si no hay. */
export function parteDeReferencia(est: Estructura, nombres: string[], i: number): number {
  const c = est[i]
  return c === undefined ? -1 : clavesDeLasPartes(nombres).indexOf(c)
}
