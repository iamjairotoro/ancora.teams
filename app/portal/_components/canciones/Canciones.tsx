'use client'
// La pestaña Canciones del portal (punto 54, commit 2). Referencia: docs/mockup-musico-v2.html (Canciones). Título «Canciones», buscador por título y artista, el selector Todas · Favoritas ·
// Del domingo y la lista en una tarjeta: título, artista, tono, BPM y el corazón de favorita. «Del domingo» son las canciones del orden del próximo servicio al que ya confirmaste (con el tono
// de ese día). Solo existe con acceso a la biblioteca (lo decide el servidor: sin él, ni la pestaña ni el catálogo). El estado del filtro vive en PortalApp, así que sobrevive a abrir una canción.
import { Heart, Search } from 'lucide-react'
import Segmentado from '../segmentado/Segmentado'
import { filtrarCanciones } from '@/lib/portal/filtrarCanciones'
import { fechaConDia } from '@/lib/portal/fechas'
import type { DelDomingo } from '@/lib/portal/cancionesDelServicio'
import ui from './canciones.module.css'

export type Segmento = 'todas' | 'favoritas' | 'domingo'
export interface CancionLista { id: string; nombre: string; artista?: string | null; tono_original?: string | null; bpm?: number | null }

const OPCIONES: { valor: Segmento; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' }, { valor: 'favoritas', texto: 'Favoritas' }, { valor: 'domingo', texto: 'Del domingo' },
]

function Fila({ c, tono, favorita, onAbrir, onFavorita }: { c: CancionLista; tono: string | null; favorita: boolean; onAbrir: () => void; onFavorita: () => void }) {
  return (
    <li className={ui.fila}>
      <button type="button" className={ui.abrir} onClick={onAbrir} aria-label={`Abrir ${c.nombre}`}>
        <span className={ui.txt}><span className={ui.nombre}>{c.nombre}</span>{c.artista ? <span className={ui.artista}>{c.artista}</span> : null}</span>
        {/* Dos columnas de ancho fijo, siempre presentes (vacías si falta el dato): las notas quedan en la misma línea vertical en todas las filas. */}
        <span className={ui.tono}>{tono ?? ''}</span>
        <span className={ui.bpm}>{c.bpm ? `${c.bpm} bpm` : ''}</span>
      </button>
      <button type="button" className={ui.fav} aria-pressed={favorita} aria-label={`${favorita ? 'Quitar de favoritas' : 'Marcar como favorita'}: ${c.nombre}`} onClick={onFavorita}>
        <Heart size={20} aria-hidden="true" fill={favorita ? 'currentColor' : 'none'} />
      </button>
    </li>
  )
}

export default function Canciones<C extends CancionLista>({ catalogo, favoritas, delDomingo, segmento, onSegmento, texto, onTexto, onAbrir, onFavorita }: {
  catalogo: C[]
  favoritas: Set<string>
  delDomingo: DelDomingo<C> | null
  segmento: Segmento
  onSegmento: (s: Segmento) => void
  texto: string
  onTexto: (t: string) => void
  onAbrir: (c: C) => void
  onFavorita: (id: string) => void
}) {
  const filas: { c: C; tono: string | null }[] =
    segmento === 'todas' ? catalogo.map(c => ({ c, tono: c.tono_original ?? null }))
    : segmento === 'favoritas' ? catalogo.filter(c => favoritas.has(c.id)).map(c => ({ c, tono: c.tono_original ?? null }))
    : (delDomingo?.items ?? []).map(i => ({ c: i.cancion, tono: i.tono }))
  const visibles = texto.trim() ? filas.filter(f => filtrarCanciones([f.c], texto).length > 0) : filas

  const vacio = visibles.length > 0 ? null
    : texto.trim() ? 'Ninguna canción coincide con tu búsqueda.'
    : segmento === 'favoritas' ? 'Aún no tienes favoritas. Marca el corazón de una canción para guardarla aquí.'
    : segmento === 'domingo' ? (delDomingo ? 'Aún no hay canciones en el orden de ese servicio.' : 'Cuando confirmes tu asistencia a un servicio, aquí verás sus canciones.')
    : 'Todavía no hay canciones en el repertorio.'

  return (
    <div className={ui.pantalla}>
      <h1 className={ui.titulo}>Canciones</h1>

      <div className={ui.buscar}>
        <Search size={18} aria-hidden="true" className={ui.lupa} />
        <input type="search" className={ui.campo} value={texto} onChange={e => onTexto(e.target.value)} placeholder="Buscar por título o artista" aria-label="Buscar por título o artista"
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
      </div>

      <Segmentado opciones={OPCIONES} valor={segmento} onCambio={onSegmento} etiqueta="Qué canciones ver" />

      {segmento === 'domingo' && delDomingo && (
        <p className={ui.contexto}>{fechaConDia(delDomingo.fecha)}{delDomingo.equipo ? ` · ${delDomingo.equipo}` : ''}</p>
      )}
      <p className={ui.cuenta} role="status" aria-live="polite">{visibles.length === 1 ? '1 canción' : `${visibles.length} canciones`}</p>

      {vacio ? <p className={ui.vacio}>{vacio}</p> : (
        <ul className={ui.lista}>
          {visibles.map(f => <Fila key={f.c.id} c={f.c} tono={f.tono} favorita={favoritas.has(f.c.id)} onAbrir={() => onAbrir(f.c)} onFavorita={() => onFavorita(f.c.id)} />)}
        </ul>
      )}
    </div>
  )
}
