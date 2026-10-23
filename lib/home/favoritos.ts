// Los favoritos del Home de usuario: canciones marcadas con el corazón (song_favorites) como fichas que se deslizan: título, «Tono G · 72 BPM» y el corazón. PURA. Sin acceso a la biblioteca no hay sección (quien llama no la pide).
export interface CancionFav { id: string; nombre: string; tono_original?: string | null; bpm?: number | null }
export interface FichaFavorita { id: string; nombre: string; detalle: string }

/** «Tono G · 72 BPM»; solo lo que existe (sin tono, sin BPM o ninguno de los dos → vacío, no se inventa). */
export function detalleFavorita(c: Pick<CancionFav, 'tono_original' | 'bpm'>): string {
  const t = (c.tono_original ?? '').trim(), b = c.bpm && c.bpm > 0 ? c.bpm : null
  return [t ? `Tono ${t}` : '', b ? `${b} BPM` : ''].filter(Boolean).join(' · ')
}

/** Las fichas de favoritas: las canciones del catálogo cuyos ids están marcados, por nombre, hasta `maximo`. */
export function fichasFavoritas(catalogo: CancionFav[], ids: ReadonlySet<string>, maximo = 12): FichaFavorita[] {
  return catalogo.filter(c => ids.has(c.id)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })).slice(0, maximo).map(c => ({ id: c.id, nombre: c.nombre, detalle: detalleFavorita(c) }))
}
