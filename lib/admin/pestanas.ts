// Las pestañas válidas de /admin y cuál se abre según `?tab=`. `equipos` ya no es una pestaña (vive dentro de Personas, «Gestionar equipos»): el enlace viejo abre Personas.
// `admin` es la pantalla «Admin» del teléfono (reemplaza la hoja «Más»; la abre el último ítem del menú inferior). `?tab=ajustes` se quitó: no tenía pantalla (no mostraba nada); ahora, como cualquier valor desconocido, abre la pestaña de siempre (Servicio).
export type Tab = 'setlist' | 'personas' | 'equipos' | 'canciones' | 'disponibilidad' | 'chats' | 'admins' | 'admin'
export const VALID_TABS: Tab[] = ['setlist', 'personas', 'equipos', 'canciones', 'disponibilidad', 'chats', 'admins', 'admin']
export const PESTANA_POR_DEFECTO: Tab = 'setlist'

export function pestanaInicial(urlTab: string | null | undefined): Tab {
  if (urlTab === 'equipos') return 'personas'
  return urlTab && (VALID_TABS as string[]).includes(urlTab) ? (urlTab as Tab) : PESTANA_POR_DEFECTO
}
