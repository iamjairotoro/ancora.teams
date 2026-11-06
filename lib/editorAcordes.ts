// Editor de acordes (etapa C2): el modelo del documento y sus reglas. Funciones puras, sin red ni pantalla.
// Un documento es el TEXTO completo (songs.letra) más ANCLAS: cada acorde es {at, acorde}, con `at` = índice de carácter dentro del texto (sin repetirse, en orden). Un INTERLUDIO es una línea de solo acordes que va
// DESPUÉS de una línea de letra: se ancla al final de esa línea (`at` = índice de su «\n», o el largo del texto) y no vive en la letra. El acorde sigue a la letra sobre la que está.
//
// REGLA DE POSICIÓN (toda edición de texto se reduce a UNA operación {s, e, t}: se quita [s,e) y se escribe t):
//   · Insertar (e = s): las anclas antes de s no cambian; las que están en s o después se corren a la derecha, así el acorde sigue a su letra.
//     Excepción: un ancla en el FINAL de su línea no se corre (escribir al final no arrastra el acorde).
//   · Borrar sin escribir: las anclas estrictamente dentro de (s,e) se quitan; la que está en s queda sobre la letra que sigue; las posteriores retroceden.
//     Si se borran LÍNEAS COMPLETAS, sus acordes se van con ellas (incluida el ancla en s).
//   · Reemplazar (hay texto quitado y escrito): ningún acorde se pierde; los del rango pasan a s, uno por lugar dentro del texto nuevo; los que no caben se quitan y se cuentan.
//   · Dos anclas que caen en el mismo lugar no se pisan: la segunda se corre un lugar; si no cabe, se quita y se cuenta.
//   · Un acorde que queda sobre un encabezado, una línea vacía o «(instrumental)» no se puede guardar: se quita y se cuenta. Cada vez se informa cuántos («Se quitaron N acordes») y se puede Deshacer.
import { looksLikeHeader } from './parseLyrics'
import { aLetra, type Acorde, type Alteracion, type Grado, type ItemCompas, type LineaF2, type SegmentoGrados } from './acordes'

export const INSTRUMENTAL = '(instrumental)'
export type Ancla = { at: number; acorde: Acorde }
export type Interludio = { at: number; items: ItemCompas[] }
export type Documento = { texto: string; anclas: Ancla[]; interludios: Interludio[] }
export type Edicion = { s: number; e: number; t: string }
export type Quitados = { acordes: number; interludios: number }

export const docVacio = (texto = ''): Documento => ({ texto: texto.replace(/\r/g, ''), anclas: [], interludios: [] })

/* ───────── estructura: encabezados, líneas de letra y secciones (misma regla que lib/parseLyrics.ts) ───────── */
export type LineaDoc = { ini: number; fin: number; txt: string; rol: 'encabezado' | 'letra' | 'vacia'; seccion: number }
export type SeccionDoc = { nombre: string; lineas: number[] }

export function estructura(texto: string): { lineas: LineaDoc[]; secciones: SeccionDoc[] } {
  const lineas: LineaDoc[] = []
  let ini = 0
  for (const txt of texto.split('\n')) { lineas.push({ ini, fin: ini + txt.length, txt, rol: 'vacia', seccion: -1 }); ini += txt.length + 1 }
  const secciones: SeccionDoc[] = []
  let i = 0
  while (i < lineas.length) {
    if (/^[ \t]*$/.test(lineas[i].txt)) { i++; continue }
    let j = i
    while (j < lineas.length && !/^[ \t]*$/.test(lineas[j].txt)) j++
    let a = i, b = j - 1                                                  // el bloque [a..b]; se recortan las líneas sin texto de los bordes
    while (a <= b && !lineas[a].txt.trim()) a++
    while (b >= a && !lineas[b].txt.trim()) b--
    if (a <= b) {
      const idx: number[] = []; for (let k = a; k <= b; k++) idx.push(k)
      const encabezado = idx.length > 1 && looksLikeHeader(lineas[idx[0]].txt.trim())
      const k = secciones.length
      if (encabezado) { lineas[idx[0]].rol = 'encabezado'; lineas[idx[0]].seccion = k; secciones.push({ nombre: lineas[idx[0]].txt.trim().replace(/:\s*$/, ''), lineas: idx.slice(1) }) }
      else secciones.push({ nombre: '', lineas: idx })
      for (const n of secciones[k].lineas) { lineas[n].rol = 'letra'; lineas[n].seccion = k }
    }
    i = j
  }
  return { lineas, secciones }
}

