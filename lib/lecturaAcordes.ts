// Lectura de acordes del músico (etapa C1): funciones puras, sin base ni servidor. Une el formato 2 (grados, lib/acordes.ts) con el tono que corresponde leer y la notación de la persona.
// Tono de lectura, en este orden: el que la persona eligió en esta pantalla (solo local, no se guarda) → el del servicio (service_blocks.tono) → el original de la canción.
// Un tono de OTRO modo que el de la canción (Em con un servicio en «A») no es una transposición: se ignora y se lee en el original.
import { leerLinea, normalizarTono, type LineaF2, type LineaParaMostrar, type NotacionAcordes } from './acordes'
import { mismoModo } from './tonos'
import type { LecturaPrefs } from './lyricPrefs'

export type SeccionLectura = { code: string; name: string; repeat: number; lineas: LineaF2[] }
/** Lo que el servidor entrega para dibujar la hoja con acordes: el tono original (normalizado) y las secciones en el orden del arreglo, SIEMPRE en formato 2. */
export type HojaAcordesDatos = { tono: string; secciones: SeccionLectura[] }
export type OrigenTono = 'local' | 'servicio' | 'original'

export const notacionDe = (n: LecturaPrefs['notation']): NotacionAcordes => (n === 'numeros' ? 'number' : 'american')

/** El tono en que se lee y de dónde sale. `original` ya viene normalizado; los otros dos pueden venir sucios (null, otro modo, texto raro). */
export function tonoDeLectura(o: { original: string; servicio?: string | null; local?: string | null }): { tono: string; origen: OrigenTono } {
  const limpio = (t: unknown): string | null => { const n = normalizarTono(t); return n && mismoModo(o.original, n) ? n : null }
  const local = limpio(o.local); if (local) return { tono: local, origen: 'local' }
  const servicio = limpio(o.servicio); if (servicio && servicio !== o.original) return { tono: servicio, origen: 'servicio' }
  return { tono: o.original, origen: 'original' }
}

export type SeccionParaMostrar = { code: string; name: string; repeat: number; lineas: LineaParaMostrar[] }

/** Las secciones listas para dibujar, en el tono y la notación pedidos. Números no depende del tono. */
export function seccionesParaMostrar(h: HojaAcordesDatos, tono: string, notacion: NotacionAcordes): SeccionParaMostrar[] {
  return h.secciones.map(s => ({ code: s.code, name: s.name, repeat: s.repeat, lineas: s.lineas.map(l => leerLinea(l, 2, tono, notacion)) }))
}
