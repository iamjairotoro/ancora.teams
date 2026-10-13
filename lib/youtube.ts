// YouTube en la canción (punto 55, commit 2). De lo que pega la administración SOLO se extrae el identificador de 11 caracteres;
// la URL que se incrusta, la miniatura y el enlace de respaldo se ARMAN aquí con ese id. Nunca se incrusta ni se pide lo pegado.
// Sin acceso a datos ni a servidor: lo usan el formulario de administración, la ruta de oEmbed y el portal.

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/

// Solo estos dominios (comparación exacta del nombre de host, nunca «termina en» ni «contiene»).
const HOSTS_YOUTUBE = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com',
])

const CON_ESQUEMA = /^https?:\/\//i
const SIN_ESQUEMA = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be)\//i

export function esIdYoutube(x: unknown): x is string {
  return typeof x === 'string' && ID_YOUTUBE.test(x)
}

/**
 * El id de 11 caracteres de un enlace de YouTube (watch, youtu.be, embed, shorts, live, v), o null si no lo es. Rechaza otros
 * dominios (youtube.com.malo.com, malo.com/youtube.com, usuario@...), otros esquemas (javascript:, data:), listas sin video,
 * espacios y textos largos. Un id suelto sin enlace tampoco vale: «solo enlaces de YouTube».
 */
export function extraerIdYoutube(texto: unknown): string | null {
  if (typeof texto !== 'string') return null
  const t = texto.trim()
  if (!t || t.length > 300 || /\s/.test(t)) return null
  let url: URL
  try { url = new URL(CON_ESQUEMA.test(t) ? t : SIN_ESQUEMA.test(t) ? `https://${t}` : '') } catch { return null }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password || (url.port && url.port !== '80' && url.port !== '443')) return null
  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter(Boolean)
  let candidato: string | null | undefined = null
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    candidato = partes[0]
  } else if (HOSTS_YOUTUBE.has(host)) {
    if (partes[0] === 'watch') candidato = url.searchParams.get('v')
    else if (['embed', 'shorts', 'live', 'v'].includes(partes[0])) candidato = partes[1]
  }
  return esIdYoutube(candidato) ? candidato : null
}

function soloId(id: string): string {
  if (!esIdYoutube(id)) throw new Error('Identificador de YouTube no válido')
  return id
}

/** La URL del reproductor: dominio sin cookies, armada con el id. `autoplay` solo se pide porque se crea tras un toque. */
export const urlEmbebida = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${soloId(id)}?autoplay=1&playsinline=1&rel=0&modestbranding=1`

/** La miniatura (se muestra antes de reproducir; no carga ningún script de YouTube). */
export const urlMiniatura = (id: string) => `https://i.ytimg.com/vi/${soloId(id)}/hqdefault.jpg`

/** El respaldo «Abrir en YouTube». */
export const urlAbrirEnYoutube = (id: string) => `https://www.youtube.com/watch?v=${soloId(id)}`
