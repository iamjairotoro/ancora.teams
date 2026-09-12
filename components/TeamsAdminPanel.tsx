'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Archive, Plus, Crown, X, ChevronDown, ChevronUp, GripVertical, MoreVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Team, TeamPosition, Member, Availability } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
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

  function openTeam(id: string) { setSelectedTeamId(id); setSelectedFilter('all'); setEditingId(null); setMobileDrawerOpen(false) }

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
  // Encabezado y filas comparten esta misma pista de columnas — incluida
  // la celda vacía del ancho del avatar, para que nunca se desalineen.
  const TABLE_COLS = '32px minmax(0,220px) minmax(0,1fr) 128px 28px'

  const alerts = (
    <>
      {msg && <p style={{fontSize:12,color:'var(--on-ok)',background:'var(--ok)',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
      {err && <p style={{fontSize:12,color:'#fff',background:'var(--no)',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
    </>
  )

  if (loading) {
    return <div style={{padding:32,textAlign:'center',color:'var(--ink-3)',fontSize:13,...rootStyle}}>Cargando...</div>
  }

  // ── VISTA DETALLE (maestro-detalle: sidebar de posiciones + panel de integrantes) ──
  if (selectedTeamId) {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) { setSelectedTeamId(null); return null }
    const children = positions.filter(p => p.team_id === selectedTeamId)
    const isEditingHeader = editingId === team.id
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
    const filterLabel = selectedFilter === 'all' ? 'Todos los integrantes' : selectedFilter === 'leaders' ? 'Líderes' : (selectedPosition?.name || 'Posición')

    const sidebarContent = (
      <>
        <button className={`gl-tree-item ${selectedFilter==='all'?'on':''}`} onClick={() => { setSelectedFilter('all'); setMobileDrawerOpen(false) }}>
          <span>Todos los integrantes</span><span className="n">{totalMembers}</span>
        </button>
        <button className={`gl-tree-item ${selectedFilter==='leaders'?'on':''}`} onClick={() => { setSelectedFilter('leaders'); setMobileDrawerOpen(false) }}>
          <span>Líderes</span><span className="n">{totalLeaders}</span>
        </button>

        <div style={{borderTop:'0.5px solid var(--hairline)',margin:'10px 0'}}/>
        <p style={{fontSize:10,fontWeight:700,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:0.5,padding:'0 11px',marginBottom:6}}>Posiciones</p>

        {children.length === 0 && <p style={{fontSize:12,color:'var(--ink-3)',padding:'0 11px',marginBottom:8}}>Sin posiciones todavía.</p>}
        {children.map((child) => {
          const count = memberPositions.filter(mp => mp.team_position_id === child.id).length
          const active = selectedFilter === child.id
          return (
            <div key={child.id}
              draggable
              onDragStart={() => setDraggedPosId(child.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggedPosId) reorderPositions(draggedPosId, child.id); setDraggedPosId(null) }}
              onDragEnd={() => setDraggedPosId(null)}
              style={{display:'flex',alignItems:'center',gap:0,opacity:draggedPosId===child.id?0.4:1}}>
              <div className="gl-icon-btn" style={{padding:'4px 2px',cursor:'grab'}} title="Arrastrar para reordenar"><GripVertical size={14}/></div>
              <button className={`gl-tree-item ${active?'on':''}`} style={{flex:1}} onClick={() => { setSelectedFilter(child.id); setMobileDrawerOpen(false) }}>
                <span>{child.name}</span><span className="n">{count}</span>
              </button>
              <button onClick={() => archivePosition(child)} className="gl-icon-btn" title="Archivar"><Archive size={12}/></button>
            </div>
          )
        })}

        {alerts}
        <div style={{padding:'8px 11px 0'}}>
          {!showAddPositionForm ? (
            <button onClick={() => setShowAddPositionForm(true)} className="gl-btn gl-qui" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,width:'100%'}}>
              <Plus size={13}/> Posición
            </button>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <input className="gl-input" placeholder="Nombre de la posición" value={newPosName} autoFocus
                onChange={e => { setNewPosName(e.target.value); if (!codeTouched) setNewPosCode(suggestCode(e.target.value)); setErr(''); setMsg('') }} />
              {showCodeField && (
                <input className="gl-input" placeholder="Código" value={newPosCode}
                  onChange={e => { setCodeTouched(true); setNewPosCode(e.target.value) }} />
              )}
              <div style={{display:'flex',gap:6}}>
                <button onClick={async () => { await addPosition(); setShowAddPositionForm(false) }} disabled={saving || !newPosName.trim()} className="gl-btn gl-pri" style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                  <Plus size={13}/> Añadir
                </button>
                <button onClick={() => { setShowAddPositionForm(false); setNewPosName(''); setNewPosCode(''); setCodeTouched(false); setShowCodeField(false); setErr('') }} className="gl-btn gl-qui">Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </>
    )

    const memberPanel = (
      <>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
          {isPositionScope && editingPosId === selectedPosition?.id ? (
            <>
              <input className="gl-input" style={{flex:1}} value={editingPosName} onChange={e => setEditingPosName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePositionRename(selectedPosition!.id)} autoFocus />
              <button onClick={() => savePositionRename(selectedPosition!.id)} className="gl-btn gl-pri" style={{padding:'6px 12px',fontSize:11}}>Guardar</button>
              <button onClick={() => setEditingPosId(null)} className="gl-btn gl-qui" style={{fontSize:11}}>Cancelar</button>
            </>
          ) : (
            <>
              <h3 style={{fontSize:15.5,fontWeight:700,color:'var(--ink)',margin:0,flex:1,letterSpacing:'-0.012em'}}>{filterLabel}</h3>
              {isPositionScope && selectedPosition && (
                <button onClick={() => { setEditingPosId(selectedPosition.id); setEditingPosName(selectedPosition.name) }} className="gl-icon-btn" title="Renombrar posición">
                  <Pencil size={14}/>
                </button>
              )}
            </>
          )}
        </div>
        {detailRows.length === 0 ? (
          <p style={{fontSize:12,color:'var(--ink-3)',marginBottom:12}}>
            {selectedFilter==='leaders' ? 'Sin líderes asignados a este equipo todavía.' : 'Sin integrantes todavía.'}
          </p>
        ) : (
          <div style={{marginBottom:12}}>
            {/* El encabezado espeja las columnas de la fila — misma pista para el hueco del avatar */}
            {!isPositionScope && selectedFilter !== 'leaders' && (
              <div className="gl-hdr" style={{display:'grid',gridTemplateColumns:TABLE_COLS,gap:12,padding:'0 12px 8px'}}>
                <span/><span>Integrante</span><span>Posiciones</span><span>Disponibilidad</span><span/>
              </div>
            )}
            <div className="gl-rows">
            {detailRows.map(row => {
              const badges = badgesFor(row.id)
              const isTableRow = !isPositionScope && selectedFilter !== 'leaders'
              return (
                <div key={row.id} className="gl-row" style={{position:'relative', ...(isTableRow ? {display:'grid',gridTemplateColumns:TABLE_COLS,gap:12} : {})}}>
                  <div className="gl-av">{initials(row.member?.nombre, row.member?.apellido)}</div>
                  <button onClick={() => router.push(`/admin?tab=personas&person=${row.member_id}`)}
                    style={{minWidth:0,textAlign:'left',background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',flex:isTableRow?undefined:1}}>
                    <p style={{fontSize:12.5,fontWeight:600,color:'var(--ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {row.member?.nombre} {row.member?.apellido}
                      {row.is_leader && !isPositionScope && <Crown size={11} style={{marginLeft:6,verticalAlign:'-1px'}} fill="currentColor" color="var(--ink-3)"/>}
                    </p>
                    <p style={{fontSize:11,color:'var(--ink-3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{row.member?.email}</p>
                  </button>
                  {isTableRow && (
                    <div className="gl-chips" style={{alignContent:'center'}}>
                      {badges.map(b => <span key={b} className="gl-chip">{b}</span>)}
                    </div>
                  )}
                  {isTableRow && (
                    <span style={{fontSize:11.5,color:'var(--ink-2)',alignSelf:'center'}}>{AVAILABILITY_LABEL[row.availability]}</span>
                  )}
                  <button onClick={() => setOpenRowMenuId(cur => cur === row.id ? null : row.id)} className="gl-icon-btn" title="Más acciones" style={isTableRow?{justifySelf:'end'}:{marginLeft:'auto'}}>
                    <MoreVertical size={15}/>
                  </button>
                  {openRowMenuId === row.id && (
                    <>
                      <div onClick={() => setOpenRowMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                      <div style={{position:'absolute',top:'100%',right:0,marginTop:2,background:'var(--surface-solid)',boxShadow:'var(--e2)',borderRadius:10,padding:4,zIndex:30,minWidth:180}}>
                        {!isPositionScope && (
                          <button onClick={() => { toggleLeader(row); setOpenRowMenuId(null) }}
                            style={{width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12.5,color:'var(--ink)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',borderRadius:6,display:'flex',alignItems:'center',gap:8}}>
                            <Crown size={13}/> {row.is_leader ? 'Quitar liderazgo' : 'Hacer líder'}
                          </button>
                        )}
                        <button onClick={() => { removeRow(row); setOpenRowMenuId(null) }}
                          style={{width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12.5,color:'var(--no)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',borderRadius:6,display:'flex',alignItems:'center',gap:8}}>
                          <X size={13}/> {selectedFilter==='leaders' ? 'Quitar de líderes' : isPositionScope ? 'Quitar esta posición' : 'Sacar del equipo'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        )}

        {selectedFilter !== 'leaders' && showAddPerson && (
          <>
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
                  <input className="gl-input" style={{width:'100%'}} placeholder="Buscar o crear persona..."
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
          </>
        )}
      </>
    )

    return (
      <div style={{maxWidth:960,...rootStyle}}>
        {/* Breadcrumb — jerarquía fija de 2 niveles (equipo → posición), sin anidación */}
        <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:4,marginBottom:12,fontSize:12.5}}>
          <button onClick={() => setSelectedTeamId(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-3)',fontFamily:'inherit',fontSize:12.5,fontWeight:500,padding:0}}>Equipos</button>
          <span style={{color:'var(--ink-3)'}}>›</span>
          <span style={{color:'var(--ink)',fontWeight:600}}>{team.name}</span>
        </div>

        {/* Encabezado — fuera de las tarjetas, con el único botón primario de la pantalla */}
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:16}}>
          {isEditingHeader ? (
            <div style={{display:'flex',gap:8,flex:1,minWidth:200}}>
              <input className="gl-input" style={{flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTeamRename(team.id)} autoFocus />
              <button onClick={() => saveTeamRename(team.id)} className="gl-btn gl-pri" style={{padding:'6px 12px',fontSize:11}}>Guardar</button>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <h1 style={{fontSize:20,fontWeight:700,color:'var(--ink)',letterSpacing:'-0.02em',margin:0}}>{team.name}</h1>
              <button onClick={() => { setEditingId(team.id); setEditingName(team.name) }} className="gl-icon-btn" title="Renombrar"><Pencil size={14}/></button>
              <button onClick={() => archiveTeam(team)} className="gl-icon-btn" title="Archivar equipo"><Archive size={14}/></button>
            </div>
          )}
          {selectedFilter !== 'leaders' && (
            <button onClick={() => setShowAddPerson(v => !v)} className="gl-btn gl-pri">
              <Plus size={13} style={{marginRight:4,verticalAlign:-2}}/>Agregar integrante
            </button>
          )}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Desktop: dos tarjetas separadas — riel + panel */}
          <div className="hidden md:grid" style={{gridTemplateColumns:'220px minmax(0,1fr)',gap:16,alignItems:'start'}}>
            <div className="gl-card" style={{padding:'10px 8px',display:'flex',flexDirection:'column',gap:2}}>
              {sidebarContent}
            </div>
            <div className="gl-card" style={{padding:18}}>{memberPanel}</div>
          </div>

          {/* Mobile: barra "Viendo: X" + drawer, panel en su propia tarjeta */}
          <div className="md:hidden">
            <button onClick={() => setMobileDrawerOpen(true)} className="gl-card"
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--surface)',border:'none',cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>
              <span style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>Viendo: {filterLabel}</span>
              <ChevronDown size={16} color="var(--ink-3)"/>
            </button>
            <div className="gl-card" style={{padding:16}}>{memberPanel}</div>
          </div>
        </div>

        {/* Drawer mobile — mismo patrón de bottom-sheet que TeamPanel.tsx */}
        {mobileDrawerOpen && (
          <div className="md:hidden" style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end'}}>
            <div onClick={() => setMobileDrawerOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
            <div style={{position:'relative',width:'100%',background:'var(--surface-solid)',boxShadow:'var(--e3)',borderRadius:'16px 16px 0 0',padding:'20px 16px 28px',maxHeight:'80vh',overflowY:'auto'}}>
              <div style={{width:36,height:4,borderRadius:2,background:'var(--hairline)',margin:'0 auto 16px'}}/>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>{sidebarContent}</div>
            </div>
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
                  <input className="gl-input" style={{flex:1}} placeholder="Nombre *" value={newPerson.nombre}
                    onChange={e => setNewPerson({...newPerson, nombre: e.target.value})} autoFocus />
                  <input className="gl-input" style={{flex:1}} placeholder="Apellido" value={newPerson.apellido}
                    onChange={e => setNewPerson({...newPerson, apellido: e.target.value})} />
                </div>
                <input className="gl-input" placeholder="Email *" type="email" value={newPerson.email}
                  onChange={e => setNewPerson({...newPerson, email: e.target.value})} />
                <input className="gl-input" placeholder="Teléfono" value={newPerson.telefono}
                  onChange={e => setNewPerson({...newPerson, telefono: e.target.value})} />
                <div>
                  <label style={{fontSize:11,color:'var(--ink-3)',display:'block',marginBottom:3}}>Fecha de nacimiento</label>
                  <input className="gl-input" style={{width:'100%'}} type="date" value={newPerson.fecha_nacimiento}
                    onChange={e => setNewPerson({...newPerson, fecha_nacimiento: e.target.value})} />
                </div>
                <input className="gl-input" placeholder="Dirección" value={newPerson.direccion}
                  onChange={e => setNewPerson({...newPerson, direccion: e.target.value})} />
                <div style={{display:'flex',gap:8}}>
                  <select className="gl-input" style={{flex:1}} value={newPerson.genero} onChange={e => setNewPerson({...newPerson, genero: e.target.value})}>
                    <option value="">Género</option>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                    <option value="otro">Otro</option>
                  </select>
                  <select className="gl-input" style={{flex:1}} value={newPerson.estado_civil} onChange={e => setNewPerson({...newPerson, estado_civil: e.target.value})}>
                    <option value="">Estado civil</option>
                    <option value="soltero">Soltero/a</option>
                    <option value="casado">Casado/a</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                {newPerson.estado_civil === 'casado' && (
                  <div>
                    <label style={{fontSize:11,color:'var(--ink-3)',display:'block',marginBottom:3}}>Fecha de aniversario</label>
                    <input className="gl-input" style={{width:'100%'}} type="date" value={newPerson.fecha_aniversario}
                      onChange={e => setNewPerson({...newPerson, fecha_aniversario: e.target.value})} />
                  </div>
                )}
              </div>
              {err && <p style={{color:'var(--no)',fontSize:12,marginTop:10}}>{err}</p>}
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button onClick={submitNewPerson} disabled={saving} className="gl-btn gl-pri">{saving ? 'Creando...' : 'Crear y agregar'}</button>
                <button onClick={() => { setCreatingPerson(false); setErr('') }} className="gl-btn gl-qui">Cancelar</button>
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
      <div className="gl-card">
        <div className="gl-card-head">
          <div>
            <h2 style={{fontSize:15.5,fontWeight:700,color:'var(--ink)',letterSpacing:'-0.012em',marginBottom:2}}>Equipos</h2>
            <p style={{fontSize:11.5,color:'var(--ink-3)'}}>Estructura organizacional — click en un equipo para ver sus posiciones e integrantes.</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin equipos todavía — agrega el primero abajo.</div>
        ) : (
          <div className="gl-rows" style={{borderTop:'1px solid var(--hairline)',paddingTop:6}}>
            <div className="gl-hdr" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto',display:'grid'}}>
              <span>Nombre</span><span>Posiciones</span><span>Líderes</span><span>Integrantes</span><span/>
            </div>
            {teams.map((team, i) => {
              const subCount = positions.filter(p => p.team_id === team.id).length
              const leaderCount = teamMembers.filter(tm => tm.team_id === team.id && tm.is_leader).length
              const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length
              const isEditing = editingId === team.id
              return (
                <div key={team.id} className="gl-row" style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
                  {isEditing ? (
                    <div style={{gridColumn:'1 / span 4',display:'flex',gap:8}}>
                      <input className="gl-input" style={{flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTeamRename(team.id)} autoFocus />
                      <button onClick={() => saveTeamRename(team.id)} className="gl-btn gl-pri" style={{padding:'6px 12px',fontSize:11}}>Guardar</button>
                      <button onClick={() => setEditingId(null)} className="gl-btn gl-qui" style={{fontSize:11}}>Cancelar</button>
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
                      <button onClick={() => moveTeam(team, 'up')} disabled={i===0} className="gl-icon-btn" style={{opacity:i===0?0.3:1}} title="Subir"><ChevronUp size={13}/></button>
                      <button onClick={() => moveTeam(team, 'down')} disabled={i===teams.length-1} className="gl-icon-btn" style={{opacity:i===teams.length-1?0.3:1}} title="Bajar"><ChevronDown size={13}/></button>
                      <button onClick={() => { setEditingId(team.id); setEditingName(team.name) }} className="gl-icon-btn" title="Renombrar"><Pencil size={13}/></button>
                      <button onClick={() => archiveTeam(team)} className="gl-icon-btn" title="Archivar"><Archive size={13}/></button>
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
            <input className="gl-input" style={{flex:1}} placeholder="Nombre del equipo" value={newName}
              onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addTeam(newLeaderIds)} />
            <button onClick={() => addTeam(newLeaderIds)} disabled={saving || !newName.trim()} className="gl-btn gl-pri" style={{display:'flex',alignItems:'center',gap:4}}>
              <Plus size={13}/> {saving ? '...' : 'Agregar'}
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
