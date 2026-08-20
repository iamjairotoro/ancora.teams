'use client'
import { useState } from 'react'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'
import TexBg from './TexBg'

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

const C = { crema:'var(--crema)', cremaDark:'var(--crema-dark)', txt:'var(--ancora-txt)', muted:'var(--ancora-muted)', bg:'var(--page-bg)' }
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
  membersFor: (pos:string)=>Member[]
  getBanda: (pos:string)=>BandaAssignment|undefined
  assignBanda: (pos:string,memberId:string)=>void
  sendInvites: ()=>void
  sending: boolean
  msg: string
  reinvitar: (memberId:string)=>void
  onBlocksChange: ()=>void
  POSICIONES_BANDA: readonly string[]
  POSICIONES_VX: readonly string[]
  POSICIONES_TECNICA: readonly string[]
  LABEL_TECNICA: Record<string,string>
  dateBlocks: string[]
  darkMode?: boolean
}

const sel: React.CSSProperties = {
  width:'100%', background:'transparent', border:'none',
  fontSize:13, fontWeight:500, color:C.txt, outline:'none', cursor:'pointer',
  fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',
}

// ── EDIT PANEL (móvil, slide-up) ──
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
  membersFor,getBanda,assignBanda,
  sendInvites,sending,msg,onBlocksChange,reinvitar,
  POSICIONES_BANDA,POSICIONES_VX,POSICIONES_TECNICA,LABEL_TECNICA,
  dateBlocks
}: Props) {
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
  const visibleServices = showHistorial ? services : futureServices

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
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
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
  const confirmed = invitations.filter(i=>i.status==='confirmado').length
  const declined  = invitations.filter(i=>i.status==='declinado').length
  const pending   = invitations.filter(i=>i.status==='pendiente').length
  const invitedMemberIds = new Set(invitations.map(i=>i.member_id))
  const assignedMemberIds = new Set(bandaItems.filter(b=>b.member_id).map(b=>b.member_id as string))
  const newToInvite = Array.from(assignedMemberIds).filter(id=>!invitedMemberIds.has(id)).length

  function getMemberInvStatus(memberId?:string) {
    if(!memberId) return null
    return invitations.find(i=>i.member_id===memberId)?.status||null
  }
  function getMemberNeedsReassign(memberId?:string) {
    if(!memberId) return false
    return !!invitations.find(i=>i.member_id===memberId)?.needs_reassignment_confirm
  }
  function statusDot(status:string, needsReassign?:boolean) {
    const color = needsReassign?'#F0A93B':status==='confirmado'?'#52B788':status==='declinado'?'#E24B4A':'#F4A261'
    return <span title={needsReassign?'Su rol cambió — necesita reconfirmar':undefined}
      style={{width:7,height:7,borderRadius:'50%',background:color,display:'inline-block',flexShrink:0}}/>
  }
  function blockedDot(memberId?:string) {
    if(!memberId||!dateBlocks.includes(memberId)) return null
    return <span title="Bloqueó esta fecha" style={{fontSize:10,lineHeight:1}}>🔴</span>
  }
  function nameStrike(memberId?:string, status?:string|null): React.CSSProperties['textDecoration'] {
    return (status==='declinado'||(!!memberId&&dateBlocks.includes(memberId))) ? 'line-through' : 'none'
  }

  const input:React.CSSProperties = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 11px',fontSize:13,fontFamily:'inherit',outline:'none',background:'var(--card-bg)',color:C.txt}
  const btn:React.CSSProperties   = {border:`1px solid var(--card-border)`,borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:500,fontFamily:'inherit',cursor:'pointer',background:'var(--card-bg)',color:C.txt}
  const btnDark:React.CSSProperties = {...btn,background:ACCENT,color:'#F5F0E6',border:'none'}

  // Song counter for numbering
  let songCounter = 0

  return (
    <div>
      {/* Service selector */}
      <div style={{background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:12,padding:'10px 14px',marginBottom:12,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
        <select style={{...input,flex:1,minWidth:200,fontWeight:500}}
          value={selectedService?.id||''}
          onChange={e=>{const s=visibleServices.find(sv=>sv.id===e.target.value);if(s)setSelectedService(s)}}>
          {futureServices.length===0&&!showHistorial&&<option value="">Sin servicios futuros</option>}
          {showHistorial&&pastServices.length>0&&(
            <optgroup label="── Historial ──">
              {pastServices.map(s=><option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>)}
            </optgroup>
          )}
          {futureServices.map(s=><option key={s.id} value={s.id}>{fmt(s.fecha)} — {s.titulo}</option>)}
        </select>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {pastServices.length>0&&(
            <button style={{...btn,fontSize:11,color:showHistorial?C.txt:C.muted,background:showHistorial?C.crema:'var(--card-bg)'}}
              onClick={()=>setShowHistorial(v=>!v)}
              title="Ver historial de servicios pasados">
              🕓 {showHistorial?'Ocultar historial':'Historial'}
            </button>
          )}
          <button style={btnDark} onClick={()=>setShowNew(v=>!v)}>+ Nuevo</button>
          {selectedService&&<>
            <button style={btn} onClick={()=>setShowDup(v=>!v)}>⧉ Duplicar</button>
            <button style={{...btn,color:'#E24B4A'}} onClick={()=>deleteService(selectedService.id)}>🗑</button>
          </>}
        </div>
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
        const now = new Date()
        const isPast = new Date(endTime) < now
        const isLive = !isPast && new Date(startTime) <= now

        return(
        <div>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
            <div>
              <h2 style={{fontSize:22,fontWeight:700,color:C.txt,letterSpacing:'-0.3px'}}>{fmtLong(selectedService.fecha)}</h2>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4,flexWrap:'wrap'}}>
                <p style={{fontSize:12,fontWeight:300,color:C.muted}}>{selectedService.titulo}</p>
                {/* Horas editables inline */}
                <div style={{display:'flex',alignItems:'center',gap:5,background:C.crema,padding:'3px 10px',borderRadius:6}}>
                  <span style={{fontSize:11,color:C.muted}}>🕐</span>
                  <input
                    type="time"
                    defaultValue={(selectedService.hora_inicio||'10:00').slice(0,5)}
                    onBlur={async e=>{
                      await fetch('/api/update-service',{method:'POST',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({id:selectedService.id,hora_inicio:e.target.value})})
                      onBlocksChange()
                    }}
                    style={{border:'none',background:'transparent',fontSize:12,fontWeight:600,color:C.txt,outline:'none',fontFamily:'inherit',width:70,cursor:'pointer'}}
                  />
                  <span style={{fontSize:11,color:C.muted}}>–</span>
                  <input
                    type="time"
                    defaultValue={(selectedService.hora_fin||'14:00').slice(0,5)}
                    onBlur={async e=>{
                      await fetch('/api/update-service',{method:'POST',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({id:selectedService.id,hora_fin:e.target.value})})
                      onBlocksChange()
                    }}
                    style={{border:'none',background:'transparent',fontSize:12,fontWeight:600,color:C.txt,outline:'none',fontFamily:'inherit',width:70,cursor:'pointer'}}
                  />
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5,
              background:isPast?C.crema:isLive?'#D8F3DC':'#DBE4FF',
              padding:'3px 10px',borderRadius:20}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:isPast?C.muted:isLive?'#52B788':'#4A6FE0',display:'inline-block'}}/>
              <span style={{fontSize:10,fontWeight:600,color:isPast?C.muted:isLive?'#1B4332':'#1E3A8A'}}>
                {isPast?'Archivado':isLive?'En vivo':'Próximamente'}
              </span>
            </div>
          </div>

          <div className="admin-layout-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,260px) 1fr',gap:12}}>

            {/* LEFT COL */}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {/* Banda */}
              <div style={{background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'8px 14px',background:C.crema,borderBottom:`1px solid var(--card-border)`}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Banda</span>
                </div>
                {POSICIONES_BANDA.map(pos=>{
                  const asig=getBanda(pos), opts=membersFor(pos), status=getMemberInvStatus(asig?.member_id), needsReassign=getMemberNeedsReassign(asig?.member_id)
                  return(
                    <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.muted,width:48,flexShrink:0}}>{pos}</span>
                      <select style={{...sel,textDecoration:nameStrike(asig?.member_id,status)}} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                        <option value=""></option>
                        {opts.map(m=><option key={m.id} value={m.id}>{dateBlocks.includes(m.id)?'🔴 ':''}{m.nombre} {m.apellido}</option>)}
                      </select>
                      {blockedDot(asig?.member_id)}{status&&statusDot(status,needsReassign)}
                    </div>
                  )
                })}
                <div style={{padding:'8px 14px',background:C.crema,borderTop:`1px solid var(--card-border)`,borderBottom:`1px solid var(--card-border)`}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Voces</span>
                </div>
                {POSICIONES_VX.map(pos=>{
                  const asig=getBanda(pos), opts=membersFor(pos), status=getMemberInvStatus(asig?.member_id), needsReassign=getMemberNeedsReassign(asig?.member_id)
                  return(
                    <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.muted,width:48,flexShrink:0}}>{pos}</span>
                      <select style={{...sel,textDecoration:nameStrike(asig?.member_id,status)}} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                        <option value=""></option>
                        {opts.map(m=><option key={m.id} value={m.id}>{dateBlocks.includes(m.id)?'🔴 ':''}{m.nombre} {m.apellido}</option>)}
                      </select>
                      {blockedDot(asig?.member_id)}{status&&statusDot(status,needsReassign)}
                    </div>
                  )
                })}
                {/* TÉCNICA */}
                <div style={{padding:'8px 14px',background:C.crema,borderTop:`1px solid var(--card-border)`,borderBottom:`1px solid var(--card-border)`}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Técnica</span>
                </div>
                {POSICIONES_TECNICA.map(pos=>{
                  const asig=getBanda(pos), status=getMemberInvStatus(asig?.member_id), needsReassign=getMemberNeedsReassign(asig?.member_id)
                  const opts=membersFor(pos)
                  return(
                    <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.muted,width:80,flexShrink:0}}>{LABEL_TECNICA[pos]}</span>
                      <select style={{...sel,textDecoration:nameStrike(asig?.member_id,status)}} value={asig?.member_id||''} onChange={e=>assignBanda(pos,e.target.value)}>
                        <option value=""></option>
                        {opts.map(m=><option key={m.id} value={m.id}>{dateBlocks.includes(m.id)?'🔴 ':''}{m.nombre} {m.apellido}</option>)}
                      </select>
                      {blockedDot(asig?.member_id)}{status&&statusDot(status,needsReassign)}
                    </div>
                  )
                })}
                <div style={{padding:'12px 14px',borderTop:`1px solid var(--card-border)`}}>
                  <div style={{display:'flex',gap:5,marginBottom:10}}>
                    <span style={{fontSize:9,fontWeight:700,background:'rgba(82,183,136,0.2)',color:'#1B4332',padding:'2px 7px',borderRadius:10}}>✓ {confirmed}</span>
                    <span style={{fontSize:9,fontWeight:700,background:'rgba(226,75,74,0.2)',color:'#991B1B',padding:'2px 7px',borderRadius:10}}>✗ {declined}</span>
                    <span style={{fontSize:9,fontWeight:700,background:'rgba(244,162,97,0.2)',color:'#664D03',padding:'2px 7px',borderRadius:10}}>⏳ {pending}</span>
                  </div>
                  <button onClick={sendInvites} disabled={sending||(invitations.length>0&&newToInvite===0)}
                    style={{width:'100%',background:'#C9A14A',color:'var(--card-bg)',border:'none',borderRadius:8,padding:'10px',fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer',opacity:(sending||(invitations.length>0&&newToInvite===0))?0.6:1}}>
                    {sending?'Enviando...': invitations.length===0
                      ? 'Enviar invitaciones'
                      : newToInvite>0
                        ? `Enviar a ${newToInvite} nuevo${newToInvite>1?'s':''}`
                        : 'Todos ya fueron invitados'}
                  </button>
                  {msg&&<p style={{fontSize:10,color:'#2D6A4F',marginTop:6,textAlign:'center'}}>{msg}</p>}
                </div>
              </div>

              {/* Equipo del domingo */}
              {(()=>{
                const allPos=[...POSICIONES_BANDA,...POSICIONES_VX,...POSICIONES_TECNICA]
                const byMember:Record<string,{member:any,roles:string[],status:string|null}>= {}
                allPos.forEach(pos=>{
                  const asig=getBanda(pos)
                  if(!asig?.member_id||!asig.member) return
                  if(!byMember[asig.member_id]) byMember[asig.member_id]={member:asig.member,roles:[],status:getMemberInvStatus(asig.member_id)}
                  byMember[asig.member_id].roles.push(pos)
                })
                const entries=Object.values(byMember)
                if(!entries.length) return null
                return(
                  <div style={{background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:12,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',background:C.crema,borderBottom:`1px solid var(--card-border)`}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Equipo del domingo</span>
                    </div>
                    <div style={{padding:'8px'}}>
                      {entries.map(({member,roles,status})=>(
                        <div key={member.id} style={{display:'flex',alignItems:'center',gap:8,background:C.bg,borderRadius:8,padding:'6px 10px',marginBottom:4}}>
                          <div style={{width:30,height:30,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                            {member.nombre?.[0]}{member.apellido?.[0]||''}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:C.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{member.nombre} {member.apellido}</div>
                            <div style={{display:'flex',gap:2,flexWrap:'wrap',marginTop:2}}>
                              {roles.map(r=><span key={r} style={{fontSize:8,fontWeight:700,background:'rgba(0,0,0,0.07)',color:C.txt,padding:'1px 4px',borderRadius:3}}>{r}</span>)}
                            </div>
                          </div>
                          {status==='confirmado'&&<span style={{fontSize:9,background:'#D8F3DC',color:'#1B4332',padding:'1px 6px',borderRadius:10,fontWeight:700}}>✓</span>}
                          {status==='declinado' &&<span style={{fontSize:9,background:'#FEE2E2',color:'#991B1B',padding:'1px 6px',borderRadius:10,fontWeight:700}}>✗</span>}
                          {status==='pendiente' &&<span style={{fontSize:9,background:'#FFF3CD',color:'#664D03',padding:'1px 6px',borderRadius:10,fontWeight:700}}>⏳</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Respuestas */}
              {invitations.length>0&&(
                <div style={{background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:12,overflow:'hidden'}}>
                  <div style={{padding:'8px 14px',background:C.crema,borderBottom:`1px solid var(--card-border)`}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:C.muted}}>Respuestas</span>
                  </div>
                  <div style={{padding:'4px 0'}}>
                    {invitations.map(inv=>(
                      <div key={inv.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 14px',borderBottom:`0.5px solid #E8E0D0`}}>
                        {statusDot(inv.status)}
                        <span style={{fontSize:12,fontWeight:500,color:C.txt,flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inv.member?.nombre} {inv.member?.apellido}</span>
                        {inv.comentario&&<span style={{fontSize:10,fontWeight:300,color:C.muted,fontStyle:'italic',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>"{inv.comentario}"</span>}
                        {inv.needs_reassignment_confirm&&(
                          <button onClick={()=>reinvitar(inv.member_id)} title="Su instrumento cambió desde que confirmó — mándale una reinvitación"
                            style={{fontSize:10,fontWeight:700,background:'#FFF3CD',color:'#664D03',border:'0.5px solid #F0A93B',borderRadius:20,padding:'3px 9px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',flexShrink:0}}>
                            ⚠️ Reinvitar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Order of service (desktop: grid, mobile: clean rows) */}
            <div style={{background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:12,overflow:'hidden'}}>
              <div className="oos-header-desktop" style={{padding:'10px 16px',borderBottom:`1px solid var(--card-border)`,display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.txt}}>Orden del servicio</span>
                  <span style={{fontSize:11,fontWeight:300,color:C.muted,marginLeft:8}}>{blocks.length} items · {totalToDisplay(totalSecs)}</span>
                </div>
                <div style={{display:'flex',gap:6,position:'relative'}}>
                  <div style={{position:'relative'}}>
                    <button style={btn} onClick={()=>setShowPresets(v=>!v)}>+ Bloque ▾</button>
                    {showPresets&&(
                      <div style={{position:'absolute',right:0,top:'calc(100% + 4px)',background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:20,width:190,maxHeight:'60vh',overflowY:'auto',padding:'4px 0'}}>
                        {BLOQUES_PRESET.map(b=>(
                          <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                            onMouseEnter={e=>(e.currentTarget.style.background='var(--crema)')}
                            onMouseLeave={e=>(e.currentTarget.style.background='none')}
                            style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.txt,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background 0.15s'}}>
                            {b.titulo}<span style={{fontSize:10,color:C.muted}}>{toMMSS(b.duracion_min)}</span>
                          </button>
                        ))}
                        <div style={{borderTop:`1px solid var(--card-border)`,margin:'2px 0'}}/>
                        <button onClick={()=>addBlock('bloque')}
                          onMouseEnter={e=>(e.currentTarget.style.background='var(--crema)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='none')}
                          style={{width:'100%',textAlign:'left',padding:'8px 16px',fontSize:12,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.muted,transition:'background 0.15s'}}>
                          + Personalizado
                        </button>
                      </div>
                    )}
                  </div>
                  <button style={btnDark} onClick={()=>addBlock('cancion')}>🎵 + Canción</button>
                </div>
              </div>

              {/* Header móvil — centrado, compacto */}
              <div className="oos-header-mobile" style={{display:'none',flexDirection:'column',gap:8,padding:'10px 12px',borderBottom:`1px solid var(--card-border)`}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:13,fontWeight:700,letterSpacing:0.5,textTransform:'uppercase' as const,color:C.txt}}>Orden del servicio</div>
                  <div style={{fontSize:10,fontWeight:300,color:C.muted,marginTop:1}}>{blocks.length} items · {totalToDisplay(totalSecs)}</div>
                </div>
                <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                  <div style={{position:'relative'}}>
                    <button style={{...btn,fontSize:11,padding:'5px 10px'}} onClick={()=>setShowPresets(v=>!v)}>+ Bloque ▾</button>
                    {showPresets&&(
                      <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',top:'calc(100% + 4px)',background:'var(--card-bg)',border:`1px solid var(--card-border)`,borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:20,width:'min(200px,85vw)',maxHeight:'60vh',overflowY:'auto',padding:'4px 0'}}>
                        {BLOQUES_PRESET.map(b=>(
                          <button key={b.titulo} onClick={()=>addBlock('bloque',b)}
                            onMouseEnter={e=>(e.currentTarget.style.background='var(--crema)')}
                            onMouseLeave={e=>(e.currentTarget.style.background='none')}
                            style={{width:'100%',textAlign:'left',padding:'8px 14px',fontSize:11,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.txt,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'background 0.15s'}}>
                            {b.titulo}<span style={{fontSize:9,color:C.muted}}>{toMMSS(b.duracion_min)}</span>
                          </button>
                        ))}
                        <div style={{borderTop:`1px solid var(--card-border)`,margin:'2px 0'}}/>
                        <button onClick={()=>addBlock('bloque')}
                          onMouseEnter={e=>(e.currentTarget.style.background='var(--crema)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='none')}
                          style={{width:'100%',textAlign:'left',padding:'8px 14px',fontSize:11,fontFamily:'inherit',background:'none',border:'none',cursor:'pointer',color:C.muted,transition:'background 0.15s'}}>
                          + Personalizado
                        </button>
                      </div>
                    )}
                  </div>
                  <button style={{...btnDark,fontSize:11,padding:'5px 10px'}} onClick={()=>addBlock('cancion')}>🎵 + Canción</button>
                </div>
              </div>

              {/* ── DESKTOP column headers ── */}
              <div className="desktop-cols-header" style={{display:'grid',gridTemplateColumns:'28px 60px 1fr 80px 160px 90px 130px 36px',padding:'6px 16px 6px 10px',background:C.crema,borderBottom:`1px solid var(--card-border)`}}>
                {['','MIN','TÍTULO','LINKS','OBSERVACIONES','TONO','LEAD',''].map((h,i)=>(
                  <span key={i} style={{fontSize:10,fontWeight:700,letterSpacing:1,color:C.muted}}>{h}</span>
                ))}
              </div>

              {/* ── MOBILE column header ── */}
              <div className="mobile-cols-header" style={{padding:'5px 14px',background:C.crema,borderBottom:`1px solid var(--card-border)`,alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:C.muted}}>Canciones</span>
                <span style={{fontSize:10,fontWeight:300,color:C.muted}}>toca para editar</span>
              </div>

              {blocks.length===0&&(
                <div style={{padding:'48px',textAlign:'center',color:C.muted,fontSize:13,fontWeight:300}}>
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
                    onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='#EEE8DC' }}
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
                    {/* ── DESKTOP ROW ──
                        Cols: drag(20) | min(52) | título+links+obs(1fr) | tono(70) | lead(110) | del(32)
                    */}
                    <div className="order-row-desktop" style={{
                      display:'grid',
                      gridTemplateColumns:'28px 60px 1fr 80px 160px 90px 130px 36px',
                      padding:'9px 16px 9px 10px',
                      borderBottom:`0.5px solid #E8E0D0`,
                      alignItems:'center',
                      background:isSong?'var(--card-bg)':C.bg,
                      minHeight:52,
                    }}>

                      {/* Drag handle */}
                      <div style={{cursor:'grab',display:'flex',flexDirection:'column',gap:3,alignItems:'center',opacity:0.25,userSelect:'none' as const}}
                        onMouseEnter={e=>(e.currentTarget.style.opacity='0.6')}
                        onMouseLeave={e=>(e.currentTarget.style.opacity='0.25')}>
                        {[0,1,2].map(i=>(
                          <div key={i} style={{display:'flex',gap:3}}>
                            <div style={{width:3,height:3,borderRadius:'50%',background:C.txt}}/>
                            <div style={{width:3,height:3,borderRadius:'50%',background:C.txt}}/>
                          </div>
                        ))}
                      </div>

                      {/* MIN */}
                      <div>
                        {isSong && songDur ? (
                          <span style={{fontSize:12,fontWeight:500,background:'rgba(0,0,0,0.06)',color:C.txt,padding:'3px 7px',borderRadius:6,fontVariantNumeric:'tabular-nums'}}>{toMMSS(songDur)}</span>
                        ) : isSong ? (
                          <span style={{fontSize:12,color:'#CCC'}}>—</span>
                        ) : (
                          <span style={{fontSize:12,fontWeight:400,color:C.muted,fontVariantNumeric:'tabular-nums'}}>{block.duracion_min?toMMSS(block.duracion_min):'—'}</span>
                        )}
                      </div>

                      {/* TÍTULO — solo el nombre */}
                      <div style={{minWidth:0,display:'flex',alignItems:'center',gap:8}}>
                        {isSong ? (
                          <>
                            {currentNum&&(
                              <span style={{width:24,height:24,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                                {currentNum}
                              </span>
                            )}
                            <select style={{...sel,fontSize:14,fontWeight:700,flex:1,minWidth:0}} value={block.song_id||''} onChange={e=>updateBlock(block.id,{song_id:e.target.value||undefined,titulo:songs.find(s=>s.id===e.target.value)?.nombre||''})}>
                              <option value="">— Seleccionar canción —</option>
                              {songs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                          </>
                        ) : (
                          <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                            <span style={{fontSize:11,color:C.muted,flexShrink:0,letterSpacing:0.5,textTransform:'uppercase' as const,fontWeight:600}}>—</span>
                            <input defaultValue={block.titulo||''} onBlur={e=>updateBlock(block.id,{titulo:e.target.value})}
                              style={{flex:1,fontSize:14,fontWeight:500,color:'#555',fontStyle:'normal',border:'none',outline:'none',background:'transparent',fontFamily:'inherit',minWidth:0}}/>
                          </div>
                        )}
                      </div>

                      {/* LINKS — columna fija 80px */}
                      <div style={{display:'flex',gap:4,alignItems:'center'}}>
                        {isSong && block.song ? (
                          <>
                            {(block.song as any).link_spotify&&(
                              <a href={(block.song as any).link_spotify} target="_blank"
                                style={{width:24,height:24,background:'#D8F3DC',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',flexShrink:0}}>
                                🎧
                              </a>
                            )}
                            {(block.song as any).link_letras&&(
                              <a href={(block.song as any).link_letras} target="_blank"
                                style={{width:24,height:24,background:'#DBE4FF',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',flexShrink:0}}>
                                📄
                              </a>
                            )}
                            {(block.song as any).link_recursos&&(
                              <a href={(block.song as any).link_recursos} target="_blank"
                                style={{width:24,height:24,background:'#FFF3CD',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,textDecoration:'none',flexShrink:0}}>
                                📁
                              </a>
                            )}
                          </>
                        ) : !isSong && block.duracion_min ? (
                          <input type="text" placeholder="mm:ss" defaultValue={block.duracion_min?toMMSS(block.duracion_min):''}
                            onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}
                            style={{width:52,fontSize:11,padding:'3px 6px',border:`0.5px solid var(--card-border)`,borderRadius:5,fontFamily:'inherit',textAlign:'center',color:C.muted,background:'var(--card-bg)'}}/>
                        ) : !isSong ? (
                          <input type="text" placeholder="mm:ss" defaultValue=""
                            onBlur={e=>updateBlock(block.id,{duracion_min:fromMMSS(e.target.value)||0})}
                            style={{width:52,fontSize:11,padding:'3px 6px',border:`0.5px solid var(--card-border)`,borderRadius:5,fontFamily:'inherit',textAlign:'center',color:C.muted,background:'var(--card-bg)'}}/>
                        ) : null}                      </div>

                      {/* OBSERVACIONES — columna propia */}
                      <div style={{minWidth:0,paddingLeft:4}}>
                        {isSong&&(
                          editingObs===block.id ? (
                            <input autoFocus placeholder="Observación..."
                              value={obsText[block.id]||''}
                              onChange={e=>setObsText(prev=>({...prev,[block.id]:e.target.value}))}
                              onKeyDown={e=>{if(e.key==='Enter')saveObs(block.id);if(e.key==='Escape')setEditingObs(null)}}
                              style={{width:'100%',fontSize:12,padding:'4px 8px',border:`0.5px solid #C9A14A`,borderRadius:6,fontFamily:'inherit',outline:'none',color:C.txt,background:'#FFFBEB'}}/>
                          ) : blockObs ? (
                            <span
                              onClick={()=>{setEditingObs(block.id);setObsText(prev=>({...prev,[block.id]:blockObs}))}}
                              style={{fontSize:12,color:'#C0392B',fontStyle:'italic',cursor:'pointer',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                              "{blockObs}"
                            </span>
                          ) : (
                            <button
                              onClick={()=>{setEditingObs(block.id);setObsText(prev=>({...prev,[block.id]:''}))} }
                              style={{fontSize:12,color:'#CCC',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                              + obs
                            </button>
                          )
                        )}
                      </div>

                      {/* TONO */}
                      <div style={{display:'flex',flexDirection:'column',gap:1}}>
                        {isSong&&(
                          <>
                            <span style={{fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase' as const,color:'#BBB'}}>Tono</span>
                            <select style={{...sel,fontSize:13,fontWeight:700,color:C.txt}} value={block.tono||''} onChange={e=>updateBlock(block.id,{tono:e.target.value||undefined})}>
                              <option value="">—</option>
                              {NOTAS.map(n=><option key={n}>{n}</option>)}
                            </select>
                          </>
                        )}
                      </div>

                      {/* LEAD */}
                      <div style={{display:'flex',flexDirection:'column',gap:1}}>
                        {isSong&&(
                          <>
                            <span style={{fontSize:9,fontWeight:700,letterSpacing:0.8,textTransform:'uppercase' as const,color:'#BBB'}}>Lead</span>
                            <select style={{...sel,fontSize:13}} value={block.lead_id||''} onChange={e=>updateBlock(block.id,{lead_id:e.target.value||undefined})}>
                              <option value="">—</option>
                              {members.filter(m=>m.instrumentos.includes('Voz')).map(m=>(
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>

                      {/* DELETE */}
                      <div style={{display:'flex',justifyContent:'center'}}>
                        <button onClick={()=>deleteBlock(block.id)}
                          style={{width:26,height:26,borderRadius:6,border:'none',background:'#FEE2E2',color:'#B91C1C',fontSize:15,cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>
                          ×
                        </button>
                      </div>
                    </div>

                    {/* ── MOBILE ROW — tap to edit ── */}
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
                <div style={{padding:'7px 16px',background:C.crema,borderTop:`1px solid var(--card-border)`,display:'flex',justifyContent:'flex-end',alignItems:'baseline',gap:8}}>
                  <span style={{fontSize:11,fontWeight:300,color:C.muted,letterSpacing:0.5,textTransform:'uppercase'}}>Total</span>
                  <span style={{fontSize:15,fontWeight:700,color:C.txt}}>{totalToDisplay(totalSecs)}</span>
                </div>
              )}
            </div>
          </div>
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
