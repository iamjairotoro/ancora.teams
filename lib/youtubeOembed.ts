// Comprobación con oEmbed de YouTube (punto 55, commit 2). SOLO la usa la ruta de administración, AL GUARDAR el formulario de la
// canción, y no guarda nada: ni título ni estado (los enlaces viven en songs.link_spotify; no hay columnas nuevas).
// Lo que se consulta lo arma esta función con el id ya extraído (lib/youtube.ts): el texto pegado nunca viaja a la red.
import { urlAbrirEnYoutube } from './youtube'

export type EstadoOembed =
  | 'ok'               // existe y se puede incrustar
  | 'no_existe'        // 404: el video no existe o es privado
  | 'no_incrustable'   // 401/403: el dueño no permite incrustarlo
  | 'no_verificado'    // la consulta falló o tardó: no se sabe, y NO se bloquea nada

export interface ResultadoOembed { estado: EstadoOembed; titulo?: string }

export const LIMITE_OEMBED_MS = 4000

export async function consultarOembed(
  id: string,
  fetchFn: (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ status: number; json(): Promise<unknown> }> = fetch as never,
  limiteMs = LIMITE_OEMBED_MS,
): Promise<ResultadoOembed> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(urlAbrirEnYoutube(id))}`
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), limiteMs)
  try {
    const r = await fetchFn(url, { signal: ctl.signal, headers: { Accept: 'application/json' } })
    if (r.status === 200) {
      const j = (await r.json().catch(() => null)) as { title?: unknown } | null
      const titulo = typeof j?.title === 'string' ? j.title.replace(/\s+/g, ' ').trim().slice(0, 150) : ''
      return titulo ? { estado: 'ok', titulo } : { estado: 'ok' }
    }
    if (r.status === 404) return { estado: 'no_existe' }
    if (r.status === 401 || r.status === 403) return { estado: 'no_incrustable' }
    return { estado: 'no_verificado' }
  } catch {
    return { estado: 'no_verificado' }
  } finally {
    clearTimeout(timer)
  }
}
