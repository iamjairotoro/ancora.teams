'use client'
// Buscador de teléfono (Campos · A/B/C, Personas-E/F): píldora de vidrio de 40 px con lupa. Al enfocar aparece al lado el ✕ redondo que cancela y limpia; con texto, dentro del campo, el círculo que borra solo el texto.
// Solo se dibuja en teléfono: los llamadores conservan su <input> original para escritorio y tablet.
import { useEffect, useRef, useState, type KeyboardEventHandler, type RefObject } from 'react'
import { Search, X } from 'lucide-react'
import { TEXTOS_CAMPOS as T } from '@/lib/textos/campos'
import ui from './campo-busqueda.module.css'

type Props = {
  valor: string
  onCambio: (v: string) => void
  placeholder: string
  /** Nombre accesible del campo (aria-label). */
  etiqueta: string
  inputRef?: RefObject<HTMLInputElement>
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>
  autoFocus?: boolean
}

// En iOS tocar un botón desenfoca el campo ANTES del clic: si el ✕ desapareciera en ese instante, el toque se perdería. Por eso se oculta con una pequeña espera.
const ESPERA_OCULTAR_MS = 200

export default function CampoBusqueda({ valor, onCambio, placeholder, etiqueta, inputRef, onKeyDown, autoFocus }: Props) {
  const propio = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? propio
  const [enfocado, setEnfocado] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const alEnfocar = () => { if (timer.current) clearTimeout(timer.current); setEnfocado(true) }
  const alDesenfocar = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setEnfocado(false), ESPERA_OCULTAR_MS) }
  const sinPerderFoco = (e: { preventDefault: () => void }) => e.preventDefault()   // con ratón/lápiz el campo conserva el foco al pulsar los botones
  const borrar = () => { onCambio(''); ref.current?.focus() }
  const cancelar = () => { onCambio(''); ref.current?.blur(); if (timer.current) clearTimeout(timer.current); setEnfocado(false) }

  return (
    <div className={ui.fila}>
      <label className={ui.campo}>
        <Search className={ui.lupa} size={17} aria-hidden="true" />
        <input ref={ref} type="search" className={ui.entrada} value={valor} onChange={e => onCambio(e.target.value)} onKeyDown={onKeyDown}
          onFocus={alEnfocar} onBlur={alDesenfocar} placeholder={placeholder} aria-label={etiqueta} autoFocus={autoFocus}
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
        {valor !== '' && (
          <button type="button" className={ui.borrar} aria-label={T.borrarTexto} onMouseDown={sinPerderFoco} onClick={borrar}>
            <span className={ui.borrarDisco} aria-hidden="true"><X size={12} strokeWidth={3} /></span>
          </button>
        )}
      </label>
      {enfocado && (
        <button type="button" className={ui.cancelar} aria-label={T.cancelarBusqueda} onMouseDown={sinPerderFoco} onClick={cancelar}>
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
