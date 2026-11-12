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
  // interludios (líneas de acordes): siempre al final de la línea que los contiene; sobre un encabezado o una línea vacía no se puede. Varias líneas en el mismo lugar se CONSERVAN, cada una aparte y en su orden (el orden de la lista; la ordenación es estable)
  const nuevos: Interludio[] = []
  for (const x of interludios) {
    const l = lineaEn(est.lineas, x.at)
    if (!l || l.rol !== 'letra') { q.interludios++; continue }
    nuevos.push({ at: l.fin, items: x.items })
  }
  return { doc: { texto: nuevo, anclas: validas, interludios: nuevos.sort((a, b) => a.at - b.at) }, quitados: q }
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

/** Dónde empieza cada palabra de una línea (índice de carácter dentro del texto completo). Es donde el modo Acordes dibuja un «+». */
export function iniciosDePalabra(l: { ini: number; txt: string }): number[] {
  const out: number[] = [], re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(l.txt))) out.push(l.ini + m.index)
  return out
}
/** La palabra de la línea de letra que contiene el lugar `at` (su final cuenta); null si ahí no hay palabra (un espacio suelto, una línea sin letra). */
export function palabraEn(doc: Documento, at: number): string | null {
  const l = lineaEn(estructura(doc.texto).lineas, at)
  if (!aceptaAcordes(l)) return null
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(l.txt))) if (l.ini + m.index <= at && at <= l.ini + m.index + m[0].length) return m[0]
  return null
}
/** El inicio de la palabra que sigue a `at`: en la misma línea, o la primera de la siguiente línea con letra (se saltan encabezados, líneas vacías y «(instrumental)»). null si no hay más. */
export function siguientePalabra(doc: Documento, at: number): number | null {
  const lineas = estructura(doc.texto).lineas, k = lineas.findIndex(l => l.ini <= at && at <= l.fin)
  if (k < 0) return null
  const aqui = iniciosDePalabra(lineas[k]).find(x => x > at)
  if (aqui !== undefined && aceptaAcordes(lineas[k])) return aqui
  for (let n = k + 1; n < lineas.length; n++) if (aceptaAcordes(lineas[n])) { const p = iniciosDePalabra(lineas[n]); if (p.length) return p[0] }
  return null
}
/** Mueve el acorde de `at` una letra (delta ±1) sin salirse de su línea. null si no hay acorde ahí, si se saldría de la línea o si el lugar ya tiene otro acorde (no se pisan). */
export function moverAcorde(doc: Documento, at: number, delta: -1 | 1): Documento | null {
  const a = doc.anclas.find(x => x.at === at), l = lineaEn(estructura(doc.texto).lineas, at), to = at + delta
  if (!a || !l || to < l.ini || to > l.fin || doc.anclas.some(x => x.at === to)) return null
  return { ...doc, anclas: doc.anclas.map(x => (x === a ? { ...x, at: to } : x)).sort((x, y) => x.at - y.at) }
}

/* ───────── encabezados de sección (editor v2 · E2) ─────────
   Los botones insertan SOLO nombres que reconoce `looksLikeHeader` (lib/parseLyrics.ts: hasta 4 palabras con mayúscula o dígito, sin guion ni coma): VERSO n, PRE CORO, CORO, PUENTE, INTERLUDIO, FINAL.
   Cambiar el tipo, renumerar o borrar edita el TEXTO con la misma regla de posición de siempre; el orden del arreglo no se toca. */
