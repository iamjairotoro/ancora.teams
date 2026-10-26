'use client'
// El Orden del servicio en TELÉFONO (mockup Portal-Orden-A): una ficha por canción con el número, el título (17/700), el artista, el chip «Tono X», el BPM, quién la lidera y las observaciones en un recuadro con ícono de nota.
// Si TÚ la lideras: «Lideras tú» y una franja con el color del equipo. Lo que no existe no se muestra. Las canciones abribles llevan flecha y abren la hoja de la letra; los bloques sin canción (Bienvenida, Palabra…) son fichas más livianas.
import { ChevronRight, StickyNote } from 'lucide-react'
import { teamColorProps } from '@/components/TeamColor'
import { fichaOrden, type BloqueOrden, type FichaOrden } from '@/lib/portal/ordenTelefono'
import { TEXTOS_ORDEN_PORTAL as T, abrirCancionOrden, textoBpmChip, textoMinutos, textoTono } from '@/lib/textos/ordenPortal'
import ui from './orden-telefono.module.css'

export default function OrdenServicioTelefono({ items, titulo, yoId, libraryAccess, abribles, color, onAbrir }: {
  items: (BloqueOrden & { orden?: number })[]
  titulo: string
  yoId: string | null | undefined
  libraryAccess: boolean
  abribles: ReadonlySet<string>
  /** Color del equipo de la persona (franja de «Lideras tú»). */
  color?: string | null
  onAbrir: (cancionId: string) => void
}) {
  if (items.length === 0) return <><h2 className={ui.seccion}>{titulo}</h2><div className={ui.vacioCaja}><p className={ui.vacio}>{T.vacio}</p></div></>
  return (
    <>
      <h2 className={ui.seccion}>{titulo}</h2>
      <ol className={ui.lista} {...teamColorProps(color)}>
        {items.map((it, i) => {
          const f: FichaOrden = fichaOrden(it, i, yoId)
          const cancionId = it.song_id || it.song?.id || null
          const abre = f.esCancion && libraryAccess && !!cancionId && abribles.has(cancionId)
          const cuerpo = (
            <>
              <span className={ui.cab}>
                <span className={ui.num}>{f.numero}</span>
                <span className={ui.txt}>
                  <span className={ui.titulo}>{f.titulo}</span>
                  {f.artista && <span className={ui.artista}>{f.artista}</span>}
                </span>
                {f.duracion && !f.esCancion && <span className={ui.dur}>{textoMinutos(f.duracion)}</span>}
                {abre && <ChevronRight size={20} aria-hidden="true" className={ui.flecha} />}
              </span>
              {(f.tono || f.bpm) && (
                <span className={ui.chips}>
                  {f.tono && <span className={ui.tono}>{textoTono(f.tono)}</span>}
                  {f.bpm && <span className={ui.bpm}>{textoBpmChip(f.bpm)}</span>}
                </span>
              )}
              {f.lider && (
                <span className={ui.lider}>
                  {!f.lider.yo && <span className={ui.liderEt}>{T.lidera}</span>}
                  <span className={ui.liderAv} aria-hidden="true">{f.lider.yo ? f.lider.iniciales : f.lider.iniciales.slice(0, 1)}</span>
                  {f.lider.yo ? <span className={ui.liderasTu}>{T.liderasTu}</span> : <span className={ui.liderNombre}>{f.lider.nombre}</span>}
                </span>
              )}
              {f.notas && <span className={ui.notas}><StickyNote size={18} aria-hidden="true" /><span>{f.notas}</span></span>}
            </>
          )
          const clase = `${ui.ficha}${f.lider?.yo ? ` ${ui.mia}` : ''}${f.esCancion ? '' : ` ${ui.bloque}`}`
          return (
            <li key={i}>
              {abre
                ? <button type="button" className={clase} onClick={() => onAbrir(cancionId!)} aria-label={abrirCancionOrden(f.titulo)}>{cuerpo}</button>
                : <div className={clase}>{cuerpo}</div>}
            </li>
          )
        })}
      </ol>
    </>
  )
}
