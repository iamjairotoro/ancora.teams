'use client'
// La pestaña Disponibilidad del portal (punto 54, commit 4): reemplaza al calendario provisional del punto 51 (hoja del Inicio y /portal/[token]/disponibilidad). Referencia: docs/mockup-musico-v2.html (Disponibilidad).
// Calendario del mes (hay servicio = punto bajo el número; todos los equipos bloqueados = día relleno; solo algunos = contorno con esquina marcada), la nota, «Mis bloqueos» y «Bloquear un rango».
// Al tocar un día —o una fila de «Mis bloqueos»— se abre la HOJA del día (hoja.module.css): servicio de ese día, motivo, equipos Disponible/Bloqueado y guardar. Los bloqueos son POR EQUIPO (punto 51b) y se guardan con
// /api/portal/bloqueos (set_date_blocks), igual que antes. Las filas de bloqueos viven en el padre (PortalApp): así Servicios sabe qué días quedaron bloqueados sin volver a pedirlos.
import { useTecladoHoja } from '@/components/useTecladoHoja'
import { avisar } from '@/lib/ventanas/ventanas'
import { useState, useEffect, useMemo, useRef } from 'react'
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { C } from '@/lib/portal/theme'
import { portalFetch } from '@/lib/portal/portalFetch'
import { fechaConDia, listaDeDias } from '@/lib/portal/fechas'
import { TeamMono } from '@/components/TeamColor'
import type { EstadoBloqueos } from '@/lib/portal/bloqueosCarga'
import hoja from './hoja.module.css'
import ui from './disponibilidad.module.css'
import portalUi from '../portal.module.css'

// Colores: solo tokens v5 (lib/portal/theme.ts); el tema lo decide <html data-theme>. Los de la hoja y sus avisos (estilos en línea heredados del 51b).
const ACCENT=C.accent
const BG=C.bg, CARD=C.card, TXT=C.ink, MUTED=C.muted, BORDER=C.rule, NAV_BG=C.solid

