'use client'
// La hoja que sube desde abajo de la tira de días (bloquear fecha y mes completo). Velo y hoja con las capas de la escala global (--z-scrim, --z-sheet), zona segura abajo, el foco entra en la hoja y vuelve al botón que la abrió, Escape
// y tocar el velo la cierran, Tab no sale de ella y el fondo no se desplaza. Con el teclado abierto queda encima del teclado (useTecladoHoja). El contenido y su estado son de quien la usa.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTecladoHoja } from '../useTecladoHoja'
import ui from './tira-dias.module.css'

export default function HojaInferior({ etiqueta, onCerrar, children }: { etiqueta: string; onCerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null), volverA = useRef<HTMLElement | null>(null)
  useTecladoHoja(ref, true)
  useEffect(() => {
    volverA.current = document.activeElement as HTMLElement | null
    const antes = document.body.style.overflow; document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.body.style.overflow = antes; const el = volverA.current; if (el && document.contains(el)) setTimeout(() => el.focus(), 0) }
  }, [])
  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])') ?? [])
    if (!f.length) return
    const primero = f[0], ultimo = f[f.length - 1], activo = document.activeElement
    if (e.shiftKey && (activo === primero || activo === ref.current)) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus() }
  }
  return (
    <>
      <div className={ui.velo} onClick={onCerrar} aria-hidden="true" />
      <div ref={ref} className={ui.hoja} role="dialog" aria-modal="true" aria-label={etiqueta} tabIndex={-1} onKeyDown={teclas}>
        <div className={ui.asa} aria-hidden="true" />
        {children}
      </div>
    </>
  )
}
