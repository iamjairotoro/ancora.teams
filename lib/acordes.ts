/* ════════════════════════════════════════════════════════════════════════
   acordes.ts — acordes guardados como GRADOS (etapa B). Funciones puras, sin base ni servidor.

   Formato 2 (nuevo): cada acorde es {g: 1–7, alt?: 'b'|'#', cal: calidad, bajo?: {g, alt?}}, medido contra la TÓNICA MAYOR de la canción.
   Una tonalidad menor («C#m») se muestra como se escribió y se calcula contra su relativo mayor (E): C#m es 6m, no 1m.
   Con grados guardados, transponer = escribir el mismo grado en otro tono; no hay que reescribir la canción.
   Formato 1 (el de hoy): el acorde es un texto absoluto ("C#m", "B/D#"), en `chord`. Los dos se leen con leerLinea.
   La posición de un acorde es el ORDEN del segmento (no un índice de carácter): ver lib/parseChart.ts.
   La lógica de letras (sostenidos/bemoles, bajos) sigue siendo la de lib/chords.ts; aquí solo se reutilizan indexOf, spell y render.
   ════════════════════════════════════════════════════════════════════════ */
import { indexOf, spell, parseChord, render } from './chords'

export type Alteracion = 'b' | '#'
export type Grado = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Acorde = { g: Grado; alt?: Alteracion; cal: string; bajo?: { g: Grado; alt?: Alteracion } }
export type NotacionAcordes = 'american' | 'number'
export const NOTACIONES_ACORDES: readonly NotacionAcordes[] = ['american', 'number']

export type SegmentoLetra = { text: string; chord?: string }
export type SegmentoGrados = { text: string; acorde?: Acorde; literal?: string }
export type ItemCompas = { acorde: Acorde } | { texto: string }
export type LineaF1 = { kind: 'lyric'; segments: SegmentoLetra[]; lang?: string } | { kind: 'bars'; bars: string }
export type LineaF2 = { kind: 'lyric'; segments: SegmentoGrados[]; lang?: string } | { kind: 'bars'; items: ItemCompas[] }
export type Formato = 1 | 2

