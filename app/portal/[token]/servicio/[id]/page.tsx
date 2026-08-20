'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, MapPin, Music4, User, FileText, Link2, Youtube, Apple, Lock, Mic2, ChevronDown, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { POSICIONES_BANDA, POSICIONES_VX, POSICIONES_TECNICA, LABEL_TECNICA } from '@/lib/equipos'

const LIGHT_BG='#F2F1EE', LIGHT_CARD='#FFFFFF', LIGHT_TXT='#1A1A1A', LIGHT_MUTED='#AAA', LIGHT_BORDER='rgba(0,0,0,0.16)'
const DARK_BG='#111118', DARK_CARD='rgba(255,255,255,0.06)', DARK_TXT='#F5F0E6', DARK_MUTED='rgba(255,255,255,0.35)', DARK_BORDER='rgba(255,255,255,0.08)'
const ACCENT='#1A1A1A'
const AMBER='#F0A93B'


function getMusicLinkMeta(url:string){
  if(/youtube\.com|youtu\.be/i.test(url)) return {Icon:Youtube,label:'YouTube'}
  if(/spotify\.com/i.test(url)) return {Icon:Music4,label:'Spotify'}
  return {Icon:Music4,label:'Escuchar'}
}

export default function ServicioDetallePage(){
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const svcId = params.id as string
  const isMemberPortal = token?.startsWith('member_')

  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [myData, setMyData] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number|null>(null)

  useEffect(()=>{
    const saved = localStorage.getItem('ancora-dark-mode')
    if(saved==='true') setDarkMode(true)
  },[])

  const BG=darkMode?DARK_BG:LIGHT_BG, CARD=darkMode?DARK_CARD:LIGHT_CARD, TXT=darkMode?DARK_TXT:LIGHT_TXT
  const MUTED=darkMode?DARK_MUTED:LIGHT_MUTED, BORDER=darkMode?DARK_BORDER:LIGHT_BORDER
  const NAV_BG=darkMode?'#15151C':LIGHT_CARD

  const loadData = useCallback(async()=>{
    const portalRes = isMemberPortal
      ? await fetch(`/api/portal-by-member?memberId=${token.replace('member_','')}`)
      : await fetch(`/api/member-portal?token=${token}`)
    const data = await portalRes.json()
    if(!portalRes.ok||data.error){ setLoading(false); return }
    setMember(data.member)
    const merged = [...(data.services||[]), ...(data.ensayos||[])]
    const found = merged.find((s:any)=>s.service.id===svcId)
    setMyData(found||null)
    setLoading(false)
  },[token, isMemberPortal, svcId])

  useEffect(()=>{ if(token&&svcId) loadData() },[token, svcId, loadData])

  useEffect(()=>{
    function onVisible(){ if(document.visibilityState==='visible') loadData() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return ()=>{
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  },[loadData])

  async function handleRSVP(respuesta:'si'|'no'){
    if(!myData?.invitation?.token) return
    setActionLoading(true)
    await fetch('/api/confirm-rsvp',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:myData.invitation.token,respuesta})})
    await loadData()
    setActionLoading(false)
    setConfirmingDecline(false)
  }

  if(loading) return(
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,border:`2px solid ${TXT}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  if(!myData) return(
    <div style={{minHeight:'100vh',background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'14px 16px',position:'sticky',top:0}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',gap:8}}><ChevronLeft size={22}/><span style={{fontSize:14,color:TXT}}>Volver</span></button>
      </div>
      <div style={{padding:40,textAlign:'center'}}><p style={{fontSize:13,color:MUTED}}>No encontramos este servicio.</p></div>
    </div>
  )

  const {service:svc,posiciones,invitation,banda,setlist} = myData
  const isEnsayo = svc.tipo==='ensayo'
  const isAssigned = isEnsayo ? true : posiciones.length>0
  // Mientras no confirme su asistencia, no ve el equipo del día ni el setlist —
  // así no se filtra esa info a alguien que ni siquiera sabe si va a poder ir.
  // Si no existe invitación formal todavía (recién asignado, el admin aún no
  // envía la convocatoria), tampoco puede ver nada — ese era justo el hueco:
  // antes se trataba "sin invitación" como "ya puede ver todo".
  const canSeeDetails = !!invitation && invitation.status==='confirmado'
  const bandaInstr = (banda||[]).filter((b:any)=>POSICIONES_BANDA.includes(b.posicion)&&b.member)
  const bandaVoces = (banda||[]).filter((b:any)=>POSICIONES_VX.includes(b.posicion)&&b.member)
  const bandaTec = (banda||[]).filter((b:any)=>POSICIONES_TECNICA.includes(b.posicion)&&b.member)
  const fechaFmt = new Date(svc.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})

  return (
    <div style={{minHeight:'100vh',background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',paddingBottom:40}}>
      <div style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'14px 16px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:500,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.back()} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',padding:0}}>
            <ChevronLeft size={22}/>
          </button>
          <span style={{fontSize:15,fontWeight:500,color:TXT}}>{isEnsayo?'Ensayo':'Servicio'}</span>
        </div>
      </div>

      <div style={{maxWidth:500,margin:'0 auto',padding:'14px 16px'}}>

        {/* Hero */}
        <div style={{background:'#1A1A2E',borderRadius:16,padding:'18px 16px',marginBottom:16}}>
          {isEnsayo&&<span style={{fontSize:10,fontWeight:600,background:'rgba(240,169,59,0.25)',color:AMBER,borderRadius:20,padding:'3px 10px'}}>Ensayo</span>}
          <div style={{fontSize:22,fontWeight:400,color:'#FFFFFF',letterSpacing:'-0.3px',margin:'10px 0 4px',lineHeight:1.2,textTransform:'capitalize' as const}}>{fechaFmt}</div>
          <div style={{fontSize:12,fontWeight:400,color:'rgba(255,255,255,0.5)',marginBottom:16,display:'flex',alignItems:'center',gap:5}}>
            {svc.hora_inicio?`${svc.hora_inicio.slice(0,5)}${svc.hora_fin?` — ${svc.hora_fin.slice(0,5)}`:''} hrs`:''}
            {svc.lugar&&<><span>·</span><MapPin size={11}/> {svc.lugar}</>}
          </div>

          {isAssigned ? (
            <div style={{background:'rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 14px',marginBottom:12}}>
              <p style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.5)',letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 6px'}}>Tu rol este día</p>
              {posiciones.length>0?(
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {posiciones.map((p:string)=><span key={p} style={{fontSize:13,fontWeight:600,background:'rgba(255,255,255,0.15)',color:'#FFFFFF',padding:'4px 12px',borderRadius:20}}>{LABEL_TECNICA[p]||p}</span>)}
                </div>
              ):(
                <p style={{fontSize:14,fontWeight:500,color:'#FFFFFF',margin:0}}>Convocado a este ensayo</p>
              )}
            </div>
          ):(
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 14px',marginBottom:12}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',margin:0}}>Aún no has sido convocado a este servicio.</p>
            </div>
          )}

          {!invitation||!invitation.sent_at?(
              <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 14px'}}>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',margin:0}}>Tu convocatoria aún no ha sido enviada — vuelve más tarde.</p>
              </div>
            ):invitation.status==='pendiente'?(
              confirmingDecline?(
                <div>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:8}}>¿Confirmas que no puedes asistir?</p>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>handleRSVP('no')} disabled={actionLoading} style={{flex:1,background:'rgba(226,75,74,0.3)',color:'#FFB3B3',border:'none',borderRadius:8,padding:10,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>Sí, no puedo</button>
                    <button onClick={()=>setConfirmingDecline(false)} style={{flex:1,background:'none',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,padding:10,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
                  </div>
                </div>
              ):(
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>handleRSVP('si')} disabled={actionLoading} style={{flex:1,background:'rgba(82,183,136,0.3)',color:'#A8E6CF',border:'none',borderRadius:8,padding:11,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✓ Confirmo</button>
                  <button onClick={()=>setConfirmingDecline(true)} disabled={actionLoading} style={{flex:1,background:'rgba(226,75,74,0.3)',color:'#FFB3B3',border:'none',borderRadius:8,padding:11,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>✗ No puedo</button>
                </div>
              )
            ):invitation.status==='confirmado'&&invitation.needs_reassignment_confirm?(
              <div style={{background:'rgba(240,169,59,0.15)',borderRadius:12,padding:'12px 14px'}}>
                <p style={{fontSize:12,color:'#F0A93B',margin:0,fontWeight:500}}>Tu rol cambió — aún no confirmas. Espera tu nueva convocatoria.</p>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:13,fontWeight:500,color:invitation.status==='confirmado'?'#A8E6CF':'#FFB3B3'}}>{invitation.status==='confirmado'?'✓ Confirmado':'✗ Declinado'}</span>
                <button onClick={()=>invitation.status==='confirmado'?setConfirmingDecline(true):handleRSVP('si')}
                  style={{fontSize:11,color:'rgba(255,255,255,0.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                  {invitation.status==='confirmado'?'Declinar':'Confirmar'}
                </button>
              </div>
            )}
        </div>

        {/* Banda del día */}
        {canSeeDetails ? (
          (bandaInstr.length>0||bandaVoces.length>0||bandaTec.length>0)&&(
            <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:14,marginBottom:14}}>
              {[
                {label:'Banda', items:bandaInstr, labelWidth:26, getLabel:(b:any)=>b.posicion},
                {label:'Voces', items:bandaVoces, labelWidth:26, getLabel:(b:any)=>b.posicion},
                {label:'Técnica', items:bandaTec, labelWidth:44, getLabel:(b:any)=>LABEL_TECNICA[b.posicion]||b.posicion},
              ].map((group,gi)=>group.items.length===0?null:(
                <div key={group.label} style={{marginBottom:gi<2&&(bandaVoces.length>0||bandaTec.length>0)?14:0}}>
                  <p style={{fontSize:10,fontWeight:600,color:MUTED,letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 8px'}}>{group.label}</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {group.items.map((b:any)=>{
                      const isMe=member?.id&&b.member_id===member.id
                      return(
                        <div key={b.posicion} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:8,background:isMe?ACCENT:BG,border:isMe?'none':`0.5px solid ${BORDER}`}}>
                          <span style={{fontSize:8,fontWeight:700,color:isMe?AMBER:MUTED,width:group.labelWidth,flexShrink:0}}>{group.getLabel(b)}</span>
                          <span style={{fontSize:12,fontWeight:400,color:isMe?'#F5F0E6':TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.member?.nombre}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:'20px 16px',marginBottom:14,textAlign:'center'}}>
            <Lock size={16} color={MUTED} style={{marginBottom:6}}/>
            <p style={{fontSize:12,fontWeight:500,color:MUTED,margin:0}}>Confirma tu asistencia para ver quién más sirve este día</p>
          </div>
        )}

        {/* Setlist / Canciones */}
        {canSeeDetails ? (
          <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:14}}>
            <p style={{fontSize:10,fontWeight:600,color:MUTED,letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 10px',display:'flex',alignItems:'center',gap:6}}>
              <Music4 size={12}/> {isEnsayo?'Canciones a repasar':'Orden del servicio'}
            </p>
            {(!setlist||setlist.length===0)?(
              <p style={{fontSize:12,fontWeight:400,color:MUTED}}>Aún no hay canciones.</p>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {setlist.map((item:any,i:number)=>{
                  const links=[
                    item.song?.link_spotify&&{href:item.song.link_spotify,...getMusicLinkMeta(item.song.link_spotify)},
                    item.song?.spotify_url&&{href:item.song.spotify_url,Icon:Music4,label:'Spotify'},
                    item.song?.apple_music_url&&{href:item.song.apple_music_url,Icon:Apple,label:'Apple Music'},
                    item.song?.link_letras&&{href:item.song.link_letras,Icon:FileText,label:'Letra'},
                    item.song?.link_recursos&&{href:item.song.link_recursos,Icon:Link2,label:'Recursos'},
                  ].filter(Boolean) as {href:string;Icon:any;label:string}[]
                  const isCancion = item.tipo==='cancion'
                  const expandable = isCancion && links.length>0
                  const isExpanded = expandable && expandedIdx===i
                  return(
                    <div key={i} style={{padding:'8px 4px',borderBottom:i<setlist.length-1?`0.5px solid ${BORDER}`:'none'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,cursor:expandable?'pointer':'default'}}
                        onClick={()=>{if(expandable) setExpandedIdx(isExpanded?null:i)}}>
                        <span style={{fontSize:10,color:MUTED,width:16,flexShrink:0}}>{i+1}</span>
                        {isCancion&&(
                          <div style={{width:28,height:28,borderRadius:6,background:darkMode?'rgba(255,255,255,0.06)':'#F2F1EE',flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {item.song?.caratula_url
                              ? <img src={item.song.caratula_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                              : <Music4 size={13} color={MUTED}/>}
                          </div>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          {isCancion ? (
                            <>
                              <div style={{fontSize:13,fontWeight:500,color:TXT}}>{item.song?.nombre||item.titulo||'—'}</div>
                              {item.song?.artista&&<div style={{fontSize:11,color:MUTED,marginTop:1}}>{item.song.artista}</div>}
                              {item.lead?.nombre&&(
                                <div style={{display:'flex',alignItems:'center',gap:3,marginTop:2}}>
                                  <Mic2 size={11} color={AMBER}/>
                                  <span style={{fontSize:11,color:AMBER,fontWeight:500}}>{item.lead.nombre}</span>
                                </div>
                              )}
                              {item.notas&&(
                                <div style={{display:'flex',alignItems:'flex-start',gap:4,marginTop:4,background:'rgba(240,169,59,0.12)',borderRadius:6,padding:'4px 7px'}}>
                                  <MessageSquare size={11} color={AMBER} style={{marginTop:1,flexShrink:0}}/>
                                  <span style={{fontSize:11,color:darkMode?AMBER:'#92400E',lineHeight:1.35}}>{item.notas}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>
                                <span style={{fontSize:13,color:TXT}}>{item.titulo||item.song?.nombre||'—'}</span>
                                {item.song?.artista&&<span style={{fontSize:11,color:MUTED}}> — {item.song.artista}</span>}
                              </div>
                              {item.lead?.nombre&&(
                                <div style={{display:'flex',alignItems:'center',gap:3,marginTop:2}}>
                                  <User size={10} color={MUTED}/>
                                  <span style={{fontSize:11,color:MUTED}}>{item.lead.nombre}</span>
                                </div>
                              )}
                            </>
                          )}
                          <AnimatePresence initial={false}>
                            {isExpanded&&(
                              <motion.div
                                initial={{height:0,opacity:0}}
                                animate={{height:'auto',opacity:1}}
                                exit={{height:0,opacity:0}}
                                transition={{type:'spring',damping:26,stiffness:300}}
                                style={{overflow:'hidden'}}>
                                <div style={{display:'flex',gap:12,marginTop:5,flexWrap:'wrap',paddingBottom:2}}>
                                  {links.map(({href,Icon,label})=>(
                                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                                      onClick={e=>e.stopPropagation()}
                                      style={{display:'flex',alignItems:'center',gap:3,color:MUTED,textDecoration:'none',whiteSpace:'nowrap'}}>
                                      <Icon size={13}/>
                                      <span style={{fontSize:10,whiteSpace:'nowrap'}}>{label}</span>
                                    </a>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                          {item.tono&&<span style={{fontSize:11,color:MUTED}}>Tono: {item.tono}</span>}
                          {expandable&&(
                            <motion.span animate={{rotate:isExpanded?180:0}} transition={{type:'spring',damping:26,stiffness:300}} style={{display:'inline-flex'}}>
                              <ChevronDown size={14} color={MUTED}/>
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:'20px 16px',textAlign:'center'}}>
            <Lock size={16} color={MUTED} style={{marginBottom:6}}/>
            <p style={{fontSize:12,fontWeight:500,color:MUTED,margin:0}}>Confirma tu asistencia para ver el {isEnsayo?'repertorio':'setlist'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
