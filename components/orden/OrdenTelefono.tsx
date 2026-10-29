'use client'
// La herramienta «Orden del servicio» en TELÉFONO (tableros Orden-Herramienta-A y B): cabecera con «Añadir» y «⋯», una fila igual para canciones y bloques, y el pie con la duración total. Solo presenta:
// cada toque llama a lo que ya hacía (abrir la hoja del bloque, el menú «⋯», «Añadir»). Escritorio sigue con su panel de siempre (components/OrdenDelServicio.tsx), que usa esto solo con useTelefonoYa().
import type { ReactNode } from 'react'
import { BookOpen, ChevronRight, Gift, Mic, MoreHorizontal, Pencil, Plus, Shapes, Timer } from 'lucide-react'
import type { Member, ServiceBlock } from '@/lib/types'
import { toMMSS } from '@/lib/orden/duracion'
import { TEXTOS_ORDEN_HERRAMIENTA as T, resumenOrden } from '@/lib/textos/ordenHerramienta'
import ui from './orden-telefono.module.css'

/** El ícono de un bloque según su título (MC, Prédica, Ofrenda…); cualquier otro lleva uno neutro. */
function iconoDeBloque(titulo: string | null | undefined) {
  const t = (titulo || '').toLowerCase()
  if (/mc|bienvenida|anuncio|cierre|closing/.test(t)) return Mic
  if (/pr[eé]dica|salvaci[oó]n/.test(t)) return BookOpen
  if (/ofrenda/.test(t)) return Gift
  if (/preroll/.test(t)) return Timer
  return Shapes
}

/** m:ss siempre (45:00, 59:18); el total puede pasar de 60 minutos. */
export const duracionTotalMovil = (secs: number): string => {
  const m = Math.floor(secs / 60), s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function OrdenTelefono({ blocks, members, totalSecs, paneles, onAnadir, onMenu, onEditar }: {
  blocks: ServiceBlock[]
  members: Member[]
  totalSecs: number
  /** Los paneles de plantillas de siempre (elegir / guardar) y su mensaje: se muestran arriba de las filas, dentro de la tarjeta. */
  paneles: ReactNode
  onAnadir: () => void
  onMenu: () => void
  onEditar: (block: ServiceBlock, numeroCancion: number) => void
}) {
  let canciones = 0
  const total = duracionTotalMovil(totalSecs)
  return (
    <div className={ui.raiz}>
      <div>
        <h2 className={ui.titulo}>{T.titulo}</h2>
        <p className={ui.resumen}>{resumenOrden(blocks.length, total)}</p>
      </div>
      <div className={ui.acciones}>
        <button type="button" className={ui.anadir} onClick={onAnadir}><Plus size={18} aria-hidden="true" />{T.anadir}</button>
        <button type="button" className={ui.mas} onClick={onMenu} aria-label={T.accionesAria}><MoreHorizontal size={20} aria-hidden="true" /></button>
      </div>
      <div className={ui.tarjeta}>
        {paneles}
        {blocks.length === 0 ? <p className={ui.vacio}>{T.sinItems}</p> : (
          <ul className={ui.lista}>
            {blocks.map(block => {
              const esCancion = block.tipo === 'cancion'
              if (esCancion) canciones++
              const numero = canciones
              const song = block.song as any
              const titulo = esCancion ? (song?.nombre || block.titulo || '— canción —') : (block.titulo || 'Sin título')
              const dur = esCancion ? song?.duracion_min : block.duracion_min
              const responsable = esCancion && block.lead_id ? members.find(m => m.id === block.lead_id)?.nombre || '' : ''
              const nota = (block as any).notas || ''
              const Icono = iconoDeBloque(block.titulo)
              return (
                <li key={block.id}>
                  <button type="button" className={ui.fila} onClick={() => onEditar(block, numero)}>
                    {esCancion
                      ? <span className={`${ui.marca} ${ui.numero}`} aria-hidden="true">{numero}</span>
                      : <span className={`${ui.marca} ${ui.icono}`} aria-hidden="true"><Icono size={18} /></span>}
                    <span className={ui.txt}>
                      <span className={ui.nm}>{titulo}</span>
                      {!esCancion ? <span className={ui.sub}>{T.bloque}</span> : responsable ? <span className={ui.sub}>{responsable}</span> : null}
                      {nota && <span className={ui.nota}><Pencil size={13} aria-label={T.nota} role="img" /><span>{nota}</span></span>}
                    </span>
                    <span className={ui.dur}>{dur ? toMMSS(dur) : '—'}</span>
                    <ChevronRight className={ui.flecha} size={18} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {blocks.length > 0 && (
          <div className={ui.pie}>
            <span className={ui.pieK}>{T.duracionTotal}</span>
            <span className={ui.pieV}>{total}</span>
          </div>
        )}
      </div>
    </div>
  )
}
