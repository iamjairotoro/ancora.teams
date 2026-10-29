'use client'
// Pestañas de texto de teléfono (Personas-E/F): «Personas | Equipos» sin caja. Solo las dibuja PersonasPanel en teléfono; escritorio y tablet conservan el selector segmentado.
// Accesibilidad: tablist con pestañas (aria-selected); solo la activa entra con Tab, las flechas cambian de pestaña y mueven el foco.
import { useRef } from 'react'
import ui from './pestanas-texto.module.css'

export interface PestanaTexto<T extends string> { valor: T; texto: string }

export default function PestanasTexto<T extends string>({ pestanas, valor, onCambio, etiqueta }: {
  pestanas: PestanaTexto<T>[]
  valor: T
  onCambio: (v: T) => void
  /** Nombre accesible del grupo. */
  etiqueta: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const indice = Math.max(0, pestanas.findIndex(p => p.valor === valor))
  function alTeclear(e: React.KeyboardEvent) {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const i = (indice + paso + pestanas.length) % pestanas.length
    onCambio(pestanas[i].valor); refs.current[i]?.focus()
  }
  return (
    <div className={ui.grupo} role="tablist" aria-label={etiqueta} onKeyDown={alTeclear}>
      {pestanas.map((p, i) => (
        <button key={p.valor} type="button" role="tab" aria-selected={valor === p.valor} tabIndex={i === indice ? 0 : -1} className={ui.pestana}
          ref={el => { refs.current[i] = el }} onClick={() => onCambio(p.valor)}>
          <span className={ui.texto}>{p.texto}</span>
        </button>
      ))}
    </div>
  )
}
