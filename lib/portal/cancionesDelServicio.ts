// «Del domingo» (punto 54, commit 2): las canciones del orden del PRÓXIMO servicio al que la persona ya CONFIRMÓ y que aún no terminó (hora de fin en America/Santiago). El orden del servicio solo
// llega al portal cuando la convocatoria está confirmada y, sin acceso a la biblioteca, esta pantalla ni existe (el servidor lo decide). Cada fila lleva el tono del servicio (el de ese día) o,
// si no tiene, el original de la canción. Sin acceso a datos ni a servidor.
import { servicioTerminado } from '@/lib/servicioTerminado'

export interface CancionBase { id: string; nombre: string; artista?: string | null; tono_original?: string | null }
export interface BloqueDeOrden { tipo?: string | null; orden?: number | null; tono?: string | null; song_id?: string | null; song?: { id?: string; nombre?: string; artista?: string | null; tono_original?: string | null } | null }
export interface EntradaConOrden {
  service: { id: string; fecha: string; titulo?: string | null; hora_inicio?: string | null; hora_fin?: string | null }
  team?: { name: string } | null
  invitation?: { status?: string | null } | null
  setlist?: BloqueDeOrden[] | null
}
export interface FilaDelDomingo<C extends CancionBase> { cancion: C; tono: string | null }
export interface DelDomingo<C extends CancionBase> { servicioId: string; fecha: string; titulo: string | null; equipo: string | null; items: FilaDelDomingo<C>[] }

export function cancionesDelProximoServicio<C extends CancionBase>(entradas: EntradaConOrden[], catalogo: C[], ahora: Date = new Date()): DelDomingo<C> | null {
  const confirmadas = entradas
    .filter(e => e.invitation?.status === 'confirmado' && !servicioTerminado(e.service.fecha, e.service.hora_fin, ahora, e.service.hora_inicio))
    .sort((a, b) => a.service.fecha.localeCompare(b.service.fecha) || (a.service.hora_inicio || '').localeCompare(b.service.hora_inicio || ''))
  const e = confirmadas[0]
  if (!e) return null
  const porId = new Map(catalogo.map(c => [c.id, c] as [string, C]))
  const items: FilaDelDomingo<C>[] = []
  for (const b of (e.setlist || []).filter(x => x.tipo === 'cancion').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))) {
    const id = b.song_id || b.song?.id
    const cancion = (id && porId.get(id)) || (b.song?.id && b.song.nombre ? ({ id: b.song.id, nombre: b.song.nombre, artista: b.song.artista, tono_original: b.song.tono_original } as C) : null)
    if (cancion) items.push({ cancion, tono: (b.tono && b.tono.trim()) || cancion.tono_original || null })
  }
  return { servicioId: e.service.id, fecha: e.service.fecha, titulo: e.service.titulo ?? null, equipo: e.team?.name ?? null, items }
}
