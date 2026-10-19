// Cuando una carga falla, la pantalla lo dice (con «Reintentar») en vez de mostrar «no hay datos». El cliente de Supabase NO lanza ante un error de la base: lo devuelve en `error`, y una pantalla que
// solo mira `data` lo confunde con una lista vacía. Aquí está la regla común: qué consultas son ESENCIALES (si fallan, no hay pantalla que mostrar) y qué texto ve la persona.
// Las consultas secundarias (herramientas, bloqueos, roles…) NO se pasan aquí: siguen tolerantes, para que un fallo menor no tumbe la página entera.
import { TEXTOS } from '@/lib/textos/comun'

type Resultado = { error?: unknown } | null | undefined

export class FallaDeCarga extends Error {}

/** ¿Alguna de las consultas esenciales devolvió error? */
export const fallaEsencial = (...resultados: Resultado[]): boolean => resultados.some(r => !!r?.error)

/** Lanza FallaDeCarga si alguna consulta esencial devolvió error (para el `catch` de la carga). */
export function exigirCarga(...resultados: Resultado[]): void {
  if (fallaEsencial(...resultados)) throw new FallaDeCarga('falló una consulta esencial')
}

/** Lo que ve la persona ante una falla de carga: siempre nuestro texto, nunca el del sistema. El error real va a la consola. */
export function textoDeFallaDeCarga(e: unknown, donde: string): string {
  console.error(`[${donde}] no se pudo cargar:`, e instanceof Error ? e.message : e)
  return TEXTOS.revisaConexion
}
