/* ════════════════════════════════════════════════════════════════════════
   SongChart.tsx — vista de canción: chart, transposición, notación y
   editor de estructura por servicio.
   ORIGEN: docs/ejemplo-nadie-como-el-senor.html + docs/mockup-cancion-musico.html

   TRAMPAS QUE YA ESTÁN RESUELTAS — no las reintroduzcas:
   1. white-space:pre va en .anc-lyric, NUNCA en .anc-line. Si va en la
      línea, la indentación del JSX entre los <span> de acorde se renderiza
      como saltos reales y aparecen renglones vacíos bajo el acorde.
   2. La transposición y los grados salen de lib/chords.ts. No reimplementar.
   3. El arreglo del servicio y el de la canción son datos distintos.
      Guardar el override en el servicio; nunca pisar el de la canción.
   4. Solo el líder del equipo de ese servicio edita la estructura. No es
      "admin de la organización": el dato es team_members.is_leader.
   ════════════════════════════════════════════════════════════════════════ */
'use client';

import { useMemo, useRef, useState } from 'react';
import { MoreHorizontal, Paperclip, Settings2 } from 'lucide-react';
import { interval, isRelative, render, transpose, type Notation } from '@/lib/chords';

/* ── datos ── */

/* Segmentos, no offset en píxeles: la letra se renderiza en SF Pro (no
   monoespaciada), así que un acorde posicionado por coordenada se
   desalinea con cualquier cambio de fuente/tamaño/idioma. Con segmentos
   el acorde va pegado a su sílaba y queda bien siempre — ver
   INSTRUCCIONES-canciones-2.md. */
export type Segment = { chord?: string; text: string };
export type ChartLine =
  | { kind: 'lyric'; segments: Segment[]; lang?: 'en' | 'es' }
  | { kind: 'bars'; bars: string };                        // "C#m / B/D# / | E / F#m / |"

export type SectionVariant = { id: string; label: string; lines: ChartLine[] };

export type Section = {
  id: string;
  code: string;          // "V1", "C", "P"
  name: string;          // "Estrofa 1"
  performanceNote?: string;
  variants: SectionVariant[];
};

export type ArrangementItem = { uid: string; sectionId: string; label: string; repeat: number };

export type SongChartProps = {
  title: string;
  originalTitle?: string;
  artist: string;
  songKey: string;             // tonalidad declarada, siempre la MAYOR
  bpm: number;
  meter: string;
  leadName?: string;
  serviceLabel?: string;       // "Domingo 13 de Septiembre"
  serviceKey?: string;         // tono fijado por el director para ese domingo
  attachmentsCount: number;
  ccli?: string;
  copyright?: string;

  sections: Section[];
  arrangement: ArrangementItem[];
  isArrangementModified: boolean;
  canEditArrangement: boolean;      // team_members.is_leader del equipo del servicio
  onArrangementChange: (next: ArrangementItem[]) => void;
  onArrangementRevert: () => void;

  onAttachments: () => void;
  onPreferences: () => void;
};

