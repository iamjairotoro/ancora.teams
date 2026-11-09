// Guardado del editor de acordes (etapa C2), lado servidor: validación estricta del cuerpo, lectura del estado de una canción, el plan de escrituras y su ejecución. Sin sesión ni permisos: eso lo hace la ruta
// (app/api/admin/canciones/acordes/route.ts) ANTES de llamar a nada de aquí. La organización sale de la canción, nunca del cuerpo.
//
// NADA SE BORRA. Para cada sección: la variante viva se renombra «Respaldo · fecha · id» (y deja de ser la predeterminada), la nueva entra como «Nuevo · …» en formato 2 y, al final, se publica como «Principal».
// Orden de escrituras (cualquier fallo en medio deja la canción SOLO con letra, consistente, y nada destruido; el lector de C1 ignora «Respaldo ·» y «Nuevo ·» y devuelve null si una sección se queda sin variante viva):
//   1 secciones nuevas  2 variantes nuevas pendientes  3 respaldar las vivas y actualizar/dar de baja secciones  4 songs (letra y tono)  5 publicar las nuevas
import { createHash } from 'node:crypto'
import { idsDelArreglo, type ActualGuardado } from '@/lib/resumenGuardado'
import { CALIDAD_VALIDA, convertirVariante, normalizarTono, type Acorde, type LineaF2, type SegmentoGrados } from '@/lib/acordes'
import { esTonoValido } from '@/lib/tonos'
import { desdeSecciones, estructura, INSTRUMENTAL, type SeccionChart } from '@/lib/editorAcordes'
import { elegirVariante, esPendiente, ETIQUETA_VIVA, PREFIJO_INACTIVA, PREFIJO_PENDIENTE, PREFIJO_RESPALDO, seccionActiva } from '@/lib/variantesAcordes'

export const LIMITES = { secciones: 40, lineas: 200, segmentos: 80, items: 64, texto: 400, letra: 20000, cuerpo: 400_000 } as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIN_CONTROL = /^[^\u0000-\u0008\u000B-\u001F\u007F]*$/      // sin caracteres de control (se admite «\n» solo en la letra)

/* ───────── validación ───────── */
const soloLlaves = (o: unknown, permitidas: string[]): o is Record<string, unknown> =>
  !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).every(k => permitidas.includes(k))
const esGrado = (g: unknown) => typeof g === 'number' && Number.isInteger(g) && g >= 1 && g <= 7
const esAlt = (a: unknown) => a === undefined || a === 'b' || a === '#'

export function acordeValido(a: unknown): a is Acorde {
  if (!soloLlaves(a, ['g', 'alt', 'cal', 'bajo'])) return false
  if (!esGrado(a.g) || !esAlt(a.alt) || typeof a.cal !== 'string' || a.cal.length > 12 || !CALIDAD_VALIDA.test(a.cal)) return false
  if (a.bajo !== undefined && !(soloLlaves(a.bajo, ['g', 'alt']) && esGrado(a.bajo.g) && esAlt(a.bajo.alt))) return false
  return true
}
const textoCorto = (t: unknown, max: number): t is string => typeof t === 'string' && t.length <= max && SIN_CONTROL.test(t)

export function lineaValida(l: unknown): l is LineaF2 {
  if (!l || typeof l !== 'object') return false
  const x = l as Record<string, unknown>
  if (x.kind === 'lyric') {
    if (!soloLlaves(x, ['kind', 'segments']) || !Array.isArray(x.segments) || x.segments.length < 1 || x.segments.length > LIMITES.segmentos) return false
    return x.segments.every((s: unknown) => soloLlaves(s, ['text', 'acorde']) && textoCorto(s.text, LIMITES.texto) && (s.acorde === undefined || acordeValido(s.acorde)))
  }
  if (x.kind === 'bars') {
    if (!soloLlaves(x, ['kind', 'items']) || !Array.isArray(x.items) || x.items.length < 1 || x.items.length > LIMITES.items) return false
    return x.items.every((i: unknown) => (soloLlaves(i, ['acorde']) && acordeValido(i.acorde)) || (soloLlaves(i, ['texto']) && typeof i.texto === 'string' && (/^[^\s\u0000-\u001F]{1,8}$/.test(i.texto) || /^ {1,8}$/.test(i.texto))))      // una pieza de texto: 1–8 caracteres sin espacio (como siempre) o 1–8 espacios SIMPLES (el ancho de un hueco en una línea de acordes)
  }
  return false
}

