// Un SOLO reproductor a la vez en el portal (punto 55): el video de YouTube y, desde el commit 5, el archivo propio. Quien va a
// sonar se «reclama» con su id y entrega cómo detenerse; si había otro sonando, se detiene antes. Módulo del cliente, sin estado
// de React: la pantalla de canción y el reproductor flotante lo comparten.
let actual: { id: string; detener: () => void } | null = null

/** Pasa a sonar `id`; si había OTRO reproductor activo, lo detiene primero. */
export function reclamarReproductor(id: string, detener: () => void): void {
  if (actual && actual.id !== id) actual.detener()
  actual = { id, detener }
}

/** `id` ya no suena (terminó, se cerró o se destruyó). No toca a otro que haya tomado el turno. */
export function liberarReproductor(id: string): void {
  if (actual?.id === id) actual = null
}

/** Quién suena ahora (para las pruebas y para decidir si hay algo que detener al salir). */
export function reproductorActivo(): string | null { return actual?.id ?? null }
