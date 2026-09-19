'use client'
import { useState } from 'react'
import { ChevronDown, FileText, Headphones, MoreHorizontal, Plus, Trash2, User } from 'lucide-react'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock, ToolType, TeamTool } from '@/lib/types'
import ChecklistTool from './ChecklistTool'
import ScheduleTool from './ScheduleTool'
import FreeTextTool from './FreeTextTool'
import styles from './app.module.css'
import { usePersonDrawer } from './persona/PersonDrawer'

const ALL_TOOLS: { type: ToolType; label: string }[] = [
  { type: 'setlist', label: 'Setlist' },
  { type: 'checklist', label: 'Checklist' },
  { type: 'schedule', label: 'Cronograma' },
  { type: 'notes', label: 'Notas' },
  { type: 'file_upload', label: 'Subir archivo' },
]

const NOTAS = ['A','A#','Bb','B','C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab']
const BLOQUES_PRESET = [
  {titulo:'Preroll',duracion_min:180},
  {titulo:'MC / Bienvenida',duracion_min:300},
  {titulo:'Prédica',duracion_min:2700},
  {titulo:'Plan de salvación',duracion_min:300},
  {titulo:'Ofrenda',duracion_min:300},
  {titulo:'Anuncios',duracion_min:300},
  {titulo:'Closing / Cierre',duracion_min:300},
]

function toMMSS(secs: number): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60), s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}
function fromMMSS(val: string): number {
  if (!val) return 0
  if (val.includes(':')) { const [m,s]=val.split(':').map(Number); return (m||0)*60+(s||0) }
  return parseFloat(val)*60
}
function totalToDisplay(seconds: number): string {
  if (!seconds) return '0:00'
  const m = Math.floor(seconds/60), s = Math.round(seconds%60)
  return s > 0 ? `${m}:${s.toString().padStart(2,'0')}` : `${m} min`
}
// mes con mayúscula inicial, para dateHeadline/pickerLabel (regla v3)
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

const C = { crema:'var(--crema)', cremaDark:'var(--crema-dark)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)', bg:'var(--legacy-page-bg)' }
// Acento fijo para badges/botones sólidos (fondo oscuro + texto crema), igual en ambos modos
const ACCENT = '#1A1A1A'

interface Props {
  services: Service[]
  selectedService: Service|null
  setSelectedService: (s:Service)=>void
  createService: (fecha:string, horaInicio?:string, horaFin?:string)=>void
  deleteService: (id:string)=>void
  duplicateService: (id:string,fecha:string)=>void
  members: Member[]
  songs: Song[]
  blocks: ServiceBlock[]
  setBlocks: (updater: ServiceBlock[] | ((prev: ServiceBlock[]) => ServiceBlock[])) => void
  bandaItems: BandaAssignment[]
  invitations: Invitation[]
  membersFor: (posId:string)=>Member[]
  getBanda: (posId:string,slotIndex?:number)=>BandaAssignment|undefined
  assignBanda: (posId:string,memberId:string,slotIndex?:number)=>void
  getSlotsNeeded: (posId:string)=>number
  updateSlotsNeeded: (posId:string,newCount:number)=>void
  sendInvites: (teamId?: string)=>void
  sending: boolean
  msg: string
  reinvitar: (memberId:string)=>void
  onBlocksChange: ()=>void
  // Un equipo del módulo Equipos = una columna del tablero; sus posiciones
  // son las filas de esa columna. 100% dinámico, sin nombres ni cantidades
  // fijas — puede haber cualquier cantidad de equipos, cada uno con
  // cualquier cantidad de posiciones. Cada posición lleva su id (para
  // membersFor/getBanda/assignBanda) además del nombre a mostrar. Un
  // equipo puede tener varias herramientas activas a la vez, incluso
  // repetidas — cada una es una instancia independiente (su propio id).
  equipoSections: { teamId: string; nombre: string; tools: TeamTool[]; posiciones: {id:string; nombre:string; codigo:string}[] }[]
  addTeamTool: (teamId: string, toolType: ToolType) => void
  removeTeamTool: (teamToolId: string) => void
  dateBlocks: string[]
  darkMode?: boolean
}

// ── EDIT PANEL (móvil, slide-up) — sin cambios, fuera de alcance de v3 ──
interface EditPanelProps {
  block: ServiceBlock
  songs: Song[]
  members: Member[]
  songCounter: number
  onClose: ()=>void
  onUpdate: (id:string, updates:Partial<ServiceBlock>)=>void
  onDelete: (id:string)=>void
}

