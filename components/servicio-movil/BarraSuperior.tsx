'use client'
// La fila de arriba de las pantallas de teléfono del servicio: a la izquierda «‹ texto» (volver) o el selector de servicio (con su ⌄), a la derecha el «⋯».
import { ChevronDown, ChevronLeft, Ellipsis } from 'lucide-react'
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import ui from './pantallas.module.css'

export default function BarraSuperior({ atras, selector, onMas }: {
  atras?: { texto?: string; etiqueta: string; onClick: () => void }
  selector?: { texto: string; onClick: () => void }
  onMas?: () => void
}) {
  return (
    <div className={ui.barra}>
      <div className={ui.barraIzq}>
        {atras && <button type="button" className={ui.atras} onClick={atras.onClick} aria-label={atras.etiqueta}><ChevronLeft size={22} aria-hidden="true" />{atras.texto && <span>{atras.texto}</span>}</button>}
        {selector && <button type="button" className={ui.selector} onClick={selector.onClick} aria-label={`${T.cambiarServicio}: ${selector.texto}`}><span>{selector.texto}</span><ChevronDown size={16} aria-hidden="true" /></button>}
      </div>
      {onMas && <button type="button" className={ui.mas} onClick={onMas} aria-label={T.masAcciones}><Ellipsis size={20} aria-hidden="true" /></button>}
    </div>
  )
}
