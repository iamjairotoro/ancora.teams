'use client'
// Menú inferior de la administración en teléfono (Menú · A): Home · Servicios · Personas · Canciones · Más. Es el MISMO menú del portal (PortalNav: la píldora que se desliza, las medidas de
// portal-nav-medidas.css, 44 px táctiles), en modo «solo teléfono»: desde 769 px no se muestra y el escritorio conserva su barra superior. «Más» no navega: abre la hoja (y mientras está abierta, la píldora
// está sobre «Más»). Solo dibuja y reenvía: qué pestaña corresponde a cada ítem y qué filas lleva «Más» lo decide lib/admin/menuMovil.ts.
import { useState } from 'react'
import { CalendarDays, Ellipsis, Home, Music, Users } from 'lucide-react'
import PortalNav, { type PortalNavItem } from '@/app/portal/_components/PortalNav'
import type { ThemePref } from '@/lib/useDarkMode'
import { ITEMS_MENU, type ClaveMenu } from '@/lib/admin/menuMovil'
import HojaMas from './HojaMas'

const ICONOS = { home: Home, setlist: CalendarDays, personas: Users, canciones: Music, mas: Ellipsis } as const

export default function MenuAdminMovil({ activo, onSelect, onTab, esOwner, nombreOrg, iniciales, themePref, onThemePref, onSignOut }: {
  activo: ClaveMenu
  onSelect: (k: Exclude<ClaveMenu, 'mas'>) => void
  onTab: (tab: 'disponibilidad' | 'chats' | 'admins') => void
  esOwner: boolean
  nombreOrg: string; iniciales: string
  themePref: ThemePref; onThemePref: (p: ThemePref) => void
  onSignOut: () => void
}) {
  const [masAbierto, setMasAbierto] = useState(false)
  const items: PortalNavItem[] = ITEMS_MENU.map(i => ({ key: i.key, label: i.label, icon: ICONOS[i.key] }))
  // Al cerrar, el foco vuelve al botón «Más» (en iOS un toque no siempre lo enfoca: se busca por su nombre).
  function alCerrar() {
    setMasAbierto(false)
    requestAnimationFrame(() => { Array.from(document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Administración"] button')).find(b => b.textContent?.trim() === 'Más')?.focus() })
  }
  return (
    <>
      <PortalNav items={items} active={masAbierto ? 'mas' : activo} soloTelefono etiqueta="Administración"
        onSelect={k => { if (k === 'mas') setMasAbierto(true); else onSelect(k as Exclude<ClaveMenu, 'mas'>) }} />
      {masAbierto && (
        <HojaMas nombreOrg={nombreOrg} iniciales={iniciales} esOwner={esOwner} themePref={themePref} onThemePref={onThemePref} onTab={onTab} onSignOut={onSignOut} onCerrar={alCerrar} />
      )}
    </>
  )
}