const esMarcador = (l: LineaDoc) => l.txt.trim() === INSTRUMENTAL
const lineaEn = (lineas: LineaDoc[], at: number): LineaDoc | null => lineas.find(l => l.ini <= at && at <= l.fin) ?? null
/** ¿Se puede poner un acorde sobre esta línea? Solo líneas de letra con texto (no encabezados, no vacías, no «(instrumental)»). */
const aceptaAcordes = (l: LineaDoc | null): l is LineaDoc => !!l && l.rol === 'letra' && !!l.txt.trim() && !esMarcador(l)

/* ───────── aplicar una edición de texto ───────── */
function sinChoques(anclas: Ancla[], largo: number): { anclas: Ancla[]; quitadas: number } {
  const orden = anclas.map((a, i) => ({ a, i })).sort((x, y) => x.a.at - y.a.at || x.i - y.i)
  const out: Ancla[] = []; let quitadas = 0, previo = -1
  for (const { a } of orden) {
    const at = Math.max(a.at, previo + 1)
    if (at > largo) { quitadas++; continue }
    out.push({ ...a, at }); previo = at
  }
  return { anclas: out, quitadas }
}

export function aplicarEdicion(doc: Documento, ed: Edicion): { doc: Documento; quitados: Quitados } {
  const { s, e, t } = ed, T = doc.texto
  if (!Number.isInteger(s) || !Number.isInteger(e) || typeof t !== 'string' || s < 0 || e < s || e > T.length) throw new Error('edición no válida')
  const n = t.length, quitado = e - s, delta = n - quitado, nuevo = T.slice(0, s) + t + T.slice(e)
  const finDeLinea = (o: number) => o === T.length || T[o] === '\n'
  const q: Quitados = { acordes: 0, interludios: 0 }
  let anclas: Ancla[] = [], interludios: Interludio[] = []

  if (quitado === 0) {                                                       // inserción
    anclas = doc.anclas.map(a => (a.at < s || (a.at === s && finDeLinea(a.at)) ? a : { ...a, at: a.at + n }))
    interludios = doc.interludios.map(x => (x.at <= s ? x : { ...x, at: x.at + n }))
  } else if (n === 0) {                                                      // borrado puro
    const completas = (s === 0 || T[s - 1] === '\n') && (e === T.length || T[e - 1] === '\n')
    const dentro = (o: number) => (completas ? (o >= s && o < e) : (o > s && o < e))   // un ancla al final de la última línea borrada la quita la limpieza de abajo (queda sobre una línea vacía)
    for (const a of doc.anclas) { if (dentro(a.at)) q.acordes++; else anclas.push(a.at >= e ? { ...a, at: a.at - quitado } : a) }
    for (const x of doc.interludios) {
      if (completas && dentro(x.at)) { q.interludios++; continue }
      interludios.push(x.at >= e ? { ...x, at: x.at - quitado } : x.at > s ? { ...x, at: s } : x)
    }
  } else {                                                                   // reemplazo
    const ocupadas = new Set<number>(), colapsadas: Ancla[] = []
    for (const a of doc.anclas) {
      if (a.at > s && a.at < e) colapsadas.push(a)
      else { const m = a.at >= e ? { ...a, at: a.at + delta } : a; anclas.push(m); ocupadas.add(m.at) }
    }
    let p = s
    for (const a of colapsadas) {
      while (ocupadas.has(p)) p++
      if (p >= s + n) { q.acordes++; continue }
      anclas.push({ ...a, at: p }); ocupadas.add(p)
    }
    for (const x of doc.interludios) interludios.push(x.at >= e ? { ...x, at: x.at + delta } : x.at > s ? { ...x, at: s } : x)
  }

  const est = estructura(nuevo)
  const r = sinChoques(anclas, nuevo.length); q.acordes += r.quitadas
  const validas = r.anclas.filter(a => { const ok = aceptaAcordes(lineaEn(est.lineas, a.at)); if (!ok) q.acordes++; return ok })
  // interludios: siempre al final de la línea que los contiene; sobre un encabezado o una línea vacía no se puede; dos en el mismo lugar se unen sin perder nada
  const porFin = new Map<number, Interludio>()
  for (const x of interludios) {
    const l = lineaEn(est.lineas, x.at)
    if (!l || l.rol !== 'letra') { q.interludios++; continue }
    const previo = porFin.get(l.fin)
    porFin.set(l.fin, previo ? { at: l.fin, items: [...previo.items, ...x.items] } : { at: l.fin, items: x.items })
  }
  return { doc: { texto: nuevo, anclas: validas, interludios: Array.from(porFin.values()).sort((a, b) => a.at - b.at) }, quitados: q }
}

