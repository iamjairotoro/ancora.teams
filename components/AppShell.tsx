/* ════════════════════════════════════════════════════════════════════════
   AppShell.tsx — barra superior + contenedor de página  ·  v3

   ORIGEN: portado de docs/mockup-admin-editorial.html (paquete v3 del
   usuario). Reemplaza al sidebar en app/admin/page.tsx — ya no hay menú
   lateral ahí. El portal del músico (app/portal/[token]/page.tsx) no
   forma parte de este paquete y sigue con components/Sidebar.tsx sin
   cambios.

   AJUSTE DELIBERADO respecto al archivo original: la referencia usaba
   <Link href="/servicios"> a rutas reales de Next.js que esta app no
   tiene — toda la navegación de admin es hoy pestañas (?tab=) dentro de
   una sola página. Los ítems de nav acá son {key,label,onClick} en vez
   de {href,label}, y se renderizan igual como <a> (para que la clase
   .nav a del CSS siga aplicando) pero con onClick + preventDefault en
   vez de navegación real.

   Excepción — Home (fase 12): vive en su propia ruta (/home), fuera de
   /admin, así que ese ítem SÍ necesita navegación real entre páginas.
   Un ShellNavItem con `href` se renderiza como link de verdad — con
   next/link (fix posterior: un <a> plano recargaba la app entera y
   reiniciaba AuthGateContext en cada ida y vuelta /home↔/admin, ver
   README); el resto de los ítems de /admin no la usan y siguen
   exactamente igual que antes.
   ════════════════════════════════════════════════════════════════════════ */

'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import styles from './app.module.css'
import { PersonDrawerProvider, type PersonDetail } from './persona/PersonDrawer'
import type { ThemePref } from '@/lib/useDarkMode'

export type ShellNavItem =
  | { key: string; label: string; onClick: () => void; href?: undefined; active?: boolean; hasBadge?: boolean }
  | { key: string; label: string; href: string; onClick?: undefined; active?: boolean; hasBadge?: boolean }

export interface AppShellProps {
  orgName: string
  onOrgPicker?: () => void
  userInitials: string
  memberItems: ShellNavItem[]
  adminItems?: ShellNavItem[]
  canAdmin: boolean
  // Punto 42: Sistema / Claro / Oscuro (ver lib/useDarkMode.ts).
  themePref: ThemePref
  onThemePref: (pref: ThemePref) => void
  // No cubiertos por la referencia (asume que viven en otro lado) pero
  // son funcionalidad real que ya existía — se agregan como opcionales
  // chicos en vez de inventarles su propia pantalla.
  portalHref?: string
  onSignOut?: () => void
  // Panel lateral de persona — se monta UNA sola vez acá (ver
  // components/persona/PersonDrawer.tsx), no por pantalla.
  loadPerson: (personId: string) => Promise<PersonDetail>
  onEditPerson: (personId: string) => void
  children: React.ReactNode
}

export default function AppShell({
  orgName, onOrgPicker, userInitials, memberItems, adminItems, canAdmin, themePref, onThemePref,
  portalHref, onSignOut, loadPerson, onEditPerson, children,
}: AppShellProps) {
  return (
    <PersonDrawerProvider loadPerson={loadPerson} canEdit={canAdmin} onEdit={onEditPerson}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <span className={styles.mark}>
            <AnchorIcon />
            Áncora
          </span>
          <button className={styles.orgPicker} onClick={onOrgPicker} disabled={!onOrgPicker}>
            <b>{orgName}</b>
            <ChevronDown size={11} />
          </button>
        </div>

        <nav className={styles.nav}>
          {memberItems.map(item => <NavLink key={item.key} item={item} />)}

          {canAdmin && adminItems && adminItems.length > 0 && (
            <>
              <span className={styles.navSep} />
              {adminItems.map(item => <NavLink key={item.key} item={item} />)}
            </>
          )}
        </nav>

        <div className={styles.topRight}>
          {portalHref && (
            <a href={portalHref} target="_blank" rel="noreferrer"
              style={{fontSize:'.75rem',fontWeight:600,color:'var(--v3-ink-3)',textDecoration:'none'}}>
              Mi portal ↗
            </a>
          )}
          {onSignOut && (
            <button onClick={onSignOut} style={{background:'none',border:'none',cursor:'pointer',font:'inherit',fontSize:'.75rem',fontWeight:600,color:'var(--v3-ink-3)'}}>
              Salir
            </button>
          )}
          <ThemeMenu pref={themePref} onChange={onThemePref} />
          <div className={styles.meAvatar} aria-hidden>{userInitials}</div>
        </div>
      </header>

      <main className={styles.page}>{children}</main>
    </PersonDrawerProvider>
  )
}

const THEME_OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', Icon: Monitor },
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
]

// Control «Apariencia»: botón con el ícono del tema elegido y un menú de tres
// opciones. Escape o un clic afuera lo cierran y el foco vuelve al botón.
function ThemeMenu({ pref, onChange }: { pref: ThemePref; onChange: (pref: ThemePref) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const current = THEME_OPTIONS.find(o => o.value === pref) ?? THEME_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    wrapRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className={styles.themeWrap} ref={wrapRef}>
      <button ref={btnRef} className={styles.iconBtn} onClick={() => setOpen(o => !o)}
        aria-label={`Apariencia: ${current.label}`} aria-haspopup="menu" aria-expanded={open}>
        <current.Icon size={15} />
      </button>
      {open && (
        <div className={styles.themeMenu} role="menu" aria-label="Apariencia">
          <span className={styles.themeLbl} aria-hidden>Apariencia</span>
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button key={value} role="menuitemradio" aria-checked={pref === value}
              className={styles.themeItem}
              onClick={() => { onChange(value); setOpen(false); btnRef.current?.focus() }}>
              <Icon size={14} />
              <span>{label}</span>
              {pref === value && <Check size={13} className={styles.themeCheck} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NavLink({ item }: { item: ShellNavItem }) {
  if (item.href) {
    return (
      <Link href={item.href} aria-current={item.active ? 'page' : undefined}>
        {item.label}
        {item.hasBadge && <span className={styles.navDot} />}
      </Link>
    )
  }
  return (
    <a href="#" aria-current={item.active ? 'page' : undefined}
      onClick={e => { e.preventDefault(); item.onClick?.() }}>
      {item.label}
      {item.hasBadge && <span className={styles.navDot} />}
    </a>
  )
}

const AnchorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
    <path d="M12 7v14M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 13a7 7 0 0 0 14 0M4 13h3M17 13h3" />
  </svg>
)
