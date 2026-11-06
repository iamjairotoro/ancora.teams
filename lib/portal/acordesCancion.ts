// Arma, en el servidor, la hoja con acordes de UNA canción para el portal (etapa C1). Función pura: recibe las filas ya leídas (secciones, variantes y arreglo) y decide si hay algo que mostrar.
// REGLA: la hoja con acordes existe solo si la canción tiene tono y la variante que se usaría de CADA sección (la del arreglo, o la predeterminada, o la primera) está en formato 2. Si falta el tono,
// o aunque sea una sola variante sigue en formato 1, devuelve null y la canción se ve solo con letra, como hasta hoy (la conversión de formato 1 a 2 la aprueba la administración, no esta lectura).
import { normalizarTono, type LineaF2 } from '@/lib/acordes'
import type { HojaAcordesDatos, SeccionLectura } from '@/lib/lecturaAcordes'

export interface FilaSeccion { id: string; code: string; name: string; sort_order?: number | null }
export interface FilaVariante { section_id: string; label?: string | null; lines: unknown; is_default?: boolean | null; formato?: number | null }

const lineaValida = (l: unknown): l is LineaF2 => {
  const x = l as { kind?: string; segments?: unknown; items?: unknown } | null
  return !!x && ((x.kind === 'lyric' && Array.isArray(x.segments)) || (x.kind === 'bars' && Array.isArray(x.items)))
}

export function armarHojaAcordes(o: { tono: unknown; arreglo: unknown; secciones: FilaSeccion[]; variantes: FilaVariante[] }): HojaAcordesDatos | null {
  const tono = normalizarTono(o.tono)
  if (!tono || !o.secciones.length) return null
  const porId = new Map(o.secciones.map(s => [s.id, s]))
  const pasos: { sec: FilaSeccion; repeat: number; label: string | null }[] = []
  if (Array.isArray(o.arreglo)) for (const it of o.arreglo as { sectionId?: unknown; label?: unknown; repeat?: unknown }[]) {
    const sec = typeof it?.sectionId === 'string' ? porId.get(it.sectionId) : undefined
    if (sec) pasos.push({ sec, repeat: Number.isInteger(it.repeat) && (it.repeat as number) > 1 ? it.repeat as number : 1, label: typeof it.label === 'string' ? it.label : null })
  }
  if (!pasos.length) for (const s of [...o.secciones].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) pasos.push({ sec: s, repeat: 1, label: null })

  const secciones: SeccionLectura[] = []
  for (const p of pasos) {
    const vs = o.variantes.filter(v => v.section_id === p.sec.id)
    if (!vs.length) continue                                   // una sección sin variantes no tiene nada que mostrar
    const v = (p.label && vs.find(x => x.label === p.label)) || vs.find(x => x.is_default) || vs[0]
    if (v.formato !== 2 || !Array.isArray(v.lines) || !v.lines.every(lineaValida)) return null
    secciones.push({ code: p.sec.code, name: p.sec.name, repeat: p.repeat, lineas: v.lines as LineaF2[] })
  }
  return secciones.length ? { tono, secciones } : null
}