/** De lo escrito en un cuadro de texto a UNA edición {s,e,t}. `caret` (posición del cursor tras escribir) desempata cuando el texto se repite («aa» → «aaa»). */
export function diffTexto(viejo: string, nuevo: string, caret?: number): Edicion {
  let p = 0; const max = Math.min(viejo.length, nuevo.length)
  while (p < max && viejo[p] === nuevo[p]) p++
  let f = 0
  while (f < max - p && viejo[viejo.length - 1 - f] === nuevo[nuevo.length - 1 - f]) f++
  let s = p, e = viejo.length - f, t = nuevo.slice(p, nuevo.length - f)
  if (typeof caret === 'number' && Number.isInteger(caret)) {
    if (e === s && t.length > 0) { const c = caret - t.length; if (c >= 0 && c <= viejo.length && nuevo.slice(0, c) === viejo.slice(0, c) && nuevo.slice(c + t.length) === viejo.slice(c)) { s = c; e = c } }
    else if (t.length === 0 && e > s) { const k = e - s; if (caret >= 0 && caret + k <= viejo.length && viejo.slice(0, caret) + viejo.slice(caret + k) === nuevo) { s = caret; e = caret + k } }
  }
  return { s, e, t }
}

/** Cambia el texto del documento (lo que escribió la persona) aplicando la regla de posición. */
export const cambiarTexto = (doc: Documento, nuevo: string, caret?: number) => {
  const limpio = nuevo.replace(/\r/g, '')
  return limpio === doc.texto ? { doc, quitados: { acordes: 0, interludios: 0 } } : aplicarEdicion(doc, diffTexto(doc.texto, limpio, caret))
}

/* ───────── operaciones de acordes e interludios ───────── */
/** Pone (o cambia) el acorde en `at`. null si ahí no se puede (encabezado, línea vacía, «(instrumental)», fuera del texto). */
export function ponerAcorde(doc: Documento, at: number, acorde: Acorde): Documento | null {
  if (!Number.isInteger(at) || at < 0 || at > doc.texto.length) return null
  if (!aceptaAcordes(lineaEn(estructura(doc.texto).lineas, at))) return null
  return { ...doc, anclas: [...doc.anclas.filter(a => a.at !== at), { at, acorde }].sort((a, b) => a.at - b.at) }
}
export const quitarAcorde = (doc: Documento, at: number): Documento => ({ ...doc, anclas: doc.anclas.filter(a => a.at !== at) })
export const acordeEn = (doc: Documento, at: number): Acorde | null => doc.anclas.find(a => a.at === at)?.acorde ?? null

/** Dónde va el interludio de una sección: al final de su última línea (de letra o «(instrumental)»). null si la sección no tiene líneas. */
export function finDeSeccion(doc: Documento, seccion: number): number | null {
  const est = estructura(doc.texto), s = est.secciones[seccion]
  return s && s.lineas.length ? est.lineas[s.lineas[s.lineas.length - 1]].fin : null
}
export function ponerInterludio(doc: Documento, at: number, items: ItemCompas[]): Documento | null {
  const l = lineaEn(estructura(doc.texto).lineas, at)
  if (!l || l.rol !== 'letra' || l.fin !== at) return null
  return { ...doc, interludios: [...doc.interludios.filter(x => x.at !== at), { at, items }].sort((a, b) => a.at - b.at) }
}
export const quitarInterludio = (doc: Documento, at: number): Documento => ({ ...doc, interludios: doc.interludios.filter(x => x.at !== at) })

