'use client'
// La hoja que sube desde abajo de la tira de días (bloquear fecha y mes completo). Velo y hoja con las capas de la escala global (--z-scrim, --z-sheet), zona segura abajo, el foco entra en la hoja y vuelve al botón que la abrió, Escape
// y tocar el velo la cierran, Tab no sale de ella y el fondo no se desplaza. Con el teclado abierto queda encima del teclado (useTecladoHoja). El contenido y su estado son de quien la usa.
// Siempre está en el árbol de quien la usa con `abierta`: en teléfono sube y baja animada (lib/usePresencia.ts + app/ancora-movimiento.css) y se desmonta al terminar la salida; el contenido nace de nuevo en cada apertura.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { atributosHoja, elementoQueAbrio, usePresencia } from '@/lib/usePresencia'
import { useTecladoHoja } from '../useTecladoHoja'
import ui from './tira-dias.module.css'

export default function HojaInferior({ abierta, etiqueta, onCerrar, children }: { abierta: boolean; etiqueta: string; onCerrar: () => void; children: ReactNode }) {
  const p = usePresencia(abierta)
  const ref = useRef<HTMLDivElement>(null), volverA = useRef<HTMLElement | null>(null)
  useTecladoHoja(ref, p.montado)
  // El foco entra al abrir y vuelve al botón que la abrió en cuanto empieza a cerrarse (no al final de la salida). Con la hoja reabierta a mitad de la salida este efecto vuelve a correr.
  useEffect(() => {
    if (!abierta) return
    volverA.current = elementoQueAbrio()
    const antes = document.body.style.overflow; document.body.style.overflow = 'hidden'
    ref.current?.focus({ preventScroll: true })
    return () => { document.body.style.overflow = antes; const el = volverA.current; if (el && document.contains(el)) setTimeout(() => el.focus(), 0) }
  }, [abierta])
  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])') ?? [])
    if (!f.length) return
    const primero = f[0], ultimo = f[f.length - 1], activo = document.activeElement
    if (e.shiftKey && (activo === primero || activo === ref.current)) { e.preventDefault(); ultimo.focus() }
    else if (!e.shiftKey && activo === ultimo) { e.preventDefault(); primero.focus() }
  }
  if (!p.montado) return null
  return (
    <>
      <div className={ui.velo} {...atributosHoja(p, true)} onClick={onCerrar} aria-hidden="true" />
      <div ref={ref} className={ui.hoja} {...atributosHoja(p)} role="dialog" aria-modal="true" aria-label={etiqueta} tabIndex={-1} onKeyDown={teclas}>
        <div className={ui.asa} aria-hidden="true" />
        {children}
      </div>
    </>
  )
}