export type DatosGuardado = { songId: string; tono: string; letra: string; secciones: SeccionChart[]; base: string }
export type Validado = { ok: true; datos: DatosGuardado } | { ok: false; campo: 'cuerpo' | 'songId' | 'tono' | 'letra' | 'secciones' | 'base' }

/** Valida el cuerpo del POST. Llaves de más, tipos o valores raros → { ok:false, campo } (solo el campo, nunca el detalle). Aquí `tono` puede venir vacío: la ruta lo exige aparte para dar su mensaje. */
export function validarCuerpo(body: unknown): Validado {
  if (!soloLlaves(body, ['songId', 'tono', 'letra', 'secciones', 'base'])) return { ok: false, campo: 'cuerpo' }
  let tam = 0; try { tam = JSON.stringify(body).length } catch { return { ok: false, campo: 'cuerpo' } }
  if (tam > LIMITES.cuerpo) return { ok: false, campo: 'cuerpo' }
  if (typeof body.songId !== 'string' || !UUID.test(body.songId)) return { ok: false, campo: 'songId' }
  if (typeof body.tono !== 'string' || !esTonoValido(body.tono)) return { ok: false, campo: 'tono' }
  if (typeof body.letra !== 'string' || body.letra.length > LIMITES.letra || !/^[^\u0000-\u0008\u000B-\u001F\u007F]*$/.test(body.letra.replace(/\n/g, ''))) return { ok: false, campo: 'letra' }
  if (typeof body.base !== 'string' || !/^[0-9a-f]{16,64}$/.test(body.base)) return { ok: false, campo: 'base' }
  if (!Array.isArray(body.secciones) || body.secciones.length > LIMITES.secciones) return { ok: false, campo: 'secciones' }
  const codigos = new Set<string>()
  for (const s of body.secciones as unknown[]) {
    // el código solo admite letras, números y «-»: nunca puede empezar con «__» (la marca de sección dada de baja), así que el cliente no puede darlas de baja ni activarlas
    if (!soloLlaves(s, ['nombre', 'codigo', 'lineas']) || !textoCorto(s.nombre, 80) || typeof s.codigo !== 'string' || !/^[A-Za-z0-9-]{1,6}$/.test(s.codigo) || codigos.has(s.codigo)) return { ok: false, campo: 'secciones' }
    codigos.add(s.codigo)
    if (!Array.isArray(s.lineas) || s.lineas.length > LIMITES.lineas || !s.lineas.every(lineaValida)) return { ok: false, campo: 'secciones' }
  }
  return { ok: true, datos: body as unknown as DatosGuardado }
}

/** La letra y el chart dicen LO MISMO: mismas secciones (nombre), y el texto de las líneas de letra de cada una es el de su bloque en `letra`. Una sección solo instrumental lleva «(instrumental)» en la letra y solo interludios en el chart. */
export function textosCoinciden(letra: string, secciones: SeccionChart[]): boolean {
  const est = estructura(letra)
  if (est.secciones.length !== secciones.length) return false
  return secciones.every((sec, k) => {
    const d = est.secciones[k]
    if (d.nombre !== sec.nombre) return false
    const lineasLetra = d.lineas.map(i => est.lineas[i].txt)
    const lineasChart = sec.lineas.filter(l => l.kind === 'lyric').map(l => (l.kind === 'lyric' ? l.segments.map((s: SegmentoGrados) => s.text).join('') : ''))
    if (lineasLetra.length === 1 && lineasLetra[0].trim() === INSTRUMENTAL) return lineasChart.length === 0
    if (sec.lineas.length > 0 && sec.lineas[0].kind === 'bars') return false          // un interludio va después de una línea de letra, nunca antes de la primera
    return lineasLetra.length === lineasChart.length && lineasLetra.every((t, i) => t === lineasChart[i])
  })
}

