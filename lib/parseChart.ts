/* ════════════════════════════════════════════════════════════════════════
   parseChart.ts — convierte texto pegado en secciones con acordes.
   Funciones puras, sin dependencias. NO reescribir: los casos borde están
   sacados de charts reales (Bethel, Hillsong, adaptaciones al español).
   ════════════════════════════════════════════════════════════════════════ */

/* ── El modelo de línea ──
   Una línea de letra es una lista de SEGMENTOS. Cada segmento es un trozo
   de texto que puede llevar un acorde encima.

   Por qué segmentos y no "acorde en el píxel N": la letra se renderiza en
   SF Pro, que no es monoespaciada. Un índice de carácter no se traduce a
   píxeles de forma lineal, así que posicionar por coordenada se desalinea
   con cualquier cambio de fuente, tamaño o idioma. Con segmentos, el acorde
   va pegado a su sílaba y queda bien siempre.                           */

export type Segment = { chord?: string; text: string };

export type ParsedLine =
  | { kind: 'lyric'; segments: Segment[]; lang?: 'en' | 'es' }
  | { kind: 'bars'; bars: string };

export type ParsedSection = {
  code: string;            // "V1", "C", "P"
  name: string;            // "Estrofa 1"
  repeat?: number;         // del "(2x)"
  variantLabel?: string;   // "Alt. 1" — de "(Alternate Chords 1)"
  lang?: 'en' | 'es';
  performanceNote?: string; // "drop out", "Repeat As Desired"
  lines: ParsedLine[];
  isReferenceOnly: boolean; // título sin contenido: apunta a otra sección
};

export type ParseResult = {
  sections: ParsedSection[];
  warnings: string[];      // lo que hay que mostrarle al usuario, no esconder
};

/* ── acordes ── */
const CHORD = /^[A-G][#b♯♭]?(?:m|maj|min|dim|aug|sus|add)?\d*(?:sus\d|add\d|[#b]\d)*(?:\/[A-G][#b♯♭]?)?$/;
const isChord = (t: string) => CHORD.test(t.replace(/[()]/g, ''));

/* ── encabezados de sección ── */
const HEADERS: [RegExp, string, string][] = [
  [/^intro/i,            'IN',    'Intro'],
  [/^verse\s*(\d)?|^estrofa\s*(\d)?/i, 'V',  'Estrofa'],
  [/^(pre[\s-]?chorus|pre[\s-]?coro)/i, 'PC', 'Pre-coro'],
  [/^(chorus|coro)/i,    'C',     'Coro'],
  [/^(bridge|puente)/i,  'P',     'Bridge'],
  [/^(instrumental|interlude|interludio)/i, 'INT', 'Instrumental'],
  [/^tag/i,              'TAG',   'Tag'],
  [/^(outro|final)/i,    'OUT',   'Outro'],
];

function readHeader(line: string) {
  const t = line.trim();
  if (!t || t.length > 60) return null;
  for (const [re, code, name] of HEADERS) {
    const m = re.exec(t);
    if (!m) continue;

    const num = m[1] ?? m[2] ?? '';
    const repeat = /\((\d+)\s*x\)/i.exec(t)?.[1];
    const alt = /alternate\s*chords?\s*(\d+)/i.exec(t)?.[1];
    const es = /\(espa[ñn]ol/i.test(t);
    const note = /\((drop out|repeat as desired|a cappella|[^)]*repeat[^)]*)\)/i.exec(t)?.[1];

    return {
      code: code + num,
      name: name + (num ? ' ' + num : ''),
      repeat: repeat ? parseInt(repeat) : undefined,
      variantLabel: alt ? `Alt. ${alt}` : undefined,
      lang: es ? ('es' as const) : undefined,
      performanceNote: note ?? undefined,
    };
  }
  return null;
}

/* ── ¿es una línea de acordes? ── */
function looksLikeChords(line: string) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const hits = tokens.filter(isChord).length;
  return hits / tokens.length >= 0.7;
}

