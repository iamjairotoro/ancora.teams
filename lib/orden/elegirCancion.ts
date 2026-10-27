// «Elegir canción» de la hoja del Orden (teléfono): buscar por título o artista, sin distinguir mayúsculas ni acentos (el mismo normalizador del portal). Funciones PURAS.
import { normalizar } from '@/lib/portal/filtrarCanciones'

export interface CancionElegible { id: string; nombre: string; artista?: string | null }

/** Las canciones que coinciden con la búsqueda (título o artista), en el orden de la lista; sin búsqueda, todas. */
export function filtrarCanciones<T extends CancionElegible>(canciones: readonly T[], consulta: string): T[] {
  const q = normalizar(consulta)
  return q ? canciones.filter(c => normalizar(c.nombre).includes(q) || normalizar(c.artista).includes(q)) : [...canciones]
}
