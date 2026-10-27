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
