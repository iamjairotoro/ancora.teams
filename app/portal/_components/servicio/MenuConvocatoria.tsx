'use client'
// El «⋯» de la pantalla Servicio (punto 54, commit 5): abre las acciones de una convocatoria CONFIRMADA — «Ya no puedo ir» (declinar) y «Quitar mi confirmación» — que abren la hoja de confirmación de siempre.
// Ya no van como botones sueltos en la pantalla. Menú accesible: botón con aria-haspopup, role="menu", flechas entre opciones, Escape y tocar fuera cierran y el foco vuelve al botón.
import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import ui from './servicio.module.css'

export default function MenuConvocatoria({ onDeclinar, onQuitar, ocupado }: { onDeclinar: () => void; onQuitar: () => void; ocupado: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!abierto) return
    items.current[0]?.focus()
    const fuera = (e: PointerEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  const cerrar = (devolverFoco = true) => { setAbierto(false); if (devolverFoco) setTimeout(() => boton.current?.focus(), 0) }
  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar() }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const lista = items.current.filter(Boolean) as HTMLButtonElement[]
      const i = lista.indexOf(document.activeElement as HTMLButtonElement)
      lista[(i + (e.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length]?.focus()
    } else if (e.key === 'Tab') setAbierto(false)
  }
  const elegir = (f: () => void) => () => { setAbierto(false); f() }

  return (
    <div className={ui.menuCaja} ref={caja} onKeyDown={tecla}>
      <button ref={boton} type="button" className={ui.mas} aria-label="Más acciones de tu convocatoria" aria-haspopup="menu" aria-expanded={abierto} disabled={ocupado} onClick={() => setAbierto(v => !v)}>
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
      {abierto && (
        <div className={ui.menu} role="menu" aria-label="Tu convocatoria">
          <button type="button" role="menuitem" className={ui.item} ref={el => { items.current[0] = el }} onClick={elegir(onDeclinar)}>Ya no puedo ir</button>
          <button type="button" role="menuitem" className={ui.item} ref={el => { items.current[1] = el }} onClick={elegir(onQuitar)}>Quitar mi confirmación</button>
        </div>
      )}
    </div>
  )
}
