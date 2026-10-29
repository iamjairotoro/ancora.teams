'use client'
// Las dos hojas desde abajo de la «Orden del servicio» en teléfono (Orden-Herramienta-B): el menú «⋯» y «Añadir». Sobre HojaBase, la misma de las demás hojas del teléfono (foco, Tab, Escape, fondo, gesto «atrás», teclado).
// Solo cambia el contenedor: cada fila llama a la misma función que el menú flotante de escritorio. Una acción abre otra cosa DESPUÉS de cerrar la hoja (`cerrar(despues)`).
import { useId } from 'react'
import { Layers, RotateCw, Save, Trash2, XCircle } from 'lucide-react'
import HojaBase from '../admin-movil/HojaBase'
import hoja from '@/app/portal/_components/disponibilidad/hoja.module.css'
import pantallas from '../servicio-movil/pantallas.module.css'
import { toMMSS } from '@/lib/orden/duracion'
import { TEXTOS_ORDEN_HERRAMIENTA as T } from '@/lib/textos/ordenHerramienta'
import ui from './orden-telefono.module.css'

const Titulo = ({ id, children }: { id: string; children: React.ReactNode }) => <h2 id={id} className={hoja.titulo}>{children}</h2>

export function HojaMenuOrden({ puedeGestionarPlantillas, hayBloques, nombrePlantilla, hayPlantilla, onAplicar, onGuardarComo, onActualizar, onVaciar, onQuitar, onCerrar }: {
  puedeGestionarPlantillas: boolean
  hayBloques: boolean
  /** El nombre de la plantilla aplicada a este servicio (si hay una). */
  nombrePlantilla: string | null
  hayPlantilla: boolean
  onAplicar: () => void
  onGuardarComo: () => void
  onActualizar: () => void
  onVaciar: () => void
  onQuitar: () => void
  onCerrar: () => void
}) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.titulo}</Titulo>}>
      {cerrar => (
        <>
          {puedeGestionarPlantillas && (
            <ul className={pantallas.listaHoja}>
              <li><button type="button" className={pantallas.filaHoja} onClick={() => cerrar(onAplicar)}><Layers size={18} aria-hidden="true" />{T.aplicar}</button></li>
              <li><button type="button" className={pantallas.filaHoja} disabled={!hayBloques} onClick={() => cerrar(onGuardarComo)}><Save size={18} aria-hidden="true" />{T.guardarComoPlantilla}</button></li>
              <li>
                <button type="button" className={pantallas.filaHoja} disabled={!hayPlantilla} onClick={() => cerrar(onActualizar)}>
                  <RotateCw size={18} aria-hidden="true" />
                  <span className={ui.txtHoja}>{T.actualizar}<span className={ui.subHoja}>{hayPlantilla ? `«${nombrePlantilla || ''}»` : T.sinPlantillaAplicada}</span></span>
                </button>
              </li>
              <li><button type="button" className={`${pantallas.filaHoja} ${pantallas.peligro}`} disabled={!hayBloques} onClick={() => cerrar(onVaciar)}><XCircle size={18} aria-hidden="true" />{T.vaciar}</button></li>
            </ul>
          )}
          <ul className={pantallas.listaHoja}>
            <li><button type="button" className={`${pantallas.filaHoja} ${pantallas.peligro}`} onClick={() => cerrar(onQuitar)}><Trash2 size={18} aria-hidden="true" />{T.quitarHerramienta}</button></li>
          </ul>
          <button type="button" className={`${pantallas.boton} ${ui.cancelar}`} onClick={() => cerrar()}>{T.cancelar}</button>
        </>
      )}
    </HojaBase>
  )
}

export function HojaAnadirOrden({ bloques, onCancion, onBloque, onCerrar }: {
  bloques: { titulo: string; duracion_min: number }[]
  onCancion: () => void
  onBloque: (preset?: { titulo: string; duracion_min: number }) => void
  onCerrar: () => void
}) {
  const id = useId()
  return (
    <HojaBase idTitulo={id} onCerrar={onCerrar} cabeza={<Titulo id={id}>{T.anadirAlOrden}</Titulo>}>
      {cerrar => (
        <>
          <ul className={pantallas.listaHoja}>
            <li><button type="button" className={`${pantallas.filaHoja} ${pantallas.filaElegida}`} onClick={() => cerrar(onCancion)}>{T.cancion}</button></li>
          </ul>
          <ul className={pantallas.listaHoja}>
            {bloques.map(b => (
              <li key={b.titulo}><button type="button" className={pantallas.filaHoja} onClick={() => cerrar(() => onBloque(b))}>{b.titulo}<span className={ui.durHoja}>{toMMSS(b.duracion_min)}</span></button></li>
            ))}
            <li><button type="button" className={pantallas.filaHoja} onClick={() => cerrar(() => onBloque())}>{T.bloquePersonalizado}</button></li>
          </ul>
          <button type="button" className={`${pantallas.boton} ${ui.cancelar}`} onClick={() => cerrar()}>{T.cancelar}</button>
        </>
      )}
    </HojaBase>
  )
}
