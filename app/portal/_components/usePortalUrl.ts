'use client'
// Lo que está abierto en el portal vive en la URL (punto 54, commits 2, 5 y 6): `?servicio=<id>&equipo=<id>` (un servicio), `?cancion=<id>` (una canción, sola o dentro de un servicio) y `?chat=<id>` (un chat). Así el gesto de volver del iPhone y el
// botón atrás del navegador cierran lo último que se abrió, un enlace o una recarga reabren lo mismo y las demás pestañas no se enteran. Usa la API nativa del historial (Next 14 la integra con su router, sin pedir
// nada al servidor) y escucha popstate. Entrar a un servicio o a una canción EMPUJA una entrada de historial; «Volver» retrocede esa entrada (o, si se llegó por enlace o recarga, reemplaza la URL por la de más afuera).
import { useCallback, useEffect, useRef, useState } from 'react'

interface Vista { servicio: string | null; equipo: string | null; cancion: string | null; chat: string | null }
const VACIA: Vista = { servicio: null, equipo: null, cancion: null, chat: null }
const ruta = () => window.location.pathname      // la URL de la pantalla actual (/portal o /portal/<token>): solo cambian los parámetros
const leer = (): Vista => {
  if (typeof window === 'undefined') return VACIA
  const q = new URLSearchParams(window.location.search)
  const servicio = q.get('servicio')
  return { servicio, equipo: servicio ? q.get('equipo') : null, cancion: q.get('cancion'), chat: q.get('chat') }
}
const url = (v: Vista) => {
  const q = new URLSearchParams()
  if (v.servicio) { q.set('servicio', v.servicio); if (v.equipo) q.set('equipo', v.equipo) }
  if (v.cancion) q.set('cancion', v.cancion)
  if (v.chat) q.set('chat', v.chat)
  const s = q.toString()
  return s ? `${ruta()}?${s}` : ruta()
}
const igual = (a: Vista, b: Vista) => a.servicio === b.servicio && a.equipo === b.equipo && a.cancion === b.cancion && a.chat === b.chat

export function usePortalUrl() {
  const [vista, setVista] = useState<Vista>(VACIA)
  const actual = useRef<Vista>(VACIA)
  const empujada = useRef({ servicio: false, cancion: false, chat: false })      // ¿esta pantalla empujó la entrada de historial de lo que está abierto?
  const fijar = useCallback((v: Vista) => { actual.current = v; setVista(prev => (igual(prev, v) ? prev : v)) }, [])

  useEffect(() => {
    fijar(leer())
    const alNavegar = () => { empujada.current = { servicio: false, cancion: false, chat: false }; fijar(leer()) }
    window.addEventListener('popstate', alNavegar)
    return () => window.removeEventListener('popstate', alNavegar)
  }, [fijar])

  const empujar = useCallback((v: Vista, que: 'servicio' | 'cancion' | 'chat') => { window.history.pushState(null, '', url(v)); empujada.current[que] = true; fijar(v) }, [fijar])
  const reemplazar = useCallback((v: Vista) => { window.history.replaceState(null, '', url(v)); fijar(v) }, [fijar])

  const abrirServicio = useCallback((id: string, equipo?: string | null) => empujar({ servicio: id, equipo: equipo ?? null, cancion: null, chat: null }, 'servicio'), [empujar])
  const abrirChat = useCallback((id: string) => empujar({ ...VACIA, chat: id }, 'chat'), [empujar])
  const abrirCancion = useCallback((id: string) => empujar({ ...actual.current, cancion: id }, 'cancion'), [empujar])

  /** «Volver» del servicio: retrocede la entrada que se empujó; si no la hay (enlace, recarga, adelante), deja la URL de la lista. */
  const cerrarServicio = useCallback(() => {
    if (empujada.current.servicio) { empujada.current = { servicio: false, cancion: false, chat: false }; window.history.back(); return }
    empujada.current = { servicio: false, cancion: false, chat: false }; reemplazar(VACIA)
  }, [reemplazar])
  /** «Volver» de la canción: igual, pero deja el servicio (si lo había) abierto. */
  const cerrarCancion = useCallback(() => {
    if (empujada.current.cancion) { empujada.current.cancion = false; window.history.back(); return }
    reemplazar({ ...actual.current, cancion: null })
  }, [reemplazar])

  /** «Volver» del chat (o «‹ Chats»): retrocede la entrada que se empujó; si se llegó por enlace o recarga, deja la URL de la lista. Es lo mismo que el atrás del navegador y el gesto del iPhone. */
  const cerrarChat = useCallback(() => {
    if (empujada.current.chat) { empujada.current.chat = false; window.history.back(); return }
    reemplazar({ ...actual.current, chat: null })
  }, [reemplazar])

  /** Quitan lo abierto de la URL SIN dejar rastro en el historial (otra pestaña, sin acceso, algo que no existe). */
  const limpiarCancion = useCallback(() => { empujada.current.cancion = false; if (actual.current.cancion) reemplazar({ ...actual.current, cancion: null }) }, [reemplazar])
  const limpiarChat = useCallback(() => { empujada.current.chat = false; if (actual.current.chat) reemplazar({ ...actual.current, chat: null }) }, [reemplazar])
  const limpiarServicio = useCallback(() => { empujada.current = { servicio: false, cancion: false, chat: false }; if (actual.current.servicio || actual.current.cancion) reemplazar(VACIA) }, [reemplazar])

  return { servicioId: vista.servicio, equipoId: vista.equipo, cancionId: vista.cancion, chatId: vista.chat, abrirServicio, abrirCancion, abrirChat, cerrarServicio, cerrarCancion, cerrarChat, limpiarCancion, limpiarServicio, limpiarChat }
}
