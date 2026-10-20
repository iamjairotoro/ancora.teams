'use client'
// La barra «‹ Servicios» sobre un servicio abierto en teléfono: vuelve a la lista (lib/admin/urlServicio.ts decide si retrocede en el historial o reemplaza la URL).
import { ChevronLeft } from 'lucide-react'
import { TEXTOS_SERVICIO as T } from '@/lib/textos/servicio'
import ui from './lista.module.css'

export default function BarraServicios({ onVolver }: { onVolver: () => void }) {
  return (
    <div className={ui.barra}>
      <button type="button" className={ui.volver} onClick={onVolver} aria-label={T.volverA}><ChevronLeft size={20} aria-hidden="true" />{T.volver}</button>
    </div>
  )
}
