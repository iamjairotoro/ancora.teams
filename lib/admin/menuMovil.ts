// Menú inferior de la administración en teléfono (Menú · A): qué ítems tiene, cuál está activo y qué filas lleva la hoja «Más». Funciones PURAS, sin acceso a datos ni a la sesión.
// Quién puede entrar a /admin o a /home lo siguen decidiendo las pantallas y el servidor; esto solo ordena la navegación de quien ya está dentro.
export type ClaveMenu = 'home' | 'setlist' | 'personas' | 'canciones' | 'mas'

/** Los cinco ítems del menú: Home (va a /home) primero, y «Equipos» ya no está (vive dentro de Personas). */
export const ITEMS_MENU: { key: ClaveMenu; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'setlist', label: 'Servicios' },
  { key: 'personas', label: 'Personas' },
  { key: 'canciones', label: 'Canciones' },
  { key: 'mas', label: 'Más' },
]

/** El ítem activo. En /home es «Home»; en /admin, la pestaña tal cual (la vieja `equipos` cuenta como Personas) y todo lo demás (Calendario, Chats, Admins…) cuelga de «Más». */
export function activoDelMenu(tab: string | null | undefined, enHome = false): ClaveMenu {
  if (enHome) return 'home'
  if (tab === 'equipos') return 'personas'
  return tab === 'setlist' || tab === 'personas' || tab === 'canciones' ? tab : 'mas'
}

export interface FilaDeMas { key: 'disponibilidad' | 'chats' | 'admins'; label: string; detalle?: string; tab: 'disponibilidad' | 'chats' | 'admins' }

/** Las filas de la hoja «Más»: Calendario, Chats y, solo para el owner, Admins (igual que en el panel). Home ya no está aquí: es un ítem del menú. */
export function filasDeMas(a: { esOwner: boolean }): FilaDeMas[] {
  return [
    { key: 'disponibilidad', label: 'Calendario', tab: 'disponibilidad' },
    { key: 'chats', label: 'Chats', detalle: 'Moderación', tab: 'chats' },
    ...(a.esOwner ? [{ key: 'admins', label: 'Admins', detalle: 'Solo el dueño de la organización', tab: 'admins' } as const] : []),
  ]
}
