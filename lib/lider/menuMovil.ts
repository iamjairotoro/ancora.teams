// Menú inferior del LÍDER en teléfono (etapa 1): solo lo que funciona para quien no es administrador. Home, Servicios (/home/servicios) y Mi espacio (el portal). Personas y Canciones se agregan en etapas
// siguientes, cuando exista una pantalla que el líder pueda abrir: nunca un ítem que lleve a una pantalla bloqueada. Funciones PURAS, sin acceso a datos ni a la sesión.
export type ClaveMenuLider = 'home' | 'servicios' | 'miEspacio'

export const ITEMS_MENU_LIDER: { key: ClaveMenuLider; label: string; href: string }[] = [
  { key: 'home', label: 'Home', href: '/home' },
  { key: 'servicios', label: 'Servicios', href: '/home/servicios' },
  { key: 'miEspacio', label: 'Mi espacio', href: '/portal' },
]

export const destinoDeMenuLider = (k: ClaveMenuLider): string => ITEMS_MENU_LIDER.find(i => i.key === k)?.href ?? '/home'