/** Agrega al final del texto una sección solo instrumental («INTERLUDIO:» + «(instrumental)»), lista para llevar un interludio. */
export function agregarSeccionInstrumental(doc: Documento, nombre = 'INTERLUDIO'): { doc: Documento; at: number } {
  const T = doc.texto, separador = !T.trim() ? '' : T.endsWith('\n\n') ? '' : T.endsWith('\n') ? '\n' : '\n\n'
  const d = aplicarEdicion(doc, { s: T.length, e: T.length, t: `${separador}${nombre}:\n${INSTRUMENTAL}` }).doc
  return { doc: d, at: d.texto.length }
}

/* ───────── de y hacia el formato 2 (secciones con líneas) ───────── */
export type SeccionChart = { nombre: string; codigo: string; lineas: LineaF2[] }

const ABREV: Record<string, string> = { verso: 'V', estrofa: 'V', coro: 'C', 'pre-coro': 'PC', precoro: 'PC', puente: 'P', interludio: 'INT', instrumental: 'INT', intro: 'I', final: 'F', outro: 'F', tag: 'T' }
/** Código corto de una sección («Verso 1» → V1, «Coro» → C), único dentro de la canción. */
export function codigoDeSeccion(nombre: string, indice: number, usados: Set<string>): string {
  const m = /^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ-]+)\s*(\d+)?/.exec(nombre)
  let base = m ? (ABREV[m[1].toLowerCase()] ?? m[1].replace(/[^A-Za-zÁÉÍÓÚÑ]/g, '').slice(0, 2).toUpperCase()) : ''
  base = (base || 'S').normalize('NFD').replace(/[^A-Za-z0-9]/g, '').slice(0, 4) || 'S'
  let c = base + (m?.[2] ?? ''), k = 2
  while (usados.has(c) || !c) c = `${base}${(m?.[2] ?? '')}-${k++}`.replace('--', '-')
  usados.add(c)
  return c.slice(0, 6)
}

/** El documento como secciones para guardar. Los acordes y los interludios que no caben en ninguna línea ya se quitaron al editar, así que aquí no se pierde nada. */
export function aSecciones(doc: Documento): SeccionChart[] {
  const est = estructura(doc.texto), usados = new Set<string>(), out: SeccionChart[] = []
  est.secciones.forEach((sec, k) => {
    const lineas: LineaF2[] = []
    for (const idx of sec.lineas) {
      const l = est.lineas[idx]
      if (!esMarcador(l)) {
        const ac = doc.anclas.filter(a => a.at >= l.ini && a.at <= l.fin).sort((a, b) => a.at - b.at)
        const segs: SegmentoGrados[] = []
        if (!ac.length) segs.push({ text: l.txt })
        else {
          if (ac[0].at > l.ini) segs.push({ text: l.txt.slice(0, ac[0].at - l.ini) })
          ac.forEach((a, i) => { const hasta = i + 1 < ac.length ? ac[i + 1].at : l.fin; segs.push({ text: l.txt.slice(a.at - l.ini, hasta - l.ini), acorde: a.acorde }) })
        }
        lineas.push({ kind: 'lyric', segments: segs })
      }
      const x = doc.interludios.find(i => i.at === l.fin)
      if (x) lineas.push({ kind: 'bars', items: x.items })
    }
    out.push({ nombre: sec.nombre, codigo: codigoDeSeccion(sec.nombre, k, usados), lineas })
  })
  return out
}

const textoDe = (l: LineaF2) => (l.kind === 'lyric' ? l.segments.map(s => s.text).join('') : '')

/** Lo contrario: de la letra y las líneas guardadas al documento. null si no encajan exactamente (otro texto, otro número de secciones o líneas, textos literales, un interludio antes de la primera línea): en ese caso no se adivina. */
export function desdeSecciones(letra: string, charts: LineaF2[][]): Documento | null {
  const texto = letra.replace(/\r/g, ''), est = estructura(texto)
  if (est.secciones.length !== charts.length) return null
  const anclas: Ancla[] = [], interludios: Interludio[] = []
  for (let k = 0; k < charts.length; k++) {
    let pos = 0, ultimo: LineaDoc | null = null
    const lineas = est.secciones[k].lineas.map(i => est.lineas[i])
    if (lineas.length === 1 && esMarcador(lineas[0])) { ultimo = lineas[0]; pos = 1 }   // sección solo instrumental: su letra es «(instrumental)» y el chart solo trae interludios
    for (const c of charts[k]) {
      if (c.kind === 'bars') { if (!ultimo) return null; interludios.push({ at: ultimo.fin, items: c.items }); continue }
      const l = lineas[pos]
      if (!l || esMarcador(l) || textoDe(c) !== l.txt) return null
      let off = 0
      for (const sg of c.segments) { if ('literal' in sg && sg.literal) return null; if (sg.acorde) anclas.push({ at: l.ini + off, acorde: sg.acorde }); off += sg.text.length }
      ultimo = l; pos++
    }
    if (pos !== lineas.length) return null
  }
  const doc: Documento = { texto, anclas: anclas.sort((a, b) => a.at - b.at), interludios }
  const unicas = new Set(doc.anclas.map(a => a.at)); if (unicas.size !== doc.anclas.length) return null
  return doc
}