export type TipoSeccion = 'verso' | 'precoro' | 'coro' | 'puente' | 'interludio' | 'instrumental' | 'tag' | 'final'
export const TIPOS_SECCION: readonly TipoSeccion[] = ['verso', 'precoro', 'coro', 'puente', 'interludio', 'instrumental', 'tag', 'final']
const NOMBRE_TIPO: Record<TipoSeccion, string> = { verso: 'VERSO', precoro: 'PRE CORO', coro: 'CORO', puente: 'PUENTE', interludio: 'INTERLUDIO', instrumental: 'INSTRUMENTAL', tag: 'TAG', final: 'FINAL' }
const sinAcentos = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
/** El tipo de una sección según su nombre («VERSO 2» → verso). «Ending» y «Outro» se reconocen como Final. null si no es de los ocho. */
export function tipoDeNombre(nombre: string): TipoSeccion | null {
  const n = sinAcentos(nombre).trim()
  if (/^(verso|estrofa)\b/.test(n)) return 'verso'
  if (/^pre[\s-]?coro\b/.test(n)) return 'precoro'
  if (/^coro\b/.test(n)) return 'coro'
  if (/^puente\b/.test(n)) return 'puente'
  if (/^interludio\b/.test(n)) return 'interludio'
  if (/^instrumental\b/.test(n)) return 'instrumental'
  if (/^tag\b/.test(n)) return 'tag'
  if (/^(final|ending|outro)\b/.test(n)) return 'final'
  return null
}
const numeroDeVerso = (nombre: string): number => Number(/^\s*(?:verso|estrofa)\s*(\d+)/i.exec(nombre)?.[1] ?? 1)
/** El nombre que lleva un encabezado de ese tipo; los versos se numeran con el mayor número que ya hay + 1 (sin contar la sección `ignorar`, que es la que se está cambiando). */
export function nombreDeTipo(doc: Documento, tipo: TipoSeccion, ignorar = -1): string {
  if (tipo !== 'verso') return NOMBRE_TIPO[tipo]
  const mayor = estructura(doc.texto).secciones.reduce((m, sec, k) => (k !== ignorar && tipoDeNombre(sec.nombre) === 'verso' ? Math.max(m, numeroDeVerso(sec.nombre)) : m), 0)
  return `VERSO ${mayor + 1}`
}
/* ───────── las partes del documento (para la tira del editor de una canción nueva) ───────── */
export type ParteDoc = { nombre: string; ini: number }
/** Las partes del texto, una por sección (mismo orden e índice que `estructura(texto).secciones` y que el modo Acordes): su nombre y dónde empieza su primera línea (el encabezado, o la primera línea de letra si no tiene). Un encabezado SOLO, sin letra («CORO:» recién agregado), cuenta como una parte con ese nombre. Sin nombre → ''. */
export function partesDeDocumento(texto: string): ParteDoc[] {
  const est = estructura(texto)
  return est.secciones.map((sec, k) => {
    const cab = est.lineas.find(l => l.rol === 'encabezado' && l.seccion === k)
    const primera = cab ?? est.lineas.find(l => l.seccion === k && l.rol === 'letra')
    const solo = !cab && sec.lineas.length === 1 && looksLikeHeader(est.lineas[sec.lineas[0]].txt.trim())       // un encabezado que todavía no tiene letra debajo
    return { nombre: cab ? sec.nombre : solo ? est.lineas[sec.lineas[0]].txt.trim().replace(/:\s*$/, '') : '', ini: primera ? primera.ini : 0 }
  })
}
/** La parte donde está el cursor: la última cuyo inicio ya pasó (0 si el cursor está antes de la primera o no hay partes). */
export function parteDeCaret(texto: string, caret: number): number {
  let a = 0
  partesDeDocumento(texto).forEach((p, i) => { if (p.ini <= caret) a = i })
  return a
}
/** La parte activa al desplazarse por el modo Acordes: la última cuyo borde de arriba (px) ya llegó a la línea; `null` = esa parte no está en pantalla. 0 si ninguna. */
export function parteAlcanzada(bordesDeArriba: (number | null)[], linea: number): number {
  let a = 0
  bordesDeArriba.forEach((t, i) => { if (t !== null && t <= linea) a = i })
  return a
}

