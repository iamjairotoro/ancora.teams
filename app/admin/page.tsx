'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock, Team, TeamSection, TeamPosition, ToolType, TeamTool, ServicePositionSlots, Availability } from '@/lib/types'
import type { PersonDetail, PersonTeam, ServiceHistoryEntry } from '@/components/persona/PersonDrawer'
import TeamPanel from '@/components/TeamPanel'
import TeamsAdminPanel from '@/components/TeamsAdminPanel'
import CancionesPanel from '@/components/canciones/CancionesPanel'
import AdminServiceView from '@/components/AdminServiceView'
import ChatModerationPanel from '@/components/ChatModerationPanel'
import AdminsPanel from '@/components/AdminsPanel'
import AvailabilityPanel from '@/components/AvailabilityPanel'
import TexBg from '@/components/TexBg'
import AppShell, { type ShellNavItem } from '@/components/AppShell'
import { useDarkMode } from '@/lib/useDarkMode'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { applyScheduleTemplate, applyChecklistTemplate, applyOrderTemplate } from '@/lib/toolTemplates'
import { useAuthGate } from '@/lib/AuthGateContext'

// punto 16 — "Ensayo" ya no es un tab propio: vive dentro de Servicio
// (AdminServiceView), como cualquier otro kind de `services`.
type Tab = 'setlist'|'personas'|'equipos'|'canciones'|'disponibilidad'|'chats'|'ajustes'|'admins'
const VALID_TABS: Tab[] = ['setlist','personas','equipos','canciones','disponibilidad','chats','ajustes','admins']

