// La hoja con acordes de la FICHA de administradora (Modo Admin): lo mismo que ve el músico (lib/portal/acordesCancion.ts → armarHojaAcordes), calculado con el estado que el editor ya lee (lib/admin/guardarAcordes.ts → leerEstado).
// Solo lectura: no escribe nada ni convierte nada. La hoja existe solo si la canción tiene tono y TODAS las variantes que se usarían están en formato 2; si no, `hoja` es null y la ficha sigue mostrando la letra de siempre.
import type { HojaAcordesDatos } from '@/lib/lecturaAcordes'
import { armarHojaAcordes } from '@/lib/portal/acordesCancion'
import type { Estado } from './guardarAcordes'

export interface HojaFicha { hoja: HojaAcordesDatos | null }

export function armarHojaFicha(e: Estado): HojaFicha {
  const secciones = e.secciones.map(s => ({ id: s.id, code: s.code, name: s.name, sort_order: s.sort_order }))
  const variantes = e.secciones.flatMap(s => s.variantes.map(v => ({ section_id: v.section_id, label: v.label, lines: v.lines, is_default: v.is_default, formato: v.formato })))
  const hoja = armarHojaAcordes({ tono: e.song.tono_original, arreglo: e.song.default_arrangement, secciones, variantes })
  return { hoja }
}
