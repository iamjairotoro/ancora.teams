// El SECRETO INTERNO de las rutas que llama la base de datos (disparadores con pg_net) — punto 50, paso 0a. Antes, si `INTERNAL_API_SECRET` no estaba definida en el entorno, la ruta dejaba pasar a cualquiera («para
// migrar sin perder avisos»). Ahora cierra por defecto: SIN ningún secreto definido, o con una cabecera `x-internal-secret` que no coincida, responde 401 y no hace nada.
//   · Rotación (fase de notificaciones): además de INTERNAL_API_SECRET se acepta INTERNAL_API_SECRET_NUEVO. Durante la ventana valen los dos; luego se retira el viejo.
//   · La comparación es en tiempo constante (se comparan los SHA-256 de ambos valores, que miden siempre lo mismo).
// Sin acceso a datos; solo lee el entorno y la cabecera.
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

type EntornoLeible = Record<string, string | undefined>
const hash = (s: string) => createHash('sha256').update(s).digest()

/** Los secretos válidos hoy (el de siempre y, si existe, el nuevo de la rotación); nunca vacíos. */
export function secretosInternos(env: EntornoLeible = process.env): string[] {
  return [env.INTERNAL_API_SECRET, env.INTERNAL_API_SECRET_NUEVO].filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
}

export type ResultadoSecreto = { ok: true } | { ok: false; response: NextResponse }

export function verificarSecretoInterno(req: { headers: { get(nombre: string): string | null } }, env: EntornoLeible = process.env): ResultadoSecreto {
  const validos = secretosInternos(env)
  if (validos.length === 0) {
    console.error('INTERNAL_API_SECRET no está definido en este entorno: la ruta responde 401 (cierra por defecto).')
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const recibido = req.headers.get('x-internal-secret')
  if (typeof recibido === 'string' && recibido.length > 0) {
    const h = hash(recibido)
    // se recorren TODOS (sin cortar al primero) para que el tiempo no dependa de cuál coincidió
    let coincide = false
    for (const v of validos) if (timingSafeEqual(h, hash(v))) coincide = true
    if (coincide) return { ok: true }
  }
  return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
}