/* ───────── estado de una canción ───────── */
export interface FilaSong { id: string; organization_id: string | null; tono_original: string | null; letra: string | null; default_arrangement?: unknown }
export interface FilaSec { id: string; code: string; name: string; sort_order: number | null }
export interface FilaVar { id: string; section_id: string; label: string | null; lines: unknown; is_default: boolean | null; formato: number | null }
export interface Estado { song: FilaSong; secciones: (FilaSec & { variantes: FilaVar[] })[] }

/** Lee la canción, sus secciones y variantes (solo lectura). null si no existe; lanza si una lectura falla. */
export async function leerEstado(admin: any, songId: string): Promise<Estado | null> {
  const s = await admin.from('songs').select('id, organization_id, tono_original, letra, default_arrangement').eq('id', songId).maybeSingle()
  if (s.error) throw new Error('lectura songs')
  if (!s.data) return null
  const sec = await admin.from('song_sections').select('id, code, name, sort_order').eq('song_id', songId)
  if (sec.error) throw new Error('lectura song_sections')
  const filas = (sec.data || []) as FilaSec[]
  let vars: FilaVar[] = []
  if (filas.length) {
    const v = await admin.from('song_section_variants').select('id, section_id, label, lines, is_default, formato').in('section_id', filas.map(f => f.id))
    if (v.error) throw new Error('lectura song_section_variants')
    vars = (v.data || []) as FilaVar[]
  }
  return { song: s.data as FilaSong, secciones: filas.map(f => ({ ...f, variantes: vars.filter(x => x.section_id === f.id) })) }
}

/** Las secciones activas, en orden (sort_order y luego id: estable). */
export const activas = (e: Estado) => e.secciones.filter(s => seccionActiva(s.code)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id))

/** Lo que el editor carga de una canción: la letra, el tono y, si todo encaja, las líneas guardadas por sección. */
export type Origen = 'formato2' | 'pendiente' | 'formato1' | 'ninguno'
/** Lo que hay guardado en las secciones cuando el editor NO puede arrancar de ellas (la letra no coincide o los acordes no se pueden leer): el texto armado con las líneas de letra de cada sección y, solo si todo se puede leer, sus acordes. El editor lo ofrece; nunca lo carga solo. */
export interface Guardadas { letra: string; secciones: LineaF2[][] | null; nSecciones: number; sinConvertir: number }
export interface Cargado { tono: string; letra: string; origen: Origen; secciones: LineaF2[][] | null; sinConvertir: number; huella: string; guardadas: Guardadas | null; actual: ActualGuardado }