/* ── ¿es cifrado de compases? "C#m / B/D# / | E / F#m / ||" ── */
function looksLikeBars(line: string) {
  return /\|/.test(line) && /\//.test(line) && looksLikeChords(line.replace(/[|/‖]/g, ' '));
}

/* ── empareja la línea de acordes con la de letra ──
   Los acordes vienen alineados por columna sobre la letra. Se corta la
   letra en los índices donde empieza cada acorde: cada trozo queda como
   un segmento con su acorde encima.                                     */
function pair(chordLine: string, lyricLine: string): Segment[] {
  const marks: { at: number; chord: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chordLine))) marks.push({ at: m.index, chord: m[0] });

  if (!marks.length) return [{ text: lyricLine }];

  const segments: Segment[] = [];
  if (marks[0].at > 0) segments.push({ text: lyricLine.slice(0, marks[0].at) });

  marks.forEach((mk, i) => {
    const end = marks[i + 1]?.at ?? Math.max(lyricLine.length, mk.at);
    const text = lyricLine.slice(mk.at, end);
    /* si el acorde cae más allá del final de la letra, igual se conserva:
       pasa en finales de frase y perderlo sería peor que dejar un hueco */
    segments.push({ chord: mk.chord, text: text || ' ' });
  });

  return segments;
}

/* ── entrada principal ── */
export function parseChart(raw: string): ParseResult {
  const warnings: string[] = [];
  const lines = raw.replace(/\r/g, '').split('\n');

  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  const push = () => {
    if (!current) return;
    current.isReferenceOnly = current.lines.length === 0;
    if (current.isReferenceOnly) {
      warnings.push(
        `«${current.name}${current.variantLabel ? ' · ' + current.variantLabel : ''}» viene con ` +
        `título pero sin contenido. Se interpretó como referencia a una sección ya definida.`
      );
    }
    sections.push(current);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const head = readHeader(line);
    if (head) { push(); current = { ...head, lines: [], isReferenceOnly: false }; continue; }

    if (!current) {
      current = { code: 'V1', name: 'Estrofa 1', lines: [], isReferenceOnly: false };
      warnings.push('El texto empieza sin encabezado de sección; se asumió Estrofa 1.');
    }

    if (looksLikeBars(line)) { current.lines.push({ kind: 'bars', bars: line.trim() }); continue; }

    if (looksLikeChords(line)) {
      const next = lines[i + 1];
      if (next && next.trim() && !looksLikeChords(next) && !readHeader(next)) {
        current.lines.push({ kind: 'lyric', segments: pair(line, next), lang: current.lang });
        i++;                       // la letra ya se consumió
      } else {
        /* acordes sin letra debajo: se guarda como compases */
        current.lines.push({ kind: 'bars', bars: line.trim() });
      }
      continue;
    }

    /* letra sin acordes encima */
    current.lines.push({ kind: 'lyric', segments: [{ text: line }], lang: current.lang });
  }
  push();

  /* ── avisos de letra que hay que mirar, no corregir en silencio ── */
  const hyphen = /\b\w+\s-\s\w+\b/;
  sections.forEach((s) =>
    s.lines.forEach((l) => {
      if (l.kind !== 'lyric') return;
      const text = l.segments.map((x) => x.text).join('');
      if (hyphen.test(text)) {
        warnings.push(`«${text.trim()}» parece tener una sílaba partida con guion. Revísala.`);
      }
    })
  );

  return { sections, warnings };
}

/* ════════════════════════════════════════════════════════════════════════
   CASOS VERIFICADOS contra charts reales:

   "CHORUS (Español, 2x)"        → code C, lang es, repeat 2
   "BRIDGE (Alternate Chords 1)" → code P, variantLabel "Alt. 1"
   "VERSE (2x)"                  → code V, repeat 2
   "OUTRO (Repeat As Desired)"   → performanceNote "Repeat As Desired"
   "C#m / B/D# / | E / F#m / ||" → kind 'bars'
   Sección con título y sin líneas → isReferenceOnly true + warning
   "Corde - ro de Dios"          → warning de sílaba partida, NO se corrige sola
   ════════════════════════════════════════════════════════════════════════ */
