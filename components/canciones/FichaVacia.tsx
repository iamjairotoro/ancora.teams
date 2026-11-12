'use client'
// El estado vacío de la ficha del administrador en teléfono (tablero «Ficha admin · Borrador y estado vacío»): «Esta canción todavía no tiene letra», qué hacer, «Agregar letra» y «Subir archivos».
// Solo dibuja y reenvía: «Agregar letra» hace lo de siempre (la acción de agregar letra de la ficha) y «Subir archivos» abre la pantalla de Adjuntos. Los botones son solo para quien administra, como antes.
import { FileText } from 'lucide-react'
import { TEXTOS_CANCIONES_ADMIN as T } from '@/lib/textos/cancionesAdmin'

export default function FichaVacia({ puedeEditar, onAgregarLetra, onSubirArchivos }: { puedeEditar: boolean; onAgregarLetra: () => void; onSubirArchivos: () => void }) {
  return (
    <div className="anc-fichaVacia" data-ficha="vacia">
      <span className="anc-fichaVacia__icono" aria-hidden="true"><FileText size={26} /></span>
      <p className="anc-fichaVacia__titulo">{T.fichaVaciaTitulo}</p>
      <p className="anc-fichaVacia__ayuda">{T.fichaVaciaAyuda}</p>
      {puedeEditar && <button type="button" className="anc-fichaVacia__letra" onClick={onAgregarLetra}>{T.fichaAgregarLetra}</button>}
      {puedeEditar && <button type="button" className="anc-fichaVacia__archivos" onClick={onSubirArchivos}>{T.fichaSubirArchivos}</button>}
    </div>
  )
}
