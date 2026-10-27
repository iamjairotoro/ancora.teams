'use client'
// Menú inferior de la administración en teléfono (Menú · A): Home · Servicios · Personas · Canciones · Admin. Es el MISMO menú del portal (PortalNav: la píldora que se desliza, las medidas de portal-nav-medidas.css, 44 px
// táctiles), en modo «solo teléfono»: desde 769 px no se muestra y el escritorio conserva su barra superior. «Admin» ya no abre una hoja: es una pantalla propia (PantallaAdmin; pestaña `admin`), como cualquier otro ítem.
// Solo dibuja y reenvía: qué pestaña corresponde a cada ítem lo decide lib/admin/menuMovil.ts.
import { CalendarDays, Home, Music, ShieldCheck, Users } from 'lucide-react'
import PortalNav, { type PortalNavItem } from '@/app/portal/_components/PortalNav'
import { ITEMS_MENU, type ClaveMenu } from '@/lib/admin/menuMovil'

const ICONOS = { home: Home, setlist: CalendarDays, personas: Users, canciones: Music, admin: ShieldCheck } as const

export default function MenuAdminMovil({ activo, onSelect }: { activo: ClaveMenu; onSelect: (k: ClaveMenu) => void }) {
  const items: PortalNavItem[] = ITEMS_MENU.map(i => ({ key: i.key, label: i.label, icon: ICONOS[i.key] }))
  return <PortalNav items={items} active={activo} soloTelefono etiqueta="Administración" onSelect={k => onSelect(k as ClaveMenu)} />
}
