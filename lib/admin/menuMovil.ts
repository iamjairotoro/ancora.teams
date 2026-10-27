// Menú inferior de la administración en teléfono (Menú · A): qué ítems tiene, cuál está activo y qué filas lleva la hoja «Más». Funciones PURAS, sin acceso a datos ni a la sesión.
// Quién puede entrar a /admin o a /home lo siguen decidiendo las pantallas y el servidor; esto solo ordena la navegación de quien ya está dentro.
export type ClaveMenu = 'home' | 'setlist' | 'personas' | 'canciones' | 'admin'

/** Los cinco ítems del menú: Home (va a /home) primero, y «Admin» al final (una pantalla propia, no una hoja). «Equipos» ya no está (vive dentro de Personas). */
export const ITEMS_MENU: { key: ClaveMenu; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'setlist', label: 'Servicios' },
  { key: 'personas', label: 'Personas' },
  { key: 'canciones', label: 'Canciones' },
  { key: 'admin', label: 'Admin' },
]

/** El ítem activo. En /home es «Home»; en /admin, la pestaña tal cual (la vieja `equipos` cuenta como Personas) y todo lo demás (la pantalla Admin, Calendario, Chats, Admins…) cuelga de «Admin». */
export function activoDelMenu(tab: string | null | undefined, enHome = false): ClaveMenu {
  if (enHome) return 'home'
  if (tab === 'equipos') return 'personas'
  return tab === 'setlist' || tab === 'personas' || tab === 'canciones' ? tab : 'admin'
}

/** A dónde lleva una fila de la pantalla Admin: una pestaña de /admin o una dirección. */
export type DestinoAdmin = { tab: 'disponibilidad' | 'chats' | 'admins' } | { url: string }
export interface FilaDeAdmin { key: 'disponibilidad' | 'chats' | 'admins' | 'equipos' | 'historial'; label: string; detalle: string; destino: DestinoAdmin }

/** Las filas de la pantalla «Admin» (primera versión): Calendario, Chats (Moderación), Admins (solo el propietario, igual que en el panel), Equipos e Historial. Apariencia y Cerrar sesión no son filas de aquí (botón redondo y fila final). */
export function filasDeAdmin(a: { esOwner: boolean }): FilaDeAdmin[] {
  return [
    { key: 'disponibilidad', label: 'Calendario', detalle: 'Bloqueos y disponibilidad', destino: { tab: 'disponibilidad' } },
    { key: 'chats', label: 'Chats', detalle: 'Moderación', destino: { tab: 'chats' } },
    ...(a.esOwner ? [{ key: 'admins', label: 'Admins', detalle: 'Solo el propietario', destino: { tab: 'admins' } } as const] : []),
    { key: 'equipos', label: 'Equipos', detalle: 'Colores, posiciones y herramientas', destino: { url: '/admin?tab=personas&gestion=equipos' } },
    { key: 'historial', label: 'Historial', detalle: 'Servicios pasados', destino: { url: '/admin?tab=setlist&historial=1' } },
  ]
}

/** Las iniciales de la organización para el círculo de la tarjeta: «Iglesia Áncora» → «IA» (sin tilde, como en el mockup). */
export const inicialesDeOrg = (nombre: string): string => nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p.normalize('NFD').replace(/[̀-ͯ]/g, '')[0]).join('').toLocaleUpperCase('es') || '?'
