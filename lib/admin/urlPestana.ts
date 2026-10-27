// La URL de /admin sigue a la pestaña (?tab=…) y, dentro de Personas, a la pantalla «Gestionar equipo(s)» (?gestion=…&team=…&filter=…). Funciones PURAS: reciben la URL actual y devuelven la nueva (o null si ya está bien).
// Se calculan SIEMPRE sobre la URL ACTUAL del navegador y se escriben con history.replaceState(null, …), no con router.replace sobre `useSearchParams`: PersonasList escribe `?person=` por esa vía en el mismo
// instante en que se monta, y un router.replace armado con los parámetros de antes pierde la carrera (diagnóstico de la fase 2a-fix). Con una sola vía síncrona el orden es siempre el mismo.
const PESTANAS_DE_PERSONAS = ['personas', 'admins']
const PARAMETROS_DE_PERSONAS = ['person', 'gestion', 'team', 'filter', 'vista']
const PARAMETROS_DE_SERVICIO = ['servicio', 'equipo', 'herramienta']      // viven solo en la pestaña Servicio (lib/admin/urlServicio.ts)

const ID_DE_EQUIPO = /^[A-Za-z0-9-]{1,64}$/
/** El equipo que la URL pide desplegar en «Equipos» (`?team=<id>`), o null. Solo cuenta SIN `gestion` (con `gestion` el `team` es el de la pantalla «Gestionar equipo»); un id raro se ignora. Se lee AL ENTRAR a Personas. */
export function equipoAbiertoDeUrl(params: { get(nombre: string): string | null }): string | null {
  const team = params.get('team')
  return !params.get('gestion') && team && ID_DE_EQUIPO.test(team) ? team : null
}

/** La vista de Personas que pide la URL: `?vista=equipos` (o un equipo explícito, `?team=`) → los equipos; cualquier otra cosa (o nada) → la lista de personas. Solo se lee AL ENTRAR a Personas; no se recuerda entre visitas
 *  (los parámetros se van al salir de Personas). */
export function vistaDePersonasDeUrl(params: { get(nombre: string): string | null }): 'lista' | 'equipo' {
  return params.get('vista') === 'equipos' || equipoAbiertoDeUrl(params) ? 'equipo' : 'lista'
}

export type Gestion = { modo: 'equipos' } | { modo: 'equipo'; teamId: string }

/** `href` = la URL completa actual. Devuelve «ruta?consulta#hash» nuevo, o null si no hay nada que cambiar. Los parámetros de Personas solo viven en sus pestañas.
 *  COMPATIBILIDAD: el enlace viejo `?tab=equipos[&team=…][&filter=…]` pasa a `?tab=personas&gestion=equipo|equipos` (Equipos ya no es una pestaña). */
export function urlConPestana(href: string, tab: string): string | null {
  const url = new URL(href)
  const antes = url.search
  const viejo = url.searchParams.get('tab') === 'equipos'
  url.searchParams.set('tab', tab)
  if (viejo && tab === 'personas') url.searchParams.set('gestion', url.searchParams.get('team') ? 'equipo' : 'equipos')
  if (!PESTANAS_DE_PERSONAS.includes(tab)) for (const p of PARAMETROS_DE_PERSONAS) url.searchParams.delete(p)
  if (tab !== 'setlist') for (const p of PARAMETROS_DE_SERVICIO) url.searchParams.delete(p)
  return url.search === antes ? null : url.pathname + url.search + url.hash
}

/** La pantalla de gestión que pide la URL (o null). Entiende también el enlace viejo `?tab=equipos`. `params` = lo que devuelve useSearchParams (o URLSearchParams). */
export function gestionDeUrl(params: { get(nombre: string): string | null }): Gestion | null {
  const team = params.get('team')
  const modo = params.get('tab') === 'equipos' ? (team ? 'equipo' : 'equipos') : params.get('gestion')
  if (modo === 'equipo' && team) return { modo: 'equipo', teamId: team }
  if (modo === 'equipos' || modo === 'equipo') return { modo: 'equipos' }
  return null
}