const SEMITONOS_MAYOR = [0, 2, 4, 5, 7, 9, 11]
const PASO_A_GRADO: ReadonlyArray<readonly [Grado, Alteracion?]> = [[1], [2, 'b'], [2], [3, 'b'], [3], [4], [5, 'b'], [5], [6, 'b'], [6], [7, 'b'], [7]]
const ENARMONICAS: Record<string, string> = { 'E#': 'F', 'B#': 'C', Cb: 'B', Fb: 'E' }
export const CALIDAD_VALIDA = /^(?:m(?!aj)|maj|min|M|dim|aug|sus|add|no|omit|[0-9]|[#b+\-°ø∆()])*$/
const TONO = /^([A-G][#b]?)(m?)$/

/** «c#m», «C♯m», « Bb » → «C#m», «Bb». null si no es una tonalidad válida (A–G, # o b, m opcional). */
export function normalizarTono(t: unknown): string | null {
  if (typeof t !== 'string') return null
  const s = t.trim().replace(/♯/g, '#').replace(/♭/g, 'b')
  if (!s) return null
  const c = s[0].toUpperCase() + s.slice(1)
  return TONO.test(c) ? c : null
}

/** ¿Esta tonalidad se escribe con bemoles? Mismo criterio que FLAT_KEYS de chords.ts, extendido a cualquier tono escrito con b (Abm, Dbm…). */
function usaBemoles(tono: string): boolean {
  return tono[1] === 'b' || tono === 'F' || tono === 'Dm' || tono === 'Gm' || tono === 'Cm' || tono === 'Fm'
}

function indiceTonica(tono: string): number | null {
  const t = normalizarTono(tono)
  if (!t) return null
  const m = TONO.exec(t) as RegExpExecArray
  const i = indexOf(m[1])
  return i < 0 ? null : (m[2] ? i + 3 : i) % 12
}

/** La tónica mayor contra la que se miden los grados: «C#m» → «E», «Abm» → «B», «Am» → «C», «G» → «G». null si el tono no es válido. */
export function tonicaMayor(tono: string): string | null {
  const t = normalizarTono(tono)
  const i = t ? indiceTonica(t) : null
  return t && i !== null ? spell(i, usaBemoles(t)) : null
}

function raizNormal(nota: string): number {
  return indexOf(ENARMONICAS[nota] ?? nota)
}

function paso(nota: string, tonica: number): { g: Grado; alt?: Alteracion } | null {
  const i = raizNormal(nota)
  if (i < 0) return null
  const [g, alt] = PASO_A_GRADO[(((i - tonica) % 12) + 12) % 12]
  return alt ? { g, alt } : { g }
}

/** «C#m» en tono E → {g:6, cal:'m'}. null si no es un acorde que sepamos leer (N.C., x2, «Amen»…): ese texto se queda tal cual. */
export function aGrado(letra: string, tono: string): Acorde | null {
  const tonica = indiceTonica(tono)
  if (tonica === null || typeof letra !== 'string') return null
  const c = parseChord(letra)
  if (!c || !CALIDAD_VALIDA.test(c.quality)) return null
  const raiz = paso(c.root, tonica)
  if (!raiz) return null
  const a: Acorde = { ...raiz, cal: c.quality }
  if (c.bass) { const b = paso(c.bass, tonica); if (!b) return null; a.bajo = b }
  return a
}

function nota(g: Grado, alt: Alteracion | undefined, tonica: number, bemoles: boolean): string {
  return spell(tonica + SEMITONOS_MAYOR[g - 1] + (alt === '#' ? 1 : alt === 'b' ? -1 : 0), bemoles)
}

/** {g:6, cal:'m'} en tono E → «C#m». Los sostenidos o bemoles los decide el tono. */
export function aLetra(a: Acorde, tono: string): string {
  const t = normalizarTono(tono), tonica = t ? indiceTonica(t) : null
  if (!t || tonica === null) return ''
  const b = usaBemoles(t)
  return nota(a.g, a.alt, tonica, b) + a.cal + (a.bajo ? '/' + nota(a.bajo.g, a.bajo.alt, tonica, b) : '')
}

const esMenor = (cal: string) => /^m(?!aj)/.test(cal)
const marca = (g: Grado, alt?: Alteracion) => (alt ?? '') + g

/** Cómo se escribe: Americano (C#m, B/D#, con ♯ y ♭) o Números (6m, 5/7, 1(9), 4sus2: igual que chords.ts). Números no depende del tono. */
export function mostrarAcorde(a: Acorde, tono: string, notacion: NotacionAcordes): string {
  if (notacion === 'number') {
    const resto = a.cal.replace(/^m(?!aj)/, '')
    const ext = resto && !/^sus/.test(resto) ? `(${resto})` : resto
    return marca(a.g, a.alt) + (esMenor(a.cal) ? 'm' : '') + ext + (a.bajo ? '/' + marca(a.bajo.g, a.bajo.alt) : '')
  }
  return render(aLetra(a, tono), tono, 'american')
}

/** Los 7 acordes de la escala (I ii iii IV V vi vii°) para la paleta del editor, con su letra en este tono. `principal` marca el acorde del propio tono (el 1 en mayor, el 6 en menor). */
export function paleta(tono: string): { acorde: Acorde; letra: string; principal: boolean }[] {
  const t = normalizarTono(tono)
  if (!t || indiceTonica(t) === null) return []
  const principal: Grado = t.endsWith('m') ? 6 : 1
  const base: Acorde[] = [{ g: 1, cal: '' }, { g: 2, cal: 'm' }, { g: 3, cal: 'm' }, { g: 4, cal: '' }, { g: 5, cal: '' }, { g: 6, cal: 'm' }, { g: 7, cal: 'dim' }]
  return base.map(acorde => ({ acorde, letra: aLetra(acorde, t), principal: acorde.g === principal }))
}

const tokensDeCompas = (s: string) => s.trim().split(/\s+/).filter(Boolean)

/** Resultado de convertir: la línea nueva y los textos que NO se pudieron leer como acorde (se conservan tal cual en `literal`/`texto`). */
export type Conversion<T> = { resultado: T; noConvertidos: string[] }

export function convertirLinea(l: LineaF1, tono: string): Conversion<LineaF2> {
  const noConvertidos: string[] = []
  if (l.kind === 'bars') {
    const items: ItemCompas[] = tokensDeCompas(l.bars).map(tok => {
      const a = aGrado(tok, tono)
      if (a) return { acorde: a }
      if (/^[A-G]/.test(tok)) noConvertidos.push(tok)
      return { texto: tok }
    })
    return { resultado: { kind: 'bars', items }, noConvertidos }
  }
  const segments: SegmentoGrados[] = l.segments.map(s => {
    const out: SegmentoGrados = { text: s.text }
    if (s.chord) {
      const a = aGrado(s.chord, tono)
      if (a) out.acorde = a
      else { out.literal = s.chord; noConvertidos.push(s.chord) }
    }
    return out
  })
  const resultado: LineaF2 = { kind: 'lyric', segments }
  if (l.lang) resultado.lang = l.lang
  return { resultado, noConvertidos }
}

/** Camino de vuelta (para deshacer una conversión): grados → letras en ese tono. */
export function lineaAFormato1(l: LineaF2, tono: string): LineaF1 {
  if (l.kind === 'bars') return { kind: 'bars', bars: l.items.map(i => ('acorde' in i ? aLetra(i.acorde, tono) : i.texto)).join(' ') }
  const segments: SegmentoLetra[] = l.segments.map(s => {
    const out: SegmentoLetra = { text: s.text }
    const c = s.acorde ? aLetra(s.acorde, tono) : s.literal
    if (c) out.chord = c
    return out
  })
  const o: LineaF1 = { kind: 'lyric', segments }
  if (l.lang) o.lang = l.lang
  return o
}

export function convertirVariante(lines: unknown, tono: string): Conversion<LineaF2[]> | null {
  if (!Array.isArray(lines)) return null
  const out: LineaF2[] = [], malos: string[] = []
  for (const l of lines as LineaF1[]) { const c = convertirLinea(l, tono); out.push(c.resultado); malos.push(...c.noConvertidos) }
  return { resultado: out, noConvertidos: malos }
}

export type LineaParaMostrar =
  | { kind: 'lyric'; segments: { text: string; acorde?: string }[]; lang?: string }
  | { kind: 'bars'; bars: string }

/** Lector único: entiende el formato 1 (texto absoluto) y el 2 (grados). `tono` es el del servicio (o el original); `notacion` la preferencia de la persona. En formato 1 con Números se calcula contra el tono dado. */
export function leerLinea(l: LineaF1 | LineaF2, formato: Formato, tono: string, notacion: NotacionAcordes): LineaParaMostrar {
  if (formato === 2) {
    const g = l as LineaF2
    if (g.kind === 'bars') return { kind: 'bars', bars: g.items.map(i => ('acorde' in i ? mostrarAcorde(i.acorde, tono, notacion) : i.texto)).join(' ') }
    const o: LineaParaMostrar = { kind: 'lyric', segments: g.segments.map(s => ({ text: s.text, ...(s.acorde ? { acorde: mostrarAcorde(s.acorde, tono, notacion) } : s.literal ? { acorde: s.literal } : {}) })) }
    if (g.lang) o.lang = g.lang
    return o
  }
  const f = l as LineaF1
  const mayor = tonicaMayor(tono) ?? tono // chords.ts mide contra la tónica que le pasen y descarta la «m»: a «C#m» le daría 1m; aquí se le pasa el relativo mayor (E)
  const mostrar = (c: string) => render(c, mayor, notacion)
  if (f.kind === 'bars') return { kind: 'bars', bars: tokensDeCompas(f.bars).map(mostrar).join(' ') }
  const o: LineaParaMostrar = { kind: 'lyric', segments: f.segments.map(s => ({ text: s.text, ...(s.chord ? { acorde: mostrar(s.chord) } : {}) })) }
  if (f.lang) o.lang = f.lang
  return o
}
