'use client'
/* ═══════════════════════════════════════════════════════════════════════
   PersonasList.tsx — «Personas» con lista a la izquierda y ficha fija a la
   derecha (punto 44, alternativa D de docs/mockup-personas-alternativas.html).

   Buscador, filtros (Todos · un chip por equipo · Sin equipo) y la lista. La
   ficha es PersonDetail (la misma del cajón) con la misma carga
   (usePersonDetail + loadPerson del contexto): no se duplica nada.

   - Con 1024px o más: ficha fija (400px, sticky). Por debajo: la lista ocupa
     todo el ancho y tocar una fila abre el cajón existente (a pantalla
     completa en teléfono, con «‹ Personas»).
   - Selección en la URL (?person=<id>) con window.history.replaceState: Next
     la refleja en useSearchParams sin pedir nada al servidor. Si la persona
     queda fuera del filtro, se selecciona la primera visible.
   - ↑/↓ solo actúan con el foco en la lista; en el buscador, ↓ pasa el foco a
     la primera fila. Con ↑/↓ la ficha espera ~150 ms antes de cargarse; con
     clic, carga inmediata. Se mantiene la ficha anterior hasta que llega la
     nueva (sin «Cargando…» tras la primera carga).
   - El cajón solo se abre solo UNA vez por un ?person= al entrar (pantalla
     chica); cerrarlo no lo reabre.
   Sin consultas por fila: usa las listas que TeamPanel ya carga.
   ═══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MoreHorizontal, Search } from 'lucide-react'
import type { Member, Team } from '@/lib/types'
import type { PositionGroup } from '@/lib/personPositions'
import { filterCounts, filterMembers, teamIdsByMember, type PersonFilter } from '@/lib/personFilters'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { usePersonDrawer } from './persona/PersonDrawer'
import PersonDetail from './persona/PersonDetail'
import { usePersonDetail } from './persona/usePersonDetail'
import { TeamDot, TeamMono } from './TeamColor'
import PersonAvatar from './PersonAvatar'
import styles from './personas-list.module.css'

interface Props {
  members: Member[]
  teams: Team[] // activos, en su orden
  teamMembers: { member_id: string; team_id: string }[]
  positionIndex: Map<string, PositionGroup[]>
  // false mientras TeamPanel todavía carga equipos y membresías: hasta
  // entonces no se toca la selección ni la URL.
  ready: boolean
  // Rol de organización de quien es owner/admin (organization_members). null
  // si quien mira no puede verlo: sin etiquetas. Son de SOLO LECTURA.
  roleByMember?: Map<string, 'owner' | 'admin'> | null
  // Elimina a la persona (con su confirmación); true si se borró.
  onDelete: (id: string) => Promise<boolean>
  onOpenProfile: (id: string) => void
  // «Agregar a un equipo» (menú de la ficha): TeamPanel hace la escritura con
  // lib/addToTeam.ts. addBusy deshabilita el botón mientras guarda; addError
  // queda visible, atado a la persona, hasta cerrarlo o reintentar.
  onAddToTeam: (personId: string, teamId: string) => void
  addBusy: boolean
  addError: { personId: string; text: string } | null
  onClearAddError: () => void
}

type PickSource = 'click' | 'key' | 'auto'

function writePersonToUrl(id: string | null) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('person', id)
  else url.searchParams.delete('person')
  if (url.search === window.location.search) return
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

export default function PersonasList({ members, teams, teamMembers, positionIndex, ready, roleByMember, onDelete, onOpenProfile, onAddToTeam, addBusy, addError, onClearAddError }: Props) {
  const { open, edit, loadPerson, canEdit } = usePersonDrawer()
  const searchParams = useSearchParams()
  const wide = useMediaQuery('(min-width: 1024px)')

  const initialPerson = useRef<string | null>(searchParams.get('person'))
  const [selId, setSelId] = useState<string | null>(initialPerson.current)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PersonFilter>('all')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const source = useRef<PickSource>('auto')
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const searchRef = useRef<HTMLInputElement>(null)

  const teamIds = useMemo(() => teamIdsByMember(teams, teamMembers), [teams, teamMembers])
  const counts = useMemo(() => filterCounts(members, teams, teamIds), [members, teams, teamIds])
  const visible = useMemo(
    () => filterMembers({ members, query, filter, teams, teamIds, positionIndex }),
    [members, query, filter, teams, teamIds, positionIndex],
  )

  // Seleccionada = la de la URL/estado si sigue visible; si no, la primera visible.
  const effectiveId = visible.some(m => m.id === selId) ? selId : (visible[0]?.id ?? null)
  const dataReady = ready && members.length > 0

  useEffect(() => {
    if (!dataReady) return
    if (effectiveId !== selId) setSelId(effectiveId)
    writePersonToUrl(effectiveId)
  }, [dataReady, effectiveId, selId])

  // Ficha del panel fijo: misma carga que el cajón, conservando la anterior.
  const { person, loading, load, stop } = usePersonDetail(loadPerson)
  const loadRef = useRef(load); loadRef.current = load
  const stopRef = useRef(stop); stopRef.current = stop
  useEffect(() => {
    if (wide !== true || !dataReady || !effectiveId) { stopRef.current(); return }
    void loadRef.current(effectiveId, { keepPrevious: true, delayMs: source.current === 'key' ? 150 : 0 })
    source.current = 'auto'
  }, [wide, dataReady, effectiveId])

  // Pantalla chica: un ?person= al entrar abre el cajón UNA vez.
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current || wide === null || !dataReady) return
    autoOpened.current = true
    const id = initialPerson.current
    if (wide === false && id && members.some(m => m.id === id)) open(id, { backLabel: 'Personas' })
  }, [wide, dataReady, members, open])

  function pick(id: string, how: PickSource) {
    source.current = how
    setSelId(id)
    if (how === 'click' && wide === false) open(id, { backLabel: 'Personas' })
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-row-main]')
    if (!row) return // el foco está en otra cosa (el «···», el menú): no se captura
    const id = row.closest<HTMLElement>('[data-row-id]')?.dataset.rowId
    const i = visible.findIndex(m => m.id === id)
    const next = visible[i + (e.key === 'ArrowDown' ? 1 : -1)]
    e.preventDefault()
    if (!next) return
    pick(next.id, 'key')
    rowRefs.current.get(next.id)?.focus()
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' || !visible.length) return
    e.preventDefault()
    rowRefs.current.get(visible[0].id)?.focus()
  }

  async function remove(id: string) {
    setMenuFor(null)
    const i = visible.findIndex(m => m.id === id)
    const neighbor = visible[i + 1] ?? visible[i - 1]
    const done = await onDelete(id)
    if (done && neighbor) { source.current = 'auto'; setSelId(neighbor.id) }
  }

  // «Admin» / «Propietario»: solo si quien mira es owner/admin (canEdit) y hay datos.
  const roleOf = (id: string): 'Admin' | 'Propietario' | null => {
    const r = canEdit ? roleByMember?.get(id) : null
    return r === 'owner' ? 'Propietario' : r === 'admin' ? 'Admin' : null
  }
  const initials = (m: Member) => `${m.nombre?.[0] || ''}${m.apellido?.[0] || ''}`.toUpperCase()
  const teamById = useMemo(() => new Map(teams.map(t => [t.id, t] as [string, Team])), [teams])

  function summary(m: Member): React.ReactNode {
    const groups = positionIndex.get(m.id) || []
    const names = groups.flatMap(g => g.positions)
    if (names.length) return names.slice(0, 3).join(' · ')
    const ids = teamIds.get(m.id) || []
    if (ids.length) return ids.map(id => teamById.get(id)?.name || '').filter(Boolean).join(' · ')
    return <span className={styles.noTeam}>Sin equipo</span>
  }

  const installed = members.filter(m => m.instalado_pwa_at).length
  const chip = (key: PersonFilter, label: string, n: number, team?: Team) => (
    <button key={key} type="button" className={styles.fc} aria-pressed={filter === key} onClick={() => setFilter(key)}>
      {team && <TeamMono name={team.name} color={team.color} />}
      {label}<span className={styles.n}>{n}</span>
    </button>
  )

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <input ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown} placeholder="Buscar por nombre, correo, teléfono o posición" aria-label="Buscar personas" />
        </label>
        <div className={styles.chips} role="group" aria-label="Filtrar por equipo">
          {chip('all', 'Todos', counts.all)}
          {teams.map(t => chip(t.id, t.name, counts.byTeam.get(t.id) || 0, t))}
          {chip('none', 'Sin equipo', counts.none)}
        </div>
      </div>

      <p className={styles.count}>
        {visible.length} de {members.length} persona{members.length !== 1 ? 's' : ''}
        <span title="Detectado cuando abren la app desde el ícono agregado a su pantalla de inicio"> · 📲 {installed} con la app instalada</span>
      </p>

      <div className={styles.split} data-wide={wide === true ? 'true' : 'false'}>
        <div className={styles.list} role="list" onKeyDown={onListKeyDown}>
          {visible.length === 0 && (
            <div className={styles.empty}><b>No hay nadie con ese filtro</b>Prueba con otra búsqueda o quita el filtro de equipo.</div>
          )}
          {visible.map(m => {
            const sel = m.id === effectiveId
            const ids = teamIds.get(m.id) || []
            return (
              <div key={m.id} className={styles.row} role="listitem" data-sel={sel} data-row-id={m.id}>
                <button type="button" className={styles.rowMain} data-row-main
                  ref={el => { if (el) rowRefs.current.set(m.id, el); else rowRefs.current.delete(m.id) }}
                  tabIndex={sel ? 0 : -1} aria-current={sel ? 'true' : undefined}
                  onClick={() => pick(m.id, 'click')}>
                  <PersonAvatar className={styles.av} url={m.avatar_url} initials={initials(m)} />
                  <span className={styles.who}>
                    <span className={styles.nmRow}>
                      <span className={styles.nm}>{m.nombre} {m.apellido}</span>
                      {roleOf(m.id) && (
                        <span className={roleOf(m.id) === 'Admin' ? styles.rtag : `${styles.rtag} ${styles.rtagOwn}`}>{roleOf(m.id)}</span>
                      )}
                    </span>
                    <span className={styles.sub}>{summary(m)}</span>
                  </span>
                </button>
                {ids.length > 0 && (
                  <span className={styles.dots}>
                    {ids.map(id => <TeamDot key={id} color={teamById.get(id)?.color} label={teamById.get(id)?.name} />)}
                  </span>
                )}
                {canEdit && (
                  <div className={styles.menuWrap}>
                    <button type="button" className="anc-rowMore" aria-label={`Acciones para ${m.nombre}`} aria-haspopup="menu"
                      aria-expanded={menuFor === m.id} onClick={() => setMenuFor(cur => cur === m.id ? null : m.id)}>
                      <MoreHorizontal size={16} />
                    </button>
                    {menuFor === m.id && (
                      <>
                        <div onClick={() => setMenuFor(null)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
                        <div className="anc-rowMenu" role="menu">
                          <button role="menuitem" className="anc-rowMenuDanger" onClick={() => remove(m.id)}>Eliminar persona…</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {wide === true && effectiveId && (
          <aside className={styles.panel} aria-label="Ficha de la persona seleccionada">
            <PersonDetail person={person} loading={loading} canEdit={canEdit}
              roleLabel={roleOf(effectiveId)} onEdit={edit} onOpenProfile={onOpenProfile}
              addToTeam={{
                teams: teams.filter(t => !(teamIds.get(effectiveId) || []).includes(t.id)).map(t => ({ id: t.id, name: t.name, color: t.color })),
                busy: addBusy,
                error: addError?.personId === effectiveId ? addError.text : null,
                onPick: teamId => onAddToTeam(effectiveId, teamId),
                onClearError: onClearAddError,
              }} />
          </aside>
        )}
      </div>
    </div>
  )
}