/** El máximo de secciones de una canción (el mismo límite de la ruta de guardado, `LIMITES.secciones`). */
export const MAX_SECCIONES = 40
const numeroDeParte = (nombre: string): number => Number(/(\d+)\s*$/.exec(nombre.replace(/\s*\([^)]*\)\s*$/, '').trim())?.[1] ?? 1)
/** El documento sin su último encabezado si ese encabezado está SOLO (sin ninguna línea debajo, p. ej. «CORO:» recién agregado y todavía sin letra). Un encabezado sin letra no cuenta como sección, y dejarlo suelto lo volvería una línea de letra: la parte nueva lo reemplaza. */
function sinEncabezadoVacio(doc: Documento): Documento {
  const T = doc.texto, fin = T.replace(/\s+$/, '').length, ini = T.lastIndexOf('\n', fin - 1) + 1, previa = ini === 0 ? '' : T.slice(T.lastIndexOf('\n', ini - 2) + 1, ini - 1)
  return fin > 0 && !previa.trim() && looksLikeHeader(T.slice(ini, fin).trim()) ? aplicarEdicion(doc, { s: ini, e: T.length, t: '' }).doc : doc
}
/** El nombre que recibiría una parte NUEVA de ese tipo agregada al final: el mayor número que ya hay de su tipo + 1 (una parte sin número cuenta como 1). La primera de cada tipo no lleva número, salvo el verso («VERSO 1», como siempre): VERSO 3, CORO 2, PRE CORO 2, PUENTE. */
export function nombreSiguiente(doc: Documento, tipo: TipoSeccion): string {
  const d = sinEncabezadoVacio(doc)
  if (tipo === 'verso') return nombreDeTipo(d, tipo)
  const mismas = estructura(d.texto).secciones.filter(sec => tipoDeNombre(sec.nombre) === tipo)
  return mismas.length ? `${NOMBRE_TIPO[tipo]} ${Math.max(...mismas.map(sec => numeroDeParte(sec.nombre))) + 1}` : NOMBRE_TIPO[tipo]
}
/** Agrega una parte al FINAL del documento (nunca en medio: así no se corre ninguna fila ya guardada): su encabezado con el nombre numerado, y «(instrumental)» en Interludio e Instrumental. Deja el cursor listo para escribir debajo. Si el último encabezado está vacío (sin letra), la parte nueva lo reemplaza. null si ya hay `MAX_SECCIONES`. */
export function agregarParte(doc: Documento, tipo: TipoSeccion): { doc: Documento; caret: number; nombre: string } | null {
  const base = sinEncabezadoVacio(doc)
  if (estructura(base.texto).secciones.length >= MAX_SECCIONES) return null
  const T = base.texto, separador = !T.trim() ? '' : T.endsWith('\n\n') ? '' : T.endsWith('\n') ? '\n' : '\n\n', nombre = nombreSiguiente(doc, tipo)
  const t = `${separador}${nombre}:\n${tipo === 'interludio' || tipo === 'instrumental' ? INSTRUMENTAL + '\n' : ''}`
  const d = aplicarEdicion(base, { s: T.length, e: T.length, t }).doc
  return { doc: d, caret: d.texto.length, nombre }
}
/** Inserta un encabezado en la línea donde está el cursor (`caret`): la línea actual pasa a ser la primera de la sección nueva, con una línea vacía antes si hace falta. «Interludio» e «Instrumental» traen su «(instrumental)» (solo acordes). Devuelve el cursor ya colocado. */
export function insertarEncabezado(doc: Documento, caret: number, tipo: TipoSeccion): { doc: Documento; caret: number; quitados: Quitados } {
  const T = doc.texto, c = Math.max(0, Math.min(T.length, Math.trunc(caret) || 0))
  const s = c === 0 ? 0 : T.lastIndexOf('\n', c - 1) + 1
  const nl = T.indexOf('\n', s), vacia = !T.slice(s, nl < 0 ? T.length : nl).trim()
  const aqui = estructura(T).lineas.find(l => l.ini === s)
  if (aqui && aqui.rol === 'encabezado') {                                      // el cursor está en un encabezado ya puesto: el botón le cambia el tipo (no deja uno huérfano encima)
    const d = cambiarTipoSeccion(doc, aqui.seccion, tipo) ?? doc, n = estructura(d.texto).lineas.find(l => l.rol === 'encabezado' && l.seccion === aqui.seccion)
    return { doc: d, caret: n ? Math.min(d.texto.length, n.fin + 1) : s, quitados: { acordes: 0, interludios: 0 } }
  }
  const previa = s > 0 ? T.slice(T.lastIndexOf('\n', s - 2) + 1, s - 1) : null
  const prefijo = previa !== null && previa.trim() ? '\n' : ''
  const nombre = nombreDeTipo(doc, tipo)
  const t = tipo === 'interludio' || tipo === 'instrumental' ? `${prefijo}${nombre}:\n${INSTRUMENTAL}${vacia ? '\n' : '\n\n'}` : `${prefijo}${nombre}:\n`
  const r = aplicarEdicion(doc, { s, e: s, t })
  return { doc: r.doc, caret: s + t.length, quitados: r.quitados }
}
const SUFIJO = /\s*(\([^)]*\))\s*:?\s*$/
const lineaDeEncabezado = (est: ReturnType<typeof estructura>, k: number) => est.lineas.find(l => l.rol === 'encabezado' && l.seccion === k) ?? null
const conNombre = (doc: Documento, h: LineaDoc, nombre: string): Documento => {
  const sufijo = SUFIJO.exec(h.txt)?.[1], t = `${nombre}${sufijo ? ' ' + sufijo : ''}:`
  return t === h.txt.trim() ? doc : aplicarEdicion(doc, { s: h.ini, e: h.fin, t }).doc
}
/** Cambia el tipo de una sección ya puesta, conservando lo que tenga entre paréntesis («VERSO 1 (2x):» → «CORO (2x):»). null si la sección no tiene encabezado. */
export function cambiarTipoSeccion(doc: Documento, seccion: number, tipo: TipoSeccion): Documento | null {
  const h = lineaDeEncabezado(estructura(doc.texto), seccion)
  return h ? conNombre(doc, h, nombreDeTipo(doc, tipo, seccion)) : null
}
/** Renumera los versos en el orden en que están: VERSO 1, VERSO 2… (el resto de los encabezados no se toca). */
export function renumerarVersos(doc: Documento): Documento {
  let d = doc, n = 0
  for (let k = 0; k < estructura(doc.texto).secciones.length; k++) {
    const est = estructura(d.texto), sec = est.secciones[k], h = lineaDeEncabezado(est, k)
    if (!sec || !h || tipoDeNombre(sec.nombre) !== 'verso') continue
    d = conNombre(d, h, `VERSO ${++n}`)
  }
  return d
}
/** Borra una sección entera (encabezado, líneas y la línea vacía que la separaba). Sus acordes y líneas de acordes se van con ella y se cuentan en `quitados` para avisar y poder Deshacer. */
export function borrarSeccion(doc: Documento, seccion: number): { doc: Documento; quitados: Quitados; nombre: string } | null {
  const T = doc.texto, est = estructura(T), sec = est.secciones[seccion]
  if (!sec) return null
  const h = lineaDeEncabezado(est, seccion), idx = [...(h ? [est.lineas.indexOf(h)] : []), ...sec.lineas]
  if (!idx.length) return null
  const primera = est.lineas[Math.min(...idx)], ultima = est.lineas[Math.max(...idx)]
  const s = primera.ini
  let e = ultima.fin < T.length ? ultima.fin + 1 : T.length
  while (e < T.length) {                                                       // las líneas vacías que la separaban de la siguiente
    const nl = T.indexOf('\n', e), linea = T.slice(e, nl < 0 ? T.length : nl)
    if (/^[ \t]*$/.test(linea)) e = nl < 0 ? T.length : nl + 1; else break
  }
  const r = aplicarEdicion(doc, { s, e, t: '' })
  const cola = /\s+$/.exec(r.doc.texto)                                        // si era la última, no deja líneas vacías de sobra al final
  const final = cola && cola.index > 0 ? aplicarEdicion(r.doc, { s: cola.index, e: r.doc.texto.length, t: '' }).doc : r.doc
  return { doc: final, quitados: r.quitados, nombre: sec.nombre }
}

