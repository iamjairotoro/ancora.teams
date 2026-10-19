// Validación de lo que la administración sube a una canción (punto 55, paso 4): se comprueba ANTES de subir, con mensajes claros.
// Pura (sin DOM ni red). La decisión no depende de lo que DECLARE el navegador (iOS manda .m4a como audio/x-m4a, otros como audio/mp4 o
// application/octet-stream): se mira la extensión y los primeros bytes del archivo, y se sube SIEMPRE con un tipo canónico elegido aquí.
// Los topes también los impone el almacenamiento (migración 036: song-audio 20 MB; migrations/036b: song-attachments 25 MB).

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024
export const MAX_ADJUNTO_BYTES = 25 * 1024 * 1024
/** Bytes del comienzo que hay que leer para reconocer el contenido. */
export const BYTES_CABECERA = 1024

export const AUDIO_POR_EXTENSION: Record<string, string> = { mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac' }
export const IMAGEN_POR_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
}
/** Para el `accept` del selector de archivos: SOLO extensiones (en iOS Safari `audio/*` mezclado con `image/*` oculta los .m4a). */
export const ACCEPT_SUBIDA = ['.pdf', ...Object.keys(AUDIO_POR_EXTENSION), ...Object.keys(IMAGEN_POR_EXTENSION)].map(e => (e.startsWith('.') ? e : '.' + e)).join(',')

export type DestinoSubida = 'song-audio' | 'song-attachments'
export interface ArchivoAceptado {
  ok: true
  kind: 'audio' | 'pdf' | 'image'
  bucket: DestinoSubida
  /** El `contentType` con el que se sube: el canónico de la extensión, no el que declaró el navegador. */
  contentType: string
  extension: string
}
export type ValidacionArchivo = ArchivoAceptado | { ok: false; mensaje: string }

export function extensionDe(nombre: string): string {
  const m = /\.([A-Za-z0-9]{1,6})$/.exec((nombre || '').trim())
  return m ? m[1].toLowerCase() : ''
}

const mb = (b: number) => (b / 1048576).toFixed(1).replace('.', ',')
const ascii = (c: Uint8Array, desde: number, texto: string) => texto.split('').every((ch, i) => c[desde + i] === ch.charCodeAt(0))

/** ¿Los primeros bytes son de verdad de ese formato? (MP3: ID3 o sincronía de cuadro; M4A/HEIC: «ftyp»; AAC: ADTS; PDF: %PDF-.) */
export function cabeceraCoincide(extension: string, c: Uint8Array): boolean {
  switch (extension) {
    case 'mp3': return ascii(c, 0, 'ID3') || (c[0] === 0xff && (c[1] & 0xe0) === 0xe0)
    case 'm4a': case 'heic': case 'heif': return ascii(c, 4, 'ftyp')
    case 'aac': return c[0] === 0xff && (c[1] & 0xf6) === 0xf0 || ascii(c, 0, 'ID3')
    case 'pdf': { for (let i = 0; i + 5 <= Math.min(c.length, BYTES_CABECERA); i++) if (ascii(c, i, '%PDF-')) return true; return false }
    case 'jpg': case 'jpeg': return c[0] === 0xff && c[1] === 0xd8 && c[2] === 0xff
    case 'png': return c[0] === 0x89 && ascii(c, 1, 'PNG')
    case 'gif': return ascii(c, 0, 'GIF8')
    case 'webp': return ascii(c, 0, 'RIFF') && ascii(c, 8, 'WEBP')
    default: return false
  }
}

