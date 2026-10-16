// Buscar canciones en el portal (punto 54, commit 2): por TÍTULO y ARTISTA (por ahora no por letra: la letra no viaja en el catálogo). Sin tildes ni mayúsculas («cancion» encuentra «Canción»)
// y por palabras: «awake soul» encuentra «Awake My Soul». Sin acceso a datos ni a servidor.
export const normalizar = (s: string | null | undefined): string => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').trim()

export function filtrarCanciones<T extends { nombre: string; artista?: string | null }>(lista: T[], texto: string): T[] {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  if (!palabras.length) return lista
  return lista.filter(c => { const pajar = normalizar(`${c.nombre} ${c.artista ?? ''}`); return palabras.every(p => pajar.includes(p)) })
}
