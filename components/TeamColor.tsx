'use client'
/* Piezas visuales del color de equipo (punto 43): franja, punto, monograma y
   etiqueta (la banda de Servicio está en app.module.css). Cada una lleva data-team="{color}" y hereda las
   variables del CSS de la v5; sin color (o con uno desconocido) quedan
   neutras. El texto del equipo NUNCA lleva el color. */
import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { colorWarnings, isTeamColor, TEAM_COLOR_NAME, TEAM_COLOR_ORDER, type TeamColorKey } from '@/lib/teamColors'
import styles from './team-color.module.css'

// Neutro de la escala (equipo sin color): mismas tres variables que define
// [data-team] en la v5, tomadas de los tokens neutros.
const NEUTRAL = {
  '--anc-team-a': 'var(--anc-ink-4)',
  '--anc-team-m': 'var(--anc-ink-4)',
  '--anc-team-t': 'var(--anc-sunk)',
} as CSSProperties

/** Props para el elemento que representa al equipo. */
export function teamColorProps(color?: string | null): { 'data-team'?: TeamColorKey; style?: CSSProperties } {
  return isTeamColor(color) ? { 'data-team': color } : { style: NEUTRAL }
}

export const teamInitial = (name: string) => (name.trim()[0] || '?').toLocaleUpperCase('es')

export function TeamStripe({ color }: { color?: string | null }) {
  return <div className={styles.stripe} aria-hidden {...teamColorProps(color)} />
}

/** Con `label` el punto se anuncia (role img + aria-label + title) con el nombre
 *  del equipo; sin él es decorativo. */
export function TeamDot({ color, label }: { color?: string | null; label?: string }) {
  return label
    ? <span className={styles.dot} role="img" aria-label={label} title={label} {...teamColorProps(color)} />
    : <span className={styles.dot} aria-hidden {...teamColorProps(color)} />
}

export function TeamMono({ name, color }: { name: string; color?: string | null }) {
  return <span className={styles.mono} aria-hidden {...teamColorProps(color)}>{teamInitial(name)}</span>
}

/** Clase de la banda de un equipo (ficha de persona). */
export const teamBandClass = styles.band
/** Clase del texto «Sin …» de la ficha. */
export const teamNoneClass = styles.none
/** Clase de la etiqueta de posición con punto de color. */
export const teamChipClass = styles.chip

export interface OtherTeamColor { id: string; name: string; color?: string | null }

/** Selector de 7 círculos. Guarda al pulsar (lo resuelve el padre). Se AVISA
 *  de colores iguales o parecidos; NUNCA se impide elegirlos. */
export function TeamColorPicker({ value, others, busy, error, onPick }: {
  value?: string | null
  others: OtherTeamColor[]
  busy?: boolean
  error?: string | null
  onPick: (color: TeamColorKey) => void
}) {
  const chosen = isTeamColor(value) ? value : null
  const warnings = chosen
    ? others.flatMap(o => {
        if (!isTeamColor(o.color)) return []
        return colorWarnings(chosen, [o.color]).map(w => {
          if (w.kind === 'same') return `Mismo color que ${o.name}.`
          if (w.kind === 'similar') return `Se parece a ${o.name}.`
          return `Se parece a ${o.name} para quien tiene daltonismo.`
        })
      })
    : []
  return (
    <div className={styles.pickWrap}>
      <div className={styles.pick} role="group" aria-label="Color del equipo">
        {TEAM_COLOR_ORDER.map(k => (
          <button key={k} type="button" className={styles.swatch} data-team={k}
            aria-pressed={chosen === k} aria-label={TEAM_COLOR_NAME[k]} title={TEAM_COLOR_NAME[k]}
            disabled={busy} onClick={() => onPick(k)}>
            {chosen === k && <Check size={14} strokeWidth={3} />}
          </button>
        ))}
      </div>
      <p className={styles.help}>
        {chosen
          ? <>Elegido: <b>{TEAM_COLOR_NAME[chosen]}</b>. El color acompaña siempre al nombre y al monograma.</>
          : <>Este equipo todavía no tiene color. Elige uno.</>}
      </p>
      {warnings.map(w => <p key={w} className={styles.warn}>{w}</p>)}
      {error && <p className={styles.err} role="alert">{error}</p>}
    </div>
  )
}
