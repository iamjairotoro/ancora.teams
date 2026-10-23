'use client'
import { useEffect, useState } from 'react'

/** La hora actual, refrescada cada minuto y al volver a la pantalla: el destacado cambia solo cuando termina el servicio. */
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setAhora(new Date())
    const iv = setInterval(tick, 60000); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', tick) }
  }, [])
  return ahora
}
