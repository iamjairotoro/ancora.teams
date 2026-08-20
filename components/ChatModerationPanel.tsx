'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const LIGHT_C = { crema:'#F2F1EE', cremaDark:'#D6D5D1', txt:'#1A1A1A', muted:'#AAAAAA', card:'#FFFFFF' }
const DARK_C  = { crema:'rgba(255,255,255,0.06)', cremaDark:'rgba(255,255,255,0.08)', txt:'#F5F0E6', muted:'rgba(255,255,255,0.45)', card:'rgba(255,255,255,0.06)' }

type Msg = { id:string; content:string; created_at:string; member_id:string; service_id:string|null; recipient_member_id:string|null; member?:{nombre:string;apellido:string}; recipient?:{nombre:string;apellido:string}; service?:{fecha:string;titulo:string;tipo:string} }

export default function ChatModerationPanel({ darkMode }:{ darkMode?:boolean }) {
  const C = darkMode ? DARK_C : LIGHT_C
  const [messages, setMessages] = useState<Msg[]>([])
  const [filter, setFilter] = useState<'todos'|'general'|'servicios'|'directos'>('todos')
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string|null>(null)

  const load = useCallback(async()=>{
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*, member:members!member_id(nombre,apellido), recipient:members!recipient_member_id(nombre,apellido), service:services(fecha,titulo,tipo)')
      .order('created_at',{ascending:false})
      .limit(200)
    setMessages(data||[])
    setLoading(false)
  },[])

  useEffect(()=>{ load() },[load])

  useEffect(()=>{
    const channel = supabase.channel('admin-chat-moderation')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},(payload)=>{
        load()
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'messages'},(payload)=>{
        setMessages(prev=>prev.filter(m=>m.id!==(payload.old as any).id))
      })
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[load])

  async function deleteMessage(id:string){
    if(!confirm('¿Eliminar este mensaje? No se puede deshacer.')) return
    setDeletingId(id)
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev=>prev.filter(m=>m.id!==id))
    setDeletingId(null)
  }

  const filtered = messages.filter(m=>{
    if(filter==='general') return !m.service_id && !m.recipient_member_id
    if(filter==='servicios') return !!m.service_id
    if(filter==='directos') return !!m.recipient_member_id
    return true
  })

  function chatKeyOf(m:Msg){
    if(m.recipient_member_id) return 'dm_'+[m.member_id,m.recipient_member_id].sort().join('_')
    if(m.service_id) return 'svc_'+m.service_id
    return 'general'
  }

  function fmtFecha(iso:string){
    const d=new Date(iso)
    return d.toLocaleDateString('es-CL',{day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})
  }

  // Agrupa por conversación — así no se mezclan los DMs de distintas personas
  // ni los chats de distintos servicios en un solo feed cronológico.
  const groups = new Map<string,Msg[]>()
  for(const m of filtered){
    const key = chatKeyOf(m)
    if(!groups.has(key)) groups.set(key,[])
    groups.get(key)!.push(m)
  }
  const groupList = Array.from(groups.entries()).map(([key,msgs])=>{
    const sample = msgs[0]
    const isEnsayo = sample.service?.tipo==='ensayo'
    const isDm = !!sample.recipient_member_id
    const title = isDm
      ? `${sample.member?.nombre} ${sample.member?.apellido||''} ↔ ${sample.recipient?.nombre||'?'} ${sample.recipient?.apellido||''}`.trim()
      : !sample.service_id
        ? 'General (todo el equipo)'
        : sample.service
          ? `${isEnsayo?'Ensayo':'Servicio'} · ${new Date(sample.service.fecha+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'})}`
          : 'Servicio eliminado'
    const lastActivity = msgs[0].created_at // ya viene ordenado desc desde la consulta
    const sortedAsc = [...msgs].sort((a,b)=>a.created_at.localeCompare(b.created_at))
    return { key, title, isDm, isEnsayo, hasService: !isDm && !!sample.service_id, lastActivity, messages: sortedAsc }
  }).sort((a,b)=>b.lastActivity.localeCompare(a.lastActivity))

  return (
    <div style={{maxWidth:700,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {(['todos','general','servicios','directos'] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{fontSize:12,fontWeight:500,padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',fontFamily:'inherit',
              background:filter===f?'#1A1A1A':C.crema,color:filter===f?'#F5F0E6':C.muted}}>
            {f==='todos'?'Todos':f==='general'?'General':f==='servicios'?'Servicios/Ensayos':'Directos'}
          </button>
        ))}
      </div>

      {loading&&<p style={{fontSize:13,color:C.muted}}>Cargando...</p>}

      {!loading&&filtered.length===0&&(
        <div style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,padding:'32px 16px',textAlign:'center'}}>
          <p style={{fontSize:13,color:C.muted}}>Sin mensajes en esta vista.</p>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {groupList.map(group=>(
          <div key={group.key} style={{background:C.card,border:`1px solid ${C.cremaDark}`,borderRadius:12,overflow:'hidden'}}>
            {/* Header de la conversación */}
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.cremaDark}`,background:group.isDm?'rgba(124,58,237,0.08)':group.hasService?(group.isEnsayo?'rgba(240,169,59,0.1)':C.crema):'rgba(0,0,0,0.03)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,
                  background:group.isDm?'rgba(124,58,237,0.18)':!group.hasService?'#1A1A1A':group.isEnsayo?'rgba(240,169,59,0.25)':'rgba(0,0,0,0.08)',
                  color:group.isDm?'#7C3AED':!group.hasService?'#F5F0E6':group.isEnsayo?'#B7791F':C.muted}}>
                  {group.isDm?'DM':!group.hasService?'GENERAL':group.isEnsayo?'ENSAYO':'SERVICIO'}
                </span>
                <span style={{fontSize:13,fontWeight:600,color:C.txt}}>{group.title}</span>
              </div>
              <span style={{fontSize:10,color:C.muted}}>{group.messages.length} mensaje{group.messages.length!==1?'s':''}</span>
            </div>

            {/* Mensajes de esta conversación, en orden cronológico */}
            <div style={{display:'flex',flexDirection:'column',gap:1,padding:'6px 0'}}>
              {group.messages.map(m=>(
                <div key={m.id} style={{padding:'7px 14px',display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:1}}>
                      <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{m.member?.nombre} {m.member?.apellido}</span>
                      <span style={{fontSize:10,color:C.muted}}>{fmtFecha(m.created_at)}</span>
                    </div>
                    <p style={{fontSize:13,color:C.txt,margin:0,wordBreak:'break-word' as const}}>{m.content}</p>
                  </div>
                  <button onClick={()=>deleteMessage(m.id)} disabled={deletingId===m.id}
                    style={{background:'none',border:'none',color:'#B91C1C',cursor:'pointer',fontSize:13,padding:'2px 4px',flexShrink:0}}>
                    {deletingId===m.id?'...':'🗑'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
