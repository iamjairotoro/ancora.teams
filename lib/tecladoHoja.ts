// Hojas y ventanas con campos frente al teclado del iPhone. En iOS el teclado NO achica el viewport de diseño (ni `dvh`): achica el viewport VISIBLE (`visualViewport`). Un panel pegado al borde de abajo
// (`position:fixed; bottom:0`) queda detrás del teclado y esconde «Guardar». `ajusteDeTeclado` calcula, con las medidas del visualViewport, cuánto subir el panel y cuánto alto máximo darle; `useTecladoHoja`
// (components/useTecladoHoja.ts) lo aplica. Sin teclado (o con el usuario haciendo zoom con los dedos) devuelve null y no se toca nada.
export interface MedidasViewport { innerHeight: number; alto: number; arriba: number; escala: number }
export interface AjusteTeclado { /** px que tapa el teclado por abajo: el panel sube esa distancia. */ tapado: number; /** alto visible en px: el panel no pasa de aquí (menos un respiro). */ altoVisible: number }

/** Lo que tapa el teclado debe superar este umbral (px) para contarlo como teclado: la barra de direcciones de Safari que se esconde mueve unas decenas de px. */
export const UMBRAL_TECLADO = 120
export const RESPIRO = 12

export function ajusteDeTeclado(m: MedidasViewport): AjusteTeclado | null {
  if (m.escala > 1.01) return null                       // zoom de dedos del usuario: no es el teclado
  const tapado = Math.round(m.innerHeight - m.alto - m.arriba)
  if (tapado <= UMBRAL_TECLADO) return null
  return { tapado, altoVisible: Math.max(0, Math.round(m.alto - RESPIRO)) }
}

/* ───────── capas de PANTALLA COMPLETA (el editor móvil de acordes) ─────────
   Una hoja pequeña se arregla subiendo `bottom` (arriba). Una capa `position:fixed; inset:0` no: cuando Safari desplaza la vista para mostrar el cursor (visualViewport.offsetTop > 0), la capa sigue anclada arriba del viewport de diseño,
   fuera de la pantalla, y su borde de abajo queda a media pantalla (con la página de atrás asomando por debajo). La capa debe ocupar EXACTAMENTE la zona visible: `top` = el desplazamiento de la vista y `height` = el alto visible. */
export interface AjustePantalla { /** px desde arriba del viewport de diseño hasta donde empieza la zona visible. */ arriba: number; /** alto de la zona visible en px. */ alto: number }

/** El teclado está abierto si el viewport visible es bastante más bajo que el de diseño, esté o no desplazada la vista (por eso NO se resta `arriba`: con la vista desplazada el teclado sigue ahí).
 *  null sin teclado, con la barra de direcciones de Safari que se esconde (unas decenas de px) o con zoom de dedos. `arriba` nunca sale de [0, innerHeight − alto]. */
export function ajusteDePantalla(m: MedidasViewport): AjustePantalla | null {
  if (m.escala > 1.01) return null
  const alto = Math.round(m.alto), oculto = Math.round(m.innerHeight) - alto
  if (!(oculto > UMBRAL_TECLADO) || !(alto > 0)) return null
  return { arriba: Math.min(oculto, Math.max(0, Math.round(m.arriba) || 0)), alto }
}