function EditPanel({ block, songs, members, songCounter, onClose, onUpdate, onDelete }: EditPanelProps) {
  const isSong = block.tipo === 'cancion'
  const song = block.song as any
  const [tono, setTono] = useState(block.tono || '')
  const [leadId, setLeadId] = useState(block.lead_id || '')
  const [songId, setSongId] = useState(block.song_id || '')
  const [titulo, setTitulo] = useState(block.titulo || '')
  const [obs, setObs] = useState((block as any).notas || '')
  const [durInput, setDurInput] = useState(block.duracion_min ? toMMSS(block.duracion_min) : '')
  const [saving, setSaving] = useState(false)

  const vocalistas = members.filter(m => m.instrumentos.includes('Voz'))

  async function save() {
    setSaving(true)
    if (isSong) {
      const selectedSong = songs.find(s => s.id === songId)
      await onUpdate(block.id, {
        song_id: songId || undefined,
        titulo: selectedSong?.nombre || titulo,
        tono: tono || undefined,
        lead_id: leadId || undefined,
        notas: obs,
      } as any)
    } else {
      await onUpdate(block.id, {
        titulo,
        duracion_min: fromMMSS(durInput) || 0,
        notas: obs,
      } as any)
    }
    setSaving(false)
    onClose()
  }

  const selectedSong = songs.find(s => s.id === songId)

  return (
    <>
      {/* Dimmer */}
      <div onClick={onClose} style={{
        position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,
        backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)'
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed',bottom:0,left:0,right:0,
        background:'var(--card-bg)',borderRadius:'16px 16px 0 0',
        border:'0.5px solid var(--crema-dark)',zIndex:201,
        maxHeight:'85vh',overflowY:'auto',
        paddingBottom:'env(safe-area-inset-bottom, 12px)',
        fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,background:'var(--crema-dark)',borderRadius:2,margin:'12px auto 0'}}/>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px 10px'}}>
          <div style={{fontSize:15,fontWeight:700,color:C.txt}}>
            {isSong ? `✏️ Canción ${songCounter}` : '✏️ Bloque'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>{ if(confirm('¿Eliminar este item?')) { onDelete(block.id); onClose() } }}
              style={{fontSize:11,fontWeight:600,color:'#E24B4A',background:'#FEE2E2',border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>
              Eliminar
            </button>
            <button onClick={onClose}
              style={{fontSize:20,color:'var(--ancora-muted)',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:0}}>
              ✕
            </button>
          </div>
        </div>

        <div style={{padding:'0 16px 16px'}}>
          {isSong ? (
            <>
              {/* Canción selector */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Canción</div>
                <select
                  value={songId}
                  onChange={e=>setSongId(e.target.value)}
                  style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none',appearance:'none',WebkitAppearance:'none' as any}}>
                  <option value="">— Seleccionar canción —</option>
                  {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              {/* Tono + Lead */}
              <div style={{display:'flex',gap:10,marginBottom:14}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Tono</div>
                  <select value={tono} onChange={e=>setTono(e.target.value)}
                    style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none',appearance:'none',WebkitAppearance:'none' as any}}>
                    <option value="">—</option>
                    {NOTAS.map(n=><option key={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Lead / Voz</div>
                  <select value={leadId} onChange={e=>setLeadId(e.target.value)}
                    style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none',appearance:'none',WebkitAppearance:'none' as any}}>
                    <option value="">— Lead —</option>
                    {vocalistas.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Links (solo lectura desde la canción) */}
              {selectedSong && (selectedSong as any).link_spotify || (selectedSong as any)?.link_letras || (selectedSong as any)?.link_recursos ? (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Links</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
                    {(selectedSong as any)?.link_spotify && (
                      <a href={(selectedSong as any).link_spotify} target="_blank"
                        style={{display:'flex',alignItems:'center',gap:6,background:'#D8F3DC',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,color:'#1B4332',textDecoration:'none'}}>
                        {/youtube\.com|youtu\.be/i.test((selectedSong as any).link_spotify)?'▶️ YouTube':/spotify\.com/i.test((selectedSong as any).link_spotify)?'🎧 Spotify':'🎧 Escuchar'}
                      </a>
                    )}
                    {(selectedSong as any)?.link_letras && (
                      <a href={(selectedSong as any).link_letras} target="_blank"
                        style={{display:'flex',alignItems:'center',gap:6,background:'#DBE4FF',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,color:'#1E3A8A',textDecoration:'none'}}>
                        📄 Letras
                      </a>
                    )}
                    {(selectedSong as any)?.link_recursos && (
                      <a href={(selectedSong as any).link_recursos} target="_blank"
                        style={{display:'flex',alignItems:'center',gap:6,background:'#FFF3CD',borderRadius:8,padding:'7px 12px',fontSize:12,fontWeight:600,color:'#92400E',textDecoration:'none'}}>
                        📁 Recursos
                      </a>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Título bloque */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Título</div>
                <input value={titulo} onChange={e=>setTitulo(e.target.value)}
                  style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none'}}/>
              </div>
              {/* Duración */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Duración (mm:ss)</div>
                <input value={durInput} onChange={e=>setDurInput(e.target.value)} placeholder="ej. 5:00"
                  style={{width:'100%',background:'var(--crema)',border:'0.5px solid var(--card-border)',borderRadius:8,padding:'10px 12px',fontSize:13,fontWeight:500,color:C.txt,fontFamily:'inherit',outline:'none'}}/>
              </div>
            </>
          )}

          {/* Observación */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase' as const,color:C.muted,marginBottom:6}}>Observación</div>
            <textarea value={obs} onChange={e=>setObs(e.target.value)}
              rows={2} placeholder="ej. puente y coro, repetir estrofa..."
              style={{width:'100%',background:'#FFFBEB',border:'0.5px solid #C9A14A',borderRadius:8,padding:'10px 12px',fontSize:13,color:C.txt,fontFamily:'inherit',outline:'none',resize:'none' as const}}/>
          </div>

          {/* Save */}
          <button onClick={save} disabled={saving}
            style={{width:'100%',background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:10,padding:'13px',fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:'pointer',opacity:saving?0.6:1}}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}


export default function AdminServiceView({
  services,selectedService,setSelectedService,createService,
  deleteService,duplicateService,
  members,songs,blocks,setBlocks,bandaItems,invitations,
  membersFor,getBanda,assignBanda,getSlotsNeeded,updateSlotsNeeded,
  sendInvites,sending,msg,onBlocksChange,reinvitar,
  equipoSections,
  addTeamTool,
  removeTeamTool,
  dateBlocks
}: Props) {
  const { open: openPerson } = usePersonDrawer()
  const [showNew,setShowNew]         = useState(false)
  const [newFecha,setNewFecha]       = useState('')
  const [newHoraInicio,setNewHoraInicio] = useState('10:00')
  const [newHoraFin,setNewHoraFin]   = useState('14:00')
  const [showDup,setShowDup]         = useState(false)
  const [dupFecha,setDupFecha]       = useState('')
  const [showPresets,setShowPresets] = useState(false)
  const [editingObs,setEditingObs]   = useState<string|null>(null)
  const [obsText,setObsText]         = useState<Record<string,string>>({})
  const [showHistorial,setShowHistorial] = useState(false)
  const [showPicker,setShowPicker]   = useState(false)
  // Pestaña activa dentro de Servicio: el id de un equipo, o 'resumen'
  // (siempre la última). Por defecto el primer equipo si hay alguno.
  const [activeTeamTab,setActiveTeamTab] = useState<string>(equipoSections[0]?.teamId || 'resumen')
  const [showAddToolMenu,setShowAddToolMenu] = useState(false)
  const [hoveredPosId,setHoveredPosId] = useState<string|null>(null)
  const [openSlotMenuId,setOpenSlotMenuId] = useState<string|null>(null)
  // Sin acciones destructivas sueltas — el "⋯" del encabezado y el de
  // cada fila de "Orden del servicio" abren esto.
  const [showServiceMenu,setShowServiceMenu] = useState(false)
  const [openRowMenuId,setOpenRowMenuId] = useState<string|null>(null)
  const [openToolMenuId,setOpenToolMenuId] = useState<string|null>(null)

  // Mobile edit panel state
  const [editingBlock, setEditingBlock] = useState<ServiceBlock|null>(null)
  const [editingBlockNum, setEditingBlockNum] = useState(0)

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
  function fmtLong(fecha:string) {
    const d=new Date(fecha+'T12:00:00')
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${cap(meses[d.getMonth()])} ${d.getFullYear()}`
  }

  async function addBlock(tipo:'cancion'|'bloque', preset?:{titulo:string,duracion_min:number}) {
    if(!selectedService) return
    const orden=(blocks.length||0)+1
    const payload={service_id:selectedService.id,orden,tipo,
      titulo:preset?.titulo||(tipo==='cancion'?'Nueva canción':'Nuevo bloque'),
      duracion_min:preset?.duracion_min||300}
    setShowPresets(false)
    const res = await fetch('/api/service-blocks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    const { block } = await res.json()
    if(block) setBlocks(prev=>[...prev, block])
  }
  async function updateBlock(id:string, updates:Partial<ServiceBlock>) {
    // Se ve al instante — no hace falta esperar ni recargar todo el servicio para un cambio puntual.
    setBlocks(prev=>prev.map(b=>b.id===id?{...b,...updates}:b))
    await fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...updates})})
  }
  async function deleteBlock(id:string) {
    setBlocks(prev=>prev.filter(b=>b.id!==id))
    await fetch('/api/service-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
  }
  function saveObs(blockId:string) {
    updateBlock(blockId,{notas:obsText[blockId]||''} as any)
    setEditingObs(null)
  }

  const totalSecs = blocks.reduce((s,b)=>{
    const dur = b.tipo==='cancion'&&(b.song as any)?.duracion_min?(b.song as any).duracion_min:(b.duracion_min||0)
    return s+dur
  },0)

  function getMemberInvStatus(memberId?:string) {
    if(!memberId) return null
    return invitations.find(i=>i.member_id===memberId)?.status||null
  }
  function getMemberNeedsReassign(memberId?:string) {
    if(!memberId) return false
    return !!invitations.find(i=>i.member_id===memberId)?.needs_reassignment_confirm
  }
  // Confirmado/rechazado/pendiente/por-invitar, contando solo a quienes
  // tienen una posición de ESTE equipo asignada — cada equipo manda sus
  // propias convocatorias desde acá, no un botón global en Resumen.
  function computeTeamStats(section: Props['equipoSections'][number]) {
    const teamMemberIds = new Set<string>()
    section.posiciones.forEach(pos=>{
      const n=getSlotsNeeded(pos.id)
      for(let slot=1; slot<=n; slot++){
        const id=getBanda(pos.id,slot)?.member_id
        if(id) teamMemberIds.add(id)
      }
    })
    const teamInvitations = invitations.filter(i=>teamMemberIds.has(i.member_id))
    const invitedIds = new Set(teamInvitations.filter(i=>i.sent_at).map(i=>i.member_id))
    return {
      assignedCount: teamMemberIds.size,
      confirmed: teamInvitations.filter(i=>i.status==='confirmado').length,
      declined: teamInvitations.filter(i=>i.status==='declinado').length,
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
  function blockedDot(memberId?:string) {
    if(!memberId||!dateBlocks.includes(memberId)) return null
    return <span title="Bloqueó esta fecha" style={{fontSize:10,lineHeight:1}}>🔴</span>
  }
  function nameStrike(memberId?:string, status?:string|null): React.CSSProperties['textDecoration'] {
    return (status==='declinado'||(!!memberId&&dateBlocks.includes(memberId))) ? 'line-through' : 'none'
  }

  // Una tarjeta = un equipo, sus posiciones = filas de "slot" (una por
  // cupo). `wide` la usa la pestaña de un equipo solo; sin `wide` es la
  // versión angosta que se apila junto a las demás en "Resumen".
  // `showInvite` agrega el pie con el botón de notificar (solo pestaña
  // activa — en Resumen las invitaciones se mandan por equipo, no acá).
  function renderColumn(section: Props['equipoSections'][number], wide?: boolean, showInvite?: boolean) {
    let colConfirmed=0, colAssigned=0
    section.posiciones.forEach(pos=>{
      const n = getSlotsNeeded(pos.id)
      for (let slot=1; slot<=n; slot++) {
        const asig=getBanda(pos.id,slot)
        if(!asig?.member_id) continue
        colAssigned++
        if(getMemberInvStatus(asig.member_id)==='confirmado') colConfirmed++
      }
    })
    const teamStats = showInvite ? computeTeamStats(section) : null
    return (
      <aside key={section.teamId} className={styles.panel} style={wide?{width:'100%'}:{minWidth:220,flex:'0 0 220px'}}>
        <div className={styles.panelHead}>
          <h2>{section.nombre}</h2>
          <span className={styles.panelHeadCount}><b>{colConfirmed}</b>/{colAssigned} confirmados</span>
        </div>
        {section.posiciones.length===0 && (
          <p style={{fontSize:11,color:'var(--v3-ink-3)'}}>Sin posiciones.</p>
        )}
        {section.posiciones.map(pos=>{
          const opts=membersFor(pos.id)
          const n=getSlotsNeeded(pos.id)
          const isHovered = hoveredPosId===pos.id
          return(
            <div key={pos.id} onMouseEnter={()=>setHoveredPosId(pos.id)} onMouseLeave={()=>setHoveredPosId(null)}>
              {Array.from({length:n}).map((_,i)=>{
                const slotIndex=i+1
                const asig=getBanda(pos.id,slotIndex), status=getMemberInvStatus(asig?.member_id), needsReassign=getMemberNeedsReassign(asig?.member_id)
                return (
                  <div key={slotIndex} className={styles.slot} style={{position:'relative'}}
                    aria-label={`${pos.nombre}: ${asig?.member?asig.member.nombre+' '+(asig.member.apellido||''):'sin asignar'}`}>
                    <span className={styles.slotCode}>{pos.codigo}</span>
                    <select className={`${styles.slotWho} ${!asig?.member_id?styles.slotWhoFree:''}`}
                      style={{textDecoration:nameStrike(asig?.member_id,status)}}
                      value={asig?.member_id||''} onChange={e=>assignBanda(pos.id,e.target.value,slotIndex)}>
                      <option value="">Sin asignar — {pos.nombre}</option>
                      {opts.map(m=><option key={m.id} value={m.id}>{dateBlocks.includes(m.id)?'🔴 ':''}{m.nombre} {m.apellido}</option>)}
                    </select>
                    {asig?.member_id && (() => {
                      const slotKey = `${pos.id}-${slotIndex}`
                      return (
                        <>
                          <button type="button" className={styles.rowMore} title="Más acciones" aria-label="Más acciones de la persona"
                            onClick={e=>{e.stopPropagation(); setOpenSlotMenuId(cur=>cur===slotKey?null:slotKey)}}>
                            <MoreHorizontal size={14}/>
                          </button>
                          {openSlotMenuId===slotKey && (
                            <>
                              <div onClick={()=>setOpenSlotMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                              <div className={styles.rowMenu}>
                                <button onClick={()=>{openPerson(asig.member_id!);setOpenSlotMenuId(null)}}>
                                  <User size={13}/> Ver persona
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      )
                    })()}
                    {!asig?.member_id && !isHovered && <span className={styles.slotNeeded}>1</span>}
                    {blockedDot(asig?.member_id)}
                    {status && <span className={`${styles.slotStatus} ${statusDotClass(status,needsReassign)}`} title={needsReassign?'Su rol cambió — necesita reconfirmar':undefined}/>}
                    {i===0 && isHovered && (
                      <div className={styles.slotStepper}>
                        <button onClick={()=>updateSlotsNeeded(pos.id, n-1)} disabled={n<=1}>−</button>
                        <span>{n}</span>
                        <button onClick={()=>updateSlotsNeeded(pos.id, n+1)}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
        {showInvite && teamStats && teamStats.newToInvite > 0 && (
          <div className={styles.rosterFoot}>
            <button onClick={()=>sendInvites(section.teamId)} disabled={sending}
              className={`${styles.btn} ${styles.btnAccent}`}>
              {sending?'Enviando...':`Notificar a ${teamStats.newToInvite} nuevo${teamStats.newToInvite>1?'s':''}`}
            </button>
            {msg && <p style={{fontSize:10,color:'var(--v3-ok)',marginTop:6,textAlign:'center'}}>{msg}</p>}
          </div>
        )}
      </aside>
    )
  }

  const input:React.CSSProperties = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',outline:'none',background:'var(--card-bg)',color:C.txt}
  const btn:React.CSSProperties   = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:500,fontFamily:'inherit',cursor:'pointer',background:'var(--card-bg)',color:C.txt}
  const btnDark:React.CSSProperties = {...btn,background:ACCENT,color:'#F5F0E6',border:'none'}

  // Song counter for numbering
  let songCounter = 0

  return (
    <div>
      {/* Selector de servicio — botón compacto que despliega la lista,
          en vez del <select> nativo de siempre (regla v3: .picker). */}
      <div style={{position:'relative',marginBottom:6}}>
        <button className={styles.picker} onClick={()=>setShowPicker(v=>!v)}>
          {selectedService ? `${fmt(selectedService.fecha)} · ${selectedService.titulo}` : 'Elegir servicio'}
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
                  {fmt(s.fecha)} — {s.titulo}
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
                      {fmt(s.fecha)} — {s.titulo}
                    </button>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {showNew&&(
        <div style={{background:'var(--card-bg)',border:`1px solid ${C.txt}`,borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Fecha</div>
            <input type="date" style={input} value={newFecha} onChange={e=>setNewFecha(e.target.value)}/>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Hora inicio</div>
            <input type="time" style={{...input,width:110}} value={newHoraInicio} onChange={e=>setNewHoraInicio(e.target.value)}/>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Hora fin</div>
            <input type="time" style={{...input,width:110}} value={newHoraFin} onChange={e=>setNewHoraFin(e.target.value)}/>
          </div>
          <button style={btnDark} onClick={()=>{if(newFecha){createService(newFecha,newHoraInicio,newHoraFin);setNewFecha('');setShowNew(false)}}}>Crear</button>
          <button style={btn} onClick={()=>setShowNew(false)}>✕</button>
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
        const visibleSections = activeTeamTab==='resumen' ? equipoSections : (currentSection?[currentSection]:[])

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
              <button className={`${styles.btn} ${styles.btnQuiet}`} onClick={()=>setShowDup(v=>!v)}>Duplicar</button>
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

          {/* Pestañas por equipo + Resumen al final. Agregar herramientas
              vive acá, en el armado del servicio (no en Personas y Equipos),
              y solo aplica al equipo activo — no se muestra en Resumen. */}
          <div className={styles.tabs} role="tablist">
            {equipoSections.map(section=>(
              <button key={section.teamId} role="tab" className={styles.tab} aria-selected={activeTeamTab===section.teamId}
                onClick={()=>setActiveTeamTab(section.teamId)}>
                {section.nombre}
              </button>
            ))}
            <button role="tab" className={styles.tab} aria-selected={activeTeamTab==='resumen'} onClick={()=>setActiveTeamTab('resumen')}>
              Resumen
            </button>
            <span className={styles.tabsSpacer}/>
            {activeTeamTab!=='resumen' && currentSection && (
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
          <div className={activeTeamTab==='resumen'?undefined:styles.cols} style={activeTeamTab==='resumen'?{display:'flex',flexDirection:'column',gap:12}:undefined}>

            {/* LEFT COL */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {activeTeamTab==='resumen' ? (
                /* Resumen: cada equipo es su propia tarjeta flotante, se
                   acomodan en fila y bajan de línea según el ancho — no una
                   tabla de columnas pegadas. Acá no se envían invitaciones —
                   eso se hace desde la pestaña de cada equipo. */
                <div style={{display:'flex',flexWrap:'wrap',gap:12,justifyContent:'center'}}>
                  {visibleSections.length===0 && (
                    <p style={{fontSize:11,color:C.muted}}>Sin equipos todavía — créalos en Personas → Equipos.</p>
                  )}
                  {visibleSections.map(section=>renderColumn(section, false))}
                </div>
              ) : currentSection && renderColumn(currentSection, true, true)}

              {/* Equipo del domingo — solo en Resumen */}
              {activeTeamTab==='resumen' && (()=>{
                const allPos=equipoSections.flatMap(s=>s.posiciones)
                const byMember:Record<string,{member:any,roles:string[],status:string|null}>= {}
                allPos.forEach(pos=>{
                  const n=getSlotsNeeded(pos.id)
                  for(let slot=1; slot<=n; slot++){
                    const asig=getBanda(pos.id,slot)
                    if(!asig?.member_id||!asig.member) continue
                    if(!byMember[asig.member_id]) byMember[asig.member_id]={member:asig.member,roles:[],status:getMemberInvStatus(asig.member_id)}
                    byMember[asig.member_id].roles.push(pos.nombre)
                  }
                })
                const entries=Object.values(byMember)
                if(!entries.length) return null
                return(
                  <div className={styles.panel}>
                    <div className={styles.panelHead}>
                      <h2>Equipo del domingo</h2>
                    </div>
                    {entries.map(({member,roles,status})=>(
                      <div key={member.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
                        <div style={{width:28,height:28,borderRadius:'var(--r)',background:'var(--sunk)',color:'var(--v3-ink-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,boxShadow:'inset 0 0 0 1px var(--ring)'}}>
                          {member.nombre?.[0]}{member.apellido?.[0]||''}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--v3-ink)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{member.nombre} {member.apellido}</div>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:2}}>
                            {roles.map(r=><span key={r} style={{fontSize:10,fontWeight:500,color:'var(--v3-ink-3)'}}>{r}</span>)}
                          </div>
                        </div>
                        {status && <span className={`${styles.slotStatus} ${statusDotClass(status)}`}/>}
                      </div>
                    ))}
                  </div>
                )
              })()}

            </div>

            {/* Herramientas del equipo activo — cualquier combinación de
                Setlist/Checklist/Cronograma/Notas/Subir archivo, todas
                usables a la vez, incluso repetidas (cada una su propia
                instancia). No se muestra en Resumen (ese es solo el
                tablero de asignación). El disparador de "+ Herramienta"
                vive arriba, en la fila de pestañas. */}
            {activeTeamTab!=='resumen' && currentSection && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {currentSection.tools.length===0 && (
                <div className={styles.panel} style={{textAlign:'center'}}>
                  <p style={{fontSize:12,color:'var(--v3-ink-3)'}}>Este equipo no tiene ninguna herramienta todavía — agregá una arriba.</p>
                </div>
              )}

              {currentSection.tools.map(tool=>{
                const isOrderPanel = !['checklist','schedule','notes','file_upload'].includes(tool.tool_type)
                const toolMenu = (
                  <div style={{position:'relative',alignSelf:'center'}}>
                    <button onClick={()=>setOpenToolMenuId(cur=>cur===tool.id?null:tool.id)} title="Más acciones" className={styles.iconBtn}>
                      <MoreHorizontal size={14}/>
                    </button>
                    {openToolMenuId===tool.id && (
                      <>
                        <div onClick={()=>setOpenToolMenuId(null)} style={{position:'fixed',inset:0,zIndex:6}}/>
                        <div className={styles.rowMenu} style={{position:'absolute',top:'100%',right:0,zIndex:7}}>
                          <button className={styles.rowMenuDanger} onClick={()=>{removeTeamTool(tool.id);setOpenToolMenuId(null)}}>
                            <Trash2 size={13}/> Quitar esta herramienta
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
                return (
                <div key={tool.id}>
                  {/* Para checklist/cronograma/notas/subir-archivo (sin
                      cabecera propia que lo reciba) el "⋯" va en su propia
                      franja arriba. La "Orden del servicio" sí tiene una
                      cabecera con flex: ahí el "⋯" entra en esa misma fila,
                      junto a "Añadir" (ver más abajo). */}
                  {!isOrderPanel && (
                    <div style={{display:'flex',justifyContent:'flex-end',marginBottom:4}}>
                      {toolMenu}
                    </div>
                  )}
                  {tool.tool_type==='checklist' ? (
                    <ChecklistTool teamId={currentSection.teamId} teamToolId={tool.id} service={selectedService} darkMode={false}
                      assignedMembers={currentSection.posiciones.flatMap(pos=>{
                        const n=getSlotsNeeded(pos.id)
                        return Array.from({length:n}).map((_,i)=>getBanda(pos.id,i+1)?.member)
                      }).filter(Boolean) as Member[]} />
                  ) : tool.tool_type==='schedule' ? (
                    <ScheduleTool teamId={currentSection.teamId} teamToolId={tool.id} service={selectedService} />
                  ) : tool.tool_type==='notes' ? (
                    <FreeTextTool teamId={currentSection.teamId} teamToolId={tool.id} service={selectedService} />
                  ) : tool.tool_type==='file_upload' ? (
                    <div className={styles.panel} style={{textAlign:'center'}}>
                      <p style={{fontSize:12,color:'var(--v3-ink-3)'}}>Subir archivo — todavía no está disponible.</p>
                    </div>
                  ) : (
            /* RIGHT — Order of service. Orden de columnas: Nº · Título ·
               Observaciones · Links · Tono · Lead · Min (regla v3). */
            <div className={styles.panel}>
              <div className={styles.panelHead} style={{alignItems:'center'}}>
                <h2>Orden del servicio</h2>
                <span className={styles.panelHeadN}>{blocks.length} items</span>
                <span className={styles.panelHeadSpacer}/>
                {/* "Añadir" y el "⋯" de la herramienta viven en la misma
                    fila, alineados a la derecha — el menú de opciones ya
                    no es una franja aparte que descuadra la tarjeta. */}
                <div style={{position:'relative',display:'flex',alignItems:'center',gap:4}}>
                  <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnXs}`} onClick={()=>setShowPresets(v=>!v)}>
                    <Plus size={12}/> Añadir
                  </button>
                  {showPresets&&(
                    <>
                      <div onClick={()=>setShowPresets(false)} style={{position:'fixed',inset:0,zIndex:19}}/>
                      <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'var(--panel-solid)',borderRadius:'var(--r)',boxShadow:'0 10px 22px -14px rgba(10,14,18,.4), inset 0 0 0 1px var(--ring)',zIndex:20,width:190,maxHeight:'60vh',overflowY:'auto',padding:4}}>
                        <button onClick={()=>{addBlock('cancion');setShowPresets(false)}}
                          style={{width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,fontWeight:600,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink)',borderRadius:'var(--r-s)'}}>
                          Canción
                        </button>
                        <div style={{borderTop:'1px solid var(--rule)',margin:'2px 0'}}/>
                        {BLOQUES_PRESET.map(b=>(
                          <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                            style={{width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink)',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'var(--r-s)'}}>
                            {b.titulo}<span style={{fontSize:10,color:'var(--v3-ink-3)'}}>{toMMSS(b.duracion_min)}</span>
                          </button>
                        ))}
                        <div style={{borderTop:'1px solid var(--rule)',margin:'2px 0'}}/>
                        <button onClick={()=>addBlock('bloque')}
                          style={{width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:'var(--v3-ink-3)',borderRadius:'var(--r-s)'}}>
                          Bloque personalizado
                        </button>
                      </div>
                    </>
                  )}
                  {toolMenu}
                </div>
              </div>

              <div className={styles.thead}>
                <span className={styles.colN}/>
                <span className={styles.colTitle}>Título</span>
                <span className={styles.colObs}>Observaciones</span>
                <span className={styles.colLinks}>Links</span>
                <span className={styles.colKey}>Tono</span>
                <span className={styles.colLead}>Lead</span>
                <span className={styles.colMin}>Min</span>
                <span className={styles.colAct}/>
              </div>

              {blocks.length===0&&(
                <div style={{padding:'48px',textAlign:'center',color:'var(--v3-ink-3)',fontSize:13,fontWeight:300}}>
                  Sin items. Agrega una canción o bloque.
                </div>
              )}

              {blocks.map(block=>{
                const isSong = block.tipo==='cancion'
                const songDur = (block.song as any)?.duracion_min
                if(isSong) songCounter++
                const currentNum = isSong ? songCounter : null
                const blockObs = (block as any).notas || ''
                const currentSongCounter = songCounter

                return(
                  <div key={block.id}
                    draggable
                    onDragStart={e=>{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('blockId', block.id) }}
                    onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='var(--hover)' }}
                    onDragLeave={e=>{ e.currentTarget.style.background='' }}
                    onDrop={e=>{
                      e.preventDefault(); e.currentTarget.style.background=''
                      const draggedId = e.dataTransfer.getData('blockId')
                      if(draggedId === block.id) return
                      const draggedIdx = blocks.findIndex(b=>b.id===draggedId)
                      const targetIdx  = blocks.findIndex(b=>b.id===block.id)
                      const newOrder = [...blocks]
                      const [moved] = newOrder.splice(draggedIdx,1)
                      newOrder.splice(targetIdx,0,moved)
                      const withOrden = newOrder.map((b,i)=>({...b, orden:i+1}))
                      // Se ve reordenado al instante — el guardado real corre atrás, sin bloquear la UI.
                      setBlocks(withOrden)
                      withOrden.forEach(b=>
                        fetch('/api/service-blocks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.id,orden:b.orden})})
                      )
                    }}
                  >
                    {/* ── DESKTOP ROW ── */}
                    <div className={`order-row-desktop ${styles.orow} ${!isSong?styles.orowBlock:''}`}>
                      <span className={`${styles.colN} ${styles.orowIdx}`}>{isSong ? currentNum : '—'}</span>

                      {/* TÍTULO — acotado, la observación de al lado es la que crece */}
                      <span className={styles.colTitle}>
                        {isSong ? (
                          <>
                            <select className={styles.songTitle}
                              value={block.song_id||''} onChange={e=>updateBlock(block.id,{song_id:e.target.value||undefined,titulo:songs.find(s=>s.id===e.target.value)?.nombre||''})}>
                              <option value="">— Seleccionar canción —</option>
                              {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            {(block.song as any)?.artista && <span className={styles.songArtist}>{(block.song as any).artista}</span>}
                          </>
                        ) : (
                          <input defaultValue={block.titulo||''} onBlur={e=>updateBlock(block.id,{titulo:e.target.value})}
                            className={styles.songTitle}/>
                        )}
                      </span>

                      {/* OBSERVACIONES — la columna elástica, invisible en reposo si está vacía */}
                      <span className={styles.colObs}>
                        {isSong && (
                          <textarea rows={1} placeholder="Agregar observación" value={editingObs===block.id?(obsText[block.id]??blockObs):blockObs}
                            className={`${styles.obs} ${!blockObs?styles.obsEmpty:''}`}
                            onFocus={()=>{setEditingObs(block.id);setObsText(prev=>prev[block.id]!==undefined?prev:{...prev,[block.id]:blockObs})}}
                            onChange={e=>setObsText(prev=>({...prev,[block.id]:e.target.value}))}
                            onBlur={()=>saveObs(block.id)}
                            onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();(e.target as HTMLTextAreaElement).blur()}if(e.key==='Escape')setEditingObs(null)}}/>
                        )}
                      </span>

                      {/* LINKS */}
                      <span className={`${styles.colLinks} ${styles.links}`}>
                        {isSong && block.song && (block.song as any).link_spotify && (
                          <a href={(block.song as any).link_spotify} target="_blank" aria-label="Audio"><Headphones size={14}/></a>
                        )}
                        {isSong && block.song && ((block.song as any).link_letras || (block.song as any).link_recursos) && (
                          <a href={(block.song as any).link_letras || (block.song as any).link_recursos} target="_blank" aria-label="Letra/partitura"><FileText size={14}/></a>
                        )}
                      </span>

                      {/* TONO */}
                      <span className={`${styles.colKey} ${styles.key}`}>
                        {isSong && (
                          <select style={{background:'transparent',border:'none',outline:'none',font:'inherit',color:'inherit',textAlign:'center',width:'100%'}}
                            value={block.tono||''} onChange={e=>updateBlock(block.id,{tono:e.target.value||undefined})}>
                            <option value="">—</option>
                            {NOTAS.map(n=><option key={n}>{n}</option>)}
                          </select>
                        )}
                      </span>

                      {/* LEAD */}
                      <span className={styles.colLead}>
                        {isSong && (
                          <span className={`${styles.lead} ${!block.lead_id?styles.leadUnassigned:''}`} style={{display:'flex',alignItems:'center',gap:2}}>
                            <select style={{background:'transparent',border:'none',outline:'none',font:'inherit',color:'inherit',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}}
                              value={block.lead_id||''} onChange={e=>updateBlock(block.id,{lead_id:e.target.value||undefined})}>
                              <option value="">Sin asignar</option>
                              {members.filter(m=>m.instrumentos.includes('Voz')).map(m=>(
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                              ))}
                            </select>
                            {block.lead_id && (
                              <button type="button" title="Ver persona" onClick={e=>{e.stopPropagation(); openPerson(block.lead_id!)}}
                                style={{flex:'none',width:14,height:14,display:'grid',placeItems:'center',border:0,background:'none',color:'var(--v3-ink-3)',cursor:'pointer',borderRadius:3}}>
                                <User size={10}/>
                              </button>
                            )}
                          </span>
                        )}
                      </span>

                      {/* MIN — duración, editable para los bloques */}
                      <span className={`${styles.colMin} ${styles.dur}`}>
                        {isSong && songDur ? toMMSS(songDur)
                          : isSong ? '—'
                          : (
                            <input type="text" placeholder="mm:ss" defaultValue={block.duracion_min?toMMSS(block.duracion_min):''}
                              onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}
                              style={{width:44,fontSize:11,padding:'2px 4px',border:0,boxShadow:'inset 0 0 0 1px var(--ring)',borderRadius:'var(--r-s)',fontFamily:'inherit',textAlign:'right',color:'inherit',background:'var(--panel-solid)'}}/>
                          )}
                      </span>

                      <span className={styles.colAct}>
                        <button className={styles.rowMore} aria-label={`Acciones para ${isSong?(block.song as any)?.nombre||block.titulo:block.titulo}`}
                          onClick={()=>setOpenRowMenuId(cur=>cur===block.id?null:block.id)}>
                          <MoreHorizontal size={13}/>
                        </button>
                        {openRowMenuId===block.id && (
                          <>
                            <div onClick={()=>setOpenRowMenuId(null)} style={{position:'fixed',inset:0,zIndex:29}}/>
                            <div className={styles.rowMenu}>
                              <button className={styles.rowMenuDanger} onClick={()=>{deleteBlock(block.id);setOpenRowMenuId(null)}}>
                                <Trash2 size={13}/> Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </span>
                    </div>

                    {/* ── MOBILE ROW — tap to edit (sin cambios, fuera de alcance de v3) ── */}
                    <div className="order-row-mobile"
                      onClick={()=>{ setEditingBlock(block); setEditingBlockNum(currentSongCounter) }}
                      style={{
                        display:'none',
                        alignItems:'center',gap:10,padding:'11px 14px',
                        borderBottom:`0.5px solid #E8E0D0`,
                        cursor:'pointer',
                        background: isSong ? 'var(--card-bg)' : C.bg,
                        WebkitTapHighlightColor:'transparent',
                      }}>
                      {/* Left: duration or num */}
                      {isSong ? (
                        <div style={{width:20,height:20,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>
                          {currentNum}
                        </div>
                      ) : (
                        <span style={{fontSize:10,fontWeight:600,background:C.cremaDark,color:C.muted,padding:'2px 6px',borderRadius:3,flexShrink:0}}>bloque</span>
                      )}

                      {/* Center: title + sub */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:isSong?600:400,color:isSong?C.txt:C.muted,fontStyle:isSong?'normal':'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {isSong ? ((block.song as any)?.nombre || block.titulo || '— canción —') : (block.titulo || 'Sin título')}
                        </div>
                        {isSong && (
                          <div style={{fontSize:11,color:C.muted,marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {block.lead_id ? members.find(m=>m.id===block.lead_id)?.nombre || '' : ''}
                            {blockObs ? (block.lead_id ? ' · ' : '') + '📝 ' + blockObs : ''}
                          </div>
                        )}
                        {!isSong && block.duracion_min ? (
                          <div style={{fontSize:11,color:C.muted,marginTop:1}}>{toMMSS(block.duracion_min)}</div>
                        ) : null}
                      </div>

                      {/* Right: tono + chevron */}
                      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                        {isSong && block.tono && (
                          <span style={{fontSize:11,fontWeight:600,background:'rgba(0,0,0,0.06)',color:C.txt,padding:'2px 7px',borderRadius:4}}>
                            {block.tono}
                          </span>
                        )}
                        <span style={{fontSize:16,color:'#CCC',lineHeight:1}}>›</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {blocks.length>0&&(
                <div className={styles.total}>
                  <span className={styles.totalK}>Total</span>
                  <span className={styles.totalV}>{totalToDisplay(totalSecs)}</span>
                </div>
              )}
            </div>
            )}
                </div>
              )
              })}
            </div>
            )}
          </div>
          )
          })()}
        </div>
        )
      })()}

      {/* ── MOBILE EDIT PANEL ── */}
      {editingBlock && (
        <EditPanel
          block={editingBlock}
          songs={songs}
          members={members}
          songCounter={editingBlockNum}
          onClose={()=>setEditingBlock(null)}
          onUpdate={async (id, updates)=>{ await updateBlock(id, updates) }}
          onDelete={async (id)=>{ await deleteBlock(id) }}
        />
      )}
    </div>
  )
}