function toDateStr(d:Date){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export type Equipo = { id:string; name:string; color:string|null }
type Block = { reason:string; start:string; end:string; teamIds:string[]|null }
export interface ServicioDia { fecha:string; tipo?:string; titulo?:string; hora_inicio?:string; hora_fin?:string; lugar?:string }

// Las filas de UNA fecha (una por equipo, o una sola con team_id NULL = todos) → un solo bloqueo.
function blockFromRows(rows:any[]):Block|null{
  if(!rows.length) return null
  const all=rows.some(r=>r.team_id==null)
  return {reason:rows.map(r=>r.reason).find(Boolean)||'', start:rows[0].start_date, end:rows[0].end_date, teamIds: all?null:rows.map(r=>r.team_id)}
}

function TeamSwitches({teams,selected,onToggle,disabled,TXT,MUTED,BORDER,ACCENT}:{teams:Equipo[];selected:string[];onToggle:(id:string)=>void;disabled?:boolean;TXT:string;MUTED:string;BORDER:string;ACCENT:string}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      {teams.map(t=>{
        const on=selected.includes(t.id)
        return(
          <button key={t.id} type="button" role="switch" aria-checked={on} disabled={disabled} onClick={()=>onToggle(t.id)}
            style={{display:'flex',alignItems:'center',gap:'0.5625rem',width:'100%',minHeight:'max(44px, 2.75rem)',padding:'0.5rem 2px',background:'none',border:'none',cursor:disabled?'default':'pointer',fontFamily:'inherit',textAlign:'left',opacity:disabled?0.6:1}}>
            <span {...(t.color?{'data-team':t.color}:{})} style={{width:'0.5625rem',height:'0.5625rem',borderRadius:'50%',background:'var(--anc-team-a, currentColor)',flexShrink:0}}/>
            <span style={{flex:1,fontSize:'0.8125rem',color:TXT}}>{t.name}</span>
            <span aria-hidden style={{width:'2.125rem',height:'1.25rem',borderRadius:'0.625rem',background:on?ACCENT:'transparent',border:`1px solid ${on?ACCENT:BORDER}`,position:'relative',flexShrink:0}}>
              <span style={{position:'absolute',top:2,left:on?16:2,width:'0.875rem',height:'0.875rem',borderRadius:'50%',background:on?C.onAccent:MUTED,transition:'left .15s'}}/>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function Disponibilidad({ token, servicios, filas, equipos, estado, onFilas, onRecargar }: {
  token:string|null
  /** Los servicios y ensayos vigentes (el punto bajo el número del día). */
  servicios:ServicioDia[]
  /** Las filas de /api/portal/bloqueos (una por equipo y fecha, o una sin equipo = todos). */
  filas:any[]
  equipos:Equipo[]
  /** Si los bloqueos no cargaron ('error'), no se dibuja el calendario: solo el aviso con «Reintentar» (no se puede marcar ni bloquear nada). */
  estado:EstadoBloqueos
  onFilas:(f:(prev:any[])=>any[])=>void
  onRecargar:()=>Promise<unknown>|void
}){
  const teams=equipos
  const [selTeams, setSelTeams] = useState<string[]>([]) // equipos marcados en el diálogo abierto
  const [calMonth, setCalMonth] = useState(()=>{const d=new Date();return{year:d.getFullYear(),month:d.getMonth()}})
  const [selectedDay, setSelectedDay] = useState<string|null>(null)
  const [savingBlock, setSavingBlock] = useState(false)
  const [showRange, setShowRange] = useState(false)
  const [rangeForm, setRangeForm] = useState({reason:'',start:'',end:''})
  const [confirmDescartar, setConfirmDescartar] = useState(false)
  const [reintentando, setReintentando] = useState(false)
  // Días del rango que no se pudieron guardar: la hoja sigue abierta y «Reintentar» vuelve a mandar solo esos.
  const [fallidos, setFallidos] = useState<string[]>([])
  const hojaRef = useRef<HTMLDivElement>(null)
  useTecladoHoja(hojaRef, !!selectedDay || showRange)     // con el teclado abierto la hoja queda encima del teclado (lib/tecladoHoja.ts)
  const rangoBtnRef = useRef<HTMLButtonElement>(null)   // el botón «Bloquear un rango»: el foco vuelve ahí al cerrar
  const diaRef = useRef<HTMLElement|null>(null)     // el día tocado: el foco vuelve ahí al cerrar la hoja
  const [reasonInput, setReasonInput] = useState('')
  const [confirmRemoveFor, setConfirmRemoveFor] = useState<string|null>(null)
  // Apagar un equipo en un día YA bloqueado = desbloquear: pide confirmación (punto 51).
  const [confirmOff, setConfirmOff] = useState<{dateStr:string;teamId:string;last:boolean}|null>(null)
  const cancelOffRef = useRef<HTMLButtonElement>(null)
  const confirmOffRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement|null>(null)

  // Varias filas en una fecha (una por equipo) = un solo bloqueo con esos equipos; una fila sin equipo = todos.
  const dateBlocks = useMemo(()=>{
    const byDate:Record<string,any[]>={}
    filas.forEach((b:any)=>{ const key = b.blocked_date || b.service?.fecha; if(key) (byDate[key]=byDate[key]||[]).push(b) })
    const map:Record<string,Block>={}
    Object.entries(byDate).forEach(([key,rows])=>{ const nb=blockFromRows(rows); if(nb) map[key]=nb })
    return map
  },[filas])

  // alertdialog de «Desbloquear»: foco en «Cancelar», Escape cancela, Tab no sale del diálogo.
  useEffect(()=>{
    if(!confirmOff) return
    cancelOffRef.current?.focus()
    const onKey=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){ e.preventDefault(); closeConfirmOff() }
      else if(e.key==='Tab'){
        const a=cancelOffRef.current, b=confirmOffRef.current
        if(!a||!b) return
        const first=e.shiftKey?b:a, last=e.shiftKey?a:b
        if(document.activeElement===last || !(document.activeElement===a||document.activeElement===b)){ e.preventDefault(); first.focus() }
        else if(document.activeElement===first && e.shiftKey){ e.preventDefault(); last.focus() }
      }
    }
    document.addEventListener('keydown',onKey)
    return ()=>document.removeEventListener('keydown',onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[confirmOff])

  // Hoja del día abierta: el fondo no se desplaza y el foco entra en la hoja (al cerrar, vuelve al día tocado: cerrarHoja).
  useEffect(()=>{
    if(!selectedDay && !showRange) return
    const prev=document.body.style.overflow; document.body.style.overflow='hidden'
    hojaRef.current?.focus()
    return ()=>{ document.body.style.overflow=prev }
  },[selectedDay, showRange])

  const allTeamIds = teams.map(t=>t.id)
  const multi = teams.length>1
  // null = todos (también con un solo equipo); si no, la lista de equipos marcados.
  const teamsPayload = (sel:string[]):string[]|null => (!multi || sel.length===teams.length) ? null : sel
  const isPartial = (b?:Block) => !!b && multi && b.teamIds!==null && b.teamIds.length<teams.length
  // Cambios sin guardar: solo el formulario de un día LIBRE (motivo escrito o equipos desmarcados). Los interruptores de un día bloqueado guardan al tocarlos.
  const hayCambios = () => showRange ? (rangeForm.reason.trim()!=='' || !!rangeForm.start || !!rangeForm.end || (multi && selTeams.length!==teams.length)) : !!selectedDay && !dateBlocks[selectedDay] && (reasonInput.trim()!=='' || (multi && selTeams.length!==teams.length))
  const intentarCerrar = () => { if(hayCambios()) setConfirmDescartar(true); else if(showRange) cerrarRango(); else cerrarHoja() }
  // Escape cierra (con la pregunta si hay cambios); Tab no sale de la hoja.
  function teclaHoja(e:React.KeyboardEvent){
    if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); intentarCerrar(); return }
    if(e.key!=='Tab') return
    const f=Array.from(hojaRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')||[])
    if(!f.length) return
    const first=f[0], last=f[f.length-1], act=document.activeElement
    if(e.shiftKey && (act===first || act===hojaRef.current)){ e.preventDefault(); last.focus() }
    else if(!e.shiftKey && act===last){ e.preventDefault(); first.focus() }
  }
  const toggleSel = (id:string) => setSelTeams(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  // La hoja del día: se abre al tocar un fecha, con el formulario limpio y todos los equipos marcados.
  const abrirDia = (d:string, el:HTMLElement) => { diaRef.current = el; setSelectedDay(d); setReasonInput(''); setSelTeams(allTeamIds); setConfirmDescartar(false) }
  function cerrarRango(){
    setShowRange(false); setRangeForm({reason:'',start:'',end:''}); setConfirmDescartar(false); setFallidos([])
    setTimeout(()=>{ if(rangoBtnRef.current && document.contains(rangoBtnRef.current)) rangoBtnRef.current.focus() },0)
  }
  function cerrarHoja(){
    setSelectedDay(null); setReasonInput(''); setConfirmDescartar(false)
    const el = diaRef.current; diaRef.current = null
    if(el) setTimeout(()=>{ if(document.contains(el)) el.focus() },0)
  }

  // Lee la respuesta; si el servidor guardó, devuelve las filas que quedaron en la base para esa fecha.
  async function readSave(res:Response|null, fallback:string):Promise<{ok:boolean;rows:any[]|null}>{
    const body = res ? await res.json().catch(()=>null) : null
    if(res?.ok) return {ok:true, rows:Array.isArray(body?.blocks)?body.blocks:null}
    // Queda en la consola el estado y el código de la base (si lo hay) para poder diagnosticar.
    console.error('[bloqueos]', res?.status ?? 'sin respuesta', body)
    await avisar(`${fallback}${body?.code?` (código ${body.code})`:''}`)
    return {ok:false, rows:null}
  }
  // Lo que quedó en la base para esa fecha reemplaza a lo que había (las filas son del padre: así Servicios y Disponibilidad ven lo mismo).
  const fechaDe=(r:any):string|undefined=>r.blocked_date||r.service?.fecha
  const reemplazarFecha=(dateStr:string, rows:any[])=>onFilas(prev=>prev.filter(r=>fechaDe(r)!==dateStr).concat(rows))
  const applyRows = (dateStr:string, rows:any[]|null) => { if(rows) reemplazarFecha(dateStr,rows); else onRecargar() }

  async function blockDate(dateStr:string, reason:string){
    const teamIds = teamsPayload(selTeams)
    setSavingBlock(true)
    const res = await portalFetch(token,'/api/portal/bloqueos',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({date:dateStr,reason,teamIds})}).catch(()=>null)
    const r = await readSave(res,'No se pudo guardar el bloqueo. Intenta de nuevo.')
    if(r.ok) applyRows(dateStr,r.rows)
    setSavingBlock(false)
    if(r.ok) cerrarHoja()      // si falló, la hoja sigue abierta con lo escrito
  }

  // Cambia los equipos de un bloqueo YA existente (el motivo y las fechas no cambian).
  // ENCENDER un equipo bloquea: no pide confirmación. APAGAR = desbloquear: pide confirmación y, si
  // el servidor falla, el interruptor sigue como estaba (el estado solo cambia con lo que guardó la base).
  function requestToggle(dateStr:string, teamId:string){
    const b=dateBlocks[dateStr]
    if(!b||savingBlock) return
    const current = b.teamIds ?? allTeamIds
    if(current.includes(teamId)){
      returnFocusRef.current = document.activeElement as HTMLElement | null
      setConfirmOff({dateStr, teamId, last: current.length===1})
    } else applyToggle(dateStr, teamId)
  }
  function closeConfirmOff(refocus=true){
    setConfirmOff(null)
    if(!refocus) return
    const el=returnFocusRef.current; returnFocusRef.current=null
    if(el && document.contains(el)) setTimeout(()=>el.focus(),0)
  }
  async function confirmUnblock(){
    const c=confirmOff; if(!c) return
    const el=returnFocusRef.current; returnFocusRef.current=null
    closeConfirmOff(false) // los interruptores están deshabilitados mientras guarda: el foco vuelve al terminar
    if(c.last){ await removeBlock(c.dateStr); cerrarHoja() } // era el último equipo bloqueado: el día queda libre
    else await applyToggle(c.dateStr, c.teamId)
    if(el) setTimeout(()=>{ if(document.contains(el) && !(el as HTMLButtonElement).disabled) el.focus() },0)
  }
  async function applyToggle(dateStr:string, teamId:string){
    const b=dateBlocks[dateStr]
    if(!b) return
    const current = b.teamIds ?? allTeamIds
    const next = current.includes(teamId) ? current.filter(x=>x!==teamId) : [...current, teamId]
    const teamIds = teamsPayload(next)
    setSavingBlock(true)
    const res = await portalFetch(token,'/api/portal/bloqueos',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({date:dateStr,reason:b.reason,startDate:b.start||dateStr,endDate:b.end||dateStr,teamIds})}).catch(()=>null)
    const r = await readSave(res,'No se pudo cambiar el equipo. Intenta de nuevo.')
    if(r.ok) applyRows(dateStr,r.rows)
    setSavingBlock(false)
  }

  async function removeBlock(dateStr:string){
    setSavingBlock(true)
    const res = await portalFetch(token,'/api/portal/bloqueos',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:dateStr})}).catch(()=>null)
    if(res?.ok) reemplazarFecha(dateStr,[])
    else await avisar('No se pudo quitar el bloqueo. Intenta de nuevo.')
    setSavingBlock(false)
  }

  // `soloEstos`: el reintento manda únicamente los días que fallaron; los que se guardaron antes ya están en la base y en el calendario.
  async function saveRange(soloEstos?:string[]){
    if(!rangeForm.start||!rangeForm.end||!rangeForm.reason.trim()||savingBlock) return
    let dates:string[]=soloEstos||[]
    if(!soloEstos){
      const start=new Date(rangeForm.start+'T12:00:00')
      const end=new Date(rangeForm.end+'T12:00:00')
      for(const d=new Date(start); d<=end; d.setDate(d.getDate()+1)) dates.push(toDateStr(d))
    }
    const teamIds = teamsPayload(selTeams)
    setSavingBlock(true)
    const results = await Promise.all(dates.map(dateStr=>
      portalFetch(token,'/api/portal/bloqueos',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({date:dateStr,reason:rangeForm.reason,startDate:rangeForm.start,endDate:rangeForm.end,teamIds})}).then(r=>r.ok).catch(()=>false)
    ))
    await onRecargar()      // lo que quedó en la base, no lo que se supone que se guardó
    setSavingBlock(false)
    const fallaron=dates.filter((_,i)=>!results[i])
    if(fallaron.length){ setFallidos(fallaron); return }     // la hoja NO se cierra
    cerrarRango()
  }


  if(estado!=='ok') return(
    <div className={ui.pantalla}>
      <div role="alert" className={ui.falla}>
        <p>No pudimos cargar tus bloqueos.</p>
        <button type="button" className={ui.reintentar} disabled={reintentando} onClick={async()=>{ setReintentando(true); await onRecargar(); setReintentando(false) }}>{reintentando?'Cargando…':'Reintentar'}</button>
      </div>
    </div>
  )

  const {year,month}=calMonth
  const firstDay=new Date(year,month,1).getDay()
  const startOffset=firstDay===0?6:firstDay-1
  const daysInMonth=new Date(year,month+1,0).getDate()
  const todayStr=toDateStr(new Date())
  const monthNames=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const svcByFecha:Record<string,ServicioDia>={}
  servicios.forEach(s=>{svcByFecha[s.fecha]=s})
  // «Mis bloqueos»: de hoy en adelante, por fecha.
  const blockedDates = Object.keys(dateBlocks).filter(d=>d>=todayStr).sort()

  const selectedSvc = selectedDay ? svcByFecha[selectedDay] : null
  const isSelectedBlocked = selectedDay ? !!dateBlocks[selectedDay] : false

  function fmtSelected(fecha:string){ return fechaConDia(fecha) }
  const resumen=(d:string)=>{
    const b=dateBlocks[d]
    const equipos=multi?(isPartial(b)?`Solo ${teams.filter(t=>b.teamIds!.includes(t.id)).map(t=>t.name).join(', ')}`:'Todos tus equipos'):null
    return [equipos,b.reason||null].filter(Boolean).join(' · ')||'Bloqueado'
  }

  return (
    <div className={ui.pantalla}>
      <section className={ui.tarjeta} aria-label="Calendario">
        <div className={ui.cabMes}>
          <button type="button" className={ui.mesBtn} aria-label="Mes anterior" onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month-1);return{year:d.getFullYear(),month:d.getMonth()}})}><ChevronLeft size={20} aria-hidden="true"/></button>
          <h2 className={ui.mes} aria-live="polite">{monthNames[month].charAt(0).toUpperCase()+monthNames[month].slice(1)} {year}</h2>
          <button type="button" className={ui.mesBtn} aria-label="Mes siguiente" onClick={()=>setCalMonth(p=>{const d=new Date(p.year,p.month+1);return{year:d.getFullYear(),month:d.getMonth()}})}><ChevronRight size={20} aria-hidden="true"/></button>
        </div>
        <div className={ui.grilla} role="group" aria-label={`${monthNames[month]} ${year}`}>
          {['L','M','M','J','V','S','D'].map((d,i)=><span key={i} className={ui.dow} aria-hidden="true">{d}</span>)}
          {Array.from({length:startOffset}).map((_,i)=><span key={`e${i}`}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day=i+1
            const dateStr=toDateStr(new Date(year,month,day))
            const svc=svcByFecha[dateStr]
            const isBlocked=!!dateBlocks[dateStr]
            const partial=isPartial(dateBlocks[dateStr])
            const clase=[ui.dia, svc?ui.conServicio:'', isBlocked?(partial?ui.algunos:ui.todos):'', dateStr===todayStr?ui.hoy:''].filter(Boolean).join(' ')
            return(
              <button key={day} type="button" className={clase} onClick={e=>abrirDia(dateStr,e.currentTarget)} aria-current={dateStr===todayStr?'date':undefined}
                aria-label={`${day} de ${monthNames[month]}${svc?(svc.tipo==='ensayo'?', ensayo':', servicio'):''}${isBlocked?(partial?', bloqueado en algunos equipos':', bloqueado'):''}`}>
                {day}
                {partial&&<span className={ui.esquina} aria-hidden="true"/>}
                {svc&&<span className={ui.punto} aria-hidden="true"/>}
              </button>
            )
          })}
        </div>
        <div className={ui.leyenda}>
          <span><i className={ui.lPunto}/>Hay servicio</span>
          <span><i className={ui.lTodos}/>{multi?'Todos bloqueados':'Bloqueado'}</span>
          {multi&&<span><i className={ui.lAlgunos}/>Algunos equipos</span>}
        </div>
      </section>

      <p className={ui.nota}>Elige un día para bloquearlo.{multi&&<> Puedes dejarte <b>disponible en un equipo y bloquear los otros</b>.</>}</p>

      <section aria-labelledby="disp-mis-bloqueos">
        <h2 id="disp-mis-bloqueos" className={ui.seccion}>Mis bloqueos</h2>
        {blockedDates.length>0?(
          <ul className={ui.lista}>
            {blockedDates.map(dateStr=>{
              const b=dateBlocks[dateStr]
              const ids=b.teamIds ?? allTeamIds
              return(
                <li key={dateStr}>
                  <button type="button" className={ui.fila} onClick={e=>abrirDia(dateStr,e.currentTarget)} aria-label={`${fechaConDia(dateStr)}: ${resumen(dateStr)}`}>
                    <span className={ui.filaTxt}><b>{fechaConDia(dateStr)}</b><span>{resumen(dateStr)}</span></span>
                    {multi&&<span className={ui.monos} aria-hidden="true">{teams.filter(t=>ids.includes(t.id)).map(t=><TeamMono key={t.id} name={t.name} color={t.color}/>)}</span>}
                    <ChevronRight size={18} aria-hidden="true" className={ui.flecha}/>
                  </button>
                </li>
              )
            })}
          </ul>
        ):<p className={ui.vacio}>No tienes días bloqueados.</p>}
      </section>

      <button ref={rangoBtnRef} type="button" className={ui.rango} onClick={()=>{setSelTeams(allTeamIds);setRangeForm({reason:'',start:'',end:''});setFallidos([]);setShowRange(true)}}>
        + Bloquear un rango de fechas (ej. vacaciones)
      </button>

      {selectedDay && (
        <>
          <div className={hoja.velo} onClick={intentarCerrar} aria-hidden="true"/>
          <div ref={hojaRef} role="dialog" aria-modal="true" aria-labelledby="disp-dia-titulo" tabIndex={-1} className={hoja.hoja} style={{background:NAV_BG}} onKeyDown={teclaHoja}>
            <div className={hoja.asa} aria-hidden="true"/>
            <div className={hoja.cabeza}>
              <h2 id="disp-dia-titulo" className={hoja.titulo}>{fmtSelected(selectedDay)}</h2>
              <button type="button" className={hoja.cerrar} onClick={intentarCerrar} aria-label="Cerrar">✕</button>
            </div>

            {selectedSvc ? (
              <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:'0.75rem',padding:'0.75rem 0.875rem',marginBottom:'0.625rem'}}>
                <p style={{fontSize:'max(11px, 0.625rem)',fontWeight:600,color:MUTED,textTransform:'uppercase' as const,letterSpacing:0.5,margin:'0 0 0.1875rem'}}>
                  {selectedSvc.tipo==='ensayo'?'Ensayo':'Servicio'}
                </p>
                <p style={{fontSize:'0.875rem',fontWeight:500,color:TXT,margin:'0 0 2px'}}>{selectedSvc.titulo}</p>
                <p style={{fontSize:'max(11px, 0.75rem)',color:MUTED,margin:0,display:'flex',alignItems:'center',gap:'0.25rem'}}>
                  {selectedSvc.hora_inicio?`${selectedSvc.hora_inicio.slice(0,5)} — ${(selectedSvc.hora_fin||'').slice(0,5)}`:''}
                  {selectedSvc.lugar&&<><MapPin size={11}/> {selectedSvc.lugar}</>}
                </p>
              </div>
            ):(
              <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:'0.75rem',padding:'0.75rem 0.875rem',marginBottom:'0.625rem'}}>
                <p style={{fontSize:'max(11px, 0.75rem)',color:MUTED,margin:0}}>Sin servicio ni ensayo este día.</p>
              </div>
            )}

            {isSelectedBlocked ? (
              <>
                {multi && (
                  <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:'0.75rem',padding:'0.625rem 0.875rem',marginBottom:'0.625rem'}}>
                    <p style={{fontSize:'max(11px, 0.625rem)',fontWeight:600,color:MUTED,textTransform:'uppercase' as const,letterSpacing:0.5,margin:'0 0 0.25rem'}}>Bloqueado en</p>
                    <TeamSwitches teams={teams} selected={dateBlocks[selectedDay]?.teamIds ?? allTeamIds} onToggle={id=>requestToggle(selectedDay,id)} disabled={savingBlock} TXT={TXT} MUTED={MUTED} BORDER={BORDER} ACCENT={ACCENT}/>
                    <p style={{fontSize:'max(11px, 0.625rem)',color:MUTED,margin:'0.25rem 0 0',lineHeight:1.4}}>Apaga un equipo para quedar disponible ahí ese día.</p>
                  </div>
                )}
                <button onClick={()=>setConfirmRemoveFor(selectedDay)} disabled={savingBlock}
                  style={{width:'100%',minHeight:'max(44px, 2.75rem)',background:'none',border:`1px solid ${BORDER}`,color:TXT,borderRadius:'0.625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                  Quitar bloqueo
                </button>
              </>
            ):(
              <>
                <label htmlFor="disp-motivo" style={{fontSize:'max(11px, 0.625rem)',fontWeight:500,color:MUTED,display:'block',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.5px'}}>Razón (obligatoria)</label>
                <input id="disp-motivo" placeholder="Ej: Viaje, examen, otro compromiso..." value={reasonInput} onChange={e=>setReasonInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&reasonInput.trim()&&!savingBlock&&(!multi||selTeams.length>0))blockDate(selectedDay,reasonInput.trim())}}
                  style={{width:'100%',boxSizing:'border-box',minHeight:'max(44px, 2.75rem)',border:`0.5px solid ${BORDER}`,borderRadius:'0.5rem',padding:'0.5625rem 0.6875rem',fontSize:16,fontFamily:'inherit',outline:'none',color:TXT,background:BG,marginBottom:'0.875rem'}}/>
                {multi&&(<>
                  <p style={{fontSize:'max(11px, 0.625rem)',fontWeight:500,color:MUTED,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Equipos en los que estás bloqueado</p>
                  <div style={{marginBottom:'0.75rem'}}><TeamSwitches teams={teams} selected={selTeams} onToggle={toggleSel} TXT={TXT} MUTED={MUTED} BORDER={BORDER} ACCENT={ACCENT}/></div>
                </>)}
                <button onClick={()=>blockDate(selectedDay,reasonInput.trim())} disabled={!reasonInput.trim()||savingBlock||(multi&&selTeams.length===0)}
                  style={{width:'100%',minHeight:'max(44px, 2.75rem)',background:reasonInput.trim()?ACCENT:C.sunk,color:C.onAccent,border:'none',borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:reasonInput.trim()?'pointer':'default'}}>
                  {savingBlock?'Guardando...':'Bloquear fecha'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {showRange && (
        <>
          <div className={hoja.velo} onClick={intentarCerrar} aria-hidden="true"/>
          <div ref={hojaRef} role="dialog" aria-modal="true" aria-labelledby="disp-rango-titulo" tabIndex={-1} className={hoja.hoja} style={{background:NAV_BG}} onKeyDown={teclaHoja}>
            <div className={hoja.asa} aria-hidden="true"/>
            <div className={hoja.cabeza}>
              <h2 id="disp-rango-titulo" className={hoja.titulo}>Bloquear un rango</h2>
              <button type="button" className={hoja.cerrar} onClick={intentarCerrar} aria-label="Cerrar">✕</button>
            </div>
            <p style={{fontSize:'max(11px, 0.6875rem)',fontWeight:400,color:MUTED,margin:'0 0 1rem'}}>Indica las fechas en que no podrás servir.</p>
            <label htmlFor="disp-rango-motivo" style={{fontSize:'max(11px, 0.625rem)',fontWeight:500,color:MUTED,display:'block',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.5px'}}>Razón (obligatoria)</label>
            <input id="disp-rango-motivo" placeholder="Ej: Viaje familiar..." value={rangeForm.reason} onChange={e=>setRangeForm({...rangeForm,reason:e.target.value})}
              style={{width:'100%',boxSizing:'border-box',minHeight:'max(44px, 2.75rem)',border:`0.5px solid ${BORDER}`,borderRadius:'0.5rem',padding:'0.5625rem 0.6875rem',fontSize:16,fontFamily:'inherit',outline:'none',color:TXT,background:BG,marginBottom:'0.625rem'}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'1rem'}}>
              <div>
                <label htmlFor="disp-rango-ini" style={{fontSize:'max(11px, 0.625rem)',fontWeight:500,color:MUTED,display:'block',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.5px'}}>Comienza</label>
                <input id="disp-rango-ini" type="date" value={rangeForm.start} onChange={e=>{setRangeForm({...rangeForm,start:e.target.value});setFallidos([])}}
                  style={{width:'100%',boxSizing:'border-box',minHeight:'max(44px, 2.75rem)',border:`0.5px solid ${BORDER}`,borderRadius:'0.5rem',padding:'0.5625rem 0.5rem',fontSize:16,fontFamily:'inherit',outline:'none',color:TXT,background:BG}}/>
              </div>
              <div>
                <label htmlFor="disp-rango-fin" style={{fontSize:'max(11px, 0.625rem)',fontWeight:500,color:MUTED,display:'block',marginBottom:'0.25rem',textTransform:'uppercase',letterSpacing:'0.5px'}}>Termina</label>
                <input id="disp-rango-fin" type="date" value={rangeForm.end} onChange={e=>{setRangeForm({...rangeForm,end:e.target.value});setFallidos([])}}
                  style={{width:'100%',boxSizing:'border-box',minHeight:'max(44px, 2.75rem)',border:`0.5px solid ${BORDER}`,borderRadius:'0.5rem',padding:'0.5625rem 0.5rem',fontSize:16,fontFamily:'inherit',outline:'none',color:TXT,background:BG}}/>
              </div>
            </div>
            {multi&&(<>
              <label style={{fontSize:'max(11px, 0.625rem)',fontWeight:500,color:MUTED,display:'block',marginBottom:2,textTransform:'uppercase',letterSpacing:'0.5px'}}>Equipos en los que estás bloqueado</label>
              <div style={{marginBottom:'0.75rem'}}><TeamSwitches teams={teams} selected={selTeams} onToggle={toggleSel} TXT={TXT} MUTED={MUTED} BORDER={BORDER} ACCENT={ACCENT}/></div>
            </>)}
            {fallidos.length>0&&(
              <div role="alert" style={{background:C.noBg,color:C.no,borderRadius:'0.625rem',padding:'0.625rem 0.75rem',marginBottom:'0.625rem',fontSize:'max(11px, 0.75rem)',lineHeight:1.45,fontWeight:500}}>
                No se pudieron bloquear {listaDeDias(fallidos)}.{' '}
                <button type="button" onClick={()=>saveRange(fallidos)} disabled={savingBlock}
                  style={{background:'none',border:'none',padding:'0 2px',minHeight:'max(44px, 2.75rem)',font:'inherit',fontWeight:700,color:'inherit',textDecoration:'underline',cursor:'pointer'}}>Reintentar</button>
              </div>
            )}
            <button onClick={()=>saveRange()} disabled={!rangeForm.start||!rangeForm.end||!rangeForm.reason.trim()||(multi&&selTeams.length===0)}
              style={{width:'100%',minHeight:'max(44px, 2.75rem)',background:rangeForm.start&&rangeForm.end&&rangeForm.reason.trim()?ACCENT:C.sunk,color:C.onAccent,border:'none',borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:rangeForm.start&&rangeForm.end&&rangeForm.reason.trim()?'pointer':'default',marginBottom:'0.5rem'}}>
              Guardar bloqueo
            </button>
            <button onClick={intentarCerrar}
              style={{width:'100%',minHeight:'max(44px, 2.75rem)',background:'none',color:MUTED,border:'none',padding:6,fontSize:'max(11px, 0.75rem)',fontFamily:'inherit',cursor:'pointer',marginTop:'0.25rem'}}>Cancelar</button>
          </div>
        </>
      )}

      {confirmDescartar && (
        <div onMouseDown={e=>{ if(e.target===e.currentTarget) setConfirmDescartar(false) }}
          className={portalUi.scrim} style={{minHeight:200,display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:'var(--z-alert)',padding:20}}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="descartar-title" aria-describedby="descartar-desc"
            onKeyDown={e=>{
              if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); setConfirmDescartar(false); setTimeout(()=>hojaRef.current?.focus(),0) }
              else if(e.key==='Tab'){ const bs=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button')); const i=bs.indexOf(document.activeElement as HTMLElement); e.preventDefault(); bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus() }
            }}
            style={{background:NAV_BG,borderRadius:'1rem',padding:20,width:'100%',maxWidth:340}}>
            <p id="descartar-title" style={{fontSize:'0.9375rem',fontWeight:500,color:TXT,marginBottom:'0.375rem'}}>¿Descartar lo que escribiste?</p>
            <p id="descartar-desc" style={{fontSize:'max(11px, 0.75rem)',fontWeight:400,color:MUTED,marginBottom:'1rem',lineHeight:1.45}}>Tienes cambios sin guardar en este día. Si cierras, se pierden.</p>
            <button autoFocus type="button" onClick={()=>{ setConfirmDescartar(false); setTimeout(()=>hojaRef.current?.focus(),0) }}
              style={{width:'100%',minHeight:'max(44px, 2.75rem)',background:'none',color:TXT,border:`1px solid ${BORDER}`,borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:'pointer',marginBottom:'0.5rem'}}>
              Seguir editando
            </button>
            <button type="button" onClick={showRange?cerrarRango:cerrarHoja}
              style={{width:'100%',minHeight:'max(44px, 2.75rem)',background:ACCENT,color:C.onAccent,border:'none',borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {confirmOff && (()=>{
        const t=teams.find(x=>x.id===confirmOff.teamId)
        const nombre=t?.name||'este equipo'
        const fecha=new Date(confirmOff.dateStr+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})
        return(
          <div onMouseDown={e=>{ if(e.target===e.currentTarget) closeConfirmOff() }}
            className={portalUi.scrim} style={{minHeight:200,display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:'var(--z-alert)',padding:20}}>
            <div role="alertdialog" aria-modal="true" aria-labelledby="unblock-title" aria-describedby="unblock-desc"
              style={{background:NAV_BG,borderRadius:'1rem',padding:20,width:'100%',maxWidth:340}}>
              <p id="unblock-title" style={{fontSize:'0.9375rem',fontWeight:500,color:TXT,marginBottom:'0.375rem'}}>¿Desbloquear {nombre} el {fecha}?</p>
              <p id="unblock-desc" style={{fontSize:'max(11px, 0.75rem)',fontWeight:400,color:MUTED,marginBottom:'1rem',lineHeight:1.45}}>
                {confirmOff.last&&<>Es el último equipo bloqueado: ese día quedará completamente libre. </>}
                Desde ese momento, el líder de {nombre} te verá disponible y podrá asignarte.
              </p>
              <button ref={cancelOffRef} autoFocus type="button" onClick={()=>closeConfirmOff()}
                style={{width:'100%',background:'none',color:TXT,border:`1px solid ${BORDER}`,borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:'pointer',marginBottom:'0.5rem'}}>
                Cancelar
              </button>
              <button ref={confirmOffRef} type="button" onClick={confirmUnblock}
                style={{width:'100%',background:ACCENT,color:C.onAccent,border:'none',borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
                Sí, desbloquear
              </button>
            </div>
          </div>
        )
      })()}

      {confirmRemoveFor && (
        <div className={portalUi.scrim} style={{minHeight:200,display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:'var(--z-alert)',padding:20}}>
          <div role="alertdialog" aria-modal="true" aria-label="¿Quitar este bloqueo?" style={{background:NAV_BG,borderRadius:'1rem',padding:20,width:'100%',maxWidth:340}}>
            <p style={{fontSize:'0.9375rem',fontWeight:500,color:TXT,marginBottom:'0.25rem'}}>¿Quitar este bloqueo?</p>
            <p style={{fontSize:'max(11px, 0.6875rem)',fontWeight:400,color:MUTED,marginBottom:'1rem'}}>{fmtSelected(confirmRemoveFor)} volverá a quedar disponible.</p>
            <button onClick={()=>{ const d=confirmRemoveFor; removeBlock(d); setConfirmRemoveFor(null); if(d===selectedDay) cerrarHoja() }} disabled={savingBlock}
              style={{width:'100%',background:C.no,color:C.onAccent,border:'none',borderRadius:'0.5625rem',padding:11,fontSize:'0.8125rem',fontWeight:500,fontFamily:'inherit',cursor:'pointer',marginBottom:'0.5rem'}}>
              Sí, quitar bloqueo
            </button>
            <button onClick={()=>setConfirmRemoveFor(null)}
              style={{width:'100%',background:'none',color:MUTED,border:'none',padding:6,fontSize:'max(11px, 0.75rem)',fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
