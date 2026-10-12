// Preferencias de lectura de la letra («Aa»): fuente y tamaño, por persona, en members.chart_prefs (punto 55).
// Fuente ÚNICA de las opciones: las usan la administración (CancionesPanel), el portal (CancionPortal) y la ruta
// /api/portal/preferencias, que valida contra esta lista y nunca guarda un valor suelto. Sin acceso a datos, sin 'server-only'.
import type { ChartPrefs } from './types'

export const FONT_OPTIONS = [
  { f: 'Arial, Helvetica, sans-serif', label: 'Arial', sub: 'Como el PDF original' },
  { f: "Georgia, 'Times New Roman', serif", label: 'Georgia', sub: 'Serif, más literaria' },
  { f: '-apple-system, system-ui, sans-serif', label: 'Sistema', sub: 'La de la app' },
  { f: "ui-monospace, 'SF Mono', Menlo, monospace", label: 'Mono', sub: 'Ancho fijo' },
] as const

export const SIZE_STEPS = [0.875, 1, 1.1875, 1.375]

export const DEFAULT_LYRIC_FONT: string = FONT_OPTIONS[0].f
export const DEFAULT_LYRIC_SIZE = 1

/** Lo que el portal lee y escribe. El resto de chart_prefs (modo escenario, acordes...) es de la administración y no se toca. */
export interface LyricPrefs { fontFamily: string; textScale: number; lineHeightWide: boolean }

export const DEFAULT_LYRIC_PREFS: LyricPrefs = { fontFamily: DEFAULT_LYRIC_FONT, textScale: DEFAULT_LYRIC_SIZE, lineHeightWide: false }

/** chart_prefs crudo (jsonb de la base, puede venir null o con valores viejos) → preferencias válidas; lo desconocido vuelve al valor por defecto. */
export function lyricPrefsFrom(chart: ChartPrefs | null | undefined): LyricPrefs {
  const f = typeof chart?.fontFamily === 'string' && FONT_OPTIONS.some(o => o.f === chart.fontFamily) ? chart.fontFamily : DEFAULT_LYRIC_FONT
  const s = typeof chart?.textScale === 'number' && SIZE_STEPS.includes(chart.textScale) ? chart.textScale : DEFAULT_LYRIC_SIZE
  return { fontFamily: f, textScale: s, lineHeightWide: chart?.lineHeightWide === true }
}

/** Valida el cuerpo de un PATCH del portal: solo fuente y/o tamaño de la lista. null = no válido (nada vacío, nada de más). */
export function parseLyricPrefsPatch(body: unknown): { fontFamily?: string; textScale?: number } | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const out: { fontFamily?: string; textScale?: number } = {}
  if ('fontFamily' in b) {
    if (typeof b.fontFamily !== 'string' || !FONT_OPTIONS.some(o => o.f === b.fontFamily)) return null
    out.fontFamily = b.fontFamily
  }
  if ('textScale' in b) {
    if (typeof b.textScale !== 'number' || !SIZE_STEPS.includes(b.textScale)) return null
    out.textScale = b.textScale
  }
  if (Object.keys(b).some(k => k !== 'fontFamily' && k !== 'textScale')) return null
  return Object.keys(out).length ? out : null
}
