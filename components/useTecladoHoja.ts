'use client'
import { useEffect, type RefObject } from 'react'
import { ajusteDeTeclado } from '@/lib/tecladoHoja'

/** Mantiene un panel fijo (hoja desde abajo o capa de pantalla completa) por ENCIMA del teclado del iPhone: con el teclado abierto sube `bottom` lo que el teclado tapa y limita su alto al viewport visible
 *  (también deja `--alto-visible` en el elemento para el CSS que lo necesite). Sin teclado deja todo como estaba. Reglas con pruebas en lib/tecladoHoja.ts. */
export function useTecladoHoja(ref: RefObject<HTMLElement>, activo = true): void {
  useEffect(() => {
    const el = ref.current, vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!activo || !el || !vv) return
    const ajustar = () => {
      const a = ajusteDeTeclado({ innerHeight: window.innerHeight, alto: vv.height, arriba: vv.offsetTop, escala: vv.scale })
      if (a) { el.style.bottom = `${a.tapado}px`; el.style.maxHeight = `${a.altoVisible}px`; el.style.setProperty('--alto-visible', `${a.altoVisible}px`) }
      else { el.style.bottom = ''; el.style.maxHeight = ''; el.style.removeProperty('--alto-visible') }
    }
    vv.addEventListener('resize', ajustar); vv.addEventListener('scroll', ajustar); ajustar()
    return () => { vv.removeEventListener('resize', ajustar); vv.removeEventListener('scroll', ajustar); el.style.bottom = ''; el.style.maxHeight = ''; el.style.removeProperty('--alto-visible') }
  }, [ref, activo])
}
