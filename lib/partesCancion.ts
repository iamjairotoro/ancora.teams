// Las «partes» de una canción para la tira y las insignias de la lectura (etapa C3): abreviatura corta + clave de color. Función pura, sin datos.
// Primero se mira el NOMBRE de la sección (el editor genera el mismo código `INT` para «Interludio» y para «Instrumental», así que el código solo no basta) y luego el CÓDIGO.
// Códigos que existen en la base (migrations/018-019) y los que genera el editor (lib/editorAcordes.ts, `codigoDeSeccion`): IN, V, V1…, PC, C, P, INT, TAG, OUT, I, F, T; el resto cae en «otra».
export type ClaveParte = 'v' | 'pc' | 'c' | 'it' | 'bd' | 'is' | 'tg' | 'e' | 'in' | 'otra'
export interface Parte { clave: ClaveParte; abrev: string }

/** Los colores de las partes (los de los mockups). `in` y `otra` son grises neutros (no tienen color propio). Se aplican por CSS (`[data-parte]`), no desde aquí; esta lista es para pruebas y documentación. */
export const COLORES_PARTES: Record<Exclude<ClaveParte, 'in' | 'otra'>, string> = { v: '#6C7BF2', pc: '#E8590C', c: '#F59F00', it: '#F03E3E', bd: '#2F9E44', is: '#82C91E', tg: '#E64980', e: '#15AABF' }
const BASE: Record<ClaveParte, string> = { v: 'V', pc: 'Pc', c: 'C', it: 'It', bd: 'Bd', is: 'Is', tg: 'Tg', e: 'E', in: 'In', otra: '' }

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-_]+/g, ' ').trim()

function clavePorNombre(nombre: string): ClaveParte | null {
  const n = sinTildes(nombre)
  if (/^pre ?coro\b/.test(n)) return 'pc'
  if (/^(coro|chorus)\b/.test(n)) return 'c'
  if (/^(verso|estrofa|verse)\b/.test(n)) return 'v'
  if (/^(puente|bridge)\b/.test(n)) return 'bd'
  if (/^instrumental\b/.test(n)) return 'is'
  if (/^(interludio|interlude)\b/.test(n)) return 'it'
  if (/^tag\b/.test(n)) return 'tg'
  if (/^(final|ending|outro|salida|cierre)\b/.test(n)) return 'e'
  if (/^(intro|introduccion|entrada)\b/.test(n)) return 'in'
  return null
}

function clavePorCodigo(codigo: string): ClaveParte | null {
  const c = codigo.toUpperCase().trim()
  if (/^PC/.test(c)) return 'pc'
  if (/^INT/.test(c)) return 'it'
  if (/^TAG/.test(c) || c === 'T') return 'tg'
  if (/^OUT/.test(c) || c === 'F') return 'e'
  if (c === 'IN' || c === 'I') return 'in'
  if (/^V(\d|-|$)/.test(c)) return 'v'
  if (/^C(\d|-|$)/.test(c)) return 'c'
  if (/^P(\d|-|$)/.test(c)) return 'bd'
  return null
}

/** Abreviatura y color de una sección. El número (V1, V2, C2) sale del nombre («Verso 2») o, si no, del código («V2»). Un código desconocido usa sus dos primeras letras y un gris neutro. */
export function parteDe(code: string, name: string): Parte {
  const clave = clavePorNombre(name || '') ?? clavePorCodigo(code || '') ?? 'otra'
  const num = /(\d+)/.exec(name || '')?.[1] ?? /^[A-Za-z]+(\d+)/.exec((code || '').trim())?.[1] ?? ''
  if (clave === 'otra') {
    const letras = (code || name || '?').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 2)
    return { clave, abrev: (letras ? letras[0].toUpperCase() + letras.slice(1).toLowerCase() : '?') + num }
  }
  return { clave, abrev: BASE[clave] + num }
}
