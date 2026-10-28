// Caché de datos EN MEMORIA, solo para teléfono (stale-while-revalidate): al volver a una pantalla se pinta lo último que se vio y se pide lo nuevo por detrás.
// Reglas: nunca en localStorage ni en disco (se pierde al recargar); la clave incluye a la persona Y su rol (un líder y un admin no comparten nada); se vacía al cerrar sesión o al cambiar de usuario;
// y se descarta TODO apenas se guarda o se borra algo (una escritura a Supabase o a /api/ con POST, PUT, PATCH o DELETE), para que ninguna pantalla muestre datos viejos tras un cambio.
// Una respuesta que estaba en vuelo cuando se escribió algo NO se guarda (generación): llegaría con datos anteriores al cambio. Funciones puras salvo `instalarInvalidacion`.

const almacen = new Map<string, unknown>()
let generacion = 0
const oyentes = new Set<() => void>()

export function claveDeCache(persona: string | null | undefined, rol: string, recurso: string): string | null {
  const p = (persona ?? '').trim().toLowerCase()
  return p ? `${p}|${rol}|${recurso}` : null
}

export function leerCache<T>(clave: string | null): T | null {
  if (!clave) return null
  return almacen.has(clave) ? (almacen.get(clave) as T) : null
}

export function generacionActual(): number { return generacion }

/** Guarda solo si no hubo escrituras desde que se pidió el dato (`desde` = generación al pedirlo). */
export function guardarCache<T>(clave: string | null, valor: T, desde: number): boolean {
  if (!clave || desde !== generacion) return false
  almacen.set(clave, valor)
  return true
}

/** Descarta todo (una escritura puede afectar a cualquier pantalla) y avisa a quien escucha. */
export function invalidarCache(): void {
  generacion++
  almacen.clear()
  oyentes.forEach(f => f())
}

/** Sesión cerrada o persona distinta: vacía todo. */
export function limpiarCache(): void { invalidarCache() }

export function alCambiarCache(f: () => void): () => void { oyentes.add(f); return () => { oyentes.delete(f) } }

/** Funciones de Postgres que solo consultan (las que el navegador llama hoy). Cualquier otra rpc cuenta como escritura. */
const RPC_DE_LECTURA = /^(is_|get_|list_|can_|has_|team_blocks_in_range$|blocked_others_summary$)/
const ESCRIBE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
/** ¿Esta petición cambia datos? Supabase REST y nuestras rutas /api/ con método de escritura; las rpc de lectura (lista de abajo) no cuentan. */
export function peticionEscribe(metodo: string | undefined, url: string): boolean {
  if (!ESCRIBE.has((metodo ?? 'GET').toUpperCase())) return false
  if (url.includes('/auth/v1/')) return false
  const rpc = /\/rest\/v1\/rpc\/([a-z_0-9]+)/.exec(url)
  if (rpc && RPC_DE_LECTURA.test(rpc[1])) return false
  return url.includes('/rest/v1/') || url.includes('/storage/v1/') || /^(https?:\/\/[^/]+)?\/api\//.test(url)
}

// Instalación con cuenta de usuarios: cada pantalla de teléfono que usa la caché llama a `usarInvalidacion()` y devuelve lo que ésta entrega al desmontarse. Con el primero se envuelve fetch; con el último se
// espera una gracia corta (el cambio de una pantalla a otra desmonta y monta en seguida, y la caché debe sobrevivir) y, si nadie volvió, se QUITA el envoltorio, se deja de escuchar la sesión y se vacía la caché
// (sin envoltorio ya nadie vería las escrituras). Así, si una ventana de escritorio se achica a ancho de teléfono y se vuelve a ampliar, el envoltorio desaparece. El envoltorio solo observa: llama a la
// función original con los mismos argumentos y devuelve SU promesa; no cachea nada (la caché es solo de las lecturas del resumen, en el hook).
export const GRACIA_DESINSTALAR_MS = 1500
type Auth = (f: (evento: string, usuario: string | null) => void) => () => void
let usuarios = 0
let desinstalar: (() => void) | null = null
let temporizador: ReturnType<typeof setTimeout> | null = null

function instalar(onAuth?: Auth): () => void {
  const original = window.fetch
  let vivo = true
  const envoltorio = (entrada: RequestInfo | URL, init?: RequestInit) => {
    if (vivo) {
      const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
      const metodo = init?.method ?? (typeof entrada === 'object' && 'method' in entrada ? entrada.method : 'GET')
      if (peticionEscribe(metodo, url)) {
        invalidarCache()
        const p = original.call(window, entrada, init)
        p.then(invalidarCache, invalidarCache)   // rama aparte: a quien llamó le llega la promesa original, con su valor o su error
        return p
      }
    }
    return original.call(window, entrada, init)
  }
  window.fetch = envoltorio
  let ultimo: string | null | undefined
  const baja = onAuth?.((evento, usuario) => {
    if (evento === 'SIGNED_OUT' || (ultimo !== undefined && usuario !== ultimo)) limpiarCache()
    ultimo = usuario
  })
  return () => {
    vivo = false
    if (window.fetch === envoltorio) window.fetch = original   // si otro lo envolvió después, el nuestro queda inerte (deja pasar todo)
    baja?.()
  }
}

/** Úsese en un efecto: `return usarInvalidacion(onAuth)`. Solo en teléfono (el hook solo llama con `activo`). */
export function usarInvalidacion(onAuth?: Auth): () => void {
  if (typeof window === 'undefined') return () => {}
  if (temporizador) { clearTimeout(temporizador); temporizador = null }
  if (usuarios === 0 && !desinstalar) desinstalar = instalar(onAuth)
  usuarios++
  let libre = false
  return () => {
    if (libre) return
    libre = true
    if (--usuarios > 0) return
    temporizador = setTimeout(() => { temporizador = null; if (usuarios === 0 && desinstalar) { desinstalar(); desinstalar = null; limpiarCache() } }, GRACIA_DESINSTALAR_MS)
  }
}

/** ¿Está el envoltorio puesto? (pruebas) */
export function invalidacionInstalada(): boolean { return desinstalar !== null }

/** Solo para pruebas. */
export function _reiniciarCache(): void { almacen.clear(); generacion = 0; oyentes.clear() }
