'use client'
import { useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, Moon, Sun } from 'lucide-react'

export interface SidebarItem {
  key: string
  label: string
  icon: LucideIcon
  onClick?: () => void
  href?: string
  hasDot?: boolean
}

interface SidebarProps {
  brand?: string
  items: SidebarItem[]
  adminItems?: SidebarItem[]
  adminLabel?: string
  active: string
  orgName?: string
  orgSubtitle?: string
  darkMode: boolean
  toggleDarkMode: () => void
  footer?: string
  storageKey?: string
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

function NavItem({ item, active }: { item: SidebarItem; active: boolean }) {
  const content = (
    <>
      <item.icon size={16} strokeWidth={1.75} />
      <span className="sbar-label">{item.label}</span>
      {item.hasDot && <span className="dot" />}
      <span className="sbar-tip">{item.label}</span>
    </>
  )
  const className = `${active ? 'on' : ''} ${item.hasDot ? 'has-dot' : ''}`.trim()
  if (item.href) {
    return <a href={item.href} className={className}>{content}</a>
  }
  return <button type="button" onClick={item.onClick} className={className}>{content}</button>
}

export default function Sidebar({
  brand = 'Áncora', items, adminItems, adminLabel = 'ADMINISTRACIÓN', active,
  orgName, orgSubtitle, darkMode, toggleDarkMode, footer, storageKey = 'ancora-sidebar-collapsed',
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(storageKey) === 'true') setCollapsed(true)
  }, [storageKey])

  function toggleCollapsed() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(storageKey, String(next))
      return next
    })
  }

  return (
    <aside className={`sbar-wrap ${collapsed ? 'sbar-collapsed' : ''}`}>
      <div className="sbar-brand">
        <span style={{ fontSize: 17 }}>⚓</span>
        <span className="sbar-label sbar-brand-text">{brand}</span>
      </div>

      <button type="button" className="sbar-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}>
        <ChevronLeft size={13} style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
      </button>

      {orgName && (
        <div className="sbar-org">
          <div className="av">{initials(orgName)}</div>
          <div className="t"><b>{orgName}</b>{orgSubtitle && <small style={{ display: 'block', fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 500 }}>{orgSubtitle}</small>}</div>
        </div>
      )}

      <div className="sbar-block">
        <nav className="sbar-nav">
          {items.map(item => <NavItem key={item.key} item={item} active={active === item.key} />)}
        </nav>
      </div>

      {adminItems && adminItems.length > 0 && (
        <div className="sbar-block">
          <div className="lbl">{adminLabel}</div>
          <nav className="sbar-nav">
            {adminItems.map(item => <NavItem key={item.key} item={item} active={active === item.key} />)}
          </nav>
        </div>
      )}

      <div className="sbar-block" style={{ marginTop: 'auto' }}>
        <nav className="sbar-nav">
          <button type="button" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
            <span className="sbar-label">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
        </nav>
      </div>

      {footer && <div className="sbar-foot">{footer}</div>}
    </aside>
  )
}
