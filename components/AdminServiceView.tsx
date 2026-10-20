'use client'
import { TEXTOS } from '@/lib/textos/comun'
import { useState, useEffect, useRef } from 'react'
import { ChevronDown, MoreHorizontal, Plus, Trash2, User } from 'lucide-react'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock, ToolType, TeamTool } from '@/lib/types'
import ChecklistTool from './ChecklistTool'
import ScheduleTool from './ScheduleTool'
import FreeTextTool from './FreeTextTool'
import EnsayoPanel from './EnsayoPanel'
import styles from './app.module.css'
import { usePersonDrawer } from './persona/PersonDrawer'
import OrdenDelServicio, { C, ACCENT } from './OrdenDelServicio'
import AssignPicker from './AssignPicker'
import { buildAssignOptions, positionMaps } from '@/lib/assignHints'
import { isTeamColor } from '@/lib/teamColors'
import { TeamDot, TeamMono } from './TeamColor'
import { blockedIdsForTeam, type TeamBlockRow } from '@/lib/teamBlocks'
import MensajeConvocatoria from './MensajeConvocatoria'
import ProblemaCorreo from './ProblemaCorreo'
import type { AvisoConvocatoria, ResultadoDestinatario } from '@/lib/convocatoriaTypes'
import { problemaDeCorreo, resultadoDe } from '@/lib/problemasCorreo'
import { cuentaComoRechazo, esDeOtroEquipo, textoAceptoEn } from '@/lib/convocatoriaEstado'
import { vacantesPorConflicto } from '@/lib/vacantesPorConflicto'

const ALL_TOOLS: { type: ToolType; label: string }[] = [
  { type: 'setlist', label: 'Setlist' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'schedule', label: 'Cronograma' },
  { type: 'notes', label: 'Notas' },
  { type: 'file_upload', label: 'Subir archivo' },
]

// mes con mayúscula inicial, para dateHeadline/pickerLabel (regla v3)
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

interface Props {
  services: Service[]
  selectedService: Service|null
  setSelectedService: (s:Service)=>void
  createService: (fecha:string, horaInicio?:string, horaFin?:string, kind?:'service'|'rehearsal'|'other', extra?:{parentServiceId?:string; lugar?:string; direccion?:string; mapsLink?:string})=>void
  deleteService: (id:string)=>void
  duplicateService: (id:string,fecha:string)=>void
  members: Member[]
  songs: Song[]
  blocks: ServiceBlock[]
  setBlocks: (updater: ServiceBlock[] | ((prev: ServiceBlock[]) => ServiceBlock[])) => void
  bandaItems: BandaAssignment[]
  invitations: Invitation[]
  /** id de invitación → su equipo (también las de otros servicios del mismo día): para decir «Aceptó en {equipo}». */
  equipoDeInvitacion?: Record<string, string | null>
  membersFor: (posId:string)=>Member[]
  getBanda: (posId:string,slotIndex?:number)=>BandaAssignment|undefined
  assignBanda: (posId:string,memberId:string,slotIndex?:number)=>void
  getSlotsNeeded: (posId:string)=>number
  updateSlotsNeeded: (posId:string,newCount:number)=>void
  sendInvites: (teamId?: string)=>void
  sending: boolean
  // Resultado de la última convocatoria/reinvitación (punto 61): persiste hasta «Cerrar»; lo guarda la página.
  // Errores generales (rojo) e info (una línea que se va sola) de la última llamada; el resultado POR PERSONA ya no tiene panel (punto 61, ajuste de octubre 2026): con éxito no se
  // muestra nada, y quien tiene un problema de correo lleva un «!» en la nómina. resultadosCorreo = lo que devolvieron los envíos de esta pantalla (se pierde al recargar o cambiar de servicio).
  aviso: AvisoConvocatoria | null
  resultadosCorreo: ResultadoDestinatario[]
  onCerrarAviso: () => void
  // «Reintentar correo» (punto 61): reintenta solo el correo de esa persona, sin tocar sent_at. reintentandoId = quién está en curso.
  reintentarCorreo: (memberId: string, teamId: string) => void
  reintentandoId: string | null
  reinvitar: (memberId:string, teamId:string)=>void
  onBlocksChange: ()=>void
  // Un equipo del módulo Equipos = una columna del tablero; sus posiciones
  // son las filas de esa columna. 100% dinámico, sin nombres ni cantidades
  // fijas — puede haber cualquier cantidad de equipos, cada uno con
  // cualquier cantidad de posiciones. Cada posición lleva su id (para
  // membersFor/getBanda/assignBanda) además del nombre a mostrar. Un
  // equipo puede tener varias herramientas activas a la vez, incluso
  // repetidas — cada una es una instancia independiente (su propio id).
  equipoSections: { teamId: string; nombre: string; color: string | null; tools: TeamTool[]; posiciones: {id:string; nombre:string; codigo:string; seccionNombre:string|null}[] }[]
  addTeamTool: (teamId: string, toolType: ToolType) => void
  removeTeamTool: (teamToolId: string) => void
  dateBlocks: TeamBlockRow[] // punto 51: (persona, equipo) bloqueados en la fecha del servicio
  darkMode?: boolean
  // punto 25 — plantillas por herramienta: solo owner/admin las administra
  // (crea, aplica, actualiza, borra). viewerMemberId queda registrado como
  // created_by al guardar una plantilla nueva.
  canManageTemplates?: boolean
  viewerMemberId?: string
  // Carga inicial de services/teams/etc (app/admin/page.tsx). Mientras
  // dataLoading, ningún "Sin equipos todavía"/"Sin servicios futuros" se
  // muestra — sería un vacío adivinado, no real. dataError reemplaza el
  // esqueleto por un mensaje + reintentar si la carga falló (nunca se
  // queda cargando para siempre).
  dataLoading?: boolean
  dataError?: string | null
  onRetryData?: () => void
  /** El equipo que pide la URL (?equipo=): queda elegida su pestaña. No cambia nada de lo que se ve. */
  equipoInicial?: string | null
}

