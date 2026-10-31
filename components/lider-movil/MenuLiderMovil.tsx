'use client'
// Menú inferior del líder en teléfono: el MISMO PortalNav de la administración (la píldora que se desliza), en modo «solo teléfono», con los tres ítems de lib/lider/menuMovil.ts. Solo dibuja y reenvía.
import { CalendarDays, Home, User } from 'lucide-react'
import PortalNav, { type PortalNavItem } from '@/app/portal/_components/PortalNav'
import { ITEMS_MENU_LIDER, type ClaveMenuLider } from '@/lib/lider/menuMovil'
import { TEXTOS_LIDER as T } from '@/lib/textos/servicioLider'

const ICONOS = { home: Home, servicios: CalendarDays, miEspacio: User } as const

export default function MenuLiderMovil({ activo, onSelect }: { activo: ClaveMenuLider; onSelect: (k: ClaveMenuLider) => void }) {
  const items: PortalNavItem[] = ITEMS_MENU_LIDER.map(i => ({ key: i.key, label: i.label, icon: ICONOS[i.key] }))
  return <PortalNav items={items} active={activo} soloTelefono etiqueta={T.menuEtiqueta} onSelect={k => onSelect(k as ClaveMenuLider)} />
}
