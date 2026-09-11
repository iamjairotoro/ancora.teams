'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Archive, Plus, Crown, X, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Team, TeamSection, TeamPosition, Member, Availability } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A'

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

export default function TeamsAdminPanel({ darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const router = useRouter()
  const searchParams = useSearchParams()

  const [teams, setTeams] = useState<Team[]>([])
  const [sections, setSections] = useState<TeamSection[]>([])
  const [positions, setPositions] = useState<TeamPosition[]>([])
  const [teamMembers, setTeamMembers] = useState<FlatTeamMember[]>([])
  const [memberPositions, setMemberPositions] = useState<FlatLink[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(searchParams.get('team'))
  const [selectedFilter, setSelectedFilter] = useState<SidebarFilter>(searchParams.get('filter') || 'all')
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newName, setNewName] = useState('')
  const [newLeaderIds, setNewLeaderIds] = useState<string[]>([])
  const [newPosName, setNewPosName] = useState('')
  const [newPosCode, setNewPosCode] = useState('')
  const [codeTouched, setCodeTouched] = useState(false)
  const [newPosSlots, setNewPosSlots] = useState(1)
  const [newPosSectionId, setNewPosSectionId] = useState('')
  const [newSectionName, setNewSectionName] = useState('')
  const [addMemberId, setAddMemberId] = useState('')
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
    const [teamsRes, secRes, posRes, tmRes, mpRes, membersRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, description, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_sections').select('id, organization_id, team_id, name, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_positions').select('id, organization_id, team_id, section_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_members').select('id, member_id, team_id, is_leader, availability').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
      supabase.from('members').select('*').order('nombre'),
    ])
    setTeams(teamsRes.data || [])
    setSections(secRes.data || [])
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
      team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID, section_id: newPosSectionId || null,
      name: newPosName.trim(), code, default_slots: newPosSlots, sort_order: nextOrder,
    })
    if (error) setErr(error.message)
    else {
      setMsg(`✓ "${newPosName}" agregada`); setNewPosName(''); setNewPosCode(''); setCodeTouched(false); setNewPosSlots(1); setNewPosSectionId('')
      await refresh()
    }
    setSaving(false)
  }

  async function addSection() {
    if (!selectedTeamId || !newSectionName.trim()) return
    setSaving(true); setErr(''); setMsg('')
    const siblings = sections.filter(s => s.team_id === selectedTeamId)
    const nextOrder = siblings.length ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 0
    const { error } = await supabase.from('team_sections').insert({
      team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID, name: newSectionName.trim(), sort_order: nextOrder,
    })
    if (error) setErr(error.message)
    else { setMsg(`✓ "${newSectionName}" agregada`); setNewSectionName(''); await refresh() }
    setSaving(false)
  }

  // Archivar una sección no se lleva sus posiciones — quedan sueltas
  // (section_id = null), siguen asignables como cualquier posición sin agrupar.
  async function archiveSection(section: TeamSection) {
    const posCount = positions.filter(p => p.section_id === section.id).length
    const warning = `¿Archivar "${section.name}"? Sus ${posCount} posición(es) quedan sueltas en el equipo (sin sección), no se borran.`
    if (!confirm(warning)) return
    await supabase.from('team_positions').update({ section_id: null }).eq('section_id', section.id)
    const { error } = await supabase.from('team_sections').update({ archived_at: new Date().toISOString() }).eq('id', section.id)
    if (error) { setErr(error.message); return }
    setMsg(`"${section.name}" archivada`)
    await refresh()
  }

  async function moveSection(section: TeamSection, direction: 'up' | 'down') {
    const siblings = sections.filter(s => s.team_id === section.team_id).sort((a, b) => a.sort_order - b.sort_order)
    const idx = siblings.findIndex(s => s.id === section.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const other = siblings[swapIdx]
    await Promise.all([
      supabase.from('team_sections').update({ sort_order: other.sort_order }).eq('id', section.id),
      supabase.from('team_sections').update({ sort_order: section.sort_order }).eq('id', other.id),
    ])
    await refresh()
  }

  async function saveTeamRename(id: string) {
    if (!editingName.trim()) return
    await supabase.from('teams').update({ name: editingName.trim() }).eq('id', id)
    setEditingId(null)
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

  async function movePosition(pos: TeamPosition, direction: 'up' | 'down') {
    const siblings = positions.filter(p => p.team_id === pos.team_id).sort((a, b) => a.sort_order - b.sort_order)
    const idx = siblings.findIndex(p => p.id === pos.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    const other = siblings[swapIdx]
    await Promise.all([
      supabase.from('team_positions').update({ sort_order: other.sort_order }).eq('id', pos.id),
      supabase.from('team_positions').update({ sort_order: pos.sort_order }).eq('id', other.id),
    ])
    await refresh()
  }

  async function addMemberToTeam() {
    if (!addMemberId || !selectedTeamId) return
    if (selectedFilter === 'all' || selectedFilter === 'leaders') {
      const { error } = await supabase.from('team_members').insert({
        member_id: addMemberId, team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID,
      })
      if (error) { setErr(error.message); return }
    } else {
      const parentRow = teamMembers.find(tm => tm.team_id === selectedTeamId && tm.member_id === addMemberId)
      if (!parentRow) return
      const { error } = await supabase.from('team_member_positions').insert({
        team_member_id: parentRow.id, team_position_id: selectedFilter,
      })
      if (error) { setErr(error.message); return }
    }
    setAddMemberId('')
    await refresh()
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

  async function updateAvailability(teamMemberId: string, availability: Availability) {
    await supabase.from('team_members').update({ availability }).eq('id', teamMemberId)
    await refresh()
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:C.card }
  const btnDark: React.CSSProperties = { background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const iconBtn: React.CSSProperties = { background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:C.muted }

  const alerts = (
    <>
      {msg && <p style={{fontSize:12,color:'#1B4332',background:'#D8F3DC',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
      {err && <p style={{fontSize:12,color:'#B91C1C',background:'#FEE2E2',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
    </>
  )

  if (loading) {
    return <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Cargando...</div>
  }

  // ── VISTA DETALLE (maestro-detalle: sidebar de posiciones + panel de integrantes) ──
  if (selectedTeamId) {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) { setSelectedTeamId(null); return null }
    const children = positions.filter(p => p.team_id === selectedTeamId)
    const teamSections = sections.filter(s => s.team_id === selectedTeamId)
    const unsectioned = children.filter(p => !p.section_id)
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

    const filterPill = (active: boolean): React.CSSProperties => ({
      display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',textAlign:'left',
      padding:'8px 10px',borderRadius:8,fontSize:13,fontWeight:active?700:500,
      background:active?ACCENT:'transparent',color:active?'#F5F0E6':C.txt,border:'none',cursor:'pointer',fontFamily:'inherit',
    })
    const countBadge = (active: boolean): React.CSSProperties => ({
      fontSize:10.5,fontWeight:700,color:active?'#F5F0E6':C.muted,background:active?'rgba(245,240,230,0.18)':C.crema,
      borderRadius:20,padding:'2px 8px',
    })

    const sidebarContent = (
      <>
        <button style={filterPill(selectedFilter==='all')} onClick={() => { setSelectedFilter('all'); setMobileDrawerOpen(false) }}>
          <span>Todos los integrantes</span><span style={countBadge(selectedFilter==='all')}>{totalMembers}</span>
        </button>
        <button style={filterPill(selectedFilter==='leaders')} onClick={() => { setSelectedFilter('leaders'); setMobileDrawerOpen(false) }}>
          <span>Líderes</span><span style={countBadge(selectedFilter==='leaders')}>{totalLeaders}</span>
        </button>

        <div style={{borderTop:`0.5px solid ${C.cremaDark}`,margin:'10px 0'}}/>

        {children.length === 0 && teamSections.length === 0 && <p style={{fontSize:12,color:C.muted,padding:'0 10px',marginBottom:8}}>Sin posiciones todavía.</p>}

        {teamSections.map((sec, si) => {
          const secPositions = positions.filter(p => p.team_id === selectedTeamId && p.section_id === sec.id)
          return (
            <div key={sec.id}>
              <div style={{display:'flex',alignItems:'center',gap:0}}>
                <div style={{display:'flex',flexDirection:'column'}}>
                  <button onClick={() => moveSection(sec, 'up')} disabled={si===0} style={{...iconBtn,padding:1,opacity:si===0?0.25:1}} title="Subir sección"><ChevronUp size={12}/></button>
                  <button onClick={() => moveSection(sec, 'down')} disabled={si===teamSections.length-1} style={{...iconBtn,padding:1,opacity:si===teamSections.length-1?0.25:1}} title="Bajar sección"><ChevronDown size={12}/></button>
                </div>
                <p style={{flex:1,fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,padding:'0 10px',margin:0}}>{sec.name}</p>
                <button onClick={() => archiveSection(sec)} style={{...iconBtn,padding:6}} title="Archivar sección"><Archive size={12}/></button>
              </div>
              {secPositions.map((child, i) => {
                const count = memberPositions.filter(mp => mp.team_position_id === child.id).length
                const active = selectedFilter === child.id
                return (
                  <div key={child.id} style={{display:'flex',alignItems:'center',gap:0}}>
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <button onClick={() => movePosition(child, 'up')} disabled={i===0} style={{...iconBtn,padding:1,opacity:i===0?0.25:1}} title="Subir"><ChevronUp size={12}/></button>
                      <button onClick={() => movePosition(child, 'down')} disabled={i===secPositions.length-1} style={{...iconBtn,padding:1,opacity:i===secPositions.length-1?0.25:1}} title="Bajar"><ChevronDown size={12}/></button>
                    </div>
                    <button style={{...filterPill(active),flex:1}} onClick={() => { setSelectedFilter(child.id); setMobileDrawerOpen(false) }}>
                      <span>{child.name}</span><span style={countBadge(active)}>{count}</span>
                    </button>
                    <button onClick={() => archivePosition(child)} style={{...iconBtn,padding:6}} title="Archivar"><Archive size={12}/></button>
                  </div>
                )
              })}
            </div>
          )
        })}

        {unsectioned.length > 0 && (
          <div>
            {teamSections.length > 0 && (
              <p style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,padding:'0 10px',marginBottom:2}}>Sin sección</p>
            )}
            {unsectioned.map((child, i) => {
              const count = memberPositions.filter(mp => mp.team_position_id === child.id).length
              const active = selectedFilter === child.id
              return (
                <div key={child.id} style={{display:'flex',alignItems:'center',gap:0}}>
                  <div style={{display:'flex',flexDirection:'column'}}>
                    <button onClick={() => movePosition(child, 'up')} disabled={i===0} style={{...iconBtn,padding:1,opacity:i===0?0.25:1}} title="Subir"><ChevronUp size={12}/></button>
                    <button onClick={() => movePosition(child, 'down')} disabled={i===unsectioned.length-1} style={{...iconBtn,padding:1,opacity:i===unsectioned.length-1?0.25:1}} title="Bajar"><ChevronDown size={12}/></button>
                  </div>
                  <button style={{...filterPill(active),flex:1}} onClick={() => { setSelectedFilter(child.id); setMobileDrawerOpen(false) }}>
                    <span>{child.name}</span><span style={countBadge(active)}>{count}</span>
                  </button>
                  <button onClick={() => archivePosition(child)} style={{...iconBtn,padding:6}} title="Archivar"><Archive size={12}/></button>
                </div>
              )
            })}
          </div>
        )}

        {alerts}
        <div style={{display:'flex',gap:6,padding:'8px 10px 0'}}>
          <input style={{...input,flex:1}} placeholder="Nueva sección" value={newSectionName}
            onChange={e => { setNewSectionName(e.target.value); setErr(''); setMsg('') }}
            onKeyDown={e => e.key === 'Enter' && addSection()} />
          <button onClick={addSection} disabled={saving || !newSectionName.trim()} style={{...btnDark,opacity:saving||!newSectionName.trim()?0.5:1,padding:'9px 12px'}}>+</button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,padding:'8px 10px 0'}}>
          <input style={input} placeholder="Nombre de la posición" value={newPosName}
            onChange={e => { setNewPosName(e.target.value); if (!codeTouched) setNewPosCode(suggestCode(e.target.value)); setErr(''); setMsg('') }} />
          <div style={{display:'flex',gap:6}}>
            <input style={{...input,flex:1}} placeholder="Código" value={newPosCode}
              onChange={e => { setCodeTouched(true); setNewPosCode(e.target.value) }} />
            <input style={{...input,width:60}} type="number" min={1} value={newPosSlots}
              title="Cupos por servicio"
              onChange={e => setNewPosSlots(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
          {teamSections.length > 0 && (
            <select style={input} value={newPosSectionId} onChange={e => setNewPosSectionId(e.target.value)}>
              <option value="">Sin sección</option>
              {teamSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <button onClick={addPosition} disabled={saving || !newPosName.trim()} style={{...btnDark,opacity:saving||!newPosName.trim()?0.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
            <Plus size={13}/> Añadir posición
          </button>
        </div>
      </>
    )

    const memberPanel = (
      <>
        {detailRows.length === 0 ? (
          <p style={{fontSize:12,color:C.muted,marginBottom:12}}>
            {selectedFilter==='leaders' ? 'Sin líderes asignados a este equipo todavía.' : 'Sin integrantes todavía.'}
          </p>
        ) : (
          <div style={{marginBottom:12}}>
            {detailRows.map(row => {
              const badges = badgesFor(row.id)
              return (
                <div key={row.id} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 0',borderBottom:`0.5px solid ${C.crema}`}}>
                  <button onClick={() => router.push(`/admin?tab=personas&sub=personas&person=${row.member_id}`)}
                    style={{flex:1,minWidth:0,textAlign:'left',background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit'}}>
                    <p style={{fontSize:13,fontWeight:500,color:C.txt}}>{row.member?.nombre} {row.member?.apellido}</p>
                    <p style={{fontSize:11,color:C.muted}}>{row.member?.email}</p>
                    {selectedFilter !== 'leaders' && !isPositionScope && badges.length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
                        {badges.map(b => (
                          <span key={b} style={{fontSize:10,fontWeight:500,color:C.muted,background:C.crema,borderRadius:5,padding:'1px 6px'}}>{b}</span>
                        ))}
                      </div>
                    )}
                  </button>
                  {selectedFilter !== 'leaders' && !isPositionScope && (
                    <select value={row.availability} onChange={e => updateAvailability(row.id, e.target.value as Availability)}
                      style={{...input,fontSize:11,padding:'5px 8px',flexShrink:0}}>
                      {Object.entries(AVAILABILITY_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  )}
                  {!isPositionScope && (
                    <button onClick={() => toggleLeader(row)} style={iconBtn} title={row.is_leader ? 'Quitar liderazgo' : 'Hacer líder'}>
                      <Crown size={15} fill={row.is_leader ? 'currentColor' : 'none'} color={row.is_leader ? C.txt : C.muted}/>
                    </button>
                  )}
                  <button onClick={() => removeRow(row)} style={{...iconBtn,color:'#B91C1C'}} title={selectedFilter==='leaders' ? 'Quitar de líderes' : isPositionScope ? 'Quitar esta posición' : 'Sacar del equipo'}>
                    <X size={15}/>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {selectedFilter !== 'leaders' && (
          <>
            {isPositionScope && availableToAdd.length === 0 && (
              <p style={{fontSize:11,color:C.muted,marginBottom:8}}>
                No hay nadie disponible — solo se puede asignar a esta posición a quien ya sea integrante de "{team.name}".
              </p>
            )}
            <div style={{display:'flex',gap:8}}>
              <select style={{...input,flex:1}} value={addMemberId} onChange={e => setAddMemberId(e.target.value)}>
                <option value="">— Elegir integrante existente —</option>
                {availableToAdd.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
              </select>
              <button onClick={addMemberToTeam} disabled={!addMemberId} style={{...btnDark,opacity:addMemberId?1:0.5}}>Agregar</button>
            </div>
          </>
        )}
      </>
    )

    return (
      <div style={{maxWidth:960,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
        {/* Breadcrumb — jerarquía fija de 2 niveles (equipo → posición), sin anidación */}
        <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:4,marginBottom:12,fontSize:12}}>
          <button onClick={() => setSelectedTeamId(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.muted,fontFamily:'inherit',fontSize:12,fontWeight:600,padding:0}}>Equipos</button>
          <span style={{color:C.muted}}>›</span>
          <span style={{color:C.txt,fontWeight:700}}>{team.name}</span>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
          {/* Header */}
          <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema,display:'flex',alignItems:'center',gap:8}}>
            {isEditingHeader ? (
              <>
                <input style={{...input,flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveTeamRename(team.id)} autoFocus />
                <button onClick={() => saveTeamRename(team.id)} style={{...btnDark,padding:'6px 12px',fontSize:11}}>Guardar</button>
              </>
            ) : (
              <>
                <h2 style={{fontSize:16,fontWeight:700,color:C.txt,flex:1}}>{team.name}</h2>
                <button onClick={() => { setEditingId(team.id); setEditingName(team.name) }} style={iconBtn} title="Renombrar"><Pencil size={14}/></button>
                <button onClick={() => archiveTeam(team)} style={iconBtn} title="Archivar equipo"><Archive size={14}/></button>
              </>
            )}
          </div>

          {/* Desktop: sidebar + panel lado a lado */}
          <div className="hidden md:grid" style={{gridTemplateColumns:'220px 1fr'}}>
            <div style={{padding:'14px 10px',borderRight:`0.5px solid ${C.cremaDark}`,display:'flex',flexDirection:'column',gap:2}}>
              {sidebarContent}
            </div>
            <div style={{padding:16}}>{memberPanel}</div>
          </div>

          {/* Mobile: barra "Viendo: X" + drawer */}
          <div className="md:hidden">
            <button onClick={() => setMobileDrawerOpen(true)}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'none',border:'none',borderBottom:`0.5px solid ${C.cremaDark}`,cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{fontSize:13,fontWeight:600,color:C.txt}}>Viendo: {filterLabel}</span>
              <ChevronDown size={16} color={C.muted}/>
            </button>
            <div style={{padding:16}}>{memberPanel}</div>
          </div>
        </div>

        {/* Drawer mobile — mismo patrón de bottom-sheet que TeamPanel.tsx */}
        {mobileDrawerOpen && (
          <div className="md:hidden" style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end'}}>
            <div onClick={() => setMobileDrawerOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
            <div style={{position:'relative',width:'100%',background:C.card,borderRadius:'16px 16px 0 0',padding:'20px 16px 28px',maxHeight:'80vh',overflowY:'auto'}}>
              <div style={{width:36,height:4,borderRadius:2,background:C.cremaDark,margin:'0 auto 16px'}}/>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>{sidebarContent}</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── VISTA LISTA ──
  return (
    <div style={{maxWidth:720,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Equipos</h2>
          <p style={{fontSize:11,color:C.muted}}>Estructura organizacional — click en un equipo para ver sus posiciones e integrantes.</p>
        </div>

        {teams.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Sin equipos todavía — agrega el primero abajo.</div>
        ) : (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,padding:'8px 16px',borderBottom:`0.5px solid ${C.cremaDark}`}}>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Nombre</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Posiciones</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Líderes</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Integrantes</span>
            </div>
            {teams.map((team, i) => {
              const subCount = positions.filter(p => p.team_id === team.id).length
              const leaderCount = teamMembers.filter(tm => tm.team_id === team.id && tm.is_leader).length
              const memberCount = teamMembers.filter(tm => tm.team_id === team.id).length
              const isEditing = editingId === team.id
              return (
                <div key={team.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:8,alignItems:'center',padding:'10px 16px',borderBottom:`0.5px solid ${C.crema}`}}>
                  {isEditing ? (
                    <div style={{gridColumn:'1 / span 4',display:'flex',gap:8}}>
                      <input style={{...input,flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTeamRename(team.id)} autoFocus />
                      <button onClick={() => saveTeamRename(team.id)} style={{...btnDark,padding:'6px 12px',fontSize:11}}>Guardar</button>
                      <button onClick={() => setEditingId(null)} style={{...iconBtn,fontSize:11}}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => openTeam(team.id)} style={{background:'none',border:'none',textAlign:'left',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:C.txt,padding:0}}>
                        {team.name}
                      </button>
                      <span style={{fontSize:12,color:C.muted}}>{subCount}</span>
                      <span style={{fontSize:12,color:C.muted}}>{leaderCount}</span>
                      <span style={{fontSize:12,color:C.muted}}>{memberCount}</span>
                    </>
                  )}
                  {!isEditing && (
                    <div style={{display:'flex',gap:4,alignItems:'center'}}>
                      <button onClick={() => moveTeam(team, 'up')} disabled={i===0} style={{...iconBtn,opacity:i===0?0.25:1}} title="Subir"><ChevronUp size={13}/></button>
                      <button onClick={() => moveTeam(team, 'down')} disabled={i===teams.length-1} style={{...iconBtn,opacity:i===teams.length-1?0.25:1}} title="Bajar"><ChevronDown size={13}/></button>
                      <button onClick={() => { setEditingId(team.id); setEditingName(team.name) }} style={iconBtn} title="Renombrar"><Pencil size={13}/></button>
                      <button onClick={() => archiveTeam(team)} style={iconBtn} title="Archivar"><Archive size={13}/></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{padding:'14px 16px',borderTop:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          {alerts}
          <p style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Agregar equipo</p>
          <div style={{display:'flex',gap:8,marginBottom:newName.trim()?10:0}}>
            <input style={{...input,flex:1}} placeholder="Nombre del equipo" value={newName}
              onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addTeam(newLeaderIds)} />
            <button onClick={() => addTeam(newLeaderIds)} disabled={saving || !newName.trim()} style={{...btnDark,opacity:saving||!newName.trim()?0.5:1,display:'flex',alignItems:'center',gap:4}}>
              <Plus size={13}/> {saving ? '...' : 'Agregar'}
            </button>
          </div>
          {newName.trim() && (
            <div>
              <p style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:5,textTransform:'uppercase',letterSpacing:0.5}}>Líderes (opcional)</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {allMembers.length === 0 && <span style={{fontSize:11,color:C.muted}}>Sin personas todavía.</span>}
                {allMembers.map(m => {
                  const active = newLeaderIds.includes(m.id)
                  return (
                    <button key={m.id} type="button"
                      onClick={() => setNewLeaderIds(cur => active ? cur.filter(id => id !== m.id) : [...cur, m.id])}
                      style={{fontSize:11,fontWeight:500,padding:'4px 10px',borderRadius:14,border:`0.5px solid ${active?ACCENT:C.cremaDark}`,background:active?ACCENT:'transparent',color:active?'#F5F0E6':C.txt,cursor:'pointer',fontFamily:'inherit'}}>
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