/** Escribe (o quita, con null) la pantalla de gestión en la URL. Al salir se van también `team` y `filter`. */
export function urlConGestion(href: string, g: Gestion | null): string | null {
  const url = new URL(href)
  const antes = url.search
  if (!g) for (const p of ['gestion', 'team', 'filter']) url.searchParams.delete(p)
  else if (g.modo === 'equipos') url.searchParams.set('gestion', 'equipos')
  else { url.searchParams.set('gestion', 'equipo'); url.searchParams.set('team', g.teamId); if (!url.searchParams.get('filter')) url.searchParams.set('filter', 'all') }
  return url.search === antes ? null : url.pathname + url.search + url.hash
}

/** El equipo y el filtro abiertos dentro de «Gestionar equipos» (antes los escribía TeamsAdminPanel con router.replace). null = ninguno. */
export function urlConEquipo(href: string, teamId: string | null, filter: string): string | null {
  const url = new URL(href)
  const antes = url.search
  if (teamId) { url.searchParams.set('team', teamId); url.searchParams.set('filter', filter) }
  else { url.searchParams.delete('team'); url.searchParams.delete('filter') }
  return url.search === antes ? null : url.pathname + url.search + url.hash
}

// ── Seguir la URL cuando cambia por una NAVEGACIÓN (router.push desde dentro de /admin; p. ej. «Ir a Personas» o «Editar las posiciones del equipo» en Servicio) ──
// Los estados (la pestaña, la pantalla de gestión, la vista y el equipo abierto de Personas) solo leían la URL al montar, así que un router.push hacia la propia página cambiaba la URL y no la pantalla. Estas funciones
// deciden QUÉ pide la URL; no escriben nada. Lo que NO pueden hacer es pelear con nuestras propias escrituras (history.replaceState): esas dejan la URL igual al estado, y la regla es que solo se actúa cuando la URL
// DIFIERE del estado. Los casos que se escriben a sí mismos (volver a la lista desde el detalle de un equipo, elegir un equipo dentro de «Gestionar equipos») no cuentan como pedido.

/** La pestaña que pide la URL, o null si no pide ninguna distinta de la actual (sin `tab`, igual a la actual, o un valor raro que cae en la pestaña por defecto igual que al entrar). */
export function pestanaPedida(urlTab: string | null | undefined, actual: string, convertir: (t: string | null | undefined) => string): string | null {
  if (!urlTab) return null
  const pedida = convertir(urlTab)
  return pedida !== actual ? pedida : null
}

/** La pantalla de gestión que pide la URL: `undefined` = nada que cambiar; `null` = volver a Personas; una Gestion = abrir esa.
 *  - URL sin gestión y estado dentro de una: vuelve a Personas.
 *  - URL con gestión y estado en Personas: abre esa.
 *  - URL con un equipo concreto (`gestion=equipo&team=<id>`) distinto del abierto: abre ese.
 *  - Todo lo demás es el eco de nuestras escrituras y no cambia nada. En particular, `gestion=equipo` SIN `team` con un equipo abierto es el «volver a la lista» interno de «Gestionar equipos»: no se baja de equipo a lista. */
export function gestionPedida(params: { get(nombre: string): string | null }, actual: Gestion | null): Gestion | null | undefined {
  const g = gestionDeUrl(params)
  if (!g) return actual ? null : undefined
  if (!actual) return g
  if (g.modo === 'equipo' && (actual.modo !== 'equipo' || actual.teamId !== g.teamId)) return g
  return undefined
}

export type PedidoDeVista = { vista: 'lista' | 'equipo'; equipo: string | null }
/** La vista de Personas que pide la URL tras un cambio: solo un pedido POSITIVO y NUEVO cuenta. `previo` = lo que se vio la vez anterior (`vista` crudo y equipo abierto). Devuelve null si no hay pedido nuevo.
 *  Un `?vista=equipos` que ya estaba ahí, o la desaparición de `team` al volver de «Gestionar equipos», NO resetean lo que la persona eligió (lista o equipos). */
export function pedidoDeVista(params: { get(nombre: string): string | null }, previo: { vista: string | null; equipo: string | null }): PedidoDeVista | null {
  const vista = params.get('vista'), equipo = equipoAbiertoDeUrl(params)
  const equipoNuevo = equipo !== null && equipo !== previo.equipo
  const vistaNueva = vista === 'equipos' && previo.vista !== 'equipos'
  return equipoNuevo || vistaNueva ? { vista: 'equipo', equipo } : null
}
