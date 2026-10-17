'use client'
// La vista de un chat (punto 54, commit 6): cabecera con «‹ Chats», los mensajes (burbujas con el día y la hora de Chile, separadores «Hoy» / «Ayer» / fecha) y el campo de envío. En el teléfono ocupa TODA la pantalla y su alto
// sigue al viewport VISIBLE (visualViewport): cuando sale el teclado, el campo de envío queda encima. Solo presentación: el sondeo, la presencia, los no leídos y el envío optimista siguen en PortalApp.
import { useEffect, useRef } from 'react'
import { ArrowUp, ChevronLeft } from 'lucide-react'
import { diaDeChat, horaChat, separadorDiaChat } from '@/lib/portal/chatTiempo'
import { iniciales } from './ListaChats'
import type { MensajeChat } from './tipos'
import ui from './chats.module.css'

export default function VistaChat({ avatar, titulo, subtitulo, mensajes, yoId, texto, onTexto, onEnviar, enviando, onVolver, finRef }: {
  avatar: React.ReactNode
  titulo: string
  subtitulo: string
  mensajes: MensajeChat[]
  yoId: string
  texto: string
  onTexto: (t: string) => void
  onEnviar: () => void
  enviando: boolean
  onVolver: () => void
  finRef: React.RefObject<HTMLDivElement>
}) {
  const raiz = useRef<HTMLDivElement>(null)

  // El alto de la vista = el del viewport visible (con el teclado abierto es menor que 100dvh en iOS). Sin visualViewport, queda 100dvh (CSS). La página de atrás no se desplaza mientras tanto.
  useEffect(() => {
    const el = raiz.current, vv = typeof window !== 'undefined' ? window.visualViewport : null
    const previo = document.body.style.overflow; document.body.style.overflow = 'hidden'
    const ajustar = () => { if (!el || !vv) return; el.style.setProperty('--vv-h', `${vv.height}px`); el.style.setProperty('--vv-top', `${vv.offsetTop}px`); finRef.current?.scrollIntoView({ block: 'end' }) }
    ajustar()
    vv?.addEventListener('resize', ajustar); vv?.addEventListener('scroll', ajustar)
    return () => { vv?.removeEventListener('resize', ajustar); vv?.removeEventListener('scroll', ajustar); document.body.style.overflow = previo; el?.style.removeProperty('--vv-h'); el?.style.removeProperty('--vv-top') }
  }, [finRef])

  let diaAnterior = ''
  return (
    <div ref={raiz} className={ui.vista}>
      <div className={ui.cabeza}>
        <button type="button" className={ui.atras} onClick={onVolver} aria-label="Volver a los chats"><ChevronLeft size={22} aria-hidden="true" />Chats</button>
        {avatar}
        <span className={ui.quien}><b>{titulo}</b><span>{subtitulo}</span></span>
      </div>
      <div className={ui.mensajes} role="log" aria-live="polite" aria-label={`Mensajes de ${titulo}`}>
        {mensajes.length === 0 && <p className={ui.sinMensajes}>Aún no hay mensajes.<br />¡Sé el primero en escribir!</p>}
        {mensajes.map((m, i) => {
          const yo = m.member_id === yoId, dia = diaDeChat(m.created_at)
          const sep = dia && dia !== diaAnterior ? separadorDiaChat(m.created_at) : null
          diaAnterior = dia || diaAnterior
          return (
            <div key={m.id ?? i} style={{ display: 'contents' }}>
              {sep && <span className={ui.dia}>{sep}</span>}
              <div className={`${ui.msg}${yo ? ` ${ui.msgYo}` : ''}`}>
                {!yo && <span className={ui.msgAv} aria-hidden="true">{m.member?.avatar_url ? <img src={m.member.avatar_url} alt="" /> : iniciales({ nombre: m.member?.nombre })}</span>}
                <div className={ui.msgCaja}>
                  {!yo && m.member?.nombre && <span className={ui.autor}>{m.member.nombre}</span>}
                  <p className={ui.burbuja}>{m.content}</p>
                  <span className={ui.horaMsg}>{horaChat(m.created_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={finRef} />
      </div>
      <div className={ui.compositor}>
        <input className={ui.campo} value={texto} maxLength={2000} onChange={e => onTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) onEnviar() }} placeholder="Escribe un mensaje..." aria-label="Escribe un mensaje" enterKeyHint="send" />
        <button type="button" className={ui.enviar} onClick={onEnviar} disabled={!texto.trim() || enviando} aria-label="Enviar mensaje"><ArrowUp size={20} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