/** Dónde va el interludio de una sección: al final de su última línea (de letra o «(instrumental)»). null si la sección no tiene líneas. */
export function finDeSeccion(doc: Documento, seccion: number): number | null {
  const est = estructura(doc.texto), s = est.secciones[seccion]
  return s && s.lineas.length ? est.lineas[s.lineas[s.lineas.length - 1]].fin : null
}
/** Las líneas de acordes (interludios) que van al final de la línea que termina en `at`, en su orden. */
export const lineasDeCompas = (doc: Documento, at: number): ItemCompas[][] => doc.interludios.filter(x => x.at === at).map(x => x.items)
/** Cambia la línea de acordes número `n` (0 = la primera) del final de una línea de letra; `n` igual a la cantidad que hay la agrega al final; con `items` vacío la quita. null si ahí no se puede (no es el final de una línea de letra, o `n` no existe). */
export function ponerLineaCompas(doc: Documento, at: number, n: number, items: ItemCompas[]): Documento | null {
  const l = lineaEn(estructura(doc.texto).lineas, at)
  if (!l || l.rol !== 'letra' || l.fin !== at || !Number.isInteger(n)) return null
  const mismas = doc.interludios.filter(x => x.at === at)
  if (n < 0 || n > mismas.length) return null
  const nuevas = [...mismas]
  if (n === mismas.length) { if (!items.length) return doc; nuevas.push({ at, items }) } else if (!items.length) nuevas.splice(n, 1); else nuevas[n] = { at, items }
  return { ...doc, interludios: [...doc.interludios.filter(x => x.at !== at), ...nuevas].sort((a, b) => a.at - b.at) }
}
export const quitarLineaCompas = (doc: Documento, at: number, n: number): Documento | null => ponerLineaCompas(doc, at, n, [])
/** Compatibilidad: pone la PRIMERA línea de acordes de ese lugar (o la crea). */
export const ponerInterludio = (doc: Documento, at: number, items: ItemCompas[]): Documento | null => ponerLineaCompas(doc, at, 0, items)
/** Quita TODAS las líneas de acordes de ese lugar. */
export const quitarInterludio = (doc: Documento, at: number): Documento => ({ ...doc, interludios: doc.interludios.filter(x => x.at !== at) })

