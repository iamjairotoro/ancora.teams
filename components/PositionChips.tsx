'use client'
/* Posiciones de una persona agrupadas por equipo, en chips compactos: con el
   color del equipo (punto + tinte, punto 43) si el equipo tiene uno, y neutros
   si no; el texto siempre es gris de la escala neutra. Sin posiciones no dibuja nada —
   ni guion ni «Sin posiciones». Con `max`, muestra solo las primeras y un «+N»
   con el resto (en las filas: 3). */
import type { PositionGroup } from '@/lib/personPositions'
import { isTeamColor } from '@/lib/teamColors'
import { teamChipClass } from './TeamColor'
import styles from './position-chips.module.css'

export default function PositionChips({ groups, max }: { groups?: PositionGroup[]; max?: number }) {
  if (!groups || groups.length === 0) return null
  const total = groups.reduce((n, g) => n + g.positions.length, 0)
  const limit = max && total > max ? max : total
  let left = limit
  const visible = groups
    .map(g => {
      const take = Math.max(0, Math.min(g.positions.length, left))
      left -= take
      return { ...g, positions: g.positions.slice(0, take) }
    })
    .filter(g => g.positions.length > 0)
  const hidden = total - limit
  const hiddenText = groups
    .flatMap(g => g.positions.map(p => `${g.teamName}: ${p}`))
    .slice(limit)
    .join(' · ')

  return (
    <span className={styles.wrap}>
      {visible.map(g => (
        <span key={g.teamId} className={styles.grp}>
          <span className={styles.team}>{g.teamName}</span>
          {g.positions.map(p => isTeamColor(g.teamColor)
            ? <span key={p} className={teamChipClass} data-team={g.teamColor}>{p}</span>
            : <span key={p} className={styles.chip}>{p}</span>)}
        </span>
      ))}
      {hidden > 0 && <span className={styles.chip} title={hiddenText} aria-label={`y ${hidden} más: ${hiddenText}`}>+{hidden}</span>}
    </span>
  )
}
