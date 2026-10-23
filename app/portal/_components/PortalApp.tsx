'use client'
import { fichasFavoritas } from '@/lib/home/favoritos'
import { diasBloqueadosEnAlguno } from '@/lib/home/calendario'
import { avisar } from '@/lib/ventanas/ventanas'
import { TEXTOS } from '@/lib/textos/comun'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Music, ClipboardList, MessageCircle, User } from 'lucide-react'
import { useDarkMode } from '@/lib/useDarkMode'
import { portalFetch } from '@/lib/portal/portalFetch'
import PortalStatusFade from './PortalStatusFade'
import ui from './portal.module.css'
import PortalNav, { type PortalNavItem } from './PortalNav'
import CancionPortal from './CancionPortal'
import ReproductorFlotante, { type EstadoAudio, type ReproductorHandle } from './ReproductorFlotante'
import nav from './portal-nav.module.css'
import { extraerIdYoutube, urlAbrirEnYoutube } from '@/lib/youtube'
import { HojaDeConvocatoria, useConvocatorias } from './convocatorias'
import { Servicios, type EntradaServicioPortal, type SegmentoServicios } from './servicios'
import { Inicio } from './inicio'
import { BotonModo } from '@/components/modo'
import { botonDelPortal } from '@/lib/modo'
import type { Cumple } from '@/lib/portal/cumpleanos'
import { diasParaMostrar, estadoTras, type EstadoBloqueos } from '@/lib/portal/bloqueosCarga'
import type { BandaPortal, Vacante } from '@/lib/portal/equipoServicio'
import Disponibilidad, { type Equipo as EquipoBloqueo } from './disponibilidad/Disponibilidad'
import { diasBloqueadosParaTodos } from '@/lib/portal/diasBloqueados'
import { Perfil, usePush, type Administracion, type EquipoPerfil } from './perfil'
import Canciones, { type Segmento } from './canciones/Canciones'
import { usePortalUrl } from './usePortalUrl'
import Chats from './chats/Chats'
import { Servicio, type PanelServicio } from './servicio'
import { cancionesDelProximoServicio } from '@/lib/portal/cancionesDelServicio'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'

// Types
interface Song { id:string;nombre:string;artista:string;tono_original?:string;bpm?:number;compas?:string;link_spotify?:string;link_letras?:string;link_recursos?:string;duracion_min?:number;notas?:string }
interface SetlistItem { orden:number;tono?:string;titulo?:string;tipo?:string;duracion_min?:number;song?:Song;lead?:{nombre:string} }
interface BandaItem { posicion:string;member_id?:string;member?:{nombre:string;apellido?:string} }
interface ServiceData { service:{id:string;fecha:string;titulo:string;hora_inicio?:string;hora_fin?:string;tipo?:string;lugar?:string};team?:{id:string;name:string;color:string|null}|null;reemplazadaPor?:{id:string;name:string}|null;posiciones:string[];invitation:{id?:string;status:string;token:string;sent_at?:string|null;needs_reassignment_confirm?:boolean;declined_reason?:string|null}|null;setlist:any[];banda:BandaPortal[];vacantes?:Vacante[];cronograma?:{hora:string|null;texto:string}[];nominaSent?:boolean }
interface Member { id:string;nombre:string;apellido:string;email:string;telefono?:string;avatar_url?:string;fecha_nacimiento?:string;instrumentos?:string[];instalado_pwa_at?:string }

