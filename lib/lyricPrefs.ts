// Preferencias de lectura de la letra («Aa»): fuente y tamaño, por persona, en members.chart_prefs (punto 55).
// Fuente ÚNICA de las opciones: las usan la administración (CancionesPanel), el portal (CancionPortal) y la ruta
// /api/portal/preferencias, que valida contra esta lista y nunca guarda un valor suelto. Sin acceso a datos, sin 'server-only'.
import type { ChartPrefs } from './types'

/** La misma pila que el body de la app (app/globals.css). */
export const FONT_APP = "ui-rounded, -apple-system, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif"

// Las cuatro cadenas de siempre NO cambian (quien guardó una la conserva: el servidor valida contra esta lista); «La app» es la quinta y la predeterminada solo para quien nunca eligió.
export const FONT_OPTIONS = [
  { f: FONT_APP, label: 'La app', sub: 'La misma letra de la app' },
  { f: 'Arial, Helvetica, sans-serif', label: 'Arial', sub: 'Como el PDF original' },
  { f: "Georgia, 'Times New Roman', serif", label: 'Georgia', sub: 'Serif, más literaria' },
  { f: '-apple-system, system-ui, sans-serif', label: 'Sistema', sub: 'La de la app' },
  { f: "ui-monospace, 'SF Mono', Menlo, monospace", label: 'Mono', sub: 'Ancho fijo' },
] as const

/** «Sistema» (la cuarta cadena de siempre) se guarda y se valida igual, pero en teléfono ya no se ofrece: quien la tiene guardada ve «La app» (la lectura se mapea; su valor guardado no se reescribe). */
export const FONT_SISTEMA: string = FONT_OPTIONS.find(o => o.label === 'Sistema')!.f
/** Las fuentes que ofrece la ventana de Tipografía del teléfono: La app, Arial, Georgia y Mono. */
export const FONT_OPTIONS_TELEFONO = FONT_OPTIONS.filter(o => o.f !== FONT_SISTEMA)
/** La fuente que se MARCA como elegida: la guardada, salvo «Sistema», que se muestra como «La app». */
export const fuenteMarcada = (f: string): string => (f === FONT_SISTEMA ? FONT_APP : f)

export const SIZE_STEPS = [0.875, 1, 1.1875, 1.375]

export const DEFAULT_LYRIC_FONT: string = FONT_APP
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

/** Lo que la ADMINISTRACIÓN (CancionesPanel, en /admin y /home) lee y escribe de chart_prefs por /api/portal/preferencias. Las llaves de la lista son las que esa pantalla guarda de verdad
 *  (fuente, tamaño, interlineado y modo escenario); `view`, `notation` y `twoColumns` son del modo acordes abandonado y no se escriben. */
export const CLAVES_CHART_EDITABLES = ['fontFamily', 'textScale', 'lineHeightWide', 'stageMode'] as const
export interface ChartPrefsAdmin extends LyricPrefs { stageMode: boolean }

/** chart_prefs crudo → las cuatro preferencias válidas (lo desconocido vuelve al valor por defecto). */
export function chartPrefsAdminFrom(chart: ChartPrefs | null | undefined): ChartPrefsAdmin {
  return { ...lyricPrefsFrom(chart), stageMode: chart?.stageMode === true }
}

/** Valida el PATCH `{ chart: … }`: solo las cuatro llaves de la lista, con valores válidos (fuente y tamaño de las listas, el resto booleanos). null = no válido (llave de más, valor raro o vacío). */
export function parseChartPrefsPatch(body: unknown): Partial<ChartPrefsAdmin> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (Object.keys(b).some(k => !(CLAVES_CHART_EDITABLES as readonly string[]).includes(k))) return null
  const out: Partial<ChartPrefsAdmin> = {}
  if ('fontFamily' in b) { if (typeof b.fontFamily !== 'string' || !FONT_OPTIONS.some(o => o.f === b.fontFamily)) return null; out.fontFamily = b.fontFamily }
  if ('textScale' in b) { if (typeof b.textScale !== 'number' || !SIZE_STEPS.includes(b.textScale)) return null; out.textScale = b.textScale }
  for (const k of ['lineHeightWide', 'stageMode'] as const) if (k in b) { if (typeof b[k] !== 'boolean') return null; out[k] = b[k] as boolean }
  return Object.keys(out).length ? out : null
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
