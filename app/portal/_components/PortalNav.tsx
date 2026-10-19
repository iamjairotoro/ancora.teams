'use client'
/* Menú único del portal (punto 53, commit b; rediseñado en el 54, commit 0b): UNA sola instancia, montada una vez; no se redibuja al navegar, así
   la píldora del ítem activo persiste y se desliza entre ítems (300 ms, cubic-bezier(.2,.8,.2,1)). Con prefers-reduced-motion
   salta sin animar. Cuatro ítems sin acceso a la biblioteca, cinco con ella: los decide quien lo monta. Las medidas están en portal-nav-medidas.css.
   Accesibilidad: <nav> con nombre, ítem activo con aria-current="page", indicador aria-hidden, 44 px mínimo. */
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import PortalLogo from './PortalLogo'
import './portal-nav-medidas.css'
import ui from './portal-nav.module.css'

export interface PortalNavItem { key: string; label: string; icon: LucideIcon; hasDot?: boolean }

type Rect = { x: number; y: number; w: number; h: number }
const MS = 300
const EASE = 'cubic-bezier(.2,.8,.2,1)'

export default function PortalNav({ items, active, onSelect, hidden, profile, onProfile, modo, soloTelefono, etiqueta = 'Principal' }: {
  items: PortalNavItem[]
  active: string
  onSelect: (key: string) => void
  hidden?: boolean
  profile?: ReactNode           // contenido del botón de perfil del escritorio (foto o inicial); sin él (administración) no hay marca ni perfil
  onProfile?: () => void
  soloTelefono?: boolean        // administración: el menú es solo la barra inferior del teléfono; desde 769 px no se muestra (el escritorio tiene su propia barra)
  etiqueta?: string             // nombre accesible del <nav>
  modo?: ReactNode              // botón «Modo Admin» / «Modo Líder» (solo escritorio: en el teléfono vive en Inicio); null si la persona no tiene rol
}) {
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const indRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const prev = useRef<Rect | null>(null)

  // Escritorio (sin ícono): la cápsula del ítem. Teléfono: la píldora que envuelve ícono y etiqueta, centrada en su ítem, de --nav-pill-w × --nav-pill-h pero NUNCA más
  // ancha que el ítem (más --nav-pill-over a cada lado) ni más alta que él: con 5 ítems en un teléfono de 390 px el ítem mide ~68 px y la píldora no pisa a sus vecinos.
  // Las medidas del menú están en rem (escala del portal, --esc): se resuelven a px reales con un elemento de prueba (un parseFloat leería «5.5rem» como 5,5 px).
  const medida = (name: string, por: number) => {
    const nav = navRef.current; if (!nav) return por
    const probe = document.createElement('span'); probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:var(${name})`
    nav.appendChild(probe); const v = probe.getBoundingClientRect().width; nav.removeChild(probe)
    return Number.isFinite(v) && v > 0 ? v : por
  }
  const measure = (): Rect | null => {
    const it = itemRefs.current.get(active)
    const ic = it?.querySelector<HTMLElement>('[data-ic]')
    if (!it || !ic) return null
    if (ic.offsetWidth === 0) return { x: it.offsetLeft, y: it.offsetTop, w: it.offsetWidth, h: it.offsetHeight }
    const w = Math.min(medida('--nav-pill-w', it.offsetWidth), it.offsetWidth + 2 * medida('--nav-pill-over', 0))
    const h = Math.min(medida('--nav-pill-h', it.offsetHeight), it.offsetHeight)
    return { x: it.offsetLeft + (it.offsetWidth - w) / 2, y: it.offsetTop + (it.offsetHeight - h) / 2, w, h }
  }
  const css = (r: Rect) => ({ transform: `translate(${r.x}px,${r.y}px)`, width: `${r.w}px`, height: `${r.h}px` })

  const same = (a: Rect, b: Rect) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
  // Una medida cambió mientras el círculo viajaba: se recoloca al terminar (ver el observador de abajo).
  const pendingRelayout = useRef(false)

  const place = (animate: boolean) => {
    const ind = indRef.current, to = measure()
    if (!ind || !to) return
    const running = ind.getAnimations?.() ?? []
    // Sin animar y con la misma medida (p. ej. la primera llamada de un observador nuevo): no se toca nada.
    if (!animate && prev.current && same(prev.current, to) && !running.length) return
    // Si se toca otro ítem con el círculo a medio camino, parte de donde está ahora (no salta ni se acumula).
    let from = prev.current
    if (running.length && from) {
      const cs = getComputedStyle(ind), m = new DOMMatrixReadOnly(cs.transform)
      from = { x: m.m41, y: m.m42, w: parseFloat(cs.width), h: parseFloat(cs.height) }
    }
    running.forEach(a => a.cancel())
    prev.current = to
    Object.assign(ind.style, css(to))   // estado final, siempre
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!animate || !from || reduced || !ind.animate) return
    if (same(from, to)) return
    const anim = ind.animate([css(from), css(to)], { duration: MS, easing: EASE })
    // Al terminar, si el tamaño cambió durante el viaje, se recoloca sin animar.
    anim.finished.then(() => { if (pendingRelayout.current) { pendingRelayout.current = false; placeRef.current(false) } }).catch(() => {})
  }
  // Siempre la última versión de place (cierra sobre el ítem activo de este render).
  const placeRef = useRef(place)
  placeRef.current = place

  // Al cambiar de ítem se anima; al cambiar la cantidad de ítems (4 ↔ 5) solo se recoloca.
  const count = items.length
  const lastCount = useRef(count)
  useLayoutEffect(() => {
    const same = lastCount.current === count
    lastCount.current = count
    place(same)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, count])

  // Cambios de tamaño (girar el teléfono, pasar a escritorio, cargar fuentes): se recoloca sin animar. El observador se
  // crea UNA sola vez: uno nuevo en cada toque entregaría su primera llamada a los pocos ms y cancelaría la animación.
  // Mientras el círculo viaja ignora la llamada y recoloca al terminar.
  useEffect(() => {
    const pill = pillRef.current
    if (!pill || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const ind = indRef.current
      if (ind && (ind.getAnimations?.().length ?? 0) > 0) { pendingRelayout.current = true; return }
      placeRef.current(false)
    })
    ro.observe(pill)
    return () => ro.disconnect()
  }, [])

  return (
    <nav ref={navRef} className={`${ui.nav}${hidden ? ` ${ui.hide}` : ''}${soloTelefono ? ` ${ui.soloTel}` : ''}`} aria-label={etiqueta}
      {...(hidden ? ({ inert: '' } as Record<string, string>) : {})}>
      {!soloTelefono && <span className={ui.brand} aria-hidden="true"><PortalLogo height={22} /></span>}
      <div className={ui.pill} ref={pillRef}>
        <span className={ui.ind} ref={indRef} aria-hidden="true" />
        {items.map(it => {
          const on = it.key === active
          return (
            <button key={it.key} type="button" className={`${ui.it}${on ? ` ${ui.on}` : ''}`}
              ref={el => { if (el) itemRefs.current.set(it.key, el); else itemRefs.current.delete(it.key) }}
              onClick={() => onSelect(it.key)} aria-current={on ? 'page' : undefined}
              aria-label={it.hasDot ? `${it.label}, hay mensajes sin leer` : undefined}>
              <span className={ui.ic} data-ic="">
                <it.icon size={24} strokeWidth={1.5} aria-hidden="true" />
                {it.hasDot && <span className={ui.dot} aria-hidden="true" />}
              </span>
              <span className={ui.lb}>{it.label}</span>
            </button>
          )
        })}
      </div>
      {!soloTelefono && (
        <div className={ui.der}>
          {modo}
          <button type="button" className={ui.me} onClick={onProfile} aria-label="Mi perfil">{profile}</button>
        </div>
      )}
    </nav>
  )
}
