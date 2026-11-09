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

/** Una sección que el arreglo usa y que este guardado desactiva (`baja`) o cambia de tipo (`cambia`: la fila se reutiliza por POSICIÓN y toma otro código y otro contenido). `entradas` = veces que el arreglo la usa. */
export type Afectada = { codigo: string; nombre: string; entradas: number; motivo: 'baja' | 'cambia' }

/** Las secciones del arreglo que este guardado afecta. Las filas se emparejan por posición (como lo hace el guardado): las de sobra al final se desactivan y las demás toman el código nuevo. Una sección que el arreglo no usa nunca cuenta. */
export function afectadasEnArreglo(actual: ActualGuardado, nuevas: { codigo: string }[]): Afectada[] {
  const usos = new Map<string, number>()
  for (const id of actual.arreglo) usos.set(id, (usos.get(id) ?? 0) + 1)
  const out: Afectada[] = []
  actual.secciones.forEach((s, i) => {
    const entradas = usos.get(s.id) ?? 0
    if (!entradas) return
    if (i >= nuevas.length) out.push({ codigo: s.codigo, nombre: s.nombre, entradas, motivo: 'baja' })
    else if (nuevas[i].codigo !== s.codigo) out.push({ codigo: s.codigo, nombre: s.nombre, entradas, motivo: 'cambia' })
  })
  return out
}

export interface Resumen {
  hayContenido: boolean                      // ya hay letra o secciones guardadas: se pide confirmar
  letraCambia: boolean
  lineas: [number, number]                   // líneas de letra: antes → después
  secciones: [number, number]                // secciones activas: antes → después
  seDesactivan: string[]                     // nombres de las secciones que dejan de estar activas (no se borran)
  entradasArreglo: number
  afectadas: Afectada[]                      // secciones que el arreglo usa y este guardado desactiva o cambia de tipo: piden confirmación explícita
}

export function resumenDeCambios(actual: ActualGuardado & { letra: string }, nuevo: { letra: string; secciones: { nombre: string; codigo?: string }[] }): Resumen {
  const antes = lineasDeLetra(actual.letra), despues = lineasDeLetra(nuevo.letra)
  const norm = (t: string) => (t || '').replace(/\r/g, '').trim()
  return {
    hayContenido: antes > 0 || actual.secciones.length > 0,
    letraCambia: norm(actual.letra) !== norm(nuevo.letra),
    lineas: [antes, despues],
    secciones: [actual.secciones.length, nuevo.secciones.length],
    seDesactivan: actual.secciones.slice(nuevo.secciones.length).map(s => s.nombre || s.codigo),
    entradasArreglo: actual.arreglo.length,
    afectadas: afectadasEnArreglo(actual, nuevo.secciones.map(x => ({ codigo: x.codigo ?? '' }))),
  }
}

/** ¿Se avisa en la ficha? Cuando la canción tiene un arreglo (entradas > 0) y alguna de sus secciones sigue en el formato antiguo de acordes. Devuelve el número de entradas del arreglo, o null si no hay nada que avisar. Datos raros → null. */
export function avisoDeFicha(c: { formatoAntiguo?: unknown; actual?: { arreglo?: unknown } } | null | undefined): number | null {
  if (!c || c.formatoAntiguo !== true) return null
  const n = Array.isArray(c.actual?.arreglo) ? (c.actual?.arreglo as unknown[]).length : 0
  return n > 0 ? n : null
}
