'use client'
// La canción abierta vive en la URL (`?cancion=<id>`, punto 54, commit 2): así el gesto de volver del iPhone y el botón atrás del navegador cierran la canción y vuelven a la lista, un
// enlace o una recarga reabren la misma canción, y las demás pestañas no se enteran. Usa la API nativa del historial (Next 14 la integra con su router, sin pedir nada al servidor) y
// escucha popstate. Entrar a una canción EMPUJA una entrada de historial; «Volver» retrocede esa entrada (o, si se llegó por enlace o recarga, reemplaza la URL por la de la lista).
import { useCallback, useEffect, useRef, useState } from 'react'

const PARAM = 'cancion'
const ruta = () => window.location.pathname      // la URL de la pantalla actual (/portal o /portal/<token>): solo cambia el parámetro
const leer = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(PARAM))

export function useCancionEnUrl() {
  const [cancionId, setCancionId] = useState<string | null>(null)
  const empujada = useRef(false)      // ¿esta pantalla empujó la entrada de historial de la canción abierta?

  useEffect(() => {
    setCancionId(leer())
    const alNavegar = () => { empujada.current = false; setCancionId(leer()) }
    window.addEventListener('popstate', alNavegar)
    return () => window.removeEventListener('popstate', alNavegar)
  }, [])

  const abrir = useCallback((id: string) => {
    window.history.pushState(null, '', `${ruta()}?${PARAM}=${encodeURIComponent(id)}`)
    empujada.current = true; setCancionId(id)
  }, [])

  /** «Volver»: retrocede la entrada que se empujó; si no la hay (enlace, recarga, adelante), deja la URL de la lista. */
  const cerrar = useCallback(() => {
    if (empujada.current) { empujada.current = false; window.history.back(); return }      // popstate pone cancionId en null
    window.history.replaceState(null, '', ruta()); setCancionId(null)
  }, [])

  /** Quita la canción de la URL SIN dejar rastro en el historial (otra pestaña, sin acceso, canción que no existe). */
  const limpiar = useCallback(() => {
    empujada.current = false
    if (leer()) window.history.replaceState(null, '', ruta())
    setCancionId(null)
  }, [])

  return { cancionId, abrir, cerrar, limpiar }
}
