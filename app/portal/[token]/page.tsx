'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AvatarUpload from '@/components/AvatarUpload'
import DisponibilidadCalendar from '@/components/DisponibilidadCalendar'
import { Home, Music, ClipboardList, MessageCircle, User, Users, CalendarDays, Mic2, Heart, CalendarOff, ChevronDown, Bell, Moon, Sun, Guitar, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { LABEL_TECNICA } from '@/lib/equipos'

// Types
interface Song { id:string;nombre:string;artista:string;tono_original?:string;bpm?:number;compas?:string;link_spotify?:string;link_letras?:string;link_recursos?:string;duracion_min?:number;notas?:string }
interface SetlistItem { orden:number;tono?:string;titulo?:string;tipo?:string;duracion_min?:number;song?:Song;lead?:{nombre:string} }
interface BandaItem { posicion:string;member_id?:string;member?:{nombre:string;apellido?:string} }
interface ServiceData { service:{id:string;fecha:string;titulo:string;hora_inicio?:string;hora_fin?:string;tipo?:string;lugar?:string};posiciones:string[];invitation:{status:string;token:string;sent_at?:string|null;needs_reassignment_confirm?:boolean}|null;setlist:SetlistItem[];banda:BandaItem[];nominaSent?:boolean }
interface Member { id:string;nombre:string;apellido:string;email:string;telefono?:string;avatar_url?:string;fecha_nacimiento?:string;instrumentos?:string[];instalado_pwa_at?:string }

// Colors — light theme defaults
const LIGHT_BG='#F2F1EE', LIGHT_CARD='#FFFFFF', LIGHT_TXT='#1A1A1A', LIGHT_MUTED='#AAA', LIGHT_BORDER='rgba(0,0,0,0.07)'
// Colors — dark theme (matches the palette already used in the Perfil tab)
const DARK_BG='#111118', DARK_CARD='rgba(255,255,255,0.06)', DARK_TXT='#F5F0E6', DARK_MUTED='rgba(255,255,255,0.35)', DARK_BORDER='rgba(255,255,255,0.08)'
// Fixed accent used for solid badges/buttons (dark pill + cream text) — stays the same in both themes
const ACCENT='#1A1A1A'

type Tab = 'home'|'canciones'|'servicios'|'chats'|'perfil'

const INSTRUMENTOS = ['Guitarra Acustica','Guitarra Electrica','Piano','Bajo','Bateria','MD (Direccion Musical en vivo)','Voz','Sonido','Montaje']
const INSTR_LABEL: Record<string,string> = {'Guitarra Acustica':'AG','Guitarra Electrica':'EG','Piano':'Piano','Bajo':'Bass','Bateria':'Drums','MD (Direccion Musical en vivo)':'MD','Voz':'Voz','Sonido':'Sonido','Montaje':'Montaje'}
const INSTR_ICON: Record<string,string> = {'Guitarra Acustica':'🎸','Guitarra Electrica':'🎸','Piano':'🎹','Bajo':'🎸','Bateria':'🥁','MD (Direccion Musical en vivo)':'🎵','Voz':'🎤','Sonido':'🔊','Montaje':'🔧'}

function toMMSS(min:number){const m=Math.floor(min),s=Math.round((min-m)*60);return`${m}:${s.toString().padStart(2,'0')}`}
function daysUntil(fecha:string){return Math.ceil((new Date(fecha+'T12:00:00').getTime()-Date.now())/(1000*60*60*24))}
function fmtLong(fecha:string){
  const d=new Date(fecha+'T12:00:00')
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return{dia:dias[d.getDay()],fecha:`${d.getDate()} de ${meses[d.getMonth()]}`,d}
}

function posLabel(p:string){ return LABEL_TECNICA[p] || p }


export default function PortalPage() {
  const { token } = useParams<{ token:string }>()
  const router = useRouter()
  const isMemberPortal = token?.startsWith('member_') ?? false

  const [tab, setTab] = useState<Tab>(()=>{
    if(typeof window!=='undefined'){
      const saved = sessionStorage.getItem('ancora-last-tab') as Tab|null
      if(saved) return saved
    }
    return 'home'
  })
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<Member|null>(null)
  const [services, setServices] = useState<ServiceData[]>([])
  const [allServices, setAllServices] = useState<any[]>([])
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [showFavoritos, setShowFavoritos] = useState(false)
  const [songSearch, setSongSearch] = useState('')
  const [expandedSong, setExpandedSong] = useState<string|null>(null)
    const [profileData, setProfileData] = useState({nombre:'',apellido:'',telefono:'',fecha_nacimiento:''})
  const [editProfile, setEditProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState<string|null>(null)
  const [obsComment, setObsComment] = useState('')
  const [selectedInstr, setSelectedInstr] = useState<string[]>([])
  const [showInstrumentos, setShowInstrumentos] = useState(false)
  const [showDisponibilidad, setShowDisponibilidad] = useState(false)
  const [dateBlocks, setDateBlocks] = useState<Record<string,{reason:string;start:string;end:string}>>({})
  // Week calendar state

  // Chat
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [chatOpen, setChatOpen] = useState<string|null>(null)
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set())
  const [chatPreviews, setChatPreviews] = useState<Record<string,{content:string;memberName:string;memberId:string;created_at:string}>>({})
  const [dmPartnerIds, setDmPartnerIds] = useState<Set<string>>(new Set())
  const [teamRoster, setTeamRoster] = useState<{id:string;nombre:string;apellido:string;avatar_url:string|null}[]>([])
  const [showDmPicker, setShowDmPicker] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  // Dark mode
  const [darkMode, setDarkMode] = useState(false)

  useEffect(()=>{
    const saved = localStorage.getItem('ancora-dark-mode')
    if(saved==='true') setDarkMode(true)
  },[])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('ancora-dark-mode', String(next))
  }

  // ── Notificaciones push ──
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)
  // Esta env var se "hornea" en el bundle del cliente al momento del build en Vercel.
  // Si quedó vacía, significa que faltaba configurar VAPID o que no se ha
  // vuelto a desplegar la app desde que se agregó — sin esto no hay push posible.
  const vapidKeyConfigured = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(()=>{
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone===true
    setIsIOS(ios)
    setIsStandalone(standalone)
    if(!('serviceWorker' in navigator) || !('PushManager' in window)){ setPushSupported(false); return }
    navigator.serviceWorker.register('/sw.js').then(async reg=>{
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(!!sub)
    }).catch(()=>setPushSupported(false))
  },[])

  // Si detectamos que la app corre "instalada" (agregada a la pantalla de
  // inicio) y todavía no lo teníamos registrado para este músico, lo guardamos
  // — así en el admin se puede ver cuánta gente la tiene instalada así.
  useEffect(()=>{
    if(!member?.id || !isStandalone || member.instalado_pwa_at) return
    supabase.from('members').update({ instalado_pwa_at: new Date().toISOString() }).eq('id', member.id)
      .then(({error})=>{ if(error) console.error('[pwa] No se pudo registrar instalado_pwa_at:', error.message) })
  },[member?.id, isStandalone])

  function urlBase64ToUint8Array(base64String:string){
    const padding='='.repeat((4-base64String.length%4)%4)
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/')
    const raw=atob(base64)
    return Uint8Array.from(Array.from(raw).map(c=>c.charCodeAt(0)))
  }

  async function togglePush(){
    if(!member?.id) return
    if(!vapidKeyConfigured){
      alert('Las notificaciones push todavía no están configuradas en el servidor. Avísale al administrador.')
      return
    }
    setPushLoading(true)
    try{
      const reg = await navigator.serviceWorker.ready
      if(pushEnabled){
        const sub = await reg.pushManager.getSubscription()
        if(sub){
          await fetch('/api/push-subscribe',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({memberId:member.id,endpoint:sub.endpoint})})
          await sub.unsubscribe()
        }
        setPushEnabled(false)
      } else {
        const permission = await Notification.requestPermission()
        if(permission!=='granted'){ setPushLoading(false); return }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||''),
        })
        await fetch('/api/push-subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({memberId:member.id,subscription:sub.toJSON()})})
        setPushEnabled(true)
      }
    } catch(e){
      alert('No se pudo activar las notificaciones. Intenta de nuevo.')
    }
    setPushLoading(false)
  }

  // Theme — deriva los colores activos según darkMode.
  // Estas variables "tapan" (shadow) las constantes de módulo del mismo nombre,
  // así que todo el código de abajo que ya usa BG/CARD/TXT/MUTED/BORDER
  // se adapta automáticamente al modo oscuro sin tener que tocar cada línea.
  const BG = darkMode?DARK_BG:LIGHT_BG
  const CARD = darkMode?DARK_CARD:LIGHT_CARD
  const TXT = darkMode?DARK_TXT:LIGHT_TXT
  const MUTED = darkMode?DARK_MUTED:LIGHT_MUTED
  const BORDER = darkMode?DARK_BORDER:LIGHT_BORDER
  // Fondo sólido/opaco para barras fijas (header y menú inferior) — CARD es translúcido
  // y sirve bien para tarjetas de contenido, pero una barra fija necesita ser opaca
  // para que el contenido que se desplaza detrás no se "filtre" visualmente.
  const NAV_BG = darkMode?'#15151C':LIGHT_CARD

  const loadData = useCallback(async()=>{
    const [portalRes, songsRes, svcsRes] = await Promise.all([
      isMemberPortal ? fetch(`/api/portal-by-member?memberId=${token.replace('member_','')}`) : fetch(`/api/member-portal?token=${token}`),
      fetch('/api/all-songs'),
      fetch('/api/all-services'),
    ])
    const data = await portalRes.json()
    if(!portalRes.ok||data.error){setLoading(false);return}
    setMember(data.member)
    const merged = [...(data.services||[]), ...(data.ensayos||[])].sort((a:any,b:any)=>a.service.fecha.localeCompare(b.service.fecha))
    setServices(merged)
    setSelectedInstr(data.member?.instrumentos||[])
    setProfileData({nombre:data.member.nombre,apellido:data.member.apellido||'',telefono:data.member.telefono||'',fecha_nacimiento:data.member.fecha_nacimiento||''})
    const songsData=songsRes.ok?await songsRes.json():{songs:[]}
    setAllSongs(songsData.songs||[])
    const { data: favData } = await supabase.from('song_favorites').select('song_id').eq('member_id', data.member.id)
    setFavoriteIds(new Set((favData||[]).map((f:any)=>f.song_id)))
    const svcsData=svcsRes.ok?await svcsRes.json():{services:[]}
    const now=new Date()
    setAllServices((svcsData.services||[]).filter((s:any)=>new Date(s.hora_fin?s.fecha+'T'+s.hora_fin:s.fecha+'T14:00:00')>now))
    await supabase.from('members').update({last_seen:new Date().toISOString()}).eq('id',data.member.id)
    // Load date blocks
    const blocksRes=await fetch(`/api/date-blocks?memberId=${data.member.id}`)
    const blocksData=blocksRes.ok?await blocksRes.json():{blocks:[]}
    const blockMap:Record<string,any>={}
    ;(blocksData.blocks||[]).forEach((b:any)=>{const key=b.blocked_date||b.service?.fecha; if(key) blockMap[key]={reason:b.reason||'',start:b.start_date||key,end:b.end_date||key}})
    setDateBlocks(blockMap)
    setLoading(false)
  },[token,isMemberPortal])

  useEffect(()=>{loadData()},[loadData])

  // ── Mensajes no leídos (burbuja roja en "Chats") ──
  function dmChatId(a:string,b:string){ return 'dm_'+[a,b].sort().join('_') }
  function dmPartnerFromChatId(chatId:string, myId:string): string|null {
    if(!chatId.startsWith('dm_')) return null
    const [a,b] = chatId.slice(3).split('_')
    return a===myId ? b : a
  }
  function myChatIds(): string[] {
    const svcIds = services.filter(s=>s.posiciones.length>0||s.service.tipo==='ensayo').map(s=>s.service.id)
    return ['team', ...svcIds, ...Array.from(dmPartnerIds).map(pid=>dmChatId(member?.id||'',pid))]
  }
  function getLastReadMap(): Record<string,string> {
    if(typeof window==='undefined') return {}
    try { return JSON.parse(localStorage.getItem('ancora-chat-lastread')||'{}') } catch { return {} }
  }
  function markChatRead(chatId:string){
    const map = getLastReadMap()
    map[chatId] = new Date().toISOString()
    localStorage.setItem('ancora-chat-lastread', JSON.stringify(map))
    setUnreadChatIds(prev=>{ if(!prev.has(chatId)) return prev; const next=new Set(prev); next.delete(chatId); return next })
  }

  // Roster del equipo (para el selector de "Nuevo mensaje directo") + DMs existentes
  useEffect(()=>{
    if(!member?.id) return
    const myId = member.id
    supabase.from('members').select('id,nombre,apellido,avatar_url').order('nombre')
      .then(({data})=>setTeamRoster((data||[]).filter(m=>m.id!==myId) as any))
    supabase.from('messages').select('member_id,recipient_member_id')
      .or(`member_id.eq.${myId},recipient_member_id.eq.${myId}`)
      .not('recipient_member_id','is',null)
      .then(({data})=>{
        const partners = new Set<string>()
        for(const m of (data||[]) as any[]){
          const other = m.member_id===myId ? m.recipient_member_id : m.member_id
          if(other) partners.add(other)
        }
        setDmPartnerIds(partners)
      })
  },[member?.id])

  // Calcula no-leídos + preview del último mensaje de cada chat
  useEffect(()=>{
    if(!member?.id) return
    const myId = member.id
    let cancelled = false
    async function checkUnread(){
      const { data } = await supabase
        .from('messages')
        .select('service_id, recipient_member_id, member_id, content, created_at, member:members!member_id(nombre)')
        .order('created_at', { ascending: false })
        .limit(300)
      if(cancelled || !data) return
      const chatIds = myChatIds()
      const lastRead = getLastReadMap()
      const latestByChat: Record<string,{member_id:string;created_at:string;content:string;memberName:string}> = {}
      for(const m of data as any[]){
        const cid = m.recipient_member_id ? dmChatId(m.member_id, m.recipient_member_id) : (m.service_id || 'team')
        if(!chatIds.includes(cid)) continue
        if(!latestByChat[cid]) latestByChat[cid] = { member_id:m.member_id, created_at:m.created_at, content:m.content, memberName:m.member?.nombre||'' }
      }
      const unread = new Set<string>()
      const previews: Record<string,{content:string;memberName:string;memberId:string;created_at:string}> = {}
      for(const cid of chatIds){
        const latest = latestByChat[cid]
        if(!latest) continue
        previews[cid] = { content:latest.content, memberName:latest.memberName, memberId:latest.member_id, created_at:latest.created_at }
        if(latest.member_id===myId) continue
        if(!lastRead[cid] || latest.created_at > lastRead[cid]) unread.add(cid)
      }
      setUnreadChatIds(unread)
      setChatPreviews(previews)
    }
    checkUnread()
    return ()=>{ cancelled=true }
  },[member?.id, services, dmPartnerIds])

  // Suscripción global en tiempo real — detecta mensajes nuevos aunque no estés en la pestaña de Chats
  useEffect(()=>{
    if(!member?.id) return
    const myId = member.id
    const channel = supabase.channel(`chat-badge-${myId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async (payload)=>{
        const msg:any = payload.new
        const isMyDm = msg.recipient_member_id && (msg.member_id===myId || msg.recipient_member_id===myId)
        if(msg.recipient_member_id && !isMyDm) return // DM ajeno, no me incumbe
        const cid = msg.recipient_member_id ? dmChatId(msg.member_id, msg.recipient_member_id) : (msg.service_id || 'team')
        const otherId = isMyDm ? (msg.member_id===myId?msg.recipient_member_id:msg.member_id) : null
        if(otherId && !dmPartnerIds.has(otherId)) setDmPartnerIds(prev=>new Set(prev).add(otherId))
        if(!myChatIds().includes(cid) && !otherId) return
        // Actualiza el preview de la lista de chats en vivo
        let memberName = ''
        if(msg.member_id===myId) memberName = 'Tú'
        else {
          const { data: mdata } = await supabase.from('members').select('nombre').eq('id', msg.member_id).single()
          memberName = mdata?.nombre || ''
        }
        setChatPreviews(prev=>({...prev, [cid]: { content: msg.content, memberName, memberId: msg.member_id, created_at: msg.created_at }}))
        // Si estás justo viendo este chat, agrega el mensaje a la conversación en vivo
        if(tab==='chats' && chatOpen===cid){
          setChatMessages(prev=>prev.some(m=>m.id===msg.id)?prev:[...prev,msg])
          if(msg.member_id!==myId) markChatRead(cid)
          return
        }
        if(msg.member_id===myId) return
        setUnreadChatIds(prev=>new Set(prev).add(cid))
      }).subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[member?.id, services, tab, chatOpen])

  // Cuando la app (instalada o en pestaña) vuelve a estar visible tras estar
  // en segundo plano, recargamos los datos — evita tener que forzar cierre/apertura.
  useEffect(()=>{
    function onVisible(){
      if(document.visibilityState==='visible') loadData()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return ()=>{
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  },[loadData])

  useEffect(()=>{
    sessionStorage.setItem('ancora-last-tab', tab)
  },[tab])

  // Chat: al abrir uno, carga su historial y lo marca leído. Además, revisa
  // cada 3 segundos si hay mensajes nuevos — más lento que tiempo real, pero
  // 100% confiable (el canal de Realtime no estaba entregando los eventos
  // de forma consistente en este proyecto). El mismo intervalo avisa al
  // servidor qué chat estás mirando, para que no te llegue push de algo
  // que ya estás viendo en vivo.
  useEffect(()=>{
    if(tab!=='chats') return
    setChatMessages([])
    loadChatMessages()
    if(!chatOpen) return
    markChatRead(chatOpen)
    updatePresence(chatOpen)
    const interval = setInterval(()=>{ loadChatMessages(); markChatRead(chatOpen); updatePresence(chatOpen) }, 3000)
    return ()=>{ clearInterval(interval); updatePresence(null) }
  },[tab, chatOpen])

  async function updatePresence(chatId: string|null){
    if(!member?.id) return
    await supabase.from('chat_presence').upsert({ member_id: member.id, chat_id: chatId, updated_at: new Date().toISOString() })
  }

  useEffect(()=>{
    chatEndRef.current?.scrollIntoView({behavior:'smooth'})
  },[chatMessages])

  async function loadChatMessages(){
    const myId = member?.id
    const dmPartner = myId && chatOpen ? dmPartnerFromChatId(chatOpen, myId) : null
    const query = supabase.from('messages').select('*, member:members!member_id(nombre,avatar_url)').order('created_at',{ascending:true}).limit(100)
    let data, error
    if(dmPartner && myId){
      ;({data, error} = await query.or(`and(member_id.eq.${myId},recipient_member_id.eq.${dmPartner}),and(member_id.eq.${dmPartner},recipient_member_id.eq.${myId})`))
    } else if(chatOpen==='team'){
      ;({data, error} = await query.is('service_id',null).is('recipient_member_id',null))
    } else {
      ;({data, error} = await query.eq('service_id', chatOpen))
    }
    setChatMessages(data||[])
  }

  async function sendChat(){
    if(!chatInput.trim()||!member?.id||!chatOpen) return
    const content=chatInput.trim()
    const dmPartner = dmPartnerFromChatId(chatOpen, member.id)
    const serviceIdForChat = dmPartner ? null : (chatOpen==='team'?null:chatOpen)
    setChatInput('')

    // Aparece al instante en tu pantalla, sin esperar el viaje a la base de datos
    const tempId=`temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const optimisticMsg:any={ id:tempId, _tempId:tempId, member_id:member.id, content, service_id:serviceIdForChat,
      recipient_member_id: dmPartner||null,
      created_at:new Date().toISOString(), member:{nombre:member.nombre, avatar_url:member.avatar_url} }
    setChatMessages(prev=>[...prev, optimisticMsg])
    setChatPreviews(prev=>({...prev, [chatOpen as string]: { content, memberName:'Tú', memberId:member.id, created_at:optimisticMsg.created_at }}))

    const { data, error } = await supabase.from('messages')
      .insert({member_id:member.id,content,service_id:serviceIdForChat,recipient_member_id:dmPartner||null}).select().single()

    if(error){
      console.error('Error al enviar mensaje:', error)
      setChatMessages(prev=>prev.filter(m=>m._tempId!==tempId))
      setChatPreviews(prev=>{ const next={...prev}; delete next[chatOpen as string]; return next })
      alert('No se pudo enviar el mensaje. Intenta de nuevo.')
      return
    }

    // Reemplaza el mensaje optimista por el real (con su id definitivo, evita duplicado)
    setChatMessages(prev=>prev.map(m=>m._tempId===tempId?{...data, member:optimisticMsg.member}:m))

    // El aviso push ahora lo dispara un trigger en Supabase apenas se guarda
    // el mensaje (ver supabase-schema-v14-chat-push-trigger.sql) — así llega
    // aunque cierres la app o pierdas conexión justo después de enviar.
  }

  async function handleRSVP(invToken:string,respuesta:'si'|'no',comentario?:string){
    setActionLoading(true)
    await fetch('/api/confirm-rsvp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:invToken,respuesta,comentario})})
    setConfirmingDecline(null);setObsComment('')
    await loadData()
    setActionLoading(false)
  }

  async function toggleFavorite(songId:string){
    if(!member?.id) return
    const isFav=favoriteIds.has(songId)
    setFavoriteIds(prev=>{const n=new Set(prev); isFav?n.delete(songId):n.add(songId); return n})
    if(isFav){
      await supabase.from('song_favorites').delete().eq('member_id',member.id).eq('song_id',songId)
    }else{
      await supabase.from('song_favorites').upsert({member_id:member.id,song_id:songId},{onConflict:'member_id,song_id'})
    }
  }

  async function saveProfile(){
    setSavingProfile(true)
    const patchBody=isMemberPortal?{memberId:token.replace('member_',''),...profileData,instrumentos:selectedInstr}:{token,...profileData,instrumentos:selectedInstr}
    await fetch(isMemberPortal?'/api/portal-by-member':'/api/member-portal',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patchBody)})
    setMember(prev=>prev?{...prev,...profileData,instrumentos:selectedInstr}:prev)
    setProfileMsg('¡Guardado!');setEditProfile(false)
    setTimeout(()=>setProfileMsg(''),3000)
    setSavingProfile(false)
  }


  function toggleInstr(instr:string){setSelectedInstr(prev=>prev.includes(instr)?prev.filter(i=>i!==instr):[...prev,instr])}

  const filteredSongs=allSongs.filter(s=>s.nombre.toLowerCase().includes(songSearch.toLowerCase())||s.artista.toLowerCase().includes(songSearch.toLowerCase()))
  const card:React.CSSProperties={background:CARD,borderRadius:13,marginBottom:8,overflow:'hidden',border:`0.5px solid ${BORDER}`}
  const sectionLabel:React.CSSProperties={fontSize:9,fontWeight:500,color:MUTED,letterSpacing:'1px',textTransform:'uppercase',padding:'4px 0 8px',display:'block'}
  const tapSpring={type:'spring' as const,stiffness:500,damping:25}

  if(loading) return(
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,border:`2px solid ${TXT}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  const today=new Date();today.setHours(0,0,0,0)

  // ── RENDER ──
  return(
    <div style={{minHeight:'100vh',background:BG,fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',paddingBottom:65}}>

      {/* TOP BAR */}
      <div style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'14px 16px 10px',position:'sticky',top:0,zIndex:30}}>
        <div className="portal-content-wrap" style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:500,margin:'0 auto'}}>
          <div>
            <img src="/logo-icon-green.png" alt="Áncora" style={{height:26,width:'auto',objectFit:'contain'}}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,fontWeight:400,color:MUTED}}>Hola, {member?.nombre}</span>
            <div style={{width:32,height:32,borderRadius:10,overflow:'hidden',background:BG,border:`0.5px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
              onClick={()=>setTab('perfil')}>
              {member?.avatar_url
                ?<img src={member.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                :<span style={{fontFamily:'"Dancing Script",cursive',fontSize:14,fontWeight:700,color:TXT}}>{member?.nombre?.[0]}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="portal-content-wrap" style={{maxWidth:500,margin:'0 auto',padding:'12px 14px'}}>

      {/* ── HOME ── */}
      {tab==='home'&&(()=>{
        const pending = services.find(s=>s.invitation?.status==='pendiente'&&!!s.invitation?.sent_at)
        const next = services[0]
        const weekEnd = new Date(today); weekEnd.setDate(today.getDate()+6)
        const thisWeek = allServices.filter((s:any)=>{const d=new Date(s.fecha+'T12:00:00');d.setHours(0,0,0,0);return d>=today&&d<=weekEnd})
        const weekServicios = thisWeek.filter((s:any)=>s.tipo!=='ensayo').length
        const weekEnsayos = thisWeek.filter((s:any)=>s.tipo==='ensayo').length
        const favSongs = allSongs.filter(s=>favoriteIds.has(s.id))

        return(
        <div>
          {/* Acción pendiente */}
          {pending&&(
            <div style={{marginBottom:14}}>
              <div style={{background:CARD,borderRadius:14,padding:'12px 14px',border:`0.5px solid ${BORDER}`,display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <span style={{fontSize:18}}>⏳</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:500,color:TXT,margin:0}}>Te falta confirmar el {fmtLong(pending.service.fecha).dia} {fmtLong(pending.service.fecha).fecha}</p>
                  <p style={{fontSize:11,color:MUTED,margin:'2px 0 0'}}>{pending.service.titulo}{pending.posiciones.length>0?` · ${pending.posiciones.map(posLabel).join(', ')}`:''}</p>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <motion.button onClick={()=>handleRSVP(pending.invitation!.token,'si')} disabled={actionLoading} whileTap={{scale:0.95}} transition={tapSpring}
                  style={{flex:1,background:darkMode?'rgba(82,183,136,0.25)':'#E8F5EE',color:darkMode?'#A8E6CF':'#1B6B3A',border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✓ Confirmo</motion.button>
                <motion.button onClick={()=>handleRSVP(pending.invitation!.token,'no')} disabled={actionLoading} whileTap={{scale:0.95}} transition={tapSpring}
                  style={{flex:1,background:darkMode?'rgba(226,75,74,0.2)':'#FEE2E2',color:darkMode?'#FFB3B3':'#991B1B',border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>✗ No puedo</motion.button>
              </div>
            </div>
          )}

          {/* Próximo evento */}
          <span style={sectionLabel}>Próximo</span>
          {!next?(
            <div style={{...card,padding:'24px',textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:24,marginBottom:8}}>📅</div>
              <p style={{fontSize:12,fontWeight:400,color:MUTED}}>No tienes servicios asignados próximamente.</p>
            </div>
          ):(()=>{
            const isEnsayo=next.service.tipo==='ensayo'
            return(
              <motion.div style={{...card,cursor:'pointer',marginBottom:14}} onClick={()=>router.push(`/portal/${token}/servicio/${next.service.id}`)} whileTap={{scale:0.97}} transition={tapSpring}>
                <div style={{padding:'13px 14px'}}>
                  <div style={{fontSize:15,fontWeight:500,color:TXT,marginBottom:2}}>{fmtLong(next.service.fecha).dia} {fmtLong(next.service.fecha).fecha}</div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:8}}>
                    {next.service.hora_inicio?`${next.service.hora_inicio.slice(0,5)} hrs`:''}{next.service.lugar?` · ${next.service.lugar}`:''}
                  </div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                    {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:'rgba(240,169,59,0.15)',color:'#B7791F',padding:'2px 8px',borderRadius:20}}>Ensayo</span>}
                    {next.posiciones.map(p=><span key={p} style={{fontSize:10,fontWeight:500,background:ACCENT,color:'#F5F0E6',padding:'2px 8px',borderRadius:20}}>{posLabel(p)}</span>)}
                    {next.invitation&&<span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,
                      background:next.invitation.needs_reassignment_confirm?'rgba(240,169,59,0.15)':next.invitation.status==='confirmado'?'#E8F5EE':next.invitation.status==='declinado'?'#FEE2E2':'#FFF6E0',
                      color:next.invitation.needs_reassignment_confirm?'#B7791F':next.invitation.status==='confirmado'?'#1B6B3A':next.invitation.status==='declinado'?'#991B1B':'#92400E'}}>
                      {next.invitation.needs_reassignment_confirm?'Tu rol cambió — aún no confirmas':next.invitation.status==='confirmado'?'✓ Confirmado':next.invitation.status==='declinado'?'✗ Declinado':'⏳ Pendiente'}
                    </span>}
                  </div>
                </div>
              </motion.div>
            )
          })()}

          {/* Resumen de la semana */}
          <div style={{...card,padding:'10px 14px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:14}}>🗓️</span>
            <p style={{fontSize:12,color:MUTED,margin:0}}>
              Esta semana: {weekServicios===0?'sin servicios':`${weekServicios} servicio${weekServicios!==1?'s':''}`}
              {weekEnsayos>0?` · ${weekEnsayos} ensayo${weekEnsayos!==1?'s':''}`:' · sin ensayos'}
            </p>
          </div>

          {/* Accesos rápidos */}
          <span style={sectionLabel}>Accesos rápidos</span>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:showFavoritos&&favSongs.length>0?8:0}}>
            <motion.button onClick={()=>setShowDisponibilidad(true)} whileTap={{scale:0.95}} transition={tapSpring}
              style={{...card,padding:'11px 12px',display:'flex',alignItems:'center',gap:8,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <CalendarOff size={17} color={TXT}/>
              <span style={{fontSize:11,color:TXT}}>Bloquear fecha</span>
            </motion.button>
            <motion.button onClick={()=>setShowFavoritos(v=>!v)} whileTap={{scale:0.95}} transition={tapSpring}
              style={{...card,padding:'11px 12px',display:'flex',alignItems:'center',gap:8,border:showFavoritos?`0.5px solid ${ACCENT}`:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <Heart size={17} color={showFavoritos?'#D4537E':TXT} fill={showFavoritos?'#D4537E':'none'}/>
              <span style={{fontSize:11,color:TXT,flex:1,textAlign:'left'}}>Favoritos</span>
              <motion.span animate={{rotate:showFavoritos?180:0}} transition={tapSpring} style={{display:'inline-flex'}}>
                <ChevronDown size={13} color={MUTED}/>
              </motion.span>
            </motion.button>
          </div>

          {showFavoritos&&(
            favSongs.length===0?(
              <div style={{...card,padding:'16px',textAlign:'center'}}>
                <p style={{fontSize:11,color:MUTED}}>Aún no tienes favoritos — marca canciones con ♥ en la pestaña Canciones.</p>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {favSongs.map(song=>(
                  <div key={song.id} style={{...card,padding:'9px 12px',display:'flex',alignItems:'center',gap:9}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{song.nombre}</div>
                      <div style={{fontSize:10,color:MUTED}}>{song.artista}{song.tono_original?` · Tono ${song.tono_original}`:''}</div>
                    </div>
                    {song.link_spotify&&<a href={song.link_spotify} target="_blank" style={{fontSize:14,textDecoration:'none'}}>▶️</a>}
                    {song.link_letras&&<a href={song.link_letras} target="_blank" style={{fontSize:14,textDecoration:'none'}}>📄</a>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        )
      })()}

      {/* ── CANCIONES ── */}
      {tab==='canciones'&&(
        <div>
          <div style={{background:CARD,borderRadius:10,padding:'9px 11px',marginBottom:9,border:`0.5px solid ${BORDER}`,display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:13,color:MUTED}}>🔍</span>
            <input style={{flex:1,border:'none',outline:'none',fontSize:16,fontFamily:'inherit',color:TXT,background:'transparent',fontWeight:400}} placeholder="Buscar canción o artista..." value={songSearch} onChange={e=>setSongSearch(e.target.value)}/>
          </div>
          <span style={sectionLabel}>{filteredSongs.length} canciones en el repertorio</span>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {filteredSongs.map(song=>{
              const isOpen=expandedSong===song.id
              return(
                <div key={song.id} style={card}>
                  <div style={{width:'100%',display:'flex',alignItems:'center',gap:2}}>
                    <button onClick={()=>setExpandedSong(isOpen?null:song.id)}
                      style={{flex:1,minWidth:0,textAlign:'left',padding:'10px 4px 10px 13px',display:'flex',alignItems:'center',gap:9,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:400,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{song.nombre}</div>
                        <div style={{fontSize:10,fontWeight:400,color:MUTED,marginTop:1}}>{song.artista}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        {song.tono_original&&<span style={{fontSize:9,fontWeight:500,background:BG,color:'#555',padding:'2px 6px',borderRadius:20}}>{song.tono_original}</span>}
                        <span style={{fontSize:10,color:MUTED,transform:isOpen?'rotate(90deg)':'none',transition:'transform 0.2s'}}>›</span>
                      </div>
                    </button>
                    <button onClick={()=>toggleFavorite(song.id)} aria-label="Favorito"
                      style={{background:'none',border:'none',cursor:'pointer',padding:'10px 12px 10px 4px',display:'flex',alignItems:'center',flexShrink:0}}>
                      <Heart size={17} color={favoriteIds.has(song.id)?'#D4537E':MUTED} fill={favoriteIds.has(song.id)?'#D4537E':'none'}/>
                    </button>
                  </div>
                  {isOpen&&(
                    <div style={{borderTop:`0.5px solid ${BORDER}`,padding:'9px 13px',background:BG}}>
                      {(song.bpm||song.compas||song.duracion_min)&&(
                        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:song.notas?8:song.link_spotify||song.link_letras||song.link_recursos?8:0}}>
                          {song.bpm&&<span style={{fontSize:10,background:CARD,color:'#92400E',padding:'2px 7px',borderRadius:20,border:`0.5px solid ${BORDER}`}}>♩ {song.bpm} BPM</span>}
                          {song.compas&&<span style={{fontSize:10,background:CARD,color:MUTED,padding:'2px 7px',borderRadius:20,border:`0.5px solid ${BORDER}`}}>{song.compas}</span>}
                          {song.duracion_min&&<span style={{fontSize:10,background:CARD,color:MUTED,padding:'2px 7px',borderRadius:20,border:`0.5px solid ${BORDER}`}}>{toMMSS(song.duracion_min)}</span>}
                        </div>
                      )}
                      {song.notas&&<div style={{background:'#FFFBF0',borderRadius:8,padding:'7px 10px',marginBottom:8}}><p style={{fontSize:11,color:'#92400E',fontWeight:400}}>{song.notas}</p></div>}
                      {(song.link_spotify||song.link_letras||song.link_recursos)&&(
                        <div style={{display:'flex',gap:5}}>
                          {song.link_spotify&&<a href={song.link_spotify} target="_blank" style={{flex:1,background:'#FFE8E8',borderRadius:7,padding:'6px 4px',textAlign:'center',textDecoration:'none',display:'block'}}><div style={{fontSize:13}}>▶️</div><span style={{fontSize:8,fontWeight:600,color:'#CC0000'}}>YouTube</span></a>}
                          {song.link_letras&&<a href={song.link_letras} target="_blank" style={{flex:1,background:'#DBE4FF',borderRadius:7,padding:'6px 4px',textAlign:'center',textDecoration:'none',display:'block'}}><div style={{fontSize:13}}>📄</div><span style={{fontSize:8,fontWeight:600,color:'#1971C2'}}>Letras</span></a>}
                          {song.link_recursos&&<a href={song.link_recursos} target="_blank" style={{flex:1,background:'#FFF3CD',borderRadius:7,padding:'6px 4px',textAlign:'center',textDecoration:'none',display:'block'}}><div style={{fontSize:13}}>📁</div><span style={{fontSize:8,fontWeight:600,color:'#92400E'}}>Recursos</span></a>}
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

      {/* ── SERVICIOS ── */}
      {tab==='servicios'&&(
        <div>
          {allServices.length===0?(
            <div style={{...card,padding:24,textAlign:'center'}}>
              <p style={{fontSize:12,fontWeight:400,color:MUTED}}>No hay servicios programados próximamente.</p>
            </div>
          ):(
            allServices.map((svc:any, svcIndex:number)=>{
              const myData=services.find(s=>s.service.id===svc.id)
              const days=daysUntil(svc.fecha)
              const isEnsayo=svc.tipo==='ensayo'
              const isAssigned=isEnsayo?!!myData:(!!myData&&myData.posiciones.length>0)
              const nominaSent=myData?.nominaSent??false
              const isFirst=svcIndex===0
              const d=new Date(svc.fecha+'T12:00:00')

              if(isFirst) return(
                <div key={svc.id} style={{background:'#1A1A2E',borderRadius:16,overflow:'hidden',marginBottom:20,cursor:'pointer'}}
                  onClick={()=>router.push(`/portal/${token}/servicio/${svc.id}`)}>
                  <div style={{padding:'16px 16px 14px'}}>
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      <span style={{display:'inline-flex',alignItems:'center',background:'rgba(255,255,255,0.12)',borderRadius:20,padding:'3px 10px'}}>
                        <span style={{fontSize:9,fontWeight:500,color:'rgba(255,255,255,0.8)',letterSpacing:'0.5px'}}>{days===0?'Hoy':days===1?'Mañana':days>0?`En ${days} días`:''}</span>
                      </span>
                      {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:'rgba(240,169,59,0.25)',color:'#F0A93B',borderRadius:20,padding:'3px 10px'}}>Ensayo</span>}
                    </div>
                    <div style={{fontSize:20,fontWeight:400,color:'#FFFFFF',letterSpacing:'-0.3px',marginBottom:4,lineHeight:1.2,textTransform:'capitalize' as const}}>
                      {new Date(svc.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
                    </div>
                    <div style={{fontSize:11,fontWeight:400,color:'rgba(255,255,255,0.5)',marginBottom:14}}>
                      {svc.hora_inicio?`${svc.hora_inicio.slice(0,5)} hrs${svc.lugar?` · ${svc.lugar}`:''}`:'Ancora - Services'}
                    </div>

                    {isAssigned ? (
                      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 12px',marginBottom:10}}>
                        <p style={{fontSize:8,fontWeight:600,color:'rgba(255,255,255,0.4)',letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 5px'}}>Tu rol</p>
                        {myData!.posiciones.length>0?(
                          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                            {myData!.posiciones.map((p:string)=><span key={p} style={{fontSize:12,fontWeight:600,background:'rgba(255,255,255,0.15)',color:'#FFFFFF',padding:'3px 10px',borderRadius:20}}>{posLabel(p)}</span>)}
                          </div>
                        ):(
                          <p style={{fontSize:13,fontWeight:500,color:'#FFFFFF',margin:0}}>Convocado a este ensayo</p>
                        )}
                      </div>
                    ):(
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:10}}>{!isEnsayo&&!nominaSent?'Nominación pendiente':'No convocado'}</p>
                    )}

                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      {myData?.invitation?(
                        <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,
                          background:myData.invitation.needs_reassignment_confirm?'rgba(240,169,59,0.25)':myData.invitation.status==='confirmado'?'rgba(82,183,136,0.3)':myData.invitation.status==='declinado'?'rgba(226,75,74,0.3)':'rgba(255,255,255,0.15)',
                          color:myData.invitation.needs_reassignment_confirm?'#F0A93B':myData.invitation.status==='confirmado'?'#A8E6CF':myData.invitation.status==='declinado'?'#FFB3B3':'rgba(255,255,255,0.7)'}}>
                          {myData.invitation.needs_reassignment_confirm?'Tu rol cambió — aún no confirmas':myData.invitation.status==='confirmado'?'✓ Confirmado':myData.invitation.status==='declinado'?'✗ Declinado':'⏳ Pendiente'}
                        </span>
                      ):<span/>}
                      <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Ver detalle ›</span>
                    </div>
                  </div>
                </div>
              )

              return(
                <div key={svc.id}>
                  {svcIndex===1&&<span style={sectionLabel}>Próximos eventos</span>}
                  <div style={{...card,cursor:'pointer',marginBottom:6}} onClick={()=>router.push(`/portal/${token}/servicio/${svc.id}`)}>
                    <div style={{padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,background:BG,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0,border:`0.5px solid ${BORDER}`}}>
                        <span style={{fontSize:14,fontWeight:600,color:TXT,lineHeight:1}}>{d.getDate()}</span>
                        <span style={{fontSize:7,color:MUTED,textTransform:'uppercase'}}>{d.toLocaleString('es-CL',{month:'short'})}</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:400,color:TXT}}>{fmtLong(svc.fecha).dia} {fmtLong(svc.fecha).fecha}</div>
                        <div style={{display:'flex',gap:4,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                          {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:'rgba(240,169,59,0.15)',color:'#B7791F',padding:'1px 6px',borderRadius:20}}>Ensayo</span>}
                          {isAssigned&&myData!.posiciones.map((p:string)=><span key={p} style={{fontSize:9,fontWeight:500,background:ACCENT,color:'#F5F0E6',padding:'1px 6px',borderRadius:20}}>{posLabel(p)}</span>)}
                          {myData?.invitation&&<span style={{fontSize:9,fontWeight:500,padding:'1px 6px',borderRadius:20,
                            background:myData.invitation.needs_reassignment_confirm?'rgba(240,169,59,0.15)':myData.invitation.status==='confirmado'?'#E8F5EE':myData.invitation.status==='declinado'?'#FEE2E2':'#FFF6E0',
                            color:myData.invitation.needs_reassignment_confirm?'#B7791F':myData.invitation.status==='confirmado'?'#1B6B3A':myData.invitation.status==='declinado'?'#991B1B':'#92400E'}}>
                            {myData.invitation.needs_reassignment_confirm?'⚠️ Rol cambió':myData.invitation.status==='confirmado'?'✓ Confirmado':myData.invitation.status==='declinado'?'✗ Declinado':'⏳ Pendiente'}
                          </span>}
                          {!isAssigned&&!isEnsayo&&!nominaSent&&<span style={{fontSize:9,fontWeight:400,color:MUTED}}>Nominación pendiente</span>}
                          {!isAssigned&&!isEnsayo&&nominaSent&&<span style={{fontSize:9,fontWeight:400,color:MUTED}}>No convocado</span>}
                          {days>=0&&<span style={{fontSize:9,color:MUTED,padding:'1px 5px',borderRadius:20,background:BG}}>{days===0?'Hoy':days===1?'Mañana':`${days} días`}</span>}
                        </div>
                      </div>
                      <span style={{fontSize:12,color:MUTED}}>›</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}


      {/* ── CHATS ── */}
      {tab==='chats'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(240,169,59,0.12)',border:'0.5px solid rgba(240,169,59,0.3)',borderRadius:10,padding:'8px 12px',marginBottom:12}}>
            <span style={{fontSize:9,fontWeight:700,color:'#B7791F',letterSpacing:'0.5px',background:'rgba(240,169,59,0.25)',padding:'2px 7px',borderRadius:20}}>BETA</span>
            <span style={{fontSize:11,fontWeight:400,color:MUTED}}>Los chats están en pruebas — si algo falla, avísanos.</span>
          </div>
          <div style={{position:'relative',minHeight:'calc(100vh - 130px)',overflow:'hidden'}}>
          <AnimatePresence initial={false}>
          {!chatOpen?(
            // Lista de chats — estilo iOS
            <motion.div key="chat-list" initial={{x:0,opacity:1}} animate={{x:0,opacity:1}} exit={{x:'-30%',opacity:0}} transition={{type:'spring',bounce:0.3,duration:0.35}} style={{position:'absolute',inset:0,overflowY:'auto'}}>
              <span style={sectionLabel}>Mensajes</span>
              <div style={{display:'flex',flexDirection:'column',gap:1}}>
                {/* Chat general del equipo */}
                <button onClick={()=>setChatOpen('team')}
                  style={{background:CARD,border:'none',cursor:'pointer',fontFamily:'inherit',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,borderRadius:13,marginBottom:6,width:'100%',textAlign:'left'}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Users size={20} color="#F5F0E6"/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:2}}>
                      <span style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:14,fontWeight:500,color:TXT}}>Ancora - Services</span>
                        {unreadChatIds.has('team')&&<span style={{width:8,height:8,borderRadius:'50%',background:'#E24B4A',flexShrink:0}}/>}
                      </span>
                      <span style={{fontSize:10,fontWeight:400,color:MUTED}}>{chatPreviews['team']?new Date(chatPreviews['team'].created_at).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}):''}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:400,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {chatPreviews['team']?`${chatPreviews['team'].memberName}: ${chatPreviews['team'].content}`:'Sin mensajes aún'}
                    </div>
                  </div>
                  <span style={{fontSize:16,color:'#CCC'}}>›</span>
                </button>

                {/* Chats por servicio — uno por cada servicio/ensayo donde participo */}
                {services.filter(s=>s.posiciones.length>0||s.service.tipo==='ensayo').map(({service:svc})=>{
                  const isEnsayo=svc.tipo==='ensayo'
                  const {dia,fecha}=fmtLong(svc.fecha)
                  return(
                    <button key={svc.id} onClick={()=>setChatOpen(svc.id)}
                      style={{background:CARD,border:'none',cursor:'pointer',fontFamily:'inherit',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,borderRadius:13,marginBottom:6,width:'100%',textAlign:'left'}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:isEnsayo?'#F0A93B':BG,border:`0.5px solid ${isEnsayo?'transparent':BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isEnsayo?<Mic2 size={19} color="#1A1A1A"/>:<CalendarDays size={19} color={TXT}/>}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                          <span style={{fontSize:14,fontWeight:500,color:TXT}}>{dia} {fecha}</span>
                          {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:'rgba(240,169,59,0.15)',color:'#B7791F',padding:'1px 6px',borderRadius:20}}>Ensayo</span>}
                          {unreadChatIds.has(svc.id)&&<span style={{width:8,height:8,borderRadius:'50%',background:'#E24B4A',flexShrink:0}}/>}
                        </div>
                        <div style={{fontSize:12,fontWeight:400,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {chatPreviews[svc.id]?`${chatPreviews[svc.id].memberName}: ${chatPreviews[svc.id].content}`:(svc.titulo||'Toca para chatear con el equipo de este día')}
                        </div>
                      </div>
                      <span style={{fontSize:16,color:'#CCC'}}>›</span>
                    </button>
                  )
                })}
                {services.filter(s=>s.posiciones.length>0||s.service.tipo==='ensayo').length===0&&(
                  <div style={{...card,padding:'12px 14px',opacity:0.6}}>
                    <p style={{fontSize:12,fontWeight:400,color:MUTED,textAlign:'center'}}>Cuando te convoquen a un servicio o ensayo, su chat va a aparecer aquí.</p>
                  </div>
                )}

                {/* DM — mensajes directos 1 a 1 */}
                <span style={{...sectionLabel,marginTop:14}}>Directos</span>
                {Array.from(dmPartnerIds).map(pid=>{
                  const partner = teamRoster.find(r=>r.id===pid)
                  const cid = dmChatId(member?.id||'', pid)
                  const preview = chatPreviews[cid]
                  return (
                    <button key={pid} onClick={()=>setChatOpen(cid)}
                      style={{background:CARD,border:'none',cursor:'pointer',fontFamily:'inherit',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,borderRadius:13,marginBottom:6,width:'100%',textAlign:'left'}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {partner?.avatar_url
                          ? <img src={partner.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                          : <span style={{fontSize:14,fontWeight:600,color:'#F5F0E6'}}>{partner?.nombre?.[0]}{partner?.apellido?.[0]||''}</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                          <span style={{fontSize:14,fontWeight:500,color:TXT}}>{partner?partner.nombre+' '+partner.apellido:'…'}</span>
                          {unreadChatIds.has(cid)&&<span style={{width:8,height:8,borderRadius:'50%',background:'#E24B4A',flexShrink:0}}/>}
                        </div>
                        <div style={{fontSize:12,fontWeight:400,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {preview?`${preview.memberName}: ${preview.content}`:'Toca para escribirle'}
                        </div>
                      </div>
                      <span style={{fontSize:16,color:'#CCC'}}>›</span>
                    </button>
                  )
                })}
                <button onClick={()=>setShowDmPicker(true)}
                  style={{background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',padding:'10px 4px',display:'flex',alignItems:'center',gap:6,width:'100%',textAlign:'left'}}>
                  <span style={{fontSize:15,color:TXT}}>+</span>
                  <span style={{fontSize:13,fontWeight:500,color:TXT}}>Nuevo mensaje directo</span>
                </button>
              </div>
            </motion.div>
          ):(
            // Vista del chat
            <motion.div key="chat-detail" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',bounce:0.3,duration:0.35}} style={{position:'absolute',inset:0,display:'flex',flexDirection:'column'}}>
              {/* Header chat */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <button onClick={()=>setChatOpen(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:TXT,padding:'4px 0'}}>‹</button>
                {(()=>{
                  if(chatOpen==='team') return(
                    <>
                      <div style={{width:32,height:32,borderRadius:'50%',background:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Users size={15} color="#F5F0E6"/></div>
                      <div>
                        <div style={{fontSize:14,fontWeight:500,color:TXT}}>Ancora - Services</div>
                        <div style={{fontSize:10,fontWeight:400,color:MUTED}}>Chat del equipo</div>
                      </div>
                    </>
                  )
                  const dmPartner = member?.id ? dmPartnerFromChatId(chatOpen||'', member.id) : null
                  if(dmPartner){
                    const partner = teamRoster.find(r=>r.id===dmPartner)
                    return(
                      <>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {partner?.avatar_url
                            ? <img src={partner.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                            : <span style={{fontSize:12,fontWeight:600,color:'#F5F0E6'}}>{partner?.nombre?.[0]}{partner?.apellido?.[0]||''}</span>}
                        </div>
                        <div>
                          <div style={{fontSize:14,fontWeight:500,color:TXT}}>{partner?partner.nombre+' '+partner.apellido:'…'}</div>
                          <div style={{fontSize:10,fontWeight:400,color:MUTED}}>Mensaje directo</div>
                        </div>
                      </>
                    )
                  }
                  const svcData = services.find(s=>s.service.id===chatOpen)
                  const isEnsayo = svcData?.service.tipo==='ensayo'
                  const {dia,fecha} = svcData?fmtLong(svcData.service.fecha):{dia:'',fecha:''}
                  return(
                    <>
                      <div style={{width:32,height:32,borderRadius:'50%',background:isEnsayo?'#F0A93B':BG,border:`0.5px solid ${isEnsayo?'transparent':BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isEnsayo?<Mic2 size={14} color="#1A1A1A"/>:<CalendarDays size={14} color={TXT}/>}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:500,color:TXT}}>{dia} {fecha}</div>
                        <div style={{fontSize:10,fontWeight:400,color:MUTED}}>{isEnsayo?'Chat del ensayo':'Chat del servicio'}</div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div style={{flex:1,background:CARD,borderRadius:13,border:`0.5px solid ${BORDER}`,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                <div style={{flex:1,overflowY:'auto',padding:'12px 13px',display:'flex',flexDirection:'column',gap:8}}>
                  {chatMessages.length===0&&(
                    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <p style={{fontSize:12,fontWeight:400,color:MUTED,textAlign:'center'}}>Aún no hay mensajes.<br/>¡Sé el primero en escribir!</p>
                    </div>
                  )}
                  {chatMessages.map((msg:any,i:number)=>{
                    const isMe=msg.member_id===member?.id
                    return(
                      <div key={i} style={{display:'flex',gap:7,alignItems:'flex-end',flexDirection:isMe?'row-reverse':'row'}}>
                        {!isMe&&(
                          <div style={{width:26,height:26,borderRadius:'50%',background:BG,border:`0.5px solid ${BORDER}`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:TXT,flexShrink:0}}>
                            {msg.member?.avatar_url
                              ? <img src={msg.member.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                              : (msg.member?.nombre?.[0]||'?')}
                          </div>
                        )}
                        <div style={{maxWidth:'75%'}}>
                          {!isMe&&<div style={{fontSize:10,fontWeight:500,color:MUTED,marginBottom:2,paddingLeft:4}}>{msg.member?.nombre}</div>}
                          <div style={{background:isMe?ACCENT:BG,borderRadius:18,padding:'9px 14px',border:isMe?'none':`0.5px solid ${BORDER}`}}>
                            <p style={{fontSize:15,fontWeight:400,color:isMe?'#F5F0E6':TXT,lineHeight:1.35}}>{msg.content}</p>
                          </div>
                          <div style={{fontSize:10,color:MUTED,marginTop:2,textAlign:isMe?'right':'left',paddingLeft:isMe?0:4,paddingRight:isMe?4:0}}>
                            {new Date(msg.created_at).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef}/>
                </div>
                <div style={{borderTop:`0.5px solid ${BORDER}`,padding:'10px 13px',display:'flex',gap:7,alignItems:'center'}}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}
                    placeholder="Escribe un mensaje..." style={{flex:1,border:'none',outline:'none',fontSize:16,fontFamily:'inherit',color:TXT,background:'transparent',fontWeight:400}}/>
                  <button onClick={sendChat} disabled={!chatInput.trim()||sendingChat}
                    style={{width:32,height:32,borderRadius:'50%',background:chatInput.trim()?ACCENT:'#E0E0E0',border:'none',cursor:chatInput.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#F5F0E6'}}>
                    ➤
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Modal: nuevo mensaje directo ── */}
      {showDmPicker&&(
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div onClick={()=>setShowDmPicker(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.5)'}}/>
          <div style={{position:'relative',width:'100%',maxWidth:480,background:CARD,borderRadius:'16px 16px 0 0',padding:'20px 16px 28px',maxHeight:'75vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,borderRadius:2,background:'rgba(0,0,0,0.15)',margin:'0 auto 16px'}}/>
            <p style={{fontSize:13,fontWeight:600,color:TXT,marginBottom:10}}>Escribirle a...</p>
            {teamRoster.map(r=>(
              <button key={r.id} onClick={()=>{
                  const cid = dmChatId(member?.id||'', r.id)
                  setDmPartnerIds(prev=>new Set(prev).add(r.id))
                  setShowDmPicker(false)
                  setChatOpen(cid)
                }}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'10px 6px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'#1A1A1A',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {r.avatar_url
                    ? <img src={r.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <span style={{fontSize:13,fontWeight:600,color:'#F5F0E6'}}>{r.nombre?.[0]}{r.apellido?.[0]||''}</span>}
                </div>
                <span style={{fontSize:14,fontWeight:500,color:TXT}}>{r.nombre} {r.apellido}</span>
              </button>
            ))}
            {teamRoster.length===0&&(
              <p style={{fontSize:12,color:MUTED,textAlign:'center',padding:'20px 0'}}>No hay nadie más en el equipo todavía.</p>
            )}
          </div>
        </div>
      )}

      {/* ── PERFIL — Modo nocturno ── */}
      {tab==='perfil'&&(
        <div style={{background:darkMode?'#111118':BG,borderRadius:16,padding:'16px',margin:'-12px -14px',minHeight:'calc(100vh - 130px)'}}>
          {profileMsg&&<div style={{background:'rgba(82,183,136,0.2)',color:'#A8E6CF',fontSize:12,padding:'8px 12px',borderRadius:9,marginBottom:10,fontWeight:500}}>{profileMsg}</div>}
          <div style={{background:darkMode?'rgba(255,255,255,0.06)':CARD,borderRadius:13,padding:'14px 13px',display:'flex',alignItems:'center',gap:12,marginBottom:10,border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`}}>
            <AvatarUpload memberId={member?.id||''} currentUrl={member?.avatar_url} nombre={member?.nombre||''} apellido={member?.apellido} size="lg"
              onUpdate={(url:string)=>setMember(prev=>prev?{...prev,avatar_url:url}:prev)}/>
            <div>
              <div style={{fontSize:14,fontWeight:500,color:darkMode?'#F5F0E6':TXT}}>{member?.nombre} {member?.apellido}</div>
              <div style={{fontSize:11,fontWeight:400,color:darkMode?'rgba(255,255,255,0.4)':MUTED,marginTop:1}}>{member?.email}</div>
            </div>
          </div>
          <span style={{...sectionLabel,color:darkMode?'rgba(255,255,255,0.3)':MUTED}}>Información personal</span>
          {editProfile?(
            <div style={{background:darkMode?'rgba(255,255,255,0.06)':CARD,borderRadius:13,border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`}}>
              <div style={{padding:'13px'}}>
                {[{label:'Nombre',key:'nombre'},{label:'Apellido',key:'apellido'},{label:'Teléfono',key:'telefono'}].map(({label,key})=>(
                  <div key={key} style={{marginBottom:10}}>
                    <label style={{fontSize:10,fontWeight:500,color:darkMode?'rgba(255,255,255,0.3)':MUTED,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</label>
                    <input style={{width:'100%',border:darkMode?'0.5px solid rgba(255,255,255,0.1)':`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px 11px',fontSize:16,fontFamily:'inherit',outline:'none',color:darkMode?'#F5F0E6':TXT,background:darkMode?'rgba(255,255,255,0.08)':BG,fontWeight:400}}
                      value={(profileData as any)[key]} onChange={e=>setProfileData({...profileData,[key]:e.target.value})}/>
                  </div>
                ))}
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:10,fontWeight:500,color:darkMode?'rgba(255,255,255,0.3)':MUTED,display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>Fecha de nacimiento</label>
                  <input type="date" style={{width:'100%',border:darkMode?'0.5px solid rgba(255,255,255,0.1)':`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px 11px',fontSize:16,fontFamily:'inherit',outline:'none',color:darkMode?'#F5F0E6':TXT,background:darkMode?'rgba(255,255,255,0.08)':BG,colorScheme:darkMode?'dark':'light'}}
                    value={profileData.fecha_nacimiento} onChange={e=>setProfileData({...profileData,fecha_nacimiento:e.target.value})}/>
                </div>
                <div style={{display:'flex',gap:7}}>
                  <button onClick={saveProfile} disabled={savingProfile}
                    style={{flex:1,background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:8,padding:10,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>{savingProfile?'Guardando...':'Guardar'}</button>
                  <button onClick={()=>setEditProfile(false)}
                    style={{flex:1,background:darkMode?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)',color:darkMode?'rgba(255,255,255,0.6)':MUTED,border:darkMode?'0.5px solid rgba(255,255,255,0.1)':`0.5px solid ${BORDER}`,borderRadius:8,padding:10,fontSize:13,fontFamily:'inherit',cursor:'pointer'}}>Cancelar</button>
                </div>
              </div>
            </div>
          ):(
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:13,border:'0.5px solid rgba(255,255,255,0.08)'}}>
              {[{label:'Nombre completo',value:`${member?.nombre} ${member?.apellido}`},{label:'Email',value:member?.email},{label:'Teléfono',value:member?.telefono||'—'},{label:'Fecha de nacimiento',value:member?.fecha_nacimiento?new Date(member.fecha_nacimiento+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'long',year:'numeric'}):'—'}].map(({label,value},i,arr)=>(
                <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 13px',borderBottom:i<arr.length-1?darkMode?'0.5px solid rgba(255,255,255,0.06)':`0.5px solid ${BORDER}`:'none'}}>
                  <span style={{fontSize:12,fontWeight:400,color:darkMode?'rgba(255,255,255,0.35)':MUTED}}>{label}</span>
                  <span style={{fontSize:12,fontWeight:400,color:darkMode?'rgba(255,255,255,0.8)':TXT}}>{value}</span>
                </div>
              ))}
              <div style={{padding:'10px 13px'}}>
                <button onClick={()=>setEditProfile(true)}
                  style={{width:'100%',background:darkMode?'rgba(255,255,255,0.08)':BG,color:darkMode?'rgba(255,255,255,0.7)':TXT,border:darkMode?'0.5px solid rgba(255,255,255,0.1)':`0.5px solid ${BORDER}`,borderRadius:8,padding:'9px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>✏️ Editar información</button>
              </div>
            </div>
          )}

          <span style={{...sectionLabel,display:'block',marginTop:14,color:darkMode?'rgba(255,255,255,0.3)':MUTED}}>Opciones</span>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <button onClick={()=>setShowInstrumentos(true)}
              style={{background:darkMode?'rgba(255,255,255,0.06)':CARD,border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`,borderRadius:13,padding:'11px 13px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'inherit',width:'100%'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Guitar size={18} color={TXT} />
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:400,color:darkMode?'rgba(255,255,255,0.85)':TXT}}>Mis instrumentos</div>
                  <div style={{fontSize:10,fontWeight:400,color:darkMode?'rgba(255,255,255,0.35)':MUTED,marginTop:1}}>{selectedInstr.length===0?'Ninguno seleccionado':selectedInstr.map(i=>INSTR_LABEL[i]||i).join(' · ')}</div>
                </div>
              </div>
              <span style={{fontSize:12,color:darkMode?'rgba(255,255,255,0.3)':MUTED}}>›</span>
            </button>
            <button onClick={()=>setShowDisponibilidad(true)}
              style={{background:darkMode?'rgba(255,255,255,0.06)':CARD,border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`,borderRadius:13,padding:'11px 13px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'inherit',width:'100%'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Calendar size={18} color={TXT} />
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:13,fontWeight:400,color:darkMode?'rgba(255,255,255,0.85)':TXT}}>Mi disponibilidad</div>
                  <div style={{fontSize:10,fontWeight:400,color:darkMode?'rgba(255,255,255,0.35)':MUTED,marginTop:1}}>{Object.keys(dateBlocks).length===0?'Sin fechas bloqueadas':`${Object.keys(dateBlocks).length} fecha${Object.keys(dateBlocks).length!==1?'s':''} bloqueada${Object.keys(dateBlocks).length!==1?'s':''}`}</div>
                </div>
              </div>
              <span style={{fontSize:12,color:darkMode?'rgba(255,255,255,0.3)':MUTED}}>›</span>
            </button>
          </div>

          <p style={{fontSize:10,fontWeight:400,color:darkMode?'rgba(255,255,255,0.2)':MUTED,textAlign:'center',marginTop:16,marginBottom:4}}>Para cambiar email, contacta al administrador.</p>

          {/* Toggle modo oscuro */}
          <motion.button onClick={toggleDarkMode} whileTap={{scale:0.98}} transition={tapSpring}
            style={{width:'100%',background:darkMode?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)',border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`,borderRadius:11,padding:'11px 13px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'inherit',marginBottom:6}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {darkMode ? <Sun size={18} color={TXT} /> : <Moon size={18} color={TXT} />}
              <span style={{fontSize:13,fontWeight:400,color:darkMode?'rgba(255,255,255,0.8)':TXT}}>{darkMode?'Modo claro':'Modo oscuro'}</span>
            </div>
            {/* Toggle pill */}
            <div style={{width:40,height:22,borderRadius:11,background:darkMode?'#F5F0E6':'#E0E0E0',position:'relative',transition:'background 0.2s'}}>
              <motion.div animate={{left:darkMode?20:2}} transition={tapSpring} style={{width:18,height:18,borderRadius:'50%',background:darkMode?'#1A1A1A':'#FFF',position:'absolute',top:2,boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
            </div>
          </motion.button>

          {/* Toggle notificaciones push */}
          {pushSupported&&(isIOS?isStandalone:true)&&vapidKeyConfigured&&(
            <motion.button onClick={togglePush} disabled={pushLoading} whileTap={{scale:0.98}} transition={tapSpring}
              style={{width:'100%',background:darkMode?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)',border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`,borderRadius:11,padding:'11px 13px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',fontFamily:'inherit',marginBottom:6,opacity:pushLoading?0.6:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <Bell size={18} color={TXT} />
                <span style={{fontSize:13,fontWeight:400,color:darkMode?'rgba(255,255,255,0.8)':TXT}}>Notificaciones</span>
              </div>
              <div style={{width:40,height:22,borderRadius:11,background:pushEnabled?'#52B788':(darkMode?'rgba(255,255,255,0.15)':'#E0E0E0'),position:'relative',transition:'background 0.2s'}}>
                <motion.div animate={{left:pushEnabled?20:2}} transition={tapSpring} style={{width:18,height:18,borderRadius:'50%',background:'#FFF',position:'absolute',top:2,boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
              </div>
            </motion.button>
          )}
          {pushSupported&&!vapidKeyConfigured&&(
            <div style={{background:darkMode?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)',border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`,borderRadius:11,padding:'11px 13px',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                <Bell size={18} color={TXT} />
                <span style={{fontSize:13,fontWeight:400,color:darkMode?'rgba(255,255,255,0.8)':TXT}}>Notificaciones</span>
              </div>
              <p style={{fontSize:11,fontWeight:400,color:MUTED,lineHeight:1.5,margin:0}}>
                Aún no están habilitadas para este equipo — falta un ajuste del administrador en el servidor.
              </p>
            </div>
          )}
          {pushSupported&&isIOS&&!isStandalone&&(
            <div style={{background:darkMode?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)',border:darkMode?'0.5px solid rgba(255,255,255,0.08)':`0.5px solid ${BORDER}`,borderRadius:11,padding:'11px 13px',marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                <Bell size={18} color={TXT} />
                <span style={{fontSize:13,fontWeight:400,color:darkMode?'rgba(255,255,255,0.8)':TXT}}>Notificaciones</span>
              </div>
              <p style={{fontSize:11,fontWeight:400,color:MUTED,lineHeight:1.5,margin:0}}>
                Para recibir notificaciones en iPhone, agrega esta app a tu pantalla de inicio: toca <b>Compartir</b> (el cuadrado con la flecha) en Safari, luego <b>"Agregar a pantalla de inicio"</b>.
              </p>
            </div>
          )}

          <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login'}}
            style={{width:'100%',background:'none',color:darkMode?'rgba(226,75,74,0.7)':'#B91C1C',border:'none',padding:'8px',fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>Cerrar sesión</button>
        </div>
      )}

      </div>

      {/* ── PANEL INSTRUMENTOS ── */}
      {showInstrumentos&&(
        <div style={{position:'fixed',inset:0,zIndex:100}}>
          <div onClick={()=>setShowInstrumentos(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)'}}/>
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:NAV_BG,borderRadius:'20px 20px 0 0',padding:'20px 16px 40px',maxHeight:'80vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,background:'#E0E0E0',borderRadius:2,margin:'0 auto 16px'}}/>
            <div style={{fontSize:15,fontWeight:500,color:TXT,marginBottom:4}}>Mis instrumentos</div>
            <div style={{fontSize:11,fontWeight:400,color:MUTED,marginBottom:16}}>Selecciona en qué áreas puedes servir</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:18}}>
              {INSTRUMENTOS.map(instr=>{
                const selected=selectedInstr.includes(instr)
                return(
                  <button key={instr} onClick={()=>toggleInstr(instr)}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:11,background:selected?ACCENT:BG,border:selected?'none':`0.5px solid ${BORDER}`,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                    <span style={{fontSize:16}}>{INSTR_ICON[instr]}</span>
                    <span style={{fontSize:12,fontWeight:400,color:selected?'#F5F0E6':TXT}}>{INSTR_LABEL[instr]}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={async()=>{await saveProfile();setShowInstrumentos(false)}}
              style={{width:'100%',background:ACCENT,color:'#F5F0E6',border:'none',borderRadius:10,padding:'12px',fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* ── SHEET: Mi disponibilidad ── */}
      <AnimatePresence>
        {showDisponibilidad && (
          <div style={{position:'fixed',inset:0,zIndex:100}}>
            <motion.div onClick={()=>setShowDisponibilidad(false)}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)'}}/>
            <motion.div
              initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',bounce:0.8,duration:0.3}}
              style={{position:'absolute',bottom:0,left:0,right:0,background:NAV_BG,borderRadius:'20px 20px 0 0',padding:'20px 16px 40px',maxHeight:'85vh',overflowY:'auto'}}>
              <div style={{width:36,height:4,background:'#E0E0E0',borderRadius:2,margin:'0 auto 16px'}}/>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:15,fontWeight:500,color:TXT}}>Mi disponibilidad</div>
                <button onClick={()=>setShowDisponibilidad(false)} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:13,padding:4}}>Cerrar</button>
              </div>
              <div style={{fontSize:11,fontWeight:400,color:MUTED,marginBottom:16}}>Bloquea las fechas en que no puedas servir</div>
              <DisponibilidadCalendar token={token} darkMode={darkMode}/>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR (solo desktop) ── */}
      <div className="portal-sidebar" style={{position:'fixed',top:0,left:0,bottom:0,width:220,background:NAV_BG,borderRight:`0.5px solid ${BORDER}`,flexDirection:'column',padding:'20px 14px',zIndex:40}}>
        <div style={{marginBottom:28,paddingLeft:8}}>
          <img src="/logo-icon-green.png" alt="Áncora" style={{height:24,width:'auto',objectFit:'contain'}}/>
        </div>
        {([
          {key:'home',Icon:Home,label:'Inicio'},
          {key:'canciones',Icon:Music,label:'Canciones'},
          {key:'servicios',Icon:ClipboardList,label:'Servicios'},
          {key:'chats',Icon:MessageCircle,label:'Chats'},
          {key:'perfil',Icon:User,label:'Perfil'},
        ] as {key:Tab,Icon:typeof Home,label:string}[]).map(({key,Icon,label})=>(
          <motion.button key={key} onClick={()=>setTab(key)} whileTap={{scale:0.9}} transition={tapSpring}
            style={{display:'flex',alignItems:'center',gap:12,padding:'10px 10px',borderRadius:10,marginBottom:2,
              background:tab===key?(darkMode?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'):'none',
              border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left',width:'100%'}}>
            <span style={{position:'relative',display:'inline-flex'}}>
              <Icon size={19} strokeWidth={tab===key?2.2:1.7} color={tab===key?TXT:MUTED}/>
              {key==='chats'&&unreadChatIds.size>0&&(
                <span style={{position:'absolute',top:-2,right:-2,width:8,height:8,borderRadius:'50%',background:'#E24B4A',border:`1.5px solid ${NAV_BG}`}}/>
              )}
            </span>
            <span style={{fontSize:13,fontWeight:tab===key?500:400,color:tab===key?TXT:MUTED}}>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* ── BOTTOM NAV (solo mobile) ── */}
      <div className="portal-bottomnav" style={{position:'fixed',bottom:0,left:0,right:0,background:NAV_BG,borderTop:`0.5px solid ${BORDER}`,display:'flex',padding:'7px 0 18px',zIndex:50}}>
        {([
          {key:'home',Icon:Home,label:'Inicio'},
          {key:'canciones',Icon:Music,label:'Canciones'},
          {key:'servicios',Icon:ClipboardList,label:'Servicios'},
          {key:'chats',Icon:MessageCircle,label:'Chats'},
          {key:'perfil',Icon:User,label:'Perfil'},
        ] as {key:Tab,Icon:typeof Home,label:string}[]).map(({key,Icon,label})=>(
          <motion.button key={key} onClick={()=>setTab(key)} whileTap={{scale:0.88}} transition={tapSpring}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
            <span style={{position:'relative',display:'inline-flex'}}>
              <Icon size={22} strokeWidth={tab===key?2.2:1.7} color={tab===key?TXT:MUTED}/>
              {key==='chats'&&unreadChatIds.size>0&&(
                <span style={{position:'absolute',top:-2,right:-3,width:9,height:9,borderRadius:'50%',background:'#E24B4A',border:`1.5px solid ${NAV_BG}`}}/>
              )}
            </span>
            <span style={{fontSize:9,fontWeight:tab===key?500:400,color:tab===key?TXT:MUTED}}>{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
