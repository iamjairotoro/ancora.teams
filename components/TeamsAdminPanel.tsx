'use client'
import { useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Plus, ArrowLeft, Crown, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Team, Member } from '@/lib/types'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A'

interface Props { darkMode?: boolean }

interface FlatLink { id: string; member_id: string; team_id: string }
interface DetailRow { id: string; member_id: string; member: Member }

function getDescendants(teamId: string, flat: Team[]): Team[] {
  const children = flat.filter(t => t.parent_team_id === teamId)
  return children.flatMap(c => [c, ...getDescendants(c.id, flat)])
}

export default function TeamsAdminPanel({ darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [teams, setTeams] = useState<Team[]>([])
  const [teamAdmins, setTeamAdmins] = useState<FlatLink[]>([])
  const [memberships, setMemberships] = useState<FlatLink[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [memberFilter, setMemberFilter] = useState<'all' | 'leaders'>('all')
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newName, setNewName] = useState('')
  const [addMemberId, setAddMemberId] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

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

  const loadDetailRows = useCallback(async () => {
    if (!selectedTeamId) { setDetailRows([]); return }
    const table = memberFilter === 'all' ? 'team_members' : 'team_admins'
    const { data } = await supabase.from(table).select('id, member_id, member:members(*)').eq('team_id', selectedTeamId)
    setDetailRows((data || []) as any)
  }, [selectedTeamId, memberFilter])

  useEffect(() => { loadDetailRows() }, [loadDetailRows])

  async function refresh() { await loadAll(); await loadDetailRows() }

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
      ? `¿Borrar "${team.nombre}"? También se van a borrar estos ${descendants.length} sub-equipo(s):\n\n${descendants.map(d => `— ${d.nombre}`).join('\n')}\n\nLos miembros no se borran, solo quedan sin este equipo.`
      : `¿Borrar "${team.nombre}"?`
    if (!confirm(warning)) return
    const { error } = await supabase.from('teams').delete().eq('id', team.id)
    if (error) { setErr(error.message); return }
    setMsg(`"${team.nombre}" eliminado`)
    if (team.id === selectedTeamId || descendants.some(d => d.id === selectedTeamId)) setSelectedTeamId(null)
    await refresh()
  }

  async function addMemberToTeam() {
    if (!addMemberId || !selectedTeamId) return
    const { error } = await supabase.from('team_members').insert({
      member_id: addMemberId, team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID,
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

  async function toggleTeamLeader(memberId: string) {
    if (!selectedTeamId) return
    const existing = teamAdmins.find(a => a.member_id === memberId && a.team_id === selectedTeamId)
    if (existing) await supabase.from('team_admins').delete().eq('id', existing.id)
    else await supabase.from('team_admins').insert({ member_id: memberId, team_id: selectedTeamId, organization_id: DEFAULT_ORGANIZATION_ID })
    await refresh()
  }

  const input: React.CSSProperties = { border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:13,fontFamily:'inherit',outline:'none',color:C.txt,background:C.card }
  const btnDark: React.CSSProperties = { background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'9px 16px',fontSize:12,fontWeight:600,fontFamily:'inherit',cursor:'pointer' }
  const iconBtn: React.CSSProperties = { background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:C.muted }
  const pill = (active:boolean): React.CSSProperties => ({fontSize:11,padding:'6px 14px',borderRadius:20,fontWeight:active?600:400,
    background:active?ACCENT:'transparent',color:active?'#F5F0E6':C.txt,border:`0.5px solid ${active?ACCENT:C.cremaDark}`,cursor:'pointer',fontFamily:'inherit'})

  const alerts = (
    <>
      {msg && <p style={{fontSize:12,color:'#1B4332',background:'#D8F3DC',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{msg}</p>}
      {err && <p style={{fontSize:12,color:'#B91C1C',background:'#FEE2E2',padding:'6px 10px',borderRadius:6,marginBottom:10,fontWeight:500}}>{err}</p>}
    </>
  )

  if (loading) {
    return <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Cargando...</div>
  }

  // ── VISTA DETALLE ──
  if (selectedTeamId) {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) { setSelectedTeamId(null); return null }
    const children = teams.filter(t => t.parent_team_id === selectedTeamId)
    const isEditingHeader = editingId === team.id
    const assignedIds = new Set(memberships.filter(m => m.team_id === selectedTeamId).map(m => m.member_id))
    const availableToAdd = allMembers.filter(m => !assignedIds.has(m.id))

    return (
      <div style={{maxWidth:720,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
        <button onClick={() => setSelectedTeamId(null)} style={{...iconBtn,fontSize:12,marginBottom:12,gap:4}}>
          <ArrowLeft size={14}/> Volver a Equipos
        </button>

        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden',marginBottom:16}}>
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

          {/* Sub-equipos */}
          <div style={{padding:'14px 16px',borderBottom:`0.5px solid ${C.cremaDark}`}}>
            <p style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Sub-equipos</p>
            {children.length === 0 && <p style={{fontSize:12,color:C.muted,marginBottom:8}}>Sin sub-equipos todavía.</p>}
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
              {children.map(child => {
                const count = memberships.filter(m => m.team_id === child.id).length
                return (
                  <button key={child.id} onClick={() => setSelectedTeamId(child.id)}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:20,border:`0.5px solid ${C.cremaDark}`,background:C.crema,cursor:'pointer',fontFamily:'inherit'}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{child.nombre}</span>
                    <span style={{fontSize:10,color:C.muted,background:C.card,borderRadius:10,padding:'1px 6px'}}>{count}</span>
                  </button>
                )
              })}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input style={{...input,flex:1}} placeholder="Nombre del sub-equipo" value={newName}
                onChange={e => { setNewName(e.target.value); setErr(''); setMsg('') }}
                onKeyDown={e => e.key === 'Enter' && addTeam(selectedTeamId)} />
              <button onClick={() => addTeam(selectedTeamId)} disabled={saving || !newName.trim()} style={{...btnDark,opacity:saving||!newName.trim()?0.5:1,display:'flex',alignItems:'center',gap:4}}>
                <Plus size={13}/> Agregar
              </button>
            </div>
          </div>

          {/* Miembros */}
          <div style={{padding:'14px 16px'}}>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button style={pill(memberFilter==='all')} onClick={() => setMemberFilter('all')}>Todos los miembros</button>
              <button style={pill(memberFilter==='leaders')} onClick={() => setMemberFilter('leaders')}>Líderes</button>
            </div>

            {alerts}

            {detailRows.length === 0 ? (
              <p style={{fontSize:12,color:C.muted,marginBottom:12}}>
                {memberFilter==='all' ? 'Sin miembros todavía.' : 'Sin líderes asignados a este equipo todavía.'}
              </p>
            ) : (
              <div style={{marginBottom:12}}>
                {detailRows.map(row => {
                  const isLeader = teamAdmins.some(a => a.member_id === row.member_id && a.team_id === selectedTeamId)
                  return (
                    <div key={row.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:`0.5px solid ${C.crema}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:500,color:C.txt}}>{row.member?.nombre} {row.member?.apellido}</p>
                        <p style={{fontSize:11,color:C.muted}}>{row.member?.email}</p>
                      </div>
                      <button onClick={() => toggleTeamLeader(row.member_id)} style={iconBtn} title={isLeader ? 'Quitar liderazgo' : 'Hacer líder de este equipo'}>
                        <Crown size={15} fill={isLeader ? 'currentColor' : 'none'} color={isLeader ? C.txt : C.muted}/>
                      </button>
                      <button onClick={() => memberFilter==='all' ? removeMembership(row.id) : removeLeader(row.id)} style={{...iconBtn,color:'#B91C1C'}} title="Quitar del equipo">
                        <X size={15}/>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {memberFilter === 'all' && (
              <div style={{display:'flex',gap:8}}>
                <select style={{...input,flex:1}} value={addMemberId} onChange={e => setAddMemberId(e.target.value)}>
                  <option value="">— Elegir miembro existente —</option>
                  {availableToAdd.map(m => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                </select>
                <button onClick={addMemberToTeam} disabled={!addMemberId} style={{...btnDark,opacity:addMemberId?1:0.5}}>Agregar</button>
              </div>
            )}
          </div>
        </div>
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
          <p style={{fontSize:11,color:C.muted}}>Estructura organizacional — click en un equipo para ver sus sub-equipos y miembros.</p>
        </div>

        {rootTeams.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Sin equipos todavía — agrega el primero abajo.</div>
        ) : (
          <div>
            <div className="hidden-mobile" style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:8,padding:'8px 16px',borderBottom:`0.5px solid ${C.cremaDark}`}}>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Nombre</span>
              <span style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:0.5}}>Sub-equipos</span>
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
                      <button onClick={() => setSelectedTeamId(team.id)} style={{background:'none',border:'none',textAlign:'left',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,color:C.txt,padding:0}}>
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