/** Un encabezado que `looksLikeHeader` reconoce (letras y números, hasta 4 palabras) a partir del nombre de la sección; sin nombre usable, «SECCIÓN». */
const encabezadoDe = (s: FilaSec): string => {
  const t = (s.name || s.code || '').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]+/g, ' ').trim().replace(/\s+/g, ' ').toUpperCase().split(' ').slice(0, 4).join(' ')
  return /^[A-ZÁÉÍÓÚÑ]/.test(t) ? t : 'SECCIÓN'
}
/** El texto de las secciones guardadas: «ENCABEZADO:» y sus líneas de letra (las líneas de solo compases no cuentan; una sección sin letra lleva «(instrumental)»). Las secciones sin líneas legibles se saltan. */
function letraDeSecciones(act: (FilaSec & { variantes: FilaVar[] })[], elegidas: ({ v: FilaVar } | null)[]): { letra: string; emitidas: number } {
  const bloques: string[] = []
  act.forEach((s, i) => {
    const v = elegidas[i]?.v
    if (!v || !Array.isArray(v.lines)) return
    const lineas = (v.lines as { kind?: string; segments?: { text?: unknown }[] }[])
      .filter(l => l && l.kind === 'lyric' && Array.isArray(l.segments))
      .map(l => (l.segments as { text?: unknown }[]).map(x => (typeof x.text === 'string' ? x.text : '')).join('').replace(/\s+$/, ''))
      .filter(t => t.trim())
    bloques.push(`${encabezadoDe(s)}:\n${lineas.length ? lineas.join('\n') : INSTRUMENTAL}`)
  })
  return { letra: bloques.join('\n\n'), emitidas: bloques.length }
}


export function construirCarga(e: Estado): Cargado {
  const tono = normalizarTono(e.song.tono_original) ?? ''
  const act = activas(e)
  const elegidas = act.map(s => {
    const viva = elegirVariante(s.variantes)
    if (viva) return { v: viva, pendiente: false }
    const pend = s.variantes.filter(x => esPendiente(x.label) && x.formato === 2)
    return pend.length ? { v: pend[pend.length - 1], pendiente: true } : null
  })
  let origen: Origen = 'ninguno', secciones: LineaF2[][] | null = null, sinConvertir = 0
  if (act.length && elegidas.every(x => x && Array.isArray(x.v.lines))) {
    const todas = elegidas as { v: FilaVar; pendiente: boolean }[]
    if (todas.every(x => x.v.formato === 2)) { secciones = todas.map(x => x.v.lines as LineaF2[]); origen = todas.some(x => x.pendiente) ? 'pendiente' : 'formato2' }
    else if (tono && todas.every(x => x.v.formato === 1 || x.v.formato === 2)) {
      const conv = todas.map(x => (x.v.formato === 2 ? { resultado: x.v.lines as LineaF2[], noConvertidos: [] as string[] } : convertirVariante(x.v.lines, tono)))
      if (conv.every(c => c)) {
        sinConvertir = conv.reduce((n, c) => n + (c ? c.noConvertidos.length : 0), 0)
        if (!sinConvertir) { secciones = conv.map(c => (c as { resultado: LineaF2[] }).resultado); origen = 'formato1' }
      }
    }
  }
  const letraTexto = (e.song.letra ?? '').replace(/\r/g, '')
  let guardadas: Guardadas | null = null
  if (act.length && !(secciones && desdeSecciones(letraTexto, secciones))) {          // solo cuando el editor arrancaría de la letra sola
    const g = letraDeSecciones(act, elegidas), igual = (a: string) => a.toLowerCase().replace(/\s+/g, ' ').trim()
    if (g.letra && igual(g.letra) !== igual(letraTexto)) {
      const coincide = secciones && g.emitidas === act.length && estructura(g.letra).secciones.length === act.length && desdeSecciones(g.letra, secciones)
      guardadas = { letra: g.letra, secciones: coincide ? secciones : null, nSecciones: g.emitidas, sinConvertir }
    }
  }
  const resumen = JSON.stringify([e.song.letra ?? '', tono, act.map((s, i) => [s.code, s.name, elegidas[i] ? [elegidas[i]!.v.id, elegidas[i]!.v.lines] : null])])
  return { tono, letra: (e.song.letra ?? '').replace(/\r/g, ''), origen, secciones, sinConvertir, huella: createHash('sha256').update(resumen).digest('hex').slice(0, 32), guardadas, actual: { secciones: act.map(x => ({ id: x.id, codigo: x.code, nombre: x.name })), arreglo: idsDelArreglo(e.song.default_arrangement) } }
}

