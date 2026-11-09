// Qué va a pasar al pulsar Guardar en el editor de acordes, en palabras: se calcula con lo que hay guardado (lo que manda el servidor en `actual`) y lo que hay en el editor. Es una función pura y la usan la pantalla y las pruebas;
// el servidor NO se fía de ella: lo que decide si se guarda sigue siendo guardarAcordes.ts.
import { estructura } from '@/lib/editorAcordes'

export type SeccionActual = { id: string; codigo: string; nombre: string }
/** Lo guardado hoy: las secciones activas (en orden) y los `sectionId` de cada entrada del arreglo de la canción (`songs.default_arrangement`). */
export type ActualGuardado = { secciones: SeccionActual[]; arreglo: string[] }

/** Los `sectionId` de las entradas de un arreglo guardado; lo que no tiene esa forma se ignora (nunca falla). */
export const idsDelArreglo = (a: unknown): string[] =>
  Array.isArray(a) ? a.map(x => (x && typeof x === 'object' && typeof (x as { sectionId?: unknown }).sectionId === 'string' ? (x as { sectionId: string }).sectionId : null)).filter((x): x is string => !!x) : []

/** Las líneas de letra con texto (sin encabezados ni líneas vacías). */
export const lineasDeLetra = (texto: string): number => estructura((texto || '').replace(/\r/g, '')).lineas.filter(l => l.rol === 'letra' && l.txt.trim()).length

export interface Resumen {
  hayContenido: boolean                      // ya hay letra o secciones guardadas: se pide confirmar
  letraCambia: boolean
  lineas: [number, number]                   // líneas de letra: antes → después
  secciones: [number, number]                // secciones activas: antes → después
  seDesactivan: string[]                     // nombres de las secciones que dejan de estar activas (no se borran)
  entradasArreglo: number
}

export function resumenDeCambios(actual: ActualGuardado & { letra: string }, nuevo: { letra: string; secciones: { nombre: string }[] }): Resumen {
  const antes = lineasDeLetra(actual.letra), despues = lineasDeLetra(nuevo.letra)
  const norm = (t: string) => (t || '').replace(/\r/g, '').trim()
  return {
    hayContenido: antes > 0 || actual.secciones.length > 0,
    letraCambia: norm(actual.letra) !== norm(nuevo.letra),
    lineas: [antes, despues],
    secciones: [actual.secciones.length, nuevo.secciones.length],
    seDesactivan: actual.secciones.slice(nuevo.secciones.length).map(s => s.nombre || s.codigo),
    entradasArreglo: actual.arreglo.length,
  }
}
