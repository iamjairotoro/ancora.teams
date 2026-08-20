'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AvatarUpload from '@/components/AvatarUpload'

const C = { crema:'#F5F0E6', cremaDark:'#E0D8C8', txt:'#1A1A1A', muted:'#999' }

type Tab = 'home' | 'misdomingos' | 'recursos' | 'perfil'

function toMMSS(min: number) {
  const m = Math.floor(min), s = Math.round((min - m) * 60)
  return `${m}:${s.toString().padStart(2,'0')}`
}

export default function PortalMemberPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('home')
  const [member, setMember] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [allSongs, setAllSongs] = useState<any[]>([])
  const [songSearch, setSongSearch] = useState('')
  const [expandedSong, setExpandedSong] = useState<string|null>(null)
  const [profileData, setProfileData] = useState({nombre:'',apellido:'',telefono:'',fecha_nacimiento:''})
  const [editProfile, setEditProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Registrar last_seen
      await supabase.from('members').update({ last_seen: new Date().toISOString() }).eq('id', id)

      const [memberRes, songsRes] = await Promise.all([
        supabase.from('members').select('*').eq('id', id).single(),
        fetch('/api/all-songs'),
      ])
      if (memberRes.data) {
        setMember(memberRes.data)
        setProfileData({
          nombre: memberRes.data.nombre,
          apellido: memberRes.data.apellido||'',
          telefono: memberRes.data.telefono||'',
          fecha_nacimiento: memberRes.data.fecha_nacimiento||''
        })
      }
      const songsData = songsRes.ok ? await songsRes.json() : { songs:[] }
      setAllSongs(songsData.songs||[])

      // Cargar servicios futuros
      const { data: svcs } = await supabase
        .from('services').select('*').order('fecha', { ascending: true })
      const now = new Date()
      const futureSvcs = (svcs||[]).filter((s:any) => {
        const endTime = s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00'
        return new Date(endTime) > now
      })
      setServices(futureSvcs)
      setLoading(false)
    }
    load()
  }, [id])

  async function saveProfile() {
    await supabase.from('members').update(profileData).eq('id', id)
    setMember((prev:any) => ({...prev, ...profileData}))
    setProfileMsg('¡Guardado!')
    setEditProfile(false)
    setTimeout(() => setProfileMsg(''), 3000)
  }

  const filteredSongs = allSongs.filter(s =>
    s.nombre.toLowerCase().includes(songSearch.toLowerCase()) ||
    s.artista.toLowerCase().includes(songSearch.toLowerCase())
  )

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'2px solid #1A1A1A',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#FFFFFF',fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      {/* Hero */}
      <div style={{backgroundImage:'url(/bg-ancora.jpg)',backgroundSize:'cover',backgroundPosition:'center',position:'relative',paddingTop:18,paddingBottom:50,paddingLeft:16,paddingRight:16}}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
        <div style={{maxWidth:500,margin:'0 auto',position:'relative'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:12}}>
            <img src="/logo-icon-cream.png" alt="Áncora" style={{height:36,width:'auto',objectFit:'contain'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
            <div style={{width:38,height:38,borderRadius:10,background:C.crema,overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(245,240,230,0.3)'}}>
              {member?.avatar_url
                ? <img src={member.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt={member.nombre}/>
                : <span style={{fontFamily:'"Dancing Script",cursive',fontWeight:700,fontSize:20,color:C.txt}}>{member?.nombre?.[0]}</span>
              }
            </div>
            <div>
              <h1 style={{fontSize:16,fontWeight:700,color:'#F5F0E6',lineHeight:1.2}}>Hola, {member?.nombre}</h1>
              <p style={{fontSize:10,fontWeight:400,color:'rgba(245,240,230,0.55)',marginTop:2}}>Mi espacio Áncora</p>
            </div>
          </div>
          {services.length === 0 && (
            <div style={{background:'rgba(255,255,255,0.78)',border:'0.5px solid rgba(255,255,255,0.6)',borderRadius:12,padding:'10px 12px'}}>
              <p style={{fontSize:12,color:'#888',textAlign:'center' as const}}>No tienes servicios próximos asignados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{maxWidth:500,margin:'-1px auto 0',padding:'0 16px'}}>
        <div style={{background:'white',borderRadius:16,padding:8,display:'flex',gap:4,boxShadow:'0 -4px 20px rgba(0,0,0,0.06)',border:`0.5px solid ${C.cremaDark}`}}>
          {(['home','misdomingos','recursos','perfil'] as Tab[]).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,padding:'8px 0',borderRadius:10,background:tab===t?C.txt:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:2}}>
              <span style={{fontSize:18}}>{t==='home'?'🏠':t==='misdomingos'?'📅':t==='recursos'?'🎵':'👤'}</span>
              <span style={{fontSize:10,fontWeight:tab===t?700:400,color:tab===t?'#F5F0E6':'#999'}}>{t==='home'?'Servicios':t==='misdomingos'?'Disponib.':t==='recursos'?'Canciones':'Perfil'}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:500,margin:'0 auto',padding:'14px 16px 40px'}}>
        {/* SERVICIOS */}
        {tab==='home'&&(
          services.length===0 ? (
            <div style={{background:C.crema,borderRadius:14,padding:32,textAlign:'center' as const,border:`0.5px solid ${C.cremaDark}`}}>
              <div style={{fontSize:32,marginBottom:10}}>🎵</div>
              <p style={{fontSize:14,color:C.muted}}>No tienes servicios próximos asignados.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {services.map((svc:any) => (
                <div key={svc.id} style={{background:C.crema,borderRadius:14,overflow:'hidden',border:`0.5px solid ${C.cremaDark}`}}>
                  <div style={{padding:'12px 14px'}}>
                    <p style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase' as const,color:C.muted,marginBottom:4}}>Próximo servicio</p>
                    <p style={{fontSize:16,fontWeight:700,color:C.txt}}>{new Date(svc.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* DISPONIBILIDAD */}
        {tab==='misdomingos'&&(
          <div style={{background:C.crema,borderRadius:14,padding:20,textAlign:'center' as const,border:`0.5px solid ${C.cremaDark}`}}>
            <p style={{fontSize:14,color:C.muted}}>Tu disponibilidad se activará cuando seas asignado a un servicio.</p>
          </div>
        )}

        {/* CANCIONES */}
        {tab==='recursos'&&(
          <div>
            <div style={{background:C.crema,borderRadius:10,padding:'10px 12px',marginBottom:10,border:`0.5px solid ${C.cremaDark}`,display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:16}}>🔍</span>
              <input style={{flex:1,border:'none',outline:'none',fontSize:14,fontFamily:'inherit',color:C.txt,background:'transparent'}} placeholder="Buscar canción o artista..." value={songSearch} onChange={e=>setSongSearch(e.target.value)}/>
            </div>
            <p style={{fontSize:12,color:C.muted,textAlign:'center' as const,marginBottom:10}}>{filteredSongs.length} canción{filteredSongs.length!==1?'es':''} en el repertorio</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {filteredSongs.map(song=>{
                const isOpen=expandedSong===song.id
                return(
                  <div key={song.id} style={{background:C.crema,borderRadius:10,overflow:'hidden',border:`0.5px solid ${C.cremaDark}`}}>
                    <button onClick={()=>setExpandedSong(isOpen?null:song.id)}
                      style={{width:'100%',textAlign:'left' as const,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:14,fontWeight:600,color:C.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{song.nombre}</p>
                        <p style={{fontSize:11,color:C.muted,marginTop:1}}>{song.artista}</p>
                      </div>
                      <span style={{color:C.muted,fontSize:11,transform:isOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
                    </button>
                    {isOpen&&(
                      <div style={{borderTop:`0.5px solid ${C.cremaDark}`,padding:'10px 14px',background:'white'}}>
                        {(song.tono_original||song.bpm||song.compas||song.duracion_min)&&(
                          <div style={{display:'flex',gap:5,flexWrap:'wrap' as const,marginBottom:10}}>
                            {song.tono_original&&<span style={{fontSize:11,fontWeight:700,background:'rgba(0,0,0,0.07)',color:C.txt,padding:'3px 8px',borderRadius:10}}>{song.tono_original}</span>}
                            {song.bpm&&<span style={{fontSize:11,background:'rgba(201,161,74,0.15)',color:'#92400E',padding:'3px 8px',borderRadius:10}}>♩ {song.bpm} BPM</span>}
                            {song.compas&&<span style={{fontSize:11,background:'rgba(0,0,0,0.05)',color:C.muted,padding:'3px 8px',borderRadius:10}}>{song.compas}</span>}
                            {song.duracion_min&&<span style={{fontSize:11,background:'rgba(0,0,0,0.05)',color:C.muted,padding:'3px 8px',borderRadius:10}}>{toMMSS(song.duracion_min)}</span>}
                          </div>
                        )}
                        {(song.link_spotify||song.link_letras||song.link_recursos)&&(
                          <div style={{display:'flex',gap:6}}>
                            {song.link_spotify&&<a href={song.link_spotify} target="_blank" style={{flex:1,background:'#FFE8E8',borderRadius:8,padding:'7px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}><div style={{fontSize:14}}>▶️</div><span style={{fontSize:9,fontWeight:700,color:'#CC0000'}}>YouTube</span></a>}
                            {song.link_letras&&<a href={song.link_letras} target="_blank" style={{flex:1,background:'#DBE4FF',borderRadius:8,padding:'7px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}><div style={{fontSize:14}}>📄</div><span style={{fontSize:9,fontWeight:700,color:'#1971C2'}}>Letras</span></a>}
                            {song.link_recursos&&<a href={song.link_recursos} target="_blank" style={{flex:1,background:'#FFF3CD',borderRadius:8,padding:'7px 4px',textAlign:'center' as const,textDecoration:'none',display:'block'}}><div style={{fontSize:14}}>📁</div><span style={{fontSize:9,fontWeight:700,color:'#92400E'}}>Recursos</span></a>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* PERFIL */}
        {tab==='perfil'&&(
          <div style={{background:C.crema,borderRadius:14,overflow:'hidden',border:`0.5px solid ${C.cremaDark}`}}>
            <div style={{backgroundImage:'url(/bg-ancora.jpg)',backgroundSize:'cover',backgroundPosition:'center',position:'relative',padding:'20px 16px'}}>
              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
              <div style={{position:'relative',display:'flex',alignItems:'center',gap:12}}>
                <AvatarUpload memberId={member?.id||''} currentUrl={member?.avatar_url} nombre={member?.nombre||''} apellido={member?.apellido} size="lg"
                  onUpdate={(url:string)=>setMember((prev:any)=>prev?{...prev,avatar_url:url}:prev)}/>
                <div>
                  <p style={{fontSize:16,fontWeight:700,color:'#F5F0E6'}}>{member?.nombre} {member?.apellido}</p>
                  <p style={{fontSize:11,color:'rgba(245,240,230,0.6)'}}>{member?.email}</p>
                </div>
              </div>
            </div>
            <div style={{padding:16}}>
              {profileMsg&&<div style={{background:'#FFE8E8',color:'#CC0000',fontSize:13,padding:'8px 12px',borderRadius:8,marginBottom:12,fontWeight:500}}>{profileMsg}</div>}
              {editProfile ? (
                <div>
                  {[{label:'Nombre',key:'nombre'},{label:'Apellido',key:'apellido'},{label:'Teléfono',key:'telefono'}].map(({label,key})=>(
                    <div key={key} style={{marginBottom:10}}>
                      <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:4,textTransform:'uppercase' as const,letterSpacing:0.5}}>{label}</label>
                      <input style={{width:'100%',border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:14,fontFamily:'inherit',outline:'none',color:C.txt,background:'white'}}
                        value={(profileData as any)[key]} onChange={e=>setProfileData({...profileData,[key]:e.target.value})}/>
                    </div>
                  ))}
                  <div style={{marginBottom:10}}>
                    <label style={{fontSize:11,fontWeight:600,color:C.muted,display:'block',marginBottom:4,textTransform:'uppercase' as const,letterSpacing:0.5}}>Fecha de nacimiento</label>
                    <input type="date" style={{width:'100%',border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:'9px 12px',fontSize:14,fontFamily:'inherit',outline:'none',color:C.txt,background:'white'}}
                      value={profileData.fecha_nacimiento} onChange={e=>setProfileData({...profileData,fecha_nacimiento:e.target.value})}/>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={saveProfile} style={{flex:1,background:C.txt,color:C.crema,border:'none',borderRadius:8,padding:11,fontSize:13,fontWeight:700,fontFamily:'inherit',cursor:'pointer'}}>Guardar</button>
                    <button onClick={()=>setEditProfile(false)} style={{flex:1,background:'white',color:C.txt,border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:11,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  {[
                    {label:'Nombre completo',value:`${member?.nombre} ${member?.apellido}`},
                    {label:'Email',value:member?.email},
                    {label:'Teléfono',value:member?.telefono||'—'},
                    {label:'Fecha de nacimiento',value:member?.fecha_nacimiento?new Date(member.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}):'—'},
                  ].map(({label,value})=>(
                    <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 0',borderBottom:`0.5px solid ${C.crema}`}}>
                      <span style={{fontSize:13,color:C.muted}}>{label}</span>
                      <span style={{fontSize:13,fontWeight:600,color:C.txt}}>{value}</span>
                    </div>
                  ))}
                  <button onClick={()=>setEditProfile(true)} style={{width:'100%',marginTop:14,background:'white',color:C.txt,border:`0.5px solid ${C.cremaDark}`,borderRadius:8,padding:11,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>✏️ Editar información</button>
                  <p style={{fontSize:11,color:C.muted,textAlign:'center' as const,marginTop:10}}>Para cambiar email o instrumentos, contacta al administrador.</p>
                  <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login'}}
                    style={{width:'100%',marginTop:10,background:'none',color:'#B91C1C',border:'none',padding:8,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