/* ───────── plan y ejecución ───────── */
export type Operacion =
  | { paso: 1 | 2; tipo: 'insert'; tabla: 'song_sections' | 'song_section_variants'; valores: Record<string, unknown> }
  | { paso: 3 | 4 | 5; tipo: 'update'; tabla: 'song_sections' | 'song_section_variants' | 'songs'; id: string; valores: Record<string, unknown> }

/** El plan de escrituras, en orden y sin tocar nada. `nuevoId` y `ahora` se inyectan para poder probarlo; los ids de lo nuevo se fijan aquí (no los inventa la base) para poder publicarlos al final. */
export function planificar(e: Estado, d: DatosGuardado, ahora: Date, nuevoId: () => string): Operacion[] {
  const act = activas(e), fecha = ahora.toISOString().slice(0, 10), intento = nuevoId().slice(0, 8)
  const ops: Operacion[] = []
  const secIds: string[] = []
  d.secciones.forEach((sec, i) => {
    if (i < act.length) secIds.push(act[i].id)
    else { const id = nuevoId(); secIds.push(id); ops.push({ paso: 1, tipo: 'insert', tabla: 'song_sections', valores: { id, song_id: e.song.id, code: sec.codigo, name: sec.nombre, sort_order: i } }) }
  })
  const nuevas = d.secciones.map(sec => ({ id: nuevoId(), sec }))
  nuevas.forEach(({ id, sec }, i) => ops.push({ paso: 2, tipo: 'insert', tabla: 'song_section_variants', valores: { id, section_id: secIds[i], label: `${PREFIJO_PENDIENTE}${intento}`, lines: sec.lineas, is_default: false, formato: 2 } }))
  act.forEach((s, i) => {
    const viva = elegirVariante(s.variantes)
    if (viva) ops.push({ paso: 3, tipo: 'update', tabla: 'song_section_variants', id: viva.id, valores: { label: `${PREFIJO_RESPALDO}${fecha} · ${intento}`, is_default: false } })
    if (i < d.secciones.length) {
      const sec = d.secciones[i], cambios: Record<string, unknown> = {}
      if (s.code !== sec.codigo) cambios.code = sec.codigo
      if (s.name !== sec.nombre) cambios.name = sec.nombre
      if ((s.sort_order ?? 0) !== i) cambios.sort_order = i
      if (Object.keys(cambios).length) ops.push({ paso: 3, tipo: 'update', tabla: 'song_sections', id: s.id, valores: cambios })
    } else ops.push({ paso: 3, tipo: 'update', tabla: 'song_sections', id: s.id, valores: { code: `${PREFIJO_INACTIVA}${s.code}` } })    // dada de baja: no se borra
  })
  ops.push({ paso: 4, tipo: 'update', tabla: 'songs', id: e.song.id, valores: { letra: d.letra || null, tono_original: d.tono || null } })
  nuevas.forEach(({ id }) => ops.push({ paso: 5, tipo: 'update', tabla: 'song_section_variants', id, valores: { label: ETIQUETA_VIVA, is_default: true } }))
  return ops
}

export type Ejecucion = { ok: true; hechas: number } | { ok: false; hechas: number; fallo: number; paso: number }

/** Ejecuta el plan UNA operación por vez y se detiene en la primera que falle (o que no toque exactamente una fila). */
export async function ejecutar(admin: any, ops: Operacion[]): Promise<Ejecucion> {
  let hechas = 0
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    let ok = false
    try {
      if (op.tipo === 'insert') { const r = await admin.from(op.tabla).insert(op.valores); ok = !r.error }
      else { const r = await admin.from(op.tabla).update(op.valores).eq('id', op.id).select('id'); ok = !r.error && Array.isArray(r.data) && r.data.length === 1 }
    } catch { ok = false }
    if (!ok) return { ok: false, hechas, fallo: i, paso: op.paso }
    hechas++
  }
  return { ok: true, hechas }
}