// ── helpers de fecha para el PersonDrawer (no existía nada parecido) ──
const MESES_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
function fechaCorta(fecha: string) { const d = new Date(fecha+'T12:00:00'); return `${d.getDate()} ${MESES_ABBR[d.getMonth()]}` }
function diaMes(fecha: string) { const d = new Date(fecha+'T12:00:00'); return `${d.getDate()} de ${MESES_FULL[d.getMonth()]}` }
function mesAno(fecha: string) { const d = new Date(fecha); return `${MESES_FULL[d.getMonth()]} ${d.getFullYear()}` }
function relativeLabel(fecha: string) {
  const d = new Date(fecha+'T12:00:00')
  const days = Math.round((Date.now()-d.getTime())/86400000)
  if (days<=0) return 'Hoy'
  if (days===1) return 'Ayer'
  if (days<7) return `Hace ${days} días`
  if (days<35) { const w=Math.round(days/7); return `Hace ${w} semana${w!==1?'s':''}` }
  if (days<365) { const m=Math.round(days/30); return `Hace ${m} mes${m!==1?'es':''}` }
  const y = Math.round(days/365); return `Hace ${y} año${y!==1?'s':''}`
}
const AVAILABILITY_LABEL: Record<Availability, string> = {
  unrestricted: 'Sin restricción',
  monthly_max_1: 'Máximo 1 vez al mes',
  monthly_max_2: 'Máximo 2 veces al mes',
  on_request: 'Solo a pedido',
}

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
  // La sesión + el rol ya no se resuelven acá: AuthGateProvider (montado
  // en app/layout.tsx) los resuelve UNA vez por sesión de pestaña y los
  // comparte con /home — ver lib/AuthGateContext.tsx. /admin sigue
  // exigiendo is_org_admin (owner o admin) para entrar — un líder que no
  // sea ninguno de los dos, no — misma regla de siempre, ahora sobre los
  // hechos que ya vienen resueltos en vez de volver a consultarlos.
  const gate = useAuthGate()
  const memberId = gate.status === 'ready' ? gate.memberId : null
  const portalToken = gate.status === 'ready' ? gate.portalToken : null
  const isOrgOwner = gate.status === 'ready' && gate.isOrgOwner
  const isOrgAdmin = gate.status === 'ready' && gate.isOrgAdmin
  // Mismo destino que antes (/login) para los dos casos de siempre: sin
  // sesión, o con sesión pero sin ser owner/admin.
  useEffect(() => {
    if (gate.status === 'denied') { window.location.href = '/login'; return }
    if (gate.status === 'ready' && !gate.isOrgAdmin) window.location.href = '/login'
  }, [gate.status])
  const { darkMode, toggleDarkMode } = useDarkMode(memberId)
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') as Tab | null
  const [tab, setTab]         = useState<Tab>(urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'setlist')

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
  // punto 25 — aviso discreto de qué predeterminada no se pudo aplicar
  // (o de qué se eligió cuando había más de una instancia del mismo
  // tipo de herramienta). Nunca bloquea la creación del servicio.
  const [createServiceMsg, setCreateServiceMsg] = useState('')

  // Equipos/posiciones (módulo "Personas y Equipos") — fuente de verdad para
  // el sidebar de Servicio y la elegibilidad de voluntarios (membersFor).
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSections, setTeamSections] = useState<TeamSection[]>([])
  const [teamPositions, setTeamPositions] = useState<TeamPosition[]>([])
  const [teamMembersFlat, setTeamMembersFlat] = useState<{id:string;member_id:string;team_id:string;is_leader:boolean;availability:Availability}[]>([])
  const [teamMemberPositions, setTeamMemberPositions] = useState<{team_member_id:string;team_position_id:string}[]>([])
  const [teamTools, setTeamTools] = useState<TeamTool[]>([])

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
    const [teamsRes, secRes, posRes, tmRes, tmpRes, toolsRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_sections').select('id, organization_id, team_id, name, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_positions').select('id, organization_id, team_id, section_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_members').select('id, member_id, team_id, is_leader, availability').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
      supabase.from('team_tools').select('id, team_id, tool_type, sort_order, created_at'),
    ])
    setTeams(teamsRes.data || [])
    setTeamSections(secRes.data || [])
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

  // ── PersonDrawer global (components/persona/PersonDrawer.tsx) ──
  // No hay tabla nueva: se arma con lo que ya está cargado (members/teams/
  // team_positions/team_members/team_member_positions) más una consulta
  // puntual de historial al abrir (banda_assignments + invitations),
  // combinando servicios y ensayos — EnsayoPanel no usa banda_assignments,
  // la asistencia a ensayo vive solo en invitations.
  const loadPerson = useCallback(async (personId: string): Promise<PersonDetail> => {
    const member = members.find(m => m.id === personId)
    const teamsList: PersonTeam[] = teamMembersFlat.filter(tm => tm.member_id === personId).map(tm => {
      const team = teams.find(t => t.id === tm.team_id)
      const posIds = teamMemberPositions.filter(tmp => tmp.team_member_id === tm.id).map(tmp => tmp.team_position_id)
      const positionNames = posIds.map(pid => teamPositions.find(p => p.id === pid)?.name).filter(Boolean) as string[]
      return { teamId: tm.team_id, teamName: team?.name || '', isLeader: tm.is_leader, positionNames }
    })

    const [bandaRes, invRes] = await Promise.all([
      supabase.from('banda_assignments').select('id,service_id,posicion,service:services(fecha,titulo,tipo)').eq('member_id', personId),
      supabase.from('invitations').select('service_id,status,service:services(fecha,titulo,tipo)').eq('member_id', personId),
    ])
    const statusByService = new Map<string,string>()
    for (const inv of (invRes.data||[]) as any[]) if (inv.service_id) statusByService.set(inv.service_id, inv.status)
    const toStatus = (raw?: string): 'served'|'declined'|'pending' =>
      raw==='confirmado' ? 'served' : raw==='declinado' ? 'declined' : 'pending'

    type Raw = { id:string; fecha:string; positionName:string; serviceName:string; teamName:string; status:'served'|'declined'|'pending' }
    const servicioRaw: Raw[] = ((bandaRes.data||[]) as any[])
      .filter(b => b.service && b.service.tipo !== 'ensayo')
      .map(b => {
        const teamId = teamPositions.find(p => p.name === b.posicion)?.team_id
        return {
          id: b.id, fecha: b.service.fecha, positionName: b.posicion,
          serviceName: b.service.titulo || 'Servicio', teamName: teams.find(t=>t.id===teamId)?.name || '',
          status: toStatus(statusByService.get(b.service_id)),
        }
      })
    const ensayoRaw: Raw[] = ((invRes.data||[]) as any[])
      .filter(inv => inv.service?.tipo === 'ensayo')
      .map(inv => ({
        id: `ens-${inv.service_id}`, fecha: inv.service.fecha, positionName: 'Ensayo',
        serviceName: inv.service.titulo || 'Ensayo', teamName: 'Ensayo', status: toStatus(inv.status),
      }))
    const all = [...servicioRaw, ...ensayoRaw].sort((a,b) => b.fecha.localeCompare(a.fecha))

    const history: ServiceHistoryEntry[] = all.slice(0,10).map(e => ({
      id: e.id, dateLabel: fechaCorta(e.fecha), positionName: e.positionName,
      serviceName: e.serviceName, teamName: e.teamName, status: e.status,
    }))
    const served = all.filter(e => e.status==='served')
    const now = new Date()
    const yearStart = `${now.getFullYear()}-01-01`
    const quarterAgo = new Date(now); quarterAgo.setMonth(now.getMonth()-3)
    const quarterAgoStr = quarterAgo.toISOString().slice(0,10)
    const lastServed = served[0] // ya viene ordenado desc

    return {
      id: personId,
      fullName: member ? `${member.nombre} ${member.apellido}` : '',
      initials: member ? `${member.nombre?.[0]||''}${member.apellido?.[0]||''}`.toUpperCase() : '',
      email: member?.email || '',
      phone: member?.telefono,
      birthdayLabel: member?.fecha_nacimiento ? diaMes(member.fecha_nacimiento) : undefined,
      joinedLabel: member?.created_at ? mesAno(member.created_at) : undefined,
      availabilityLabel: (() => {
        const av = teamMembersFlat.find(tm=>tm.member_id===personId)?.availability
        return av ? AVAILABILITY_LABEL[av] : 'Sin restricción'
      })(),
      hasApp: !!member?.instalado_pwa_at,
      teams: teamsList,
      stats: {
        yearCount: served.filter(e => e.fecha >= yearStart).length,
        lastQuarterCount: served.filter(e => e.fecha >= quarterAgoStr).length,
        lastServedLabel: lastServed ? relativeLabel(lastServed.fecha) : 'Nunca',
      },
      history,
    }
  }, [members, teams, teamPositions, teamMembersFlat, teamMemberPositions])

  function onEditPerson(personId: string) {
    router.push(`/admin?tab=personas&person=${personId}`)
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

  // Punto 22-25 (deuda cerrada acá): sin esto, un fallo de red dejaba el
  // esqueleto de Servicio cargando para siempre — nunca se sabía que
  // falló, y "Sin equipos todavía"/"Sin servicios futuros" podían
  // mostrarse antes de tiempo porque no había ningún flag de carga.
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string|null>(null)
  const loadAllData = useCallback(async () => {
    setDataLoading(true); setDataError(null)
    try {
      await Promise.all([loadServices(), loadMembers(), loadSongs(), loadTeamsAndMemberships()])
      setDataLoading(false)
    } catch (e:any) {
      setDataError(e?.message || 'No se pudo cargar. Revisá tu conexión e intentá de nuevo.')
    }
  }, [loadServices, loadMembers, loadSongs, loadTeamsAndMemberships])

  useEffect(()=>{ if(isOrgAdmin) loadAllData() },[isOrgAdmin])
  useEffect(()=>{
    if(selectedService) {
      loadService(selectedService)
      // Cargar bloqueos para este servicio
      supabase.from('date_blocks').select('member_id').eq('service_id', selectedService.id)
        .then(({data})=>setDateBlocks((data||[]).map((b:any)=>b.member_id)))
    }
  },[selectedService])

  async function createService(
    fecha: string, horaInicio?: string, horaFin?: string,
    kind: 'service'|'rehearsal'|'other' = 'service',
    extra?: { parentServiceId?: string; lugar?: string; direccion?: string; mapsLink?: string },
  ) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const prefijo = kind==='rehearsal' ? 'Ensayo' : kind==='other' ? 'Otro' : 'Servicio Ancora'
    const titulo=`${prefijo} — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const{data}=await supabase.from('services').insert({
      fecha, titulo, kind,
      hora_inicio: horaInicio||'10:00',
      hora_fin: horaFin||'14:00',
      parent_service_id: extra?.parentServiceId || null,
      lugar: extra?.lugar || null,
      direccion: extra?.direccion || null,
      maps_link: extra?.mapsLink || null,
    }).select().single()
    if(data){
      await loadServices(); setSelectedService(data)
      await applyDefaultTemplatesForNewService(data)
    }
  }

  // punto 25 — al crear un servicio, aplica las plantillas predeterminadas
  // de su kind: primero se insertó el servicio con su hora_inicio (arriba),
  // recién ahora se aplican — el Cronograma necesita esa hora para calcular
  // las suyas desde el offset. Reusa las mismas applyXTemplate de
  // lib/toolTemplates.ts que usan las 3 herramientas — nada se duplica acá.
  //
  // Si aplicar una falla, el servicio YA existe (se creó arriba) — nunca
  // se bloquea la creación por esto, solo se avisa qué no se pudo aplicar.
  // 'reemplazar' sobre un servicio recién creado (sin nada todavía) es lo
  // mismo que insertar desde cero, y de paso hace que reintentar esta
  // función para el mismo servicio no duplique nada (segunda vez, mismo
  // resultado) — no hace falta una guarda de "ya se aplicó" aparte.
  async function applyDefaultTemplatesForNewService(service: Service) {
    const kind = service.kind || 'service'
    const fails: string[] = []
    const notes: string[] = []
    const teamName = (id: string) => teams.find(t => t.id === id)?.name || id

    // una instancia por equipo — la primera por sort_order si hay más de una.
    function firstByTeam(toolType: 'schedule'|'checklist') {
      const byTeam = new Map<string, TeamTool[]>()
      for (const tt of teamTools) {
        if (tt.tool_type !== toolType) continue
        byTeam.set(tt.team_id, [...(byTeam.get(tt.team_id)||[]), tt])
      }
      const chosen = new Map<string, TeamTool>()
      Array.from(byTeam.entries()).forEach(([teamId, list]) => {
        const sorted = [...list].sort((a,b)=>a.sort_order-b.sort_order)
        chosen.set(teamId, sorted[0])
        if (sorted.length > 1) {
          notes.push(`${toolType==='schedule'?'Cronograma':'Checklist'} de ${teamName(teamId)}: había ${sorted.length}, se usó el primero por orden`)
        }
      })
      return chosen
    }

    for (const [teamId, tt] of Array.from(firstByTeam('schedule').entries())) {
      try {
        const { data: tmpl } = await supabase.from('tool_templates').select('*')
          .eq('tool','schedule').eq('team_id', teamId).eq('default_for_kind', kind).is('archived_at', null).maybeSingle()
        if (tmpl) await applyScheduleTemplate(supabase, { serviceId: service.id, teamId, teamToolId: tt.id, horaInicio: service.hora_inicio, template: tmpl, mode: 'reemplazar' })
      } catch (e:any) { fails.push(`Cronograma de ${teamName(teamId)}`) }
    }
    for (const [teamId, tt] of Array.from(firstByTeam('checklist').entries())) {
      try {
        const { data: tmpl } = await supabase.from('tool_templates').select('*')
          .eq('tool','checklist').eq('team_id', teamId).eq('default_for_kind', kind).is('archived_at', null).maybeSingle()
        if (tmpl) await applyChecklistTemplate(supabase, { serviceId: service.id, teamId, teamToolId: tt.id, template: tmpl, mode: 'reemplazar' })
      } catch (e:any) { fails.push(`Checklist de ${teamName(teamId)}`) }
    }
    // Orden del servicio: nunca para un ensayo — hereda canciones y banda
    // de su servicio padre, no tiene Orden propio (punto 16).
    if (kind !== 'rehearsal') {
      try {
        const { data: tmpl } = await supabase.from('tool_templates').select('*')
          .eq('tool','order').is('team_id', null).eq('default_for_kind', kind).is('archived_at', null).maybeSingle()
        if (tmpl) await applyOrderTemplate(supabase, { serviceId: service.id, template: tmpl, mode: 'reemplazar' })
      } catch (e:any) { fails.push('Orden del servicio') }
    }

    const parts = [...notes]
    if (fails.length) parts.push(`No se pudo aplicar: ${fails.join(', ')}`)
    setCreateServiceMsg(parts.join(' · '))
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
    // seccionNombre: modelo de tres niveles (Equipo → Sección → Posición,
    // migración 009) — null si la posición no está agrupada en ninguna
    // sección. Punto 17: "Voces" es una sección típica dentro de un
    // equipo como "Alabanza", no un equipo propio.
    posiciones: teamPositions.filter(p => p.team_id === root.id).map(p => ({
      id: p.id, nombre: p.name, codigo: p.code,
      seccionNombre: p.section_id ? (teamSections.find(s => s.id === p.section_id)?.name ?? null) : null,
    })),
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

  // Mientras se resuelve (o si ya se sabe que no es admin/owner y el
  // efecto de arriba todavía no alcanzó a redirigir): marco completo
  // (AppShell con su barra) y esqueleto en el contenido, nunca las
  // pestañas ni datos reales. Antes esto reemplazaba la pantalla entera,
  // que es lo que hacía ver a /home ↔ /admin como una recarga completa.
  //
  // "Verificando acceso..." es honesto SOLO mientras el gate todavía no
  // resolvió (idle/loading). Si ya resolvió y esta persona no es admin,
  // no está "verificando" nada — está por redirigir — así que ahí el
  // esqueleto queda vacío, sin ese texto.
  if (!isOrgAdmin) {
    const verifying = gate.status === 'idle' || gate.status === 'loading'
    return (
      <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--anc-bg)'}}>
        <AppShell
          orgName="Iglesia Áncora" userInitials="··" memberItems={[]}
          canAdmin={false} theme={darkMode?'dark':'light'} onToggleTheme={toggleDarkMode}
          onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
          loadPerson={async()=>{ throw new Error('No disponible todavía') }} onEditPerson={()=>{}}
        >
          {verifying && (
            <div style={{padding:'40px 0',textAlign:'center'}}>
              <div style={{width:28,height:28,border:'2px solid var(--v3-ink-3)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
              <p style={{color:'var(--v3-ink-3)',fontSize:13,fontWeight:300}}>Verificando acceso...</p>
            </div>
          )}
        </AppShell>
      </div>
    )
  }

  const TOP_TABS: {t:Tab,label:string}[] = [
    {t:'setlist',label:'Servicio'},
    {t:'canciones',label:'Canciones'},
    {t:'disponibilidad',label:'Calendario'},
  ]
  const ADMIN_TABS: {t:Tab,label:string}[] = [
    {t:'chats',label:'Chats'},
    {t:'equipos',label:'Equipos'},
    {t:'personas',label:'Personas'},
    ...(isOrgOwner ? [{t:'admins' as Tab,label:'Admins'}] : []),
  ]

  // "Home" vive en /home, fuera de /admin (fase 12) — es el único ítem
  // de navegación real entre páginas; el resto sigue cambiando de
  // pestaña en el momento, sin recargar.
  const memberNavItems: ShellNavItem[] = [
    { key:'home', label:'Home', href:'/home' },
    ...TOP_TABS.map(({t,label})=>({key:t,label,active:tab===t,onClick:()=>setTab(t)})),
  ]
  const adminNavItems: ShellNavItem[] = ADMIN_TABS.map(({t,label})=>({key:t,label,active:tab===t,onClick:()=>setTab(t)}))
  const currentMember = members.find(m=>m.id===memberId)
  const userInitials = currentMember ? `${currentMember.nombre?.[0]||''}${currentMember.apellido?.[0]||''}`.toUpperCase() : '··'

  return (
    <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--anc-bg)',backgroundAttachment:'fixed',
      // Base tipográfica del mockup (body{font-size:.8125rem}) — sin esto,
      // todo lo que no fija su propio tamaño hereda el default del
      // navegador (16px) en vez del editorial (13px) y se ve "amateur".
      fontSize:'.8125rem',lineHeight:1.5,
      fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'}}>
      <AppShell
        orgName="Iglesia Áncora"
        userInitials={userInitials}
        memberItems={memberNavItems}
        adminItems={adminNavItems}
        canAdmin={true}
        theme={darkMode?'dark':'light'}
        onToggleTheme={toggleDarkMode}
        portalHref={portalToken ? `/portal/${portalToken}` : undefined}
        onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
        loadPerson={loadPerson}
        onEditPerson={onEditPerson}
      >
        {tab==='setlist' && (<>
          {createServiceMsg && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',marginBottom:10,background:'var(--sunk)',borderRadius:8,fontSize:12,color:'var(--v3-ink-3)'}}>
              <span style={{flex:1}}>{createServiceMsg}</span>
              <button onClick={()=>setCreateServiceMsg('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)'}}>✕</button>
            </div>
          )}
          <AdminServiceView
            services={services} selectedService={selectedService}
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
            canManageTemplates={isOrgAdmin}
            viewerMemberId={memberId||undefined}
            dataLoading={dataLoading}
            dataError={dataError}
            onRetryData={loadAllData}
          />
        </>)}
        {tab==='equipos'       && <TeamsAdminPanel darkMode={darkMode} />}
        {tab==='personas'      && <TeamPanel members={members} onRefresh={loadMembers} />}
        {tab==='canciones'        && (
          <CancionesPanel
            songs={songs} onRefreshSongs={loadSongs} memberId={memberId}
            services={services} teamTools={teamTools} teamMembersFlat={teamMembersFlat}
          />
        )}
        {tab==='disponibilidad'   && <AvailabilityPanel services={services} darkMode={darkMode} />}
        {tab==='chats'            && <ChatModerationPanel darkMode={darkMode} />}
        {tab==='admins' && isOrgOwner && <AdminsPanel darkMode={darkMode} />}
      </AppShell>
    </div>
  )
}