/* ───────── piezas de una línea de acordes: acordes, barras «|» y espacios ─────────
   Un espacio es una pieza de texto hecha de 1 a ESPACIO_MAXIMO espacios simples (el guardado solo acepta eso). −/+ del panel cambian su ancho. */
export const ESPACIO_MAXIMO = 8
/** Se pone en false para esconder el botón «+ Espacio» (por ejemplo si se quita el commit que deja guardar espacios). */
export const ESPACIOS_EN_COMPAS = true
/** El ancho de una pieza de espacio (cuántos espacios), o null si la pieza no es un espacio. */
export const anchoDeEspacio = (x: ItemCompas | undefined): number | null => (x && 'texto' in x && /^ +$/.test(x.texto) ? x.texto.length : null)
export const esEspacio = (x: ItemCompas | undefined): boolean => anchoDeEspacio(x) !== null
export const nuevoEspacio = (ancho = 2): ItemCompas => ({ texto: ' '.repeat(Math.max(1, Math.min(ESPACIO_MAXIMO, Math.trunc(ancho) || 1))) })
/** Cambia el ancho del espacio `i` en `delta` (±1). null si no es un espacio o se saldría de 1…ESPACIO_MAXIMO. */
export function conAnchoDeEspacio(items: ItemCompas[], i: number, delta: number): ItemCompas[] | null {
  const actual = anchoDeEspacio(items[i])
  if (actual === null) return null
  const n = actual + delta
  return n < 1 || n > ESPACIO_MAXIMO ? null : items.map((y, k) => (k === i ? nuevoEspacio(n) : y))
}
/** Inserta una pieza DESPUÉS de la `i` (o al final si `i` es null) y dice dónde quedó. */
export function insertarPieza(items: ItemCompas[], i: number | null, pieza: ItemCompas): { items: ItemCompas[]; idx: number } {
  const idx = i === null || i < 0 || i >= items.length ? items.length : i + 1
  return { items: [...items.slice(0, idx), pieza, ...items.slice(idx)], idx }
}
/** Intercambia la pieza `i` con su vecina (delta ±1). null si no hay vecina. */
export function moverPieza(items: ItemCompas[], i: number, delta: -1 | 1): ItemCompas[] | null {
  const j = i + delta
  if (i < 0 || i >= items.length || j < 0 || j >= items.length) return null
  const c = [...items]; [c[i], c[j]] = [c[j], c[i]]; return c
}

/** Agrega al final del texto una sección solo instrumental («INTERLUDIO:» + «(instrumental)»), lista para llevar un interludio. */
export function agregarSeccionInstrumental(doc: Documento, nombre = 'INTERLUDIO'): { doc: Documento; at: number } {
  const T = doc.texto, separador = !T.trim() ? '' : T.endsWith('\n\n') ? '' : T.endsWith('\n') ? '\n' : '\n\n'
  const d = aplicarEdicion(doc, { s: T.length, e: T.length, t: `${separador}${nombre}:\n${INSTRUMENTAL}` }).doc
  return { doc: d, at: d.texto.length }
}

/* ───────── de y hacia el formato 2 (secciones con líneas) ───────── */
export type SeccionChart = { nombre: string; codigo: string; lineas: LineaF2[] }

const ABREV: Record<string, string> = { pre: 'PC', verso: 'V', estrofa: 'V', coro: 'C', 'pre-coro': 'PC', precoro: 'PC', puente: 'P', interludio: 'INT', instrumental: 'Inst', intro: 'I', final: 'F', outro: 'F', tag: 'Tg' }
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
      for (const x of doc.interludios) if (x.at === l.fin) lineas.push({ kind: 'bars', items: x.items })      // cada línea de acordes, en su orden
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
