'use client'
/* El «!» del correo de una persona en la nómina, con su globo (punto 61, ajuste de octubre 2026). Con éxito NO se dibuja nada: este componente solo se monta cuando hay un
   problema (lib/problemasCorreo.ts). Al tocarlo —o con Enter/Espacio— se abre un globo con el motivo y, si el correo falló, «Reintentar correo». Se cierra con Escape (el foco vuelve
   al «!»), tocando fuera, o con Tab (el globo vive en <body>: seguir tabulando desde ahí saltaría al final de la página). */
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ProblemaCorreo as Problema } from '@/lib/problemasCorreo'
import ui from './problema-correo.module.css'

// Un triángulo con «!»: la forma dice «problema» aunque no se distinga el color.
const Triangulo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M10 2.8 18.2 17H1.8Z" /><path d="M10 8.2v4.1" /><path d="M10 14.6v.01" />
  </svg>
)

export default function ProblemaCorreo({ nombre, problema, reintentando, onReintentar }: {
  nombre: string
  problema: Problema
  reintentando: boolean
  onReintentar: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; arriba: boolean; flecha: number } | null>(null)
  const botonRef = useRef<HTMLButtonElement>(null), globoRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const esFallo = problema.tipo === 'fallo'

  const colocar = useCallback(() => {
    const b = botonRef.current, g = globoRef.current
    if (!b || !g) return
    const r = b.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight, M = 12
    const w = g.offsetWidth, h = g.offsetHeight
    const left = Math.max(M, Math.min(r.left + r.width / 2 - w / 2, vw - w - M))
    let top = r.bottom + 8, arriba = false
    if (top + h > vh - M && r.top - 8 - h >= M) { top = r.top - 8 - h; arriba = true }      // sin lugar abajo y con lugar arriba: se abre hacia arriba
    setPos({ left, top, arriba, flecha: r.left + r.width / 2 - left })
  }, [])

  useLayoutEffect(() => { if (abierto) colocar() }, [abierto, colocar, problema, reintentando])

  useEffect(() => {
    if (!abierto) return
    const cerrar = (devolverFoco: boolean) => { setAbierto(false); if (devolverFoco) botonRef.current?.focus() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(true) }
      else if (e.key === 'Tab' && globoRef.current?.contains(document.activeElement)) { e.preventDefault(); cerrar(true) }
    }
    const onDown = (e: Event) => { const t = e.target as Node; if (!globoRef.current?.contains(t) && !botonRef.current?.contains(t)) cerrar(false) }
    const onMove = () => colocar()
    document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onMove); window.addEventListener('scroll', onMove, true)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true) }
  }, [abierto, colocar])

  // Al abrir, el foco entra al globo (a «Reintentar correo» si lo hay): quien usa teclado o lector de pantalla llega al motivo. Se espera a que esté colocado: mientras se mide
  // va invisible (visibility:hidden) y un elemento invisible no recibe el foco.
  const enfocado = useRef(false)
  useEffect(() => {
    if (!abierto) { enfocado.current = false; return }
    if (!pos || enfocado.current) return
    enfocado.current = true
    const g = globoRef.current; (g?.querySelector<HTMLElement>('button:not(:disabled)') ?? g)?.focus()      // un botón desactivado («Reintentando…») no recibe el foco: entonces, el globo
  }, [abierto, pos])

  return (
    <>
      <button ref={botonRef} type="button" className={`${ui.btn}${esFallo ? ` ${ui.fallo}` : ''}`} aria-label={`Problema con el correo de ${nombre}`}
        aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? id : undefined} onClick={() => setAbierto(a => !a)}>
        <Triangulo className={ui.ico} />
      </button>
      {abierto && typeof document !== 'undefined' && createPortal(
        <div ref={globoRef} id={id} role="dialog" aria-label={`Problema con el correo de ${nombre}`} tabIndex={-1}
          className={`${ui.globo}${esFallo ? ` ${ui.fallo}` : ''} ${pos?.arriba ? ui.arriba : ui.abajo}`}
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden', ['--flecha' as string]: `${pos?.flecha ?? 0}px` }}>
          <span className={ui.flecha} aria-hidden="true" />
          <p className={ui.titulo}><Triangulo />{problema.titulo}</p>
          <p className={ui.motivo}>{problema.motivo}</p>
          {problema.push && <p className={ui.push}>{problema.push}</p>}
          {problema.puedeReintentar && (
            <button type="button" className={ui.retry} disabled={reintentando} onClick={onReintentar} aria-label={`Reintentar correo a ${nombre}`}>
              {reintentando ? 'Reintentando…' : 'Reintentar correo'}
            </button>
          )}
        </div>, document.body)}
    </>
  )
}
