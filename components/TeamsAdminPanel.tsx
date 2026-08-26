'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Trash2, Plus, Crown, X, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Team, Member } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A'

interface Props { darkMode?: boolean }

interface FlatLink { id: string; member_id: string; team_id: string }
interface DetailRow { id: string; member_id: string; member: Member }
// 'all' = todos los miembros del equipo activo · 'leaders' = líderes del equipo activo ·
// cualquier otro valor = id de una posición (sub-equipo) del equipo activo — filtra sus miembros,
// sin cambiar de equipo activo ni navegar.
type SidebarFilter = 'all' | 'leaders' | string

function getDescendants(teamId: string, flat: Team[]): Team[] {
  const children = flat.filter(t => t.parent_team_id === teamId)
  return children.flatMap(c => [c, ...getDescendants(c.id, flat)])
}

// Camino desde la raíz hasta teamId (inclusive), para el breadcrumb.
function getBreadcrumb(teamId: string, flat: Team[]): Team[] {
  const team = flat.find(t => t.id === teamId)
  if (!team) return []
  if (!team.parent_team_id) return [team]
  return [...getBreadcrumb(team.parent_team_id, flat), team]
}

export default function TeamsAdminPanel({ darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const router = useRouter()
  const searchParams = useSearchParams()

  const [teams, setTeams] = useState<Team[]>([])
  const [teamAdmins, setTeamAdmins] = useState<FlatLink[]>([])
  const [memberships, setMemberships] = useState<FlatLink[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(searchParams.get('team'))
  const [selectedFilter, setSelectedFilter] = useState<SidebarFilter>(searchParams.get('filter') || 'all')
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newName, setNewName] = useState('')
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
    const [teamsRes, adminsRes, membersLinkRes, membersRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, parent_team_id, nombre, created_at').eq('organization_id', DEFAULT_ORGANIZATION_ID).order('nombre'),
      supabase.from('team_admins').select('id, member_id, team_id').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_members').select('id, member_id, team_id').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('members').select('*').order('nombre'),
    ])
    setTeams(teamsRes.data || [])
    setTeamAdmins((adminsRes.data || []) as FlatLink[])
    setMemberships((membersLinkRes.data || []) as FlatLink[])
    setAllMembers(membersRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // 'all'/'leaders' consultan al equipo activo; cualquier otro valor de
  // selectedFilter es el id de una posición (sub-equipo) del equipo activo —
  // se consulta ESA posición, sin que selectedTeamId cambie ni se navegue.
  const loadDetailRows = useCallback(async () => {
    if (!selectedTeamId) { setDetailRows([]); return }
    if (selectedFilter === 'leaders') {
      const { data } = await supabase.from('team_admins').select('id, member_id, member:members(*)').eq('team_id', selectedTeamId)
      setDetailRows((data || []) as any)
      return
    }
    const targetTeamId = selectedFilter === 'all' ? selectedTeamId : selectedFilter
    const { data } = await supabase.from('team_members').select('id, member_id, member:members(*)').eq('team_id', targetTeamId)
    setDetailRows((data || []) as any)
  }, [selectedTeamId, selectedFilter])

  useEffect(() => { loadDetailRows() }, [loadDetailRows])

  async function refresh() { await loadAll(); await loadDetailRows() }

  function openTeam(id: string) { setSelectedTeamId(id); setSelectedFilter('all'); setEditingId(null); setMobileDrawerOpen(false) }

  async function addTeam(parentId: string | null) {
    if (!newName.trim()) return
    setSaving(true); setErr(''); setMsg('')
    const { error } = await supabase.from('teams').insert({
      nombre: newName.trim(),
      parent_team_id: parentId,
      organization_id: DEFAULT_ORGANIZATION_ID,
    })
    if (error) setErr(error.message)
    else { setMsg(`✓ "${newName}" agregado`); setNewName(''); await refresh() }
    setSaving(false)
  }

  async function saveRename(id: string) {
    if (!editingName.trim()) return
    await supabase.from('teams').update({ nombre: editingName.trim() }).eq('id', id)
    setEditingId(null)
    await refresh()
  }

  async function deleteTeam(team: Team) {
    const descendants = getDescendants(team.id, teams)
    const warning = descendants.length
      ? `¿Borrar "${team.nombre}"? También se van a borrar estas ${descendants.length} posición(es):\n\n${descendants.map(d => `— ${d.nombre}`).join('\n')}\n\nLos miembros no se borran, solo quedan sin este equipo.`
      : `¿Borrar "${team.nombre}"?`
    if (!confirm(warning)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) { setErr(error.message); return }
    setMsg(`"${team.nombre}" eliminado`)
    if (team.id === selectedTeamId || descendants.some(d => d.id === selectedTeamId)) setSelectedTeamId(null)
    await refresh()
  }

  // targetTeamId: a qué equipo/posición apuntan "agregar miembro" y "hacer
  // líder" — el equipo activo si el filtro es 'all', o la posición
  // seleccionada si el filtro es el id de una posición. Con 'leaders' no se
  // usa (no hay "agregar" en esa vista).
  function resolveTargetTeamId() {
    return selectedFilter === 'all' || selectedFilter === 'leaders' ? selectedTeamId : selectedFilter
  }

  async function addMemberToTeam() {
    const targetTeamId = resolveTargetTeamId()
    if (!addMemberId || !targetTeamId) return
    const { error } = await supabase.from('team_members').insert({
      member_id: addMemberId, team_id: targetTeamId, organization_id: DEFAULT_ORGANIZATION_ID,
    })
    if (error) setErr(error.message)
    else { setAddMemberId(''); await refresh() }
  }

  async function removeMembership(rowId: string) {
    await supabase.from('team_members').delete().eq('id', rowId)
    await refresh()
  }

  async function removeLeader(rowId: string) {
    await supabase.from('team_admins').delete().eq('id', rowId)
    await refresh()
  }

  async function toggleTeamLeader(memberId: string, teamId: string) {
    const existing = teamAdmins.find(a => a.member_id === memberId && a.team_id === teamId)
    if (existing) await supabase.from('team_admins').delete().eq('id', existing.id)
    else await supabase.from('team_admins').insert({ member_id: memberId, team_id: teamId, organization_id: DEFAULT_ORGANIZATION_ID })
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

  // ── VISTA DETALLE (maestro-detalle: sidebar de posiciones + panel de miembros) ──
  if (selectedTeamId) {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) { setSelectedTeamId(null); return null }
    const children = teams.filter(t => t.parent_team_id === selectedTeamId)
    const isEditingHeader = editingId === team.id
    const targetTeamId = resolveTargetTeamId()
    const assignedIds = new Set(memberships.filter(m => m.team_id === targetTeamId).map(m => m.member_id))
    const availableToAdd = allMembers.filter(m => !assignedIds.has(m.id))
    const totalMembers = memberships.filter(m => m.team_id === selectedTeamId).length
    const totalLeaders = teamAdmins.filter(a => a.team_id === selectedTeamId).length
    const breadcrumb = getBreadcrumb(selectedTeamId, teams)
    const selectedPosition = children.find(c => c.id === selectedFilter)
    const filterLabel = selectedFilter === 'all' ? 'Todos los miembros' : selectedFilter === 'leaders' ? 'Líderes' : (selectedPosition?.nombre || 'Posición')

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
          <span>Todos los miembros</span><span style={countBadge(selectedFilter==='all')}>{totalMembers}</span>
        </button>
        <button style={filterPill(selectedFilter==='leaders')} onClick={() => { setSelectedFilter('leaders'); setMobileDrawerOpen(false) }}>
          <span>Líderes</span><span style={countBadge(selectedFilter==='leaders')}>{totalLeaders}</span>
        </button>

        <div style={{borderTop:`0.5px solid ${C.cremaDark}`,margin:'10px 0'}}/>
        <p style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,padding:'0 10px',marginBottom:6}}>Posiciones</p>

        {children.length === 0 && <p style={{fontSize:12,color:C.muted,padding:'0 10px',marginBottom:8}}>Sin posiciones todavía.</p>}
        {children.map(child => {
          const count = memberships.filter(m => m.team_id === child.id).length
          const active = selectedFilter === child.id
          return (
            <div key={child.id} style={{display:'flex',alignItems:'center',gap:2}}>
              <button style={{...filterPill(active),flex:1}} onClick={() => { setSelectedFilter(child.id); setMobileDrawerOpen(false) }}>
                <span>{child.nombre}</span><span style={countBadge(active)}>{count}</span>
              </button>
              <button onClick={() => deleteTeam(child)} style={{...iconBtn,color:'#B91C1C',padding:6}} title="Borrar"><Trash2 size={12}/></button>
            </div>
          )
        })}

        {alerts}
        <div style={{display:'flex',flexDirection:'column',gap:6,padding:'8px 10px 0'}}>
          <input style={input} placeholder="Nombre de la posición" value={newName}
            onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
            onKeyDown={e => e.key === 'Enter' && addTeam(selectedTeamId)} />
          <button onClick={() => addTeam(selectedTeamId)} disabled={saving || !newName.trim()} style={{...btnDark,opacity:saving||!newName.trim()?0.5:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
            <Plus size={13}/> Añadir posición
          </button>
        </div>
      </>
    )

    const memberPanel = (
      <>
        {detailRows.length === 0 ? (
          <p style={{fontSize:12,color:C.muted,marginBottom:12}}>
            {selectedFilter==='leaders' ? 'Sin líderes asignados a este equipo todavía.' : 'Sin miembros todavía.'}
          </p>
        ) : (
          <div style={{marginBottom:12}}>
            {detailRows.map(row => {
              const isLeader = teamAdmins.some(a => a.member_id === row.member_id && a.team_id === targetTeamId)
              return (
                <div key={row.id} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 0',borderBottom:`0.5px solid ${C.crema}`}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:500,color:C.txt}}>{row.member?.nombre} {row.member?.apellido}</p>
                    <p style={{fontSize:11,color:C.muted}}>{row.member?.email}</p>
                  </div>
                  {targetTeamId && (
                    <button onClick={() => toggleTeamLeader(row.member_id, targetTeamId)} style={iconBtn} title={isLeader ? 'Quitar liderazgo' : 'Hacer líder'}>
                      <Crown size={15} fill={isLeader ? 'currentColor' : 'none'} color={isLeader ? C.txt : C.muted}/>
                    </button>
                  )}
                  <button onClick={() => selectedFilter==='leaders' ? removeLeader(row.id) : removeMembership(row.id)} style={{...iconBtn,color:'#B91C1C'}} title="Quitar del equipo">
                    <X size={15}/>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {selectedFilter !== 'leaders' && (
          <div style={{display:'flex',gap:8}}>
            <select style={{...input,flex:1}} value={addMemberId} onChange={e => setAddMemberId(e.target.value)}>
              <option value="">— Elegir miembro existente —</option>
              {availableToAdd.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
            </select>
            <button onClick={addMemberToTeam} disabled={!addMemberId} style={{...btnDark,opacity:addMemberId?1:0.5}}>Agregar</button>
          </div>
        )}
      </>
    )

    return (
      <div style={{maxWidth:960,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
        {/* Breadcrumb */}
        <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:4,marginBottom:12,fontSize:12}}>
          <button onClick={() => setSelectedTeamId(null)} style={{background:'none',border:'none',cursor:'pointer',color:C.muted,fontFamily:'inherit',fontSize:12,fontWeight:600,padding:0}}>Equipos</button>
          {breadcrumb.map((b, i) => (
            <span key={b.id} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{color:C.muted}}>›</span>
              {i === breadcrumb.length - 1
                ? <span style={{color:C.txt,fontWeight:700}}>{b.nombre}</span>
                : <button onClick={() => setSelectedTeamId(b.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.muted,fontFamily:'inherit',fontSize:12,fontWeight:600,padding:0}}>{b.nombre}</button>}
            </span>
          ))}
        </div>

        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
          {/* Header */}
          <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema,display:'flex',alignItems:'center',gap:8}}>
            {isEditingHeader ? (
              <>
                <input style={{...input,flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveRename(team.id)} autoFocus />
                <button onClick={() => saveRename(team.id)} style={{...btnDark,padding:'6px 12px',fontSize:11}}>Guardar</button>
              </>
            ) : (
              <>
                <h2 style={{fontSize:16,fontWeight:700,color:C.txt,flex:1}}>{team.nombre}</h2>
                <button onClick={() => { setEditingId(team.id); setEditingName(team.nombre) }} style={iconBtn} title="Renombrar"><Pencil size={14}/></button>
                <button onClick={() => deleteTeam(team)} style={{...iconBtn,color:'#B91C1C'}} title="Borrar equipo"><Trash2 size={14}/></button>
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
  const rootTeams = teams.filter(t => !t.parent_team_id)

  return (
    <div style={{maxWidth:720,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
          <h2 style={{fontSize:13,fontWeight:700,color:C.txt,letterSpacing:0.5,textTransform:'uppercase',marginBottom:2}}>Equipos</h2>
          <p style={{fontSize:11,color:C.muted}}>Estructura organizacional — click en un equipo para ver sus posiciones y miembros.</p>
        </div>

        {rootTeams.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Sin equipos todavía — agrega el primero abajo.</div>
        ) : (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,padding:'8px 16px',borderBottom:`0.5px solid ${C.cremaDark}`}}>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Nombre</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Posiciones</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Líderes</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Miembros</span>
            </div>
            {rootTeams.map(team => {
              const subCount = teams.filter(t => t.parent_team_id === team.id).length
              const leaderCount = teamAdmins.filter(a => a.team_id === team.id).length
              const memberCount = memberships.filter(m => m.team_id === team.id).length
              const isEditing = editingId === team.id
              return (
                <div key={team.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:8,alignItems:'center',padding:'10px 16px',borderBottom:`0.5px solid ${C.crema}`}}>
                  {isEditing ? (
                    <div style={{gridColumn:'1 / span 4',display:'flex',gap:8}}>
                      <input style={{...input,flex:1}} value={editingName} onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveRename(team.id)} autoFocus />
                      <button onClick={() => saveRename(team.id)} style={{...btnDark,padding:'6px 12px',fontSize:11}}>Guardar</button>
                      <button onClick={() => setEditingId(null)} style={{...iconBtn,fontSize:11}}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => openTeam(team.id)} style={{background:'none',border:'none',textAlign:'left',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:C.txt,padding:0}}>
                        {team.nombre}
                      </button>
                      <span style={{fontSize:12,color:C.muted}}>{subCount}</span>
                      <span style={{fontSize:12,color:C.muted}}>{leaderCount}</span>
                      <span style={{fontSize:12,color:C.muted}}>{memberCount}</span>
                    </>
                  )}
                  {!isEditing && (
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={() => { setEditingId(team.id); setEditingName(team.nombre) }} style={iconBtn} title="Renombrar"><Pencil size={13}/></button>
                      <button onClick={() => deleteTeam(team)} style={{...iconBtn,color:'#B91C1C'}} title="Borrar"><Trash2 size={13}/></button>
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
          <div style={{display:'flex',gap:8}}>
            <input style={{...input,flex:1}} placeholder="Nombre del equipo" value={newName}
              onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
              onKeyDown={e => e.key === 'Enter' && addTeam(null)} />
            <button onClick={() => addTeam(null)} disabled={saving || !newName.trim()} style={{...btnDark,opacity:saving||!newName.trim()?0.5:1,display:'flex',alignItems:'center',gap:4}}>
              <Plus size={13}/> {saving ? '...' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
