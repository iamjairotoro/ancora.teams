'use client'
/* Selector segmentado del portal (punto 54): 2 a 4 opciones de igual ancho con UNA pieza activa que se desliza (200 ms; sin animar con prefers-reduced-motion). Lo usan Apariencia (Perfil), Canciones
   (Todas · Favoritas · Del domingo) y, en los commits siguientes, Servicios y Servicio. Medidas y colores en segmentado.module.css (las del selector aprobado en el Perfil).
   Accesibilidad: radiogroup con nombre (`etiqueta` o el id de un título), cada opción es un radio con aria-checked; teclado de radiogroup (solo la elegida entra con Tab; las flechas cambian de
   opción, la aplican y mueven el foco); foco visible. */
import { useRef } from 'react'
import ui from './segmentado.module.css'

export interface OpcionSegmentada<T extends string> { valor: T; texto: string }

export default function Segmentado<T extends string>({ opciones, valor, onCambio, etiqueta, idEtiqueta, className }: {
  opciones: OpcionSegmentada<T>[]
  valor: T
  onCambio: (v: T) => void
  /** Nombre accesible del grupo (si no hay un título visible al que apuntar). */
  etiqueta?: string
  /** id del título visible que nombra al grupo. */
  idEtiqueta?: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const indice = Math.max(0, opciones.findIndex(o => o.valor === valor))

  function alTeclear(e: React.KeyboardEvent) {
    const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const i = (indice + paso + opciones.length) % opciones.length
    onCambio(opciones[i].valor); refs.current[i]?.focus()
  }

  return (
    <div className={`${ui.seg}${className ? ` ${className}` : ''}`} role="radiogroup" aria-label={idEtiqueta ? undefined : etiqueta} aria-labelledby={idEtiqueta} onKeyDown={alTeclear}
      style={{ ['--i' as string]: indice, ['--n' as string]: opciones.length }}>
      <span className={ui.pieza} aria-hidden="true" />
      {opciones.map((o, i) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} tabIndex={i === indice ? 0 : -1} className={ui.opcion}
          ref={el => { refs.current[i] = el }} onClick={() => onCambio(o.valor)}>{o.texto}</button>
      ))}
    </div>
  )
}
