// Menú inferior de la administración en teléfono (fase 2a): qué ítems tiene, cuál está activo y qué filas lleva la hoja «Más». Funciones PURAS, sin acceso a datos ni a la sesión.
// Quién puede entrar a /admin o a /home lo siguen decidiendo las pantallas y el servidor; esto solo ordena la navegación de quien ya está dentro.
export type ClaveMenu = 'setlist' | 'personas' | 'canciones' | 'equipos' | 'mas'

/** Los cinco ítems del menú (Admin · A). «Equipos» y «Personas» usan el mismo panel, con una pestaña interna distinta. */
export const ITEMS_MENU: { key: ClaveMenu; label: string }[] = [
  { key: 'setlist', label: 'Servicios' },
  { key: 'personas', label: 'Personas' },
  { key: 'canciones', label: 'Canciones' },
  { key: 'equipos', label: 'Equipos' },
  { key: 'mas', label: 'Más' },
]

/** El ítem activo para la pestaña de /admin: las cuatro de arriba tal cual; todo lo demás (Calendario, Chats, Admins…) cuelga de «Más». */
export function activoDelMenu(tab: string | null | undefined): ClaveMenu {
  return tab === 'setlist' || tab === 'personas' || tab === 'canciones' || tab === 'equipos' ? tab : 'mas'
}

export type FilaDeMas =
  | { key: 'disponibilidad' | 'chats' | 'admins'; label: string; tab: 'disponibilidad' | 'chats' | 'admins' }
  | { key: 'home'; label: string; href: '/home' }

/** Las filas de la hoja «Más». «Admins» solo la ve el owner (igual que en el panel). «Home» se omite si ya se está en /home. */
export function filasDeMas(a: { esOwner: boolean; enHome?: boolean }): FilaDeMas[] {
  return [
    { key: 'disponibilidad', label: 'Calendario', tab: 'disponibilidad' },
    { key: 'chats', label: 'Chats', tab: 'chats' },
    ...(a.esOwner ? [{ key: 'admins', label: 'Admins', tab: 'admins' } as const] : []),
    ...(a.enHome ? [] : [{ key: 'home', label: 'Home', href: '/home' } as const]),
  ]
}
