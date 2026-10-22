// Parte el mensaje de un confirm()/alert() de siempre en TÍTULO (la pregunta) y TEXTO (el resto), para la ventana centrada de teléfono. PURA.
//   «¿Vaciar este checklist? Se borran los ítems.»                     → «¿Vaciar este checklist?» + «Se borran los ítems.»
//   «Generar uno nuevo desactiva el enlace. ¿Continuar?»               → «¿Continuar?» + «Generar uno nuevo desactiva el enlace.»
//   «Vas a perder 2 canciones — ¿seguir igual?»                        → «¿Seguir igual?» + «Vas a perder 2 canciones.»
//   «No se pudo quitar el bloqueo. Intenta de nuevo.» (sin pregunta)   → todo es el título.
// El mensaje nativo (escritorio) no cambia: este corte solo se usa en la ventana.
const mayuscula = (s: string) => s.replace(/^(¿?)(.)/, (_, a: string, b: string) => a + b.toLocaleUpperCase('es'))

export function partirMensaje(mensaje: string): { titulo: string; texto: string } {
  const m = mensaje.trim()
  const primera = /^¿[^?]*\?/.exec(m)
  if (primera) return { titulo: primera[0], texto: m.slice(primera[0].length).trim() }
  const ultima = /(?:^|[\s—-]+)(¿[^?]*\?)\s*$/.exec(m)
  if (ultima) {
    const resto = m.slice(0, ultima.index).replace(/[\s—-]+$/, '').trim()
    return { titulo: mayuscula(ultima[1]), texto: resto ? (/[.!?:]$/.test(resto) ? resto : resto + '.') : '' }
  }
  return { titulo: m, texto: '' }
}