type Tab = 'home'|'canciones'|'servicios'|'chats'|'perfil'


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
  const [errorCarga, setErrorCarga] = useState<null|'agenda'|'canciones'>(null)      // lo que no cargó: la agenda (servicios, convocatorias) o el catálogo de canciones
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
  // Pestaña Canciones (punto 54, commit 2): el filtro vive aquí para que sobreviva a abrir una canción.
  const [segmentoCanciones, setSegmentoCanciones] = useState<Segmento>('todas')
  const [textoCanciones, setTextoCanciones] = useState('')
  // Pantalla de canción (punto 55): la fila de la lista la abre; el menú se esconde mientras se lee hacia abajo. La canción abierta vive en la URL (?cancion=<id>, punto 54, commit 2).
  // Lo abierto vive en la URL (punto 54, commits 2 y 5): ?servicio=<id>&equipo=<id> y ?cancion=<id> (ver ./usePortalUrl).
  const { servicioId, equipoId, cancionId, chatId, abrirServicio:abrirServicioEnUrl, abrirCancion:abrirCancionEnUrl, abrirChat, cerrarServicio, cerrarCancion, cerrarChat, limpiarCancion:limpiarUrl, limpiarServicio, limpiarChat } = usePortalUrl()
  const [panelServicio, setPanelServicio] = useState<PanelServicio>('orden')
  const [navHideSong, setNavHideSong] = useState(false)
  // De dónde se abrió la canción: el «volver» regresa ahí (la lista de Canciones o las favoritas del Inicio) y la lista recupera su posición.
  const songOrigen = useRef<'canciones'|'servicio'>('canciones')
  const scrollLista = useRef(0)
  const scrollServicios = useRef(0)
  // Reproductor flotante del archivo de audio (punto 55, paso 5): UNO solo para todo el portal; sigue sonando al cambiar de pestaña.
  const playerRef = useRef<ReproductorHandle>(null)
  const [audioActivo, setAudioActivo] = useState<EstadoAudio|null>(null)
  function abrirCancion(song:Song){ songOrigen.current='canciones'; scrollLista.current=window.scrollY; setTab('canciones'); abrirCancionEnUrl(song.id) }
  // Una canción abierta desde el Orden de un servicio: la URL conserva el servicio y «Volver» regresa a él.
  function abrirCancionDeServicio(id:string){ songOrigen.current='servicio'; scrollLista.current=window.scrollY; abrirCancionEnUrl(id) }
  function volverDeCancion(){ cerrarCancion() }
  // De dónde se abrió el servicio: el «volver» regresa ahí (la lista de Servicios o el Inicio) y esa pantalla recupera su posición.
  const [servicioOrigen,setServicioOrigen]=useState<'home'|'servicios'>('servicios')
  function abrirServicio(id:string, equipo?:string|null, origen:'home'|'servicios'='servicios'){ scrollServicios.current=window.scrollY; setServicioOrigen(origen); setPanelServicio('orden'); setTab('servicios'); abrirServicioEnUrl(id,equipo) }
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState<string|null>(null)
  const [obsComment, setObsComment] = useState('')
  // Disponibilidad (commit 4): las filas de bloqueos viven aquí para que Servicios sepa qué días quedaron bloqueados sin volver a pedirlas.
  // `estado`: si los bloqueos NO cargaron, Disponibilidad avisa (con «Reintentar») y Servicios no marca ningún día: nada se dibuja como «libre» (lib/portal/bloqueosCarga.ts).
  const [bloqueos, setBloqueos] = useState<{filas:any[];equipos:EquipoBloqueo[];estado:EstadoBloqueos}>({filas:[],equipos:[],estado:'cargando'})
  const [segServicios, setSegServicios] = useState<SegmentoServicios>(()=>{
    // /portal/<token>/disponibilidad (enlace viejo) redirige aquí y deja la marca para abrir directo la pestaña.
    try{ if(typeof window!=='undefined' && sessionStorage.getItem('ancora-servicios-seg')==='disponibilidad'){ sessionStorage.removeItem('ancora-servicios-seg'); return 'disponibilidad' } }catch{}
    return 'convocatorias'
  })
  // Perfil (punto 54, commit 1): lo resuelve el servidor y llega en la misma respuesta que `member`.
  const [equipos, setEquipos] = useState<EquipoPerfil[]>([])
  const [administracion, setAdministracion] = useState<Administracion|null>(null)
  // Week calendar state

  // Chat
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  // El chat abierto vive en la URL (?chat=<id>, commit 6): abrirlo empuja una entrada de historial y cerrarlo (botón «‹ Chats», atrás del navegador, gesto del iPhone) la retrocede; el efecto de abajo
  // que depende de `chatOpen` marca leído, avisa la presencia y la QUITA al cerrarse, venga el cierre de donde venga.
  const chatOpen = chatId
  const setChatOpen = (id:string|null)=>{ if(id) abrirChat(id); else cerrarChat() }
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set())
  const [chatPreviews, setChatPreviews] = useState<Record<string,{content:string;memberName:string;memberId:string;created_at:string}>>({})
  const [dmPartnerIds, setDmPartnerIds] = useState<Set<string>>(new Set())
  const [teamRoster, setTeamRoster] = useState<{id:string;nombre:string;apellido:string;avatar_url:string|null}[]>([])
  const [showDmPicker, setShowDmPicker] = useState(false)
  const [cumpleanos, setCumpleanos] = useState<Cumple[]>([])      // Inicio: cumpleaños de quienes comparten equipo (solo día y mes)
  const [orgNombre, setOrgNombre] = useState<string|null>(null)      // el nombre del chat general (la organización); sin él, «General»
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

  const cargarBloqueos=useCallback(async()=>{
    const res=await portalFetch(token,'/api/portal/bloqueos').catch(()=>null)
    const d=res?.ok?await res.json().catch(()=>null):null
    const cargo=!!d&&Array.isArray(d.blocks)
    setBloqueos(p=>cargo?{filas:d.blocks,equipos:d.teams||[],estado:estadoTras(p.estado,true)}:{...p,estado:estadoTras(p.estado,false)})
    return cargo
  },[token])
  const diasBloqueados=useMemo(()=>diasParaMostrar(bloqueos.estado,diasBloqueadosParaTodos(bloqueos.filas,bloqueos.equipos)),[bloqueos])
  const loadData = useCallback(async()=>{
    setErrorCarga(null)
    try{
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
    // Si no cargó la agenda se dice («Reintentar»): antes se veía el mensaje de «no tienes nada» como si no hubiera servicios.
    if(!portalRes.ok||data.error){ console.error('[portal] no se pudo cargar la agenda: respondió',portalRes.status); setErrorCarga('agenda'); setTab(t=>t==='servicios'?t:'home'); setLoading(false); return }
    setMember(data.member)
    const merged = [...(data.services||[]), ...(data.ensayos||[])].sort((a:any,b:any)=>a.service.fecha.localeCompare(b.service.fecha))
    setServices(merged)
    setEquipos(Array.isArray(data.equipos)?data.equipos:[])
    setAdministracion(data.administracion&&typeof data.administracion.destino==='string'?data.administracion:null)
    setCumpleanos(Array.isArray(data.cumpleanos)?data.cumpleanos:[])
    // Biblioteca (punto 59): sin acceso NO se piden ni el catálogo ni las favoritas (el servidor igual respondería 403),
    // el menú queda sin «Canciones» y una pestaña restaurada de la sesión cae a Inicio.
    const access = data.libraryAccess===true
    setLibraryAccess(access)
    if(access){
      const [songsRes, favRes] = await Promise.all([portalFetch(token,'/api/all-songs'), portalFetch(token,'/api/portal/favoritos')])
      if(!songsRes.ok){ console.error('[portal] no se pudo cargar el catálogo de canciones: respondió',songsRes.status); setErrorCarga(p=>p??'canciones') }
      const songsData=songsRes.ok?await songsRes.json():{songs:[]}
      setAllSongs(songsData.songs||[])
      const favData = favRes.ok ? await favRes.json() : {songIds:[]}
      setFavoriteIds(new Set<string>(favData.songIds||[]))
    }else{
      setAllSongs([]); setFavoriteIds(new Set<string>())
      setTab(t=>t==='canciones'?'home':t)
    }
    const svcsData=svcsRes.ok?await svcsRes.json():{services:[]}
    // Hasta el cierre de la convocatoria (fin del día en America/Santiago), con la misma regla que el servidor: no por hora de fin ni por el reloj del aparato.
    setAllServices((svcsData.services||[]).filter((s:any)=>!convocatoriaCerrada(s.fecha)))
    // last_seen lo escribe el servidor (ya no el navegador con la llave pública).
    portalFetch(token,'/api/portal/visita',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).catch(()=>{})
    // Load date blocks
    await cargarBloqueos()
    setLoading(false)
    }catch(e:any){ console.error('[portal] no se pudo cargar:',e?.message||e); setErrorCarga('agenda'); setTab(t=>t==='servicios'?t:'home'); setLoading(false) }
  },[token,isMe,cargarBloqueos])

  useEffect(()=>{loadData()},[loadData])
  // Punto 52: responder, «Aceptar aquí en su lugar» y «Quitar mi confirmación» (piezas reutilizables de ./convocatorias).
  const conv = useConvocatorias({ token, entradas: services, recargar: loadData })
  // Servicios (commit 3): una entrada por tarjeta y una vacía por cada servicio sin convocatoria para la persona, como las ve la pantalla.
  const entradasServicios = useMemo<EntradaServicioPortal[]>(()=>allServices.flatMap((svc:any):EntradaServicioPortal[]=>{
    const mias=services.filter(x=>x.service.id===svc.id)
    return mias.length?mias:[{service:svc,team:null,posiciones:[],invitation:null}]
  }),[allServices,services])
  // La canción abierta, derivada de la URL: solo con acceso a la biblioteca y si existe en el catálogo.
  const openSong:Song|null = libraryAccess&&cancionId&&(tab==='canciones'||(tab==='servicios'&&!!servicioId)) ? (allSongs.find(x=>x.id===cancionId)??null) : null
  // El servicio abierto (?servicio=…&equipo=…): la tarjeta de ESE equipo; sin equipo (o uno que no existe), la primera del servicio.
  const entradaServicio = servicioId ? (services.find(x=>x.service.id===servicioId&&equipoId&&x.team?.id===equipoId) ?? services.find(x=>x.service.id===servicioId) ?? entradasServicios.find(x=>x.service.id===servicioId) ?? null) : null
  const abribles = useMemo<ReadonlySet<string>>(()=>new Set(allSongs.map(x=>x.id)),[allSongs])
  const tabAnterior = useRef<Tab|null>(null)
  const cancionAnterior = useRef<string|null>(null)
  // (a) Un enlace o una recarga con ?cancion=… (o el botón adelante) llevan a la pestaña Canciones.
  const tabActual = useRef(tab); tabActual.current = tab
  useEffect(()=>{ if(cancionId&&libraryAccess&&!servicioId&&tabActual.current!=='canciones') setTab('canciones') },[cancionId,libraryAccess,servicioId])
  // (a2) Un enlace, una recarga o el botón adelante con ?servicio=… llevan a la pestaña Servicios.
  useEffect(()=>{ if(servicioId&&tabActual.current!=='servicios') setTab('servicios') },[servicioId])
  // (a3) Un enlace, una recarga o el botón adelante con ?chat=… llevan a la pestaña Chats.
  useEffect(()=>{ if(chatId&&tabActual.current!=='chats') setTab('chats') },[chatId])
  // (b) Sin acceso a la biblioteca, o una canción que no existe: se quita de la URL sin dejar rastro en el historial.
  useEffect(()=>{ if(!loading&&cancionId&&(!libraryAccess||!allSongs.some(x=>x.id===cancionId))) limpiarUrl() },[loading,cancionId,libraryAccess,allSongs,limpiarUrl])
  // (c) La canción es de la pestaña Canciones: al irse a otra pestaña se quita de la URL.
  useEffect(()=>{
    // lo abierto pertenece a su pestaña: la canción a Canciones (o a Servicios si se abrió desde un servicio) y el servicio a Servicios
    if(tabAnterior.current==='servicios'&&tab!=='servicios'&&servicioId) limpiarServicio()
    else if(tabAnterior.current==='canciones'&&tab!=='canciones'&&cancionId&&!servicioId) limpiarUrl()
    if(tabAnterior.current==='chats'&&tab!=='chats'&&chatId) limpiarChat()
    tabAnterior.current=tab
  },[tab,cancionId,servicioId,chatId,limpiarUrl,limpiarServicio,limpiarChat])
  // (d) Al cerrarse la canción (Volver, el gesto de volver o el botón atrás): la pantalla de donde se abrió (la lista de Canciones o el servicio) recupera su posición.
  useEffect(()=>{
    if(cancionAnterior.current&&!cancionId){
      requestAnimationFrame(()=>window.scrollTo(0,scrollLista.current))      // Canciones, o el servicio de donde se abrió
    }
    cancionAnterior.current=cancionId
  },[cancionId])
  // (e) Entrar a un servicio muestra su pantalla desde arriba; al volver, la lista recupera su posición.
  const servicioAnterior = useRef<string|null>(null)
  useEffect(()=>{
    if(servicioId&&!servicioAnterior.current) window.scrollTo(0,0)
    else if(!servicioId&&servicioAnterior.current){ if(servicioOrigen==='home') setTab('home'); requestAnimationFrame(()=>window.scrollTo(0,scrollServicios.current)) }
    servicioAnterior.current=servicioId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[servicioId])

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
    setOrgNombre(typeof data.orgNombre==='string'&&data.orgNombre.trim()?data.orgNombre.trim():null)
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
    if(res&&(res.status===403||res.status===400)){ if(chatOpenRef.current===id) limpiarChat(); return }      // un ?chat= que no es mío o no existe: se quita de la URL sin dejar rastro
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
      await avisar(body?.error && res && res.status<500 ? body.error : 'No se pudo enviar el mensaje. Intenta de nuevo.')
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

  if(loading) return(
    <div className={`portal-root ${ui.cargando}`}><div className={ui.giro} role="status" aria-label="Cargando"/></div>
  )

  // Menú: cuatro ítems sin acceso a la biblioteca (punto 59) y cinco con ella. Orden del punto 53.
  const navItems:PortalNavItem[]=[
    {key:'home',label:'Inicio',icon:Home},
    {key:'servicios',label:'Servicios',icon:ClipboardList},
    ...(libraryAccess?[{key:'canciones',label:'Canciones',icon:Music}]:[]),
    {key:'chats',label:'Chats',icon:MessageCircle,hasDot:unreadChatIds.size>0},
    {key:'perfil',label:'Perfil',icon:User},
  ]

  // El menú se esconde con un chat abierto y al desplazar la letra hacia abajo; el reproductor flotante baja con él.
  const menuOculto=(tab==='chats'&&!!chatOpen)||(!!openSong&&navHideSong)

  // El aviso de «no se pudo cargar» con «Reintentar» (el mismo bloque de «No encontramos este servicio»).
  const bloqueError=(texto:string)=>(
    <div className={ui.noEncontrado} role="alert">
      <p>{texto}</p>
      <button type="button" onClick={()=>{ void loadData() }}>{TEXTOS.reintentar}</button>
    </div>
  )

  // ── RENDER ──
  return(
    <div className={`portal-root ${ui.raiz}${tab==='chats'&&chatOpen?` ${ui.raizChat}`:''}`}>
      <PortalStatusFade/>

      {/* Sin barra superior en el teléfono (punto 54, commit 7): cada pantalla lleva su título grande, el saludo vive en Inicio y el perfil es una pestaña del menú; el margen de la muesca lo pone `.contenido`. En escritorio la marca y el perfil son piezas del menú. */}
      <div className={`portal-content-wrap ${ui.contenido}`}>

      {/* ── INICIO (punto 54, commit 7): componente suelto, ver ./inicio ── */}
      {tab==='home'&&(errorCarga==='agenda'?bloqueError('No se pudo cargar tu agenda. '+TEXTOS.revisaConexion):(
        <Inicio nombre={member?.nombre||''} administracion={administracion} entradas={services} conv={conv} cumpleanos={cumpleanos}
          onAbrirServicio={(id,eq)=>abrirServicio(id,eq,'home')} onIrServicios={()=>{setSegServicios('convocatorias');setTab('servicios')}}
          equipos={equipos} favoritas={libraryAccess?fichasFavoritas(allSongs,favoriteIds):null} diasBloqueados={diasParaMostrar(bloqueos.estado,diasBloqueadosEnAlguno(bloqueos.filas))}
          onAbrirCancion={id=>{const c=allSongs.find(x=>x.id===id); if(c) abrirCancion(c)}} onVerFavoritas={()=>{setSegmentoCanciones('favoritas');setTab('canciones')}}/>
      ))}

      {/* ── CANCIONES (punto 54, commit 2): la canción abierta vive en la URL (?cancion=<id>); la lista es el componente ./canciones ── */}
      {tab==='canciones'&&libraryAccess&&(openSong?(
        <CancionPortal token={token} song={openSong} onVolver={volverDeCancion} onOcultarMenu={setNavHideSong}
          audioActivo={audioActivo} onReproducirAudio={p=>playerRef.current?.reproducir(p)}/>
      ):cancionId&&!loading?null:errorCarga?bloqueError(errorCarga==='canciones'?'No se pudieron cargar las canciones. '+TEXTOS.revisaConexion:'No se pudo cargar tu agenda. '+TEXTOS.revisaConexion):(
        <Canciones catalogo={allSongs} favoritas={favoriteIds} delDomingo={delDomingo} segmento={segmentoCanciones} onSegmento={setSegmentoCanciones}
          texto={textoCanciones} onTexto={setTextoCanciones} onAbrir={c=>abrirCancion(c)} onFavorita={toggleFavorite}/>
      ))}

      {/* ── SERVICIOS (punto 54, commits 3 a 5): la lista agrupada por día (./servicios) y, con ?servicio=… en la URL, la pantalla del servicio (./servicio). Una canción abierta desde su Orden vive en la misma URL. ── */}
      {tab==='servicios'&&(servicioId?(
        openSong?(
          <CancionPortal token={token} song={openSong} onVolver={volverDeCancion} etiquetaVolver="Volver" onOcultarMenu={setNavHideSong}
            audioActivo={audioActivo} onReproducirAudio={p=>playerRef.current?.reproducir(p)}/>
        ):cancionId&&!loading?null:entradaServicio?(
          <Servicio entrada={entradaServicio} yoId={member?.id} libraryAccess={libraryAccess} abribles={abribles} conv={conv}
            panel={panelServicio} onPanel={setPanelServicio} onVolver={cerrarServicio} etiquetaVolver={servicioOrigen==='home'?'Inicio':'Servicios'} onAbrirCancion={abrirCancionDeServicio}/>
        ):loading?null:(
          <div className={ui.noEncontrado}>
            <p>No encontramos este servicio.</p>
            <button type="button" onClick={cerrarServicio}>Volver a Servicios</button>
          </div>
        )
      ):errorCarga==='agenda'?bloqueError('No se pudo cargar tu agenda. '+TEXTOS.revisaConexion):(
        <Servicios entradas={entradasServicios} conv={conv} bloqueados={diasBloqueados} segmento={segServicios} onSegmento={setSegServicios}
          onAbrir={e=>abrirServicio(e.service.id,e.team?.id)} onAbrirFila={(id,equipo)=>abrirServicio(id,equipo)}
          disponibilidad={<Disponibilidad token={token} servicios={allServices} filas={bloqueos.filas} equipos={bloqueos.equipos} estado={bloqueos.estado}
            onFilas={f=>setBloqueos(p=>({...p,filas:f(p.filas)}))} onRecargar={cargarBloqueos}/>}/>
      ))}

      {/* ── CHATS ── */}
      {/* ── CHATS (punto 54, commit 6): la presentación vive en ./chats; aquí quedan el estado, el sondeo, la presencia, los no leídos y el envío optimista ── */}
      {tab==='chats'&&member?.id&&(
        <Chats abierto={chatOpen} onAbrir={setChatOpen} onCerrar={()=>setChatOpen(null)} orgNombre={orgNombre}
          servicios={chatServices.map(s=>({id:s.service.id,fecha:s.service.fecha,titulo:s.service.titulo,tipo:s.service.tipo}))}
          previews={chatPreviews} sinLeer={unreadChatIds} directos={Array.from(dmPartnerIds)} roster={teamRoster} yoId={member.id}
          dmId={dmChatId} dmPartner={dmPartnerFromChatId} mensajes={chatMessages} texto={chatInput} onTexto={setChatInput} onEnviar={sendChat}
          enviando={sendingChat} finRef={chatEndRef} selectorAbierto={showDmPicker} onSelector={setShowDmPicker}
          onElegirDirecto={id=>{ setDmPartnerIds(prev=>new Set(prev).add(id)); setShowDmPicker(false); setChatOpen(dmChatId(member.id,id)) }}/>
      )}

      {/* ── PERFIL (punto 54, commit 1): componente suelto, ver ./perfil ── */}
      {tab==='perfil'&&(
        <Perfil token={token} esSesion={isMe} persona={member||{}} equipos={equipos} themePref={themePref} onThemePref={setThemePref}
          push={push} onGuardado={c=>setMember((prev:any)=>prev?{...prev,...c}:prev)} onFoto={url=>setMember((prev:any)=>prev?{...prev,avatar_url:url}:prev)}/>
      )}

      </div>

      {/* ── MENÚ (punto 53): uno solo, montado una vez; teléfono = píldora inferior, escritorio = píldora superior ── */}
      {/* Reproductor del audio propio: capa 29, sobre el menú; baja con él cuando se esconde y sube si hay un chat abierto. */}
      {libraryAccess&&<ReproductorFlotante ref={playerRef} token={token} menuOculto={menuOculto} arriba={tab==='chats'&&!!chatOpen} onEstado={setAudioActivo}/>}

      <HojaDeConvocatoria c={conv}/>

      <PortalNav items={navItems} active={tab} onSelect={k=>setTab(k as Tab)} hidden={menuOculto}
        profile={member?.avatar_url?<img src={member.avatar_url} alt=""/>:<span aria-hidden="true">{member?.nombre?.[0]}</span>}
        onProfile={()=>setTab('perfil')} modo={<BotonModo modo={botonDelPortal(administracion)}/>}/>
    </div>
  )
}