/* ───────── historial (Deshacer / Rehacer) ───────── */
export type Historial = { pasado: Documento[]; presente: Documento; futuro: Documento[]; clave: string | null }
export const LIMITE_HISTORIAL = 100
export const nuevoHistorial = (doc: Documento): Historial => ({ pasado: [], presente: doc, futuro: [], clave: null })
/** Una foto por acción. Con la misma `clave` seguida (escribir en una misma línea) se junta en una sola. */
export function registrar(h: Historial, doc: Documento, clave: string | null = null): Historial {
  if (doc === h.presente) return h
  if (clave && h.clave === clave) return { ...h, presente: doc, futuro: [] }
  return { pasado: [...h.pasado, h.presente].slice(-LIMITE_HISTORIAL), presente: doc, futuro: [], clave }
}
export const puedeDeshacer = (h: Historial) => h.pasado.length > 0
export const puedeRehacer = (h: Historial) => h.futuro.length > 0
export function deshacer(h: Historial): Historial {
  if (!h.pasado.length) return h
  return { pasado: h.pasado.slice(0, -1), presente: h.pasado[h.pasado.length - 1], futuro: [h.presente, ...h.futuro], clave: null }
}
export function rehacer(h: Historial): Historial {
  if (!h.futuro.length) return h
  return { pasado: [...h.pasado, h.presente], presente: h.futuro[0], futuro: h.futuro.slice(1), clave: null }
}

/* ───────── la paleta: modificadores, bajo y grados fuera de la escala ───────── */
export const MODIFICADORES = ['m', '7', 'maj7', 'sus4', 'add9'] as const
export type Modificador = (typeof MODIFICADORES)[number]
const esMenor = (cal: string) => /^m(?!aj)/.test(cal)
/** Aplica un modificador a un acorde: «m» alterna menor/mayor; los demás (7, maj7, sus4, add9) se ponen o, si ya estaban, se quitan. La calidad resultante siempre es una de las que acepta el guardado. */
export function conModificador(a: Acorde, mod: Modificador): Acorde {
  const menor = esMenor(a.cal), resto = menor ? a.cal.slice(1) : a.cal
  if (mod === 'm') return { ...a, cal: menor ? resto : (resto === 'dim' || resto === 'aug' ? '' : 'm' + resto) }
  return { ...a, cal: (menor ? 'm' : '') + (resto === mod ? '' : mod) }
}
/** Pone (o quita, con null) el bajo del acorde. */
export function conBajo(a: Acorde, bajo: { g: Grado; alt?: Alteracion } | null): Acorde {
  const { bajo: _viejo, ...sin } = a
  void _viejo
  return bajo ? { ...sin, bajo } : sin
}
/** Los 12 grados de la escala cromática (el tritono es el 5 bemol) con la letra que tienen en este tono, para «Otro…» y para el bajo. */
export const PASOS_CROMATICOS: ReadonlyArray<{ g: Grado; alt?: Alteracion }> = [{ g: 1 }, { g: 2, alt: 'b' }, { g: 2 }, { g: 3, alt: 'b' }, { g: 3 }, { g: 4 }, { g: 5, alt: 'b' }, { g: 5 }, { g: 6, alt: 'b' }, { g: 6 }, { g: 7, alt: 'b' }, { g: 7 }]
export const gradosCromaticos = (tono: string) => PASOS_CROMATICOS.map(p => ({ ...p, letra: aLetra({ ...p, cal: '' }, tono) }))
