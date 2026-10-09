'use client'
/* Panel del día de los bloqueos de fecha, COMPARTIDO por el Home y la pestaña Disponibilidad (punto 60).
   Dos vistas: «Por persona» (por defecto: un punto por equipo, lleno = bloqueado, aro = disponible, una frase
   y el motivo) y «Por equipo» (bloques por equipo con «n de N bloquearon»).

   Se arma SOLO desde las filas por equipo que entrega la base (team_blocks_in_range), conservando el team_id.
   PRIVACIDAD (regla del 51): el LÍDER ve solo los equipos que lidera —un punto por equipo bloqueado, «Bloqueó
   {su equipo}», sin «Disponible en…» ni «Todos sus equipos»—; eso solo lo ve owner/admin. Se resuelve acá
   según `viewer`, además de lo que ya filtra la base. Una persona sin equipo activo (fila con team_id nulo)
   solo la ve la administración, con punto neutro y la etiqueta «Sin equipo»: no desaparece. */
import { useState } from 'react'
import { dayBlocks, joinNames, personPhrase, positionsInTeams, type TeamBlockRow, type Viewer } from '@/lib/teamBlocks'
import styles from './day-blocks.module.css'

export type TeamMini = { id: string; name: string; color?: string | null }
type PersonMini = { id: string; nombre: string; apellido?: string | null }

export interface DayBlocksPanelProps {
  rows: TeamBlockRow[]
  date: string
  viewer: Viewer
  /** Equipos activos, en su orden. Para un líder se usan solo los que lidera. */
  teams: TeamMini[]
  /** Tamaño de cada equipo (para «n de N bloquearon»). */
  teamSizes: ReadonlyMap<string, number>
  people: PersonMini[]
  /** Equipos activos de la persona — SOLO administración (para «Disponible en…» y «Todos sus equipos»). */
  personTeamIds?: (memberId: string) => string[]
  positionsOf: (memberId: string, teamId: string) => string[]
}

const fullName = (p?: PersonMini) => (p ? `${p.nombre} ${p.apellido || ''}`.trim() : 'Persona')

function Dot({ team, on }: { team: TeamMini; on: boolean }) {
  const label = `${team.name}: ${on ? 'bloqueado' : 'disponible'}`
  return <span className={styles.dot} data-on={on} {...(team.color ? { 'data-team': team.color } : {})} role="img" aria-label={label} title={label} />
}

