'use client'
// La pantalla «Adjuntos – <canción>»: flecha de volver, título y la lista (el contenido lo pone quien la usa). Es la MISMA para la ficha del administrador y la lectura del músico.
// Teléfono: pantalla completa. Escritorio y tableta: panel centrado. Capa por defecto 27: sobre el menú inferior (20) y por debajo del visor de PDF (28) y de las hojas, para que «Ver» se abra por encima (lectura del músico). La ficha del administrador pasa `capa` (52, la de la ventana de antes) para quedar sobre su barra superior; allí el menú de cada fila va en 53. La flecha (o tocar fuera del panel en escritorio) cierra.
import { useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import { TEXTOS_ADJUNTOS as T } from '@/lib/textos/pantallaAdjuntos'
import ui from './pantalla-adjuntos.module.css'

export default function PantallaAdjuntos({ nombre, onVolver, capa, children }: { nombre: string; onVolver: () => void; capa?: number; children: React.ReactNode }) {
  const volver = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    volver.current?.focus()
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden'      // la página de atrás no se desplaza mientras está abierta
    return () => { document.body.style.overflow = previo }
  }, [])
  return (
    <div className={ui.velo} style={capa ? { zIndex: capa } : undefined} onClick={onVolver}>
      <div className={`${ui.hoja} anc`} role="dialog" aria-modal="true" aria-label={T.titulo(nombre)} onClick={e => e.stopPropagation()}>
        <div className={ui.cab}>
          <button ref={volver} type="button" className={ui.volver} onClick={onVolver} aria-label={T.volver}><ChevronLeft size={22} aria-hidden="true" /></button>
          <h2 className={ui.titulo}>{T.titulo(nombre)}</h2>
        </div>
        <div className={ui.cuerpo}>{children}</div>
      </div>
    </div>
  )
}

/** El estado vacío: «Aún no hay archivos» y, solo donde se puede subir, «Sube archivos para comenzar». */
export function AdjuntosVacio({ puedeSubir }: { puedeSubir: boolean }) {
  return (
    <div className={ui.vacio} role="status">
      <b>{T.vacio}</b>
      {puedeSubir && <span>{T.vacioSubir}</span>}
    </div>
  )
}
