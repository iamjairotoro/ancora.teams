'use client'
// La lista de chats (punto 54, commit 6): título «Chats», una tarjeta de «Mensajes» (el chat general y uno por servicio o ensayo donde participo) y una de «Directos» con «Nuevo mensaje directo». Cada fila:
// avatar, nombre, hora de la última línea (con el día de Chile: «Hoy» muestra la hora, «Ayer», el día) y la línea recortada con «…»; sin leer = nombre en negrita y un punto (con texto para el lector de pantalla). Los chats
// por EQUIPO no existen en este punto. Solo presentación: los datos y el estado vienen de PortalApp.
import { CalendarDays, Mic2, Users } from 'lucide-react'
import { etiquetaListaChat } from '@/lib/portal/chatTiempo'
import { fechaConDia } from '@/lib/portal/fechas'
import type { PersonaChat, PreviewChat, ServicioChat } from './tipos'
import ui from './chats.module.css'

export const iniciales = (p?: { nombre?: string | null; apellido?: string | null } | null) => `${p?.nombre?.[0] ?? ''}${p?.apellido?.[0] ?? ''}`.toLocaleUpperCase('es') || '?'

export function AvatarPersona({ p, chico = false }: { p?: PersonaChat | null; chico?: boolean }) {
  return <span className={`${ui.avatar} ${ui.avPersona}${chico ? ` ${ui.chico}` : ''}`} aria-hidden="true">{p?.avatar_url ? <img src={p.avatar_url} alt="" /> : iniciales(p)}</span>
}

function Fila({ avatar, nombre, extra, preview, hora, sinLeer, onAbrir }: { avatar: React.ReactNode; nombre: string; extra?: React.ReactNode; preview: string; hora: string; sinLeer: boolean; onAbrir: () => void }) {
  return (
    <li>
      <button type="button" className={`${ui.fila}${sinLeer ? ` ${ui.sinLeer}` : ''}`} onClick={onAbrir}>
        {avatar}
        <span className={ui.cuerpo}>
          <span className={ui.arriba}><span className={ui.nombre}>{nombre}</span>{extra}<span className={ui.hora}>{hora}</span></span>
          <span className={ui.linea}><span className={ui.preview}>{preview}</span>{sinLeer && <><span className={ui.punto} aria-hidden="true" /><span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Sin leer</span></>}</span>
        </span>
      </button>
    </li>
  )
}

const linea = (p?: PreviewChat) => (p ? `${p.memberName ? p.memberName + ': ' : ''}${p.content}` : null)

export default function ListaChats({ orgNombre, servicios, previews, sinLeer, directos, roster, yoId, dmId, onAbrir, onNuevoDirecto, nuevoRef }: {
  orgNombre: string | null
  servicios: ServicioChat[]
  previews: Record<string, PreviewChat>
  sinLeer: ReadonlySet<string>
  directos: string[]
  roster: PersonaChat[]
  yoId: string
  dmId: (a: string, b: string) => string
  onAbrir: (id: string) => void
  onNuevoDirecto: () => void
  nuevoRef?: React.Ref<HTMLButtonElement>
}) {
  const hora = (id: string) => (previews[id] ? etiquetaListaChat(previews[id].created_at) : '')
  return (
    <div className={ui.pantalla}>
      <h1 className={ui.titulo}>Chats</h1>
      <p className={ui.beta}><b>BETA</b>Los chats están en pruebas — si algo falla, avísanos.</p>

      <h2 className={ui.seccion}>Mensajes</h2>
      <ul className={ui.tarjeta}>
        <Fila avatar={<span className={`${ui.avatar} ${ui.avGeneral}`} aria-hidden="true"><Users size={20} /></span>} nombre={orgNombre || 'General'}
          preview={linea(previews['team']) ?? 'Sin mensajes aún'} hora={hora('team')} sinLeer={sinLeer.has('team')} onAbrir={() => onAbrir('team')} />
        {servicios.map(s => {
          const ensayo = s.tipo === 'ensayo'
          return <Fila key={s.id} avatar={<span className={`${ui.avatar}${ensayo ? ` ${ui.avEnsayo}` : ''}`} aria-hidden="true">{ensayo ? <Mic2 size={19} /> : <CalendarDays size={19} />}</span>}
            nombre={fechaConDia(s.fecha)} extra={ensayo ? <span className={ui.pill}>Ensayo</span> : null}
            preview={linea(previews[s.id]) ?? (s.titulo || 'Chatea con el equipo de este día')} hora={hora(s.id)} sinLeer={sinLeer.has(s.id)} onAbrir={() => onAbrir(s.id)} />
        })}
      </ul>
      {servicios.length === 0 && <p className={ui.vacio}>Cuando te convoquen a un servicio o ensayo, su chat va a aparecer aquí.</p>}

      <h2 className={ui.seccion}>Directos</h2>
      <ul className={ui.tarjeta}>
        {directos.map(pid => {
          const p = roster.find(r => r.id === pid), cid = dmId(yoId, pid)
          return <Fila key={pid} avatar={<AvatarPersona p={p} />} nombre={p ? `${p.nombre} ${p.apellido ?? ''}`.trim() : '…'} preview={linea(previews[cid]) ?? 'Escríbele'} hora={hora(cid)} sinLeer={sinLeer.has(cid)} onAbrir={() => onAbrir(cid)} />
        })}
        <li>
          <button ref={nuevoRef} type="button" className={ui.nuevo} onClick={onNuevoDirecto}><span className={ui.nuevoIco} aria-hidden="true">+</span>Nuevo mensaje directo</button>
        </li>
      </ul>
    </div>
  )
}