export default function DayBlocksPanel(props: DayBlocksPanelProps) {
  const { rows, date, viewer, teamSizes, people, personTeamIds, positionsOf } = props
  const [mode, setMode] = useState<'person' | 'team'>('person')
  const isAdmin = viewer.kind === 'admin'
  const teams = isAdmin ? props.teams : props.teams.filter(t => viewer.kind === 'leader' && viewer.teamIds.has(t.id))
  const teamById = new Map(teams.map(t => [t.id, t] as [string, TeamMini]))
  const personById = new Map(people.map(p => [p.id, p] as [string, PersonMini]))
  const day = dayBlocks(rows, date, viewer)

  if (!day.people.length) return <p className={styles.empty}>Nadie bloqueó este día.</p>

  const order = (t: string) => teams.findIndex(x => x.id === t)
  const byName = (a: string, b: string) => fullName(personById.get(a)).localeCompare(fullName(personById.get(b)), 'es')
  const sorted = [...day.people].sort((a, b) => byName(a.memberId, b.memberId))

  // Por persona, lo que se sabe de ella: equipos bloqueados (solo los visibles) y, para la administración, los demás.
  function info(memberId: string) {
    const p = day.people.find(x => x.memberId === memberId)!
    const blocked = p.teamIds.filter(t => teamById.has(t)).sort((a, b) => order(a) - order(b))
    const mine = isAdmin && personTeamIds ? personTeamIds(memberId).filter(t => teamById.has(t)).sort((a, b) => order(a) - order(b)) : []
    const available = mine.filter(t => !blocked.includes(t))
    const allBlocked = mine.length > 0 && available.length === 0
    return { p, blocked, mine, available, allBlocked, onlyTeam: mine.length === 1 }
  }

  return (
    <div className={styles.root}>
      <div className={styles.seg} role="group" aria-label="Vista del panel">
        <button type="button" className={styles.segBtn} aria-pressed={mode === 'person'} onClick={() => setMode('person')}>Por persona</button>
        <button type="button" className={styles.segBtn} aria-pressed={mode === 'team'} onClick={() => setMode('team')}>Por equipo</button>
      </div>

      {mode === 'person' ? (
        <>
          {sorted.map(({ memberId }) => {
            const i = info(memberId)
            const blockedNames = i.blocked.map(t => teamById.get(t)!.name)
            const availableNames = i.available.map(t => teamById.get(t)!.name)
            const phrase = personPhrase({ viewer, blockedNames, availableNames, allBlocked: i.allBlocked, onlyTeam: i.onlyTeam, noTeam: i.p.noTeam })
            const pos = positionsInTeams(positionsOf, memberId, i.blocked)
            // Administración: un punto por equipo de la persona (lleno/aro). Líder: un punto por equipo bloqueado SUYO.
            const dotTeams = isAdmin && i.mine.length ? i.mine : i.blocked
            return (
              <div key={memberId} className={styles.person} role="group" aria-label={`${fullName(personById.get(memberId))}. ${phrase}`}>
                <div className={styles.l1}>
                  <span className={styles.nm}>{fullName(personById.get(memberId))}</span>
                  <span className={styles.dots}>
                    {dotTeams.length
                      ? dotTeams.map(t => <Dot key={t} team={teamById.get(t)!} on={i.blocked.includes(t)} />)
                      : <span className={`${styles.dot} ${styles.dotNone}`} role="img" aria-label="Sin equipo" title="Sin equipo" />}
                  </span>
                </div>
                <div className={styles.tx}>{phrase}</div>
                {pos.length > 0 && <div className={styles.pos}>{pos.join(' · ')}</div>}
                <div className={styles.rs}>{i.p.reasons.length ? `Motivo: ${i.p.reasons.join(' · ')}` : 'Sin motivo'}</div>
              </div>
            )
          })}
          {isAdmin && (
            <div className={styles.legend}>
              <span><span className={styles.dot} data-on="true" data-team="cobalto" aria-hidden="true" /> punto lleno = bloqueado</span>
              <span><span className={styles.dot} data-on="false" data-team="cobalto" aria-hidden="true" /> punto vacío = disponible</span>
            </div>
          )}
        </>
      ) : (
        <>
          {teams.map(t => {
            const ids = (day.byTeam.get(t.id) || []).slice().sort(byName)
            if (!ids.length) {
              return <div key={t.id} className={styles.free}><Dot team={t} on={false} />{t.name}: nadie bloqueó</div>
            }
            const size = teamSizes.get(t.id)
            return (
              <div key={t.id} className={styles.tgroup}>
                <div className={styles.th}>
                  <Dot team={t} on />
                  <span>{t.name}</span>
                  <span className={styles.ct}>{size ? `${ids.length} de ${size} bloquearon` : `${ids.length} ${ids.length === 1 ? 'bloqueó' : 'bloquearon'}`}</span>
                </div>
                {ids.map(m => {
                  const i = info(m)
                  const pos = positionsOf(m, t.id)
                  // La etiqueta solo la ve la administración; el líder nunca sabe de otros equipos.
                  const tag = !isAdmin || i.onlyTeam || !i.mine.length ? '' : i.allBlocked ? 'Todos sus equipos' : `Solo: ${joinNames(i.blocked.map(x => teamById.get(x)!.name))}`
                  return (
                    <div key={m} className={styles.pr}>
                      <span className={styles.nm}>{fullName(personById.get(m))}</span>
                      {pos.length > 0 && <span className={styles.pos}>{pos.join(' · ')}</span>}
                      <span className={styles.rs}>{i.p.reasons.length ? i.p.reasons.join(' · ') : 'Sin motivo'}</span>
                      {tag && <span className={styles.tag}>{tag}</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {isAdmin && day.noTeam.length > 0 && (
            <div className={styles.tgroup}>
              <div className={styles.th}><span className={`${styles.dot} ${styles.dotNone}`} role="img" aria-label="Sin equipo" title="Sin equipo" /><span>Sin equipo</span>
                <span className={styles.ct}>{day.noTeam.length} {day.noTeam.length === 1 ? 'bloqueó' : 'bloquearon'}</span></div>
              {day.noTeam.slice().sort(byName).map(m => (
                <div key={m} className={styles.pr}>
                  <span className={styles.nm}>{fullName(personById.get(m))}</span>
                  <span className={styles.rs}>{info(m).p.reasons.length ? info(m).p.reasons.join(' · ') : 'Sin motivo'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
