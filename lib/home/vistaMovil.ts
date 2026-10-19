// La vista elegida del Home en teléfono (?vista=hoy|calendario|equipos). PURA: recibe la URL actual y devuelve la nueva (o null si ya está bien). Se escribe con history.replaceState(null, …) sobre la URL ACTUAL
// (como lib/admin/urlPestana.ts): cambiar de vista no apila entradas de historial, y al volver de abrir un servicio la URL conserva la vista elegida. «hoy» es la de por defecto y no deja parámetro.
export type VistaHome = 'hoy' | 'calendario' | 'equipos'
export const VISTAS_HOME: { valor: VistaHome; texto: string }[] = [{ valor: 'hoy', texto: 'Hoy' }, { valor: 'calendario', texto: 'Calendario' }, { valor: 'equipos', texto: 'Equipos' }]

export function vistaDeUrl(params: { get(nombre: string): string | null }): VistaHome {
  const v = params.get('vista')
  return v === 'calendario' || v === 'equipos' ? v : 'hoy'
}

export function urlConVista(href: string, vista: VistaHome): string | null {
  const url = new URL(href)
  const antes = url.search
  if (vista === 'hoy') url.searchParams.delete('vista'); else url.searchParams.set('vista', vista)
  return url.search === antes ? null : url.pathname + url.search + url.hash
}
