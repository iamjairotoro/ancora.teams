'use client'
// El cuerpo de un menú de acciones (⋯) que se abre dentro de otro elemento. Va SIEMPRE fuera de él (portal a <body>), así ningún contenedor con overflow (la tarjeta de una herramienta,
// una lista) lo recorta ni lo tapa.
//  · Teléfono (≤ 768 px): una tarjeta chica junto al botón (radio 18, filas de 46; mockup Ventanas-A), con las mismas opciones. Cualquier opción cierra el menú después de actuar.
//  · Escritorio: la misma caja `.anc-rowMenu` de siempre.
// En los dos, position:fixed calculado desde el botón (borde derecho a 9 px del botón, 2 px debajo); si abajo no cabe, abre hacia arriba y nunca se sale de la pantalla.
// Se pone donde estaba el bloque «velo + .anc-rowMenu»: su padre (position:relative) es el ancla. Quien lo usa sigue siendo dueño del estado abierto/cerrado (monta el componente solo si está abierto).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMediaQuery } from '@/lib/useMediaQuery'
import css from './menuFlotante.module.css'

const MARGEN = 8

/** El bloque contenedor del menú de siempre (position:absolute): el ancestro posicionado más cercano, no el botón. Con su caja de relleno (sin bordes) se reproduce el mismo sitio. */
function relleno(el: HTMLElement) {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
  return { top: r.top + parseFloat(cs.borderTopWidth), bottom: r.bottom - parseFloat(cs.borderBottomWidth), right: r.right - parseFloat(cs.borderRightWidth) } as DOMRect
}

function anclaPosicionada(desde: HTMLElement | null) {
  let el = desde?.parentElement ?? null
  while (el && el !== document.body && getComputedStyle(el).position === 'static') el = el.parentElement
  return el
}

export default function MenuFlotante({ titulo, onCerrar, children, style, claseCaja = 'anc-rowMenu', role, margenDerecho = 9, separacion = 2, capa = 29, puntoDeClic }: {
  /** Nombre del menú (cabecera de la hoja en teléfono). */
  titulo: string
  onCerrar: () => void
  children: ReactNode
  /** Estilo extra de la caja en escritorio (p. ej. minWidth). */
  style?: CSSProperties
  claseCaja?: string
  role?: string
  /** Cuánto se mete la caja a la izquierda del borde derecho del botón, y cuánto la separa de él (escritorio). */
  margenDerecho?: number
  separacion?: number
  /** z-index del velo en escritorio (la caja va una capa encima). Por defecto 29/30; solo cambia donde el menú vivía debajo de una barra con z-index propio. */
  capa?: number
  /** Si se da, en escritorio la caja sale junto a ese punto (x−160, y+4) en vez de junto al botón (el menú de la lista de canciones se abre donde se tocó). */
  puntoDeClic?: { x: number; y: number }
}) {
  const telefono = useMediaQuery('(max-width: 768px)')
  const marca = useRef<HTMLSpanElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (telefono === null) return
    const colocar = () => {
      const ancla = telefono ? marca.current?.parentElement ?? null : anclaPosicionada(marca.current), c = caja.current, md = telefono ? 0 : margenDerecho      // teléfono: junto al botón (su envoltorio); escritorio: donde estaba el menú de siempre
      if (!c || (!ancla && !puntoDeClic)) return
      // el menú de siempre era absoluto dentro de un contenedor angosto: su ancho útil era el del contenedor menos el margen (no menos que min-width), y el texto largo se partía en dos líneas. Se conserva.
      if (!telefono && !puntoDeClic && ancla && style?.width === undefined) c.style.maxWidth = `${Math.max(0, ancla.clientWidth - margenDerecho)}px`
      const r = puntoDeClic ? { top: puntoDeClic.y, bottom: puntoDeClic.y, right: puntoDeClic.x - 160 + 9 + c.offsetWidth } as DOMRect : relleno(ancla!), w = c.offsetWidth, h = c.offsetHeight, vw = window.innerWidth, vh = window.innerHeight
      let top = r.bottom + separacion
      if (top + h > vh - MARGEN && r.top - separacion - h >= MARGEN) top = r.top - separacion - h        // sin lugar abajo → hacia arriba
      top = Math.max(MARGEN, Math.min(top, vh - h - MARGEN))
      const left = Math.max(MARGEN, Math.min(r.right - md - w, vw - w - MARGEN))
      setPos(p => (p && p.left === left && p.top === top ? p : { left, top }))
    }
    colocar()
    window.addEventListener('resize', colocar); window.addEventListener('scroll', colocar, true)
    return () => { window.removeEventListener('resize', colocar); window.removeEventListener('scroll', colocar, true) }
  }, [telefono, margenDerecho, separacion, puntoDeClic?.x, puntoDeClic?.y])

  if (telefono === null || typeof document === 'undefined') return <span ref={marca} hidden />
  return (
    <>
      <span ref={marca} hidden />
      {createPortal(
        <>
          <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, zIndex: capa }} />
          <div ref={caja} className={`${claseCaja}${telefono ? ` ${css.tarjeta}` : ''}`} role={role} aria-label={telefono ? titulo : undefined} onClick={telefono ? e => { if ((e.target as HTMLElement).closest('button:not(:disabled)')) onCerrar() } : undefined} style={{ ...style, zIndex: capa + 1, position: 'fixed', right: 'auto', margin: 0, left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}>{children}</div>
        </>, document.body)}
    </>
  )
}
