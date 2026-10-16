'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DisponibilidadCalendar from '@/components/DisponibilidadCalendar'
import { Home, Music, ClipboardList, MessageCircle, User, Users, CalendarDays, Mic2, Heart, CalendarOff, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { LABEL_TECNICA } from '@/lib/equipos'
import { useDarkMode } from '@/lib/useDarkMode'
import { portalFetch } from '@/lib/portal/portalFetch'
import { C, mix, statusColors } from '@/lib/portal/theme'
import PortalLogo from './PortalLogo'
import PortalStatusFade from './PortalStatusFade'
import ui from './portal.module.css'
import PortalNav, { type PortalNavItem } from './PortalNav'
import CancionPortal from './CancionPortal'
import ReproductorFlotante, { type EstadoAudio, type ReproductorHandle } from './ReproductorFlotante'
import nav from './portal-nav.module.css'
import { extraerIdYoutube, urlAbrirEnYoutube } from '@/lib/youtube'
import { HojaDeConvocatoria, TarjetaConvocatoria, useConvocatorias } from './convocatorias'
import { Perfil, usePush, type Administracion, type EquipoPerfil } from './perfil'
import Canciones, { type Segmento } from './canciones/Canciones'
import { useCancionEnUrl } from './canciones/useCancionEnUrl'
import { cancionesDelProximoServicio } from '@/lib/portal/cancionesDelServicio'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'

// Types
interface Song { id:string;nombre:string;artista:string;tono_original?:string;bpm?:number;compas?:string;link_spotify?:string;link_letras?:string;link_recursos?:string;duracion_min?:number;notas?:string }
interface SetlistItem { orden:number;tono?:string;titulo?:string;tipo?:string;duracion_min?:number;song?:Song;lead?:{nombre:string} }
interface BandaItem { posicion:string;member_id?:string;member?:{nombre:string;apellido?:string} }
interface ServiceData { service:{id:string;fecha:string;titulo:string;hora_inicio?:string;hora_fin?:string;tipo?:string;lugar?:string};team?:{id:string;name:string;color:string|null}|null;reemplazadaPor?:{id:string;name:string}|null;posiciones:string[];invitation:{id?:string;status:string;token:string;sent_at?:string|null;needs_reassignment_confirm?:boolean;declined_reason?:string|null}|null;setlist:SetlistItem[];banda:BandaItem[];nominaSent?:boolean }
interface Member { id:string;nombre:string;apellido:string;email:string;telefono?:string;avatar_url?:string;fecha_nacimiento?:string;instrumentos?:string[];instalado_pwa_at?:string }

// Colores: solo tokens v5 (lib/portal/theme.ts). El acento sólido es --anc-accent en ambos temas.
const ACCENT=C.accent

type Tab = 'home'|'canciones'|'servicios'|'chats'|'perfil'


function toMMSS(min:number){const m=Math.floor(min),s=Math.round((min-m)*60);return`${m}:${s.toString().padStart(2,'0')}`}
function daysUntil(fecha:string){return Math.ceil((new Date(fecha+'T12:00:00').getTime()-Date.now())/(1000*60*60*24))}
function fmtLong(fecha:string){
  const d=new Date(fecha+'T12:00:00')
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return{dia:dias[d.getDay()],fecha:`${d.getDate()} de ${meses[d.getMonth()]}`,d}
}

function posLabel(p:string){ return LABEL_TECNICA[p] || p }


// token = token de invitación (/portal/<token>, enlace del correo) o null = identidad resuelta
// en el servidor (/portal: sesión de Google o enlace de acceso personal, punto 48).
export default function PortalApp({ token }: { token: string | null }) {
  const router = useRouter()
  const isMe = token === null
  const base = isMe ? '/portal' : `/portal/${token}`

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
  // Punto 52: un servicio puede traer varias tarjetas (una por equipo que me convocó). El chat es uno por servicio.
  const chatServices = services.filter(s=>s.posiciones.length>0||s.service.tipo==='ensayo').filter((s,i,arr)=>arr.findIndex(x=>x.service.id===s.service.id)===i)
  const [allServices, setAllServices] = useState<any[]>([])
  // Punto 59: el servidor decide si esta persona accede a la biblioteca (equipo con library_access u owner/admin) y lo
  // avisa en `libraryAccess`. Cierra por defecto: sin respuesta, sin Canciones, sin favoritas.
  const [libraryAccess, setLibraryAccess] = useState(false)
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [showFavoritos, setShowFavoritos] = useState(false)
  // Pestaña Canciones (punto 54, commit 2): el filtro vive aquí para que sobreviva a abrir una canción.
  const [segmentoCanciones, setSegmentoCanciones] = useState<Segmento>('todas')
  const [textoCanciones, setTextoCanciones] = useState('')
  // Pantalla de canción (punto 55): la fila de la lista la abre; el menú se esconde mientras se lee hacia abajo. La canción abierta vive en la URL (?cancion=<id>, punto 54, commit 2).
  const { cancionId, abrir:abrirEnUrl, cerrar:cerrarEnUrl, limpiar:limpiarUrl } = useCancionEnUrl()
  const [navHideSong, setNavHideSong] = useState(false)
  // De dónde se abrió la canción: el «volver» regresa ahí (la lista de Canciones o las favoritas del Inicio) y la lista recupera su posición.
  const songOrigen = useRef<'home'|'canciones'>('canciones')
  const scrollLista = useRef(0)
  // Reproductor flotante del archivo de audio (punto 55, paso 5): UNO solo para todo el portal; sigue sonando al cambiar de pestaña.
  const playerRef = useRef<ReproductorHandle>(null)
  const [audioActivo, setAudioActivo] = useState<EstadoAudio|null>(null)
  function abrirCancion(song:Song, origen:'home'|'canciones'){ songOrigen.current=origen; scrollLista.current=window.scrollY; setTab('canciones'); abrirEnUrl(song.id) }
  function volverDeCancion(){ cerrarEnUrl() }
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState<string|null>(null)
  const [obsComment, setObsComment] = useState('')
  const [showDisponibilidad, setShowDisponibilidad] = useState(false)
  // Perfil (punto 54, commit 1): lo resuelve el servidor y llega en la misma respuesta que `member`.
  const [equipos, setEquipos] = useState<EquipoPerfil[]>([])
  const [administracion, setAdministracion] = useState<Administracion|null>(null)
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
  const chatOpenRef = useRef<string|null>(null)
  chatOpenRef.current = chatOpen
  // Dark mode — persistido en members.theme (mismo hook que usa el admin),
  // así la misma persona ve lo mismo en el teléfono y el computador.
  // Opción `portal`: preferencia por /api/portal/preferencias (no por la llave pública).
  const { themePref, setThemePref } = useDarkMode(member?.id, { system: true, portal: { token } })

  // ── Notificaciones push (punto 54, commit 1: el hook vive en ./perfil/usePush; el service worker se registra al abrir el portal, no solo en el Perfil) ──
  const push = usePush(token, member?.id)
  const isStandalone = push.instalada

  // Si detectamos que la app corre "instalada" (agregada a la pantalla de
  // inicio) y todavía no lo teníamos registrado para este músico, lo guardamos
  // — así en el admin se puede ver cuánta gente la tiene instalada así.
  useEffect(()=>{
    if(!member?.id || !isStandalone || member.instalado_pwa_at) return
    // Lo escribe el servidor (identificado por cookie/Google o por el token de invitación).
    portalFetch(token,'/api/portal/visita',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({standalone:true})}).catch(()=>{})
  },[member?.id, isStandalone, token])

  // Colores: tokens v5 (lib/portal/theme.ts); el tema lo decide <html data-theme>, no este componente.
  // BG/CARD/TXT/MUTED/BORDER ya son tokens (var(--anc-*)): cambian solos con el tema.
  const BG = C.bg
  const CARD = C.card
  const TXT = C.ink
  const MUTED = C.muted
  const BORDER = C.rule
  // Fondo sólido/opaco para barras fijas (header y menú inferior) — CARD es translúcido
  // y sirve bien para tarjetas de contenido, pero una barra fija necesita ser opaca
  // para que el contenido que se desplaza detrás no se "filtre" visualmente.
  const NAV_BG = C.solid

  const loadData = useCallback(async()=>{
    const [portalRes, svcsRes] = await Promise.all([
      isMe ? fetch('/api/portal/me', { cache: 'no-store' }) : fetch(`/api/member-portal?token=${token}`),
      portalFetch(token,'/api/all-services'),
    ])
    // Sesión caída (enlace revocado o vencido): /portal vuelve a decidir qué mostrar.
    if(isMe && portalRes.status===401){
      // Sesión caída (revocada o vencida): se recarga UNA vez para que /portal decida; sin bucles.
      try{ const last=Number(sessionStorage.getItem('ancora-portal-401')||0); if(Date.now()-last>10000){ sessionStorage.setItem('ancora-portal-401',String(Date.now())); window.location.reload(); return } }catch{}
      setLoading(false); return
    }
    const data = await portalRes.json()
    if(!portalRes.ok||data.error){setLoading(false);return}
    setMember(data.member)
    const merged = [...(data.services||[]), ...(data.ensayos||[])].sort((a:any,b:any)=>a.service.fecha.localeCompare(b.service.fecha))
    setServices(merged)
    setEquipos(Array.isArray(data.equipos)?data.equipos:[])
    setAdministracion(data.administracion&&typeof data.administracion.destino==='string'?data.administracion:null)
    // Biblioteca (punto 59): sin acceso NO se piden ni el catálogo ni las favoritas (el servidor igual respondería 403),
    // el menú queda sin «Canciones» y una pestaña restaurada de la sesión cae a Inicio.
    const access = data.libraryAccess===true
    setLibraryAccess(access)
    if(access){
      const [songsRes, favRes] = await Promise.all([portalFetch(token,'/api/all-songs'), portalFetch(token,'/api/portal/favoritos')])
      const songsData=songsRes.ok?await songsRes.json():{songs:[]}
      setAllSongs(songsData.songs||[])
      const favData = favRes.ok ? await favRes.json() : {songIds:[]}
      setFavoriteIds(new Set<string>(favData.songIds||[]))
    }else{
      setAllSongs([]); setFavoriteIds(new Set<string>()); setShowFavoritos(false)
      setTab(t=>t==='canciones'?'home':t)
    }
    const svcsData=svcsRes.ok?await svcsRes.json():{services:[]}
    // Hasta el cierre de la convocatoria (fin del día en America/Santiago), con la misma regla que el servidor: no por hora de fin ni por el reloj del aparato.
    setAllServices((svcsData.services||[]).filter((s:any)=>!convocatoriaCerrada(s.fecha)))
    // last_seen lo escribe el servidor (ya no el navegador con la llave pública).
    portalFetch(token,'/api/portal/visita',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{})
    // Load date blocks
    const blocksRes=await portalFetch(token,'/api/portal/bloqueos')
    const blocksData=blocksRes.ok?await blocksRes.json():{blocks:[]}
    const blockMap:Record<string,any>={}
    ;(blocksData.blocks||[]).forEach((b:any)=>{const key=b.blocked_date||b.service?.fecha; if(key) blockMap[key]={reason:b.reason||'',start:b.start_date||key,end:b.end_date||key}})
    setDateBlocks(blockMap)
    setLoading(false)
  },[token,isMe])

  useEffect(()=>{loadData()},[loadData])
  // Punto 52: responder, «Aceptar aquí en su lugar» y «Quitar mi confirmación» (piezas reutilizables de ./convocatorias).
  const conv = useConvocatorias({ token, entradas: services, recargar: loadData })
  // La canción abierta, derivada de la URL: solo con acceso a la biblioteca y si existe en el catálogo.
  const openSong:Song|null = tab==='canciones'&&libraryAccess&&cancionId ? (allSongs.find(x=>x.id===cancionId)??null) : null
  const tabAnterior = useRef<Tab|null>(null)
  const cancionAnterior = useRef<string|null>(null)
  // (a) Un enlace o una recarga con ?cancion=… (o el botón adelante) llevan a la pestaña Canciones.
  const tabActual = useRef(tab); tabActual.current = tab
  useEffect(()=>{ if(cancionId&&libraryAccess&&tabActual.current!=='canciones') setTab('canciones') },[cancionId,libraryAccess])
  // (b) Sin acceso a la biblioteca, o una canción que no existe: se quita de la URL sin dejar rastro en el historial.
  useEffect(()=>{ if(!loading&&cancionId&&(!libraryAccess||!allSongs.some(x=>x.id===cancionId))) limpiarUrl() },[loading,cancionId,libraryAccess,allSongs,limpiarUrl])
  // (c) La canción es de la pestaña Canciones: al irse a otra pestaña se quita de la URL.
  useEffect(()=>{ if(tabAnterior.current==='canciones'&&tab!=='canciones'&&cancionId) limpiarUrl(); tabAnterior.current=tab },[tab,cancionId,limpiarUrl])
  // (d) Al cerrarse la canción (Volver, el gesto de volver o el botón atrás): al Inicio si se abrió desde sus favoritas; si no, la lista recupera su posición.
  useEffect(()=>{
    if(cancionAnterior.current&&!cancionId){
      if(songOrigen.current==='home') setTab('home')
      else requestAnimationFrame(()=>window.scrollTo(0,scrollLista.current))
    }
    cancionAnterior.current=cancionId
  },[cancionId])

  // ── Mensajes no leídos (burbuja roja en "Chats") ──
  function dmChatId(a:string,b:string){ return 'dm_'+[a,b].sort().join('_') }
  function dmPartnerFromChatId(chatId:string, myId:string): string|null {
    if(!chatId.startsWith('dm_')) return null
    const [a,b] = chatId.slice(3).split('_')
    return a===myId ? b : a
  }
  function myChatIds(): string[] {
    const svcIds = chatServices.map(s=>s.service.id)
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

  // Resumen del chat (punto 49): el servidor devuelve SOLO mis chats (equipo, mis servicios y mis
  // mensajes directos) con el último mensaje de cada uno, y las personas necesarias para mostrar
  // nombres / elegir a quién escribir. Se consulta al entrar, cada 45 s y al volver a la pestaña
  // — siempre con la pestaña visible.
  async function refreshChatSummary(){
    const myId = member?.id
    if(!myId) return
    const res = await portalFetch(token,'/api/portal/chat').catch(()=>null)
    if(!res?.ok) return
    const data = await res.json().catch(()=>null)
    if(!data?.chats) return
    const lastRead = getLastReadMap()
    const previews: Record<string,{content:string;memberName:string;memberId:string;created_at:string}> = {}
    const unread = new Set<string>()
    const partners = new Set<string>()
    for(const c of data.chats as any[]){
      if(c.kind==='dm' && c.partnerId) partners.add(c.partnerId)
      if(!c.last) continue
      previews[c.id] = { content:c.last.content, memberName:c.last.memberName||'', memberId:c.last.memberId, created_at:c.last.created_at }
      if(c.last.memberId===myId) continue
      if(!lastRead[c.id] || c.last.created_at > lastRead[c.id]) unread.add(c.id)
    }
    setTeamRoster((data.people||[]).filter((p:any)=>p.id!==myId))
    setDmPartnerIds(prev=>new Set([...Array.from(prev), ...Array.from(partners)])) // conserva los elegidos en el selector
    setChatPreviews(previews)
    setUnreadChatIds(unread)
  }

  useEffect(()=>{
    if(!member?.id) return
    const tick = ()=>{ if(document.visibilityState==='visible') refreshChatSummary() }
    tick()
    const iv = setInterval(tick, 45000)
    document.addEventListener('visibilitychange', tick)
    return ()=>{ clearInterval(iv); document.removeEventListener('visibilitychange', tick) }
  },[member?.id, token])

  // (Sin canal en tiempo real: los mensajes nuevos llegan por el sondeo del hilo abierto, ~5 s, y por
  // el del resumen, 45 s, ambos solo con la pestaña visible — ver arriba.)

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

  // Chat: al abrir uno, carga su historial y lo marca leído. Mientras está abierto y la pestaña
  // está VISIBLE, lo revisa cada ~5 s (y al volver a la pestaña): más lento que tiempo real, pero
  // 100% confiable. El mismo intervalo avisa al servidor qué chat estás mirando, para que no te
  // llegue push de algo que ya ves en vivo (chat-notify descarta pushes si la presencia es de
  // hace menos de 10 s).
  useEffect(()=>{
    if(tab!=='chats') return
    setChatMessages([])
    if(!chatOpen) return
    markChatRead(chatOpen)
    const tick = ()=>{
      if(document.visibilityState!=='visible') return
      loadChatMessages(); markChatRead(chatOpen); updatePresence(chatOpen)
    }
    tick()
    const interval = setInterval(tick, 5000)
    document.addEventListener('visibilitychange', tick)
    return ()=>{ clearInterval(interval); document.removeEventListener('visibilitychange', tick); updatePresence(null) }
  },[tab, chatOpen])

  async function updatePresence(chatId: string|null){
    if(!member?.id) return
    // La escribe el servidor con mi identidad (no mando ningún id de persona).
    await portalFetch(token,'/api/portal/chat/presencia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat:chatId})}).catch(()=>{})
  }

  useEffect(()=>{
    chatEndRef.current?.scrollIntoView({behavior:'smooth'})
  },[chatMessages])

  async function loadChatMessages(){
    const id = chatOpen
    if(!id || !member?.id) return
    const res = await portalFetch(token,`/api/portal/chat?chat=${encodeURIComponent(id)}`).catch(()=>null)
    if(!res?.ok) return
    const data = await res.json().catch(()=>null)
    if(!data?.messages || chatOpenRef.current!==id) return // cambió de chat mientras tanto
    // Los mensajes que acabo de enviar y aún no tienen su versión real se conservan.
    setChatMessages(prev=>{
      const pending = prev.filter(m=>m._tempId && !data.messages.some((d:any)=>d.member_id===m.member_id && d.content===m.content))
      return [...data.messages, ...pending]
    })
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

    // Lo inserta el servidor: el remitente sale de mi identidad, nunca de lo que mande el navegador.
    const res = await portalFetch(token,'/api/portal/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat:chatOpen,content})}).catch(()=>null)
    const body = res ? await res.json().catch(()=>({})) : {}

    if(!res?.ok || !body.message){
      console.error('Error al enviar mensaje:', res?.status)
      setChatMessages(prev=>prev.filter(m=>m._tempId!==tempId))
      setChatPreviews(prev=>{ const next={...prev}; delete next[chatOpen as string]; return next })
      setChatInput(prev=>prev||content) // no se pierde lo que escribió
      alert(body?.error && res && res.status<500 ? body.error : 'No se pudo enviar el mensaje. Intenta de nuevo.')
      return
    }

    // Reemplaza el mensaje optimista por el real (con su id definitivo, evita duplicado)
    setChatMessages(prev=>prev.map(m=>m._tempId===tempId?{...body.message, member:optimisticMsg.member}:m))

    // El aviso push lo dispara un trigger en Supabase apenas se guarda el mensaje (ver
    // supabase-schema-v14-chat-push-trigger.sql); se dispara igual cuando inserta el servidor.
  }

  async function toggleFavorite(songId:string){
    if(!member?.id) return
    const isFav=favoriteIds.has(songId)
    const apply=(on:boolean)=>setFavoriteIds(prev=>{const n=new Set(prev); on?n.add(songId):n.delete(songId); return n})
    apply(!isFav)
    try{
      const res = await portalFetch(token,'/api/portal/favoritos',{method:isFav?'DELETE':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({songId})})
      if(!res.ok) apply(isFav) // no se guardó: se deshace el cambio en pantalla
    }catch{ apply(isFav) }
  }

  // «Del domingo»: el orden del próximo servicio confirmado que aún no termina (hora de fin en America/Santiago).
  const delDomingo=useMemo(()=>cancionesDelProximoServicio<Song>(services as any, allSongs),[services,allSongs])
  const card:React.CSSProperties={background:CARD,borderRadius:13,marginBottom:8,overflow:'hidden',border:`0.5px solid ${BORDER}`}
  const sectionLabel:React.CSSProperties={fontSize:9,fontWeight:500,color:MUTED,letterSpacing:'1px',textTransform:'uppercase',padding:'4px 0 8px',display:'block'}
  const tapSpring={type:'spring' as const,stiffness:500,damping:25}

  if(loading) return(
    <div className="portal-root" style={{minHeight:'100vh',background:'var(--anc-bg)',backgroundAttachment:'fixed',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,border:`2px solid ${TXT}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  const today=new Date();today.setHours(0,0,0,0)

  // Menú: cuatro ítems sin acceso a la biblioteca (punto 59) y cinco con ella. Orden del punto 53.
  const navItems:PortalNavItem[]=[
    {key:'home',label:'Inicio',icon:Home},
    {key:'servicios',label:'Servicios',icon:ClipboardList},
    ...(libraryAccess?[{key:'canciones',label:'Canciones',icon:Music}]:[]),
    {key:'chats',label:'Chats',icon:MessageCircle,hasDot:unreadChatIds.size>0},
    {key:'perfil',label:'Perfil',icon:User},
  ]

  // El menú se esconde con un chat abierto y al desplazar la letra hacia abajo; el reproductor flotante baja con él.
  const menuOculto=(tab==='chats'&&!!chatOpen)||(tab==='canciones'&&!!openSong&&navHideSong)

  // ── RENDER ──
  return(
    <div className="portal-root" style={{minHeight:'100vh',background:'var(--anc-bg)',backgroundAttachment:'fixed',fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',paddingBottom:tab==='chats'&&chatOpen?0:'calc(var(--portal-nav-total) + 24px)'}}>
      <PortalStatusFade/>

      {/* TOP BAR (solo teléfono: en escritorio la marca y el perfil son piezas del menú) */}
      <div className={nav.topbar} style={{background:NAV_BG,borderBottom:`0.5px solid ${BORDER}`,padding:'calc(14px + var(--safe-top)) calc(16px + var(--safe-right)) 10px calc(16px + var(--safe-left))',position:'sticky',top:0,zIndex:'var(--z-nav)'}}>
        <div className="portal-content-wrap" style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:500,margin:'0 auto'}}>
          <div>
            <PortalLogo height={26}/>
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

      <div className="portal-content-wrap" style={{maxWidth:500,margin:'0 auto',padding:'12px calc(14px + var(--safe-right)) 12px calc(14px + var(--safe-left))'}}>

      {/* ── HOME ── */}
      {tab==='home'&&(()=>{
        const pendings = services.filter(s=>s.invitation?.status==='pendiente'&&!!s.invitation?.sent_at)
        const next = services[0]
        const weekEnd = new Date(today); weekEnd.setDate(today.getDate()+6)
        const thisWeek = allServices.filter((s:any)=>{const d=new Date(s.fecha+'T12:00:00');d.setHours(0,0,0,0);return d>=today&&d<=weekEnd})
        const weekServicios = thisWeek.filter((s:any)=>s.tipo!=='ensayo').length
        const weekEnsayos = thisWeek.filter((s:any)=>s.tipo==='ensayo').length
        const favSongs = allSongs.filter(s=>favoriteIds.has(s.id))

        return(
        <div>
          {/* Acción pendiente */}
          {pendings.map(pending=>(
            <div key={`${pending.service.id}-${pending.team?.id??''}`} style={{marginBottom:14}}>
              <div style={{background:CARD,borderRadius:14,padding:'12px 14px',border:`0.5px solid ${BORDER}`,display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <span style={{fontSize:18}}>⏳</span>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,fontWeight:500,color:TXT,margin:0}}>Te falta confirmar el {fmtLong(pending.service.fecha).dia} {fmtLong(pending.service.fecha).fecha}</p>
                  <p style={{fontSize:11,color:MUTED,margin:'2px 0 0'}}>{pending.service.titulo}{pending.team?` · ${pending.team.name}`:''}{pending.posiciones.length>0?` · ${pending.posiciones.map(posLabel).join(', ')}`:''}</p>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <motion.button onClick={()=>conv.responder(pending,'si')} disabled={conv.ocupado} whileTap={{scale:0.95}} transition={tapSpring}
                  style={{flex:1,background:C.okBg,color:C.ok,border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:600,fontFamily:'inherit',cursor:'pointer'}}>✓ Confirmo</motion.button>
                <motion.button onClick={()=>conv.responder(pending,'no')} disabled={conv.ocupado} whileTap={{scale:0.95}} transition={tapSpring}
                  style={{flex:1,background:C.noBg,color:C.no,border:'none',borderRadius:10,padding:10,fontSize:13,fontWeight:500,fontFamily:'inherit',cursor:'pointer'}}>✗ No puedo</motion.button>
              </div>
            </div>
          ))}
          {conv.errorRespuesta&&pendings.length>0&&<p role="alert" style={{fontSize:12,fontWeight:600,color:C.no,margin:'-6px 0 14px'}}>{conv.errorRespuesta}</p>}

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
              <motion.div style={{...card,cursor:'pointer',marginBottom:14}} onClick={()=>router.push(`${base}/servicio/${next.service.id}${next.team?`?equipo=${next.team.id}`:''}`)} whileTap={{scale:0.97}} transition={tapSpring}>
                <div style={{padding:'13px 14px'}}>
                  <div style={{fontSize:15,fontWeight:500,color:TXT,marginBottom:2}}>{fmtLong(next.service.fecha).dia} {fmtLong(next.service.fecha).fecha}</div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:8}}>
                    {next.service.hora_inicio?`${next.service.hora_inicio.slice(0,5)} hrs`:''}{next.service.lugar?` · ${next.service.lugar}`:''}
                  </div>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                    {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:C.peBg,color:C.pe,padding:'2px 8px',borderRadius:20}}>Ensayo</span>}
                    {next.team&&<span style={{fontSize:10,fontWeight:600,color:TXT,border:`0.5px solid ${BORDER}`,padding:'2px 8px',borderRadius:20}}>{next.team.name}</span>}
                    {next.posiciones.map(p=><span key={p} style={{fontSize:10,fontWeight:500,background:ACCENT,color:C.onAccent,padding:'2px 8px',borderRadius:20}}>{posLabel(p)}</span>)}
                    {next.invitation&&<span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,
                      ...statusColors(next.invitation.status,next.invitation.needs_reassignment_confirm)}}>
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
          <div style={{display:'grid',gridTemplateColumns:libraryAccess?'1fr 1fr':'1fr',gap:8,marginBottom:libraryAccess&&showFavoritos&&favSongs.length>0?8:0}}>
            <motion.button onClick={()=>setShowDisponibilidad(true)} whileTap={{scale:0.95}} transition={tapSpring}
              style={{...card,padding:'11px 12px',display:'flex',alignItems:'center',gap:8,border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <CalendarOff size={17} color={TXT}/>
              <span style={{fontSize:11,color:TXT}}>Bloquear fecha</span>
            </motion.button>
            {libraryAccess&&<motion.button onClick={()=>setShowFavoritos(v=>!v)} whileTap={{scale:0.95}} transition={tapSpring}
              style={{...card,padding:'11px 12px',display:'flex',alignItems:'center',gap:8,border:showFavoritos?`0.5px solid ${ACCENT}`:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <Heart size={17} color={showFavoritos?C.accent:TXT} fill={showFavoritos?C.accent:'none'}/>
              <span style={{fontSize:11,color:TXT,flex:1,textAlign:'left'}}>Favoritos</span>
              <motion.span animate={{rotate:showFavoritos?180:0}} transition={tapSpring} style={{display:'inline-flex'}}>
                <ChevronDown size={13} color={MUTED}/>
              </motion.span>
            </motion.button>}
          </div>

          {libraryAccess&&showFavoritos&&(
            favSongs.length===0?(
              <div style={{...card,padding:'16px',textAlign:'center'}}>
                <p style={{fontSize:11,color:MUTED}}>Aún no tienes favoritos — marca canciones con ♥ en la pestaña Canciones.</p>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {favSongs.map(song=>(
                  <div key={song.id} style={{...card,display:'flex',alignItems:'center',gap:2}}>
                    <button onClick={()=>abrirCancion(song,'home')} aria-label={`Abrir ${song.nombre}`}
                      style={{flex:1,minWidth:0,minHeight:44,textAlign:'left',padding:'9px 4px 9px 12px',display:'flex',alignItems:'center',gap:9,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,color:TXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{song.nombre}</div>
                        <div style={{fontSize:10,color:MUTED}}>{song.artista}{song.tono_original?` · Tono ${song.tono_original}`:''}</div>
                      </div>
                      <span style={{fontSize:10,color:MUTED}} aria-hidden="true">›</span>
                    </button>
                    {extraerIdYoutube(song.link_spotify)&&<a href={urlAbrirEnYoutube(extraerIdYoutube(song.link_spotify)!)} target="_blank" rel="noopener noreferrer" aria-label={`Escuchar ${song.nombre} en YouTube`} style={{fontSize:14,textDecoration:'none',padding:'0 6px'}}>▶️</a>}
                    {song.link_letras&&<a href={song.link_letras} target="_blank" rel="noopener noreferrer" aria-label={`Letra de ${song.nombre}`} style={{fontSize:14,textDecoration:'none',padding:'0 8px 0 0'}}>📄</a>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
        )
      })()}

      {/* ── CANCIONES (punto 54, commit 2): la canción abierta vive en la URL (?cancion=<id>); la lista es el componente ./canciones ── */}
      {tab==='canciones'&&libraryAccess&&(openSong?(
        <CancionPortal token={token} song={openSong} onVolver={volverDeCancion} onOcultarMenu={setNavHideSong}
          audioActivo={audioActivo} onReproducirAudio={p=>playerRef.current?.reproducir(p)}/>
      ):cancionId&&!loading?null:(
        <Canciones catalogo={allSongs} favoritas={favoriteIds} delDomingo={delDomingo} segmento={segmentoCanciones} onSegmento={setSegmentoCanciones}
          texto={textoCanciones} onTexto={setTextoCanciones} onAbrir={c=>abrirCancion(c,'canciones')} onFavorita={toggleFavorite}/>
      ))}

      {/* ── SERVICIOS ── */}
      {tab==='servicios'&&(
        <div>
          {allServices.length===0?(
            <div style={{...card,padding:24,textAlign:'center'}}>
              <p style={{fontSize:12,fontWeight:400,color:MUTED}}>No hay servicios programados próximamente.</p>
            </div>
          ):(
            allServices.flatMap((svc:any)=>{ const mias=services.filter(s=>s.service.id===svc.id); return (mias.length?mias:[undefined]).map((md:ServiceData|undefined)=>({svc,md})) }).map(({svc,md:myData}:{svc:any;md:ServiceData|undefined}, svcIndex:number)=>{
              const days=daysUntil(svc.fecha)
              const isEnsayo=svc.tipo==='ensayo'
              const isAssigned=isEnsayo?!!myData:(!!myData&&myData.posiciones.length>0)
              const nominaSent=myData?.nominaSent??false
              const isFirst=svcIndex===0
              const d=new Date(svc.fecha+'T12:00:00')

              // Punto 52: cada convocatoria de un EQUIPO es una tarjeta con sus propias acciones (Confirmo, Quitar mi confirmación, Aceptar aquí en su lugar).
              if(myData?.team&&myData.invitation) return(
                <div key={`${svc.id}-${myData.team.id}`}>
                  {svcIndex===1&&<span style={sectionLabel}>Próximos eventos</span>}
                  <TarjetaConvocatoria entrada={myData} c={conv} onAbrir={()=>router.push(`${base}/servicio/${svc.id}?equipo=${myData.team!.id}`)}/>
                </div>
              )

              if(isFirst) return(
                <div key={`${svc.id}-${myData?.team?.id??''}`} style={{background:C.hero,borderRadius:16,overflow:'hidden',marginBottom:20,cursor:'pointer'}}
                  onClick={()=>router.push(`${base}/servicio/${svc.id}${myData?.team?`?equipo=${myData.team.id}`:''}`)}>
                  <div style={{padding:'16px 16px 14px'}}>
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      <span style={{display:'inline-flex',alignItems:'center',background:mix(C.onHero,12),borderRadius:20,padding:'3px 10px'}}>
                        <span style={{fontSize:9,fontWeight:500,color:mix(C.onHero,80),letterSpacing:'0.5px'}}>{days===0?'Hoy':days===1?'Mañana':days>0?`En ${days} días`:''}</span>
                      </span>
                      {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:C.peBg,color:C.pe,borderRadius:20,padding:'3px 10px'}}>Ensayo</span>}
                      {myData?.team&&<span style={{fontSize:9,fontWeight:600,background:mix(C.onHero,12),color:mix(C.onHero,80),borderRadius:20,padding:'3px 10px'}}>{myData.team.name}</span>}
                    </div>
                    <div style={{fontSize:20,fontWeight:400,color:C.onHero,letterSpacing:'-0.3px',marginBottom:4,lineHeight:1.2,textTransform:'capitalize' as const}}>
                      {new Date(svc.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
                    </div>
                    <div style={{fontSize:11,fontWeight:400,color:mix(C.onHero,62),marginBottom:14}}>
                      {svc.hora_inicio?`${svc.hora_inicio.slice(0,5)} hrs${svc.lugar?` · ${svc.lugar}`:''}`:'Ancora - Services'}
                    </div>

                    {isAssigned ? (
                      <div style={{background:mix(C.onHero,8),borderRadius:10,padding:'10px 12px',marginBottom:10}}>
                        <p style={{fontSize:8,fontWeight:600,color:mix(C.onHero,62),letterSpacing:1,textTransform:'uppercase' as const,margin:'0 0 5px'}}>Tu rol</p>
                        {myData!.posiciones.length>0?(
                          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                            {myData!.posiciones.map((p:string)=><span key={p} style={{fontSize:12,fontWeight:600,background:mix(C.onHero,15),color:C.onHero,padding:'3px 10px',borderRadius:20}}>{posLabel(p)}</span>)}
                          </div>
                        ):(
                          <p style={{fontSize:13,fontWeight:500,color:C.onHero,margin:0}}>Convocado a este ensayo</p>
                        )}
                      </div>
                    ):(
                      <p style={{fontSize:11,color:mix(C.onHero,62),marginBottom:10}}>{!isEnsayo&&!nominaSent?'Nominación pendiente':'No convocado'}</p>
                    )}

                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      {myData?.invitation?(
                        <span style={{fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,
                          ...statusColors(myData.invitation.status,myData.invitation.needs_reassignment_confirm)}}>
                          {myData.invitation.needs_reassignment_confirm?'Tu rol cambió — aún no confirmas':myData.invitation.status==='confirmado'?'✓ Confirmado':myData.invitation.status==='declinado'?'✗ Declinado':'⏳ Pendiente'}
                        </span>
                      ):<span/>}
                      <span style={{fontSize:11,color:mix(C.onHero,62)}}>Ver detalle ›</span>
                    </div>
                  </div>
                </div>
              )

              return(
                <div key={`${svc.id}-${myData?.team?.id??''}`}>
                  {svcIndex===1&&<span style={sectionLabel}>Próximos eventos</span>}
                  <div style={{...card,cursor:'pointer',marginBottom:6}} onClick={()=>router.push(`${base}/servicio/${svc.id}${myData?.team?`?equipo=${myData.team.id}`:''}`)}>
                    <div style={{padding:'11px 13px',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,background:BG,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0,border:`0.5px solid ${BORDER}`}}>
                        <span style={{fontSize:14,fontWeight:600,color:TXT,lineHeight:1}}>{d.getDate()}</span>
                        <span style={{fontSize:7,color:MUTED,textTransform:'uppercase'}}>{d.toLocaleString('es-CL',{month:'short'})}</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:400,color:TXT}}>{fmtLong(svc.fecha).dia} {fmtLong(svc.fecha).fecha}</div>
                        <div style={{display:'flex',gap:4,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                          {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:C.peBg,color:C.pe,padding:'1px 6px',borderRadius:20}}>Ensayo</span>}
                          {myData?.team&&<span style={{fontSize:9,fontWeight:600,color:TXT,border:`0.5px solid ${BORDER}`,padding:'1px 6px',borderRadius:20}}>{myData.team.name}</span>}
                          {isAssigned&&myData!.posiciones.map((p:string)=><span key={p} style={{fontSize:9,fontWeight:500,background:ACCENT,color:C.onAccent,padding:'1px 6px',borderRadius:20}}>{posLabel(p)}</span>)}
                          {myData?.invitation&&<span style={{fontSize:9,fontWeight:500,padding:'1px 6px',borderRadius:20,
                            ...statusColors(myData.invitation.status,myData.invitation.needs_reassignment_confirm)}}>
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
          <div style={{display:'flex',alignItems:'center',gap:6,background:C.peBg,border:`0.5px solid ${mix(C.pe,30)}`,borderRadius:10,padding:'8px 12px',marginBottom:12}}>
            <span style={{fontSize:9,fontWeight:700,color:C.pe,letterSpacing:'0.5px',background:C.peBg,padding:'2px 7px',borderRadius:20}}>BETA</span>
            <span style={{fontSize:11,fontWeight:400,color:MUTED}}>Los chats están en pruebas — si algo falla, avísanos.</span>
          </div>
          <div style={{position:'relative',minHeight:chatOpen?'calc(100dvh - 130px - var(--safe-top))':'calc(100vh - 130px)',overflow:'hidden'}}>
          <AnimatePresence initial={false}>
          {!chatOpen?(
            // Lista de chats — estilo iOS
            <motion.div key="chat-list" initial={{x:0,opacity:1}} animate={{x:0,opacity:1}} exit={{x:'-30%',opacity:0}} transition={{type:'spring',bounce:0.3,duration:0.35}} style={{position:'absolute',inset:0,overflowY:'auto',paddingBottom:'calc(96px + var(--safe-bottom))'}}>
              <span style={sectionLabel}>Mensajes</span>
              <div style={{display:'flex',flexDirection:'column',gap:1}}>
                {/* Chat general del equipo */}
                <button onClick={()=>setChatOpen('team')}
                  style={{background:CARD,border:'none',cursor:'pointer',fontFamily:'inherit',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,borderRadius:13,marginBottom:6,width:'100%',textAlign:'left'}}>
                  <div style={{width:44,height:44,borderRadius:'50%',background:C.hero,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Users size={20} color={C.onHero}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:2}}>
                      <span style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:14,fontWeight:500,color:TXT}}>Ancora - Services</span>
                        {unreadChatIds.has('team')&&<span style={{width:8,height:8,borderRadius:'50%',background:C.no,flexShrink:0}}/>}
                      </span>
                      <span style={{fontSize:10,fontWeight:400,color:MUTED}}>{chatPreviews['team']?new Date(chatPreviews['team'].created_at).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}):''}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:400,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {chatPreviews['team']?`${chatPreviews['team'].memberName}: ${chatPreviews['team'].content}`:'Sin mensajes aún'}
                    </div>
                  </div>
                  <span style={{fontSize:16,color:C.faint}}>›</span>
                </button>

                {/* Chats por servicio — uno por cada servicio/ensayo donde participo */}
                {chatServices.map(({service:svc})=>{
                  const isEnsayo=svc.tipo==='ensayo'
                  const {dia,fecha}=fmtLong(svc.fecha)
                  return(
                    <button key={svc.id} onClick={()=>setChatOpen(svc.id)}
                      style={{background:CARD,border:'none',cursor:'pointer',fontFamily:'inherit',padding:'12px 14px',display:'flex',alignItems:'center',gap:12,borderRadius:13,marginBottom:6,width:'100%',textAlign:'left'}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:isEnsayo?C.peBg:BG,border:`0.5px solid ${isEnsayo?'transparent':BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isEnsayo?<Mic2 size={19} color={C.pe}/>:<CalendarDays size={19} color={TXT}/>}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                          <span style={{fontSize:14,fontWeight:500,color:TXT}}>{dia} {fecha}</span>
                          {isEnsayo&&<span style={{fontSize:9,fontWeight:600,background:C.peBg,color:C.pe,padding:'1px 6px',borderRadius:20}}>Ensayo</span>}
                          {unreadChatIds.has(svc.id)&&<span style={{width:8,height:8,borderRadius:'50%',background:C.no,flexShrink:0}}/>}
                        </div>
                        <div style={{fontSize:12,fontWeight:400,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {chatPreviews[svc.id]?`${chatPreviews[svc.id].memberName}: ${chatPreviews[svc.id].content}`:(svc.titulo||'Toca para chatear con el equipo de este día')}
                        </div>
                      </div>
                      <span style={{fontSize:16,color:C.faint}}>›</span>
                    </button>
                  )
                })}
                {chatServices.length===0&&(
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
                      <div style={{width:44,height:44,borderRadius:'50%',background:C.accent,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {partner?.avatar_url
                          ? <img src={partner.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                          : <span style={{fontSize:14,fontWeight:600,color:C.onAccent}}>{partner?.nombre?.[0]}{partner?.apellido?.[0]||''}</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:2}}>
                          <span style={{fontSize:14,fontWeight:500,color:TXT}}>{partner?partner.nombre+' '+partner.apellido:'…'}</span>
                          {unreadChatIds.has(cid)&&<span style={{width:8,height:8,borderRadius:'50%',background:C.no,flexShrink:0}}/>}
                        </div>
                        <div style={{fontSize:12,fontWeight:400,color:MUTED,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {preview?`${preview.memberName}: ${preview.content}`:'Toca para escribirle'}
                        </div>
                      </div>
                      <span style={{fontSize:16,color:C.faint}}>›</span>
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
                <button onClick={()=>setChatOpen(null)} aria-label="Volver a los chats" style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:TXT,minWidth:44,minHeight:44,display:'flex',alignItems:'center',justifyContent:'flex-start',padding:0}}>‹</button>
                {(()=>{
                  if(chatOpen==='team') return(
                    <>
                      <div style={{width:32,height:32,borderRadius:'50%',background:C.hero,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Users size={15} color={C.onHero}/></div>
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
                        <div style={{width:32,height:32,borderRadius:'50%',background:C.accent,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          {partner?.avatar_url
                            ? <img src={partner.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                            : <span style={{fontSize:12,fontWeight:600,color:C.onAccent}}>{partner?.nombre?.[0]}{partner?.apellido?.[0]||''}</span>}
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
                      <div style={{width:32,height:32,borderRadius:'50%',background:isEnsayo?C.peBg:BG,border:`0.5px solid ${isEnsayo?'transparent':BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isEnsayo?<Mic2 size={14} color={C.pe}/>:<CalendarDays size={14} color={TXT}/>}</div>
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
                            <p style={{fontSize:15,fontWeight:400,color:isMe?C.onAccent:TXT,lineHeight:1.35}}>{msg.content}</p>
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
                <div style={{borderTop:`0.5px solid ${BORDER}`,padding:'10px 13px calc(10px + var(--safe-bottom))',display:'flex',gap:7,alignItems:'center'}}>
                  <input value={chatInput} maxLength={2000} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}
                    placeholder="Escribe un mensaje..." style={{flex:1,border:'none',outline:'none',fontSize:16,fontFamily:'inherit',color:TXT,background:'transparent',fontWeight:400}}/>
                  <button onClick={sendChat} disabled={!chatInput.trim()||sendingChat}
                    style={{width:32,height:32,borderRadius:'50%',background:chatInput.trim()?ACCENT:C.sunk,border:'none',cursor:chatInput.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:C.onAccent}}>
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
        <div style={{position:'fixed',inset:0,zIndex:'var(--z-sheet)',display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div onClick={()=>setShowDmPicker(false)} className={ui.scrim}/>
          <div style={{position:'relative',zIndex:'var(--z-sheet)',width:'100%',maxWidth:480,background:CARD,borderRadius:'16px 16px 0 0',padding:'20px calc(16px + var(--safe-right)) calc(28px + var(--safe-bottom)) calc(16px + var(--safe-left))',maxHeight:'75vh',overflowY:'auto'}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.ring,margin:'0 auto 16px'}}/>
            <p style={{fontSize:13,fontWeight:600,color:TXT,marginBottom:10}}>Escribirle a...</p>
            {teamRoster.map(r=>(
              <button key={r.id} onClick={()=>{
                  const cid = dmChatId(member?.id||'', r.id)
                  setDmPartnerIds(prev=>new Set(prev).add(r.id))
                  setShowDmPicker(false)
                  setChatOpen(cid)
                }}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'10px 6px',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:C.accent,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {r.avatar_url
                    ? <img src={r.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <span style={{fontSize:13,fontWeight:600,color:C.onAccent}}>{r.nombre?.[0]}{r.apellido?.[0]||''}</span>}
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

      {/* ── PERFIL (punto 54, commit 1): componente suelto, ver ./perfil ── */}
      {tab==='perfil'&&(
        <Perfil token={token} esSesion={isMe} persona={member||{}} equipos={equipos} administracion={administracion} themePref={themePref} onThemePref={setThemePref}
          push={push} onGuardado={c=>setMember((prev:any)=>prev?{...prev,...c}:prev)} onFoto={url=>setMember((prev:any)=>prev?{...prev,avatar_url:url}:prev)}/>
      )}

      </div>

      {/* ── SHEET: Mi disponibilidad ── */}
      <AnimatePresence>
        {showDisponibilidad && (
          <div style={{position:'fixed',inset:0,zIndex:'var(--z-sheet)'}}>
            <motion.div onClick={()=>setShowDisponibilidad(false)}
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className={ui.scrim}/>
            <motion.div
              initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',bounce:0.8,duration:0.3}}
              style={{position:'absolute',zIndex:'var(--z-sheet)',bottom:0,left:0,right:0,background:NAV_BG,borderRadius:'20px 20px 0 0',padding:'20px calc(16px + var(--safe-right)) calc(40px + var(--safe-bottom)) calc(16px + var(--safe-left))',maxHeight:'85vh',overflowY:'auto'}}>
              <div style={{width:36,height:4,background:C.ring,borderRadius:2,margin:'0 auto 16px'}}/>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:15,fontWeight:500,color:TXT}}>Mi disponibilidad</div>
                <button onClick={()=>setShowDisponibilidad(false)} style={{background:'none',border:'none',cursor:'pointer',color:MUTED,fontSize:13,padding:4}}>Cerrar</button>
              </div>
              <div style={{fontSize:11,fontWeight:400,color:MUTED,marginBottom:16}}>Bloquea las fechas en que no puedas servir</div>
              <DisponibilidadCalendar token={token}/>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MENÚ (punto 53): uno solo, montado una vez; teléfono = píldora inferior, escritorio = píldora superior ── */}
      {/* Reproductor del audio propio: capa 29, sobre el menú; baja con él cuando se esconde y sube si hay un chat abierto. */}
      {libraryAccess&&<ReproductorFlotante ref={playerRef} token={token} menuOculto={menuOculto} arriba={tab==='chats'&&!!chatOpen} onEstado={setAudioActivo}/>}

      <HojaDeConvocatoria c={conv}/>

      <PortalNav items={navItems} active={tab} onSelect={k=>setTab(k as Tab)} hidden={menuOculto}
        profile={member?.avatar_url?<img src={member.avatar_url} alt=""/>:<span aria-hidden="true">{member?.nombre?.[0]}</span>}
        onProfile={()=>setTab('perfil')}/>
    </div>
  )
}
