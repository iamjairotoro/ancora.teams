'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Archive, Plus, Crown, X, ChevronUp, ChevronDown, GripVertical, MoreHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Team, TeamPosition, Member, Availability } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import styles from './ui.module.css'

const AVAILABILITY_LABEL: Record<Availability, string> = {
  unrestricted: 'Sin restricción',
  monthly_max_1: 'Máximo 1 vez al mes',
  monthly_max_2: 'Máximo 2 veces al mes',
  on_request: 'Solo a pedido',
}

interface Props { darkMode?: boolean }

interface FlatTeamMember { id: string; member_id: string; team_id: string; is_leader: boolean; availability: Availability }
interface FlatLink { team_member_id: string; team_position_id: string }
interface DetailRow { id: string; member_id: string; is_leader: boolean; availability: Availability; member: Member }
// 'all' = todos los integrantes del equipo activo · 'leaders' = líderes del equipo activo ·
// cualquier otro valor = id de una posición del equipo activo — filtra sus integrantes,
// sin cambiar de equipo activo ni navegar.
type SidebarFilter = 'all' | 'leaders' | string
type PageTab = 'members' | 'positions' | 'settings'

function suggestCode(name: string) {
  return name.trim().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function initials(nombre?: string, apellido?: string) {
  return `${(nombre || '')[0] || ''}${(apellido || '')[0] || ''}`.toUpperCase()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TeamsAdminPanel({ darkMode }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [teams, setTeams] = useState<Team[]>([])
  const [positions, setPositions] = useState<TeamPosition[]>([])
  const [teamMembers, setTeamMembers] = useState<FlatTeamMember[]>([])
  const [memberPositions, setMemberPositions] = useState<FlatLink[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(searchParams.get('team'))
  const [selectedFilter, setSelectedFilter] = useState<SidebarFilter>(searchParams.get('filter') || 'all')
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  const [pageTab, setPageTab] = useState<PageTab>('members')
  // Sin acciones destructivas sueltas en la fila (regla del brief) — corona
  // y "sacar del equipo" viven detrás de este menú contextual por fila.
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  // "Agregar integrante" es el único botón primario de la pantalla — el
  // buscador solo aparece al pedirlo, no siempre visible.
  const [showAddPerson, setShowAddPerson] = useState(false)
  // "+ Posición" es una acción secundaria — el campo no está siempre visible.
  const [showAddPositionForm, setShowAddPositionForm] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingPosId, setEditingPosId] = useState<string | null>(null)
  const [editingPosName, setEditingPosName] = useState('')
  const [newName, setNewName] = useState('')
  const [newLeaderIds, setNewLeaderIds] = useState<string[]>([])
  const [newPosName, setNewPosName] = useState('')
  const [newPosCode, setNewPosCode] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)
  // El código se genera solo, sin mostrarse — el campo recién aparece si
  // la base rechaza el generado automático por chocar con otra posición
  // del mismo equipo, para que el usuario lo ajuste a mano.
  const [showCodeField, setShowCodeField] = useState(false)
  const [draggedPosId, setDraggedPosId] = useState<string | null>(null)
  const [personQuery, setPersonQuery] = useState('')
  const [showPersonDropdown, setShowPersonDropdown] = useState(false)
  const [creatingPerson, setCreatingPerson] = useState(false)
  const emptyNewPerson = { nombre:'', apellido:'', email:'', telefono:'', fecha_nacimiento:'', direccion:'', genero:'', estado_civil:'', fecha_aniversario:'' }
  const [newPerson, setNewPerson] = useState(emptyNewPerson)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  // Mantiene la URL sincronizada con el equipo/filtro seleccionados, para
  // que refrescar la página o compartir el link no vuelva siempre al inicio.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedTeamId) { params.set('team', selectedTeamId); params.set('filter', selectedFilter) }
    else { params.delete('team'); params.delete('filter') }
    router.replace(`/admin?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, selectedFilter])

  const loadAll = useCallback(async () => {
    const [teamsRes, posRes, tmRes, mpRes, membersRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, description, sort_order, archived_at, tool_type, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_positions').select('id, organization_id, team_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_members').select('id, member_id, team_id, is_leader, availability').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
      supabase.from('members').select('*').order('nombre'),
    ])
    setTeams(teamsRes.data || [])
    setPositions(posRes.data || [])
    setTeamMembers((tmRes.data || []) as FlatTeamMember[])
    setMemberPositions((mpRes.data || []) as FlatLink[])
    setAllMembers(membersRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // 'all'/'leaders' consultan directo team_members del equipo activo;
  // cualquier otro valor de selectedFilter es el id de una posición — se
  // resuelve vía team_member_positions, sin que selectedTeamId cambie.
  const loadDetailRows = useCallback(async () => {
    if (!selectedTeamId) { setDetailRows([]); return }
    if (selectedFilter === 'leaders') {
      const { data } = await supabase.from('team_members')
        .select('id, member_id, is_leader, availability, member:members(*)')
        .eq('team_id', selectedTeamId).eq('is_leader', true)
      setDetailRows((data || []) as any)
      return
    }
    if (selectedFilter === 'all') {
      const { data } = await supabase.from('team_members')
        .select('id, member_id, is_leader, availability, member:members(*)')
        .eq('team_id', selectedTeamId)
      setDetailRows((data || []) as any)
      return
    }
    const { data: links } = await supabase.from('team_member_positions').select('team_member_id').eq('team_position_id', selectedFilter)
    const ids = (links || []).map((l: any) => l.team_member_id)
    if (!ids.length) { setDetailRows([]); return }
    const { data } = await supabase.from('team_members')
      .select('id, member_id, is_leader, availability, member:members(*)')
      .in('id', ids)
    setDetailRows((data || []) as any)
  }, [selectedTeamId, selectedFilter])

  useEffect(() => { loadDetailRows() }, [loadDetailRows])

  async function refresh() { await loadAll(); await loadDetailRows() }

  function openTeam(id: string) { setSelectedTeamId(id); setSelectedFilter('all'); setEditingId(null); setPageTab('members') }

  function badgesFor(teamMemberId: string): string[] {
    return memberPositions
      .filter(mp => mp.team_member_id === teamMemberId)
      .map(mp => positions.find(p => p.id === mp.team_position_id)?.name)
      .filter(Boolean) as string[]
  }

  async function addTeam(leaderIds: string[] = []) {
    if (!newName.trim()) return
    setSaving(true); setErr(''); setMsg('')
    const nextOrder = teams.length ? Math.max(...teams.map(t => t.sort_order)) + 1 : 0
    const { data, error } = await supabase.from('teams').insert({
      name: newName.trim(),
      organization_id: DEFAULT_ORGANIZATION_ID,
      sort_order: nextOrder,
    }).select().single()
    if (error) { setErr(error.message); setSaving(false); return }
    if (leaderIds.length && data) {
      await supabase.from('team_members').insert(
        leaderIds.map(id => ({ member_id: id, team_id: data.id, organization_id: DEFAULT_ORGANIZATION_ID, is_leader: true }))
      )
    }
    setMsg(`✓ "${newName}" agregado`); setNewName(''); setNewLeaderIds([])
    await refresh()
    setSaving(false)
  }

  async function addPosition() {
    if (!selectedTeamId || !newPosName.trim()) return
    setSaving(true); setErr(''); setMsg('')
    const siblings = positions.filter(p => p.team_id === selectedTeamId)
    const nextOrder = siblings.length ? Math.max(...siblings.map(p => p.sort_order)) + 1 : 0
    const code = (newPosCode.trim() || suggestCode(newPosName)).toUpperCase()
    const { error } = await supabase.from('team_positions').insert({
      team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID,
      name: newPosName.trim(), code, default_slots: 1, sort_order: nextOrder,
    })
    if (error) {
      if (error.code === '23505') {
        setShowCodeField(true)
        setNewPosCode(code)
        setErr(`Ya hay una posición con un código parecido ("${code}") en este equipo — ajustalo abajo.`)
      } else setErr(error.message)
    } else {
      setMsg(`✓ "${newPosName}" agregada`); setNewPosName(''); setNewPosCode(''); setCodeTouched(false); setShowCodeField(false)
      await refresh()
    }
    setSaving(false)
  }

  async function saveTeamRename(id: string) {
    if (!editingName.trim()) return
    await supabase.from('teams').update({ name: editingName.trim() }).eq('id', id)
    setEditingId(null)
    await refresh()
  }

  async function savePositionRename(id: string) {
    if (!editingPosName.trim()) return
    const { error } = await supabase.from('team_positions').update({ name: editingPosName.trim() }).eq('id', id)
    if (error) { setErr(error.message); return }
    setEditingPosId(null)
    await refresh()
  }

  async function archiveTeam(team: Team) {
    const posCount = positions.filter(p => p.team_id === team.id).length
    const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length
    const warning = `¿Archivar "${team.name}"? Afecta ${posCount} posición(es) y ${memberCount} integrante(s) — dejan de verse en Equipos y en el selector de Servicio, pero no se borra ningún historial.`
    if (!confirm(warning)) return
    const { error } = await supabase.from('teams').update({ archived_at: new Date().toISOString() }).eq('id', team.id)
    if (error) { setErr(error.message); return }
    setMsg(`"${team.name}" archivado`)
    if (team.id === selectedTeamId) setSelectedTeamId(null)
    await refresh()
  }

  async function archivePosition(pos: TeamPosition) {
    const memberCount = memberPositions.filter(mp => mp.team_position_id === pos.id).length
    const warning = `¿Archivar "${pos.name}"? Afecta a ${memberCount} integrante(s) con esta posición — deja de verse acá y en el selector de Servicio, pero no se borra ningún historial.`
    if (!confirm(warning)) return
    const { error } = await supabase.from('team_positions').update({ archived_at: new Date().toISOString() }).eq('id', pos.id)
    if (error) { setErr(error.message); return }
    setMsg(`"${pos.name}" archivada`)
    if (selectedFilter === pos.id) setSelectedFilter('all')
    await refresh()
  }

  async function moveTeam(team: Team, direction: 'up' | 'down') {
    const siblings = [...teams].sort((a, b) => a.sort_order - b.sort_order)
    const idx = siblings.findIndex(t => t.id === team.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const other = siblings[swapIdx]
    await Promise.all([
      supabase.from('teams').update({ sort_order: other.sort_order }).eq('id', team.id),
      supabase.from('teams').update({ sort_order: team.sort_order }).eq('id', other.id),
    ])
    await refresh()
  }

  // Arrastrar-y-soltar: mueve draggedId a la posición de targetId dentro del
  // mismo equipo y reasigna sort_order de todo el grupo en bloque (0,1,2...).
  async function reorderPositions(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const siblings = positions.filter(p => p.team_id === selectedTeamId).sort((a, b) => a.sort_order - b.sort_order)
    const fromIdx = siblings.findIndex(p => p.id === draggedId)
    const toIdx = siblings.findIndex(p => p.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...siblings]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    await Promise.all(reordered.map((p, i) => supabase.from('team_positions').update({ sort_order: i }).eq('id', p.id)))
    await refresh()
  }

  // Agrega una persona (ya existente, o recién creada) al equipo/posición
  // activo. Si el filtro activo es una posición y la persona todavía no es
  // integrante del equipo raíz, primero se crea esa fila — recién ahí se
  // puede enlazar la posición (mismo requisito que ya exigía el picker
  // anterior, ahora resuelto automáticamente en vez de exigirlo a mano).
  async function addPersonAndAssign(memberId: string) {
    if (!selectedTeamId) return
    setErr('')
    if (selectedFilter === 'all' || selectedFilter === 'leaders') {
      const { error } = await supabase.from('team_members').insert({
        member_id: memberId, team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID,
      })
      if (error) { setErr(error.message); return }
    } else {
      let parentRow = teamMembers.find(tm => tm.team_id === selectedTeamId && tm.member_id === memberId)
      if (!parentRow) {
        const { data, error } = await supabase.from('team_members').insert({
          member_id: memberId, team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID,
        }).select().single()
        if (error) { setErr(error.message); return }
        parentRow = data as any
      }
      const { error } = await supabase.from('team_member_positions').insert({
        team_member_id: parentRow!.id, team_position_id: selectedFilter,
      })
      if (error) { setErr(error.message); return }
    }
    setPersonQuery(''); setShowPersonDropdown(false)
    await refresh()
  }

  function openCreatePerson(query: string) {
    setNewPerson({ ...emptyNewPerson, nombre: query.trim() })
    setCreatingPerson(true); setShowPersonDropdown(false); setErr('')
  }

  async function submitNewPerson() {
    if (!newPerson.nombre.trim() || !newPerson.email.trim()) { setErr('Nombre y email son obligatorios'); return }
    setSaving(true); setErr('')
    const { data, error } = await supabase.from('members').insert({
      nombre: newPerson.nombre.trim(),
      apellido: newPerson.apellido.trim() || null,
      email: newPerson.email.trim(),
      telefono: newPerson.telefono.trim() || null,
      fecha_nacimiento: newPerson.fecha_nacimiento || null,
      direccion: newPerson.direccion.trim() || null,
      genero: newPerson.genero || null,
      estado_civil: newPerson.estado_civil || null,
      fecha_aniversario: newPerson.fecha_aniversario || null,
    }).select().single()
    if (error) { setErr(error.message); setSaving(false); return }
    setCreatingPerson(false); setNewPerson(emptyNewPerson)
    await loadAll()
    if (data) await addPersonAndAssign(data.id)
    setSaving(false)
  }

  // 'all' = sale del equipo entero (borra la fila de team_members, que en
  // cascada se lleva sus posiciones). 'leaders' = deja de ser líder, sigue
  // en el equipo. Una posición = solo se quita esa posición puntual, la
  // persona sigue en el equipo (regla del brief: quitar posiciones no saca
  // del equipo).
  async function removeRow(row: DetailRow) {
    if (selectedFilter === 'leaders') {
      await supabase.from('team_members').update({ is_leader: false }).eq('id', row.id)
    } else if (selectedFilter === 'all') {
      await supabase.from('team_members').delete().eq('id', row.id)
    } else {
      await supabase.from('team_member_positions').delete().eq('team_member_id', row.id).eq('team_position_id', selectedFilter)
    }
    await refresh()
  }

  async function toggleLeader(row: DetailRow) {
    await supabase.from('team_members').update({ is_leader: !row.is_leader }).eq('id', row.id)
    await refresh()
  }

  const rootStyle: React.CSSProperties = { fontFamily:'var(--font-jakarta), ui-rounded, -apple-system, "SF Pro Rounded", system-ui, sans-serif' }

  const alerts = (
    <>
      {msg && <p style={{fontSize:12,color:'var(--on-ok)',background:'var(--ok)',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
      {err && <p style={{fontSize:12,color:'#fff',background:'var(--no)',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
    </>
  )

  if (loading) {
    return <div style={{padding:32,textAlign:'center',color:'var(--ink-3)',fontSize:13,...rootStyle}}>Cargando...</div>
  }

  // ── VISTA DETALLE — portado de docs/mockup-v2.html (Pantalla B), sin el
  // nivel de sección (equipo→posición plano, decisión ya tomada) ──
  if (selectedTeamId) {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) { setSelectedTeamId(null); return null }
    const children = positions.filter(p => p.team_id === selectedTeamId)
    const isPositionScope = selectedFilter !== 'all' && selectedFilter !== 'leaders'
    const parentMemberIds = new Set(teamMembers.filter(tm => tm.team_id === selectedTeamId).map(tm => tm.member_id))
    const assignedIds = isPositionScope
      ? new Set(
          memberPositions.filter(mp => mp.team_position_id === selectedFilter)
            .map(mp => teamMembers.find(tm => tm.id === mp.team_member_id)?.member_id)
            .filter(Boolean) as string[]
        )
      : parentMemberIds
    const availableToAdd = allMembers.filter(m =>
      !assignedIds.has(m.id) && (!isPositionScope || parentMemberIds.has(m.id))
    )
    const totalMembers = teamMembers.filter(tm => tm.team_id === selectedTeamId).length
    const totalLeaders = teamMembers.filter(tm => tm.team_id === selectedTeamId && tm.is_leader).length
    const selectedPosition = children.find(c => c.id === selectedFilter)
    const isTableRow = !isPositionScope && selectedFilter !== 'leaders'

    return (
      <div style={rootStyle}>
        <nav className={styles.crumb}>
          <button onClick={() => setSelectedTeamId(null)} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',font:'inherit',padding:0}}>Equipos</button> › <b>{team.name}</b>
        </nav>

        <header className={styles.pageHead}>
          {editingId === team.id ? (
            <div style={{ display:'flex', gap:8, flex:1, minWidth:200 }}>
              <input className={styles.input} style={{flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTeamRename(team.id)} autoFocus />
              <button onClick={() => saveTeamRename(team.id)} className={`${styles.btn} ${styles.btnPrimary}`}>Guardar</button>
            </div>
          ) : (
            <div>
              <h1>
                {team.name}
                <button onClick={() => { setEditingId(team.id); setEditingName(team.name) }} title="Renombrar"
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)',marginLeft:8,verticalAlign:'middle'}}><Pencil size={14}/></button>
              </h1>
              <p className={styles.sub}>{totalMembers} integrantes · {children.length} posiciones</p>
            </div>
          )}
          <div style={{ display:'flex', gap:9 }}>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setPageTab('settings')}>Ajustes</button>
            {selectedFilter !== 'leaders' && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAddPerson(v => !v)}>Agregar integrante</button>
            )}
          </div>
        </header>

        <div className={styles.tabs} role="tablist">
          <button role="tab" aria-selected={pageTab === 'members'} onClick={() => setPageTab('members')}>Integrantes</button>
          <button role="tab" aria-selected={pageTab === 'positions'} onClick={() => setPageTab('positions')}>Posiciones</button>
          <button role="tab" aria-selected={pageTab === 'settings'} onClick={() => setPageTab('settings')}>Ajustes</button>
        </div>

        {pageTab === 'positions' && (
          <p className={styles.empty}><b>Próximamente</b>Por ahora, las posiciones se administran desde la pestaña Integrantes.</p>
        )}
        {pageTab === 'settings' && (
          <div className={styles.card} style={{padding:18,display:'flex',flexDirection:'column',gap:10,alignItems:'flex-start'}}>
            <button onClick={() => { setEditingId(team.id); setEditingName(team.name); setPageTab('members') }} className={`${styles.btn} ${styles.btnGhost}`}>
              <Pencil size={13} style={{marginRight:6,verticalAlign:-2}}/>Renombrar equipo
            </button>
            <button onClick={() => archiveTeam(team)} className={`${styles.btn} ${styles.btnGhost}`} style={{color:'var(--no)'}}>
              <Archive size={13} style={{marginRight:6,verticalAlign:-2}}/>Archivar equipo
            </button>
          </div>
        )}

        {pageTab === 'members' && (
        <div className={styles.split}>
          {/* ── riel: lista plana de posiciones ── */}
          <aside className={`${styles.card} ${styles.tree}`}>
            <button className={styles.treeTop} aria-pressed={selectedFilter === 'all'} onClick={() => setSelectedFilter('all')}>
              Todos los integrantes<span className={styles.treeN}>{totalMembers}</span>
            </button>
            <button className={styles.treeTop} aria-pressed={selectedFilter === 'leaders'} onClick={() => setSelectedFilter('leaders')}>
              Líderes<span className={styles.treeN}>{totalLeaders}</span>
            </button>

            <div className={styles.treeRule}/>
            <div className={styles.treeLabel}>Posiciones</div>

            {children.length === 0 && <p style={{fontSize:12,color:'var(--ink-3)',padding:'0 12px 8px'}}>Sin posiciones todavía.</p>}
            {children.map(child => {
              const count = memberPositions.filter(mp => mp.team_position_id === child.id).length
              return (
                <div key={child.id}
                  draggable
                  onDragStart={() => setDraggedPosId(child.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (draggedPosId) reorderPositions(draggedPosId, child.id); setDraggedPosId(null) }}
                  onDragEnd={() => setDraggedPosId(null)}
                  style={{display:'flex',alignItems:'center',gap:2,opacity:draggedPosId===child.id?0.4:1}}>
                  <span className={styles.treeGrip} title="Arrastrar para reordenar"><GripVertical size={13}/></span>
                  <button className={styles.treePos} style={{flex:1}} aria-pressed={selectedFilter === child.id} onClick={() => setSelectedFilter(child.id)}>
                    {child.name}<span className={styles.treeN}>{count}</span>
                  </button>
                  <button onClick={() => archivePosition(child)} title="Archivar"
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4,display:'flex'}}><Archive size={12}/></button>
                </div>
              )
            })}

            <div className={styles.treeRule}/>
            {alerts}
            <div className={styles.treeFoot}>
              {!showAddPositionForm ? (
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowAddPositionForm(true)}>
                  <Plus size={13} style={{verticalAlign:-2}}/> Posición
                </button>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:6,width:'100%',padding:'0 6px'}}>
                  <input className={styles.input} placeholder="Nombre de la posición" value={newPosName} autoFocus
                    onChange={e => { setNewPosName(e.target.value); if (!codeTouched) setNewPosCode(suggestCode(e.target.value)); setErr(''); setMsg('') }} />
                  {showCodeField && (
                    <input className={styles.input} placeholder="Código" value={newPosCode}
                      onChange={e => { setCodeTouched(true); setNewPosCode(e.target.value) }} />
                  )}
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={async () => { await addPosition(); setShowAddPositionForm(false) }} disabled={saving || !newPosName.trim()}
                      className={`${styles.btn} ${styles.btnPrimary}`} style={{flex:1}}>Añadir</button>
                    <button onClick={() => { setShowAddPositionForm(false); setNewPosName(''); setNewPosCode(''); setCodeTouched(false); setShowCodeField(false); setErr('') }}
                      className={`${styles.btn} ${styles.btnGhost}`}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── tabla ── */}
          <section className={styles.card}>
            {isPositionScope && editingPosId === selectedPosition?.id ? (
              <div style={{display:'flex',gap:8,padding:'14px 16px'}}>
                <input className={styles.input} style={{flex:1}} value={editingPosName} onChange={e => setEditingPosName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePositionRename(selectedPosition!.id)} autoFocus />
                <button onClick={() => savePositionRename(selectedPosition!.id)} className={`${styles.btn} ${styles.btnPrimary}`}>Guardar</button>
                <button onClick={() => setEditingPosId(null)} className={`${styles.btn} ${styles.btnGhost}`}>Cancelar</button>
              </div>
            ) : isPositionScope && selectedPosition ? (
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'14px 16px 4px'}}>
                <h3 style={{fontSize:14,fontWeight:700,color:'var(--ink)',margin:0,flex:1}}>{selectedPosition.name}</h3>
                <button onClick={() => { setEditingPosId(selectedPosition.id); setEditingPosName(selectedPosition.name) }} title="Renombrar posición"
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)'}}><Pencil size={14}/></button>
              </div>
            ) : null}

            {isTableRow && detailRows.length > 0 && (
              <div className={styles.tblHead}>
                <span className={styles.cellAv} aria-hidden/>
                <span className={styles.cellName}>Integrante</span>
                <span className={styles.cellPos}>Posiciones</span>
                <span className={styles.cellAvail}>Disponibilidad</span>
                <span style={{flex:'0 0 28px'}} aria-hidden/>
              </div>
            )}

            <div className={styles.tblRows}>
              {detailRows.length === 0 ? (
                <p className={styles.empty}>
                  <b>Sin integrantes en esta vista</b>
                  {selectedFilter==='leaders' ? 'Sin líderes asignados a este equipo todavía.' : 'Agrega personas al equipo o cambia el filtro del panel izquierdo.'}
                </p>
              ) : (
                detailRows.map(row => {
                  const badges = badgesFor(row.id)
                  return (
                    <div key={row.id} className={styles.row}>
                      <div className={styles.cellAv}><div className={styles.avatar}>{initials(row.member?.nombre, row.member?.apellido)}</div></div>

                      <div className={styles.cellName}>
                        <button className={styles.name} onClick={() => router.push(`/admin?tab=personas&person=${row.member_id}`)}>
                          {row.member?.nombre} {row.member?.apellido}
                          {row.is_leader && !isPositionScope && <span className={styles.tagLeader} style={{marginLeft:6}}>Líder</span>}
                        </button>
                        <span className={styles.email}>{row.member?.email}</span>
                      </div>

                      {isTableRow && (
                        <div className={styles.cellPos}>
                          <div className={styles.chips}>{badges.map(b => <span className={styles.chip} key={b}>{b}</span>)}</div>
                        </div>
                      )}

                      {/* texto plano: la disponibilidad se edita en el perfil de la persona */}
                      {isTableRow && <div className={styles.cellAvail}>{AVAILABILITY_LABEL[row.availability]}</div>}

                      <button className={styles.rowMore} aria-label={`Acciones para ${row.member?.nombre}`}
                        onClick={() => setOpenRowMenuId(cur => cur === row.id ? null : row.id)}>
                        <MoreHorizontal size={16}/>
                      </button>
                      {openRowMenuId === row.id && (
                        <>
                          <div onClick={() => setOpenRowMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                          <div className={styles.rowMenu}>
                            {!isPositionScope && (
                              <button onClick={() => { toggleLeader(row); setOpenRowMenuId(null) }}>
                                <Crown size={13}/> {row.is_leader ? 'Quitar liderazgo' : 'Hacer líder'}
                              </button>
                            )}
                            <button className={styles.rowMenuDanger} onClick={() => { removeRow(row); setOpenRowMenuId(null) }}>
                              <X size={13}/> {selectedFilter==='leaders' ? 'Quitar de líderes' : isPositionScope ? 'Quitar esta posición' : 'Sacar del equipo'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {selectedFilter !== 'leaders' && showAddPerson && (
              <div style={{padding:'0 12px 12px'}}>
                {isPositionScope && availableToAdd.length === 0 && (
                  <p style={{fontSize:11,color:'var(--ink-3)',marginBottom:8}}>
                    No hay nadie disponible — solo se puede asignar a esta posición a quien ya sea integrante de "{team.name}".
                  </p>
                )}
                {(() => {
                  const q = personQuery.trim().toLowerCase()
                  const matches = q ? availableToAdd.filter(m =>
                    `${m.nombre} ${m.apellido}`.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)
                  ).slice(0, 8) : availableToAdd.slice(0, 8)
                  return (
                    <div style={{position:'relative'}}>
                      <input className={styles.input} style={{width:'100%'}} placeholder="Buscar o crear persona..."
                        value={personQuery}
                        onChange={e => { setPersonQuery(e.target.value); setShowPersonDropdown(true) }}
                        onFocus={() => setShowPersonDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPersonDropdown(false), 150)} />
                      {showPersonDropdown && (
                        <div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:'var(--surface-solid)',borderRadius:10,zIndex:20,maxHeight:240,overflowY:'auto',boxShadow:'var(--e2)'}}>
                          {matches.map(m => (
                            <button key={m.id} onMouseDown={() => addPersonAndAssign(m.id)}
                              style={{width:'100%',textAlign:'left',padding:'8px 12px',background:'none',border:'none',cursor:'pointer',display:'block'}}>
                              <p style={{fontSize:13,fontWeight:500,color:'var(--ink)'}}>{m.nombre} {m.apellido}</p>
                              <p style={{fontSize:11,color:'var(--ink-3)'}}>{m.email}</p>
                            </button>
                          ))}
                          {matches.length === 0 && !q && (
                            <p style={{fontSize:12,color:'var(--ink-3)',padding:'8px 12px'}}>Sin nadie disponible — escribí un nombre para crear una persona nueva.</p>
                          )}
                          {q && (
                            <button onMouseDown={() => openCreatePerson(personQuery)}
                              style={{width:'100%',textAlign:'left',padding:'9px 12px',background:'var(--surface-2)',border:'none',cursor:'pointer',fontWeight:600,fontSize:13,color:'var(--ink)'}}>
                              + Crear persona: &quot;{personQuery}&quot;
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </section>
        </div>
        )}

        {/* Modal "Nueva persona" — se abre desde el buscador de "agregar integrante" */}
        {creatingPerson && (
          <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div onClick={() => setCreatingPerson(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
            <div style={{position:'relative',width:'100%',maxWidth:420,background:'var(--surface-solid)',boxShadow:'var(--e3)',borderRadius:14,padding:20,maxHeight:'86vh',overflowY:'auto',...rootStyle}}>
              <h3 style={{fontSize:16,fontWeight:700,color:'var(--ink)',marginBottom:14}}>Nueva persona</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',gap:8}}>
                  <input className={styles.input} style={{flex:1}} placeholder="Nombre *" value={newPerson.nombre}
                    onChange={e => setNewPerson({...newPerson, nombre: e.target.value})} autoFocus />
                  <input className={styles.input} style={{flex:1}} placeholder="Apellido" value={newPerson.apellido}
                    onChange={e => setNewPerson({...newPerson, apellido: e.target.value})} />
                </div>
                <input className={styles.input} placeholder="Email *" type="email" value={newPerson.email}
                  onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
                <input className={styles.input} placeholder="Teléfono" value={newPerson.telefono}
                  onChange={e => setNewPerson({...newPerson, telefono: e.target.value})} />
                <div>
                  <label style={{fontSize:11,color:'var(--ink-3)',display:'block',marginBottom:3}}>Fecha de nacimiento</label>
                  <input className={styles.input} style={{width:'100%'}} type="date" value={newPerson.fecha_nacimiento}
                    onChange={e => setNewPerson({...newPerson, fecha_nacimiento: e.target.value})} />
                </div>
                <input className={styles.input} placeholder="Dirección" value={newPerson.direccion}
                  onChange={e => setNewPerson({...newPerson, direccion: e.target.value})} />
                <div style={{display:'flex',gap:8}}>
                  <select className={styles.input} style={{flex:1}} value={newPerson.genero} onChange={e => setNewPerson({...newPerson, genero: e.target.value})}>
                    <option value="">Género</option>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                    <option value="otro">Otro</option>
                  </select>
                  <select className={styles.input} style={{flex:1}} value={newPerson.estado_civil} onChange={e => setNewPerson({...newPerson, estado_civil: e.target.value})}>
                    <option value="">Estado civil</option>
                    <option value="soltero">Soltero/a</option>
                    <option value="casado">Casado/a</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                {newPerson.estado_civil === 'casado' && (
                  <div>
                    <label style={{fontSize:11,color:'var(--ink-3)',display:'block',marginBottom:3}}>Fecha de aniversario</label>
                    <input className={styles.input} style={{width:'100%'}} type="date" value={newPerson.fecha_aniversario}
                      onChange={e => setNewPerson({...newPerson, fecha_aniversario: e.target.value})} />
                  </div>
                )}
              </div>
              {err && <p style={{color:'var(--no)',fontSize:12,marginTop:10}}>{err}</p>}
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button onClick={submitNewPerson} disabled={saving} className={`${styles.btn} ${styles.btnPrimary}`}>{saving ? 'Creando...' : 'Crear y agregar'}</button>
                <button onClick={() => { setCreatingPerson(false); setErr('') }} className={`${styles.btn} ${styles.btnGhost}`}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── VISTA LISTA ──
  return (
    <div style={{maxWidth:760,...rootStyle}}>
      <div className={styles.card}>
        <div style={{padding:'16px 18px 14px'}}>
          <h2 style={{fontSize:15.5,fontWeight:700,color:'var(--ink)',letterSpacing:'-0.012em',marginBottom:2}}>Equipos</h2>
          <p style={{fontSize:11.5,color:'var(--ink-3)'}}>Estructura organizacional — click en un equipo para ver sus posiciones e integrantes.</p>
        </div>

        {teams.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin equipos todavía — agrega el primero abajo.</div>
        ) : (
          <div className={styles.tblRows} style={{borderTop:'1px solid var(--hairline)',paddingTop:6}}>
            <div className={styles.tblHead} style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto',display:'grid'}}>
              <span>Nombre</span><span>Posiciones</span><span>Líderes</span><span>Integrantes</span><span/>
            </div>
            {teams.map((team, i) => {
              const subCount = positions.filter(p => p.team_id === team.id).length
              const leaderCount = teamMembers.filter(tm => tm.team_id === team.id && tm.is_leader).length
              const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length
              const isEditing = editingId === team.id
              return (
                <div key={team.id} className={styles.row} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
                  {isEditing ? (
                    <div style={{gridColumn:'1 / span 4',display:'flex',gap:8}}>
                      <input className={styles.input} style={{flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTeamRename(team.id)} autoFocus />
                      <button onClick={() => saveTeamRename(team.id)} className={`${styles.btn} ${styles.btnPrimary}`}>Guardar</button>
                      <button onClick={() => setEditingId(null)} className={`${styles.btn} ${styles.btnGhost}`}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => openTeam(team.id)} style={{background:'none',border:'none',textAlign:'left',cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:600,color:'var(--ink)',padding:0}}>
                        {team.name}
                      </button>
                      <span style={{fontSize:12,color:'var(--ink-3)'}}>{subCount}</span>
                      <span style={{fontSize:12,color:'var(--ink-3)'}}>{leaderCount}</span>
                      <span style={{fontSize:12,color:'var(--ink-3)'}}>{memberCount}</span>
                    </>
                  )}
                  {!isEditing && (
                    <div style={{display:'flex',gap:2,alignItems:'center'}}>
                      <button onClick={() => moveTeam(team, 'up')} disabled={i===0} style={{background:'none',border:'none',cursor:i===0?'default':'pointer',color:'var(--ink-3)',opacity:i===0?0.3:1,padding:4}} title="Subir"><ChevronUp size={13}/></button>
                      <button onClick={() => moveTeam(team, 'down')} disabled={i===teams.length-1} style={{background:'none',border:'none',cursor:i===teams.length-1?'default':'pointer',color:'var(--ink-3)',opacity:i===teams.length-1?0.3:1,padding:4}} title="Bajar"><ChevronDown size={13}/></button>
                      <button onClick={() => { setEditingId(team.id); setEditingName(team.name) }} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4}} title="Renombrar"><Pencil size={13}/></button>
                      <button onClick={() => archiveTeam(team)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4}} title="Archivar"><Archive size={13}/></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{padding:'14px 18px',borderTop:'1px solid var(--hairline)'}}>
          {alerts}
          <p style={{fontSize:10.5,fontWeight:700,color:'var(--ink-3)',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Agregar equipo</p>
          <div style={{display:'flex',gap:8,marginBottom:newName.trim()?10:0}}>
            <input className={styles.input} style={{flex:1}} placeholder="Nombre del equipo" value={newName}
              onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addTeam(newLeaderIds)} />
            <button onClick={() => addTeam(newLeaderIds)} disabled={saving || !newName.trim()} className={`${styles.btn} ${styles.btnPrimary}`}>
              <Plus size={13} style={{marginRight:4,verticalAlign:-2}}/> {saving ? '...' : 'Agregar'}
            </button>
          </div>
          {newName.trim() && (
            <div>
              <p style={{fontSize:10,fontWeight:600,color:'var(--ink-3)',marginBottom:5,textTransform:'uppercase',letterSpacing:0.5}}>Líderes (opcional)</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {allMembers.length === 0 && <span style={{fontSize:11,color:'var(--ink-3)'}}>Sin personas todavía.</span>}
                {allMembers.map(m => {
                  const active = newLeaderIds.includes(m.id)
                  return (
                    <button key={m.id} type="button"
                      onClick={() => setNewLeaderIds(cur => active ? cur.filter(id => id !== m.id) : [...cur, m.id])}
                      style={{fontSize:11,fontWeight:500,padding:'4px 10px',borderRadius:14,border:'none',
                        background:active?'var(--pine)':'var(--surface-2)',color:active?'var(--on-primary)':'var(--ink)',cursor:'pointer',fontFamily:'inherit'}}>
                      {m.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
