'use client'
/* ════════════════════════════════════════════════════════════════════════
   /home — pantalla de inicio del líder (fase 12).

   Vive en su propia ruta, fuera de /admin: no es un tab más, es el primer
   ítem de navegación (ver components/AppShell.tsx). Auth-gate idéntico al
   de app/admin/page.tsx (mismo is_org_admin) porque hoy esta app solo
   tiene login para admins/líderes — los músicos entran por
   app/portal/[token], que no pasa por acá.

   TODO (pendiente, no inventado esta pasada): falta definir qué ve un
   músico que algún día inicie sesión sin ser líder — hoy este Home solo
   se construyó para la vista de líder, tal como pidió el mockup.

   Carga sus propios datos (no comparte estado con AdminPageInner: son
   páginas/árboles de React distintos). Duplica un poco de la lógica de
   equipos/roster que ya existe en app/admin/page.tsx — queda anotado como
   candidato a extraer a un hook compartido más adelante, no se hizo acá
   para no agrandar esta pasada.
   ════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Team, TeamPosition, TeamTool, BandaAssignment, Invitation, ServicePositionSlots, ServiceBlock } from '@/lib/types'
import type { PersonDetail, PersonTeam, ServiceHistoryEntry } from '@/components/persona/PersonDrawer'
import { Home, type HomeProps, type CalendarDay, type AttentionItem, type UpcomingService, type Birthday, type TeamTab, type RosterSlot, type TeamResponse, type VolunteerLoad, type BlockedPerson, type DayDetail } from '@/components/home/Home'
import AppShell, { type ShellNavItem } from '@/components/AppShell'
import TexBg from '@/components/TexBg'
import { useDarkMode } from '@/lib/useDarkMode'
import { DEFAULT_ORGANIZATION_ID, ADMIN_MENU_ITEMS } from '@/lib/constants'
import { useAuthGate } from '@/lib/AuthGateContext'
import { buildHistoryRaw, servedServiceCount } from '@/lib/personHistory'
import { relativeSince } from '@/lib/relativeTime'

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
const MESES_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function fechaCorta(fecha: string) { const d = new Date(fecha+'T12:00:00'); return `${d.getDate()} de ${cap(MESES_FULL[d.getMonth()])}` }
function relativeLabel(fecha: string) {
  const d = new Date(fecha+'T12:00:00')
  const days = Math.round((Date.now()-d.getTime())/86400000)
  if (days<=0) return 'Hoy'
  if (days===1) return 'Ayer'
  if (days<7) return `Hace ${days} días`
  if (days<35) { const w=Math.round(days/7); return `Hace ${w} semana${w!==1?'s':''}` }
  const m=Math.round(days/30); return `Hace ${m} mes${m!==1?'es':''}`
}

// Ningún helper existente arma un grid de 6 filas con relleno de días
// fuera de mes — se escribe nuevo (mismo criterio de semana-en-lunes que
// ya usan DisponibilidadCalendar.tsx / AvailabilityPanel.tsx).
function buildCalendarDays(year: number, month: number, serviceDates: Set<string>, blockedDates: Set<string>, todayStr: string): CalendarDay[] {
  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const days: CalendarDay[] = []
  const iso = (y:number,m:number,d:number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  for (let i=startOffset; i>0; i--) {
    const d = daysInPrevMonth - i + 1
    const y2 = month===0 ? year-1 : year, m2 = month===0 ? 11 : month-1
    const key = iso(y2,m2,d)
    days.push({ label:String(d), dateISO:key, inMonth:false, hasService:serviceDates.has(key), hasBlock:blockedDates.has(key), isToday:false })
  }
  for (let d=1; d<=daysInMonth; d++) {
    const key = iso(year,month,d)
    days.push({ label:String(d), dateISO:key, inMonth:true, hasService:serviceDates.has(key), hasBlock:blockedDates.has(key), isToday:key===todayStr })
  }
  let next=1
  while (days.length%7!==0 || days.length<42) {
    const y2 = month===11 ? year+1 : year, m2 = month===11 ? 0 : month+1
    const key = iso(y2,m2,next)
    days.push({ label:String(next), dateISO:key, inMonth:false, hasService:serviceDates.has(key), hasBlock:blockedDates.has(key), isToday:false })
    next++
    if (days.length>=42) break
  }
  return days
}

// Posición(es) de una persona, para el panel de bloqueados del calendario
// (punto 15) — junta todos los team_positions de todos los equipos a los
// que pertenece. Mismo join que ya usa la lista de cumpleaños más abajo.
function positionLabelFor(
  memberId: string,
  teamMembersFlat: {id:string; member_id:string}[],
  teamMemberPositions: {team_member_id:string; team_position_id:string}[],
  teamPositions: TeamPosition[],
): string {
  const tmIds = teamMembersFlat.filter(tm => tm.member_id === memberId).map(tm => tm.id)
  const names = teamMemberPositions
    .filter(tmp => tmIds.includes(tmp.team_member_id))
    .map(tmp => teamPositions.find(p => p.id === tmp.team_position_id)?.name)
    .filter((n): n is string => !!n)
  return names.length ? names.join(' · ') : 'Sin posición asignada'
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <TexBg className="min-h-screen flex items-center justify-center">
        <div style={{width:36,height:36,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      </TexBg>
    }>
      <HomePageInner />
    </Suspense>
  )
}

function HomePageInner() {
  const router = useRouter()
  // La sesión + el rol ya no se resuelven acá: AuthGateProvider (montado
  // en app/layout.tsx) los resuelve UNA vez por sesión de pestaña y los
  // comparte con /admin — ver lib/AuthGateContext.tsx. Esta página solo
  // decide, con esos hechos, si /home admite a quien está mirando (admin/
  // owner O cualquier líder de equipo — a diferencia de /admin, que exige
  // is_org_admin) y redirige si no.
  const gate = useAuthGate()
  const memberId = gate.status === 'ready' ? gate.memberId : null
  const portalToken = gate.status === 'ready' ? gate.portalToken : null
  // punto 14 — /home ya no es solo para admins: un líder de equipo (sin
  // ser admin/owner) también entra, pero ve solo lo de SU equipo. viewerIsAdmin
  // = admin/owner de la organización (ve todo, como hoy). viewerTeamId = el
  // equipo del líder cuando NO es admin/owner (null si es admin/owner, o si
  // por algún motivo no se le encuentra equipo liderado).
  const viewerIsAdmin = gate.status === 'ready' && gate.isOrgAdmin
  // Mismo destino que antes (/login) para los dos casos de siempre: sin
  // sesión, o con sesión pero sin ser admin/owner/líder de ningún equipo.
  const allowed = gate.status === 'ready' && (gate.isOrgAdmin || gate.isAnyTeamLeader)
  useEffect(() => {
    // Sin sesión: no hay nada que mostrar acá, a /login (con "next" para
    // volver a esta misma URL después de loguearse).
    if (gate.status === 'denied') {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }
    // Con sesión pero sin rol de admin/owner/líder: ANTES esto mandaba a
    // /login, que no chequea sesión — con sesión ya abierta eso solo
    // repetía el login sin resolver nada (rebote). Ahora el render de
    // abajo (gate.status!=='ready'||!allowed) muestra un estado final de
    // "no tenés acceso" con cerrar sesión, sin redirigir.
  }, [gate.status])
  const { darkMode, themePref, setThemePref } = useDarkMode(memberId, { system: true })

  const [members, setMembers] = useState<Member[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamPositions, setTeamPositions] = useState<TeamPosition[]>([])
  const [teamMembersFlat, setTeamMembersFlat] = useState<{id:string;member_id:string;team_id:string;is_leader:boolean}[]>([])
  const [teamMemberPositions, setTeamMemberPositions] = useState<{team_member_id:string;team_position_id:string}[]>([])
  const [teamTools, setTeamTools] = useState<TeamTool[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [dateBlocks, setDateBlocks] = useState<{blocked_date:string; member_id:string}[]>([])

  const [activeTeamId, setActiveTeamId] = useState<string>('')
  const [monthOffset, setMonthOffset] = useState(0)
  // punto 15: fecha del día abierto en el calendario. null = panel cerrado.
  const [selectedDate, setSelectedDate] = useState<string|null>(null)

  // Datos del "próximo servicio": nómina, cupos y convocatoria — se
  // recargan cuando cambia el servicio de referencia.
  const [nextService, setNextService] = useState<Service|null>(null)
  const [nextBanda, setNextBanda] = useState<BandaAssignment[]>([])
  const [nextSlots, setNextSlots] = useState<ServicePositionSlots[]>([])
  const [nextInv, setNextInv] = useState<Invitation[]>([])
  const [nextBlocks, setNextBlocks] = useState<ServiceBlock[]>([])
  const [songsWithChart, setSongsWithChart] = useState<Set<string>>(new Set())

  const [secondUpcoming, setSecondUpcoming] = useState<{svc:Service; inv:Invitation[]; totalSlots:number; filled:number}|null>(null)

  const [teamResponses, setTeamResponses] = useState<TeamResponse[]>([])
  const [volunteerLoad, setVolunteerLoad] = useState<VolunteerLoad[]>([])

  // true una vez que loadBase() resolvió (services/members/etc ya están).
  // Antes de eso, Home no sabe si hay próximo servicio, si "nadie más
  // cumple este mes" o si "todo está al día" — nunca se le pasa un
  // estado vacío adivinado, solo loading. Si loadBase() falla, baseError
  // reemplaza el esqueleto por un mensaje + reintentar — nunca se queda
  // cargando para siempre.
  const [baseLoaded, setBaseLoaded] = useState(false)
  const [baseError, setBaseError] = useState<string|null>(null)
  const loadBase = useCallback(async () => {
    setBaseError(null)
    try {
      const [mRes, tRes, tpRes, tmRes, tmpRes, ttRes, sRes, dbRes] = await Promise.all([
        supabase.from('members').select('*').order('nombre'),
        supabase.from('teams').select('id, organization_id, name, sort_order, archived_at, color, created_at')
          .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
        supabase.from('team_positions').select('id, organization_id, team_id, name, code, default_slots, sort_order, archived_at, created_at')
          .eq('organization_id', DEFAULT_ORGANIZATION_ID).is('archived_at', null).order('sort_order'),
        supabase.from('team_members').select('id, member_id, team_id, is_leader').eq('organization_id', DEFAULT_ORGANIZATION_ID),
        supabase.from('team_member_positions').select('team_member_id, team_position_id'),
        supabase.from('team_tools').select('id, team_id, tool_type, sort_order, created_at'),
        supabase.from('services').select('*').order('fecha', { ascending: true }),
        // mismo patrón que AvailabilityPanel.tsx — se carga completo, igual
        // que services: en esta escala no vale la pena acotar por mes.
        supabase.from('date_blocks').select('blocked_date, member_id'),
      ])
      setMembers(mRes.data||[])
      setTeams(tRes.data||[])
      setTeamPositions(tpRes.data||[])
      setTeamMembersFlat(tmRes.data||[])
      setTeamMemberPositions(tmpRes.data||[])
      setTeamTools(ttRes.data||[])
      setServices(sRes.data||[])
      setDateBlocks(dbRes.data||[])
      // activeTeamId se fija más abajo (punto 14: admin ve el primer equipo,
      // un líder queda fijo en el suyo — ver el useEffect de viewerTeamId).
      setBaseLoaded(true)
    } catch (e:any) {
      setBaseError(e?.message || 'No se pudo cargar. Revisá tu conexión e intentá de nuevo.')
    }
  }, [])

  useEffect(() => { if (allowed) loadBase() }, [allowed, loadBase])

  // punto 14 — el equipo que este líder administra (null si es admin/owner,
  // que ven todo, o si por algún motivo no lidera ningún equipo).
  const viewerTeamId = useMemo(() => {
    if (viewerIsAdmin || !memberId) return null
    return teamMembersFlat.find(tm => tm.member_id === memberId && tm.is_leader)?.team_id || null
  }, [viewerIsAdmin, memberId, teamMembersFlat])

  useEffect(() => {
    if (viewerIsAdmin && teams[0]) setActiveTeamId(teams[0].id)
    else if (viewerTeamId) setActiveTeamId(viewerTeamId)
  }, [viewerIsAdmin, viewerTeamId, teams])

  // punto 14/15 — conteo de bloqueados de los equipos que este líder NO
  // administra, para el día abierto en el calendario. Los de SU equipo ya
  // vienen en teamMembersFlat/dateBlocks (dayDetail.blocked, abajo) — esto
  // es solo el resto, y solo aplica a un líder (un admin/owner ya ve todo
  // en `blocked`, así que no le hace falta este fetch aparte).
  const [otherTeamsBlocked, setOtherTeamsBlocked] = useState<{teamName:string; count:number}[]>([])
  useEffect(() => {
    if (!selectedDate || viewerIsAdmin || !viewerTeamId) { setOtherTeamsBlocked([]); return }
    supabase.rpc('blocked_others_summary', {
      p_email: members.find(m=>m.id===memberId)?.email || '',
      p_organization_id: DEFAULT_ORGANIZATION_ID,
      p_date: selectedDate,
      p_own_team_id: viewerTeamId,
    }).then(({ data }) => {
      setOtherTeamsBlocked((data||[]).map((r:any) => ({ teamName: r.team_name, count: Number(r.cnt) })))
    })
  }, [selectedDate, viewerIsAdmin, viewerTeamId, memberId, members])

  // ── próximo servicio (mismo criterio que loadServices en admin/page.tsx,
  // pero independiente de cualquier selección manual) ──
  const soloServicios = useMemo(() => services.filter(s=>s.tipo!=='ensayo'), [services])
  useEffect(() => {
    if (!soloServicios.length) { setNextService(null); return }
    const now = new Date()
    const next = soloServicios.find(s => new Date(s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00') > now)
    setNextService(next || soloServicios[soloServicios.length-1] || null)
  }, [soloServicios])

  useEffect(() => {
    if (!nextService) { setNextBanda([]); setNextSlots([]); setNextInv([]); setNextBlocks([]); return }
    Promise.all([
      supabase.from('banda_assignments').select('*, member:members(*)').eq('service_id', nextService.id),
      supabase.from('service_position_slots').select('*').eq('service_id', nextService.id),
      supabase.from('invitations').select('*').eq('service_id', nextService.id),
      supabase.from('service_blocks').select('*, song:songs(*)').eq('service_id', nextService.id).order('orden'),
    ]).then(([b,sl,i,bl]) => {
      setNextBanda(b.data||[]); setNextSlots(sl.data||[]); setNextInv(i.data||[]); setNextBlocks(bl.data||[])
    })
  }, [nextService])

  // el segundo servicio próximo (para "Próximos servicios")
  useEffect(() => {
    const idx = nextService ? soloServicios.findIndex(s=>s.id===nextService.id) : -1
    const svc = idx>=0 ? soloServicios[idx+1] : undefined
    if (!svc) { setSecondUpcoming(null); return }
    Promise.all([
      supabase.from('invitations').select('*').eq('service_id', svc.id),
      supabase.from('service_position_slots').select('*').eq('service_id', svc.id),
    ]).then(([i,sl]) => {
      const totalSlots = (sl.data||[]).reduce((a,s)=>a+s.slots_needed,0) || teamPositions.length
      setSecondUpcoming({ svc, inv: i.data||[], totalSlots, filled: (i.data||[]).length })
    })
  }, [nextService, soloServicios, teamPositions.length])

  // ── canciones sin acordes, para "Necesita atención" ──
  useEffect(() => {
    const songIds = Array.from(new Set(nextBlocks.filter(b=>b.tipo==='cancion' && b.song_id).map(b=>b.song_id!)))
    if (!songIds.length) { setSongsWithChart(new Set()); return }
    supabase.from('song_sections').select('song_id').in('song_id', songIds)
      .then(({data}) => setSongsWithChart(new Set((data||[]).map((r:any)=>r.song_id))))
  }, [nextBlocks])

  // ── respuesta por equipo + carga de voluntarios, últimos 3 meses ──
  useEffect(() => {
    if (!teams.length) return
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth()-3)
    const cutoffStr = cutoff.toISOString().slice(0,10)
    const windowServiceIds = services.filter(s=>s.tipo!=='ensayo' && s.fecha>=cutoffStr && s.fecha<=new Date().toISOString().slice(0,10)).map(s=>s.id)
    if (!windowServiceIds.length) { setTeamResponses([]); setVolunteerLoad([]); return }
    Promise.all([
      supabase.from('banda_assignments').select('service_id, posicion, member_id').in('service_id', windowServiceIds),
      supabase.from('invitations').select('service_id, member_id, status, sent_at').in('service_id', windowServiceIds),
    ]).then(([bRes, iRes]) => {
      const banda = (bRes.data||[]) as {service_id:string; posicion:string; member_id:string|null}[]
      const invs = (iRes.data||[]) as {service_id:string; member_id:string; status:string; sent_at:string|null}[]
      const posToTeam = new Map(teamPositions.map(p=>[p.name, p.team_id]))

      // equipo de cada invitación: se resuelve vía la asignación de esa
      // misma (service_id, member_id) — invitations no guarda equipo.
      const teamOf = new Map<string,string>() // `${service_id}_${member_id}` -> team_id
      for (const b of banda) {
        if (!b.member_id) continue
        const teamId = posToTeam.get(b.posicion)
        if (teamId) teamOf.set(`${b.service_id}_${b.member_id}`, teamId)
      }

      const byTeam = new Map<string,{confirmado:number; declinado:number; pendiente:number; total:number}>()
      for (const inv of invs) {
        const teamId = teamOf.get(`${inv.service_id}_${inv.member_id}`)
        if (!teamId) continue
        const acc = byTeam.get(teamId) || {confirmado:0,declinado:0,pendiente:0,total:0}
        acc.total++
        if (inv.status==='confirmado') acc.confirmado++
        else if (inv.status==='declinado') acc.declinado++
        else acc.pendiente++
        byTeam.set(teamId, acc)
      }
      setTeamResponses(teams.filter(t=>byTeam.has(t.id)).map(t => {
        const a = byTeam.get(t.id)!
        return {
          teamId: t.id, teamName: t.name, color: t.color ?? null,
          confirmedPct: Math.round(a.confirmado/a.total*100),
          declinedPct: Math.round(a.declinado/a.total*100),
          noReplyPct: Math.round(a.pendiente/a.total*100),
        }
      }))

      // carga de voluntarios: cuenta = SERVICIOS distintos con invitación
      // confirmada (no asignaciones: quien tiene Voz 1 y Guitarra acústica
      // en el mismo servicio cuenta 1); población = solo quienes tienen al
      // menos una invitación con sent_at no nulo en la ventana (convocados
      // de verdad) — así "nunca convocado" no aparece igual que "convocado
      // y no sirvió".
      const invitedMemberIds = new Set(invs.filter(i=>i.sent_at).map(i=>i.member_id))
      const confirmedKey = new Set(invs.filter(i=>i.status==='confirmado').map(i=>`${i.service_id}_${i.member_id}`))
      const servicesByMember = new Map<string, Set<string>>()
      for (const id of Array.from(invitedMemberIds)) servicesByMember.set(id, new Set())
      for (const b of banda) {
        if (!b.member_id || !invitedMemberIds.has(b.member_id)) continue
        if (!confirmedKey.has(`${b.service_id}_${b.member_id}`)) continue
        servicesByMember.get(b.member_id)!.add(b.service_id)
      }
      const counts = new Map<string, number>()
      servicesByMember.forEach((svcs, id) => counts.set(id, svcs.size))
      const maxCount = Math.max(1, ...Array.from(counts.values()))
      const list: VolunteerLoad[] = Array.from(counts.entries())
        .map(([personId, count]) => {
          const m = members.find(x=>x.id===personId)
          return { personId, initials: m?`${m.nombre?.[0]||''}${m.apellido?.[0]||''}`.toUpperCase():'—', name: m?`${m.nombre} ${m.apellido}`:'—', count, maxCount }
        })
        .sort((a,b) => b.count-a.count)
      setVolunteerLoad(list)
    })
  }, [teams, teamPositions, services, members])

  // ── loadPerson para el PersonDrawer — mismo criterio que app/admin/page.tsx ──
  const loadPerson = useCallback(async (personId: string): Promise<PersonDetail> => {
    const member = members.find(m => m.id === personId)
    const teamsList: PersonTeam[] = teamMembersFlat.filter(tm => tm.member_id === personId).map(tm => {
      const team = teams.find(t => t.id === tm.team_id)
      const posIds = teamMemberPositions.filter(tmp => tmp.team_member_id === tm.id).map(tmp => tmp.team_position_id)
      const positionNames = posIds.map(pid => teamPositions.find(p => p.id === pid)?.name).filter(Boolean) as string[]
      return { teamId: tm.team_id, teamName: team?.name || '', isLeader: tm.is_leader, positionNames, color: team?.color ?? null }
    })
    const [bandaRes, invRes] = await Promise.all([
      supabase.from('banda_assignments').select('id,service_id,posicion,service:services(fecha,titulo,tipo)').eq('member_id', personId),
      supabase.from('invitations').select('service_id,status,service:services(fecha,titulo,tipo)').eq('member_id', personId),
    ])
    const all = buildHistoryRaw({ banda: (bandaRes.data||[]) as any[], invitations: (invRes.data||[]) as any[], teamPositions, teams })
    const history: ServiceHistoryEntry[] = all.slice(0,10).map(e => ({ id:e.id, dateLabel:fechaCorta(e.fecha), positionName:e.positionName, serviceName:e.serviceName, teamName:e.teamName, status:e.status }))
    const served = all.filter(e=>e.status==='served')
    const now = new Date()
    const yearStart = `${now.getFullYear()}-01-01`
    const quarterAgo = new Date(now); quarterAgo.setMonth(now.getMonth()-3)
    const quarterAgoStr = quarterAgo.toISOString().slice(0,10)
    return {
      id: personId,
      fullName: member ? `${member.nombre} ${member.apellido}` : '',
      initials: member ? `${member.nombre?.[0]||''}${member.apellido?.[0]||''}`.toUpperCase() : '',
      email: member?.email || '',
      phone: member?.telefono,
      hasApp: !!member?.instalado_pwa_at,
      avatarUrl: member?.avatar_url ?? null,
      lastSeenLabel: member?.last_seen ? relativeSince(member.last_seen) : 'Nunca',
      teams: teamsList,
      stats: {
        yearCount: servedServiceCount(all, yearStart),
        lastQuarterCount: servedServiceCount(all, quarterAgoStr),
        lastServedLabel: served[0] ? relativeLabel(served[0].fecha) : 'Nunca',
      },
      history,
    }
  }, [members, teams, teamPositions, teamMembersFlat, teamMemberPositions])

  // «Editar» abre el pop-up de edición, que vive en /admin: ?edit= lo abre y se quita solo.
  function onEditPerson(personId: string) { router.push(`/admin?tab=personas&edit=${personId}`) }

  // ── nómina del próximo servicio (mismo patrón que equipoSections/getBanda
  // en app/admin/page.tsx, en modo solo-lectura) ──
  const getSlotsNeeded = useCallback((posId: string) => nextSlots.find(s=>s.team_position_id===posId)?.slots_needed || 1, [nextSlots])
  const getBanda = useCallback((posId: string, slotIndex: number) => {
    const posName = teamPositions.find(p=>p.id===posId)?.name
    return posName ? nextBanda.find(b=>b.posicion===posName && b.slot_index===slotIndex) : undefined
  }, [teamPositions, nextBanda])
  const getInvStatus = useCallback((memberId?: string) => memberId ? (nextInv.find(i=>i.member_id===memberId)?.status||null) : null, [nextInv])

  // punto 14 — un líder (no admin/owner) solo ve la pestaña de SU equipo,
  // no un selector de todos los equipos de la organización.
  const teamTabs: TeamTab[] = (viewerIsAdmin ? teams : teams.filter(t=>t.id===viewerTeamId))
    .map(t => ({ id:t.id, name:t.name, color:t.color ?? null, memberCount: teamMembersFlat.filter(tm=>tm.team_id===t.id).length }))
  const roster: RosterSlot[] = useMemo(() => {
    const positions = teamPositions.filter(p=>p.team_id===activeTeamId)
    const out: RosterSlot[] = []
    for (const pos of positions) {
      const n = getSlotsNeeded(pos.id)
      for (let slot=1; slot<=n; slot++) {
        const asig = getBanda(pos.id, slot)
        const status = getInvStatus(asig?.member_id)
        out.push({
          id: `${pos.id}-${slot}`, code: pos.code,
          personName: asig?.member ? `${asig.member.nombre} ${asig.member.apellido||''}`.trim() : null,
          status: status==='confirmado' ? 'confirmed' : status==='declinado' ? 'declined' : status==='pendiente' ? 'pending' : null,
        })
      }
    }
    return out
  }, [teamPositions, activeTeamId, getSlotsNeeded, getBanda, getInvStatus])

  // ── "Necesita atención" ──
  const attention: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = []
    if (nextService) {
      let uncovered = 0
      const shortPositions: string[] = []
      for (const pos of teamPositions) {
        const n = getSlotsNeeded(pos.id)
        let filled = 0
        for (let slot=1; slot<=n; slot++) if (getBanda(pos.id, slot)?.member_id) filled++
        if (filled < n) { uncovered += (n-filled); shortPositions.push(n-filled>1 ? `${pos.name} ${n-filled}` : pos.name) }
      }
      if (uncovered > 0) {
        items.push({
          id: 'uncovered', count: uncovered, title: `Posiciones sin cubrir para el próximo servicio`,
          detail: shortPositions.slice(0,4).join(' · '), actionLabel: 'Asignar',
          onAction: () => router.push('/admin?tab=setlist'), emphasis: true,
        })
      }
      const hoursToService = (new Date(nextService.fecha+'T'+(nextService.hora_inicio||'10:00')).getTime() - Date.now()) / 3600000
      if (hoursToService <= 24 && hoursToService >= 0) {
        const pendingMembers = nextInv.filter(i=>i.status==='pendiente').map(i=>members.find(m=>m.id===i.member_id)).filter(Boolean) as Member[]
        if (pendingMembers.length > 0) {
          const names = pendingMembers.slice(0,4).map(m=>m.nombre).join(', ') + (pendingMembers.length>4 ? ` y ${pendingMembers.length-4} más` : '')
          items.push({
            id: 'pending24h', count: pendingMembers.length, title: 'Sin confirmar a menos de 24 horas',
            detail: names, actionLabel: 'Recordar', onAction: () => router.push('/admin?tab=setlist'),
          })
        }
      }
      const songsSinAcordes = Array.from(new Set(nextBlocks.filter(b=>b.tipo==='cancion' && b.song_id && !songsWithChart.has(b.song_id!))))
      if (songsSinAcordes.length > 0) {
        items.push({
          id: 'noChart', count: songsSinAcordes.length, title: 'Canciones del domingo sin acordes cargados',
          detail: songsSinAcordes.map(b=>(b.song as any)?.nombre).filter(Boolean).join(' · '),
          actionLabel: 'Cargar', onAction: () => router.push('/admin?tab=canciones'),
        })
      }
    }
    return items
  }, [nextService, teamPositions, getSlotsNeeded, getBanda, nextInv, nextBlocks, songsWithChart, members, router])

  const upcoming: UpcomingService[] = useMemo(() => {
    const out: UpcomingService[] = []
    if (nextService) {
      const confirmed = nextInv.filter(i=>i.status==='confirmado').length
      const called = nextInv.filter(i=>i.sent_at).length
      let uncovered = 0
      for (const pos of teamPositions) { const n=getSlotsNeeded(pos.id); let f=0; for(let s=1;s<=n;s++) if(getBanda(pos.id,s)?.member_id) f++; uncovered += Math.max(0,n-f) }
      out.push({
        id: nextService.id, dayNumber: String(new Date(nextService.fecha+'T12:00:00').getDate()), title: fechaCorta(nextService.fecha),
        detail: called===0 ? 'Sin convocar todavía' : `${confirmed} de ${called} confirmados · ${uncovered} sin cubrir`,
        isNext: true,
      })
    }
    if (secondUpcoming) {
      const confirmed = secondUpcoming.inv.filter(i=>i.status==='confirmado').length
      const called = secondUpcoming.inv.filter(i=>i.sent_at).length
      out.push({
        id: secondUpcoming.svc.id, dayNumber: String(new Date(secondUpcoming.svc.fecha+'T12:00:00').getDate()), title: fechaCorta(secondUpcoming.svc.fecha),
        detail: called===0 ? 'Sin convocar todavía' : `${confirmed} de ${called} confirmados`,
        isNext: false,
      })
    }
    return out
  }, [nextService, nextInv, teamPositions, getSlotsNeeded, getBanda, secondUpcoming])

  // ── cumpleaños ──
  const today = new Date()
  const birthdayEntries = useMemo(() => members
    .filter(m=>m.fecha_nacimiento)
    .map(m => { const d = new Date(m.fecha_nacimiento!+'T12:00:00'); return { m, day:d.getDate(), month:d.getMonth() } })
    .filter(x=>x.month===today.getMonth())
    .sort((a,b)=>a.day-b.day), [members])
  const birthdayToday: Birthday|null = useMemo(() => {
    const hit = birthdayEntries.find(x=>x.day===today.getDate())
    if (!hit) return null
    return { id: hit.m.id, dayNumber: String(hit.day), name: `${hit.m.nombre} ${hit.m.apellido}`, roleLabel: teamMembersFlat.find(tm=>tm.member_id===hit.m.id) ? (teamPositions.find(p=>teamMemberPositions.some(tmp=>tmp.team_position_id===p.id && teamMembersFlat.some(tm=>tm.id===tmp.team_member_id && tm.member_id===hit.m.id)))?.name || '') : ''
    }
  }, [birthdayEntries, teamMembersFlat, teamPositions, teamMemberPositions])
  const birthdaysThisMonth: Birthday[] = birthdayEntries.filter(x=>x.day!==today.getDate()).map(x => ({
    id: x.m.id, dayNumber: String(x.day), name: `${x.m.nombre} ${x.m.apellido}`, roleLabel: '',
  }))

  const monthDate = new Date(today.getFullYear(), today.getMonth()+monthOffset, 1)
  const monthServiceDates = useMemo(() => new Set(services.map(s=>s.fecha)), [services])
  const monthBlockedDates = useMemo(() => new Set(dateBlocks.map(b=>b.blocked_date)), [dateBlocks])

  // punto 15: detalle del día abierto en el calendario — servicio de esa
  // fecha (si hay) + quién la bloqueó. Todo sale de datos ya cargados en
  // loadBase, sin fetch adicional al hacer clic.
  const dayDetail: DayDetail | null = useMemo(() => {
    if (!selectedDate) return null
    const d = new Date(selectedDate+'T12:00:00')
    const svc = services.find(s => s.fecha === selectedDate)
    // punto 14 — para un líder, teamMembersFlat ya llega filtrada por RLS a
    // SOLO su equipo (ver migrations/023, PASO 7): un bloqueado que no
    // aparece ahí no es de su equipo, y no debe mostrarse con nombre acá.
    // Para admin/owner, teamMembersFlat trae a todo el mundo — no cambia nada.
    const blocked: BlockedPerson[] = dateBlocks
      .filter(b => b.blocked_date === selectedDate)
      .filter(b => viewerIsAdmin || teamMembersFlat.some(tm => tm.member_id === b.member_id))
      .map(b => {
        const m = members.find(mm => mm.id === b.member_id)
        if (!m) return null
        return {
          id: b.member_id,
          name: `${m.nombre} ${m.apellido}`,
          position: positionLabelFor(b.member_id, teamMembersFlat, teamMemberPositions, teamPositions),
        }
      })
      .filter((x): x is BlockedPerson => !!x)
    return {
      dateISO: selectedDate,
      dateLabel: `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${cap(MESES_FULL[d.getMonth()])}`,
      service: svc ? {
        title: svc.titulo,
        timeRange: svc.hora_inicio ? `${svc.hora_inicio.slice(0,5)}${svc.hora_fin ? ' — '+svc.hora_fin.slice(0,5) : ''}` : '',
        // punto 16 — "Ensayo" ya no es un tab propio: vive en Servicio,
        // como cualquier otro kind de `services`.
        onOpen: () => router.push('/admin?tab=setlist'),
      } : null,
      blocked,
      otherTeamsBlocked,
    }
  }, [selectedDate, services, dateBlocks, members, teamMembersFlat, teamMemberPositions, teamPositions, router, viewerIsAdmin, otherTeamsBlocked])

  const currentMember = members.find(m=>m.id===memberId)
  const userInitials = currentMember ? `${currentMember.nombre?.[0]||''}${currentMember.apellido?.[0]||''}`.toUpperCase() : '··'
  // punto 14 — /admin sigue siendo solo para admin/owner (no se tocó su
  // auth-gate en esta pasada): un líder que no lo es no puede abrir
  // ninguno de esos tabs todavía, así que estos links quedarían muertos
  // para él. Se le queda un Home con nomina/calendario de su equipo y
  // sin nav rota, a la espera de que /admin distinga tabs por rol.
  const memberNavItems: ShellNavItem[] = viewerIsAdmin ? [
    { key:'home', label:'Home', href:'/home', active:true },
    { key:'setlist', label:'Servicio', href:'/admin?tab=setlist' },
    { key:'canciones', label:'Canciones', href:'/admin?tab=canciones' },
    { key:'disponibilidad', label:'Calendario', href:'/admin?tab=disponibilidad' },
  ] : [
    { key:'home', label:'Home', href:'/home', active:true },
  ]
  // Misma lista que app/admin/page.tsx (ADMIN_MENU_ITEMS en lib/constants.ts)
  // — "Equipos" ya no es un ítem propio, es una pestaña dentro de
  // "Personas" (components/PersonasPanel.tsx).
  const adminNavItems: ShellNavItem[] = ADMIN_MENU_ITEMS.map(({key,label}) => ({
    key, label, href:`/admin?tab=${key}`,
  }))

  // Mientras se resuelve (o mientras se decide que no está permitido y el
  // efecto de arriba todavía no alcanzó a redirigir), se muestra el marco
  // completo (AppShell con su barra) y un esqueleto en el contenido — nunca
  // el Home real. No hay "pantalla completa" que reemplace todo: eso era
  // lo que hacía que /home → /admin (o al revés) se viera como una recarga.
  //
  // "Verificando acceso..." es honesto SOLO mientras el gate todavía no
  // resolvió (idle/loading). Si ya resolvió y no está permitido, no está
  // "verificando" nada — está por redirigir — así que ahí el esqueleto
  // queda vacío, sin ese texto.
  if (gate.status !== 'ready' || !allowed) {
    const verifying = gate.status === 'idle' || gate.status === 'loading'
    const noAccess = gate.status === 'ready' && !allowed
    return (
    <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--anc-bg)'}}>
      <div className="anc">
        <AppShell
          orgName="Iglesia Áncora" userInitials="··" memberItems={[]}
          canAdmin={false} themePref={themePref} onThemePref={setThemePref}
          onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
          loadPerson={async()=>{ throw new Error('No disponible todavía') }} onEditPerson={()=>{}}
        >
          {verifying && (
            <div style={{padding:'40px 0',textAlign:'center'}}>
              <div style={{width:28,height:28,border:'2px solid var(--anc-ink-4)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
              <p style={{color:'var(--anc-ink-3)',fontSize:13,fontWeight:300}}>Verificando acceso...</p>
            </div>
          )}
          {noAccess && (
            <div style={{padding:'40px 20px',textAlign:'center'}}>
              <p style={{color:'var(--anc-ink-2)',fontSize:14,fontWeight:700,marginBottom:8}}>No tenés acceso a esta sección</p>
              <p style={{color:'var(--anc-ink-3)',fontSize:13,marginBottom:20}}>Tu cuenta no tiene un rol de administrador ni de líder de equipo.</p>
              <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
                style={{background:'var(--anc-accent)',color:'var(--anc-on-accent)',border:'none',borderRadius:'var(--anc-r)',padding:'9px 18px',fontSize:'.8125rem',fontWeight:600,cursor:'pointer'}}>
                Cerrar sesión
              </button>
            </div>
          )}
        </AppShell>
      </div>
    </div>
    )
  }

  const homeProps: HomeProps = {
    loading: !baseLoaded,
    error: baseError,
    onRetry: loadBase,
    greeting: `Hola, ${currentMember?.nombre || ''}`,
    todayLabel: `${cap(DIAS[today.getDay()])} ${today.getDate()} de ${cap(MESES_FULL[today.getMonth()])}${nextService ? ' · el próximo servicio es ' + relativeServiceLabel(nextService.fecha) : ''}`,
    next: nextService ? {
      whenLabel: relativeServiceLabel(nextService.fecha).toUpperCase() + (nextService.hora_inicio ? ` · ${nextService.hora_inicio.slice(0,5)}` : ''),
      title: fechaCorta(nextService.fecha),
      meta: `${nextService.titulo} · ${nextBlocks.length} items`,
      calledCount: nextInv.filter(i=>i.sent_at).length,
      confirmedCount: nextInv.filter(i=>i.status==='confirmado').length,
      uncoveredCount: attention.find(a=>a.id==='uncovered')?.count || 0,
      songCount: nextBlocks.length,
      pendingCount: nextInv.filter(i=>i.status==='pendiente').length,
      onOpen: () => router.push('/admin?tab=setlist'),
      onRemind: () => router.push('/admin?tab=setlist'),
    } : null,
    calendar: {
      monthLabel: `${cap(MESES_FULL[monthDate.getMonth()])} ${monthDate.getFullYear()}`,
      days: buildCalendarDays(monthDate.getFullYear(), monthDate.getMonth(), monthServiceDates, monthBlockedDates, today.toISOString().slice(0,10)),
      onPrev: () => { setMonthOffset(o=>o-1); setSelectedDate(null) },
      onNext: () => { setMonthOffset(o=>o+1); setSelectedDate(null) },
      selectedDate,
      dayDetail,
      onDayClick: (dateISO) => setSelectedDate(cur => cur===dateISO ? null : dateISO),
      onCloseDay: () => setSelectedDate(null),
    },
    attention,
    upcoming,
    birthdayToday,
    birthdaysThisMonth,
    monthLabel: cap(MESES_FULL[today.getMonth()]),
    onGreet: (personId) => router.push(`/admin?tab=personas&person=${personId}`),
    teamTabs,
    activeTeamId,
    onTeamChange: setActiveTeamId,
    roster,
    teamResponses,
    volunteerLoad,
    onPersonClick: (personId) => router.push(`/admin?tab=personas&person=${personId}`),
  }

  return (
    <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--anc-bg)'}}>
      <div className="anc">
        <AppShell
          orgName="Iglesia Áncora" userInitials={userInitials} memberItems={memberNavItems} adminItems={adminNavItems}
          canAdmin={viewerIsAdmin} themePref={themePref} onThemePref={setThemePref}
          portalHref={portalToken ? `/portal/${portalToken}` : undefined}
          onSignOut={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
          loadPerson={loadPerson} onEditPerson={onEditPerson}
        >
          <Home {...homeProps} />
        </AppShell>
      </div>
    </div>
  )
}

function relativeServiceLabel(fecha: string): string {
  const d = new Date(fecha+'T12:00:00')
  const days = Math.round((d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
  if (days===0) return 'hoy'
  if (days===1) return 'mañana'
  return DIAS[d.getDay()] === DIAS[new Date().getDay()] ? `en ${days} días` : `el ${DIAS[d.getDay()]}`
}
