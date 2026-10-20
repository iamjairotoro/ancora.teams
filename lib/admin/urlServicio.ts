// Lo que está abierto dentro de /admin?tab=setlist vive en la URL: `?servicio=<id>` (un servicio), `&equipo=<id>` (un equipo de ese servicio) y `&herramienta=<orden|id de la herramienta>` (una herramienta del equipo).
// Sin `servicio` es la lista de servicios. Funciones PURAS, hermanas de urlPestana.ts: reciben la URL actual y devuelven la nueva (o null si ya está bien). Los ids se validan (solo letras, números y guion): un valor
// raro se ignora, nunca llega a una consulta. Misma idea que usePortalUrl (`?servicio=&equipo=` del portal).
export const PARAMETROS_DE_SERVICIO = ['servicio', 'equipo', 'herramienta'] as const

export interface VistaServicio { servicio: string | null; equipo: string | null; herramienta: string | null }
export const VISTA_VACIA: VistaServicio = { servicio: null, equipo: null, herramienta: null }
export type NivelServicio = 'lista' | 'servicio' | 'equipo' | 'herramienta'

const ID = /^[A-Za-z0-9-]{1,64}$/
const valido = (v: string | null | undefined): string | null => (v && ID.test(v) ? v : null)

/** Lo que pide la URL. `equipo` y `herramienta` solo valen con `servicio`; `herramienta` sin `equipo` solo vale si es la Orden (que es del servicio, no de un equipo). `params` = lo de useSearchParams o URLSearchParams. */
export function servicioDeUrl(params: { get(nombre: string): string | null }): VistaServicio {
  const servicio = valido(params.get('servicio'))
  if (!servicio) return VISTA_VACIA
  const equipo = valido(params.get('equipo')), herramienta = valido(params.get('herramienta'))
  return { servicio, equipo, herramienta: herramienta && (equipo || herramienta === 'orden') ? herramienta : null }
}

export const nivelDe = (v: VistaServicio): NivelServicio => (!v.servicio ? 'lista' : v.herramienta ? 'herramienta' : v.equipo ? 'equipo' : 'servicio')

/** Un nivel más arriba: herramienta → equipo → servicio → lista. */
export function padreDe(v: VistaServicio): VistaServicio {
  const n = nivelDe(v)
  if (n === 'herramienta') return { servicio: v.servicio, equipo: v.equipo, herramienta: null }
  if (n === 'equipo') return { servicio: v.servicio, equipo: null, herramienta: null }
  return VISTA_VACIA
}

/** Escribe la vista en la URL (con `tab=setlist`). Subir de nivel quita lo de abajo; null = la lista. */
export function urlConServicio(href: string, v: VistaServicio | null): string | null {
  const url = new URL(href), antes = url.search
  const vista = v ? servicioDeUrl({ get: n => (v as unknown as Record<string, string | null>)[n] ?? null }) : VISTA_VACIA
  url.searchParams.set('tab', 'setlist')
  for (const p of PARAMETROS_DE_SERVICIO) { const val = vista[p]; if (val) url.searchParams.set(p, val); else url.searchParams.delete(p) }
  return url.search === antes ? null : url.pathname + url.search + url.hash
}

/** El enlace a un servicio (y, si se da, a uno de sus equipos) desde fuera de /admin: el Home. */
export function urlServicioAdmin(servicio?: string | null, equipo?: string | null): string {
  const id = valido(servicio), eq = id ? valido(equipo) : null
  return `/admin?tab=setlist${id ? `&servicio=${id}` : ''}${eq ? `&equipo=${eq}` : ''}`
}

// ── La navegación (entrar a un nivel, «‹», el atrás del teléfono) sin React ni window: recibe la URL actual y el historial, así se prueba con uno falso. useServicioUrl.ts la usa con los de verdad. ──
export interface HistorialLike { pushState(estado: null, titulo: string, url: string): void; replaceState(estado: null, titulo: string, url: string): void; back(): void }

/** Entrar a un nivel EMPUJA una entrada de historial; `volver` hace `back()` si esa entrada la empujó esta pantalla y, si se llegó por enlace o recarga (nada empujado), REEMPLAZA la URL por la del nivel de arriba: nunca saca a la persona del sitio.
 *  `alNavegar` (un `popstate`) olvida lo empujado: después de un atrás o un adelante, «‹» reemplaza en vez de retroceder (lo seguro). */
export function crearNavegacionServicio(env: { href: () => string; historial: HistorialLike }) {
  let empujadas = 0
  const actual = (): VistaServicio => servicioDeUrl(new URL(env.href()).searchParams)
  return {
    ir(v: VistaServicio) { const nueva = urlConServicio(env.href(), v); if (nueva) { env.historial.pushState(null, '', nueva); empujadas++ } },
    volver() {
      if (empujadas > 0) { env.historial.back(); return }
      const nueva = urlConServicio(env.href(), padreDe(actual())); if (nueva) env.historial.replaceState(null, '', nueva)
    },
    alNavegar() { empujadas = 0 },
    actual,
    get empujadas() { return empujadas },
  }
}
