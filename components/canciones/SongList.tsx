/* ════════════════════════════════════════════════════════════════════════
   SongList.tsx — Canciones (lista)
   ORIGEN: docs/mockup-canciones-lista.html. Este archivo ES el diseño.

   Sin carátulas: en una lista no ayudan a encontrar nada y compiten con el
   texto. La carátula aparece en el detalle.
   ════════════════════════════════════════════════════════════════════════ */
'use client';

import { Heart, MoreHorizontal, Search } from 'lucide-react';

export type SongFilter = 'all' | 'favorites' | 'withChords' | 'withoutChords' | 'playedThisMonth';

export type SongRow = {
  id: string;
  title: string;
  artist: string;
  key: string;                 // "A", "Dm"
  bpm: number;
  lastPlayedLabel: string | null;  // "5 jul" · null = nunca
  isFavorite: boolean;
};

export type SongListProps = {
  songs: SongRow[];
  totalCount: number;
  query: string;
  onQuery: (q: string) => void;
  filter: SongFilter;
  onFilter: (f: SongFilter) => void;
  sortLabel: string;
  onSort: () => void;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onMenu: (id: string) => void;
  onAdd: () => void;
};

const FILTERS: { id: SongFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'favorites', label: 'Favoritas' },
  { id: 'withChords', label: 'Con acordes' },
  { id: 'withoutChords', label: 'Sin acordes' },
  { id: 'playedThisMonth', label: 'Tocadas este mes' },
];

export function SongList(p: SongListProps) {
  return (
    <>
      <header className="anc-hero">
        <h1>Canciones</h1>
        <span className="anc-fact__v" style={{ color: 'var(--anc-ink-3)' }}>
          {p.totalCount} en el repertorio
        </span>
        <div className="anc-hero__acts">
          <button className="anc-btn anc-btn--accent" onClick={p.onAdd}>+ Agregar canción</button>
        </div>
      </header>

      <div className="anc-songTools">
        <label className="anc-search">
          <Search size={14} />
          <input
            value={p.query}
            onChange={(e) => p.onQuery(e.target.value)}
            placeholder="Buscar por título, artista o letra"
          />
        </label>
        <button className="anc-btn anc-btn--quiet" onClick={p.onSort}>Ordenar: {p.sortLabel}</button>
      </div>

      <div className="anc-chipRow">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className="anc-chip"
            aria-pressed={p.filter === f.id}
            onClick={() => p.onFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="anc-panel" style={{ padding: 6 }}>
        <div className="anc-songHead">
          <span style={{ flex: 1 }}>Título</span>
          <span style={{ flex: '0 0 132px' }} />
          <span style={{ flex: '0 0 34px', textAlign: 'center' }}>Tono</span>
          <span style={{ flex: '0 0 62px', textAlign: 'right' }}>BPM</span>
          <span style={{ flex: '0 0 26px' }} />
          <span style={{ flex: '0 0 24px' }} />
        </div>

        {p.songs.length === 0 ? (
          <p className="anc-empty">
            <b>Sin resultados</b>
            Prueba con otro término o cambia el filtro.
          </p>
        ) : (
          p.songs.map((s) => (
            <div key={s.id} className="anc-songRow" onClick={() => p.onOpen(s.id)}>
              <span className="anc-b">
                <span className="anc-songTitle">{s.title}</span>
                <span className="anc-songArtist">{s.artist}</span>
              </span>

              <span className={`anc-lastPlayed${s.lastPlayedLabel ? '' : ' anc-lastPlayed--never'}`}>
                {s.lastPlayedLabel ? `Tocada el ${s.lastPlayedLabel}` : 'Nunca tocada'}
              </span>

              <span className="anc-songKey">{s.key}</span>
              <span className="anc-songBpm">{s.bpm}<small> bpm</small></span>

              <button
                className="anc-fav"
                aria-pressed={s.isFavorite}
                aria-label={s.isFavorite ? 'Quitar de favoritas' : 'Marcar favorita'}
                onClick={(e) => { e.stopPropagation(); p.onToggleFavorite(s.id); }}
              >
                <Heart size={15} />
              </button>

              <button
                className="anc-rowMore"
                aria-label={`Acciones para ${s.title}`}
                onClick={(e) => { e.stopPropagation(); p.onMenu(s.id); }}
              >
                <MoreHorizontal size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
