'use client'
/* Menú único del portal (punto 53, commit b; rediseñado en el 54, commit 0b): UNA sola instancia, montada una vez; no se redibuja al navegar, así
   la píldora del ítem activo persiste y se desliza entre ítems (300 ms, cubic-bezier(.2,.8,.2,1)). Con prefers-reduced-motion
   salta sin animar. Cuatro ítems sin acceso a la biblioteca, cinco con ella: los decide quien lo monta. Las medidas están en portal-nav-medidas.css.
   Accesibilidad: <nav> con nombre, ítem activo con aria-current="page", indicador aria-hidden, 44 px mínimo. */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import PortalLogo from './PortalLogo'
import { useTelefonoYa } from '@/lib/useTelefonoYa'
import { activoVisible, pendienteAlElegir, PENDIENTE_MS } from '@/lib/portal/menuOptimista'
import './portal-nav-medidas.css'
import ui from './portal-nav.module.css'

export interface PortalNavItem { key: string; label: string; icon: LucideIcon; hasDot?: boolean }

type Rect = { x: number; y: number; w: number; h: number }
const MS = 300
const EASE = 'cubic-bezier(.2,.8,.2,1)'
// Teléfono: la lente de vidrio (docs/mockups/menu-vidrio.html). Ampliación de la copia del ícono en reposo y al presionar; un arrastre empieza pasados 6 px.
const ZOOM_REPOSO = 1.15, ZOOM_PRESIONADO = 1.26, UMBRAL_ARRASTRE = 6, MARGEN_LENTE = 2, HOLGURA_ETIQUETA = 8

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
  const telefono = useTelefonoYa()
  // Pestaña tocada y aún sin confirmar (solo teléfono): la lente va ahí al tocar y no se devuelve mientras la ruta cambia (lib/portal/menuOptimista.ts). Manda la real en cuanto cambia.
  const [pendiente, setPendiente] = useState<string | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visible = activoVisible(active, pendiente, telefono)
  const limpiarTemporizador = () => { if (temporizador.current) { clearTimeout(temporizador.current); temporizador.current = null } }
  useEffect(() => { limpiarTemporizador(); setPendiente(null) }, [active])
  useEffect(() => limpiarTemporizador, [])
  const elegir = (key: string) => {
    const p = pendienteAlElegir(active, key, telefono)
    limpiarTemporizador(); setPendiente(p)
    if (p) temporizador.current = setTimeout(() => { temporizador.current = null; setPendiente(null) }, PENDIENTE_MS)
    onSelect(key)
  }
  const lenteRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)
  const gesto = useRef({ abajo: false, arrastra: false, x0: 0, id: -1, suprimirClick: false })
  const zoomActual = useRef(ZOOM_REPOSO)

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
    const ind = indRef.current, to = telefono ? null : measure()      // en teléfono el indicador va oculto: lo marca la lente
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

  // ── Lente (teléfono) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // Todo se mide de los botones reales (offsetLeft/offsetWidth), así sigue la escala --esc, las fuentes y la cantidad de ítems. `izq` = borde izquierdo de la lente dentro de la barra.
  const itemsEnOrden = () => items.map(i => itemRefs.current.get(i.key)).filter((b): b is HTMLButtonElement => !!b)
  const colocarLente = (izq: number, ancho: number) => {
    const lente = lenteRef.current, zoom = zoomRef.current, pill = pillRef.current
    if (!lente || !zoom || !pill) return
    lente.style.width = `${ancho}px`
    lente.style.transform = `translateX(${izq}px)`
    zoom.style.width = `${pill.offsetWidth}px`
    zoom.style.transformOrigin = `${izq + ancho / 2}px 50%`
    zoom.style.transform = `translateX(${-izq}px) scale(${zoomActual.current})`
    lente.setAttribute('data-listo', '')
  }
  // Ancho de la lente: el del ítem, o más si la etiqueta más larga ampliada (con la fuente real) no cabe, hasta llenar el ítem con el relleno de la barra. Es el mismo para todos los ítems.
  const anchoLente = () => {
    const bs = itemsEnOrden(); if (!bs.length) return 0
    const base = bs[0].offsetWidth - 2 * MARGEN_LENTE
    const etiqueta = Math.max(...bs.map(b => b.querySelector<HTMLElement>(`.${ui.lb}`)?.offsetWidth ?? 0)) * ZOOM_PRESIONADO + HOLGURA_ETIQUETA
    return Math.min(Math.max(base, etiqueta), bs[0].offsetWidth + 2 * bs[0].offsetLeft)      // tope: en los extremos la lente llega al borde de la barra, no lo pasa
  }
  const lenteEnItem = (b: HTMLButtonElement) => { const w = anchoLente(); colocarLente(b.offsetLeft + b.offsetWidth / 2 - w / 2, w) }
  // Sin transición: la primera colocación y los cambios de tamaño no deben «viajar».
  const sinTransicion = (fn: () => void) => {
    const lente = lenteRef.current, zoom = zoomRef.current
    if (!lente || !zoom) return
    lente.style.transition = 'none'; zoom.style.transition = 'none'
    fn(); void lente.offsetWidth
    lente.style.transition = ''; zoom.style.transition = ''
  }
  const lenteEnActivo = (animar: boolean) => {
    const b = itemRefs.current.get(visible); if (!b || b.offsetWidth === 0) return
    if (animar) lenteEnItem(b); else sinTransicion(() => lenteEnItem(b))
  }
  const lenteRefFn = useRef(lenteEnActivo); lenteRefFn.current = lenteEnActivo
  const lastLente = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (!telefono) return
    lenteRefFn.current(lastLente.current !== null && lastLente.current !== visible)      // la primera colocación no viaja
    lastLente.current = visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, items.length, telefono])
  useEffect(() => {
    const pill = pillRef.current
    if (!telefono || !pill || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => lenteRefFn.current(false))
    ro.observe(pill)
    if (document.fonts?.ready) document.fonts.ready.then(() => lenteRefFn.current(false)).catch(() => {})
    return () => ro.disconnect()
  }, [telefono])

  const nav_x = (e: PEvent) => e.clientX - (pillRef.current?.getBoundingClientRect().left ?? 0)
  const masCercano = (x: number): HTMLButtonElement | null => {
    let mejor: HTMLButtonElement | null = null, d = Infinity
    for (const b of itemsEnOrden()) { const c = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x); if (c < d) { d = c; mejor = b } }
    return mejor
  }
  const alPresionar = (e: PEvent<HTMLElement>) => {
    if (!telefono || (e.pointerType === 'mouse' && e.button !== 0)) return
    const g = gesto.current; g.abajo = true; g.arrastra = false; g.x0 = e.clientX; g.id = e.pointerId; g.suprimirClick = false
    zoomActual.current = ZOOM_PRESIONADO
    navRef.current?.setAttribute('data-presionado', '')
    const b = masCercano(nav_x(e)); if (b) lenteEnItem(b)
  }
  const alMover = (e: PEvent<HTMLElement>) => {
    const g = gesto.current; if (!g.abajo) return
    if (!g.arrastra && Math.abs(e.clientX - g.x0) > UMBRAL_ARRASTRE) {
      g.arrastra = true; g.suprimirClick = true
      try { e.currentTarget.setPointerCapture(g.id) } catch { /* sin captura el arrastre sigue dentro de la barra */ }
      navRef.current?.setAttribute('data-arrastra', '')
    }
    if (g.arrastra) {
      const bs = itemsEnOrden(); if (!bs.length) return
      const ancho = anchoLente(), c0 = bs[0].offsetLeft + bs[0].offsetWidth / 2, c1 = bs[bs.length - 1].offsetLeft + bs[bs.length - 1].offsetWidth / 2
      colocarLente(Math.max(c0, Math.min(c1, nav_x(e))) - ancho / 2, ancho)
    }
  }
  const soltarGesto = () => {
    zoomActual.current = ZOOM_REPOSO
    navRef.current?.removeAttribute('data-presionado'); navRef.current?.removeAttribute('data-arrastra')
  }
  const alSoltar = (e: PEvent<HTMLElement>) => {
    const g = gesto.current; if (!g.abajo) return
    g.abajo = false; soltarGesto()
    if (g.arrastra) {
      const b = masCercano(nav_x(e)); const k = items.find(i => itemRefs.current.get(i.key) === b)?.key
      if (k) { if (k === visible) lenteEnActivo(true); else elegir(k) } else lenteEnActivo(true)
    } else setTimeout(() => lenteRefFn.current(true), 120)       // un toque corto: el clic del botón navega como siempre (y fija la pestaña pendiente); si no llegó a haber clic, la lente vuelve a la que se ve activa
  }
  const alCancelar = () => { const g = gesto.current; g.abajo = false; g.suprimirClick = false; soltarGesto(); lenteEnActivo(true) }

  // Al cambiar de ítem se anima; al cambiar la cantidad de ítems (4 ↔ 5) solo se recoloca.
  const count = items.length
  const lastCount = useRef(count)
  useLayoutEffect(() => {
    const same = lastCount.current === count
    lastCount.current = count
    place(same)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, count, telefono])

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
      <div className={`${ui.pill}${telefono ? ` ${ui.vidrio}` : ''}`} ref={pillRef}
        {...(telefono ? { onPointerDown: alPresionar, onPointerMove: alMover, onPointerUp: alSoltar, onPointerCancel: alCancelar, onClickCapture: (e: React.MouseEvent) => { if (gesto.current.suprimirClick) { gesto.current.suprimirClick = false; e.stopPropagation(); e.preventDefault() } } } : {})}>
        <span className={ui.ind} ref={indRef} aria-hidden="true" />
        {items.map(it => {
          const on = it.key === active
          return (
            <button key={it.key} type="button" className={`${ui.it}${on ? ` ${ui.on}` : ''}`}
              ref={el => { if (el) itemRefs.current.set(it.key, el); else itemRefs.current.delete(it.key) }}
              onClick={() => elegir(it.key)} aria-current={on ? 'page' : undefined}
              aria-label={it.hasDot ? `${it.label}, hay mensajes sin leer` : undefined}>
              <span className={ui.ic} data-ic="">
                <it.icon size={24} strokeWidth={1.5} aria-hidden="true" />
                {it.hasDot && <span className={ui.dot} aria-hidden="true" />}
              </span>
              <span className={ui.lb}>{it.label}</span>
            </button>
          )
        })}
        {telefono && (
          <div className={ui.lente} ref={lenteRef} aria-hidden="true">
            <div className={ui.zoom} ref={zoomRef}>
              {items.map(it => (
                <span key={it.key} className={`${ui.it} ${ui.copia}${it.key === visible ? ` ${ui.cur}` : ''}`}>
                  <span className={ui.ic}>
                    <it.icon size={24} strokeWidth={1.5} aria-hidden="true" />
                    {it.hasDot && <span className={ui.dot} />}
                  </span>
                  <span className={ui.lb}>{it.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}
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
