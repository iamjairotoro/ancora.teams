'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Crown, ArrowLeft, X, Plus, MoreHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Member, Team, TeamPosition, Availability } from '@/lib/types'
import AvatarUpload from './AvatarUpload'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { usePersonDrawer } from './persona/PersonDrawer'
import AddPersonDialog, { PersonToast, type NewPersonPayload, type SubmitResult, type MembersChangedInfo } from './AddPersonDialog'
import PositionChips from './PositionChips'
import { TeamMono } from './TeamColor'
import { buildPositionIndex } from '@/lib/personPositions'

const AVAILABILITY_LABEL: Record<Availability, string> = {
  unrestricted: 'Sin restricción',
  monthly_max_1: 'Máximo 1 vez al mes',
  monthly_max_2: 'Máximo 2 veces al mes',
  on_request: 'Solo a pedido',
}

interface Props {
  members: Member[]
  onRefresh: () => void
  // PersonasPanel registra acá la acción de alta (abre el formulario de
  // "Nuevo integrante"): su botón primario del encabezado es el único
  // "Agregar persona" — el que vivía en el cuerpo de esta pestaña se sacó.
  onRequestNew?: (trigger: () => void) => void
  // Punto 39: avisa al padre de cualquier cambio que afecte a las listas de
  // personas o de equipos. Si no se pasa, el alta/edición/borrado se limita
  // a onRefresh (solo members), como antes.
  onMembersChanged?: (info?: MembersChangedInfo) => void
}

interface FlatTeamMember { id: string; member_id: string; team_id: string; is_leader: boolean; availability: Availability }
interface FlatLink { team_member_id: string; team_position_id: string }
interface ProfileCard { teamMemberId: string; team: Team; isLeader: boolean; availability: Availability; badges: { positionId: string; label: string }[] }

