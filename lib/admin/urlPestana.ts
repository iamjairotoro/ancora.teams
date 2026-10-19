// La URL de /admin sigue a la pestaña (?tab=…). Pura: recibe la URL actual y la pestaña, devuelve la URL nueva (o null si ya está bien).
// Se calcula SIEMPRE sobre la URL ACTUAL del navegador y no sobre `useSearchParams`: PersonasList escribe `?person=` con history.replaceState en el mismo instante en que se monta, y un router.replace
// armado con los parámetros de antes (sin ese `person`) pierde la carrera y deja `?tab=setlist&person=…` (diagnóstico de la fase 2a-fix). Con una sola vía síncrona el orden es siempre el mismo.
const PESTANAS_DE_PERSONAS = ['personas', 'equipos', 'admins']

/** `href` = la URL completa actual. Devuelve «ruta?consulta#hash» nuevo, o null si no hay nada que cambiar. `person` solo vive en las pestañas del panel de Personas. */
export function urlConPestana(href: string, tab: string): string | null {
  const url = new URL(href)
  const antes = url.search
  url.searchParams.set('tab', tab)
  if (!PESTANAS_DE_PERSONAS.includes(tab)) url.searchParams.delete('person')
  return url.search === antes ? null : url.pathname + url.search + url.hash
}