export default function AdminServiceView({
  services,selectedService,setSelectedService,createService,
  deleteService,duplicateService,
  members,songs,blocks,setBlocks,bandaItems,invitations,equipoDeInvitacion,
  membersFor,getBanda,assignBanda,getSlotsNeeded,updateSlotsNeeded,
  sendInvites,sending,aviso,resultadosCorreo,onCerrarAviso,reintentarCorreo,reintentandoId,onBlocksChange,reinvitar,
  equipoSections,
  addTeamTool,
  removeTeamTool,
  dateBlocks,
  darkMode,
  canManageTemplates,
  viewerMemberId,
  dataLoading,
  dataError,
  onRetryData,
  equipoInicial,
}: Props) {
  const { open: openPerson } = usePersonDrawer()
  // El resultado de una convocatoria es de UN servicio: solo se va al cambiar de servicio (o con «Cerrar»), nunca por tiempo.
  useEffect(() => { onCerrarAviso() }, [selectedService?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showNew,setShowNew]         = useState(false)
  const [newFecha,setNewFecha]       = useState('')
  const [newHoraInicio,setNewHoraInicio] = useState('10:00')
  const [newHoraFin,setNewHoraFin]   = useState('14:00')
  // punto 16 — tipo de servicio al crear: Servicio/Ensayo/Otro. Ensayo
  // pide de qué servicio depende (hereda canciones y nómina de ahí) y,
  // como puede ser en otro lugar, los mismos campos de lugar que ya
  // pedía el EnsayoPanel viejo.
  const [newKind,setNewKind]         = useState<'service'|'rehearsal'|'other'>('service')
  const [newParentId,setNewParentId] = useState('')
  const [newLugar,setNewLugar]       = useState('')
  const [newDireccion,setNewDireccion] = useState('')
  const [newMapsLink,setNewMapsLink] = useState('')
  const [showDup,setShowDup]         = useState(false)
  const [dupFecha,setDupFecha]       = useState('')
  const [showHistorial,setShowHistorial] = useState(false)
  const [showPicker,setShowPicker]   = useState(false)
  // Pestaña activa dentro de Servicio: el id de un equipo. Ya no existe
  // "Resumen" (se sacó — el Home ya muestra el estado del próximo
  // servicio). equipoSections está vacío en el primer render (todavía no
  // cargó de Supabase), así que un efecto más abajo corrige el default en
  // cuanto llegan los equipos reales.
  const [activeTeamTab,setActiveTeamTab] = useState<string>(equipoInicial || equipoSections[0]?.teamId || '')
  // Se aplica UNA vez por valor (equipoSections es un arreglo nuevo en cada render de la página: sin esta marca pisaría cada cambio de pestaña).
  const equipoAplicado = useRef<string | null>(null)
  useEffect(() => {
    if (!equipoInicial) { equipoAplicado.current = null; return }
    if (equipoAplicado.current === equipoInicial) return
    if (equipoSections.some(s => s.teamId === equipoInicial)) { equipoAplicado.current = equipoInicial; setActiveTeamTab(equipoInicial) }
  })

  useEffect(() => {
    if (equipoSections.length && !equipoSections.some(s => s.teamId === activeTeamTab)) {
      setActiveTeamTab(equipoSections[0].teamId)
    }
  }, [equipoSections, activeTeamTab])
  const [showAddToolMenu,setShowAddToolMenu] = useState(false)
  const [openSlotMenuId,setOpenSlotMenuId] = useState<string|null>(null)
  // Sin acciones destructivas sueltas — el "⋯" del encabezado y el de
  // cada fila de "Orden del servicio" abren esto.
  const [showServiceMenu,setShowServiceMenu] = useState(false)
  const [openToolMenuId,setOpenToolMenuId] = useState<string|null>(null)


  // punto 17: el selector de Lead solo lista a quienes están asignados a
  // ESTE servicio en una posición de la SECCIÓN Voces — "Voces" es una
  // sección dentro de un equipo (ej. "Alabanza"), no un equipo propio
  // (modelo de tres niveles: Equipo → Sección → Posición, migración 009).
  // Matchea por nombre de sección en cualquier equipo, no por nombre de
  // equipo. Si la organización no tiene ninguna sección así nombrada,
  // vozMemberIds queda vacío — es una red de seguridad, no el caso normal.
  const vozPosIds = new Set(
    equipoSections
      .flatMap(s => s.posiciones)
      .filter(p => p.seccionNombre && /voz|voces/i.test(p.seccionNombre))
      .map(p => p.id)
  )
  const vozMemberIds = new Set(
    bandaItems.filter(b => b.team_position_id && vozPosIds.has(b.team_position_id) && b.member_id).map(b => b.member_id as string)
  )

  const now = new Date(); now.setHours(0,0,0,0)
  const futureServices  = services.filter(s => {
    const endTime = (s as any).hora_fin ? s.fecha + 'T' + (s as any).hora_fin : s.fecha + 'T14:00:00'
    return new Date(endTime) > new Date()
  })
  const pastServices    = services.filter(s => {
    const endTime = (s as any).hora_fin ? s.fecha + 'T' + (s as any).hora_fin : s.fecha + 'T14:00:00'
    return new Date(endTime) <= new Date()
  })

  function fmt(fecha:string) {
    const d=new Date(fecha+'T12:00:00')
    const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const meses=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
  }
  // punto 16 — sufijo para distinguir ensayos/otros en el picker, ahora
  // que "Ensayo" ya no es un tab aparte y todo vive en esta misma lista.
  function kindSuffix(s: Service) {
    return s.kind==='rehearsal' ? ' · Ensayo' : s.kind==='other' ? ' · Otro' : ''
  }
  function fmtLong(fecha:string) {
    const d=new Date(fecha+'T12:00:00')
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${cap(meses[d.getMonth()])} ${d.getFullYear()}`
  }


  // Punto 52: una invitación por (servicio, persona, EQUIPO). El estado de una fila mira la invitación de ESE equipo, no la de otro.
  function getMemberInv(memberId:string|undefined, teamId:string) {
    return memberId ? invitations.find(i=>i.member_id===memberId && i.team_id===teamId) : undefined
  }
  // Punto 52: «Aceptó en {equipo}» — el equipo de la convocatoria que desplazó a esta (puede ser de otro servicio del mismo día).
  const nombreDeEquipo = (teamId?: string | null) => equipoSections.find(sec=>sec.teamId===teamId)?.nombre
  function aceptoEnTexto(inv?: Invitation) {
    const tid = inv?.superseded_by ? equipoDeInvitacion?.[inv.superseded_by] : null
    return textoAceptoEn(nombreDeEquipo(tid))
  }
  function getMemberInvStatus(memberId:string|undefined, teamId:string) {
    return getMemberInv(memberId, teamId)?.status||null
  }
  function getMemberNeedsReassign(memberId:string|undefined, teamId:string) {
    return !!getMemberInv(memberId, teamId)?.needs_reassignment_confirm
  }
  // Confirmado/rechazado/pendiente/por-invitar, contando solo a quienes
  // tienen una posición de ESTE equipo asignada — cada equipo manda sus
  // propias convocatorias desde su pestaña.
  function computeTeamStats(section: Props['equipoSections'][number]) {
    const teamMemberIds = new Set<string>()
    section.posiciones.forEach(pos=>{
      const n=getSlotsNeeded(pos.id)
      for(let slot=1; slot<=n; slot++){
        const id=getBanda(pos.id,slot)?.member_id
        if(id) teamMemberIds.add(id)
      }
    })
    const teamInvitations = invitations.filter(i=>i.team_id===section.teamId && teamMemberIds.has(i.member_id))
    const invitedIds = new Set(teamInvitations.filter(i=>i.sent_at).map(i=>i.member_id))
    return {
      assignedCount: teamMemberIds.size,
      confirmed: teamInvitations.filter(i=>i.status==='confirmado').length,
      declined: teamInvitations.filter(cuentaComoRechazo).length,      // «Aceptó en otro equipo» NO es un rechazo (punto 52)
      pending: teamInvitations.filter(i=>i.status==='pendiente').length,
      newToInvite: Array.from(teamMemberIds).filter(id=>!invitedIds.has(id)).length,
    }
  }
  function statusDotClass(status:string, needsReassign?:boolean) {
    if (needsReassign) return styles.slotStatusPending
    if (status==='confirmado') return styles.slotStatusOk
    if (status==='declinado') return styles.slotStatusNo
    return styles.slotStatusPending
  }
  // Punto 51: un bloqueo vale POR EQUIPO. El punto y el tachado de una fila miran el bloqueo del equipo
  // de ESA tarjeta; el que la persona hizo en otro equipo no se muestra ni se deduce.
  const blockedByTeam = new Map<string, Set<string>>()
  const blockedFor = (teamId:string) => {
    let s = blockedByTeam.get(teamId)
    if (!s) { s = blockedIdsForTeam(dateBlocks, teamId); blockedByTeam.set(teamId, s) }
    return s
  }
  function blockedDot(memberId:string|undefined, teamId:string) {
    if(!memberId||!blockedFor(teamId).has(memberId)) return null
    return <span title="Bloqueó esta fecha" style={{fontSize:10,lineHeight:1}}>🔴</span>
  }
  // El nombre tachado es para quien dijo «no» (o bloqueó la fecha); quien aceptó en otro equipo NO se tacha: lo dice su texto y su círculo (punto 52).
  function nameStrike(memberId:string|undefined, status:string|null|undefined, teamId:string): React.CSSProperties['textDecoration'] {
    return (status==='declinado'||(!!memberId&&blockedFor(teamId).has(memberId))) ? 'line-through' : 'none'
  }

  // Punto 32 — avisos del selector de asignar. dateBlocks ya llega por la
  // FECHA del servicio (app/admin/page.tsx), no por service_id. El equipo de
  // cada asignación sale del id de su posición; si no hay id (fila heredada) o la
  // posición está archivada no se afirma ningún equipo (ver lib/assignHints.ts).
  const { posTeam, posNames } = positionMaps(equipoSections)
  const teamNames = new Map(equipoSections.map(sec=>[sec.teamId, sec.nombre] as [string,string]))
  function pickerOptions(section: Props['equipoSections'][number], pos: Props['equipoSections'][number]['posiciones'][number], currentMemberId?: string) {
    const base = membersFor(pos.id)
    const cur = currentMemberId && !base.some(m=>m.id===currentMemberId) ? members.find(m=>m.id===currentMemberId) : undefined
    return buildAssignOptions({
      candidates: cur ? [...base, cur] : base,
      posId: pos.id, teamId: section.teamId, currentMemberId,
      banda: bandaItems, posTeam, posNames, teamNames, blockedIds: blockedFor(section.teamId),
    })
  }

  // Una tarjeta = un equipo, sus posiciones = filas de "slot" (una por
  // cupo). `wide`/`showInvite` quedaron de cuando existía la pestaña
  // "Resumen" (ahora eliminada) — hoy este es el único llamado, siempre
  // con los dos en true. `showInvite` agrega el pie con el botón de
  // notificar a los nuevos de este equipo.
  function renderColumn(section: Props['equipoSections'][number], wide?: boolean, showInvite?: boolean) {
    // Personas distintas del equipo, no cupos: quien tiene dos posiciones
    // en el mismo equipo (voz y guitarra) cuenta 1.
    const colPeople = new Set<string>()
    section.posiciones.forEach(pos=>{
      const n = getSlotsNeeded(pos.id)
      for (let slot=1; slot<=n; slot++) {
        const id=getBanda(pos.id,slot)?.member_id
        if(id) colPeople.add(id)
      }
    })
    const colAssigned = colPeople.size
    const colConfirmed = Array.from(colPeople).filter(id=>getMemberInvStatus(id, section.teamId)==='confirmado').length
    const teamStats = showInvite ? computeTeamStats(section) : null
    return (
      <aside key={section.teamId} className={styles.panel} style={wide?{width:'100%'}:{minWidth:220,flex:'0 0 220px'}}>
        <div className={`${styles.panelHead} ${isTeamColor(section.color) ? styles.panelHeadTeam : ''}`}
             {...(isTeamColor(section.color) ? { 'data-team': section.color } : {})}>
          <TeamMono name={section.nombre} color={section.color} />
          <h2>{section.nombre}</h2>
          <span className={styles.panelHeadCount}><b>{colConfirmed}</b>/{colAssigned} confirmados</span>
        </div>
        {section.posiciones.length===0 && (
          <p style={{fontSize:11,color:'var(--v3-ink-3)'}}>Sin posiciones.</p>
        )}
        {/* punto 24 — un grupo por posición (estilo Planning Center): la
            cabecera lleva el nombre completo UNA vez (antes se repetía el
            código en cada fila, "VX1, VX1, VX1"), y las vacantes se juntan
            en una sola fila con un número en vez de una fila vacía por cupo. */}
        {section.posiciones.map(pos=>{
          const n=getSlotsNeeded(pos.id)
          const slots=Array.from({length:n},(_,i)=>({slotIndex:i+1, asig:getBanda(pos.id,i+1)}))
          const asignados=slots.filter(s=>s.asig?.member_id)
          const vacantes=slots.filter(s=>!s.asig?.member_id)
          const primerVacanteSlot=vacantes[0]?.slotIndex
          return(
            <div key={pos.id} className={styles.posGroup}>
              <div className={styles.posGroupHead}>
                <span className={styles.posGroupName}>{pos.nombre}</span>
                <span className={styles.posGroupCount}>{asignados.length}/{n}</span>
                <span className={styles.panelHeadSpacer}/>
                <div className={styles.slotStepper}>
                  <button onClick={()=>updateSlotsNeeded(pos.id, n-1)} disabled={n<=Math.max(1,asignados.length)}>−</button>
                  <span>{n}</span>
                  <button onClick={()=>updateSlotsNeeded(pos.id, n+1)}>+</button>
                </div>
              </div>
              {asignados.map(({slotIndex,asig})=>{
                const status=getMemberInvStatus(asig?.member_id, section.teamId), needsReassign=getMemberNeedsReassign(asig?.member_id, section.teamId)
                const slotKey = `${pos.id}-${slotIndex}`
                const inv = getMemberInv(asig?.member_id, section.teamId)
                const otroEquipo = esDeOtroEquipo(inv)
                return (
                  <div key={slotIndex}>
                  <div className={styles.slot} data-anc-row style={{position:'relative'}}
                    aria-label={`${pos.nombre}: ${asig?.member?asig.member.nombre+' '+(asig.member.apellido||''):'sin asignar'}${otroEquipo?`, ${aceptoEnTexto(inv)}`:''}`}>
                    <span className={styles.slotAv}>{(asig?.member?.nombre?.[0]||'')}{(asig?.member?.apellido?.[0]||'')}</span>
                    <AssignPicker
                      options={pickerOptions(section,pos,asig?.member_id)} canClear
                      title={`Asignar a ${pos.nombre} · ${section.nombre}`}
                      triggerLabel={asig?.member?`${asig.member.nombre} ${asig.member.apellido||''}`.trim():(members.find(m=>m.id===asig?.member_id)?.nombre||`Sin asignar — ${pos.nombre}`)}
                      triggerClassName={styles.slotWho} triggerStyle={{textDecoration:nameStrike(asig?.member_id,otroEquipo?null:status,section.teamId)}}
                      ariaLabel={`Cambiar quién cubre ${pos.nombre}`}
                      onPick={id=>assignBanda(pos.id,id,slotIndex)} />
                    {showInvite && !otroEquipo && asig?.member_id && (() => {
                      // Punto 61: con éxito no se dibuja nada; solo un «!» si el correo falló, se omitió o la persona no tiene correo cargado.
                      const prob = problemaDeCorreo({ email: asig.member?.email ?? members.find(m=>m.id===asig.member_id)?.email, estadoGuardado: inv?.email_status, errorGuardado: inv?.email_error, ultimo: resultadoDe(resultadosCorreo, asig.member_id, section.teamId) })
                      return prob ? <ProblemaCorreo nombre={asig.member?.nombre||'la persona'} problema={prob} reintentando={reintentandoId===asig.member_id} onReintentar={()=>reintentarCorreo(asig.member_id!, section.teamId)} /> : null
                    })()}
                    <button type="button" className="anc-rowMore" aria-label="Más acciones de la persona"
                      onClick={e=>{e.stopPropagation(); setOpenSlotMenuId(cur=>cur===slotKey?null:slotKey)}}>
                      <MoreHorizontal size={14}/>
                    </button>
                    {openSlotMenuId===slotKey && (
                      <>
                        <div onClick={()=>setOpenSlotMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                        <div className="anc-rowMenu">
                          <button onClick={()=>{openPerson(asig!.member_id!);setOpenSlotMenuId(null)}}>
                            <User size={13}/> Ver persona
                          </button>
                        </div>
                      </>
                    )}
                    {blockedDot(asig?.member_id,section.teamId)}
                    {otroEquipo
                      ? <><span className={styles.slotElse}>{aceptoEnTexto(inv)}</span><span className={styles.slotStatusElse} aria-hidden="true"/></>
                      : status && <span className={`${styles.slotStatus} ${statusDotClass(status,needsReassign)}`} title={needsReassign?'Su rol cambió — necesita reconfirmar':undefined}/>}
                  </div>
                  </div>
                )
              })}
              {vacantes.length>0 && (
                <div className={styles.slot} data-anc-row style={{position:'relative'}}
                  aria-label={`${pos.nombre}: ${vacantes.length} sin asignar`}>
                  <span className={styles.vacantChip}>{vacantes.length}</span>
                  <AssignPicker
                    options={pickerOptions(section,pos)}
                    title={`Asignar a ${pos.nombre} · ${section.nombre}`}
                    triggerLabel="Sin asignar" triggerClassName={`${styles.slotWho} ${styles.slotWhoFree}`}
                    ariaLabel={`Asignar a ${pos.nombre}`}
                    onPick={id=>{ if(id) assignBanda(pos.id,id,primerVacanteSlot) }} />
                </div>
              )}
            </div>
          )
        })}
        {(() => {
          // Punto 52: quien «aceptó aquí en su lugar» dejó sus posiciones VACANTES y ya no sale en la nómina: el líder necesita saber quién se fue y adónde.
          const posDeEquipo = new Map(equipoSections.flatMap(sec=>sec.posiciones.map(p=>[p.id, sec.teamId] as [string,string])))
          const sigue = (memberId: string, teamId: string) => bandaItems.some(b=>b.member_id===memberId && !!b.team_position_id && posDeEquipo.get(b.team_position_id)===teamId)
          const idaEquipo = (id: string) => invitations.find(i=>i.id===id)?.team_id ?? equipoDeInvitacion?.[id]
          const quienesSeFueron = vacantesPorConflicto(invitations, sigue, idaEquipo, new Set([section.teamId]))
          if (!quienesSeFueron.length) return null
          return (
            <div className={styles.seFueron} role="note">
              <p className={styles.seFueronT}>Aceptaron en otro equipo</p>
              {quienesSeFueron.map(v=>{
                const m = members.find(x=>x.id===v.memberId)
                return <p key={v.invitacion} className={styles.seFueronF}><b>{m?`${m.nombre} ${m.apellido||''}`.trim():'Alguien'}</b> · {textoAceptoEn(nombreDeEquipo(v.aceptoEnTeamId))}: su lugar quedó vacante</p>
              })}
            </div>
          )
        })()}
        {showInvite && teamStats && teamStats.newToInvite > 0 && (
          <div className={styles.rosterFoot}>
            <button onClick={()=>sendInvites(section.teamId)} disabled={sending}
              className={`${styles.btn} ${styles.btnAccent}`}>
              {sending?'Enviando...':`Notificar a ${teamStats.newToInvite} nuevo${teamStats.newToInvite>1?'s':''}`}
            </button>
          </div>
        )}
        {/* Fuera del bloque de arriba: ese se desmonta cuando ya no queda nadie por notificar, y un error de la llamada no puede irse con él. */}
        {showInvite && <MensajeConvocatoria aviso={aviso} onCerrar={onCerrarAviso} />}
      </aside>
    )
  }

  const input:React.CSSProperties = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',outline:'none',background:'var(--card-bg)',color:C.txt}
  const btn:React.CSSProperties   = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:500,fontFamily:'inherit',cursor:'pointer',background:'var(--card-bg)',color:C.txt}
  const btnDark:React.CSSProperties = {...btn,background:ACCENT,color:'#F5F0E6',border:'none'}

  // Carga inicial (services/teams/etc, ver app/admin/page.tsx). Mientras
  // no se resuelva no hay forma de saber si "Sin equipos todavía" o "Sin
  // servicios futuros" son reales o solo faltan los datos — por eso este
  // componente entero espera antes de dibujar ninguna lista.
  if (dataError) {
    return (
      <div style={{maxWidth:420,margin:'64px auto',padding:28,textAlign:'center'}}>
        <p style={{fontSize:'.875rem',fontWeight:700,marginBottom:8}}>No se pudo cargar Servicios</p>
        <p className="anc-empty" style={{marginBottom:18}}>{dataError}</p>
        <button onClick={onRetryData} style={{background:'var(--anc-accent)',color:'var(--anc-on-accent)',border:'none',borderRadius:'var(--anc-r)',padding:'9px 18px',fontSize:'.8125rem',fontWeight:600,cursor:'pointer'}}>
          {TEXTOS.reintentar}
        </button>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="anc">
        <div style={{marginBottom:6}}>
          <div className="anc-skel" style={{height:30,width:220}}/>
        </div>
        <div style={{background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:12,padding:'20px 18px',marginBottom:14}}>
          <div className="anc-skel" style={{height:22,width:'55%',marginBottom:14}}/>
          <div className="anc-skel" style={{height:14,width:160}}/>
        </div>
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:'2 1 420px',display:'flex',flexDirection:'column',gap:8}}>
            {Array.from({length:5}).map((_,i)=>(
              <div key={i} className="anc-skel" style={{height:40}}/>
            ))}
          </div>
          <div style={{flex:'1 1 260px',display:'flex',flexDirection:'column',gap:8}}>
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} className="anc-skel" style={{height:52}}/>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Selector de servicio — botón compacto que despliega la lista,
          en vez del <select> nativo de siempre (regla v3: .picker). */}
      <div style={{position:'relative',marginBottom:6}}>
        <button className={styles.picker} onClick={()=>setShowPicker(v=>!v)}>
          {selectedService ? `${fmt(selectedService.fecha)} · ${selectedService.titulo}${kindSuffix(selectedService)}` : 'Elegir servicio'}
          <ChevronDown size={11}/>
        </button>
        {showPicker && (
          <>
            <div onClick={()=>setShowPicker(false)} style={{position:'fixed',inset:0,zIndex:29}}/>
            <div style={{position:'absolute',left:0,top:'100%',marginTop:4,background:'var(--panel-solid)',boxShadow:'0 10px 22px -14px rgba(10,14,18,.4), inset 0 0 0 1px var(--ring)',borderRadius:'var(--r)',padding:4,zIndex:30,minWidth:260,maxHeight:'60vh',overflowY:'auto'}}>
              {futureServices.length===0 && <p style={{fontSize:12,color:'var(--v3-ink-3)',padding:'8px 10px'}}>Sin servicios futuros.</p>}
              {futureServices.map(s=>(
                <button key={s.id} onClick={()=>{setSelectedService(s);setShowPicker(false)}}
                  style={{width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12.5,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink)',borderRadius:'var(--r-s)'}}>
                  {fmt(s.fecha)} — {s.titulo}{kindSuffix(s)}
                </button>
              ))}
              {pastServices.length>0 && (
                <>
                  <div style={{borderTop:'1px solid var(--rule)',margin:'4px 2px'}}/>
                  <button onClick={()=>setShowHistorial(v=>!v)}
                    style={{width:'100%',textAlign:'left',padding:'8px 10px',fontSize:11.5,fontWeight:600,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)'}}>
                    {showHistorial?'Ocultar historial':'Ver historial'}
                  </button>
                  {showHistorial && pastServices.map(s=>(
                    <button key={s.id} onClick={()=>{setSelectedService(s);setShowPicker(false)}}
                      style={{width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12.5,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-2)',borderRadius:'var(--r-s)'}}>
                      {fmt(s.fecha)} — {s.titulo}{kindSuffix(s)}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showNew&&(
        <div style={{background:'var(--card-bg)',border:`1px solid ${C.txt}`,borderRadius:12,padding:'8px 10px',marginBottom:12}}>
          {/* punto 22 — todo en una sola fila: Tipo · [Depende de] · Fecha ·
              Hora inicio · Hora fin · Crear · ✕. Las descripciones de cada
              tipo ya no se muestran en la tarjeta — pasan a title (tooltip).
              "Depende de" solo entra en la fila cuando el tipo es Ensayo, y
              baja de línea sola (flex-wrap) si no cabe. */}
          <div className="anc" style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={{fontSize:8,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Tipo</label>
              <div className="anc-seg" style={{height:30}}>
                <button type="button" aria-pressed={newKind==='service'} title="Domingo, con setlist y nómina completa" onClick={()=>setNewKind('service')}>Servicio</button>
                <button type="button" aria-pressed={newKind==='rehearsal'} title="Hereda canciones y nómina de un servicio" onClick={()=>setNewKind('rehearsal')}>Ensayo</button>
                <button type="button" aria-pressed={newKind==='other'} title="Reunión, montaje o evento especial" onClick={()=>setNewKind('other')}>Otro</button>
              </div>
            </div>
            {newKind==='rehearsal' && (
              <div style={{display:'flex',flexDirection:'column',gap:3}}>
                <label style={{fontSize:8,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Depende de</label>
                <select style={{...input,height:30,padding:'0 10px',minWidth:170}} value={newParentId} onChange={e=>setNewParentId(e.target.value)}>
                  <option value="">— Elegir servicio —</option>
                  {services.filter(s=>(s.kind||'service')==='service').map(s=>
                    <option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>
                  )}
                </select>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={{fontSize:8,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Fecha</label>
              <input type="date" style={{...input,height:30,padding:'0 10px'}} value={newFecha} onChange={e=>setNewFecha(e.target.value)}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={{fontSize:8,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Hora inicio</label>
              <input type="time" style={{...input,height:30,padding:'0 10px',width:84}} value={newHoraInicio} onChange={e=>setNewHoraInicio(e.target.value)}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              <label style={{fontSize:8,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1}}>Hora fin</label>
              <input type="time" style={{...input,height:30,padding:'0 10px',width:84}} value={newHoraFin} onChange={e=>setNewHoraFin(e.target.value)}/>
            </div>
            <span style={{flex:1}}/>
            <button style={{...btnDark,height:30,padding:'0 14px'}} disabled={!newFecha || (newKind==='rehearsal' && !newParentId)}
              onClick={()=>{
                if(!newFecha) return
                if(newKind==='rehearsal' && !newParentId) return
                createService(newFecha,newHoraInicio,newHoraFin,newKind,{
                  parentServiceId:newKind==='rehearsal'?newParentId:undefined,
                  lugar:newLugar||undefined, direccion:newDireccion||undefined, mapsLink:newMapsLink||undefined,
                })
                setNewFecha(''); setNewKind('service'); setNewParentId(''); setNewLugar(''); setNewDireccion(''); setNewMapsLink(''); setShowNew(false)
              }}>Crear</button>
            <button style={{...btn,height:30,width:30,padding:0}} onClick={()=>setShowNew(false)} aria-label="Cancelar">✕</button>
          </div>

          {newKind==='rehearsal' && (
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap',marginTop:10}}>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Lugar (opcional)</div>
                <input style={input} placeholder="Sala de ensayo" value={newLugar} onChange={e=>setNewLugar(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Dirección (opcional)</div>
                <input style={input} placeholder="Av. Siempre Viva 123" value={newDireccion} onChange={e=>setNewDireccion(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Google Maps (opcional)</div>
                <input style={input} placeholder="https://maps.google.com/..." value={newMapsLink} onChange={e=>setNewMapsLink(e.target.value)}/>
              </div>
            </div>
          )}
          {newKind==='rehearsal' && (
            <p style={{fontSize:11,color:C.muted,marginTop:10}}>El ensayo hereda las canciones y la nómina del servicio que elijas — no hace falta armar setlist ni nómina aparte.</p>
          )}
        </div>
      )}
      {showDup&&selectedService&&(
        <div style={{background:'var(--card-bg)',border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Duplicar a fecha</div>
            <input type="date" style={input} value={dupFecha} onChange={e=>setDupFecha(e.target.value)}/>
          </div>
          <button style={btnDark} onClick={()=>{if(dupFecha){duplicateService(selectedService.id,dupFecha);setDupFecha('');setShowDup(false)}}}>Duplicar</button>
          <button style={btn} onClick={()=>setShowDup(false)}>✕</button>
        </div>
      )}

      {selectedService&&(()=>{
        // Determinar el estado real del servicio usando hora_inicio y hora_fin
        const startTime = selectedService.fecha + 'T' + (selectedService.hora_inicio || '10:00')
        const endTime = selectedService.hora_fin
          ? selectedService.fecha + 'T' + selectedService.hora_fin
          : selectedService.fecha + 'T14:00:00'
        const nowD = new Date()
        const isPast = new Date(endTime) < nowD
        const isLive = !isPast && new Date(startTime) <= nowD
        const currentSection = equipoSections.find(s=>s.teamId===activeTeamTab)

        return(
        <div>
          <header className={styles.hero}>
            <h1>{fmtLong(selectedService.fecha)}</h1>
            <div className={styles.heroFacts}>
              <div className={styles.fact}>
                <span className={styles.factK}>Horario</span>
                <span className={styles.factV}>
                  <input type="time" defaultValue={(selectedService.hora_inicio||'10:00').slice(0,5)}
                    onBlur={async e=>{
                      await fetch('/api/update-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selectedService.id,hora_inicio:e.target.value})})
                      onBlocksChange()
                    }}
                    style={{border:'none',background:'transparent',font:'inherit',fontVariantNumeric:'tabular-nums',color:'inherit',outline:'none',width:92,minWidth:92,cursor:'pointer'}}/>
                  {' — '}
                  <input type="time" defaultValue={(selectedService.hora_fin||'14:00').slice(0,5)}
                    onBlur={async e=>{
                      await fetch('/api/update-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selectedService.id,hora_fin:e.target.value})})
                      onBlocksChange()
                    }}
                    style={{border:'none',background:'transparent',font:'inherit',fontVariantNumeric:'tabular-nums',color:'inherit',outline:'none',width:92,minWidth:92,cursor:'pointer'}}/>
                </span>
              </div>
            </div>
            <div className={styles.heroActs}>
              {isPast ? <span className={styles.state}>Archivado</span> : isLive ? <span className={styles.state}>En vivo</span> : null}
              {pastServices.length>0 && (
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={()=>setShowHistorial(v=>!v)}>
                  {showHistorial?'Ocultar historial':'Historial'}
                </button>
              )}
              {/* punto 16 — duplicar copia banda/setlist propios; un ensayo
                  no tiene ninguno de los dos (los hereda del padre), así
                  que duplicarlo no tendría sentido con el mecanismo actual. */}
              {selectedService.kind !== 'rehearsal' && (
                <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={()=>setShowDup(v=>!v)}>Duplicar</button>
              )}
              <button className={`${styles.btn} ${styles.btnAccent}`} onClick={()=>setShowNew(v=>!v)}>Nuevo servicio</button>
              <div style={{position:'relative'}}>
                <button className={styles.iconBtn} aria-label="Más acciones" onClick={()=>setShowServiceMenu(v=>!v)}>
                  <MoreHorizontal size={15}/>
                </button>
                {showServiceMenu&&(
                  <>
                    <div onClick={()=>setShowServiceMenu(false)} style={{position:'fixed',inset:0,zIndex:29}}/>
                    <div className={styles.rowMenu} style={{top:'100%',right:0}}>
                      <button className={styles.rowMenuDanger} onClick={()=>{deleteService(selectedService.id);setShowServiceMenu(false)}}>
                        <Trash2 size={13}/> Eliminar servicio
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* punto 16 — un ensayo no arma su propio setlist/nómina: hereda
              del servicio del que depende (parent_service_id). Todo lo de
              abajo (pestañas por equipo, roster, herramientas, setlist)
              es edición, y esa edición vive en el servicio padre, no acá. */}
          {selectedService.kind === 'rehearsal' ? (
            <EnsayoPanel ensayo={selectedService} members={members} darkMode={darkMode} C={C} />
          ) : (<>

          {/* Pestañas por equipo — "Resumen" se sacó (el Home ya muestra el
              estado del próximo servicio). Agregar herramientas vive acá,
              en el armado del servicio (no en Personas y Equipos). */}
          <div className={styles.tabs} role="tablist">
            {equipoSections.map(section=>(
              <button key={section.teamId} role="tab" className={styles.tab} aria-selected={activeTeamTab===section.teamId}
                onClick={()=>setActiveTeamTab(section.teamId)}>
                <TeamDot color={section.color} /> {section.nombre}
              </button>
            ))}
            <span className={styles.tabsSpacer}/>
            {currentSection && (
              <div style={{position:'relative'}}>
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnXs}`} onClick={()=>setShowAddToolMenu(v=>!v)}>
                  <Plus size={12} style={{marginRight:4,verticalAlign:-2}}/>Herramienta
                </button>
                {showAddToolMenu && (
                  <>
                    <div onClick={()=>setShowAddToolMenu(false)} style={{position:'fixed',inset:0,zIndex:19}}/>
                    <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'var(--panel-solid)',borderRadius:'var(--r)',boxShadow:'0 10px 22px -14px rgba(10,14,18,.4), inset 0 0 0 1px var(--ring)',zIndex:20,width:180,padding:4}}>
                      {ALL_TOOLS.map(t=>(
                        <button key={t.type} onClick={()=>{addTeamTool(currentSection.teamId, t.type); setShowAddToolMenu(false)}}
                          style={{width:'100%',textAlign:'left',padding:'8px 10px',fontSize:12.5,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink)',borderRadius:'var(--r-s)'}}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {(() => {
          // La gente del equipo va a la izquierda, angosta y fija — nunca
          // al medio ni abajo. Las herramientas ocupan el resto del ancho
          // a la derecha, centro de la pantalla.
          return (
          <div className={styles.cols}>

            {/* LEFT COL */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {currentSection ? renderColumn(currentSection, true, true) : (
                <p style={{fontSize:11,color:C.muted}}>Sin equipos todavía — créalos en Personas → Equipos.</p>
              )}
            </div>

            {/* Herramientas del equipo activo — cualquier combinación de
                Setlist/Checklist/Cronograma/Notas/Subir archivo, todas
                usables a la vez, incluso repetidas (cada una su propia
                instancia). El disparador de "+ Herramienta" vive arriba,
                en la fila de pestañas. */}
            {currentSection && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {currentSection.tools.length===0 && (
                <div className={styles.panel} style={{textAlign:'center'}}>
                  <p style={{fontSize:12,color:'var(--v3-ink-3)'}}>Este equipo no tiene ninguna herramienta todavía — agrega una arriba.</p>
                </div>
              )}

              {currentSection.tools.map(tool=>{
                const toolLabel = ALL_TOOLS.find(t=>t.type===tool.tool_type)?.label || 'la herramienta'
                const toolMenu = (
                  <div style={{position:'relative'}}>
                    <button onClick={()=>setOpenToolMenuId(cur=>cur===tool.id?null:tool.id)} aria-label={`Acciones de ${toolLabel}`} className="anc-rowMore" style={{opacity:1}}>
                      <MoreHorizontal size={14}/>
                    </button>
                    {openToolMenuId===tool.id && (
                      <>
                        <div onClick={()=>setOpenToolMenuId(null)} style={{position:'fixed',inset:0,zIndex:6}}/>
                        <div className="anc-rowMenu">
                          <button className="anc-rowMenuDanger" onClick={()=>{removeTeamTool(tool.id);setOpenToolMenuId(null)}}>
                            <Trash2 size={13}/> Quitar esta herramienta
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
                return (
                <div key={tool.id}>
                  {/* checklist/cronograma/notas/subir-archivo llevan el "⋯"
                      dentro de su propia franja de título (prop `menu`).
                      La "Orden del servicio" ya tiene el suyo en su cabecera
                      (ver más abajo), junto a "Añadir". */}
                  {tool.tool_type==='checklist' ? (
                    <ChecklistTool teamId={currentSection.teamId} teamToolId={tool.id} service={selectedService} darkMode={false}
                      onRemoveTool={()=>removeTeamTool(tool.id)}
                      canManageTemplates={!!canManageTemplates}
                      viewerMemberId={viewerMemberId}
                      assignedMembers={currentSection.posiciones.flatMap(pos=>{
                        const n=getSlotsNeeded(pos.id)
                        return Array.from({length:n}).map((_,i)=>getBanda(pos.id,i+1)?.member)
                      }).filter(Boolean) as Member[]} />
                  ) : tool.tool_type==='schedule' ? (
                    <ScheduleTool teamId={currentSection.teamId} teamToolId={tool.id} service={selectedService}
                      onRemoveTool={()=>removeTeamTool(tool.id)}
                      canManageTemplates={!!canManageTemplates}
                      viewerMemberId={viewerMemberId} />
                  ) : tool.tool_type==='notes' ? (
                    <FreeTextTool teamId={currentSection.teamId} teamToolId={tool.id} service={selectedService} menu={toolMenu} />
                  ) : tool.tool_type==='file_upload' ? (
                    <div className={styles.panel}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--ring)'}}>
                        <span style={{fontSize:'.875rem',fontWeight:700,color:'var(--v3-ink)'}}>Subir archivo</span>
                        {toolMenu}
                      </div>
                      <p style={{fontSize:12,color:'var(--v3-ink-3)',textAlign:'center',padding:'16px'}}>Todavía no está disponible.</p>
                    </div>
                  ) : (
            <OrdenDelServicio service={selectedService} blocks={blocks} setBlocks={setBlocks} songs={songs} members={members} vozMemberIds={vozMemberIds}
              onBlocksChange={onBlocksChange} canManageTemplates={canManageTemplates} viewerMemberId={viewerMemberId}
              menuAbierto={openToolMenuId===tool.id} onAlternarMenu={()=>setOpenToolMenuId(cur=>cur===tool.id?null:tool.id)} onCerrarMenu={()=>setOpenToolMenuId(null)}
              onQuitar={()=>removeTeamTool(tool.id)} alVaciar={()=>setShowServiceMenu(false)} />
            )}
                </div>
              )
              })}
            </div>
            )}
          </div>
          )
          })()}
        </>)}
        </div>
        )
      })()}

    </div>
  )
}
