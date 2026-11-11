// «Nueva canción» en teléfono (paso A): la lógica pura de la ventana «Datos» y «Más datos». Sin pantalla ni red: valida, convierte la duración y arma lo que se inserta en `songs`.
// La canción nace como BORRADOR (publicada = false, migración 056): no la ven los músicos ni se ofrece en los setlists hasta el primer guardado con letra.
import { esTonoValido } from '@/lib/tonos'

export interface DatosNueva {
  nombre: string; artista: string; tono: string; bpm: string; compas: string; duracion: string
  // «Más datos»
  autor: string; traductor: string; original_title: string; ccli: string; copyright: string
  link_spotify: string; link_letras: string; link_recursos: string; notas: string; caratula_url: string
}
export const datosVacios = (): DatosNueva => ({ nombre: '', artista: '', tono: '', bpm: '', compas: '', duracion: '', autor: '', traductor: '', original_title: '', ccli: '', copyright: '', link_spotify: '', link_letras: '', link_recursos: '', notas: '', caratula_url: '' })

/** «Crear y escribir la letra» abre el editor (pide tono); «Solo crear» deja la canción en borrador (tono opcional). */
export type AccionCrear = 'escribir' | 'solo'
export type ErroresNueva = Partial<Record<'nombre' | 'tono' | 'bpm' | 'duracion', string>>

export const TEXTOS_NUEVA = {
  titulo: 'Nueva canción', cerrar: 'Cerrar', campoNombre: 'Título', campoArtista: 'Artista', ayudaArtista: '¿Quién la canta?', campoTono: 'Tonalidad original', campoBpm: 'BPM', campoCompas: 'Compás', campoDuracion: 'Duración', ayudaDuracion: 'ej: 6:59', sinElegir: 'Elegir',
  masDatos: 'Más datos', masDatosAyuda: 'Autor, traductor, CCLI, copyright, enlaces, notas', volver: 'Volver', listo: 'Listo',
  crearEscribir: 'Crear y escribir la letra', soloCrear: 'Solo crear, la escribo después', creando: 'Creando…',
  faltaNombre: 'Escribe el título de la canción.', faltaTono: 'Elige la tonalidad para escribir la letra: los acordes dependen de ella.', tonoNoValido: 'El tono no es válido. Elige uno de la lista.', bpmNoValido: 'El BPM debe ser un número mayor que 0.', duracionNoValida: 'La duración se escribe como minutos:segundos, por ejemplo 6:59.',
  errorCrear: 'No se pudo crear la canción. Inténtalo de nuevo.', borrador: 'Borrador', publicar: 'Publicar', publicando: 'Publicando…', borradorAyuda: 'Borrador: los músicos aún no la ven y no se ofrece en los setlists.', errorPublicar: 'No se pudo publicar la canción. Inténtalo de nuevo.',
  campoAutor: 'Autor (letra y música)', campoTraductor: 'Traductor', campoOriginal: 'Título original', campoCcli: 'CCLI', campoCopyright: 'Copyright', campoYoutube: 'Link YouTube', campoLetras: 'Letras / Acordes (enlace externo)', campoRecursos: 'Recursos', campoNotas: 'Notas internas', campoCaratula: 'Carátula', elegirCaratula: 'Elegir imagen', cambiarCaratula: 'Cambiar imagen', subiendoCaratula: 'Subiendo…', errorCaratula: 'No se pudo subir la carátula.',
} as const

/** «6:59» → 419 (segundos; la columna `duracion_min` guarda segundos desde siempre). «7» = 7 minutos. Vacío = sin duración (null). null si no se entiende. */
export function duracionASegundos(texto: string): number | null | undefined {
  const t = texto.trim()
  if (!t) return null
  const m = /^(\d{1,3}):([0-5]?\d)$/.exec(t)
  if (m) { const s = Number(m[1]) * 60 + Number(m[2]); return s > 0 ? s : undefined }
  if (/^\d{1,3}(\.\d+)?$/.test(t)) { const s = Math.round(parseFloat(t) * 60); return s > 0 ? s : undefined }
  return undefined
}
/** 419 → «6:59». */
export function segundosADuracion(seg: number | null | undefined): string {
  if (!seg) return ''
  return `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`
}

/** Los errores de la ventana «Datos» (vacío = se puede crear). El tono es obligatorio solo al escribir la letra; en cualquier caso, si viene, debe ser válido. */
export function validarNueva(d: DatosNueva, accion: AccionCrear): ErroresNueva {
  const e: ErroresNueva = {}
  if (!d.nombre.trim()) e.nombre = TEXTOS_NUEVA.faltaNombre
  if (d.tono && !esTonoValido(d.tono)) e.tono = TEXTOS_NUEVA.tonoNoValido
  else if (accion === 'escribir' && !d.tono) e.tono = TEXTOS_NUEVA.faltaTono
  if (d.bpm.trim() && !(Number(d.bpm) > 0)) e.bpm = TEXTOS_NUEVA.bpmNoValido
  if (duracionASegundos(d.duracion) === undefined) e.duracion = TEXTOS_NUEVA.duracionNoValida
  return e
}

const o = (t: string): string | null => (t.trim() ? t.trim() : null)
/** Lo que se inserta en `songs`: los mismos campos que el formulario de siempre, más `publicada: false`. */
export function payloadNueva(d: DatosNueva): Record<string, unknown> {
  return {
    nombre: d.nombre.trim(), artista: d.artista.trim(), autor: o(d.autor), traductor: o(d.traductor), tono_original: o(d.tono),
    bpm: d.bpm.trim() ? Number(d.bpm) : null, compas: o(d.compas), caratula_url: o(d.caratula_url),
    link_spotify: o(d.link_spotify), link_letras: o(d.link_letras), link_recursos: o(d.link_recursos),
    notas: o(d.notas), duracion_min: duracionASegundos(d.duracion) ?? null, original_title: o(d.original_title), ccli: o(d.ccli), copyright: o(d.copyright),
    letra: null, publicada: false,
  }
}
