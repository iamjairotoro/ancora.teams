'use client'
/* ════════════════════════════════════════════════════════════════════════
   EnsayoPanel — punto 16 de docs/PENDIENTES-code.md.

   Ya no es un tab propio ("Ensayo" salió del menú): AdminServiceView lo
   renderiza inline cuando el servicio seleccionado tiene kind='rehearsal'.
   La selección, creación, edición de horario/lugar y borrado del ensayo
   viven ahora en AdminServiceView (mismo mecanismo que cualquier
   servicio — un ensayo es una fila de `services` como cualquier otra).

   Lo que SÍ sigue siendo propio de este componente:
   - Canciones y banda: NO se editan acá — se heredan del servicio padre
     (parent_service_id) y se muestran de solo lectura. "Hereda canciones
     y nómina, así no hay que convocar dos veces" (punto 16).
   - La convocatoria del ensayo: decisión explícita del dueño de la app,
     esto NO se toca — sigue siendo su propia lista de invitations, con
     su propio checklist de a quién convocar y su propio botón de envío
     (app/api/send-ensayo-invites), exactamente como antes. El portal del
     músico (app/portal/[token]/**) sigue leyendo esa misma invitación
     propia sin cambios. Queda anotado en el README como inconsistencia
     asumida a propósito: la vista de admin ya hereda setlist/nómina,
     pero al músico le sigue llegando como invitación separada.
   ════════════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { esConvocableAEnsayo } from '@/lib/equipos'
import type { Service } from '@/lib/types'

const AMBER = '#B7791F'
const AMBER_BG = 'rgba(240,169,59,0.15)'
const ACCENT = '#1A1A1A'

type Member = { id:string; nombre:string; apellido:string; email:string; instrumentos?:string[] }
type CancionRow = { id:string; orden:number; song_id:string; song?:{nombre:string; artista:string} }
type BandaRow = { id:string; posicion:string; member?:Member|null }
type Invitation = { id:string; member_id:string; status:string; member?:Member }

interface Props {
  ensayo: Service
  members: Member[]
  darkMode?: boolean
  C: { crema:string; cremaDark:string; txt:string; muted:string; card:string }
}

export default function EnsayoPanel({ ensayo, members: allMembers, darkMode, C }: Props) {
  const members = allMembers.filter(m=>esConvocableAEnsayo(m.instrumentos))
  const [parentTitle, setParentTitle] = useState<string|null>(null)
  const [canciones, setCanciones] = useState<CancionRow[]>([])
  const [banda, setBanda] = useState<BandaRow[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(()=>{
    // Al cambiar de ensayo, por defecto se preseleccionan todos los convocables
    setSelectedIds(new Set(members.map(m=>m.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ensayo.id])

  const loadInherited = useCallback(async ()=>{
    if (!ensayo.parent_service_id) { setParentTitle(null); setCanciones([]); setBanda([]); return }
    const [parentRes, blocksRes, bandaRes] = await Promise.all([
      supabase.from('services').select('titulo,fecha').eq('id', ensayo.parent_service_id).single(),
      fetch(`/api/service-blocks?serviceId=${ensayo.parent_service_id}`).then(r=>r.json()),
      supabase.from('banda_assignments').select('id,posicion,member:members(*)').eq('service_id', ensayo.parent_service_id),
    ])
    setParentTitle(parentRes.data ? parentRes.data.titulo : null)
    setCanciones((blocksRes.blocks||[]).filter((b:any)=>b.tipo==='cancion'))
    setBanda(((bandaRes.data||[]) as any[]).filter(b=>b.member))
  },[ensayo.parent_service_id])

  const loadInvitations = useCallback(async ()=>{
    const { data } = await supabase.from('invitations').select('*, member:members(*)').eq('service_id', ensayo.id)
    setInvitations(data||[])
  },[ensayo.id])

  useEffect(()=>{ loadInherited() },[loadInherited])
  useEffect(()=>{ loadInvitations() },[loadInvitations])

  function toggleMember(id:string){
    setSelectedIds(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  async function sendConvocatoria(){
    if(selectedIds.size===0) return
    setSending(true); setMsg('')
    const res = await fetch('/api/send-ensayo-invites',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({serviceId:ensayo.id, memberIds:Array.from(selectedIds)})})
    const data = await res.json()
    setMsg(data.message||data.error||'')
    setSending(false)
    await loadInvitations()
  }

  return (
    <div style={{maxWidth:900,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
        <span style={{fontSize:11,fontWeight:600,background:AMBER_BG,color:AMBER,padding:'4px 10px',borderRadius:20}}>Ensayo</span>
        {(ensayo.lugar || ensayo.direccion) && (
          <span style={{fontSize:12,color:C.muted}}>{[ensayo.lugar,ensayo.direccion].filter(Boolean).join(' · ')}</span>
        )}
        {ensayo.maps_link && (
          <a href={ensayo.maps_link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ACCENT,textDecoration:'underline'}}>Ver en Maps</a>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,320px)',gap:16}} className="admin-layout-grid">

        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:16}}>
          <div style={{borderBottom:`1px solid ${C.cremaDark}`,paddingBottom:14,marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,margin:'0 0 6px'}}>HEREDA DE</p>
            {ensayo.parent_service_id ? (
              <p style={{fontSize:13,color:C.txt,margin:0}}>{parentTitle || '—'}</p>
            ) : (
              <p style={{fontSize:12,color:C.muted,margin:0}}>Sin servicio asociado — no hay canciones ni banda para heredar.</p>
            )}
          </div>

          <div>
            <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,margin:'0 0 10px'}}>CANCIONES A REPASAR</p>
            {canciones.length===0 ? (
              <p style={{fontSize:12,color:C.muted,padding:'8px 0'}}>
                {ensayo.parent_service_id ? 'El servicio del que depende todavía no tiene canciones.' : 'Sin canciones aún.'}
              </p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {canciones.map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:C.crema,borderRadius:8}}>
                    <span style={{fontSize:13,color:C.txt,flex:1}}>{c.song?.nombre||'—'}</span>
                    {c.song?.artista && <span style={{fontSize:11,color:C.muted}}>{c.song.artista}</span>}
                  </div>
                ))}
              </div>
            )}
            <p style={{fontSize:10,color:C.muted,marginTop:8}}>Para agregar o quitar canciones, se edita el servicio del que depende.</p>
          </div>

          {banda.length > 0 && (
            <div style={{marginTop:16,borderTop:`1px solid ${C.cremaDark}`,paddingTop:14}}>
              <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,margin:'0 0 10px'}}>BANDA DEL SERVICIO</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {banda.map(b=>(
                  <span key={b.id} style={{fontSize:11,padding:'4px 10px',background:C.crema,borderRadius:20,color:C.txt}}>
                    {b.posicion}: {b.member?.nombre} {b.member?.apellido}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{marginTop:16}}>
            <button onClick={sendConvocatoria} disabled={sending||selectedIds.size===0}
              style={{width:'100%',background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:11,fontSize:13,fontWeight:500,cursor:selectedIds.size===0?'default':'pointer',opacity:selectedIds.size===0?0.5:1,fontFamily:'inherit'}}>
              {sending?'Enviando...':selectedIds.size===0?'Selecciona a quién convocar':invitations.length>0?`Reenviar a ${selectedIds.size} seleccionado(s)`:`Enviar a ${selectedIds.size} seleccionado(s)`}
            </button>
            {msg && <p style={{fontSize:12,color:C.muted,marginTop:8,textAlign:'center'}}>{msg}</p>}
          </div>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.cremaDark}`,background:C.crema}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:C.txt,letterSpacing:0.3,margin:0}}>BANDA Y VOCES</p>
                <p style={{fontSize:11,color:C.muted,margin:'2px 0 0'}}>
                  {selectedIds.size} de {members.length} seleccionados
                </p>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>setSelectedIds(new Set(members.map(m=>m.id)))}
                  style={{fontSize:10,color:ACCENT,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>Todos</button>
                <button onClick={()=>setSelectedIds(new Set())}
                  style={{fontSize:10,color:C.muted,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:0}}>Ninguno</button>
              </div>
            </div>
          </div>
          {members.length===0 && (
            <div style={{padding:'20px 16px',textAlign:'center'}}>
              <p style={{fontSize:12,color:C.muted}}>No hay miembros de Banda o Voces registrados aún.</p>
            </div>
          )}
          {members.map((m,i)=>{
            const inv = invitations.find(x=>x.member_id===m.id)
            const status = inv?.status || 'no_convocado'
            const style = status==='confirmado'?{bg:'#D8F3DC',fg:'#1B4332',label:'Confirmado'}
              : status==='declinado'?{bg:'#FEE2E2',fg:'#B91C1C',label:'No puede'}
              : status==='pendiente'?{bg:'#FFF3CD',fg:'#664D03',label:'Pendiente'}
              : {bg:C.crema,fg:C.muted,label:'No convocado'}
            const checked = selectedIds.has(m.id)
            return(
              <label key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:i<members.length-1?`1px solid ${C.cremaDark}`:'none',cursor:'pointer'}}>
                <input type="checkbox" checked={checked} onChange={()=>toggleMember(m.id)}
                  style={{width:16,height:16,cursor:'pointer',accentColor:ACCENT,flexShrink:0}}/>
                <div style={{width:28,height:28,borderRadius:'50%',background:ACCENT,color:'#F5F0E6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0,opacity:checked?1:0.4}}>
                  {m.nombre?.[0]}{m.apellido?.[0]||''}
                </div>
                <span style={{fontSize:13,color:C.txt,flex:1,opacity:checked?1:0.5}}>{m.nombre} {m.apellido}</span>
                <span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20,background:style.bg,color:style.fg,opacity:checked?1:0.6}}>{style.label}</span>
              </label>
            )
          })}
        </div>

      </div>
    </div>
  )
}
