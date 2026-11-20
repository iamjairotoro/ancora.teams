'use client'
// Presencia de una hoja inferior (plan de animaciones, etapa M2): la hoja sigue en pantalla mientras se anima su salida y recién después se desmonta. Solo en teléfono (≤ 768 px) y sin tocar la lógica de quien la usa:
// quien la usa sigue diciendo «abierta» o «cerrada»; este hook dice si todavía hay que dibujarla (`montado`), si ya está en su sitio (`visible`) y si se está yendo (`saliendo`).
//   · Entrada: se monta con `visible=false` (fuera de pantalla) y, dos cuadros después, pasa a `visible=true`: así el navegador anima de verdad (transición, no un salto).
//   · Salida: `visible=false` y la hoja queda montada lo que dura la salida (el token --anc-dur-sheet-out, o --anc-dur-reduced con «reducir movimiento»); después se desmonta.
//   · Interrupción: si se vuelve a abrir a mitad de la salida, se cancela el desmontaje y la hoja regresa desde donde iba (transición, sin salto).
//   · Fuera del teléfono no hay animación que esperar: se desmonta al instante, igual que antes.
import { useEffect, useReducer, useRef } from 'react'

const TELEFONO = '(max-width: 768px)', REDUCIDO = '(prefers-reduced-motion: reduce)'
const hayAnimacion = (): boolean => typeof window !== 'undefined' && !!window.matchMedia?.(TELEFONO).matches

/** Lo que dura la salida, leído de los tokens de movimiento (app/globals.css) para que CSS y JavaScript no se desincronicen. */
export function msDeSalida(): number {
  try {
    const reducido = window.matchMedia(REDUCIDO).matches
    const v = getComputedStyle(document.documentElement).getPropertyValue(reducido ? '--anc-dur-reduced' : '--anc-dur-sheet-out').trim(), n = parseFloat(v)
    if (Number.isFinite(n)) return v.endsWith('ms') ? n : n * 1000
  } catch { /* sin navegador: el valor de abajo */ }
  return 200
}

export interface Presencia { montado: boolean; visible: boolean; saliendo: boolean }

export function usePresencia(abierta: boolean): Presencia {
  // El estado vive en un ref y se cambia al dibujar (es instantáneo y siempre coherente con `abierta`); `redibujar` solo avisa a React cuando cambia algo por su cuenta (pasaron los dos cuadros de la entrada o terminó la salida).
  // No se usa useState con actualizaciones durante el dibujo: mezclarlas con las del temporizador y de requestAnimationFrame (otra prioridad) dejaba `listo` pegado en «verdadero» y la siguiente apertura aparecía sin animar.
  const e = useRef({ previa: abierta, saliendo: false, listo: !hayAnimacion() })
  const [, redibujar] = useReducer((n: number) => n + 1, 0)
  const s = e.current
  if (s.previa !== abierta) {
    s.previa = abierta
    if (abierta) { if (s.saliendo || !hayAnimacion()) s.listo = true; s.saliendo = false }       // reabierta a mitad de la salida: vuelve de inmediato desde donde iba
    else { s.listo = false; s.saliendo = hayAnimacion() }
  }
  useEffect(() => {
    if (abierta) {
      if (s.listo) return
      let r2 = 0
      // Antes de pasar a «visible» se obliga al navegador a calcular el estilo de la hoja recién montada (fuera de pantalla): sin eso, si dos cuadros caen muy seguidos, nunca vio el «de dónde viene» y salta en lugar de animar.
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => { void document.documentElement.offsetHeight; s.listo = true; redibujar() }) })
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
    }
    if (!s.saliendo) return
    const id = setTimeout(() => { s.saliendo = false; redibujar() }, msDeSalida() + 50)
    return () => clearTimeout(id)
  }, [abierta, s])
  return { montado: abierta || s.saliendo, visible: abierta && s.listo, saliendo: !abierta && s.saliendo }
}

/** Los atributos que el CSS de app/ancora-movimiento.css usa para animar la hoja y su velo. `inert` mientras sale: ni el teclado ni los lectores de pantalla la ven como una ventana abierta. */
export type ClasePresencia = 'hoja' | 'ventana' | 'pantalla'
export function atributosHoja(p: Presencia, esVelo = false, clase: ClasePresencia = 'hoja'): Record<string, string | undefined> {
  const nombre = clase === 'pantalla' ? 'data-pantalla' : clase === 'ventana' ? (esVelo ? 'data-ventana-velo' : 'data-ventana') : (esVelo ? 'data-hoja-velo' : 'data-hoja')
  return { [nombre]: '', 'data-visible': p.visible ? 'true' : 'false', 'data-saliendo': p.saliendo ? '' : undefined, ...(p.saliendo ? { inert: '' } : {}) }
}

/** Mientras `vivo` es verdadero sigue al valor; cuando deja de serlo se queda con el último: la hoja que se está yendo conserva su contenido aunque quien la usa ya haya borrado el día. */
export function useCongelado<T>(valor: T, vivo: boolean): T {
  const r = useRef(valor)
  if (vivo) r.current = valor
  return r.current
}

// A dónde vuelve el foco al cerrar: el botón que tenía el foco al abrir; en iPhone Safari un toque NO da foco al botón, así que se recuerda también el último control tocado.
let ultimoToque: HTMLElement | null = null
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', e => { ultimoToque = ((e.target as Element | null)?.closest?.('button, a[href], [role="button"], summary') as HTMLElement | null) ?? null }, true)
}
export function elementoQueAbrio(): HTMLElement | null {
  const a = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
  return a && a !== document.body && a !== document.documentElement ? a : ultimoToque
}
