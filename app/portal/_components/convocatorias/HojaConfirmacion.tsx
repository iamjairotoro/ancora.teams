'use client'
// Hoja de confirmación (alertdialog) — punto 52. EN TELÉFONO (≤ 768 px) es la ventana centrada común (components/ventanas/VentanaCentrada, mockup Ventanas-A) en modo controlada: mismas reglas (foco en «Cancelar», Escape y el fondo cancelan salvo mientras guarda, el error se dice dentro, «Guardando…»); el resto, la hoja de siempre. Reutilizable: «Aceptar aquí en su lugar» y «Quitar mi confirmación» (y lo que rehaga el punto 54).
//   · role="alertdialog" + aria-modal + aria-labelledby/aria-describedby.
//   · El foco entra en «Cancelar» (la acción segura) y se queda dentro (Tab y Shift+Tab ciclan entre los dos botones); al cerrar vuelve a donde estaba.
//     Mientras se guarda el foco se queda en la hoja (los botones se deshabilitan y el navegador lo soltaría) y, si falla, vuelve a «Cancelar».
//   · Escape cancela (se escucha en el documento, no solo dentro de la hoja). Tocar el velo también cancela. Mientras se guarda (ocupado) nada cancela ni se puede pulsar dos veces.
//   · Celular: sube desde abajo; escritorio: centrada. Con prefers-reduced-motion no hay animaciones. Solo tokens --anc-*.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import ui from './convocatorias.module.css'
import VentanaCentrada from '@/components/ventanas/VentanaCentrada'
import { useTelefonoYa } from '@/lib/useTelefonoYa'
import { TEXTOS_VENTANAS } from '@/lib/textos/ventanas'

export interface PropsHoja {
  abierta: boolean
  titulo: string
  children: ReactNode
  etiquetaConfirmar: string
  onConfirmar: () => void
  onCancelar: () => void
  ocupado?: boolean
  error?: string | null
}

/** Escritorio y tabletas: la hoja de siempre (centrada desde 640 px). */
function HojaDeSiempre({ abierta, titulo, children, etiquetaConfirmar, onConfirmar, onCancelar, ocupado = false, error }: PropsHoja) {
  const idTitulo = useId(), idTexto = useId()
  const cancelar = useRef<HTMLButtonElement>(null), confirmar = useRef<HTMLButtonElement>(null), hojaRef = useRef<HTMLDivElement>(null)
  const estabaOcupado = useRef(false)
  const ultimo = useRef({ ocupado, onCancelar }); ultimo.current = { ocupado, onCancelar }
  const previo = useRef<HTMLElement | null>(null)
  const [montado, setMontado] = useState(false)
  useEffect(() => setMontado(true), [])

  // Foco: entra en «Cancelar» y vuelve al abrir lo que lo abrió. El fondo no se desplaza mientras la hoja está abierta.
  useEffect(() => {
    if (!abierta) return
    previo.current = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelar.current?.focus()
    return () => { document.body.style.overflow = overflow; previo.current?.focus?.() }
  }, [abierta])

  // Escape y la trampa de Tab, a nivel de documento: con el foco fuera de la hoja (p. ej. tras deshabilitarse un botón) igual funcionan.
  useEffect(() => {
    if (!abierta) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (!ultimo.current.ocupado) ultimo.current.onCancelar(); return }
      if (e.key !== 'Tab') return
      const orden = [cancelar.current, confirmar.current].filter((b): b is HTMLButtonElement => !!b && !b.disabled)
      if (!orden.length) { e.preventDefault(); hojaRef.current?.focus(); return }
      const i = orden.indexOf(document.activeElement as HTMLButtonElement)
      const siguiente = e.shiftKey ? (i <= 0 ? orden.length - 1 : i - 1) : (i === -1 || i === orden.length - 1 ? 0 : i + 1)
      e.preventDefault(); orden[siguiente].focus()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierta])

  // Foco: mientras se guarda queda en la hoja; si falla (vuelve a estar libre y sigue abierta), regresa a «Cancelar».
  useEffect(() => {
    if (!abierta) { estabaOcupado.current = false; return }
    if (ocupado) { estabaOcupado.current = true; hojaRef.current?.focus() }
    else if (estabaOcupado.current) { estabaOcupado.current = false; cancelar.current?.focus() }
  }, [abierta, ocupado])

  if (!abierta || !montado) return null

  return createPortal(
    <div className={ui.velo} onClick={() => { if (!ocupado) onCancelar() }}>
      <div className={ui.hoja} role="alertdialog" aria-modal="true" aria-labelledby={idTitulo} aria-describedby={idTexto}
        ref={hojaRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className={ui.asa} aria-hidden="true" />
        <h2 id={idTitulo} className={ui.hojaTitulo}>{titulo}</h2>
        <div id={idTexto} className={ui.hojaTexto}>{children}</div>
        {error && <p role="alert" className={ui.hojaError}>{error}</p>}
        <div className={ui.hojaAcciones}>
          <button ref={cancelar} type="button" className={`${ui.btn} ${ui.btnQ}`} onClick={onCancelar} disabled={ocupado}>Cancelar</button>
          <span className={ui.sp} />
          <button ref={confirmar} type="button" className={`${ui.btn} ${ui.btnA}`} onClick={onConfirmar} disabled={ocupado} aria-busy={ocupado || undefined}>
            {ocupado ? 'Guardando…' : etiquetaConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function HojaConfirmacion(p: PropsHoja) {
  const telefono = useTelefonoYa()
  if (!telefono) return <HojaDeSiempre {...p} />
  if (!p.abierta) return null
  return (
    <VentanaCentrada controlada ocupado={!!p.ocupado} error={p.error} titulo={p.titulo} tono="info" onCerrar={p.onCancelar}
      botones={[{ texto: TEXTOS_VENTANAS.cancelar, onClick: p.onCancelar }, { texto: p.ocupado ? 'Guardando…' : p.etiquetaConfirmar, primario: true, onClick: p.onConfirmar }]}>
      {p.children}
    </VentanaCentrada>
  )
}
