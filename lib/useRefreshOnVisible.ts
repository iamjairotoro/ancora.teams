'use client'
// Recarga datos al VOLVER a la pestaña (visibilitychange) o al recuperar el foco de la ventana, como máximo
// UNA vez cada `minMs` (30 s por defecto): cambiar de pestaña varias veces seguidas no dispara una recarga
// por cambio. El instante «fresco» arranca al montar (se asume una carga inicial) y se renueva con
// `markFresh()` si el dato se recargó por otro camino (p. ej. al abrir un día).
import { useCallback, useEffect, useRef } from 'react'

export function useRefreshOnVisible(refresh: () => void, minMs = 30000): { markFresh: () => void } {
  const last = useRef<number>(Date.now())
  const cb = useRef(refresh)
  cb.current = refresh
  const markFresh = useCallback(() => { last.current = Date.now() }, [])
  useEffect(() => {
    const maybe = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last.current < minMs) return
      last.current = Date.now()
      cb.current()
    }
    document.addEventListener('visibilitychange', maybe)
    window.addEventListener('focus', maybe)
    return () => { document.removeEventListener('visibilitychange', maybe); window.removeEventListener('focus', maybe) }
  }, [minMs])
  return { markFresh }
}
