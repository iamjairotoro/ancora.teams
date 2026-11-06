// Una línea de letra con acordes, partida POR PALABRA (etapa «acordes sobre la letra»). Lo comparten el editor móvil y la hoja de lectura: así el acorde siempre queda en la misma columna que su letra y la línea solo se rompe entre palabras.
// Función pura, sin dibujo: recibe los trozos de la línea (cada uno con su acorde, si lo tiene) y devuelve palabras; cada palabra es la lista de piezas que la forman (una palabra con un acorde a mitad, «vest|ido», son dos piezas de UNA palabra).
//
// Reglas (las comprueba tests/portal/palabras-con-acordes.test.js):
//  · El texto no cambia: unir el texto de todas las piezas da exactamente el texto de la línea, y `ini` es el índice de carácter de cada pieza dentro de la línea.
//  · Una palabra es una cadena sin espacios MÁS los espacios que la siguen (los espacios van pegados a la palabra de antes; así una fila nunca empieza con un espacio).
//  · El acorde (y la marca de cursor del editor) va solo en la primera pieza de su trozo: el resto de ese trozo ya no lo repite.
//  · Un trozo sin texto (un acorde al final de la línea, o el cursor al final) se pega a la última palabra; si la línea no tiene palabras, abre la suya.
export type Trozo<A> = { texto: string; acorde?: A; marca?: boolean }
export type Pieza<A> = { texto: string; acorde?: A; marca?: boolean; ini: number }

export function agruparPalabras<A>(trozos: Trozo<A>[]): Pieza<A>[][] {
  const palabras: Pieza<A>[][] = []
  let actual: Pieza<A>[] | null = null
  let ini = 0
  let despuesDeEspacio = true      // al empezar la línea, la primera palabra abre grupo
  for (const t of trozos) {
    if (t.texto === '') {
      if (!actual) { actual = []; palabras.push(actual) }
      actual.push({ texto: '', ...(t.acorde !== undefined ? { acorde: t.acorde } : {}), ...(t.marca ? { marca: true } : {}), ini })
      continue
    }
    let primera = true
    let pieza: Pieza<A> | null = null      // la pieza de este trozo que se está armando (dentro del grupo actual)
    for (const fragmento of t.texto.match(/\s+|\S+/g) ?? []) {
      const esEspacio = /^\s/.test(fragmento)
      if ((!esEspacio && despuesDeEspacio) || !actual) { actual = []; palabras.push(actual); pieza = null }
      if (!pieza) {
        pieza = { texto: '', ini, ...(primera && t.acorde !== undefined ? { acorde: t.acorde } : {}), ...(primera && t.marca ? { marca: true } : {}) }
        actual.push(pieza); primera = false
      }
      pieza.texto += fragmento; ini += fragmento.length
      despuesDeEspacio = esEspacio
    }
  }
  return palabras
}
