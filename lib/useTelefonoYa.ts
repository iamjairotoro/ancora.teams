'use client'
import { useEffect, useState } from 'react'

/** ¿Teléfono (≤ 768 px)? A diferencia de useMediaQuery, se mide en el primer render: para componentes que solo se dibujan con datos ya cargados (nunca en el servidor), así la primera pantalla ya es la correcta y no parpadea. */
export function useTelefonoYa(): boolean {
  const [t, setT] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches)
  useEffect(() => { const mq = window.matchMedia('(max-width: 768px)'); const f = () => setT(mq.matches); f(); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [])
  return t
}