export default function TeamPanel({ members, onRefresh, onRequestNew, onMembersChanged }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { open, edit } = usePersonDrawer()

  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set())
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsStatus, setTeamsStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [positions, setPositions] = useState<TeamPosition[]>([])
  const [teamMembers, setTeamMembers] = useState<FlatTeamMember[]>([])
  const [memberPositions, setMemberPositions] = useState<FlatLink[]>([])
  // Posiciones por persona, agrupadas por equipo: un solo recorrido de las
  // listas que ya se cargan, sin consultas por fila.
  const positionIndex = useMemo(
    () => buildPositionIndex({ teams, positions, teamMembers, memberPositions }),
    [teams, positions, teamMembers, memberPositions],
  )

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(searchParams.get('person'))
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null)
  const [addingTeam, setAddingTeam] = useState(false)
  const [pickRootId, setPickRootId] = useState('')
  const [pickPosId, setPickPosId] = useState('')

  // Cambió una persona: recarga completa si el padre la ofrece, si no solo members.
  function peopleChanged() { if (onMembersChanged) onMembersChanged(); else onRefresh() }

  // Alta: el botón primario del encabezado de PersonasPanel (único "Agregar
  // persona" de la pestaña) abre el pop-up. La edición vive en /admin (mismo
  // pop-up, modo edición): acá solo se la pide con edit() del PersonDrawer.
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')
  useEffect(() => { onRequestNew?.(() => setAdding(true)) }, [onRequestNew])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // Mantiene la URL sincronizada con el perfil abierto, preservando el
  // resto de los params (tab/sub) — mismo mecanismo ya usado en
  // TeamsAdminPanel.tsx para el equipo seleccionado.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedProfileId) params.set('person', selectedProfileId)
    else params.delete('person')
    router.replace(`/admin?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfileId])

  // El botón "Editar" del PersonDrawer global navega a ?person=<id> — si
  // esta pantalla ya estaba montada (el usuario ya estaba en Personas), el
  // useState de arriba no lo recoge solo porque no hay remount. Este efecto
  // sincroniza en el otro sentido cuando cambia por fuera.
  useEffect(() => {
    const fromUrl = searchParams.get('person')
    if (fromUrl && fromUrl !== selectedProfileId) setSelectedProfileId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const loadMemberTeams = useCallback(async () => {
    const [teamsRes, posRes, tmRes, mpRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, description, sort_order, archived_at, color, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null),
      supabase.from('team_positions').select('id, organization_id, team_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null),
      supabase.from('team_members').select('id, member_id, team_id, is_leader, availability').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
    ])
    setTeams(teamsRes.data || [])
    setTeamsStatus(teamsRes.error ? 'error' : 'ready')
    setPositions(posRes.data || [])
    setTeamMembers((tmRes.data || []) as FlatTeamMember[])
    setMemberPositions((mpRes.data || []) as FlatLink[])
  }, [])

  function teamName(id: string): string {
    return teams.find(t => t.id === id)?.name || ''
  }

  function permissionsLabel(m: Member): string {
    if (adminEmails.has((m.email || '').toLowerCase())) return 'Administrador'
    const rows = teamMembers.filter(tm => tm.member_id === m.id)
    const leaderOf = rows.filter(tm => tm.is_leader)
    if (leaderOf.length) {
      const rest = leaderOf.length > 1 ? ` +${leaderOf.length - 1}` : ''
      return `Líder de ${teamName(leaderOf[0].team_id)}${rest}`
    }
    if (rows.length) {
      const rest = rows.length > 1 ? ` +${rows.length - 1}` : ''
      return `Miembro de ${teamName(rows[0].team_id)}${rest}`
    }
    return '—'
  }

  const loadAdmins = useCallback(async () => {
    // team_admins con team_id null = admin global de la organización
    // (gate de login). No relacionado a los líderes de equipo, que ahora
    // viven en team_members.is_leader.
    const { data } = await supabase
      .from('team_admins')
      .select('member:members(email)')
      .is('team_id', null)
      .eq('organization_id', DEFAULT_ORGANIZATION_ID)
    setAdminEmails(new Set(
      (data || []).map((a: any) => a.member?.email?.toLowerCase()).filter(Boolean)
    ))
  }, [])

  useEffect(() => { loadAdmins(); loadMemberTeams() }, [loadAdmins, loadMemberTeams])

  async function toggleAdmin(member: Member) {
    if (!member.email) return
    const email = member.email.toLowerCase()
    setTogglingAdmin(member.id)
    if (adminEmails.has(email)) {
      if (adminEmails.size <= 1) { alert('Debe haber al menos un administrador.'); setTogglingAdmin(null); return }
      if (!confirm(`¿Quitar a ${member.nombre} como administrador?`)) { setTogglingAdmin(null); return }
      await supabase.from('team_admins').delete()
        .eq('member_id', member.id).is('team_id', null).eq('organization_id', DEFAULT_ORGANIZATION_ID)
    } else {
      if (!confirm(`¿Hacer a ${member.nombre} administrador? Podrá entrar a este panel con su cuenta Google.`)) { setTogglingAdmin(null); return }
      await supabase.from('team_admins').insert({
        member_id: member.id, team_id: null, organization_id: DEFAULT_ORGANIZATION_ID,
      })
    }
    await loadAdmins()
    await loadMemberTeams()
    setTogglingAdmin(null)
  }

  // Alta desde el pop-up. Mismo insert de siempre en `members` (devolviendo
  // el error de la base en vez de ignorarlo: duplicado 23505, RLS, red) y,
  // si se eligieron equipos, UN solo insert de varias filas en team_members
  // (todo o nada, sin posiciones: se asignan después desde Equipos). Si la
  // persona se crea pero los equipos fallan, se informa como parcial.
  async function addPerson(payload: NewPersonPayload, teamIds: string[]): Promise<SubmitResult> {
    const { data, error } = await supabase.from('members').insert(payload).select('id').single()
    if (error || !data) return { status: 'error', error: { code: error?.code, message: error?.message || 'No se pudo guardar. Intentá de nuevo.' } }
    if (teamIds.length) {
      const { error: tmErr } = await supabase.from('team_members').insert(
        teamIds.map(team_id => ({ member_id: data.id, team_id, organization_id: DEFAULT_ORGANIZATION_ID })),
      )
      if (tmErr) return { status: 'partial', teams: teamIds.map(id => ({ id, name: teams.find(t => t.id === id)?.name || '' })) }
    }
    return { status: 'ok' }
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este integrante?')) return
    await supabase.from('members').delete().eq('id', id)
    if (selectedProfileId === id) setSelectedProfileId(null)
    peopleChanged()
  }

  async function removeBadge(teamMemberId: string, positionId: string) {
    await supabase.from('team_member_positions').delete().eq('team_member_id', teamMemberId).eq('team_position_id', positionId)
    await loadMemberTeams()
    onMembersChanged?.()
  }

  async function leaveTeam(teamMemberId: string, teamLabel: string) {
    if (!confirm(`¿Salir de "${teamLabel}"? También se pierden sus posiciones asignadas ahí.`)) return
    await supabase.from('team_members').delete().eq('id', teamMemberId)
    await loadMemberTeams()
    onMembersChanged?.()
  }

  async function updateAvailability(teamMemberId: string, availability: Availability) {
    await supabase.from('team_members').update({ availability }).eq('id', teamMemberId)
    await loadMemberTeams()
    onMembersChanged?.()
  }

  async function confirmAddToTeam() {
    if (!selectedProfileId || !pickRootId) return
    let tmId: string
    const existing = teamMembers.find(tm => tm.member_id === selectedProfileId && tm.team_id === pickRootId)
    if (existing) {
      tmId = existing.id
    } else {
      const { data, error } = await supabase.from('team_members').insert({
        member_id: selectedProfileId, team_id: pickRootId, organization_id: DEFAULT_ORGANIZATION_ID,
      }).select().single()
      if (error || !data) return
      tmId = data.id
    }
    if (pickPosId) {
      await supabase.from('team_member_positions').insert({ team_member_id: tmId, team_position_id: pickPosId })
    }
    setAddingTeam(false); setPickRootId(''); setPickPosId('')
    await loadMemberTeams()
    onMembersChanged?.()
  }

  const rootTeams = teams
  const pickPositions = positions.filter(p => p.team_id === pickRootId)

  const profileMember = selectedProfileId ? members.find(m => m.id === selectedProfileId) : null
  const profileCards: ProfileCard[] = (() => {
    if (!profileMember) return []
    return teamMembers
      .filter(tm => tm.member_id === profileMember.id)
      .map(tm => {
        const team = teams.find(t => t.id === tm.team_id)
        if (!team) return null
        const badges = memberPositions
          .filter(mp => mp.team_member_id === tm.id)
          .map(mp => ({ positionId: mp.team_position_id, label: positions.find(p => p.id === mp.team_position_id)?.name || '' }))
        return { teamMemberId: tm.id, team, isLeader: tm.is_leader, availability: tm.availability, badges }
      })
      .filter(Boolean) as ProfileCard[]
  })()

  const avatarFor = (m: Member) => (
    <div style={{width:32,height:32,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      {m.avatar_url
        ? <img src={m.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={m.nombre}/>
        : <span style={{fontFamily:'inherit',fontWeight:700,fontSize:11,color:'#F5F0E6'}}>{m.nombre?.[0]}{m.apellido?.[0]||''}</span>
      }
    </div>
  )

  return (
    <div className="space-y-4">
      {!selectedProfileId && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-white/40">
            {members.length} integrante{members.length !== 1 ? 's' : ''}
            <span className="text-gray-300 dark:text-white/20"> · </span>
            <span title="Detectado cuando abren la app desde el ícono agregado a su pantalla de inicio">
              📲 {members.filter(m=>m.instalado_pwa_at).length} con la app instalada
            </span>
          </p>
        </div>
      )}

      {adding && (
        <AddPersonDialog
          existingEmails={members.map(m => m.email || '')}
          teams={[...teams].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'es')).map(t => ({ id: t.id, name: t.name }))}
          teamsStatus={teamsStatus}
          onSubmit={addPerson}
          onSaved={name => { peopleChanged(); setToast(`Se agregó ${name}`) }}
          onPartial={info => { if (onMembersChanged) onMembersChanged({ partialTeamFailure: info }); else onRefresh() }}
          onClose={() => setAdding(false)}
        />
      )}
      <PersonToast message={toast} />

      {profileMember ? (
        /* ── VISTA DE PERFIL ── */
        <div className="space-y-4">
          <button onClick={() => setSelectedProfileId(null)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/40" style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
            <ArrowLeft size={14}/> Volver a Personas
          </button>

          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div style={{width:48,height:48,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {profileMember.avatar_url
                  ? <img src={profileMember.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={profileMember.nombre}/>
                  : <span style={{fontFamily:'inherit',fontWeight:700,fontSize:16,color:'#F5F0E6'}}>{profileMember.nombre?.[0]}{profileMember.apellido?.[0]||''}</span>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[16px] dark:text-[#F5F0E6] truncate">{profileMember.nombre} {profileMember.apellido}</p>
                <p className="text-[12px] text-gray-500 dark:text-white/40 truncate">{profileMember.email}</p>
                {profileMember.telefono && <p className="text-[12px] text-gray-500 dark:text-white/40">{profileMember.telefono}</p>}
              </div>
              <button type="button" onClick={() => toggleAdmin(profileMember)} disabled={togglingAdmin===profileMember.id || !profileMember.email}
                title={adminEmails.has((profileMember.email||'').toLowerCase()) ? 'Quitar como administrador' : 'Hacer administrador'}
                className={adminEmails.has((profileMember.email||'').toLowerCase()) ? 'text-[#1A1A1A] dark:text-[#F5F0E6]' : 'text-gray-300 dark:text-white/20'}
                style={{background:'none',border:'none',opacity:togglingAdmin===profileMember.id?0.4:1,flexShrink:0}}>
                <Crown size={20} strokeWidth={1.8} color="currentColor" fill={adminEmails.has((profileMember.email||'').toLowerCase())?'currentColor':'none'}/>
              </button>
            </div>

            {positionIndex.get(profileMember.id) && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 mb-1.5">Posiciones</p>
                <div className="mb-3"><PositionChips groups={positionIndex.get(profileMember.id)} /></div>
              </>
            )}

            <div className="flex gap-2">
              <a href={`/portal/member_${profileMember.id}`} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-center text-sm" style={{padding:'8px 0',borderRadius:8,background:'rgba(0,0,0,0.04)',textDecoration:'none'}}>🔗 Portal</a>
              <button type="button" onClick={() => edit(profileMember.id)}
                className="flex-1 text-sm" style={{padding:'8px 0',borderRadius:8,background:'rgba(0,0,0,0.04)',border:'none'}}>✏️ Editar</button>
              {/* Eliminar es destructiva: va en el ⋯, nunca suelta en la barra
                  (punto 2/13 de PENDIENTES-code.md). Reusa el mismo patrón
                  anc-rowMore/anc-rowMenu + openRowMenuId de las filas de abajo,
                  con la clave 'profile-header' porque no hay fila que la dueñe. */}
              <div style={{position:'relative'}}>
                <button type="button" className="anc-rowMore" style={{opacity:1}} aria-label="Más acciones del perfil"
                  onClick={() => setOpenRowMenuId(cur => cur==='profile-header' ? null : 'profile-header')}>
                  <MoreHorizontal size={16}/>
                </button>
                {openRowMenuId==='profile-header' && (
                  <>
                    <div onClick={() => setOpenRowMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                    <div className="anc-rowMenu">
                      <button className="anc-rowMenuDanger" onClick={() => { del(profileMember.id); setOpenRowMenuId(null) }}>Eliminar</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-navy dark:text-[#F5F0E6]">Equipos</h3>
              <button onClick={() => setAddingTeam(v => !v)} className="anc-btn anc-btn--accent">
                <Plus size={14}/> Agregar a equipo
              </button>
            </div>

            {addingTeam && (
              <div className="p-3 mb-3 rounded-lg border border-black/10 dark:border-white/10 space-y-2">
                <select className="input" value={pickRootId} onChange={e => { setPickRootId(e.target.value); setPickPosId('') }}>
                  <option value="">— Elegir equipo —</option>
                  {rootTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {pickRootId && (
                  <select className="input" value={pickPosId} onChange={e => setPickPosId(e.target.value)}>
                    <option value="">— General (sin posición específica) —</option>
                    {pickPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmAddToTeam} disabled={!pickRootId} className="btn-primary text-sm">Agregar</button>
                  <button onClick={() => { setAddingTeam(false); setPickRootId(''); setPickPosId('') }} className="btn-secondary text-sm">Cancelar</button>
                </div>
              </div>
            )}

            {profileCards.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-white/30">Sin equipos asignados todavía.</p>
            )}
            <div className="space-y-3">
              {profileCards.map(card => (
                <div key={card.teamMemberId} className="p-3 rounded-lg border border-black/10 dark:border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-sm dark:text-[#F5F0E6] flex items-center gap-1.5">
                      <TeamMono name={card.team.name} color={card.team.color} />
                      {card.team.name}
                      {card.isLeader && <span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-1.5 py-0.5 rounded">Líder</span>}
                    </p>
                    <button onClick={() => leaveTeam(card.teamMemberId, card.team.name)} className="text-[11px] text-gray-400 dark:text-white/30" style={{background:'none',border:'none',cursor:'pointer'}}>
                      Salir del equipo
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {card.badges.length === 0 && <span className="text-[11px] text-gray-400 dark:text-white/30">General — sin posición específica</span>}
                    {card.badges.map(b => (
                      <span key={b.positionId} className="flex items-center gap-1 text-[11px] font-medium bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20 px-2 py-1 rounded">
                        {b.label}
                        <button onClick={() => removeBadge(card.teamMemberId, b.positionId)} title="Quitar" style={{background:'none',border:'none',cursor:'pointer',display:'flex',color:'inherit'}}>
                          <X size={12}/>
                        </button>
                      </span>
                    ))}
                  </div>
                  <select value={card.availability} onChange={e => updateAvailability(card.teamMemberId, e.target.value as Availability)}
                    className="input" style={{fontSize:11,padding:'5px 8px',width:'auto'}}>
                    {Object.entries(AVAILABILITY_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── TABLA DE PERSONAS ── */
        <div className="card overflow-hidden">
          {members.length === 0 && (
            <p className="p-4 text-sm text-gray-400 dark:text-white/30">Sin integrantes. Agrega el primero.</p>
          )}
          {members.length > 0 && (
            <>
              {/* Header — solo desktop */}
              <div className="hidden md:grid md:grid-cols-[2fr_1.2fr_1.1fr_1.1fr_0.6fr_0.8fr] gap-3 px-4 py-2 border-b border-gray-100 dark:border-white/5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Participante</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Posiciones</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Permisos</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Última conexión</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 text-center">Admin</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30 text-right">Acciones</span>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-white/5">
                {members.map(m => {
                  const isAdmin = !!m.email && adminEmails.has(m.email.toLowerCase())
                  const avatar = avatarFor(m)
                  const lastSeen = m.last_seen ? (
                    <p className="text-[11px] text-gray-500 dark:text-white/40 flex items-center gap-1.5">
                      <span style={{width:6,height:6,borderRadius:'50%',background:'#52B788',flexShrink:0}}/>
                      {new Date(m.last_seen).toLocaleDateString('es-CL',{day:'numeric',month:'short'})} · {new Date(m.last_seen).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}
                      {m.instalado_pwa_at && <span title="Tiene la app instalada en su celular">📲</span>}
                    </p>
                  ) : <p className="text-[11px] text-gray-300 dark:text-white/20">Sin conexión aún</p>
                  const adminBtn = (
                    <button type="button" onClick={() => toggleAdmin(m)} disabled={togglingAdmin===m.id || !m.email}
                      title={isAdmin ? 'Quitar como administrador' : 'Hacer administrador'}
                      className={isAdmin ? 'text-[#1A1A1A] dark:text-[#F5F0E6]' : 'text-gray-300 dark:text-white/20'}
                      style={{background:'none',border:'none',cursor:m.email?'pointer':'default',opacity:togglingAdmin===m.id?0.4:1,lineHeight:1,display:'flex'}}>
                      <Crown size={16} strokeWidth={1.8} color="currentColor" fill={isAdmin?'currentColor':'none'}/>
                    </button>
                  )
                  const actions = (
                    <div style={{position:'relative'}}>
                      <button type="button" className="anc-rowMore" aria-label={`Acciones para ${m.nombre}`}
                        onClick={() => setOpenRowMenuId(cur => cur===m.id ? null : m.id)}>
                        <MoreHorizontal size={16}/>
                      </button>
                      {openRowMenuId===m.id && (
                        <>
                          <div onClick={() => setOpenRowMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                          <div className="anc-rowMenu">
                            <button onClick={() => window.open(`/portal/member_${m.id}`,'_blank')}>Ver portal</button>
                            <div className="anc-rowMenuSep"/>
                            <button className="anc-rowMenuDanger" onClick={() => { del(m.id); setOpenRowMenuId(null) }}>Eliminar</button>
                          </div>
                        </>
                      )}
                    </div>
                  )

                  return (
                    <div key={m.id}>
                      {/* Desktop row */}
                      <div className="hidden md:grid md:grid-cols-[2fr_1.2fr_1.1fr_1.1fr_0.6fr_0.8fr] gap-3 items-center px-4 py-2.5" data-anc-row>
                        <button type="button" onClick={() => open(m.id)}
                          className="flex items-center gap-2.5 min-w-0 text-left" style={{background:'none',border:'none',cursor:'pointer',padding:0}}>
                          {avatar}
                          <div className="min-w-0">
                            <p className="font-medium text-[13px] dark:text-[#F5F0E6] truncate">{m.nombre} {m.apellido}</p>
                            <p className="text-[11px] text-gray-500 dark:text-white/40 truncate">{m.email}</p>
                            {m.fecha_nacimiento && (
                              <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">
                                Nac. {new Date(m.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})}
                              </p>
                            )}
                          </div>
                        </button>
                        <div className="min-w-0"><PositionChips groups={positionIndex.get(m.id)} max={3} /></div>
                        <p className="text-[11px] text-gray-500 dark:text-white/40 truncate">{permissionsLabel(m)}</p>
                        <div>{lastSeen}</div>
                        <div className="flex justify-center">{adminBtn}</div>
                        <div className="flex justify-end">{actions}</div>
                      </div>

                      {/* Mobile row — toca para abrir el panel de persona */}
                      <button type="button" onClick={()=>open(m.id)}
                        className="md:hidden w-full flex items-center gap-2.5 px-4 py-3 text-left" style={{background:'none',border:'none'}}>
                        {avatar}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[13px] dark:text-[#F5F0E6] truncate">{m.nombre} {m.apellido}</p>
                        </div>
                        {isAdmin && <Crown size={13} strokeWidth={1.8} color="currentColor" fill="currentColor" className="text-[#1A1A1A] dark:text-[#F5F0E6] flex-shrink-0"/>}
                        <span className="text-gray-300 dark:text-white/20 flex-shrink-0" style={{fontSize:14}}>›</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
