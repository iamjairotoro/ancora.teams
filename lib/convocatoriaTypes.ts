// Tipos del resultado de una convocatoria por correo (punto 61). Solo tipos: los importan la ruta del servidor y la
// pantalla, así que este archivo NO puede traer nodemailer ni nada de servidor.

/** enviado = el servidor de correo ACEPTÓ el mensaje (no garantiza que llegue); falló = no se envió; omitido = ni se intentó. */
export type EstadoDestinatario = 'enviado' | 'falló' | 'omitido'

/** Qué pasó con la notificación push de esa persona (va aparte del correo). */
export type EstadoPush = 'enviado' | 'parcial' | 'sin dispositivo' | 'falló' | 'no configurado' | 'no aplica'

export interface ResultadoDestinatario {
  memberId: string
  nombre: string
  email: string | null
  estado: EstadoDestinatario
  /** Por qué falló o se omitió. Corto (≤ 200 caracteres) y sin claves. */
  motivo: string | null
  /** Nota que no cambia el estado, p. ej. «no se pudo validar el dominio». */
  aviso: string | null
  push: EstadoPush
}

export interface ResumenConvocatoria { enviados: number; fallaron: number; omitidos: number }

/** Respuesta de /api/send-invites (y, desde el commit 3, de /api/send-ensayo-invites). */
export interface RespuestaConvocatoria {
  message: string
  resumen: ResumenConvocatoria
  results: ResultadoDestinatario[]
}

/** Lo que la pantalla de administración deja visible hasta que se pulsa «Cerrar». */
export type AvisoConvocatoria =
  | { tipo: 'resultado'; message: string; resumen: ResumenConvocatoria; results: ResultadoDestinatario[] }
  | { tipo: 'error' | 'info'; texto: string }

export function resumir(results: ResultadoDestinatario[]): ResumenConvocatoria {
  return {
    enviados: results.filter(r => r.estado === 'enviado').length,
    fallaron: results.filter(r => r.estado === 'falló').length,
    omitidos: results.filter(r => r.estado === 'omitido').length,
  }
}

/** «3 aceptado(s) por el servidor de correo · 1 falló · 1 omitido». Nunca dice «enviada(s)» a secas ni «entregada(s)». */
export function textoResumen(r: ResumenConvocatoria): string {
  const partes = [`${r.enviados} aceptado(s) por el servidor de correo`]
  if (r.fallaron) partes.push(`${r.fallaron} falló`)
  if (r.omitidos) partes.push(`${r.omitidos} omitido(s)`)
  return partes.join(' · ')
}
