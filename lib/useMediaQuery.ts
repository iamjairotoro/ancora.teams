'use client'
import { useEffect, useState } from 'react'

/** true / false según la consulta; null hasta que se mide (el primer render
 *  no adivina el ancho, para no abrir ni pintar lo que no corresponde). */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}
