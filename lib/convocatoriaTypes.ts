// Tipos del resultado de una convocatoria por correo (punto 61). Solo tipos: los importan la ruta del servidor y la
// pantalla, así que este archivo NO puede traer nodemailer ni nada de servidor.
import { plural } from '@/lib/textos/plural'

/** enviado = el servidor de correo ACEPTÓ el mensaje (no garantiza que llegue); falló = no se envió; omitido = ni se intentó. */
export type EstadoDestinatario = 'enviado' | 'falló' | 'omitido'

/** Qué pasó con la notificación push de esa persona (va aparte del correo). */
export type EstadoPush = 'enviado' | 'parcial' | 'sin dispositivo' | 'falló' | 'no configurado' | 'no aplica'

export interface ResultadoDestinatario {
  /** Solo en «falló»: el texto técnico que se guarda en invitations.email_error (el que se muestra es `motivo`). */
  motivoGuardado?: string | null
  memberId: string
  /** El equipo de esta convocatoria (punto 52: una invitación por servicio, persona y equipo). NULL en los ensayos. */
  teamId?: string | null
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

/** Lo que la pantalla de administración muestra de una llamada que NO salió bien o que no tuvo nada que hacer: `error` (rojo, no se va solo hasta «Cerrar») e `info` (una línea
 *  discreta que desaparece sola). El resultado de un envío por persona ya no se muestra como panel: solo el «!» de quien tiene un problema (lib/problemasCorreo.ts). */
export interface AvisoConvocatoria { tipo: 'error' | 'info'; texto: string }

export function resumir(results: ResultadoDestinatario[]): ResumenConvocatoria {
  return {
    enviados: results.filter(r => r.estado === 'enviado').length,
    fallaron: results.filter(r => r.estado === 'falló').length,
    omitidos: results.filter(r => r.estado === 'omitido').length,
  }
}

/** «Se enviaron 3 correos · 1 falló · 1 omitido». «Enviado» = el servidor de correo lo aceptó (no garantiza que llegue); nunca dice «entregado». */
export function textoResumen(r: ResumenConvocatoria): string {
  const partes = [r.enviados === 1 ? 'Se envió 1 correo' : `Se enviaron ${r.enviados} correos`]
  if (r.fallaron) partes.push(`${r.fallaron} ${plural(r.fallaron, 'falló', 'fallaron')}`)
  if (r.omitidos) partes.push(`${r.omitidos} ${plural(r.omitidos, 'omitido', 'omitidos')}`)
  return partes.join(' · ')
}
