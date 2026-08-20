'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, Member } from '@/lib/types'

interface Props { services: Service[]; darkMode?: boolean }

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A' // fijo — badges/botones sólidos, mismo color en ambos modos

export default function AvailabilityPanel({ services, darkMode }: Props) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [calMonth, setCalMonth] = useState(() => { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth()} })
  const [selectedDate, setSelectedDate] = useState<string|null>(null)
  const [blockedMembers, setBlockedMembers] = useState<Member[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)

  const now = new Date()
  const futureServices = services.filter(s => {
    const endTime = (s as any).hora_fin ? s.fecha+'T'+(s as any).hora_fin : s.fecha+'T14:00:00'
    return new Date(endTime) > now
  })

  const { year, month } = calMonth
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const firstDay = new Date(year,month,1).getDay()
  const startOffset = firstDay===0?6:firstDay-1
  const daysInMonth = new Date(year,month+1,0).getDate()
  const today = new Date()

  const serviceByDay: Record<number,Service> = {}
  futureServices.forEach(s => {
    const d = new Date(s.fecha+'T12:00:00')
    if (d.getFullYear()===year && d.getMonth()===month) {
      serviceByDay[d.getDate()] = s
    }
  })

  function fechaISO(day:number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  async function loadBlockedMembers(fecha: string) {
    setSelectedDate(fecha)
    setLoadingBlocked(true)
    const { data } = await supabase
      .from('date_blocks')
      .select('member:members(id,nombre,apellido,instrumentos)')
      .eq('blocked_date', fecha)
    setBlockedMembers((data||[]).map((d:any)=>d.member).filter(Boolean))
    setLoadingBlocked(false)
  }

  function fmtFecha(fecha:string) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div style={{maxWidth:900,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div className="admin-layout-grid" style={{display:'grid',gridTemplateColumns:'minmax(0,360px) 1fr',gap:16,alignItems:'flex-start'}}>

        {/* Calendario */}
        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:14}}>
          {/* Nav mes */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1);return{year:d.getFullYear(),month:d.getMonth()}})}
              style={{width:26,height:26,borderRadius:7,background:C.crema,border:`0.5px solid ${C.cremaDark}`,cursor:'pointer',fontSize:13,color:C.muted}}>‹</button>
            <span style={{fontSize:13,fontWeight:500,color:C.txt}}>
              {monthNames[month].charAt(0).toUpperCase()+monthNames[month].slice(1)} {year}
            </span>
            <button onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1);return{year:d.getFullYear(),month:d.getMonth()}})}
              style={{width:26,height:26,borderRadius:7,background:C.crema,border:`0.5px solid ${C.cremaDark}`,cursor:'pointer',fontSize:13,color:C.muted}}>›</button>
          </div>

          {/* Días semana */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
            {['L','M','M','J','V','S','D'].map((d,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:9,fontWeight:500,color:C.muted,padding:'2px 0'}}>{d}</div>
            ))}
          </div>

          {/* Grid días */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {Array.from({length:startOffset}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day = i+1
              const svc = serviceByDay[day]
              const dateISO = fechaISO(day)
              const isToday = day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()
              const isSelected = selectedDate===dateISO

              return(
                <div key={day}
                  onClick={()=>loadBlockedMembers(dateISO)}
                  style={{
                    aspectRatio:'1',borderRadius:7,display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',cursor:'pointer',
                    position:'relative',fontSize:11,fontWeight:svc?500:400,
                    background:isSelected?ACCENT:svc?C.crema:isToday?(darkMode?'rgba(255,255,255,0.04)':'#F0EDE7'):'transparent',
                    color:isSelected?'#F5F0E6':svc?C.txt:C.muted,
                    border:svc&&!isSelected?`0.5px solid ${C.cremaDark}`:'none',
                    transition:'all 0.15s',
                  }}>
                  {day}
                  {svc&&!isSelected&&<div style={{width:3,height:3,borderRadius:'50%',background:C.txt,position:'absolute',bottom:2}}/>}
                </div>
              )
            })}
          </div>

          {/* Leyenda */}
          <div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:C.crema,border:`0.5px solid ${C.cremaDark}`}}/>
              <span style={{fontSize:10,fontWeight:300,color:C.muted}}>Servicio programado</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:ACCENT}}/>
              <span style={{fontSize:10,fontWeight:300,color:C.muted}}>Seleccionado</span>
            </div>
          </div>
        </div>

        {/* Panel de bloqueados */}
        {selectedDate&&(
          <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
            <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${C.cremaDark}`,background:C.crema}}>
              <p style={{fontSize:11,fontWeight:700,color:C.txt,letterSpacing:0.3}}>{fmtFecha(selectedDate)}</p>
              <p style={{fontSize:10,fontWeight:300,color:C.muted,marginTop:2}}>
                {loadingBlocked?'Cargando...':blockedMembers.length===0?'Nadie ha bloqueado esta fecha':
                `${blockedMembers.length} persona${blockedMembers.length!==1?'s':''} no disponible${blockedMembers.length!==1?'s':''}`}
              </p>
            </div>
            {!loadingBlocked&&blockedMembers.length===0&&(
              <div style={{padding:'24px 16px',textAlign:'center'}}>
                <p style={{fontSize:28,marginBottom:8}}>✓</p>
                <p style={{fontSize:13,fontWeight:400,color:C.muted}}>Todos están disponibles este día</p>
              </div>
            )}
            {!loadingBlocked&&blockedMembers.map((m,i)=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:i<blockedMembers.length-1?`0.5px solid ${C.cremaDark}`:'none'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,flexShrink:0}}>
                  {m.nombre?.[0]}{m.apellido?.[0]||''}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:500,color:C.txt}}>{m.nombre} {m.apellido}</p>
                  <p style={{fontSize:10,fontWeight:300,color:C.muted}}>
                    {((m as any).instrumentos||[]).join(' · ')||'Sin instrumentos'}
                  </p>
                </div>
                <span style={{fontSize:10,fontWeight:600,background:'#FEE2E2',color:'#B91C1C',padding:'2px 8px',borderRadius:20}}>No disponible</span>
              </div>
            ))}
          </div>
        )}

        {!selectedDate&&(
          <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'24px 16px',textAlign:'center'}}>
            <p style={{fontSize:13,fontWeight:300,color:C.muted}}>Toca un día para ver quién no está disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}
