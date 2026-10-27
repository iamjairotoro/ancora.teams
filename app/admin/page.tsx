'use client'
import { confirmar } from '@/lib/ventanas/ventanas'
import { VISTA_VACIA, servicioDeUrl } from '@/lib/admin/urlServicio'
import { useServicioUrl } from '@/lib/admin/useServicioUrl'
import { FallaDeCarga, fallaEsencial, textoDeFallaDeCarga } from '@/lib/admin/cargaConError'
import { pestanaInicial, type Tab } from '@/lib/admin/pestanas'
import { CORREO, textoFalloDeAccion, textoFalloDeEnvio, textoSinConexionDeEnvio } from '@/lib/textos/correo'
import { TEXTOS } from '@/lib/textos/comun'
import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock, Team, TeamSection, TeamPosition, ToolType, TeamTool, ServicePositionSlots } from '@/lib/types'
import type { PersonDetail, PersonTeam, ServiceHistoryEntry } from '@/components/persona/PersonDrawer'
import PersonasPanel, { type PersonasTab } from '@/components/PersonasPanel'
import AddPersonDialog, { PersonToast, PersonNotice, type NewPersonPayload, type SubmitResult } from '@/components/AddPersonDialog'
import CancionesPanel from '@/components/canciones/CancionesPanel'
import AdminServiceView from '@/components/AdminServiceView'
import ListaServicios from '@/components/servicio-movil/ListaServicios'
import ServicioMovil from '@/components/servicio-movil/ServicioMovil'
import type { ServicioAdminProps } from '@/components/servicio-movil/tipos'
import HojaNuevoServicio from '@/components/servicio-movil/HojaNuevoServicio'
import { useResumenServicios } from '@/components/home/useResumenServicios'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { FONT_APP } from '@/lib/lyricPrefs'
import ChatModerationPanel from '@/components/ChatModerationPanel'
import AvailabilityPanel from '@/components/AvailabilityPanel'
import type { TeamBlockRow, Viewer } from '@/lib/teamBlocks'
import TexBg from '@/components/TexBg'
import AppShell, { type ShellNavItem } from '@/components/AppShell'
import { useDarkMode } from '@/lib/useDarkMode'
import { DEFAULT_ORGANIZATION_ID, ADMIN_MENU_ITEMS } from '@/lib/constants'
import { applyScheduleTemplate, applyChecklistTemplate, applyOrderTemplate } from '@/lib/toolTemplates'
import { useAuthGate } from '@/lib/AuthGateContext'
import { etiquetaDeModo } from '@/lib/modo'
import MenuAdminMovil from '@/components/admin-movil/MenuAdminMovil'
import PantallaAdmin from '@/components/admin-movil/PantallaAdmin'
import { activoDelMenu } from '@/lib/admin/menuMovil'
import { gestionDeUrl, pestanaPedida, urlConPestana } from '@/lib/admin/urlPestana'
import { buildHistoryRaw, servedServiceCount } from '@/lib/personHistory'
import { relativeSince } from '@/lib/relativeTime'
import { addToTeam } from '@/lib/addToTeam'
import { setOrgRole, syncAdminNotices } from '@/lib/setOrgRole'
import { buildPositionIndex } from '@/lib/personPositions'
import { useRefreshOnVisible } from '@/lib/useRefreshOnVisible'
import type { AvisoConvocatoria, ResultadoDestinatario } from '@/lib/convocatoriaTypes'
import { juntarResultados } from '@/lib/problemasCorreo'

// punto 16 — "Ensayo" ya no es un tab propio: vive dentro de Servicio
// (AdminServiceView), como cualquier otro kind de `services`.

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

