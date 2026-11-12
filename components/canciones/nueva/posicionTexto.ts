// Dónde queda una posición del texto dentro de un cuadro de texto (textarea): el cuadro parte las líneas largas, así que el número de línea no basta. Se mide con una copia invisible del texto de antes, con el mismo ancho y la misma letra.
/** Cuánto hay que desplazar el cuadro (scrollTop) para que la posición `ini` quede arriba, con `respiro` px de aire. */
export function desplazamientoHasta(area: HTMLTextAreaElement, ini: number, respiro = 8): number {
  const cs = getComputedStyle(area)
  const ancho = area.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
  const copia = document.createElement('div')
  copia.style.cssText = 'position:absolute;visibility:hidden;left:-9999px;top:0;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;padding:0;border:0;width:' + Math.max(0, ancho) + 'px;font:' + cs.font + ';letter-spacing:' + cs.letterSpacing + ';line-height:' + cs.lineHeight
  copia.textContent = area.value.slice(0, ini) + '​'
  document.body.appendChild(copia)
  const alto = copia.getBoundingClientRect().height
  const linea = parseFloat(cs.lineHeight) || 24
  copia.remove()
  return Math.max(0, alto - linea - respiro)      // la altura del texto de antes, menos la línea misma y un respiro (el relleno de arriba queda como aire)
}
