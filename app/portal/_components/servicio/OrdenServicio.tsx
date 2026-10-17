'use client'
// El Orden del servicio (punto 54, commit 5): una tarjeta con filas numeradas. Canciones: título (una línea con «…»), artista debajo, «Lead: tú» cuando toca, el tono en una caja de ancho fijo (la misma regla que la
// lista de Canciones) y la flecha; se abren en la pantalla de la canción con «Volver». Bloques sin canción (Bienvenida, Palabra…): texto tenue y la duración a la derecha. Sin acceso a la biblioteca: sin tono ni flecha,
// y no se abren (el servidor ya no manda esos datos).
import { ChevronRight } from 'lucide-react'
import ui from './servicio.module.css'

export interface ItemOrden {
  tipo?: string; orden?: number; titulo?: string | null; tono?: string | null; duracion_min?: number | null; notas?: string | null
  song_id?: string | null; lead_id?: string | null; lead?: { nombre?: string | null } | null
  song?: { id?: string; nombre?: string | null; artista?: string | null } | null
}

export default function OrdenServicio({ items, titulo, yoId, libraryAccess, abribles, onAbrir }: {
  items: ItemOrden[]
  titulo: string
  yoId: string | null | undefined
  libraryAccess: boolean
  /** Canciones que el catálogo del portal conoce (las únicas que se pueden abrir). */
  abribles: ReadonlySet<string>
  onAbrir: (cancionId: string) => void
}) {
  return (
    <>
      <h2 className={ui.seccion}>{titulo}</h2>
      <div className={ui.tarjeta}>
        {items.length === 0 ? <p className={ui.vacio}>Aún no hay canciones.</p> : (
          <ol className={ui.lista}>
            {items.map((it, i) => {
              const esCancion = it.tipo === 'cancion' || (!it.tipo && !!it.song)      // los ensayos del enlace llegan sin `tipo`
              const nombre = esCancion ? (it.song?.nombre || it.titulo || '—') : (it.titulo || it.song?.nombre || '—')
              const cancionId = it.song_id || it.song?.id || null
              const abre = esCancion && libraryAccess && !!cancionId && abribles.has(cancionId)
              const leadYo = !!yoId && it.lead_id === yoId
              const leadOtro = !leadYo && it.lead?.nombre ? `Lead: ${it.lead.nombre}` : null
              const sub = [esCancion ? it.song?.artista : null, leadOtro].filter(Boolean).join(' · ')
              const contenido = (
                <>
                  <span className={ui.num}>{i + 1}</span>
                  <span className={ui.txt}>
                    <span className={ui.titulo}>{nombre}</span>
                    {sub && <span className={ui.sub}>{sub}</span>}
                    {it.notas && <span className={ui.nota}>{it.notas}</span>}
                  </span>
                  {esCancion ? (
                    <>
                      {leadYo && <span className={ui.lead}>Lead: tú</span>}
                      {libraryAccess && <span className={ui.tono}>{it.tono ?? ''}</span>}
                      {abre ? <ChevronRight size={18} aria-hidden="true" className={ui.flecha} /> : <span className={ui.pad8} aria-hidden="true" />}
                    </>
                  ) : (
                    <>
                      {leadYo && <span className={ui.lead}>Lead: tú</span>}
                      {it.duracion_min ? <span className={ui.dur}>{it.duracion_min} min</span> : null}
                    </>
                  )}
                </>
              )
              return (
                <li key={i} className={esCancion ? undefined : ui.bloque}>
                  {abre
                    ? <button type="button" className={ui.fila} onClick={() => onAbrir(cancionId!)} aria-label={`Abrir ${nombre}`}>{contenido}</button>
                    : <div className={ui.fila}>{contenido}</div>}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </>
  )
}
