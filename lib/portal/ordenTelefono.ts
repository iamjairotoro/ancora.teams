// La ficha de cada canción del Orden del servicio EN TELÉFONO (Portal-Orden-A). Lógica pura (sin datos ni servidor): de un bloque del setlist saca SOLO lo que existe — lo que falta (tono, BPM, líder, observaciones) no se muestra, sin fila vacía.
//   · tono: `service_blocks.tono` (el del bloque; sin acceso a la biblioteca no viaja).   · BPM: `songs.bpm` (solo con acceso a la biblioteca).   · líder: `service_blocks.lead_id` + `lead.nombre`.   · observaciones: `service_blocks.notas` (las del BLOQUE).
export interface BloqueOrden {
  tipo?: string; titulo?: string | null; tono?: string | null; duracion_min?: number | null; notas?: string | null
  song_id?: string | null; lead_id?: string | null; lead?: { nombre?: string | null } | null
  song?: { id?: string; nombre?: string | null; artista?: string | null; bpm?: number | string | null } | null
}
export interface FichaOrden {
  numero: number; titulo: string; artista: string | null; tono: string | null; bpm: string | null
  lider: { nombre: string; iniciales: string; yo: boolean } | null
  notas: string | null; duracion: number | null; esCancion: boolean
}

const limpio = (x: unknown): string | null => { const t = typeof x === 'string' ? x.trim() : ''; return t ? t : null }
export const iniciales = (n: string): string => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('es') || '?'

/** 72 → «72», 71.5 → «71,5» (coma decimal, como el resto de la app). */
export function textoBpm(b: unknown): string | null {
  const n = typeof b === 'number' ? b : typeof b === 'string' && b.trim() !== '' ? Number(b.replace(',', '.')) : NaN
  return Number.isFinite(n) && n > 0 ? String(Math.round(n * 10) / 10).replace('.', ',') : null
}

export function fichaOrden(it: BloqueOrden, i: number, yoId: string | null | undefined): FichaOrden {
  const esCancion = it.tipo === 'cancion' || (!it.tipo && !!it.song)      // los ensayos del enlace llegan sin `tipo`
  const nombreLider = limpio(it.lead?.nombre)
  const yo = !!yoId && it.lead_id === yoId
  return {
    numero: i + 1,
    titulo: (esCancion ? limpio(it.song?.nombre) || limpio(it.titulo) : limpio(it.titulo) || limpio(it.song?.nombre)) || '—',
    artista: esCancion ? limpio(it.song?.artista) : null,
    tono: esCancion ? limpio(it.tono) : null,
    bpm: esCancion ? textoBpm(it.song?.bpm) : null,
    lider: yo || nombreLider ? { nombre: nombreLider ?? '', iniciales: iniciales(nombreLider ?? ''), yo } : null,
    notas: limpio(it.notas),
    duracion: it.duracion_min ? it.duracion_min : null,
    esCancion,
  }
}
