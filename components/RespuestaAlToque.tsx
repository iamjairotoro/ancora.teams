'use client'
// Safari en iPhone solo aplica :active (la escala al presionar de app/ancora-movimiento.css) si la página escucha el toque. Un oyente pasivo y vacío basta; no dibuja nada ni cambia el HTML.
import { useEffect } from 'react'

export default function RespuestaAlToque() {
  useEffect(() => {
    const nada = () => {}
    document.addEventListener('touchstart', nada, { passive: true })
    return () => document.removeEventListener('touchstart', nada)
  }, [])
  return null
}
