'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Service, Member, Song, BandaAssignment, Invitation, ServiceBlock } from '@/lib/types'
import TeamPanel from '@/components/TeamPanel'
import SongsPanel from '@/components/SongsPanel'
import AdminServiceView from '@/components/AdminServiceView'
import EnsayoPanel from '@/components/EnsayoPanel'
import ChatModerationPanel from '@/components/ChatModerationPanel'
import AvailabilityPanel from '@/components/AvailabilityPanel'
import TexBg from '@/components/TexBg'
import { useDarkMode } from '@/lib/useDarkMode'
import { POSICIONES_BANDA, POSICIONES_VX, POSICIONES_TECNICA, LABEL_TECNICA } from '@/lib/equipos'

const INSTR_POR_POSICION: Record<string,string[]> = {
  AG1:['Guitarra Acustica'],AG2:['Guitarra Acustica'],EG:['Guitarra Electrica'],
  KEYS:['Piano'],BASS:['Bajo'],DRUMS:['Bateria'],
  MD:['MD (Direccion Musical en vivo)'],
  SONIDO1:['Sonido'],SONIDO2:['Sonido'],
  MONTAJE1:['Montaje'],MONTAJE2:['Montaje'],MONTAJE3:['Montaje'],MONTAJE4:['Montaje'],
  MONTAJE5:['Montaje'],MONTAJE6:['Montaje'],MONTAJE7:['Montaje'],MONTAJE8:['Montaje'],
  VX1:['Voz'],VX2:['Voz'],VX3:['Voz'],VX4:['Voz'],
}

type Tab = 'setlist'|'equipo'|'canciones'|'ensayo'|'disponibilidad'|'chats'|'ajustes'

