/* ════════════════════════════════════════════════════════════════════════
   chords.ts — transposición y notación. Funciones puras, sin dependencias.

   ESTO NO SE REESCRIBE. Es la parte con más casos borde de toda la app y
   ya están cubiertos. Si algo falla, agrega un caso al final del archivo
   y avisa; no reimplementes la lógica.
   ════════════════════════════════════════════════════════════════════════ */

export type Notation = 'american' | 'latin' | 'number' | 'roman';

const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const LATIN: Record<string,string> = {
  C:'Do', 'C#':'Do#', Db:'Reb', D:'Re', 'D#':'Re#', Eb:'Mib', E:'Mi', F:'Fa',
  'F#':'Fa#', Gb:'Solb', G:'Sol', 'G#':'Sol#', Ab:'Lab', A:'La', 'A#':'La#',
  Bb:'Sib', B:'Si',
};
/* tonalidades que se escriben con bemoles */
const FLAT_KEYS = new Set(['F','Bb','Eb','Ab','Db','Gb','Dm','Gm','Cm','Fm','Bbm','Ebm']);

const ROMAN = ['I','bII','II','bIII','III','IV','bV','V','bVI','VI','bVII','VII'];
const ARABIC = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'];

export type ParsedChord = {
  root: string;        // "C#"
  quality: string;     // "m", "maj7", "sus2", "" …
  bass?: string;       // "E" en C#/E
};

/* Acepta A, Am, A9, Asus2, Amaj7, A/C#, C#m7b5… */
const RE = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

export function parseChord(raw: string): ParsedChord | null {
  const m = RE.exec(raw.trim().replace(/♯/g,'#').replace(/♭/g,'b'));
  if (!m) return null;
  return { root: m[1], quality: m[2] ?? '', bass: m[3] };
}

function indexOf(note: string): number {
  const i = SHARP.indexOf(note);
  return i >= 0 ? i : FLAT.indexOf(note);
}

function spell(index: number, useFlats: boolean): string {
  return (useFlats ? FLAT : SHARP)[((index % 12) + 12) % 12];
}

/** Transpone un acorde N semitonos. `toKey` decide sostenidos o bemoles. */
export function transpose(raw: string, semitones: number, toKey: string): string {
  const c = parseChord(raw);
  if (!c) return raw;
  const flats = FLAT_KEYS.has(toKey);
  const root = spell(indexOf(c.root) + semitones, flats);
  const bass = c.bass ? spell(indexOf(c.bass) + semitones, flats) : undefined;
  return root + c.quality + (bass ? '/' + bass : '');
}

/** Semitonos entre dos tonalidades. Ignora el sufijo m: Am y A son lo mismo acá. */
export function interval(fromKey: string, toKey: string): number {
  const a = indexOf(fromKey.replace(/m$/,''));
  const b = indexOf(toKey.replace(/m$/,''));
  return ((b - a) % 12 + 12) % 12;
}

/* ── grados ──
   OJO: se calculan contra la TÓNICA MAYOR. Si la canción está en E pero
   empieza en C#m (su relativo menor), C#m es 6m, no 1m. Ese es el error
   clásico. La tonalidad declarada de la canción ya es la mayor (E).       */
function degree(raw: string, songKey: string, roman: boolean): string {
  const c = parseChord(raw);
  if (!c) return raw;
  const tonic = indexOf(songKey.replace(/m$/,''));
  const step = ((indexOf(c.root) - tonic) % 12 + 12) % 12;
  const isMinor = /^m(?!aj)/.test(c.quality);

  let base: string;
  if (roman) {
    base = ROMAN[step];
    /* mayúscula = mayor, minúscula = menor. Es la convención y lleva
       información que los números no llevan. */
    if (isMinor) base = base.toLowerCase();
  } else {
    base = ARABIC[step];
    if (isMinor) base += 'm';
  }

  /* extensiones entre paréntesis: A9 → 1(9). Los sus van pegados: 4sus2. */
  const rest = c.quality.replace(/^m(?!aj)/, '');
  const ext = rest && !/^sus/.test(rest) ? `(${rest})` : rest;

  const bass = c.bass
    ? '/' + (roman
        ? ROMAN[((indexOf(c.bass) - tonic) % 12 + 12) % 12]
        : ARABIC[((indexOf(c.bass) - tonic) % 12 + 12) % 12])
    : '';

  return base + ext + bass;
}

/** Cómo se escribe un acorde según la notación elegida. */
export function render(raw: string, songKey: string, n: Notation): string {
  if (n === 'number') return degree(raw, songKey, false);
  if (n === 'roman')  return degree(raw, songKey, true);
  if (n === 'latin') {
    const c = parseChord(raw);
    if (!c) return raw;
    const root = LATIN[c.root] ?? c.root;
    const bass = c.bass ? '/' + (LATIN[c.bass] ?? c.bass) : '';
    return root + c.quality + bass;
  }
  return raw.replace(/#/g,'♯').replace(/b(?![a-z])/g,'♭');
}

/** En grados el chart no depende del tono: transponer no tiene efecto. */
export function isRelative(n: Notation): boolean {
  return n === 'number' || n === 'roman';
}

/* ════════════════════════════════════════════════════════════════════════
   CASOS VERIFICADOS — si tocas algo, estos tienen que seguir dando igual.

   transpose('A/C#', 2, 'B')            → 'B/D#'
   transpose('F#m7', 1, 'G')            → 'Gm7'
   transpose('Bb', 2, 'C')              → 'C'
   transpose('D', -2, 'C')              → 'C'
   transpose('Dsus2', 5, 'G')           → 'Gsus2'

   render('C#m', 'E', 'number')         → '6m'      (relativo menor, NO 1m)
   render('B/D#', 'E', 'number')        → '5/7'
   render('F#',  'E', 'number')         → '2'       (mayor prestado, NO 2m)
   render('F#m', 'E', 'number')         → '2m'
   render('A9',  'A', 'number')         → '1(9)'
   render('Dsus2','A','number')         → '4sus2'
   render('C#m', 'E', 'roman')          → 'vi'
   render('F#',  'E', 'roman')          → 'II'
   render('A/C#','A','latin')           → 'La/Do#'
   ════════════════════════════════════════════════════════════════════════ */