/** Decide si el archivo se sube, adónde y con qué tipo; si no, dice por qué en una frase que se pueda actuar. */
export function validarArchivo(archivo: { name: string; size: number }, cabecera: Uint8Array): ValidacionArchivo {
  const ext = extensionDe(archivo.name)
  const esAudio = ext in AUDIO_POR_EXTENSION, esImagen = ext in IMAGEN_POR_EXTENSION, esPdf = ext === 'pdf'
  if (!esAudio && !esImagen && !esPdf)
    return { ok: false, mensaje: `«${archivo.name}»: este tipo de archivo no se puede subir. Se aceptan PDF e imágenes (hasta 25 MB) y audio MP3, M4A o AAC (hasta 20 MB).` }
  if (!archivo.size) return { ok: false, mensaje: `«${archivo.name}» está vacío.` }
  const tope = esAudio ? MAX_AUDIO_BYTES : MAX_ADJUNTO_BYTES
  if (archivo.size > tope)
    return { ok: false, mensaje: `«${archivo.name}» pesa ${mb(archivo.size)} MB y el máximo para ${esAudio ? 'un audio' : 'un PDF o una imagen'} es ${esAudio ? 20 : 25} MB.${esAudio ? ' Expórtalo más comprimido (MP3 o M4A).' : ''}` }
  if (!cabeceraCoincide(ext, cabecera))
    return { ok: false, mensaje: `«${archivo.name}»: el contenido no parece ser un ${ext.toUpperCase()} válido. ¿Le cambiaste la extensión?` }
  if (esAudio) return { ok: true, kind: 'audio', bucket: 'song-audio', contentType: AUDIO_POR_EXTENSION[ext], extension: ext }
  if (esPdf) return { ok: true, kind: 'pdf', bucket: 'song-attachments', contentType: 'application/pdf', extension: ext }
  return { ok: true, kind: 'image', bucket: 'song-attachments', contentType: IMAGEN_POR_EXTENSION[ext], extension: ext }
}

/** Nombre apto para una ruta del almacenamiento: sin acentos ni símbolos, con la extensión, de a lo sumo 80 caracteres. */
export function nombreSeguro(nombre: string): string {
  const ext = extensionDe(nombre)
  const base = (nombre || 'archivo').replace(/\.[A-Za-z0-9]{1,6}$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'archivo'
  return ext ? `${base}.${ext}` : base
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ruta de un audio nuevo: {organization_id}/{song_id}/{marca}-{nombre}. La organización va por delante (las políticas de 036 la comparan). */
export function rutaAudio(organizationId: string, songId: string, nombre: string, marca: number): string {
  if (!UUID.test(organizationId) || !UUID.test(songId)) throw new Error('Identificadores no válidos para la ruta del audio')
  return `${organizationId}/${songId}/${marca}-${nombreSeguro(nombre)}`
}

/** Ruta de un PDF o imagen nuevo: la de siempre en song-attachments, {song_id}/{marca}-{nombre}, con el nombre saneado. */
export function rutaAdjunto(songId: string, nombre: string, marca: number): string {
  if (!UUID.test(songId)) throw new Error('Identificador no válido para la ruta del adjunto')
  return `${songId}/${marca}-${nombreSeguro(nombre)}`
}

/** Frase para el error que devuelve el almacenamiento al subir (mensajes crudos de Supabase → algo que se entienda). */
export function mensajeDeErrorSubida(e: { message?: string; statusCode?: string | number } | null | undefined, bucket: DestinoSubida): string {
  const m = String(e?.message || '').toLowerCase()
  if (/bucket not found/.test(m)) { console.error(`[subida] el almacenamiento no tiene el espacio «${bucket}» (para audio: falta la migración 036)`); return bucket === 'song-audio' ? 'No se pudo subir el audio: el espacio para audios todavía no está listo. Avisa a quien mantiene la aplicación.' : 'No se pudo subir el archivo: el espacio de adjuntos no está listo. Avisa a quien mantiene la aplicación.' }
  if (/row-level security|violates|unauthorized|not authorized|403/.test(m) || String(e?.statusCode) === '403')
    return bucket === 'song-audio' ? 'No tienes permiso para subir audio: hace falta ser propietario/admin o líder de un equipo con acceso a la biblioteca.' : 'No tienes permiso para subir adjuntos.'
  if (/maximum allowed size|too large|payload|413/.test(m) || String(e?.statusCode) === '413') return 'El almacenamiento rechazó el archivo porque pesa más del máximo permitido.'
  if (/mime type|not supported|invalid_mime|415/.test(m) || String(e?.statusCode) === '415') return 'El almacenamiento rechazó el tipo de archivo.'
  return 'No se pudo subir el archivo. Inténtalo de nuevo.'
}