export default function AdminPage() {
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [authed, setAuthed]   = useState(false)
  const [tab, setTab]         = useState<Tab>('setlist')
  const [portalToken, setPortalToken] = useState<string|null>(null)
  const [adminGroupOpen, setAdminGroupOpen] = useState(false)
  const adminGroupRef = useRef<HTMLDivElement>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false)

  useEffect(() => {
    if (!adminGroupOpen) return
    function onClickOutside(e: MouseEvent) {
      if (adminGroupRef.current && !adminGroupRef.current.contains(e.target as Node)) {
        setAdminGroupOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [adminGroupOpen])

  const [services, setServices]             = useState<Service[]>([])
  const [members, setMembers]               = useState<Member[]>([])
  const [songs, setSongs]                   = useState<Song[]>([])
  const [selectedService, setSelectedService] = useState<Service|null>(null)
  const [blocks, setBlocks]                 = useState<ServiceBlock[]>([])
  const [bandaItems, setBandaItems]         = useState<BandaAssignment[]>([])
  const [dateBlocks, setDateBlocks]         = useState<string[]>([]) // member_ids bloqueados para el servicio seleccionado
  const [invitations, setInvitations]       = useState<Invitation[]>([])
  const [sending, setSending]               = useState(false)
  const [msg, setMsg]                       = useState('')

  useEffect(()=>{
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      const { data } = await supabase.from('admin_emails').select('email').eq('email', session.user.email!).single()
      if (data) {
        setAuthed(true)
        const email = session.user.email!
        const { data: member } = await supabase.from('members').select('id').eq('email', email).single()
        if (member) {
          const { data: inv } = await supabase.from('invitations').select('token').eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).single()
          if (inv) setPortalToken(inv.token)
        }
      } else window.location.href = '/login'
    })
  },[])

  const loadServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('*').order('fecha',{ascending:true})
    setServices(data||[])
    const soloServicios = (data||[]).filter((s:any)=>s.tipo!=='ensayo')
    if(!selectedService && soloServicios.length) {
      const now = new Date()
      const next = soloServicios.find((s:any) => new Date(s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00') > now)
      setSelectedService(next || soloServicios[0])
    }
  },[selectedService])

  const loadMembers = useCallback(async()=>{ const{data}=await supabase.from('members').select('*').order('nombre'); setMembers(data||[]) },[])
  const loadSongs   = useCallback(async()=>{ const{data}=await supabase.from('songs').select('*').order('nombre'); setSongs(data||[]) },[])

  const loadService = useCallback(async(svc: Service)=>{
    const [bl, ba, inv] = await Promise.all([
      supabase.from('service_blocks').select('*, song:songs(*), lead:members(nombre)').eq('service_id',svc.id).order('orden'),
      supabase.from('banda_assignments').select('*,member:members(*)').eq('service_id',svc.id),
      supabase.from('invitations').select('*,member:members(*)').eq('service_id',svc.id),
    ])
    setBlocks(bl.data||[])
    setBandaItems(ba.data||[])
    setInvitations(inv.data||[])
  },[])

  useEffect(()=>{ if(authed){ loadServices(); loadMembers(); loadSongs() }},[authed])
  useEffect(()=>{
    if(selectedService) {
      loadService(selectedService)
      // Cargar bloqueos para este servicio
      supabase.from('date_blocks').select('member_id').eq('service_id', selectedService.id)
        .then(({data})=>setDateBlocks((data||[]).map((b:any)=>b.member_id)))
    }
  },[selectedService])

  async function createService(fecha: string, horaInicio?: string, horaFin?: string) {
    const d = new Date(fecha+'T12:00:00')
    const dias=['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const titulo=`Servicio Ancora — ${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
    const{data}=await supabase.from('services').insert({
      fecha, titulo,
      hora_inicio: horaInicio||'10:00',
      hora_fin: horaFin||'14:00',
    }).select().single()
    if(data){ await loadServices(); setSelectedService(data) }
  }

  async function deleteService(id: string) {
    if(!confirm('¿Eliminar este servicio?')) return
    await fetch('/api/delete-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id})})
    setSelectedService(null); await loadServices()
  }

  async function duplicateService(id: string, newFecha: string) {
    const res=await fetch('/api/duplicate-service',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id,newFecha})})
    const data=await res.json(); await loadServices()
    const{data:newSvc}=await supabase.from('services').select('*').eq('id',data.serviceId).single()
    if(newSvc) setSelectedService(newSvc)
  }

  async function assignBanda(posicion: string, memberId: string) {
    if(!selectedService) return
    // Actualización optimista: el nombre aparece al instante en el <select>,
    // sin esperar la recarga completa del servicio (que antes hacía 3
    // consultas pesadas — incluyendo un viaje extra a /api/service-blocks —
    // y recién ahí mostraba el cambio. Ahora se ve al toque, y la recarga
    // real sigue corriendo atrás para mantener todo sincronizado.
    setBandaItems(prev => {
      const member = memberId ? members.find(m=>m.id===memberId) : undefined
      const existing = prev.find(b=>b.posicion===posicion)
      const updated = { ...(existing||{ id:`temp-${posicion}`, service_id:selectedService.id, posicion }), member_id: memberId||undefined, member }
      return [...prev.filter(b=>b.posicion!==posicion), updated as any]
    })
    await supabase.from('banda_assignments').upsert(
      {service_id:selectedService.id,posicion,member_id:memberId||null},
      {onConflict:'service_id,posicion'}
    )
    loadService(selectedService)
  }

  async function sendInvites() {
    if(!selectedService) return
    setSending(true); setMsg('')
    try {
      const res=await fetch('/api/send-invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:selectedService.id})})
      const data=await res.json(); setMsg(data.message||'Enviadas ✓'); loadService(selectedService)
    } catch { setMsg('Error al enviar.') }
    finally { setSending(false) }
  }

  async function reinvitar(memberId: string) {
    if(!selectedService) return
    setMsg('')
    try {
      const res=await fetch('/api/reassignment-notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId,serviceId:selectedService.id})})
      const data=await res.json(); setMsg(data.message||data.error||'Listo'); loadService(selectedService)
    } catch { setMsg('Error al reinvitar.') }
  }

  function membersFor(posicion: string) {
    const allowed=INSTR_POR_POSICION[posicion]||[]
    return members.filter(m=>m.instrumentos.some(i=>allowed.includes(i)))
  }
  function getBanda(pos: string){ return bandaItems.find(b=>b.posicion===pos) }

  if(!authed) return (
    <TexBg className="min-h-screen flex items-center justify-center">
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'rgba(245,240,230,0.5)',fontSize:13,fontWeight:300}}>Verificando acceso...</p>
      </div>
    </TexBg>
  )

  const TOP_TABS: {t:Tab,label:string}[] = [
    {t:'setlist',label:'Servicio'},
    {t:'ensayo',label:'Ensayo'},
    {t:'canciones',label:'Canciones'},
    {t:'disponibilidad',label:'Calendario'},
  ]
  const ADMIN_TABS: {t:Tab,label:string}[] = [
    {t:'chats',label:'Chats'},
    {t:'equipo',label:'Team'},
  ]
  const isAdminTabActive = ADMIN_TABS.some(x=>x.t===tab)
  const pillStyle = (active:boolean) => ({fontSize:11,padding:'5px 12px',borderRadius:20,fontWeight:active?600:400,
    background:active?'rgba(245,240,230,0.18)':'transparent',color:active?'#F5F0E6':'rgba(245,240,230,0.8)',
    border:active?'0.5px solid rgba(245,240,230,0.3)':'0.5px solid transparent',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' as const})

  return (
    <div className={darkMode?'dark':''} style={{minHeight:'100vh',background:'var(--page-bg)',fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>

      {/* ── NAVBAR ── */}
      <div className="z-30 shadow-lg" style={{
        position:'sticky', top:0,
        background:'#1A1A1A',
      }}>
        <header style={{height:56,display:'flex',alignItems:'center',padding:'0 16px',justifyContent:'space-between',gap:12}}>
          {/* Logo */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0}}>
            <img src="/logo-icon-cream.png" alt="Áncora" style={{height:30,width:'auto',objectFit:'contain'}}/>
          </div>

          {/* Desktop nav — fila horizontal, Admin con click ── */}
          <div className="hidden md:flex" style={{alignItems:'center',gap:2,flex:1,flexWrap:'wrap'}}>
            {TOP_TABS.map(({t,label})=>(
              <button key={t} onClick={()=>setTab(t)} style={pillStyle(tab===t)}>{label}</button>
            ))}
            <div ref={adminGroupRef} style={{position:'relative'}}>
              <button onClick={()=>setAdminGroupOpen(v=>!v)} style={pillStyle(isAdminTabActive||adminGroupOpen)}>
                Admin <span style={{fontSize:8,marginLeft:2}}>▾</span>
              </button>
              {adminGroupOpen&&(
                <div style={{position:'absolute',top:'100%',left:0,marginTop:6,minWidth:130,background:'#1A1A1A',border:'0.5px solid rgba(245,240,230,0.15)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.5)',padding:'5px 0',zIndex:99}}>
                  {ADMIN_TABS.map(({t,label})=>(
                    <button key={t} onClick={()=>{setTab(t);setAdminGroupOpen(false)}}
                      style={{width:'100%',textAlign:'left',padding:'8px 14px',fontSize:12,fontWeight:tab===t?600:400,
                        background:tab===t?'rgba(245,240,230,0.1)':'none',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.8)',
                        border:'none',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop acciones */}
          <div className="hidden md:flex" style={{alignItems:'center',gap:8,flexShrink:0}}>
            <button onClick={toggleDarkMode} title={darkMode?'Modo claro':'Modo oscuro'}
              style={{fontSize:13,background:'rgba(245,240,230,0.1)',border:'0.5px solid rgba(245,240,230,0.22)',color:'#F5F0E6',width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              {darkMode?'☀️':'🌙'}
            </button>
            {portalToken && (
              <a href={`/portal/${portalToken}`} target="_blank"
                style={{fontSize:9,background:'rgba(245,240,230,0.1)',border:'0.5px solid rgba(245,240,230,0.22)',color:'#F5F0E6',padding:'3px 9px',borderRadius:20,textDecoration:'none',fontWeight:500,whiteSpace:'nowrap'}}>
                👤 Portal
              </a>
            )}
            <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
              style={{fontSize:10,color:'rgba(245,240,230,0.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              Salir
            </button>
          </div>

          {/* Mobile: tab activo + hamburguesa */}
          <div className="flex md:hidden" style={{alignItems:'center',gap:10,flex:1,justifyContent:'flex-end'}}>
            <span style={{fontSize:11,fontWeight:600,color:'rgba(245,240,230,0.8)',letterSpacing:0.3}}>
              {[...TOP_TABS,...ADMIN_TABS].find(x=>x.t===tab)?.label}
            </span>
            <button onClick={()=>setMobileMenuOpen(v=>!v)}
              style={{display:'flex',flexDirection:'column',gap:5,background:'none',border:'none',cursor:'pointer',padding:4}}>
              <span style={{width:20,height:2,background:'rgba(245,240,230,0.85)',borderRadius:2,display:'block'}}/>
              <span style={{width:20,height:2,background:'rgba(245,240,230,0.85)',borderRadius:2,display:'block'}}/>
              <span style={{width:20,height:2,background:'rgba(245,240,230,0.85)',borderRadius:2,display:'block'}}/>
            </button>
          </div>
        </header>
      </div>

      {/* Dropdown mobile */}
      {mobileMenuOpen&&(
        <div className="md:hidden" style={{position:'fixed',top:56,right:0,zIndex:100,width:230}}>
          <div onClick={()=>setMobileMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:98,background:'transparent'}}/>
          <div style={{position:'relative',zIndex:99,background:'#1A1A1A',padding:'6px 0',boxShadow:'0 8px 24px rgba(0,0,0,0.5)',borderRadius:'0 0 0 12px',maxHeight:'calc(100vh - 56px)',overflowY:'auto'}}>
            {TOP_TABS.map(({t,label})=>(
              <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                style={{width:'100%',textAlign:'left',padding:'11px 18px',fontSize:13,fontWeight:tab===t?600:400,background:tab===t?'rgba(245,240,230,0.1)':'none',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.8)',border:'none',cursor:'pointer',fontFamily:'inherit',borderLeft:tab===t?'3px solid #C9A14A':'3px solid transparent'}}>
                {label}
              </button>
            ))}

            <div style={{borderTop:'0.5px solid rgba(245,240,230,0.1)',margin:'5px 0'}}/>

            <button onClick={()=>setMobileAdminOpen(v=>!v)}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',padding:'11px 18px',fontSize:13,fontWeight:isAdminTabActive?600:400,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',color:isAdminTabActive?'#F5F0E6':'rgba(245,240,230,0.8)',borderLeft:isAdminTabActive?'3px solid #C9A14A':'3px solid transparent'}}>
              <span>Admin</span>
              <span style={{fontSize:10,transition:'transform 0.15s',transform:(mobileAdminOpen||isAdminTabActive)?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
            </button>
            {(mobileAdminOpen||isAdminTabActive)&&ADMIN_TABS.map(({t,label})=>(
              <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                style={{width:'100%',textAlign:'left',padding:'9px 18px 9px 32px',fontSize:12,fontWeight:tab===t?600:400,background:tab===t?'rgba(245,240,230,0.1)':'none',color:tab===t?'#F5F0E6':'rgba(245,240,230,0.7)',border:'none',cursor:'pointer',fontFamily:'inherit',borderLeft:tab===t?'3px solid #C9A14A':'3px solid transparent'}}>
                {label}
              </button>
            ))}

            <div style={{borderTop:'0.5px solid rgba(245,240,230,0.1)',margin:'5px 0'}}/>
            <button onClick={toggleDarkMode}
              style={{width:'100%',textAlign:'left',padding:'11px 18px',fontSize:13,color:'rgba(245,240,230,0.8)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              {darkMode?'☀️ Modo claro':'🌙 Modo oscuro'}
            </button>
            {portalToken && (
              <a href={`/portal/${portalToken}`} target="_blank" onClick={()=>setMobileMenuOpen(false)}
                style={{display:'block',padding:'11px 18px',fontSize:13,color:'rgba(245,240,230,0.8)',textDecoration:'none'}}>
                👤 Mi portal
              </a>
            )}
            <button onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login' }}
              style={{width:'100%',textAlign:'left',padding:'11px 18px',fontSize:13,color:'rgba(245,240,230,0.4)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              Salir
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'16px',paddingBottom:32}}>
        {tab==='setlist' && (
          <AdminServiceView
            services={services.filter(s=>(s as any).tipo!=='ensayo')} selectedService={selectedService}
            setSelectedService={setSelectedService} createService={createService}
            deleteService={deleteService} duplicateService={duplicateService}
            members={members} songs={songs} blocks={blocks} setBlocks={setBlocks}
            bandaItems={bandaItems} invitations={invitations}
            membersFor={membersFor} getBanda={getBanda}
            assignBanda={assignBanda}
            sendInvites={sendInvites} sending={sending} msg={msg}
            reinvitar={reinvitar}
            onBlocksChange={()=>selectedService&&loadService(selectedService)}
            POSICIONES_BANDA={POSICIONES_BANDA} POSICIONES_VX={POSICIONES_VX}
            POSICIONES_TECNICA={POSICIONES_TECNICA} LABEL_TECNICA={LABEL_TECNICA}
            dateBlocks={dateBlocks}
            darkMode={darkMode}
          />
        )}
        {tab==='equipo'       && <TeamPanel members={members} onRefresh={loadMembers} />}
        {tab==='canciones'        && <SongsPanel songs={songs} onRefresh={loadSongs} />}
        {tab==='ensayo'           && <EnsayoPanel members={members} songs={songs} darkMode={darkMode} />}
        {tab==='disponibilidad'   && <AvailabilityPanel services={services} darkMode={darkMode} />}
        {tab==='chats'            && <ChatModerationPanel darkMode={darkMode} />}
      </div>
    </div>
  )
}
