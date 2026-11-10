// La hoja con acordes de la FICHA de administradora (Modo Admin): lo mismo que ve el músico (lib/portal/acordesCancion.ts → armarHojaAcordes), calculado con el estado que el editor ya lee (lib/admin/guardarAcordes.ts → leerEstado).
// Solo lectura: no escribe nada ni convierte nada. La hoja existe solo si la canción tiene tono y TODAS las variantes que se usarían están en formato 2; si no, `hoja` es null y la ficha sigue mostrando la letra de siempre.
import type { HojaAcordesDatos } from '@/lib/lecturaAcordes'
import { parseLyrics } from '@/lib/parseLyrics'
import { armarHojaAcordes } from '@/lib/portal/acordesCancion'
import { elegirVariante, esViva } from '@/lib/variantesAcordes'
import { activas, type Estado } from './guardarAcordes'

/** Las palabras de un texto para comparar: sin mayúsculas, tildes, signos ni espacios de más (cómo se parte en líneas o con qué signos se escribe NO cuenta). */
export const palabrasDe = (t: string): string[] => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)

const sinMarcador = (t: string): string => t.split('\n').filter(l => l.trim().toLowerCase() !== '(instrumental)').join('\n')
/** El texto cantado de la letra de la ficha: sin los encabezados de sección y sin el marcador «(instrumental)». */
const textoDeLetra = (letra: string): string => sinMarcador(parseLyrics(letra || '').map(sec => sec.lyrics).join('\n'))

/** El texto cantado de las secciones guardadas (variante elegida de cada sección activa, en el orden de las secciones; sin repetir como el arreglo, igual que una letra). Las líneas de solo compases no tienen texto. */
function textoDeSecciones(e: Estado): string {
  const out: string[] = []
  for (const s of activas(e)) {
    const v = elegirVariante(s.variantes)
    if (!v || !Array.isArray(v.lines)) continue
    for (const l of v.lines as { kind?: string; segments?: { text?: unknown }[] }[]) if (l && l.kind === 'lyric' && Array.isArray(l.segments)) out.push(l.segments.map(g => (typeof g.text === 'string' ? g.text : '')).join(''))
  }
  return out.join('\n')
}

/** ¿La letra de la ficha y la de los acordes guardados dicen cosas distintas? Se comparan las PALABRAS en orden: no cuentan espacios, mayúsculas, tildes, signos, saltos de línea, encabezados de sección ni «(instrumental)».
 *  Si una primera línea cantada se parece a un encabezado («Aleluya Aleluya») y las secciones la traen como letra, tampoco es un desajuste: se acepta que coincida quitando o dejando los encabezados. */
export function letraDistinta(e: Estado): boolean {
  const guardado = palabrasDe(textoDeSecciones(e)).join(' ')
  const sinEncabezados = palabrasDe(textoDeLetra(e.song.letra ?? '')).join(' '), completa = palabrasDe(sinMarcador((e.song.letra ?? '').replace(/\r/g, ''))).join(' ')
  return sinEncabezados !== guardado && completa !== guardado
}

export interface HojaFicha {
  hoja: HojaAcordesDatos | null
  /** Cuántas secciones activas tienen MÁS de una versión viva (por ejemplo una traducción): la hoja muestra la principal y la ficha lo avisa. 0 si no hay hoja. Hoy no existe en los datos; es una red de seguridad. */
  otrasVersiones: number
  /** La letra de la ficha (songs.letra) y el texto de los acordes guardados no coinciden (por ejemplo, alguien editó la letra sin pasar por el editor de acordes). false si no hay hoja. */
  desajuste: boolean
}

export function armarHojaFicha(e: Estado): HojaFicha {
  const secciones = e.secciones.map(s => ({ id: s.id, code: s.code, name: s.name, sort_order: s.sort_order }))
  const variantes = e.secciones.flatMap(s => s.variantes.map(v => ({ section_id: v.section_id, label: v.label, lines: v.lines, is_default: v.is_default, formato: v.formato })))
  const hoja = armarHojaAcordes({ tono: e.song.tono_original, arreglo: e.song.default_arrangement, secciones, variantes })
  const otrasVersiones = hoja ? activas(e).filter(s => !!elegirVariante(s.variantes) && s.variantes.filter(v => esViva(v.label)).length > 1).length : 0
  return { hoja, otrasVersiones, desajuste: hoja ? letraDistinta(e) : false }
}
