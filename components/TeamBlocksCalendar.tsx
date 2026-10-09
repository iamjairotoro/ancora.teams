'use client'
/* Cuadrícula de días COMPARTIDA por el Home y la pestaña «Calendario» (punto 60). Solo pinta el mes (días de
   la semana + 6 filas de días); el título del mes y las flechas los pone cada pantalla.

   Cada día muestra UN punto por equipo con bloqueos y, en gris, el número de PERSONAS DISTINTAS que
   bloquearon para ese equipo. El color del equipo es identidad y nunca lleva texto. Las filas vienen de
   team_blocks_in_range (con team_id); un LÍDER solo cuenta y ve los equipos que lidera —también si la base le
   entregara filas de más— y nunca a personas sin equipo; esas las ve solo la administración, con punto gris. */
import { useMemo } from 'react'
import { blocksByDate, type TeamBlockRow, type Viewer } from '@/lib/teamBlocks'
import styles from './team-blocks-calendar.module.css'

type TeamMini = { id: string; name: string; color?: string | null }

export interface TeamBlocksCalendarProps {
  year: number
  month: number                        // 0-11
  rows: TeamBlockRow[]
  viewer: Viewer
  teams: TeamMini[]                    // equipos activos, en su orden
  serviceDates: ReadonlySet<string>    // fechas con servicio
  today: string                        // YYYY-MM-DD
  selectedDate: string | null
  onDayClick: (dateISO: string) => void
  size?: 'compact' | 'roomy'
}

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const plural = (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`
const bloq = (n: number) => `${plural(n)} ${n === 1 ? 'bloqueó' : 'bloquearon'}`

export default function TeamBlocksCalendar(p: TeamBlocksCalendarProps) {
  const leaderKey = p.viewer.kind === 'leader' ? Array.from(p.viewer.teamIds).sort().join(',') : ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const counts = useMemo(() => blocksByDate(p.rows, p.viewer), [p.rows, p.viewer.kind, leaderKey])
  const teams = p.viewer.kind === 'admin' ? p.teams : p.teams.filter(t => p.viewer.kind === 'leader' && p.viewer.teamIds.has(t.id))

  // 6 filas de 7 días, semana en lunes; los días de los meses vecinos van atenuados.
  const firstDow = new Date(p.year, p.month, 1).getDay()
  const start = firstDow === 0 ? 6 : firstDow - 1
  const cells: { dateISO: string; label: number; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(p.year, p.month, 1 - start + i)
    cells.push({ dateISO: iso(d.getFullYear(), d.getMonth(), d.getDate()), label: d.getDate(), inMonth: d.getMonth() === p.month })
  }

  return (
    <div className={`${styles.grid} ${p.size === 'roomy' ? styles.roomy : ''}`} role="grid" aria-label={`${MESES[p.month]} ${p.year}`}>
      {DOW.map((d, i) => <span key={i} className={styles.dow} aria-hidden="true">{d}</span>)}
      {cells.map(c => {
        const dow = new Date(c.dateISO + 'T12:00:00').getDay()
        const hasSvc = p.serviceDates.has(c.dateISO)
        const day = counts.get(c.dateISO)
        const dots = teams.filter(t => (day?.byTeam.get(t.id) || 0) > 0)
        const none = p.viewer.kind === 'admin' ? (day?.noTeam || 0) : 0
        const summary = [
          ...dots.map(t => `${t.name}: ${bloq(day!.byTeam.get(t.id)!)}`),
          ...(none ? [`Sin equipo: ${bloq(none)}`] : []),
        ]
        const [, mm, dd] = c.dateISO.split('-')
        const label = `${Number(dd)} de ${MESES[Number(mm) - 1]}${hasSvc ? '. Hay servicio' : ''}${c.dateISO === p.today ? '. Hoy' : ''}${summary.length ? `. ${summary.join('. ')}` : ''}`
        return (
          <button
            type="button" key={c.dateISO} onClick={() => p.onDayClick(c.dateISO)}
            className={[
              styles.day,
              c.inMonth ? '' : styles.out,
              c.dateISO < p.today ? styles.past : '',
              dow === 0 ? styles.sun : '',
              hasSvc ? styles.svc : '',
              c.dateISO === p.today ? styles.today : '',
              c.dateISO === p.selectedDate ? styles.open : '',
            ].filter(Boolean).join(' ')}
            aria-label={label} aria-pressed={c.dateISO === p.selectedDate} {...(c.dateISO === p.today ? { 'aria-current': 'date' as const } : {})}
          >
            <span className={styles.n}>{c.label}</span>
            {(dots.length > 0 || none > 0) && (
              <span className={styles.dots}>
                {dots.map(t => {
                  const n = day!.byTeam.get(t.id)!
                  const tip = `${t.name}: ${bloq(n)}`
                  return <span key={t.id} className={styles.dt} {...(t.color ? { 'data-team': t.color } : {})} title={tip} aria-label={tip} role="img"><i />{n}</span>
                })}
                {none > 0 && <span className={`${styles.dt} ${styles.none}`} title={`Sin equipo: ${bloq(none)}`} aria-label={`Sin equipo: ${bloq(none)}`} role="img"><i />{none}</span>}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