export function SongChart(p: SongChartProps) {
  const [notation, setNotation] = useState<Notation>('american');
  const [viewKey, setViewKey] = useState(p.serviceKey ?? p.songKey);
  const [lang, setLang] = useState<'en' | 'es' | 'both'>('es');
  const [variant, setVariant] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [here, setHere] = useState<string | null>(null);
  const dragged = useRef<number | null>(null);

  const semis = useMemo(() => interval(p.songKey, viewKey), [p.songKey, viewKey]);
  const relative = isRelative(notation);

  /* en grados el chart no depende del tono: transponer no tiene efecto */
  const show = (raw: string) =>
    relative ? render(raw, p.songKey, notation)
             : render(transpose(raw, semis, viewKey), viewKey, notation);

  const goTo = (sectionId: string) => {
    const el = document.getElementById(`sec-${sectionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('anc-sec--flash');
    void el.offsetWidth;                       // reinicia la animación
    el.classList.add('anc-sec--flash');
    setHere(sectionId);
  };

  const move = (from: number, to: number) => {
    const next = [...p.arrangement];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    p.onArrangementChange(next);
  };

  return (
    <>
      <div className="anc-chartBar">
        <button
          className={`anc-tool${relative ? ' anc-tool--muted' : ''}`}
          onClick={() => !relative && setViewKey(viewKey)}
        >
          {relative ? <>Grados <small>· relativo</small></>
                    : <>{viewKey} <small>· orig. {p.songKey}</small></>}
        </button>

        <button className="anc-tool" onClick={p.onAttachments} aria-label="Adjuntos">
          <Paperclip size={13} />
          {p.attachmentsCount > 0 && <span className="anc-badge">{p.attachmentsCount}</span>}
        </button>

        <button className="anc-tool" onClick={p.onPreferences} aria-label="Preferencias">
          <Settings2 size={13} />
        </button>

        <span className="anc-spacer" />

        <div className="anc-seg">
          {([['american','A B C'],['number','1 4 5'],['roman','I IV V']] as const).map(([n,l]) => (
            <button key={n} aria-pressed={notation === n} onClick={() => setNotation(n)}>{l}</button>
          ))}
        </div>
      </div>

      <h1 className="anc-hero" style={{ marginBottom: 4 }}>{p.title}</h1>
      {p.originalTitle && <p className="anc-sub">{p.originalTitle} · {p.artist}</p>}
      <p className="anc-songMeta" style={{ marginBottom: 18 }}>
        <b>Tono {p.songKey}</b><i /> {p.bpm} BPM<i /> {p.meter}
        {p.leadName && <><i /> Lead: {p.leadName}</>}
      </p>

      {/* ═══ ESTRUCTURA ═══ */}
      <div className="anc-arrBox">
        <div className="anc-arrHead">
          <span className="anc-k">ESTRUCTURA</span>
          {!p.isArrangementModified && <span className="anc-origTag">Original de la canción</span>}
          {p.isArrangementModified && (
            p.canEditArrangement
              ? <span className="anc-modTag">Modificada para este domingo</span>
              : <span className="anc-modTag anc-modTag--member">Estructura especial para este domingo</span>
          )}
          <span className="anc-spacer" />
          {p.canEditArrangement && p.isArrangementModified && (
            <button className="anc-btn anc-btn--quiet" onClick={p.onArrangementRevert}>
              Volver a la original
            </button>
          )}
          {p.canEditArrangement && (
            <button className="anc-btn anc-btn--quiet" onClick={() => setEditing(!editing)}>
              {editing ? 'Listo' : 'Editar estructura'}
            </button>
          )}
        </div>

        <div className={`anc-arr${editing ? ' anc-arr--editing' : ''}`}>
          {p.arrangement.map((it, i) => (
            <button
              key={it.uid}
              className={`anc-pill${here === it.sectionId && !editing ? ' anc-pill--here' : ''}`}
              draggable={editing}
              onClick={() => { if (!editing) goTo(it.sectionId); }}
              onDragStart={() => { dragged.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragged.current !== null && dragged.current !== i) move(dragged.current, i);
                dragged.current = null;
              }}
            >
              <span className="anc-grip" aria-hidden>⣿</span>
              {it.label}
              {it.repeat > 1 && (
                <span
                  className="anc-x"
                  onClick={(e) => {
                    if (!editing) return;
                    e.stopPropagation();
                    const next = [...p.arrangement];
                    next[i] = { ...it, repeat: (it.repeat % 4) + 1 };
                    p.onArrangementChange(next);
                  }}
                >×{it.repeat}</span>
              )}
              <span
                className="anc-del"
                onClick={(e) => {
                  if (!editing) return;
                  e.stopPropagation();
                  p.onArrangementChange(p.arrangement.filter((x) => x.uid !== it.uid));
                }}
              >×</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CHART ═══ */}
      {p.sections.map((sec) => {
        const active = sec.variants.find((v) => v.id === variant[sec.id]) ?? sec.variants[0];
        return (
          <section key={sec.id} id={`sec-${sec.id}`} className="anc-sec">
            <div className="anc-secHead">
              <span className="anc-secName">{sec.code} <span className="anc-n">{sec.name}</span></span>
              {sec.variants.length > 1 && (
                <span className="anc-variants">
                  {sec.variants.map((v) => (
                    <button
                      key={v.id}
                      aria-pressed={v.id === active.id}
                      onClick={() => setVariant({ ...variant, [sec.id]: v.id })}
                    >{v.label}</button>
                  ))}
                </span>
              )}
              {sec.performanceNote && <span className="anc-perfNote">{sec.performanceNote}</span>}
            </div>

            {active.lines.map((line, i) => {
              if (line.kind === 'bars') {
                return <div key={i} className="anc-bars">{line.bars}</div>;
              }
              if (lang !== 'both' && line.lang && line.lang !== lang) return null;
              return (
                <div key={i} className="anc-line">
                  {line.segments.map((seg, j) => (
                    <span key={j} className="anc-seg2">
                      {seg.chord && <span className="anc-chord">{show(seg.chord)}</span>}
                      <span className="anc-lyric">{seg.text}</span>
                    </span>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}

      {(p.ccli || p.copyright) && (
        <p className="anc-legal">
          {p.ccli && <><b>CCLI {p.ccli}</b> · </>}{p.copyright}
        </p>
      )}
    </>
  );
}
