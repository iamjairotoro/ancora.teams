'use client'
// La pestaña Chats del portal (punto 54, commit 6): la lista (ListaChats) o, con un chat abierto, su vista (VistaChat); y la hoja para iniciar un mensaje directo. SOLO presentación: lo que sigue en PortalApp es el estado, el
// sondeo de mensajes y del resumen, la presencia, los no leídos (localStorage) y el envío optimista. Tres tipos de chat, como hoy: el general (con el nombre de la organización, o «General»), uno por servicio o ensayo y los directos.
// Los chats por EQUIPO quedan fuera de este punto.
import { useRef } from 'react'
import { CalendarDays, Mic2, Users } from 'lucide-react'
import { fechaConDia } from '@/lib/portal/fechas'
import ListaChats, { AvatarPersona } from './ListaChats'
import VistaChat from './VistaChat'
import HojaDirecto from './HojaDirecto'
import type { MensajeChat, PersonaChat, PreviewChat, ServicioChat } from './tipos'
import ui from './chats.module.css'

export type { MensajeChat, PersonaChat, PreviewChat, ServicioChat } from './tipos'

export default function Chats({ abierto, onAbrir, onCerrar, orgNombre, servicios, previews, sinLeer, directos, roster, yoId, dmId, dmPartner, mensajes, texto, onTexto, onEnviar, enviando, finRef, selectorAbierto, onSelector, onElegirDirecto }: {
  abierto: string | null
  onAbrir: (id: string) => void
  onCerrar: () => void
  orgNombre: string | null
  /** Los servicios y ensayos donde participo (cada uno tiene su chat). */
  servicios: ServicioChat[]
  previews: Record<string, PreviewChat>
  sinLeer: ReadonlySet<string>
  /** Ids de las personas con quienes ya hay un directo. */
  directos: string[]
  roster: PersonaChat[]
  yoId: string
  dmId: (a: string, b: string) => string
  dmPartner: (chatId: string, yoId: string) => string | null
  mensajes: MensajeChat[]
  texto: string
  onTexto: (t: string) => void
  onEnviar: () => void
  enviando: boolean
  finRef: React.RefObject<HTMLDivElement>
  selectorAbierto: boolean
  onSelector: (abierto: boolean) => void
  onElegirDirecto: (personaId: string) => void
}) {
  const nuevoRef = useRef<HTMLButtonElement>(null)

  // quién es el interlocutor de la vista abierta
  let avatar: React.ReactNode = null, titulo = '', subtitulo = ''
  if (abierto) {
    const socio = dmPartner(abierto, yoId)
    if (abierto === 'team') {
      avatar = <span className={`${ui.avatar} ${ui.chico} ${ui.avGeneral}`} aria-hidden="true"><Users size={17} /></span>; titulo = orgNombre || 'General'; subtitulo = 'Chat general'
    } else if (socio) {
      const p = roster.find(r => r.id === socio)
      avatar = <AvatarPersona p={p} chico />; titulo = p ? `${p.nombre} ${p.apellido ?? ''}`.trim() : '…'; subtitulo = 'Mensaje directo'
    } else {
      const s = servicios.find(x => x.id === abierto), ensayo = s?.tipo === 'ensayo'
      avatar = <span className={`${ui.avatar} ${ui.chico}${ensayo ? ` ${ui.avEnsayo}` : ''}`} aria-hidden="true">{ensayo ? <Mic2 size={16} /> : <CalendarDays size={16} />}</span>
      titulo = s ? fechaConDia(s.fecha) : 'Chat'; subtitulo = ensayo ? 'Chat del ensayo' : 'Chat del servicio'
    }
  }

  return (
    <>
      {abierto
        ? <VistaChat avatar={avatar} titulo={titulo} subtitulo={subtitulo} mensajes={mensajes} yoId={yoId} texto={texto} onTexto={onTexto} onEnviar={onEnviar} enviando={enviando} onVolver={onCerrar} finRef={finRef} />
        : <ListaChats orgNombre={orgNombre} servicios={servicios} previews={previews} sinLeer={sinLeer} directos={directos} roster={roster} yoId={yoId} dmId={dmId} onAbrir={onAbrir} onNuevoDirecto={() => onSelector(true)} nuevoRef={nuevoRef} />}
      {selectorAbierto && (
        <HojaDirecto personas={roster} onElegir={onElegirDirecto}
          onCerrar={() => { onSelector(false); setTimeout(() => nuevoRef.current?.focus(), 0) }} />
      )}
    </>
  )
}
