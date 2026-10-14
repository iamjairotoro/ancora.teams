'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/lib/useDarkMode'
import { ChevronLeft, MapPin, Music4, User, FileText, Link2, Youtube, Lock, Mic2, ChevronDown, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { LABEL_TECNICA } from '@/lib/equipos'
import { C, mix } from '@/lib/portal/theme'
import PortalStatusFade from './PortalStatusFade'
import { extraerIdYoutube, urlAbrirEnYoutube } from '@/lib/youtube'
import { AccionesConvocatoria, HojaDeConvocatoria, useConvocatorias, AvisoCerrada, textoEstado } from './convocatorias'
import { esDeOtroEquipo, textoDeclinadaPersona } from '@/lib/convocatoriaEstado'

// Colores: solo tokens v5 (lib/portal/theme.ts).
const ACCENT=C.accent
const AMBER=C.pe


// songs.link_spotify es el enlace de YOUTUBE (nombre heredado). Si lo guardado no es de YouTube (p. ej. un enlace viejo de Spotify) no se muestra,
// y el enlace que se abre se arma con el id (nunca se usa el texto guardado). Spotify y Apple Music ya no aparecen en el portal.
function enlaceYoutube(url:unknown){
  const id=extraerIdYoutube(url)
  return id?{href:urlAbrirEnYoutube(id),Icon:Youtube,label:'YouTube'}:null
}

// token = token de invitación o null = identidad resuelta en el servidor (punto 48).
export default function ServicioDetalle({ token, svcId }: { token: string | null; svcId: string }){
  const router = useRouter()
  const isMe = token === null

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  // Tema del portal (cookie + /api/portal/preferencias); ya no localStorage['ancora-dark-mode'].
  useDarkMode(member?.id, { system: true, portal: { token } })
  const [myData, setMyData] = useState<any>(null)
  const [todas, setTodas] = useState<any[]>([])      // todas las tarjetas de la persona: sirve para nombrar el OTRO equipo en «Aceptar aquí en su lugar»
  // Punto 59: el servidor decide (libraryAccess). Sin acceso, las canciones del servicio se ven como lista de nombres
  // —sin enlaces, tono ni carátula—; las notas del bloque sí. El servidor ya no manda esos datos; esto es la pantalla.
  const [libraryAccess, setLibraryAccess] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [expandedIdx, setExpandedIdx] = useState<number|null>(null)

  const BG=C.bg, CARD=C.card, TXT=C.ink
  const MUTED=C.muted, BORDER=C.rule
  const NAV_BG=C.solid

  const loadData = useCallback(async()=>{
    const portalRes = isMe
      ? await fetch('/api/portal/me', { cache: 'no-store' })
      : await fetch(`/api/member-portal?token=${token}`)
    if(isMe && portalRes.status===401){ window.location.href='/portal'; return }
    const data = await portalRes.json()
    if(!portalRes.ok||data.error){ setLoading(false); return }
    setMember(data.member)
    const merged = [...(data.services||[]), ...(data.ensayos||[])]
    // Punto 52: un servicio puede traer una tarjeta por equipo; ?equipo=<id> elige cuál (sin él, la primera).
    const delServicio = merged.filter((s:any)=>s.service.id===svcId)
    const equipo = typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('equipo') : null
    const found = delServicio.find((s:any)=>equipo&&s.team?.id===equipo) ?? delServicio[0]
    setMyData(found||null)
    setTodas(merged)
    setLibraryAccess(data.libraryAccess===true)
    setLoading(false)
  },[token, isMe, svcId])

  useEffect(()=>{ if(svcId) loadData() },[svcId, loadData])
  // Punto 52: responder, «Aceptar aquí en su lugar» y «Quitar mi confirmación» (piezas reutilizables de ./convocatorias).
  const conv = useConvocatorias({ token, entradas: todas, recargar: loadData })

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
    if(!myData) return
    await conv.responder(myData, respuesta)
    setConfirmingDecline(false)
  }

  if(loading) return(
    <div className="portal-root" style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,border:`2px solid ${TXT}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  if(!myData) return(
    <div className="portal-root" style={{minHeight:'100vh',background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
      <div style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'14px 16px',position:'sticky',top:0}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',gap:8}}><ChevronLeft size={22}/><span style={{fontSize:14,color:TXT}}>Volver</span></button>
      </div>
      <div style={{padding:40,textAlign:'center'}}><p style={{fontSize:13,color:MUTED}}>No encontramos este servicio.</p></div>
    </div>
  )

  const {service:svc,team,posiciones,invitation,banda,setlist} = myData
  const isEnsayo = svc.tipo==='ensayo'
  const isAssigned = isEnsayo ? true : posiciones.length>0
  // Mientras no confirme su asistencia, no ve el equipo del día ni el setlist —
  // así no se filtra esa info a alguien que ni siquiera sabe si va a poder ir.
  // Si no existe invitación formal todavía (recién asignado, el admin aún no
  // envía la convocatoria), tampoco puede ver nada — ese era justo el hueco:
  // antes se trataba "sin invitación" como "ya puede ver todo".
  const canSeeDetails = !!invitation && invitation.status==='confirmado'
  // Agrupado por equipo real (viene de la API, resuelto por nombre contra
  // team_positions) — antes se agrupaba por 3 arrays fijos que no conocían
  // los equipos reales de la organización y hacían desaparecer a cualquiera
  // que no calzara con esos códigos viejos.
  const bandaGroups = Object.entries(
    (banda||[]).filter((b:any)=>b.member).reduce((acc:Record<string,any[]>, b:any) => {
      const key = b.teamName || 'Otros'
      ;(acc[key] ||= []).push(b)
      return acc
    }, {})
  ) as [string, any[]][]
  const fechaFmt = new Date(svc.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})

  return (
    <div className="portal-root" style={{minHeight:'100vh',background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',paddingBottom:'calc(40px + var(--safe-bottom))'}}>
      <PortalStatusFade/>
      <div style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'calc(14px + var(--safe-top)) calc(16px + var(--safe-right)) 14px calc(16px + var(--safe-left))',position:'sticky',top:0,zIndex:'var(--z-nav)'}}>
        <div style={{maxWidth:500,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.back()} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,display:'flex',alignItems:'center',padding:0}}>
            <ChevronLeft size={22}/>
          </button>
          <span style={{fontSize:15,fontWeight:500,color:TXT}}>{isEnsayo?'Ensayo':'Servicio'}{team?` · ${team.name}`:''}</span>
        </div>
      </div>

      <div style={{maxWidth:500,margin:'0 auto',padding:'14px calc(16px + var(--safe-right)) 14px calc(16px + var(--safe-left))'}}>

        {/* Hero */}
        <div style={{background:C.hero,borderRadius:16,padding:'18px 16px',marginBottom:16}}>
          {isEnsayo&&<span style={{fontSize:10,fontWeight:600,background:C.peBg,color:C.pe,borderRadius:20,padding:'3px 10px'}}>Ensayo</span>}
          <div style={{fontSize:22,fontWeight:400,color:C.onHero,letterSpacing:'-0.3px',margin:'10px 0 4px',lineHeight:1.2,textTransform:'capitalize' as const}}>{fechaFmt}</div>
          <div style={{fontSize:12,fontWeight:400,color:mix(C.onHero,62),marginBottom:16,display:'flex',alignItems:'center',gap:5}}>
            {svc.hora_inicio?`${svc.hora_inicio.slice(0,5)}${svc.hora_fin?` — ${svc.hora_fin.slice(0,5)}`:''} hrs`:''}
            {svc.lugar&&<><span>·</span><MapPin size={11}/> {svc.lugar}</>}
          </div>

          {isAssigned ? (
            <div style={{background:mix(C.onHero,10),borderRadius:12,padding:'12px 14px',marginBottom:12}}>
              <p style={{fontSize:9,fontWeight:600,color:mix(C.onHero,62),letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 6px'}}>Tu rol este día{team?` · ${team.name}`:''}</p>
              {posiciones.length>0?(
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {posiciones.map((p:string)=><span key={p} style={{fontSize:13,fontWeight:600,background:mix(C.onHero,15),color:C.onHero,padding:'4px 12px',borderRadius:20}}>{LABEL_TECNICA[p]||p}</span>)}
                </div>
              ):(
                <p style={{fontSize:14,fontWeight:500,color:C.onHero,margin:0}}>Convocado a este ensayo</p>
              )}
            </div>
          ):(
            <div style={{background:mix(C.onHero,6),borderRadius:12,padding:'12px 14px',marginBottom:12}}>
              <p style={{fontSize:12,color:mix(C.onHero,62),margin:0}}>Aún no has sido convocado a este servicio.</p>
            </div>
          )}

          {!invitation||!invitation.sent_at?(
              <div style={{background:mix(C.onHero,6),borderRadius:12,padding:'12px 14px'}}>
                <p style={{fontSize:12,color:mix(C.onHero,62),margin:0}}>Tu convocatoria aún no ha sido enviada — vuelve más tarde.</p>
              </div>
            ):myData.cerrada?(
              // Punto 52, commit 5: pasó el día del servicio (hora de Chile): se ve cómo quedó, sin botones.
              <div>
                <p style={{fontSize:13,fontWeight:500,color:C.onHero,margin:'0 0 10px'}}>{textoEstado(myData)}</p>
                <AvisoCerrada sobreHero/>
              </div>
            ):esDeOtroEquipo(invitation)?(
              <div>
                <p style={{fontSize:13,fontWeight:500,color:C.onHero,margin:'0 0 10px'}}>{textoDeclinadaPersona(myData.reemplazadaPor?.name)}</p>
                <AccionesConvocatoria entrada={myData} c={conv} sobreHero/>
              </div>
            ):invitation.status==='pendiente'?(
              confirmingDecline?(
                <div>
                  <p style={{fontSize:12,color:mix(C.onHero,62),marginBottom:8}}>¿Confirmas que no puedes asistir?</p>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>handleRSVP('no')} disabled={conv.ocupado} style={{flex:1,background:C.noBg,color:C.no,border:'none',borderRadius:8,padding:10,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>Sí, no puedo</button>
                    <button onClick={()=>setConfirmingDecline(false)} style={{flex:1,background:'none',color:mix(C.onHero,62),border:`1px solid ${mix(C.onHero,15)}`,borderRadius:8,padding:10,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
                  </div>
                </div>
              ):(
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>handleRSVP('si')} disabled={conv.ocupado} style={{flex:1,background:C.okBg,color:C.ok,border:'none',borderRadius:8,padding:11,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✓ Confirmo</button>
                  <button onClick={()=>setConfirmingDecline(true)} disabled={conv.ocupado} style={{flex:1,background:C.noBg,color:C.no,border:'none',borderRadius:8,padding:11,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>✗ No puedo</button>
                </div>
              )
            ):invitation.status==='confirmado'&&invitation.needs_reassignment_confirm?(
              <div style={{background:C.peBg,borderRadius:12,padding:'12px 14px'}}>
                <p style={{fontSize:12,color:C.pe,margin:0,fontWeight:500}}>Tu rol cambió — aún no confirmas. Espera tu nueva convocatoria.</p>
              </div>
            ):(
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,fontWeight:500,color:C.onHero}}>{invitation.status==='confirmado'?'✓ Confirmado':'✗ Declinado'}</span>
                  <button onClick={()=>invitation.status==='confirmado'?conv.pedirDeclinar(myData):handleRSVP('si')}
                    style={{fontSize:11,color:mix(C.onHero,62),background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    {invitation.status==='confirmado'?'Declinar':'Confirmar'}
                  </button>
                </div>
                {invitation.status==='confirmado'&&<div style={{marginTop:10}}><AccionesConvocatoria entrada={myData} c={conv} sobreHero soloConflicto/></div>}
              </div>
            )}
            {conv.errorRespuesta&&invitation?.status==='pendiente'&&<p role="alert" style={{fontSize:12,fontWeight:600,color:C.no,margin:'10px 0 0'}}>{conv.errorRespuesta}</p>}
        </div>

        {/* Banda del día */}
        {canSeeDetails ? (
          bandaGroups.length>0&&(
            <div style={{background:CARD,border:`0.5px solid ${BORDER}`,borderRadius:12,padding:14,marginBottom:14}}>
              {bandaGroups.map(([teamName, items], gi)=>(
                <div key={teamName} style={{marginBottom:gi<bandaGroups.length-1?14:0}}>
                  <p style={{fontSize:10,fontWeight:600,color:MUTED,letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 8px'}}>{teamName}</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {items.map((b:any)=>{
                      const isMe=member?.id&&b.member_id===member.id
                      return(
                        <div key={b.posicion+b.member_id} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:8,background:isMe?ACCENT:BG,border:isMe?'none':`0.5px solid ${BORDER}`}}>
                          <span style={{fontSize:8,fontWeight:700,color:isMe?mix(C.onAccent,70):MUTED,flexShrink:0,maxWidth:64,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{LABEL_TECNICA[b.posicion]||b.posicion}</span>
                          <span style={{fontSize:12,fontWeight:400,color:isMe?C.onAccent:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.member?.nombre}</span>
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
                  const links=!libraryAccess?[]:[
                    enlaceYoutube(item.song?.link_spotify),
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
                        {isCancion&&libraryAccess&&(
                          <div style={{width:28,height:28,borderRadius:6,background:C.sunk,flexShrink:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
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
                                <div style={{display:'flex',alignItems:'flex-start',gap:4,marginTop:4,background:C.peBg,borderRadius:6,padding:'4px 7px'}}>
                                  <MessageSquare size={11} color={AMBER} style={{marginTop:1,flexShrink:0}}/>
                                  <span style={{fontSize:11,color:C.pe,lineHeight:1.35}}>{item.notas}</span>
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
                          {libraryAccess&&item.tono&&<span style={{fontSize:11,color:MUTED}}>Tono: {item.tono}</span>}
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
      <HojaDeConvocatoria c={conv}/>
    </div>
  )
}
