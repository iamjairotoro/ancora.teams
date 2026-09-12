'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock, Team, TeamPosition, ToolType, TeamTool, ServicePositionSlots } from '@/lib/types'
import PersonasEquiposPanel from '@/components/PersonasEquiposPanel'
import SongsPanel from '@/components/SongsPanel'
import AdminServiceView from '@/components/AdminServiceView'
import EnsayoPanel from '@/components/EnsayoPanel'
import ChatModerationPanel from '@/components/ChatModerationPanel'
import AvailabilityPanel from '@/components/AvailabilityPanel'
import TexBg from '@/components/TexBg'
import Sidebar, { type SidebarItem } from '@/components/Sidebar'
import { useDarkMode } from '@/lib/useDarkMode'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { Calendar, Mic2, Music, CalendarDays, MessageCircle, Users } from 'lucide-react'

type Tab = 'setlist'|'personas'|'canciones'|'ensayo'|'disponibilidad'|'chats'|'ajustes'
const VALID_TABS: Tab[] = ['setlist','personas','canciones','ensayo','disponibilidad','chats','ajustes']

export default function AdminPage() {
  return (
    <Suspense fallback={
      <TexBg className="min-h-screen flex items-center justify-center">
        <div style={{width:36,height:36,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      </TexBg>
    }>
      <AdminPageInner />
    </Suspense>
  )
}

function AdminPageInner() {
  const [memberId, setMemberId] = useState<string|null>(null)
  const { darkMode, toggleDarkMode } = useDarkMode(memberId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') as Tab | null
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState<Tab>(urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'setlist')
  const [portalToken, setPortalToken] = useState<string|null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false)

  const [services, setServices]             = useState<Service[]>([])
  const [members, setMembers]               = useState<Member[]>([])
  const [songs, setSongs]                   = useState<Song[]>([])
  const [selectedService, setSelectedService] = useState<Service|null>(null)
  const [blocks, setBlocks]                 = useState<ServiceBlock[]>([])
  const [bandaItems, setBandaItems]         = useState<BandaAssignment[]>([])
  const [slotsNeeded, setSlotsNeeded]       = useState<ServicePositionSlots[]>([])
  const [dateBlocks, setDateBlocks]         = useState<string[]>([]) // member_ids bloqueados para el servicio seleccionado
  const [invitations, setInvitations]       = useState<Invitation[]>([])
  const [sending, setSending]               = useState(false)
  const [msg, setMsg]                       = useState('')

  // Equipos/posiciones (módulo "Personas y Equipos") — fuente de verdad para
  // el sidebar de Servicio y la elegibilidad de voluntarios (membersFor).
  const [teams, setTeams] = useState<Team[]>([])
  const [teamPositions, setTeamPositions] = useState<TeamPosition[]>([])
  const [teamMembersFlat, setTeamMembersFlat] = useState<{id:string;member_id:string;team_id:string}[]>([])
  const [teamMemberPositions, setTeamMemberPositions] = useState<{team_member_id:string;team_position_id:string}[]>([])
  const [teamTools, setTeamTools] = useState<TeamTool[]>([])

  useEffect(()=>{
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const { data: isOrgAdmin } = await supabase.rpc('is_org_admin', {
        p_email: session.user.email!,
        p_organization_id: DEFAULT_ORGANIZATION_ID,
      })
      if (isOrgAdmin) {
        setAuthed(true)
        const email = session.user.email!
        const { data: member } = await supabase.from('members').select('id').eq('email', email).single()
        if (member) {
          setMemberId(member.id)
          const { data: inv } = await supabase.from('invitations').select('token').eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).single()
          if (inv) setPortalToken(inv.token)
        }
      } else window.location.href = '/login'
    })
  },[])

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('*').order('fecha',{ascending:true})
    setServices(data||[])
    const soloServicios = (data||[]).filter((s:any)=>s.tipo!=='ensayo')
    if(!selectedService && soloServicios.length) {
      const now = new Date()
      const next = soloServicios.find((s:any) => new Date(s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00') > now)
      setSelectedService(next || soloServicios[0])
    }
  },[selectedService])

  const loadMembers = useCallback(async()=>{ const{data}=await supabase.from('members').select('*').order('nombre'); setMembers(data||[]) },[])
  const loadSongs   = useCallback(async()=>{ const{data}=await supabase.from('songs').select('*').order('nombre'); setSongs(data||[]) },[])

  const loadTeamsAndMemberships = useCallback(async () => {
    const [teamsRes, posRes, tmRes, tmpRes, toolsRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_positions').select('id, organization_id, team_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_members').select('id, member_id, team_id').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
      supabase.from('team_tools').select('id, team_id, tool_type, sort_order, created_at'),
    ])
    setTeams(teamsRes.data || [])
    setTeamPositions(posRes.data || [])
    setTeamMembersFlat(tmRes.data || [])
    setTeamMemberPositions(tmpRes.data || [])
    setTeamTools(toolsRes.data || [])
  }, [])

  // Se elige acá, en el armado del servicio — no en Personas y Equipos —
  // porque es acá donde se decide qué herramientas necesita cada equipo
  // para servir un domingo. Un equipo puede tener varias a la vez, incluso
  // repetidas (ej. 2 checklists distintos) — cada una es su propia
  // instancia con sus propios datos.
  async function addTeamTool(teamId: string, toolType: ToolType) {
    const nextOrder = teamTools.filter(t => t.team_id === teamId).length
    await supabase.from('team_tools').insert({ team_id: teamId, tool_type: toolType, sort_order: nextOrder })
    await loadTeamsAndMemberships()
  }

  async function removeTeamTool(teamToolId: string) {
    if (!confirm('¿Quitar esta herramienta? Se borran sus datos para este equipo (plantillas de checklist no se ven afectadas).')) return
    await supabase.from('team_tools').delete().eq('id', teamToolId)
    await loadTeamsAndMemberships()
  }

  const loadService = useCallback(async(svc: Service)=>{
    const [bl, ba, inv, slots] = await Promise.all([
      supabase.from('service_blocks').select('*, song:songs(*), lead:members(nombre)').eq('service_id',svc.id).order('orden'),
      supabase.from('banda_assignments').select('*,member:members(*)').eq('service_id',svc.id),
      supabase.from('invitations').select('*,member:members(*)').eq('service_id',svc.id),
      supabase.from('service_position_slots').select('*').eq('service_id',svc.id),
    ])
    setBlocks(bl.data||[])
    setBandaItems(ba.data||[])
    setInvitations(inv.data||[])
    setSlotsNeeded(slots.data||[])
  },[])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/admin?${params.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(()=>{ if(authed){ loadServices(); loadMembers(); loadSongs(); loadTeamsAndMemberships() }},[authed])
  useEffect(()=>{
    if(selectedService) {
      loadService(selectedService)
      // Cargar bloqueos para este servicio
      supabase.from('date_blocks').select('member_id').eq('service_id', selectedService.id)
        .then(({data})=>setDateBlocks((data||[]).map((b:any)=>b.member_id)))
    }
  },[selectedService])

  async function createService(fecha: string, horaInicio?: string, horaFin?: string) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const titulo=`Servicio Ancora — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const{data}=await supabase.from('services').insert({
      fecha, titulo,
      hora_inicio: horaInicio||'10:00',
      hora_fin: horaFin||'14:00',
    }).select().single()
    if(data){ await loadServices(); setSelectedService(data) }
  }

  async function deleteService(id: string) {
    if(!confirm('¿Eliminar este servicio?')) return
    await fetch('/api/delete-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id})})
    setSelectedService(null); await loadServices()
  }

  async function duplicateService(id: string, newFecha: string) {
    const res=await fetch('/api/duplicate-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id,newFecha})})
    const data=await res.json(); await loadServices()
    const{data:newSvc}=await supabase.from('services').select('*').eq('id',data.serviceId).single()
    if(newSvc) setSelectedService(newSvc)
  }

  // Recibe el id de la posición (no el nombre) — se resuelve acá adentro,
  // en un solo lugar, para que membersFor/getBanda/assignBanda nunca tengan
  // que volver a buscar por nombre (ambiguo si dos equipos tuvieran una
  // posición con el mismo nombre). El valor que se guarda en
  // banda_assignments.posicion sigue siendo el nombre — mismo dato de
  // siempre, solo cambia cómo el código llega a él.
  async function assignBanda(posId: string, memberId: string, slotIndex: number = 1) {
    if(!selectedService) return
    const posName = teamPositions.find(p => p.id === posId)?.name
    if (!posName) return
    // Actualización optimista: el nombre aparece al instante en el <select>,
    // sin esperar la recarga completa del servicio (que antes hacía 3
    // consultas pesadas — incluyendo un viaje extra a /api/service-blocks —
    // y recién ahí mostraba el cambio. Ahora se ve al toque, y la recarga
    // real sigue corriendo atrás para mantener todo sincronizado.
    setBandaItems(prev => {
      const member = memberId ? members.find(m=>m.id===memberId) : undefined
      const existing = prev.find(b=>b.posicion===posName && b.slot_index===slotIndex)
      const updated = { ...(existing||{ id:`temp-${posName}-${slotIndex}`, service_id:selectedService.id, posicion:posName, slot_index:slotIndex }), member_id: memberId||undefined, member }
      return [...prev.filter(b=>!(b.posicion===posName && b.slot_index===slotIndex)), updated as any]
    })
    await supabase.from('banda_assignments').upsert(
      {service_id:selectedService.id,posicion:posName,member_id:memberId||null,slot_index:slotIndex},
      {onConflict:'service_id,posicion,slot_index'}
    )
    loadService(selectedService)
  }

  // Cuántos cupos pide una posición en el servicio activo — 1 por
  // defecto, ajustable con el −/+ (aparece al pasar el mouse).
  function getSlotsNeeded(posId: string): number {
    return slotsNeeded.find(s => s.team_position_id === posId)?.slots_needed || 1
  }
  async function updateSlotsNeeded(posId: string, newCount: number) {
    if (!selectedService || newCount < 1) return
    setSlotsNeeded(prev => {
      const existing = prev.find(s => s.team_position_id === posId)
      const updated = { ...(existing||{ id:`temp-${posId}`, service_id:selectedService.id, team_position_id:posId }), slots_needed:newCount }
      return [...prev.filter(s => s.team_position_id !== posId), updated as any]
    })
    await supabase.from('service_position_slots').upsert(
      { service_id: selectedService.id, team_position_id: posId, slots_needed: newCount },
      { onConflict: 'service_id,team_position_id' }
    )
  }

  // Sin teamId: invita a todos (Resumen ya no usa este caso). Con teamId:
  // invita solo a quienes tengan una posición de ESE equipo asignada —
  // "eso lo vemos por los equipos", cada equipo manda sus propias
  // convocatorias desde su propia pestaña.
  async function sendInvites(teamId?: string) {
    if(!selectedService) return
    setSending(true); setMsg('')
    try {
      const teamPositionNames = teamId ? teamPositions.filter(p => p.team_id === teamId).map(p => p.name) : undefined
      const res=await fetch('/api/send-invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:selectedService.id, teamPositionNames})})
      const data=await res.json(); setMsg(data.message||'Enviadas ✓'); loadService(selectedService)
    } catch { setMsg('Error al enviar.') }
    finally { setSending(false) }
  }

  async function reinvitar(memberId: string) {
    if(!selectedService) return
    setMsg('')
    try {
      const res=await fetch('/api/reassignment-notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,serviceId:selectedService.id})})
      const data=await res.json(); setMsg(data.message||data.error||'Listo'); loadService(selectedService)
    } catch { setMsg('Error al reinvitar.') }
  }

  // Cada equipo del módulo Equipos es una columna del tablero de Servicio;
  // sus posiciones (team_positions) son las filas de esa columna. Sin
  // nombres fijos — cualquier equipo/posición que exista en la base
  // aparece acá tal cual, en el orden real (sort_order) de cada nivel.
  // Cada posición lleva su id además del nombre, para que membersFor/
  // getBanda/assignBanda busquen por id (sin ambigüedad) en vez de por
  // nombre.
  const equipoSections = teams.map(root => ({
    teamId: root.id,
    nombre: root.name,
    tools: teamTools.filter(t => t.team_id === root.id).sort((a,b)=>a.sort_order-b.sort_order),
    posiciones: teamPositions.filter(p => p.team_id === root.id).map(p => ({ id: p.id, nombre: p.name })),
  }))

  function membersFor(posId: string) {
    const tmIds = new Set(teamMemberPositions.filter(tmp => tmp.team_position_id === posId).map(tmp => tmp.team_member_id))
    const memberIds = new Set(teamMembersFlat.filter(tm => tmIds.has(tm.id)).map(tm => tm.member_id))
    return members.filter(m => memberIds.has(m.id))
  }
  function getBanda(posId: string, slotIndex: number = 1) {
    const posName = teamPositions.find(p => p.id === posId)?.name
    return posName ? bandaItems.find(b => b.posicion === posName && b.slot_index === slotIndex) : undefined
  }

  if(!authed) return (
    <TexBg className="min-h-screen flex items-center justify-center">
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'rgba(245,240,230,0.5)',fontSize:13,fontWeight:300}}>Verificando acceso...</p>
      </div>
    </TexBg>
  )

  const TOP_TABS: {t:Tab,label:string}[] = [
    {t:'setlist',label:'Servicio'},
    {t:'ensayo',label:'Ensayo'},
    {t:'canciones',label:'Canciones'},
    {t:'disponibilidad',label:'Calendario'},
  ]
  const ADMIN_TABS: {t:Tab,label:string}[] = [
    {t:'chats',label:'Chats'},
    {t:'personas',label:'Personas'},
  ]
  const isAdminTabActive = ADMIN_TABS.some(x=>x.t===tab)

  const TAB_ICONS: Partial<Record<Tab, SidebarItem['icon']>> = {
    setlist:Calendar, ensayo:Mic2, canciones:Music, disponibilidad:CalendarDays,
    chats:MessageCircle, personas:Users,
  }
  const sidebarItems: SidebarItem[] = TOP_TABS.map(({t,label})=>({key:t,label,icon:TAB_ICONS[t]!,onClick:()=>setTab(t)}))
  const sidebarAdminItems: SidebarItem[] = ADMIN_TABS.map(({t,label})=>({key:t,label,icon:TAB_ICONS[t]!,onClick:()=>setTab(t)}))

  return (
    <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--legacy-page-bg)',fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div className="admin-shell">
        {/* ── SIDEBAR (solo escritorio) ── */}
        <div className="admin-sidebar-slot">
          <Sidebar
            items={sidebarItems}
            adminItems={sidebarAdminItems}
            active={tab}
            orgName="Iglesia Áncora"
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
          {portalToken && (
            <a href={`/portal/${portalToken}`} target="_blank"
              style={{position:'absolute',bottom:64,left:14,right:14,textAlign:'center',fontSize:11,fontWeight:600,
                color:'var(--ink-2)',textDecoration:'none',padding:'6px 0'}}>
              Ver mi portal ↗
            </a>
          )}
        </div>

        <div>
          {/* ── NAVBAR mobile ── */}
          <div className="admin-topbar-slot">
            <div className="z-30 shadow-lg" style={{
              position:'sticky', top:0,
              background:'#1A1A1A',
            }}>
              <header style={{height:56,display:'flex',alignItems:'center',padding:'0 16px',justifyContent:'space-between',gap:12}}>
                {/* Logo */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
                  <img src="/logo-icon-cream.png" alt="Áncora" style={{height:30,width:'auto',objectFit:'contain'}}/>
                </div>

                {/* Mobile: tab activo + hamburguesa */}
                <div style={{display:'flex',alignItems:'center',gap:10,flex:1,justifyContent:'flex-end'}}>
                  <span style={{fontSize:11,fontWeight:600,color:'rgba(245,240,230,0.8)',letterSpacing:0.3}}>
                    {[...TOP_TABS,...ADMIN_TABS].find(x=>x.t===tab)?.label}
                  </span>
                  <button onClick={()=>setMobileMenuOpen(v=>!v)}
                    style={{display:'flex',flexDirection:'column',gap:5,background:'none',border:'none',cursor:'pointer',padding:4}}>
                    <span style={{width:20,height:2,background:'rgba(245,240,230,0.85)',borderRadius:2,display:'block'}}/>
                    <span style={{width:20,height:2,background:'rgba(245,240,230,0.85)',borderRadius:2,display:'block'}}/>
                    <span style={{width:20,height:2,background:'rgba(245,240,230,0.85)',borderRadius:2,display:'block'}}/>
                  </button>
                </div>
              </header>
            </div>

            {/* Dropdown mobile */}
            {mobileMenuOpen&&(
              <div style={{position:'fixed',top:56,right:0,zIndex:100,width:230}}>
                <div onClick={()=>setMobileMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:98,background:'transparent'}}/>
                <div style={{position:'relative',zIndex:99,background:'#1A1A1A',padding:'6px 0',boxShadow:'0 8px 24px rgba(0,0,0,0.5)',borderRadius:'0 0 0 12px',maxHeight:'calc(100vh - 56px)',overflowY:'auto'}}>
                  {TOP_TABS.map(({t,label})=>(
                    <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                      style={{width:'100%',textAlign:'left',padding:'11px 18px',fontSize:13,fontWeight:tab===t?600:400,background:tab===t?'rgba(245,240,230,0.1)':'none',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.8)',border:'none',cursor:'pointer',fontFamily:'inherit',borderLeft:tab===t?'3px solid #C9A14A':'3px solid transparent'}}>
                      {label}
                    </button>
                  ))}

                  <div style={{borderTop:'0.5px solid rgba(245,240,230,0.1)',margin:'5px 0'}}/>

                  <button onClick={()=>setMobileAdminOpen(v=>!v)}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',padding:'11px 18px',fontSize:13,fontWeight:isAdminTabActive?600:400,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:isAdminTabActive?'#F5F0E6':'rgba(245,240,230,0.8)',borderLeft:isAdminTabActive?'3px solid #C9A14A':'3px solid transparent'}}>
                    <span>Admin</span>
                    <span style={{fontSize:10,transition:'transform 0.15s',transform:(mobileAdminOpen||isAdminTabActive)?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
                  </button>
                  {(mobileAdminOpen||isAdminTabActive)&&ADMIN_TABS.map(({t,label})=>(
                    <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                      style={{width:'100%',textAlign:'left',padding:'9px 18px 9px 32px',fontSize:12,fontWeight:tab===t?600:400,background:tab===t?'rgba(245,240,230,0.1)':'none',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.7)',border:'none',cursor:'pointer',fontFamily:'inherit',borderLeft:tab===t?'3px solid #C9A14A':'3px solid transparent'}}>
                      {label}
                    </button>
                  ))}

                  <div style={{borderTop:'0.5px solid rgba(245,240,230,0.1)',margin:'5px 0'}}/>
                  <button onClick={toggleDarkMode}
                    style={{width:'100%',textAlign:'left',padding:'11px 18px',fontSize:13,color:'rgba(245,240,230,0.8)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    {darkMode?'☀️ Modo claro':'🌙 Modo oscuro'}
                  </button>
                  {portalToken && (
                    <a href={`/portal/${portalToken}`} target="_blank" onClick={()=>setMobileMenuOpen(false)}
                      style={{display:'block',padding:'11px 18px',fontSize:13,color:'rgba(245,240,230,0.8)',textDecoration:'none'}}>
                      👤 Mi portal
                    </a>
                  )}
                  <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
                    style={{width:'100%',textAlign:'left',padding:'11px 18px',fontSize:13,color:'rgba(245,240,230,0.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── barra superior de escritorio: salir ── */}
          <div className="admin-desktop-only" style={{justifyContent:'flex-end',padding:'14px 16px 0'}}>
            <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
              style={{fontSize:11,color:'var(--ink-3)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Salir
            </button>
          </div>

          {/* ── CONTENT ── */}
          <div style={{maxWidth:1200,margin:'0 auto',padding:'16px',paddingBottom:32}}>
        {tab==='setlist' && (
          <AdminServiceView
            services={services.filter(s=>(s as any).tipo!=='ensayo')} selectedService={selectedService}
            setSelectedService={setSelectedService} createService={createService}
            deleteService={deleteService} duplicateService={duplicateService}
            members={members} songs={songs} blocks={blocks} setBlocks={setBlocks}
            bandaItems={bandaItems} invitations={invitations}
            membersFor={membersFor} getBanda={getBanda}
            assignBanda={assignBanda}
            getSlotsNeeded={getSlotsNeeded} updateSlotsNeeded={updateSlotsNeeded}
            sendInvites={sendInvites} sending={sending} msg={msg}
            reinvitar={reinvitar}
            onBlocksChange={()=>selectedService&&loadService(selectedService)}
            equipoSections={equipoSections}
            addTeamTool={addTeamTool}
            removeTeamTool={removeTeamTool}
            dateBlocks={dateBlocks}
            darkMode={darkMode}
          />
        )}
        {tab==='personas'      && <PersonasEquiposPanel members={members} onRefreshMembers={loadMembers} darkMode={darkMode} />}
        {tab==='canciones'        && <SongsPanel songs={songs} onRefresh={loadSongs} />}
        {tab==='ensayo'           && <EnsayoPanel members={members} songs={songs} darkMode={darkMode} />}
        {tab==='disponibilidad'   && <AvailabilityPanel services={services} darkMode={darkMode} />}
        {tab==='chats'            && <ChatModerationPanel darkMode={darkMode} />}
          </div>
        </div>
      </div>
    </div>
  )
}
