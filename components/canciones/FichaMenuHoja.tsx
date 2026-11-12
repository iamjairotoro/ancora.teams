'use client'
// El menú «⋯» de la ficha del administrador en teléfono, como hoja desde abajo (tablero «Ficha admin · Menú ⋯ como hoja»): la ✕ a la izquierda, el nombre de la canción al centro y tres filas: «Editar datos», «Archivar» y «Eliminar canción» (en rojo).
// Solo dibuja y reenvía: cada fila llama a lo que recibe (la pantalla hace lo de siempre: abrir la edición, archivar, eliminar —que pregunta antes—). Escape, tocar el fondo y la ✕ la cierran; el foco entra en la ✕, Tab no sale de la hoja y al cerrar el foco vuelve al botón «⋯».
// El escritorio no la usa: conserva el menú flotante de siempre.
import { useEffect, useRef } from 'react'
import { Archive, Pencil, Trash2, X } from 'lucide-react'
import { TEXTOS_CANCIONES_ADMIN as T } from '@/lib/textos/cancionesAdmin'
import ui from './ficha-menu-hoja.module.css'

export default function FichaMenuHoja({ nombre, onCerrar, onEditar, onArchivar, onEliminar }: { nombre: string; onCerrar: () => void; onEditar: () => void; onArchivar: () => void; onEliminar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; ref.current?.querySelector<HTMLElement>('button')?.focus()
    return () => { document.body.style.overflow = overflow; previo?.focus?.() }
  }, [])
  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); onCerrar(); return }
    if (e.key !== 'Tab') return
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>('button') || [])
    if (!f.length) return
    const act = document.activeElement
    if (e.shiftKey && act === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
    else if (!e.shiftKey && act === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
  }
  return (
    <div className={ui.velo} onClick={onCerrar} data-ficha="menu">
      <div ref={ref} className={ui.hoja} role="dialog" aria-modal="true" aria-label={T.fichaMenuTitulo(nombre)} onClick={e => e.stopPropagation()} onKeyDown={tecla}>
        <div className={ui.cab}>
          <button type="button" className={ui.cerrar} onClick={onCerrar} aria-label={T.fichaMenuCerrar}><X size={18} aria-hidden="true" /></button>
          <h2 className={ui.titulo}>{nombre}</h2>
        </div>
        <button type="button" className={ui.fila} onClick={onEditar}><span className={ui.icono} aria-hidden="true"><Pencil size={20} /></span>{T.fichaMenuEditar}</button>
        <button type="button" className={ui.fila} onClick={onArchivar}><span className={ui.icono} aria-hidden="true"><Archive size={20} /></span>{T.fichaMenuArchivar}</button>
        <button type="button" className={`${ui.fila} ${ui.peligro}`} onClick={onEliminar}><span className={ui.icono} aria-hidden="true"><Trash2 size={20} /></span>{T.fichaMenuEliminar}</button>
      </div>
    </div>
  )
}