const VIEWER_ADMIN: Viewer = { kind: 'admin' }   // /admin solo admite administradores y owners: ven todos los equipos

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
  const isOrgOwner = gate.status === 'ready' && gate.isOrgOwner
  const isOrgAdmin = gate.status === 'ready' && gate.isOrgAdmin
  // Sin sesión: a /login (con "next" para volver a esta URL después de
  // loguearse). Con sesión pero sin ser owner/admin: NO a /login — /login
  // no chequea sesión, así que con sesión ya abierta eso solo repetía el
  // login sin resolver nada (rebote). El render de abajo (!isOrgAdmin)
  // muestra un estado final de "no tenés acceso" con cerrar sesión.
  useEffect(() => {
    if (gate.status === 'denied') {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
    }
  }, [gate.status])
  const { darkMode, themePref, setThemePref } = useDarkMode(memberId, { system: true })
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab') as Tab | null
  // Lo abierto en Servicio (?servicio=&equipo=&herramienta=): lib/admin/urlServicio.ts. Al entrar, el servicio (y el equipo) pedidos en la URL quedan elegidos, también en escritorio; no cambia nada de lo que se ve.
  const servicioInicial = servicioDeUrl(searchParams).servicio
  const { vista: urlSrv, ir: irServicio, volver: volverServicio } = useServicioUrl()
  // En teléfono (≤ 768 px) Servicio abre en la LISTA (components/servicio-movil) y el servicio se abre con «?servicio=»; en escritorio sigue la vista de siempre. `null` = aún sin medir: no se pinta ninguna de las dos.
  const telefono = useMediaQuery('(max-width: 768px)')
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  // `equipos` ya no es una pestaña (vive dentro de Personas, «Gestionar equipos»): el enlace viejo ?tab=equipos abre Personas y, con ella, la pantalla de gestión (lo convierte lib/admin/urlPestana.ts).
  const [tab, setTab]         = useState<Tab>(pestanaInicial(urlTab))
  const listaMovil = tab==='setlist' && telefono===true && !urlSrv.servicio
  const resumenServicios = useResumenServicios(listaMovil)
  // La pantalla de gestión con la que se monta Personas: la que pide la URL EN ESE MOMENTO (no la de cuando se montó esta página: una pestaña que se vuelve a abrir no reabre una gestión vieja).
  const gestionInicial = urlTab === 'equipos' || urlTab === 'personas' ? gestionDeUrl(searchParams) : null
  // La pestaña sigue a la URL cuando ésta cambia por una NAVEGACIÓN (router.push a /admin?tab=… desde Servicio): antes solo se leía al montar y la URL cambiaba sin que cambiara la pantalla. Solo actúa si la URL
  // pide una pestaña distinta de la actual; nuestra propia escritura (el efecto de abajo) deja la URL igual a `tab`, así que no pelea. Ver lib/admin/urlPestana.ts.
  useEffect(() => {
    const pedida = pestanaPedida(urlTab, tab, t => pestanaInicial(t))
    if (pedida) setTab(pedida as Tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab])

  const [services, setServices]             = useState<Service[]>([])
  const [members, setMembers]               = useState<Member[]>([])
  const [songs, setSongs]                   = useState<Song[]>([])
  const [selectedService, setSelectedService] = useState<Service|null>(null)
  const [blocks, setBlocks]                 = useState<ServiceBlock[]>([])
  const [bandaItems, setBandaItems]         = useState<BandaAssignment[]>([])
  const [slotsNeeded, setSlotsNeeded]       = useState<ServicePositionSlots[]>([])
  const [dateBlocks, setDateBlocks]         = useState<TeamBlockRow[]>([]) // (persona, equipo) bloqueados en la FECHA del servicio seleccionado (punto 51)
  const [invitations, setInvitations]       = useState<Invitation[]>([])
  // Punto 52: id de invitación → su equipo, para decir «Aceptó en {equipo}» aunque la convocatoria que la desplazó sea de OTRO servicio del mismo día.
  const [equipoDeInvitacion, setEquipoDeInvitacion] = useState<Record<string,string|null>>({})
  const [sending, setSending]               = useState(false)
  // Resultado de la última convocatoria / reinvitación (punto 61): persiste hasta «Cerrar» o hasta cambiar de servicio.
  const [aviso, setAviso]                     = useState<AvisoConvocatoria|null>(null)
  // Punto 61 (ajuste de octubre 2026): lo que devolvieron los envíos de ESTE servicio, por persona y equipo. No se muestra como panel: alimenta el «!» de quien tiene un problema de correo.
  const [resultadosCorreo, setResultadosCorreo] = useState<ResultadoDestinatario[]>([])
  useEffect(()=>{ setResultadosCorreo([]) },[selectedService?.id])      // el resultado de un envío es de UN servicio
  const [reintentandoId, setReintentandoId]   = useState<string|null>(null)
  // punto 25 — aviso discreto de qué predeterminada no se pudo aplicar
  // (o de qué se eligió cuando había más de una instancia del mismo
  // tipo de herramienta). Nunca bloquea la creación del servicio.
  const [createServiceMsg, setCreateServiceMsg] = useState('')
  const [createServiceMsgDe, setCreateServiceMsgDe] = useState('')      // el id del servicio al que pertenece ese aviso (el teléfono lo muestra solo en SU pantalla)

  // Equipos/posiciones (módulo "Personas y Equipos") — fuente de verdad para
  // el sidebar de Servicio y la elegibilidad de voluntarios (membersFor).
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSections, setTeamSections] = useState<TeamSection[]>([])
  const [teamPositions, setTeamPositions] = useState<TeamPosition[]>([])
  const [teamMembersFlat, setTeamMembersFlat] = useState<{id:string;member_id:string;team_id:string;is_leader:boolean}[]>([])
  const [teamMemberPositions, setTeamMemberPositions] = useState<{team_member_id:string;team_position_id:string}[]>([])
  const [teamTools, setTeamTools] = useState<TeamTool[]>([])
  // Rol de organización por persona (owner/admin), de organization_members: etiquetas,
  // filtro «Administradores», ficha/cajón y la píldora de rol. null = sin leer todavía.
  const [roleByMember, setRoleByMember] = useState<Map<string,'owner'|'admin'> | null>(null)

  // `estricto` solo en la carga inicial (loadAllData): una falla de las consultas esenciales se lanza para mostrar «No se pudo cargar» con «Reintentar». Las recargas de después
  // (tras guardar algo) son tolerantes: ante una falla conservan lo que había en vez de vaciar la lista.
  const loadServices = useCallback(async (estricto = false) => {
    const { data, error } = await supabase.from('services').select('*').order('fecha',{ascending:true})
    if (error) { if (estricto) throw new FallaDeCarga('services'); return }
    setServices(data||[])
    const soloServicios = (data||[]).filter((s:any)=>s.tipo!=='ensayo')
    const deUrl = servicioInicial ? (data||[]).find((s:any)=>s.id===servicioInicial) : null      // el que pide ?servicio=
    if(!selectedService && (deUrl || soloServicios.length)) {
      const now = new Date()
      const next = soloServicios.find((s:any) => new Date(s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00') > now)
      setSelectedService(deUrl || next || soloServicios[0])
    }
  },[selectedService, servicioInicial])

  // Los cambios de ?servicio= DESPUÉS de entrar (la lista, el atrás del teléfono) eligen ese servicio. Solo cuando el parámetro cambia: recargar la lista de servicios no vuelve a pisar la elección.
  const servicioAplicado = useRef<string | null>(servicioInicial)
  useEffect(() => {
    const id = urlSrv.servicio
    if (!id) { servicioAplicado.current = null; return }
    if (id === servicioAplicado.current) return
    const s = services.find(x => x.id === id)
    if (s) { servicioAplicado.current = id; setSelectedService(s) }
  }, [urlSrv.servicio, services])

  // Una sola forma de traer cada lista, para que la carga inicial y
  // reloadPeople (abajo) no puedan divergir. Si una consulta falla avisan
  // (null / failed) para que una recarga nunca vacíe una lista por un error
  // de red.
  async function fetchMembers(): Promise<Member[] | null> {
    const { data, error } = await supabase.from('members').select('*').order('nombre')
    return error ? null : (data || [])
  }
  async function fetchRoles(): Promise<Map<string,'owner'|'admin'> | null> {
    const { data, error } = await supabase.from('organization_members')
      .select('person_id, role').eq('organization_id', DEFAULT_ORGANIZATION_ID).in('role', ['owner','admin'])
    if (error || !data) return null // si falla, no se muestran roles (no se inventan)
    return new Map(data.map((r:any) => [r.person_id, r.role] as [string,'owner'|'admin']))
  }
  async function fetchTeamsAndMemberships() {
    const [teamsRes, secRes, posRes, tmRes, tmpRes, toolsRes] = await Promise.all([
      supabase.from('teams').select('id, organization_id, name, sort_order, archived_at, color, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_sections').select('id, organization_id, team_id, name, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_positions').select('id, organization_id, team_id, section_id, name, code, default_slots, sort_order, archived_at, created_at')
        .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
      supabase.from('team_members').select('id, member_id, team_id, is_leader').eq('organization_id', DEFAULT_ORGANIZATION_ID),
      supabase.from('team_member_positions').select('team_member_id, team_position_id'),
      supabase.from('team_tools').select('id, team_id, tool_type, sort_order, created_at'),
    ])
    return {
      failed: !!(teamsRes.error || secRes.error || posRes.error || tmRes.error || tmpRes.error || toolsRes.error),
      esencialFallo: fallaEsencial(teamsRes, posRes, tmRes),      // equipos, posiciones y membresías; secciones, posiciones por persona y herramientas son secundarias
      teams: teamsRes.data || [], sections: secRes.data || [], positions: posRes.data || [],
      tm: tmRes.data || [], tmp: tmpRes.data || [], tools: toolsRes.data || [],
    }
  }
  function applyTeamsAndMemberships(r: Awaited<ReturnType<typeof fetchTeamsAndMemberships>>) {
    setTeams(r.teams)
    setTeamSections(r.sections)
    setTeamPositions(r.positions)
    setTeamMembersFlat(r.tm as any)
    setTeamMemberPositions(r.tmp)
    setTeamTools(r.tools)
  }

  // Posiciones por persona (agrupadas por equipo) para mostrarlas donde antes
  // iban los instrumentos: sale de las mismas listas que ya carga esta página.
  const positionsByMember = useMemo(
    () => buildPositionIndex({ teams, positions: teamPositions, teamMembers: teamMembersFlat, memberPositions: teamMemberPositions }),
    [teams, teamPositions, teamMembersFlat, teamMemberPositions],
  )

  const loadMembers = useCallback(async (estricto = false)=>{ const m = await fetchMembers(); if (m) setMembers(m); else if (estricto) throw new FallaDeCarga('members') },[])
  const loadSongs   = useCallback(async (estricto = false)=>{ const{data,error}=await supabase.from('songs').select('*').order('nombre'); if (error) { if (estricto) throw new FallaDeCarga('songs'); return } setSongs(data||[]) },[])
  const loadTeamsAndMemberships = useCallback(async (estricto = false) => {
    const r = await fetchTeamsAndMemberships()
    if (r.esencialFallo) { if (estricto) throw new FallaDeCarga('teams'); return }
    applyTeamsAndMemberships(r)
  }, [])

  // Punto 39 — recarga de personas y membresías de equipo tras cualquier
  // alta, edición, borrado o cambio de equipo/posición hecho en Personas o
  // en Equipos (cada panel guarda su propia copia y escribe directo: antes
  // el selector de asignar y la ficha de la persona quedaban viejos hasta
  // recargar la página). NO toca el estado de carga global (nada de volver
  // a mostrar el esqueleto) ni remonta nada: solo reemplaza las listas, así
  // que el equipo abierto, la pestaña activa y la ficha siguen donde están.
  // Si salen dos recargas seguidas, vale solo la última en llegar a empezar.
  const peopleReloadSeq = useRef(0)
  const reloadPeople = useCallback(async () => {
    const seq = ++peopleReloadSeq.current
    const [m, t, roles] = await Promise.all([fetchMembers(), fetchTeamsAndMemberships(), fetchRoles()])
    if (seq !== peopleReloadSeq.current) return
    if (m) setMembers(m)
    if (!t.failed) applyTeamsAndMemberships(t)
    if (roles) setRoleByMember(roles)
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
    if (!(await confirmar('¿Quitar esta herramienta? Se borran sus datos para este equipo (plantillas de checklist no se ven afectadas).', { accion: 'Quitar', peligro: true }))) return
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
      return { teamId: tm.team_id, teamName: team?.name || '', isLeader: tm.is_leader, positionNames, color: team?.color ?? null }
    })

    const [bandaRes, invRes] = await Promise.all([
      supabase.from('banda_assignments').select('id,service_id,posicion,team_position_id,team_position:team_positions(name,team_id),service:services(fecha,titulo,tipo)').eq('member_id', personId),
      supabase.from('invitations').select('id,service_id,team_id,status,declined_reason,superseded_by,service:services(fecha,titulo,tipo)').eq('member_id', personId),
    ])
    const all = buildHistoryRaw({ banda: (bandaRes.data||[]) as any[], invitations: (invRes.data||[]) as any[], teamPositions, teams })
    const history: ServiceHistoryEntry[] = all.slice(0,10).map(e => ({
      id: e.id, dateLabel: fechaCorta(e.fecha), positionName: e.positionName,
      serviceName: e.serviceName, teamName: e.teamName, status: e.status, statusNote: e.detail,
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
      hasApp: !!member?.instalado_pwa_at,
      role: roleByMember?.get(personId) ?? null,
      avatarUrl: member?.avatar_url ?? null,
      lastSeenLabel: member?.last_seen ? relativeSince(member.last_seen) : 'Nunca',
      teams: teamsList,
      stats: {
        yearCount: servedServiceCount(all, yearStart),
        lastQuarterCount: servedServiceCount(all, quarterAgoStr),
        lastServedLabel: lastServed ? relativeLabel(lastServed.fecha) : 'Nunca',
      },
      history,
    }
  }, [members, teams, teamPositions, teamMembersFlat, teamMemberPositions, roleByMember])

  // Punto 38 — «Editar» (en el panel de la persona o en su perfil) abre el
  // pop-up de edición. Vive acá, a nivel de página, para que funcione igual
  // desde cualquier pestaña y quede POR ENCIMA del panel de la persona
  // (pop-up z-index 80, PersonDrawer 60/61) sin cerrarlo.
  const [editPersonId, setEditPersonId] = useState<string|null>(null)
  const [personToast, setPersonToast] = useState('')
  useEffect(()=>{
    if(!personToast) return
    const t=setTimeout(()=>setPersonToast(''),2400)
    return ()=>clearTimeout(t)
  },[personToast])
  function onEditPerson(personId: string) { setEditPersonId(personId) }
  // Mismo update y mismo payload que hacía el formulario inline de
  // TeamPanel, pero devolviendo el error (duplicado 23505; 42501 si un no
  // admin intenta cambiar el correo: trigger de la migración 027).
  // Punto 38 + equipos solo para agregar + punto 45 (rol). ORDEN: primero los DATOS
  // (el mismo update de siempre), después los equipos NUEVOS (addToTeam) y por
  // último el ROL (setOrgRole, la misma función de la pestaña Admins). Se detiene
  // en el primer fallo y el pop-up queda abierto; el reintento llega con skipData
  // y solo trae lo que falta (equipos que fallaron, rol): no se repite lo guardado.
  // La alerta «¿Estás seguro…?» del rol ya salió ANTES de llegar acá.
  async function updatePerson(payload: NewPersonPayload, newTeamIds: string[], opts?: { skipData?: boolean; role?: 'admin' | 'member' }): Promise<SubmitResult> {
    if(!editPersonId) return { status:'error', error:{ message:TEXTOS.noSePudoGuardar } }
    if(!opts?.skipData){
      const { error } = await supabase.from('members').update(payload).eq('id', editPersonId)
      if(error) return { status:'error', error:{ code:error.code, message:error.message } }
    }
    const added: string[] = []
    const failed: { id: string; name: string }[] = []
    let message = ''
    for(const teamId of newTeamIds){
      const res = await addToTeam(editPersonId, teamId)
      if(res.status==='error'){ failed.push({ id: teamId, name: teams.find(t=>t.id===teamId)?.name || 'el equipo' }); message ||= res.message }
      else added.push(teamId)
    }
    // Los datos y/o algún equipo cambiaron: las listas del padre se refrescan ya,
    // aunque el pop-up siga abierto por un fallo.
    if(failed.length){ void reloadPeople(); return { status:'teams-failed', added, failed, message } }
    if(opts?.role){
      const res = await setOrgRole(editPersonId, opts.role)
      if(res.status==='error' || res.status==='rejected'){ void reloadPeople(); return { status:'role-failed', added, message: res.message } }
      if(res.status==='sync-failed'){
        // El rol SÍ se aplicó: no se revierte. Aviso persistente con «Reintentar avisos».
        const email = members.find(m=>m.id===editPersonId)?.email || ''
        setAvisosFail({ personId: editPersonId, email, admin: opts.role==='admin', detail: res.message })
      }
    }
    return { status:'ok' }
  }

  // Los avisos de RSVP (team_admins) no se sincronizaron tras cambiar un rol: se
  // reintenta (idempotente) desde el aviso persistente.
  const [avisosFail, setAvisosFail] = useState<{ personId: string; email: string; admin: boolean; detail: string } | null>(null)
  async function retryAvisos() {
    if(!avisosFail) return
    const res = await syncAdminNotices(avisosFail.personId, avisosFail.admin)
    if(res.ok){ setAvisosFail(null); setPersonToast(`Avisos sincronizados para ${avisosFail.email}`) }
    else setAvisosFail({ ...avisosFail, detail: res.message })
  }

  const loadService = useCallback(async(svc: Service)=>{
    const [bl, ba, inv, slots] = await Promise.all([
      supabase.from('service_blocks').select('*, song:songs(*), lead:members(nombre)').eq('service_id',svc.id).order('orden'),
      supabase.from('banda_assignments').select('*,member:members(*),team_position:team_positions(name,team_id)').eq('service_id',svc.id),
      supabase.from('invitations').select('*,member:members(*)').eq('service_id',svc.id),
      supabase.from('service_position_slots').select('*').eq('service_id',svc.id),
    ])
    setBlocks(bl.data||[])
    setBandaItems(ba.data||[])
    setInvitations(inv.data||[])
    setSlotsNeeded(slots.data||[])
    const cargadas = new Map<string,string|null>((inv.data||[]).map((i:any)=>[i.id, i.team_id ?? null]))
    const faltan = Array.from(new Set<string>((inv.data||[]).map((i:any)=>i.superseded_by).filter((id:any)=>id && !cargadas.has(id))))
    if (faltan.length) {
      const extra = await supabase.from('invitations').select('id,team_id').in('id', faltan)
      ;(extra.data||[]).forEach((i:any)=>cargadas.set(i.id, i.team_id ?? null))
    }
    setEquipoDeInvitacion(Object.fromEntries(cargadas))
  },[])

  // La URL sigue a la pestaña. Con history.replaceState sobre la URL ACTUAL (lib/admin/urlPestana.ts), no con router.replace sobre `searchParams`: PersonasList escribe `?person=` por la misma vía
  // al montarse, y con router.replace el cambio de pestaña perdía esa carrera (quedaba `?tab=setlist&person=…`).
  useEffect(() => {
    const nueva = urlConPestana(window.location.href, tab)
    // `null` como estado, igual que PersonasList: Next integra replaceState/pushState a su router SOLO cuando el estado no es el suyo (con `window.history.state` lo ignoraba y después volvía a escribir la URL vieja).
    if (nueva) window.history.replaceState(null, '', nueva)
  }, [tab])

  // ?tab=admins lo ve SOLO el owner. Quien llega con ese enlace sin serlo
  // cae en Personas, en silencio (PersonasPanel ya no le renderiza nada de
  // Admins; esto además deja la URL y el ítem del menú coherentes).
  useEffect(() => {
    if (gate.status === 'ready' && tab === 'admins' && !isOrgOwner) setTab('personas')
  }, [gate.status, tab, isOrgOwner])

  // Punto 22-25 (deuda cerrada acá): sin esto, un fallo de red dejaba el
  // esqueleto de Servicio cargando para siempre — nunca se sabía que
  // falló, y "Sin equipos todavía"/"Sin servicios futuros" podían
  // mostrarse antes de tiempo porque no había ningún flag de carga.
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string|null>(null)
  const loadAllData = useCallback(async () => {
    setDataLoading(true); setDataError(null)
    try {
      await Promise.all([loadServices(true), loadMembers(true), loadSongs(true), loadTeamsAndMemberships(true), fetchRoles().then(r => { if (r) setRoleByMember(r) })])
      setDataLoading(false)
    } catch (e:any) {
      setDataError(textoDeFallaDeCarga(e, 'admin'))
    }
  }, [loadServices, loadMembers, loadSongs, loadTeamsAndMemberships])

  useEffect(()=>{ if(isOrgAdmin) loadAllData() },[isOrgAdmin])

  // ?edit=<id> (desde Home) abre el pop-up de edición — solo si la persona
  // existe y quien mira es admin — y SIEMPRE quita el parámetro de la URL
  // con replace, para que recargar no lo reabra. Espera a que carguen los
  // datos (si no, "no existe" sería un falso negativo).
  const editParam = searchParams.get('edit')
  useEffect(()=>{
    if(!editParam || dataLoading || dataError || !isOrgAdmin) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('edit')
    router.replace(`/admin?${params.toString()}`, { scroll: false })
    if(members.some(m=>m.id===editParam)) setEditPersonId(editParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[editParam, dataLoading, dataError, isOrgAdmin])
  useEffect(()=>{
    if(!selectedService) return
    loadService(selectedService)
    // Bloqueos de ESA FECHA (blocked_date), no por service_id: date_blocks.
    // service_id solo se llena si ya existía un servicio ese día al bloquear
    // (y con dos servicios el mismo día queda en null), así que filtrar por
    // él no veía los bloqueos hechos antes de crear el servicio. Ignora la
    // respuesta si mientras tanto se cambió de servicio.
    let cancelled = false
    // Punto 51: por la función team_blocks_in_range (admin: todos los equipos; líder: solo los suyos).
    supabase.rpc('team_blocks_in_range', { p_from: selectedService.fecha, p_to: selectedService.fecha })
      .then(({data})=>{ if(!cancelled) { setDateBlocks((data||[]) as TeamBlockRow[]); markBlocksFresh() } })
    return ()=>{ cancelled = true }
  },[selectedService])
  // Punto 60: al volver a la pestaña (máximo una vez cada 30 s) se refrescan también los bloqueos del servicio abierto.
  const blocksDateRef = useRef<string|null>(null)
  blocksDateRef.current = selectedService?.fecha ?? null
  const { markFresh: markBlocksFresh } = useRefreshOnVisible(()=>{
    const f = blocksDateRef.current
    if(!f) return
    supabase.rpc('team_blocks_in_range', { p_from: f, p_to: f })
      .then(({data})=>{ if(blocksDateRef.current===f) setDateBlocks((data||[]) as TeamBlockRow[]) })
  })

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
      return data.id as string
    }
    return null
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
    setCreateServiceMsgDe(service.id)
  }

  async function deleteService(id: string) {
    if(!(await confirmar('¿Eliminar este servicio?', { accion: 'Eliminar', peligro: true }))) return
    await fetch('/api/delete-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id})})
    setSelectedService(null); await loadServices()
  }

  async function duplicateService(id: string, newFecha: string) {
    const res=await fetch('/api/duplicate-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id,newFecha})})
    const data=await res.json(); await loadServices()
    const{data:newSvc}=await supabase.from('services').select('*').eq('id',data.serviceId).single()
    if(newSvc) setSelectedService(newSvc)
  }

  // Recibe el id de la posición y ESE id es lo que se guarda (banda_assignments.team_position_id, migración 037a): renombrar una posición, o
  // repetir su nombre en otro equipo, ya no rompe la asignación. `posicion` (texto) ya no se escribe.
  async function assignBanda(posId: string, memberId: string, slotIndex: number = 1) {
    if(!selectedService) return
    if (!teamPositions.some(p => p.id === posId)) return
    // Actualización optimista: el nombre aparece al instante en el <select>,
    // sin esperar la recarga completa del servicio (que antes hacía 3
    // consultas pesadas — incluyendo un viaje extra a /api/service-blocks —
    // y recién ahí mostraba el cambio. Ahora se ve al toque, y la recarga
    // real sigue corriendo atrás para mantener todo sincronizado.
    setBandaItems(prev => {
      const member = memberId ? members.find(m=>m.id===memberId) : undefined
      const existing = prev.find(b=>b.team_position_id===posId && b.slot_index===slotIndex)
      const updated = { ...(existing||{ id:`temp-${posId}-${slotIndex}`, service_id:selectedService.id, team_position_id:posId, slot_index:slotIndex }), member_id: memberId||undefined, member }
      return [...prev.filter(b=>!(b.team_position_id===posId && b.slot_index===slotIndex)), updated as any]
    })
    await supabase.from('banda_assignments').upsert(
      {service_id:selectedService.id,team_position_id:posId,member_id:memberId||null,slot_index:slotIndex},
      {onConflict:'service_id,team_position_id,slot_index'}
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
    setSending(true); setAviso(null)
    try {
      const res=await fetch('/api/send-invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:selectedService.id, teamId})})
      const data=await res.json().catch(()=>null)
      if(!res.ok || !data || data.error || !Array.isArray(data.results)){
        // Un error de la petición NUNCA se muestra como éxito (antes: «Enviadas ✓» con un 401/403/404/400).
        setAviso({tipo:'error',texto:data?.error||textoFalloDeEnvio(res.status,'invitaciones')})
      } else if(data.results.length===0){
        setAviso({tipo:'info',texto:data.message})
      } else {
        setResultadosCorreo(prev=>juntarResultados(prev,data.results))      // con éxito no se muestra nada; un problema deja su «!» en la nómina
      }
      loadService(selectedService)
    } catch { setAviso({tipo:'error',texto:textoSinConexionDeEnvio('invitaciones')}) }
    finally { setSending(false) }
  }

  // «Reintentar correo»: solo el correo de UNA persona (sent_at y el push no se tocan). Su resultado reemplaza al anterior de esa persona.
  async function reintentarCorreo(memberId: string, teamId: string) {
    if(!selectedService || reintentandoId) return
    setReintentandoId(memberId); setAviso(null)
    try {
      const res=await fetch('/api/send-invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:selectedService.id, reintentarCorreoDe:memberId, teamId})})
      const data=await res.json().catch(()=>null)
      if(!res.ok || !data || data.error || !Array.isArray(data.results)){
        setAviso({tipo:'error',texto:data?.error||textoFalloDeAccion(res.status)})
      } else {
        setResultadosCorreo(prev=>juntarResultados(prev,data.results))      // un reintento exitoso borra el «!» de esa persona
      }
      loadService(selectedService)
    } catch { setAviso({tipo:'error',texto:CORREO.sinConexionReintento}) }
    finally { setReintentandoId(null) }
  }

  async function reinvitar(memberId: string, teamId: string) {
    if(!selectedService) return
    setAviso(null)
    try {
      const res=await fetch('/api/reassignment-notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,serviceId:selectedService.id,teamId})})
      const data=await res.json().catch(()=>null)
      const fallo = !res.ok || !data || !!data.error || data.emailOk===false
      setAviso({tipo:fallo?'error':'info',texto:data?.error||data?.message||(res.ok?'Listo':textoFalloDeAccion(res.status))})
      loadService(selectedService)
    } catch { setAviso({tipo:'error',texto:CORREO.sinConexionReinvitar}) }
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
    color: root.color ?? null,
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
    return bandaItems.find(b => b.team_position_id === posId && b.slot_index === slotIndex)
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
    const noAccess = gate.status === 'ready' && !isOrgAdmin

    return (
      <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--anc-bg)'}}>
        <AppShell
          orgName="Iglesia Áncora" userInitials="··" memberItems={[]}
          canAdmin={false} themePref={themePref} onThemePref={setThemePref}
          onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
          loadPerson={async()=>{ throw new Error('No disponible todavía') }} onEditPerson={()=>{}}
        >
          {verifying && (
            <div style={{padding:'40px 0',textAlign:'center'}}>
              <div style={{width:28,height:28,border:'2px solid var(--v3-ink-3)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
              <p style={{color:'var(--v3-ink-3)',fontSize:13,fontWeight:300}}>Verificando acceso...</p>
            </div>
          )}
          {noAccess && (
            <div style={{padding:'40px 20px',textAlign:'center'}}>
              <p style={{color:'var(--v3-ink-2)',fontSize:14,fontWeight:700,marginBottom:8}}>{TEXTOS.sinAcceso}</p>
              <p style={{color:'var(--v3-ink-3)',fontSize:13,marginBottom:20}}>Tu cuenta no tiene un rol de administrador en la organización.</p>
              <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
                style={{background:'var(--anc-accent)',color:'var(--anc-on-accent)',border:'none',borderRadius:'var(--anc-r)',padding:'9px 18px',fontSize:'.8125rem',fontWeight:600,cursor:'pointer'}}>
                Cerrar sesión
              </button>
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
  // "Admins" es una pestaña dentro de "Personas" (PersonasPanel, solo para el owner) y "Equipos" vive dentro de Personas (bloques y «Gestionar equipos»). Ese ítem queda activo en las dos y siempre
  // vuelve a Personas al hacer clic (entrar directo a Admins sigue andando vía ?tab=admins; ?tab=equipos abre la gestión de equipos).
  const ADMIN_TABS: {t:Tab,label:string,active:boolean}[] = ADMIN_MENU_ITEMS.map(({key,label})=>({
    t:key as Tab, label,
    active: key==='personas' ? (tab==='personas'||tab==='admins') : tab===key,
  }))

  // "Home" vive en /home, fuera de /admin (fase 12) — es el único ítem
  // de navegación real entre páginas; el resto sigue cambiando de
  // pestaña en el momento, sin recargar.
  const memberNavItems: ShellNavItem[] = [
    { key:'home', label:'Home', href:'/home' },
    ...TOP_TABS.map(({t,label})=>({key:t,label,active:tab===t,onClick:()=>setTab(t)})),
  ]
  const adminNavItems: ShellNavItem[] = ADMIN_TABS.map(({t,label,active})=>({key:t,label,active,onClick:()=>setTab(t)}))
  const currentMember = members.find(m=>m.id===memberId)
  const userInitials = currentMember ? `${currentMember.nombre?.[0]||''}${currentMember.apellido?.[0]||''}`.toUpperCase() : '··'

  // Lo que reciben, igual, la vista de escritorio y las pantallas de teléfono del servicio.
  const servicioProps: ServicioAdminProps = {
    services: services,
    selectedService: selectedService,
    setSelectedService: setSelectedService,
    createService: createService,
    deleteService: deleteService,
    duplicateService: duplicateService,
    members: members,
    songs: songs,
    blocks: blocks,
    setBlocks: setBlocks,
    bandaItems: bandaItems,
    invitations: invitations,
    equipoDeInvitacion: equipoDeInvitacion,
    membersFor: membersFor,
    getBanda: getBanda,
    assignBanda: assignBanda,
    getSlotsNeeded: getSlotsNeeded,
    updateSlotsNeeded: updateSlotsNeeded,
    sendInvites: sendInvites,
    sending: sending,
    aviso: aviso,
    resultadosCorreo: resultadosCorreo,
    onCerrarAviso: ()=>setAviso(null),
    reintentarCorreo: reintentarCorreo,
    reintentandoId: reintentandoId,
    reinvitar: reinvitar,
    onBlocksChange: ()=>selectedService&&loadService(selectedService),
    equipoSections: equipoSections,
    addTeamTool: addTeamTool,
    removeTeamTool: removeTeamTool,
    dateBlocks: dateBlocks,
    darkMode: darkMode,
    canManageTemplates: isOrgAdmin,
    viewerMemberId: memberId||undefined,
    dataLoading: dataLoading,
    dataError: dataError,
    onRetryData: loadAllData,
    equipoInicial: urlSrv.equipo,
    avisoCreacion: createServiceMsg && selectedService?.id === createServiceMsgDe ? createServiceMsg : '',
    onCerrarAvisoCreacion: ()=>setCreateServiceMsg(''),
  }

  return (
    <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--anc-bg)',backgroundAttachment:'fixed',
      // Base tipográfica del mockup (body{font-size:.8125rem}) — sin esto,
      // todo lo que no fija su propio tamaño hereda el default del
      // navegador (16px) en vez del editorial (13px) y se ve "amateur".
      fontSize:'.8125rem',lineHeight:1.5,
      // En teléfono, la letra de la app (la del body, como el portal y el Home); en escritorio, la de siempre.
      fontFamily: telefono===true ? FONT_APP : '-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif'}}>
      <AppShell
        orgName="Iglesia Áncora"
        userInitials={userInitials}
        memberItems={memberNavItems}
        adminItems={adminNavItems}
        canAdmin={true}
        themePref={themePref}
        onThemePref={setThemePref}
        etiquetaModo={etiquetaDeModo(true)}      // /admin solo admite administradores y owners
        menuMovil={<MenuAdminMovil activo={activoDelMenu(tab)} onSelect={k=>{ if(k==='home') router.push('/home'); else if(k==='setlist' && tab==='setlist' && urlSrv.servicio) irServicio(VISTA_VACIA); else setTab(k) }} />}
        onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
        loadPerson={loadPerson}
        onEditPerson={onEditPerson}
      >
        {tab==='setlist' && (<>
          {createServiceMsg && telefono===false && (
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',marginBottom:10,background:'var(--sunk)',borderRadius:8,fontSize:12,color:'var(--v3-ink-3)'}}>
              <span style={{flex:1}}>{createServiceMsg}</span>
              <button onClick={()=>setCreateServiceMsg('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)'}}>✕</button>
            </div>
          )}
          {telefono===null ? null : listaMovil ? (<>
            <ListaServicios servicios={resumenServicios.servicios} cargando={resumenServicios.cargando} error={resumenServicios.error} onReintentar={resumenServicios.recargar}
              viewer={VIEWER_ADMIN} onAbrir={servicio=>irServicio({ servicio, equipo: null, herramienta: null })} onNuevo={()=>setNuevoAbierto(true)} />
            {nuevoAbierto && <HojaNuevoServicio services={services} crear={createService} onCerrar={()=>setNuevoAbierto(false)} onCreado={id=>irServicio({ servicio: id, equipo: null, herramienta: null })} />}
          </>) : telefono===true ? (
            <ServicioMovil p={servicioProps} viewer={VIEWER_ADMIN} vista={urlSrv} irA={irServicio} volver={volverServicio} onIrAPersonas={()=>router.push('/admin?tab=personas&gestion=equipo')} onEditarPosiciones={teamId=>router.push(`/admin?tab=personas&gestion=equipo&team=${encodeURIComponent(teamId)}`)} />
          ) : (
            <AdminServiceView {...servicioProps} />
          )}
        </>)}
        {(tab==='personas'||tab==='admins') && (
          <PersonasPanel
            members={members} onRefreshMembers={() => { void loadMembers() }} onMembersChanged={reloadPeople} darkMode={darkMode}
            errorCarga={dataError} onReintentarCarga={loadAllData}
            canSeeAdmins={isOrgOwner} roleByMember={roleByMember}
            activeTab={tab==='admins' && isOrgOwner ? 'admins' : 'personas'} gestionInicial={gestionInicial}
            onTabChange={(t: PersonasTab) => setTab(t)} onVolverAAdmin={() => setTab('admin')}
          />
        )}
        {tab==='canciones'        && (
          <CancionesPanel
            songs={songs} onRefreshSongs={() => { void loadSongs() }} memberId={memberId}
            errorCarga={dataError} onReintentarCarga={loadAllData}
            services={services} teamTools={teamTools} teamMembersFlat={teamMembersFlat}
            isAdmin={isOrgAdmin}
          />
        )}
        {tab==='disponibilidad'   && <AvailabilityPanel services={services} darkMode={darkMode} positionsByMember={positionsByMember} members={members} teams={teams} teamMembers={teamMembersFlat} />}
        {tab==='chats'            && <ChatModerationPanel darkMode={darkMode} />}
        {tab==='admin'            && <PantallaAdmin nombreOrg="Iglesia Áncora" esOwner={isOrgOwner} themePref={themePref} onThemePref={setThemePref}
          onIr={d=>{ if ('tab' in d) setTab(d.tab); else router.push(d.url) }} onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }} />}
      </AppShell>
      {editPersonId && members.find(m=>m.id===editPersonId) && (
        <AddPersonDialog
          mode="edit" initial={members.find(m=>m.id===editPersonId)}
          existingEmails={members.map(m=>m.email||'')}
          teams={teams.map(t=>({ id:t.id, name:t.name }))} teamsStatus="ready"
          currentTeamIds={teamMembersFlat.filter(tm=>tm.member_id===editPersonId).map(tm=>tm.team_id)}
          roleControl={isOrgOwner && roleByMember ? { current: roleByMember.get(editPersonId) ?? 'member', isSelf: editPersonId === memberId } : undefined}
          onSubmit={updatePerson}
          onSaved={name=>{ reloadPeople(); setPersonToast(`Se guardó ${name}`) }}
          onClose={()=>setEditPersonId(null)} />
      )}
      <PersonToast message={personToast} />
      {avisosFail && (
        <PersonNotice
          message={`El rol se aplicó, pero no se sincronizaron los avisos de ${avisosFail.email}. ${avisosFail.detail}`}
          actionLabel="Reintentar avisos"
          onAction={retryAvisos}
          onDismiss={()=>setAvisosFail(null)} />
      )}
    </div>
  )
}
