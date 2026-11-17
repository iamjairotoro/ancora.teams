'use client'
import { useEffect, type RefObject } from 'react'
import { ajusteDePantalla, ajusteDeTeclado } from '@/lib/tecladoHoja'

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

/** Lo mismo para una capa de PANTALLA COMPLETA (`position:fixed; inset:0`, el editor móvil de acordes): con el teclado abierto la capa ocupa exactamente la zona visible (`top` = lo que Safari desplazó la vista, `height` = el alto visible),
 *  así lo que va pegado abajo queda justo sobre el teclado y no asoma la página de atrás. Marca el elemento con `data-teclado` para que el CSS pueda compactarse mientras se escribe. Sin teclado deja todo como estaba.
 *  Las hojas pequeñas siguen con `useTecladoHoja`, sin cambios. Reglas con pruebas en lib/tecladoHoja.ts (`ajusteDePantalla`). */
export function useTecladoPantalla(ref: RefObject<HTMLElement>, activo = true): void {
  useEffect(() => {
    const el = ref.current, vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!activo || !el || !vv) return
    const limpiar = () => { el.style.top = ''; el.style.bottom = ''; el.style.height = ''; el.style.removeProperty('--alto-visible'); el.removeAttribute('data-teclado') }
    const ajustar = () => {
      const a = ajusteDePantalla({ innerHeight: window.innerHeight, alto: vv.height, arriba: vv.offsetTop, escala: vv.scale })
      if (a) { el.style.top = `${a.arriba}px`; el.style.bottom = 'auto'; el.style.height = `${a.alto}px`; el.style.setProperty('--alto-visible', `${a.alto}px`); el.setAttribute('data-teclado', '1') }
      else limpiar()
    }
    vv.addEventListener('resize', ajustar); vv.addEventListener('scroll', ajustar); ajustar()
    return () => { vv.removeEventListener('resize', ajustar); vv.removeEventListener('scroll', ajustar); limpiar() }
  }, [ref, activo])
}
