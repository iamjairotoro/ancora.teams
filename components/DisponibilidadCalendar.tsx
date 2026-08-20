'use client'
import { useState, useEffect, useCallback } from 'react'
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

const LIGHT_BG='#F2F1EE', LIGHT_CARD='#FFFFFF', LIGHT_TXT='#1A1A1A', LIGHT_MUTED='#AAA', LIGHT_BORDER='rgba(0,0,0,0.16)'
const DARK_BG='#111118', DARK_CARD='rgba(255,255,255,0.06)', DARK_TXT='#F5F0E6', DARK_MUTED='rgba(255,255,255,0.35)', DARK_BORDER='rgba(255,255,255,0.08)'
const ACCENT='#1A1A1A'
const AMBER='#F0A93B'

export function disponibilidadTheme(darkMode:boolean){
  return {
    BG:darkMode?DARK_BG:LIGHT_BG, CARD:darkMode?DARK_CARD:LIGHT_CARD, TXT:darkMode?DARK_TXT:LIGHT_TXT,
    MUTED:darkMode?DARK_MUTED:LIGHT_MUTED, BORDER:darkMode?DARK_BORDER:LIGHT_BORDER,
    NAV_BG:darkMode?'#15151C':LIGHT_CARD,
  }
}

function toDateStr(d:Date){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function DisponibilidadCalendar({ token, darkMode }: { token:string, darkMode:boolean }){
  const isMemberPortal = token?.startsWith('member_')

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [allServices, setAllServices] = useState<any[]>([])
  const [dateBlocks, setDateBlocks] = useState<Record<string,any>>({})
  const [calMonth, setCalMonth] = useState(()=>{const d=new Date();return{year:d.getFullYear(),month:d.getMonth()}})
  const [selectedDay, setSelectedDay] = useState<string|null>(null)
  const [savingBlock, setSavingBlock] = useState(false)
  const [showRange, setShowRange] = useState(false)
  const [rangeForm, setRangeForm] = useState({reason:'',start:'',end:''})
  const [showReasonFor, setShowReasonFor] = useState<string|null>(null)
  const [reasonInput, setReasonInput] = useState('')
  const [confirmRemoveFor, setConfirmRemoveFor] = useState<string|null>(null)

  const {BG, CARD, TXT, MUTED, BORDER, NAV_BG} = disponibilidadTheme(darkMode)

  const loadData = useCallback(async()=>{
    const portalRes = isMemberPortal
      ? await fetch(`/api/portal-by-member?memberId=${token.replace('member_','')}`)
      : await fetch(`/api/member-portal?token=${token}`)
    const data = await portalRes.json()
    if(!portalRes.ok||data.error){ setLoading(false); return }
    setMember(data.member)

    const svcsRes = await fetch('/api/all-services')
    const svcsData = svcsRes.ok?await svcsRes.json():{services:[]}
    setAllServices(svcsData.services||[])

    const blocksRes = await fetch(`/api/date-blocks?memberId=${data.member.id}`)
    const blocksData = blocksRes.ok?await blocksRes.json():{blocks:[]}
    const blockMap:Record<string,any>={}
    ;(blocksData.blocks||[]).forEach((b:any)=>{
      const key = b.blocked_date || b.service?.fecha
      if(key) blockMap[key]={reason:b.reason||'',start:b.start_date,end:b.end_date}
    })
    setDateBlocks(blockMap)
    setLoading(false)
  },[token, isMemberPortal])

  useEffect(()=>{ if(token) loadData() },[token, loadData])

  async function blockDate(dateStr:string, reason:string){
    if(!member?.id) return
    setSavingBlock(true)
    await fetch('/api/date-blocks',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({memberId:member.id,date:dateStr,reason})})
    setDateBlocks(prev=>({...prev,[dateStr]:{reason,start:dateStr,end:dateStr}}))
    setSavingBlock(false)
    setShowReasonFor(null)
    setReasonInput('')
  }

  async function removeBlock(dateStr:string){
    if(!member?.id) return
    setSavingBlock(true)
    await fetch('/api/date-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId:member.id,date:dateStr})})
    setDateBlocks(prev=>{const n={...prev};delete n[dateStr];return n})
    setSavingBlock(false)
  }

  async function saveRange(){
    if(!member?.id||!rangeForm.start||!rangeForm.end||!rangeForm.reason.trim()) return
    const start=new Date(rangeForm.start+'T12:00:00')
    const end=new Date(rangeForm.end+'T12:00:00')
    const dates:string[]=[]
    for(const d=new Date(start); d<=end; d.setDate(d.getDate()+1)) dates.push(toDateStr(d))
    await Promise.all(dates.map(dateStr=>
      fetch('/api/date-blocks',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({memberId:member.id,date:dateStr,reason:rangeForm.reason,startDate:rangeForm.start,endDate:rangeForm.end})})
    ))
    const newBlocks={...dateBlocks}
    dates.forEach(dateStr=>{newBlocks[dateStr]={reason:rangeForm.reason,start:rangeForm.start,end:rangeForm.end}})
    setDateBlocks(newBlocks)
    setRangeForm({reason:'',start:'',end:''})
    setShowRange(false)
  }

  if(loading) return(
    <div style={{minHeight:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 0'}}>
      <div style={{width:28,height:28,border:`2px solid ${TXT}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  const {year,month}=calMonth
  const firstDay=new Date(year,month,1).getDay()
  const startOffset=firstDay===0?6:firstDay-1
  const daysInMonth=new Date(year,month+1,0).getDate()
  const todayD=new Date()
  const monthNames=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const svcByFecha:Record<string,any>={}
  allServices.forEach((s:any)=>{svcByFecha[s.fecha]=s})
  const blockedDates = Object.keys(dateBlocks).sort()

  const selectedSvc = selectedDay ? svcByFecha[selectedDay] : null
  const isSelectedBlocked = selectedDay ? !!dateBlocks[selectedDay] : false

  function fmtSelected(fecha:string){
    return new Date(fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'}).replace(/^\w/,c=>c.toUpperCase())
  }

  return (
    <div>
      <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:14,padding:14,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1);return{year:d.getFullYear(),month:d.getMonth()}})}
            style={{width:28,height:28,borderRadius:8,background:BG,border:`0.5px solid ${BORDER}`,cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronLeft size={15}/></button>
          <span style={{fontSize:13,fontWeight:500,color:TXT}}>{monthNames[month].charAt(0).toUpperCase()+monthNames[month].slice(1)} {year}</span>
          <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1);return{year:d.getFullYear(),month:d.getMonth()}})}
            style={{width:28,height:28,borderRadius:8,background:BG,border:`0.5px solid ${BORDER}`,cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',justifyContent:'center'}}><ChevronRight size={15}/></button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
          {['L','M','M','J','V','S','D'].map((d,i)=><div key={i} style={{textAlign:'center',fontSize:9,fontWeight:500,color:MUTED,padding:'2px 0'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:12}}>
          {Array.from({length:startOffset}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day=i+1
            const dateStr=toDateStr(new Date(year,month,day))
            const svc=svcByFecha[dateStr]
            const isBlocked=!!dateBlocks[dateStr]
            const isEnsayo=svc?.tipo==='ensayo'
            const isToday=day===todayD.getDate()&&month===todayD.getMonth()&&year===todayD.getFullYear()
            const isSelected=selectedDay===dateStr
            return(
              <div key={day} onClick={()=>setSelectedDay(dateStr)}
                style={{aspectRatio:'1',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  cursor:'pointer',position:'relative',fontSize:11,fontWeight:svc?500:400,
                  background:isSelected?ACCENT:isBlocked?(darkMode?'rgba(255,255,255,0.12)':'#EAEAEA'):svc?BG:isToday?(darkMode?'rgba(255,255,255,0.04)':'#EBEBEB'):'transparent',
                  color:isSelected?'#F5F0E6':svc?TXT:MUTED,
                  border:svc&&!isSelected?`0.5px solid ${BORDER}`:'none'}}>
                {day}
                {svc&&<div style={{width:3,height:3,borderRadius:'50%',background:isSelected?'#F5F0E6':isEnsayo?AMBER:TXT,position:'absolute',bottom:3}}/>}
              </div>
            )
          })}
        </div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:2,background:TXT}}/><span style={{fontSize:9,fontWeight:400,color:MUTED}}>Servicio</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:2,background:AMBER}}/><span style={{fontSize:9,fontWeight:400,color:MUTED}}>Ensayo</span></div>
          <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:7,height:7,borderRadius:2,background:darkMode?'rgba(255,255,255,0.12)':'#EAEAEA',border:`0.5px solid ${BORDER}`}}/><span style={{fontSize:9,fontWeight:400,color:MUTED}}>Bloqueado</span></div>
        </div>
        <p style={{fontSize:10,color:MUTED,marginTop:8,lineHeight:1.4}}>Toca cualquier día del mes para bloquearlo — no es necesario que tenga un servicio o ensayo creado.</p>
      </div>

      {selectedDay && (
        <div style={{marginBottom:16}}>
          <p style={{fontSize:13,fontWeight:500,color:TXT,marginBottom:8}}>{fmtSelected(selectedDay)}</p>

          {selectedSvc ? (
            <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:'12px 14px',marginBottom:10}}>
              <p style={{fontSize:10,fontWeight:600,color:MUTED,textTransform:'uppercase' as const,letterSpacing:0.5,margin:'0 0 3px'}}>
                {selectedSvc.tipo==='ensayo'?'Ensayo':'Servicio'}
              </p>
              <p style={{fontSize:14,fontWeight:500,color:TXT,margin:'0 0 2px'}}>{selectedSvc.titulo}</p>
              <p style={{fontSize:12,color:MUTED,margin:0,display:'flex',alignItems:'center',gap:4}}>
                {selectedSvc.hora_inicio?`${selectedSvc.hora_inicio.slice(0,5)} — ${(selectedSvc.hora_fin||'').slice(0,5)}`:''}
                {selectedSvc.lugar&&<><MapPin size={11}/> {selectedSvc.lugar}</>}
              </p>
            </div>
          ):(
            <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:'12px 14px',marginBottom:10}}>
              <p style={{fontSize:12,color:MUTED,margin:0}}>Sin servicio ni ensayo este día.</p>
            </div>
          )}

          {isSelectedBlocked ? (
            <button onClick={()=>setConfirmRemoveFor(selectedDay)} disabled={savingBlock}
              style={{width:'100%',background:'none',border:`1px solid ${BORDER}`,color:TXT,borderRadius:10,padding:11,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
              Quitar bloqueo
            </button>
          ):(
            <button onClick={()=>{setShowReasonFor(selectedDay);setReasonInput('')}} disabled={savingBlock}
              style={{width:'100%',background:'none',border:`1px solid ${BORDER}`,color:TXT,borderRadius:10,padding:11,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
              Bloquear esta fecha
            </button>
          )}
        </div>
      )}

      {blockedDates.length>0&&(
        <>
          <p style={{fontSize:9,fontWeight:500,color:MUTED,letterSpacing:'1px',textTransform:'uppercase' as const,marginBottom:7}}>Fechas bloqueadas</p>
          <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:11,overflow:'hidden',marginBottom:16}}>
            {blockedDates.map((dateStr,i)=>(
              <div key={dateStr} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',borderBottom:i<blockedDates.length-1?`0.5px solid ${BORDER}`:'none'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:400,color:TXT}}>{new Date(dateStr+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</div>
                  {dateBlocks[dateStr]?.reason&&<div style={{fontSize:10,fontWeight:400,color:MUTED,marginTop:1}}>{dateBlocks[dateStr].reason}</div>}
                </div>
                <button onClick={()=>setConfirmRemoveFor(dateStr)} style={{fontSize:11,color:MUTED,background:'none',border:'none',cursor:'pointer',padding:'2px 6px'}}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={()=>setShowRange(true)}
        style={{width:'100%',background:'none',border:`0.5px solid ${BORDER}`,color:MUTED,borderRadius:10,padding:10,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
        + Bloquear un rango de fechas (ej. vacaciones)
      </button>

      {showRange && (
        <div style={{minHeight:200,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:300,padding:20}}>
          <div style={{background:NAV_BG,borderRadius:16,padding:20,width:'100%',maxWidth:340}}>
            <p style={{fontSize:15,fontWeight:500,color:TXT,marginBottom:4}}>Bloquear un rango</p>
            <p style={{fontSize:11,fontWeight:400,color:MUTED,marginBottom:16}}>Indica las fechas en que no podrás servir.</p>
            <label style={{fontSize:10,fontWeight:500,color:MUTED,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>Razón (obligatoria)</label>
            <input placeholder="Ej: Viaje familiar..." value={rangeForm.reason} onChange={e=>setRangeForm({...rangeForm,reason:e.target.value})}
              style={{width:'100%',border:`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px 11px',fontSize:13,fontFamily:'inherit',outline:'none',color:TXT,background:BG,marginBottom:10}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              <div>
                <label style={{fontSize:10,fontWeight:500,color:MUTED,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>Comienza</label>
                <input type="date" value={rangeForm.start} onChange={e=>setRangeForm({...rangeForm,start:e.target.value})}
                  style={{width:'100%',border:`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px 8px',fontSize:12,fontFamily:'inherit',outline:'none',color:TXT,background:BG,colorScheme:darkMode?'dark':'light'}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:500,color:MUTED,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>Termina</label>
                <input type="date" value={rangeForm.end} onChange={e=>setRangeForm({...rangeForm,end:e.target.value})}
                  style={{width:'100%',border:`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px 8px',fontSize:12,fontFamily:'inherit',outline:'none',color:TXT,background:BG,colorScheme:darkMode?'dark':'light'}}/>
              </div>
            </div>
            <button onClick={saveRange} disabled={!rangeForm.start||!rangeForm.end||!rangeForm.reason.trim()}
              style={{width:'100%',background:rangeForm.start&&rangeForm.end&&rangeForm.reason.trim()?ACCENT:'#CCC',color:'#F5F0E6',border:'none',borderRadius:9,padding:11,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:rangeForm.start&&rangeForm.end&&rangeForm.reason.trim()?'pointer':'default',marginBottom:8}}>
              Guardar bloqueo
            </button>
            <button onClick={()=>setShowRange(false)}
              style={{width:'100%',background:'none',color:MUTED,border:'none',padding:6,fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
          </div>
        </div>
      )}

      {showReasonFor && (
        <div style={{minHeight:200,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:300,padding:20}}>
          <div style={{background:NAV_BG,borderRadius:16,padding:20,width:'100%',maxWidth:340}}>
            <p style={{fontSize:15,fontWeight:500,color:TXT,marginBottom:4}}>Bloquear {fmtSelected(showReasonFor)}</p>
            <p style={{fontSize:11,fontWeight:400,color:MUTED,marginBottom:14}}>Cuéntanos brevemente por qué no puedes ese día.</p>
            <label style={{fontSize:10,fontWeight:500,color:MUTED,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>Razón (obligatoria)</label>
            <input autoFocus placeholder="Ej: Viaje, examen, otro compromiso..." value={reasonInput} onChange={e=>setReasonInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&reasonInput.trim())blockDate(showReasonFor,reasonInput.trim())}}
              style={{width:'100%',border:`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px 11px',fontSize:13,fontFamily:'inherit',outline:'none',color:TXT,background:BG,marginBottom:16}}/>
            <button onClick={()=>blockDate(showReasonFor,reasonInput.trim())} disabled={!reasonInput.trim()||savingBlock}
              style={{width:'100%',background:reasonInput.trim()?ACCENT:'#CCC',color:'#F5F0E6',border:'none',borderRadius:9,padding:11,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:reasonInput.trim()?'pointer':'default',marginBottom:8}}>
              {savingBlock?'Guardando...':'Bloquear fecha'}
            </button>
            <button onClick={()=>{setShowReasonFor(null);setReasonInput('')}}
              style={{width:'100%',background:'none',color:MUTED,border:'none',padding:6,fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
          </div>
        </div>
      )}

      {confirmRemoveFor && (
        <div style={{minHeight:200,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:300,padding:20}}>
          <div style={{background:NAV_BG,borderRadius:16,padding:20,width:'100%',maxWidth:340}}>
            <p style={{fontSize:15,fontWeight:500,color:TXT,marginBottom:4}}>¿Quitar este bloqueo?</p>
            <p style={{fontSize:11,fontWeight:400,color:MUTED,marginBottom:16}}>{fmtSelected(confirmRemoveFor)} volverá a quedar disponible.</p>
            <button onClick={()=>{removeBlock(confirmRemoveFor);setConfirmRemoveFor(null)}} disabled={savingBlock}
              style={{width:'100%',background:'#B91C1C',color:'#F5F0E6',border:'none',borderRadius:9,padding:11,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer',marginBottom:8}}>
              Sí, quitar bloqueo
            </button>
            <button onClick={()=>setConfirmRemoveFor(null)}
              style={{width:'100%',background:'none',color:MUTED,border:'none',padding:6,fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
