'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { esConvocableAEnsayo } from '@/lib/equipos'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }
const ACCENT = '#1A1A1A'
const AMBER = '#B7791F'
const AMBER_BG = 'rgba(240,169,59,0.15)'

type Member = { id:string; nombre:string; apellido:string; email:string; instrumentos?:string[] }
type Song = { id:string; nombre:string; artista:string }
type Ensayo = { id:string; fecha:string; titulo:string; hora_inicio:string; hora_fin:string; lugar:string|null; direccion?:string|null; maps_link?:string|null; tipo:string }
type CancionRow = { id:string; orden:number; song_id:string; song?:{nombre:string; artista:string} }
type Invitation = { id:string; member_id:string; status:string; member?:Member }

export default function EnsayoPanel({ members: allMembers, songs, darkMode }:{ members:Member[]; songs:Song[]; darkMode?:boolean }) {
  const members = allMembers.filter(m=>esConvocableAEnsayo(m.instrumentos))
  const C = darkMode ? DARK_C : LIGHT_C
  const [ensayos, setEnsayos] = useState<Ensayo[]>([])
  const [selected, setSelected] = useState<Ensayo|null>(null)
  const [canciones, setCanciones] = useState<CancionRow[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newFecha, setNewFecha] = useState('')
  const [newHoraInicio, setNewHoraInicio] = useState('19:00')
  const [newHoraFin, setNewHoraFin] = useState('21:00')
  const [newLugar, setNewLugar] = useState('')
  const [newDireccion, setNewDireccion] = useState('')
  const [newMapsLink, setNewMapsLink] = useState('')
  const [addSongId, setAddSongId] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(()=>{
    // Al cambiar de ensayo, por defecto se preseleccionan todos los convocables
    setSelectedIds(new Set(members.map(m=>m.id)))
  },[selected?.id])

  function toggleMember(id:string){
    setSelectedIds(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  }

  const loadEnsayos = useCallback(async ()=>{
    const { data } = await supabase.from('services').select('*').eq('tipo','ensayo').order('fecha',{ascending:true})
    setEnsayos(data||[])
    if(!selected && data?.length) setSelected(data[0])
  },[selected])

  const loadDetail = useCallback(async (ensayo: Ensayo)=>{
    const [blocksRes, invRes] = await Promise.all([
      fetch(`/api/service-blocks?serviceId=${ensayo.id}`).then(r=>r.json()),
      supabase.from('invitations').select('*, member:members(*)').eq('service_id', ensayo.id),
    ])
    setCanciones((blocksRes.blocks||[]).filter((b:any)=>b.tipo==='cancion'))
    setInvitations(invRes.data||[])
  },[])

  useEffect(()=>{ loadEnsayos() },[])
  useEffect(()=>{ if(selected) loadDetail(selected) },[selected, loadDetail])

  async function createEnsayo(){
    if(!newFecha) return
    const d = new Date(newFecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const titulo=`Ensayo — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const { data, error } = await supabase.from('services').insert({
      fecha:newFecha, titulo, tipo:'ensayo',
      hora_inicio:newHoraInicio, hora_fin:newHoraFin,
      lugar:newLugar||null, direccion:newDireccion||null, maps_link:newMapsLink||null,
    }).select().single()
    if(error){ alert('Error al crear: '+error.message); return }
    setShowNew(false); setNewFecha(''); setNewLugar(''); setNewDireccion(''); setNewMapsLink('')
    await loadEnsayos()
    setSelected(data)
  }

  async function deleteEnsayo(id:string){
    if(!confirm('¿Eliminar este ensayo?')) return
    const { error } = await supabase.from('services').delete().eq('id', id)
    if(error){ alert('Error al eliminar: '+error.message); return }
    setSelected(null); await loadEnsayos()
  }

  async function addCancion(){
    if(!selected || !addSongId) return
    await fetch('/api/service-blocks',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ service_id:selected.id, tipo:'cancion', song_id:addSongId, orden:canciones.length+1 })})
    setAddSongId('')
    await loadDetail(selected)
  }

  async function removeCancion(id:string){
    await fetch('/api/service-blocks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    if(selected) await loadDetail(selected)
  }

  async function sendConvocatoria(){
    if(!selected||selectedIds.size===0) return
    setSending(true); setMsg('')
    const res = await fetch('/api/send-ensayo-invites',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({serviceId:selected.id, memberIds:Array.from(selectedIds)})})
    const data = await res.json()
    setMsg(data.message||data.error||'')
    setSending(false)
    await loadDetail(selected)
  }

  function fmtFecha(fecha:string){
    const d = new Date(fecha+'T12:00:00')
    const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
  }

  const confirmados = invitations.filter(i=>i.status==='confirmado').length
  const availableSongs = songs.filter(s=>!canciones.some(c=>c.song_id===s.id))

  return (
    <div style={{maxWidth:900,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <select value={selected?.id||''} onChange={e=>setSelected(ensayos.find(x=>x.id===e.target.value)||null)}
          style={{flex:1,minWidth:200,padding:'10px 12px',borderRadius:10,border:`1px solid ${C.cremaDark}`,background:C.card,color:C.txt,fontSize:13,fontFamily:'inherit'}}>
          {ensayos.length===0 && <option value="">Sin ensayos aún</option>}
          {ensayos.map(e=><option key={e.id} value={e.id}>{fmtFecha(e.fecha)} — {(e.hora_inicio||'').slice(0,5)}</option>)}
        </select>
        <button onClick={()=>setShowNew(true)}
          style={{background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:10,padding:'10px 16px',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>+ Nuevo ensayo</button>
        {selected && <button onClick={()=>deleteEnsayo(selected.id)}
          style={{background:'none',color:'#B91C1C',border:'1px solid #FCA5A5',borderRadius:10,padding:'10px 14px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Eliminar</button>}
      </div>

      {showNew && (
        <div style={{minHeight:200,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',position:'fixed',inset:0,zIndex:200}}>
          <div style={{background:C.card,borderRadius:16,padding:20,width:'100%',maxWidth:340}}>
            <p style={{fontWeight:600,fontSize:15,color:C.txt,marginBottom:14}}>Nuevo ensayo</p>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4}}>Fecha</label>
            <input type="date" value={newFecha} onChange={e=>setNewFecha(e.target.value)}
              style={{width:'100%',border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:9,fontSize:13,marginBottom:10,background:C.crema,color:C.txt,fontFamily:'inherit'}}/>
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4}}>Hora inicio</label>
                <input type="time" value={newHoraInicio} onChange={e=>setNewHoraInicio(e.target.value)}
                  style={{width:'100%',border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:9,fontSize:13,background:C.crema,color:C.txt,fontFamily:'inherit'}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4}}>Hora fin</label>
                <input type="time" value={newHoraFin} onChange={e=>setNewHoraFin(e.target.value)}
                  style={{width:'100%',border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:9,fontSize:13,background:C.crema,color:C.txt,fontFamily:'inherit'}}/>
              </div>
            </div>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4}}>Nombre del lugar (opcional)</label>
            <input value={newLugar} onChange={e=>setNewLugar(e.target.value)} placeholder="Sala de ensayo"
              style={{width:'100%',border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:9,fontSize:13,marginBottom:10,background:C.crema,color:C.txt,fontFamily:'inherit'}}/>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4}}>Dirección (opcional)</label>
            <input value={newDireccion} onChange={e=>setNewDireccion(e.target.value)} placeholder="Av. Siempre Viva 123"
              style={{width:'100%',border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:9,fontSize:13,marginBottom:10,background:C.crema,color:C.txt,fontFamily:'inherit'}}/>
            <label style={{fontSize:11,color:C.muted,fontWeight:500,display:'block',marginBottom:4}}>Link de Google Maps (opcional)</label>
            <input value={newMapsLink} onChange={e=>setNewMapsLink(e.target.value)} placeholder="https://maps.google.com/..."
              style={{width:'100%',border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:9,fontSize:13,marginBottom:16,background:C.crema,color:C.txt,fontFamily:'inherit'}}/>
            <p style={{fontSize:11,color:C.muted,marginBottom:14,lineHeight:1.5}}>No se enviará ninguna convocatoria todavía — podrás elegir cuándo invitar a la banda desde el detalle del ensayo.</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={createEnsayo} disabled={!newFecha}
                style={{flex:1,background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:10,fontSize:13,fontWeight:500,cursor:newFecha?'pointer':'default',opacity:newFecha?1:0.5,fontFamily:'inherit'}}>Crear</button>
              <button onClick={()=>setShowNew(false)}
                style={{flex:1,background:'none',color:C.muted,border:`1px solid ${C.cremaDark}`,borderRadius:8,padding:10,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {!selected && ensayos.length===0 && (
        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'32px 16px',textAlign:'center'}}>
          <p style={{fontSize:13,color:C.muted}}>Aún no hay ensayos. Crea el primero con "+ Nuevo ensayo".</p>
        </div>
      )}

      {selected && (
        <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,320px)',gap:16}} className="admin-layout-grid">

          <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
              <div>
                <p style={{fontWeight:700,fontSize:16,color:C.txt,margin:0}}>{fmtFecha(selected.fecha)}</p>
                <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>
                  {(selected.hora_inicio||'').slice(0,5)} — {(selected.hora_fin||'').slice(0,5)}{selected.lugar?` · ${selected.lugar}`:''}
                </p>
                {selected.direccion && <p style={{fontSize:12,color:C.muted,margin:'2px 0 0'}}>{selected.direccion}</p>}
                {selected.maps_link && <a href={selected.maps_link} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:ACCENT,textDecoration:'underline',display:'inline-block',marginTop:2}}>Ver en Google Maps</a>}
              </div>
              <span style={{fontSize:11,fontWeight:600,background:AMBER_BG,color:AMBER,padding:'4px 10px',borderRadius:20}}>Ensayo</span>
            </div>

            <div style={{borderTop:`1px solid ${C.cremaDark}`,marginTop:14,paddingTop:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <p style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.5,margin:0}}>CANCIONES A REPASAR</p>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <select value={addSongId} onChange={e=>setAddSongId(e.target.value)}
                  style={{flex:1,padding:'8px 10px',borderRadius:8,border:`1px solid ${C.cremaDark}`,background:C.crema,color:C.txt,fontSize:12,fontFamily:'inherit'}}>
                  <option value="">Elegir canción...</option>
                  {availableSongs.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.artista?` — ${s.artista}`:''}</option>)}
                </select>
                <button onClick={addCancion} disabled={!addSongId}
                  style={{background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:500,cursor:addSongId?'pointer':'default',opacity:addSongId?1:0.5,fontFamily:'inherit'}}>+ Agregar</button>
              </div>
              {canciones.length===0 && <p style={{fontSize:12,color:C.muted,padding:'8px 0'}}>Sin canciones aún.</p>}
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {canciones.map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:C.crema,borderRadius:8}}>
                    <span style={{fontSize:13,color:C.txt,flex:1}}>{c.song?.nombre||'—'}</span>
                    {c.song?.artista && <span style={{fontSize:11,color:C.muted}}>{c.song.artista}</span>}
                    <button onClick={()=>removeCancion(c.id)}
                      style={{background:'none',border:'none',color:'#B91C1C',cursor:'pointer',fontSize:13,padding:'2px 4px'}}>✕</button>
                  </div>
                ))}
              </div>
            </div>

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
      )}
    </div>
  )
}
