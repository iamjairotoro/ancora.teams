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
   ════════════════════════════════════════════════════════════════════════ */

'use client'
import { ChevronDown, Moon, Sun } from 'lucide-react'
import styles from './app.module.css'

export type ShellNavItem = { key: string; label: string; onClick: () => void; active?: boolean; hasBadge?: boolean }

export interface AppShellProps {
  orgName: string
  onOrgPicker?: () => void
  userInitials: string
  memberItems: ShellNavItem[]
  adminItems?: ShellNavItem[]
  canAdmin: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  // No cubiertos por la referencia (asume que viven en otro lado) pero
  // son funcionalidad real que ya existía — se agregan como opcionales
  // chicos en vez de inventarles su propia pantalla.
  portalHref?: string
  onSignOut?: () => void
  children: React.ReactNode
}

export default function AppShell({
  orgName, onOrgPicker, userInitials, memberItems, adminItems, canAdmin, theme, onToggleTheme,
  portalHref, onSignOut, children,
}: AppShellProps) {
  return (
    <>
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
          {memberItems.map(item => (
            <a key={item.key} href="#" aria-current={item.active ? 'page' : undefined}
              onClick={e => { e.preventDefault(); item.onClick() }}>
              {item.label}
              {item.hasBadge && <span className={styles.navDot} />}
            </a>
          ))}

          {canAdmin && adminItems && adminItems.length > 0 && (
            <>
              <span className={styles.navSep} />
              {adminItems.map(item => (
                <a key={item.key} href="#" aria-current={item.active ? 'page' : undefined}
                  onClick={e => { e.preventDefault(); item.onClick() }}>
                  {item.label}
                  {item.hasBadge && <span className={styles.navDot} />}
                </a>
              ))}
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
          <button className={styles.iconBtn} onClick={onToggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className={styles.meAvatar} aria-hidden>{userInitials}</div>
        </div>
      </header>

      <main className={styles.page}>{children}</main>
    </>
  )
}

const AnchorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
    <path d="M12 7v14M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 13a7 7 0 0 0 14 0M4 13h3M17 13h3" />
  </svg>
)
