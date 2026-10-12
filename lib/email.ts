// Envío de correo compartido (punto 61). Gmail SMTP con nodemailer; variables de entorno GMAIL_USER y GMAIL_APP_PASSWORD
// (solo se leen aquí; nunca se imprimen ni van en un mensaje de error). Cambiar de proveedor (Resend u otro con webhooks)
// es un pendiente aparte: el remitente y el transporte viven en este único archivo.
//
// «ok» significa que el servidor de correo ACEPTÓ el mensaje para esa dirección (nodemailer: la dirección está en
// `accepted` y `rejected` está vacío). NO significa que llegó: un buzón inexistente en un dominio real rebota más tarde,
// a la bandeja del remitente, y la app no lo ve.
import { createTransport } from 'nodemailer'

export interface MensajeCorreo { to: string; subject: string; html: string }
export type ResultadoCorreo = { ok: true } | { ok: false; motivo: string }

/** Lo mínimo que se usa de nodemailer; las pruebas inyectan uno que captura los mensajes sin enviar nada. */
export interface TransporteCorreo {
  sendMail(m: { from: string; to: string; subject: string; html: string }): Promise<{ accepted?: unknown[]; rejected?: unknown[] }>
}

const MAX_MOTIVO = 200

/** Texto corto y seguro para guardar o mostrar: sin el valor de las claves, en una línea, recortado a ~200 caracteres. */
export function limpiarMotivo(texto: unknown): string {
  let t = String(texto ?? '').replace(/\s+/g, ' ').trim()
  for (const secreto of [process.env.GMAIL_APP_PASSWORD, process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '')]) {
    if (secreto && secreto.length >= 4) t = t.split(secreto).join('***')
  }
  if (t.length > MAX_MOTIVO) t = t.slice(0, MAX_MOTIVO - 1).trimEnd() + '…'
  return t || 'Error desconocido'
}

/** Traduce el error de nodemailer a una frase que Claudia pueda actuar; el detalle técnico va recortado y sin claves. */
export function motivoDeError(e: any): string {
  const code: string = e?.code || ''
  const respuesta: string = String(e?.response || e?.message || '')
  if (code === 'EAUTH' || e?.responseCode === 535)
    return 'El servidor de correo rechazó el usuario o la contraseña de aplicación (revisar GMAIL_USER y GMAIL_APP_PASSWORD en Vercel).'
  if (/daily user sending limit|sending limit|5\.4\.5/i.test(respuesta))
    return 'Gmail alcanzó el límite diario de envíos; reintentar más tarde.'
  if (code === 'EENVELOPE' || /no recipients defined|invalid (recipient|address)/i.test(respuesta))
    return limpiarMotivo(`El servidor de correo rechazó la dirección. ${respuesta}`)
  if (['ECONNECTION', 'ESOCKET', 'ETIMEDOUT', 'ECONNRESET', 'EDNS', 'ECONNREFUSED'].includes(code))
    return 'No se pudo conectar con el servidor de correo; reintentar en un momento.'
  return limpiarMotivo(e?.message || e)
}

let transporteGmail: { t: TransporteCorreo; remitente: string } | null = null

function transporteDelServidor(): { t: TransporteCorreo; remitente: string } | { error: string } {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return { error: 'Falta configurar el correo del servidor (GMAIL_USER y GMAIL_APP_PASSWORD).' }
  if (!transporteGmail) {
    transporteGmail = {
      t: createTransport({ service: 'gmail', auth: { user, pass }, pool: true, maxConnections: 5 }) as TransporteCorreo,
      remitente: `Ancora Setlist <${user}>`,
    }
  }
  return transporteGmail
}

function mismaDireccion(a: unknown, b: string): boolean {
  const s = typeof a === 'string' ? a : (a as any)?.address
  return typeof s === 'string' && s.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Manda UN correo. Nunca lanza: devuelve {ok:true} si el servidor lo aceptó para esa dirección y {ok:false, motivo} si no.
 * `transporte` solo lo usan las pruebas (envío simulado).
 */
export async function enviarCorreo(
  m: MensajeCorreo,
  transporte?: { t: TransporteCorreo; remitente: string },
): Promise<ResultadoCorreo> {
  const tr = transporte ?? transporteDelServidor()
  if ('error' in tr) return { ok: false, motivo: tr.error }
  try {
    const info = await tr.t.sendMail({ from: tr.remitente, to: m.to, subject: m.subject, html: m.html })
    const aceptado = (info?.accepted ?? []).some(a => mismaDireccion(a, m.to))
    const rechazado = (info?.rejected ?? []).length > 0
    if (aceptado && !rechazado) return { ok: true }
    return { ok: false, motivo: 'El servidor de correo no aceptó la dirección.' }
  } catch (e: any) {
    return { ok: false, motivo: motivoDeError(e) }
  }
}
