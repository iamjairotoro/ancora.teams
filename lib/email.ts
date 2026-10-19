// Envío de correo compartido (punto 61). Gmail SMTP con nodemailer; variables de entorno GMAIL_USER y GMAIL_APP_PASSWORD
// (solo se leen aquí; nunca se imprimen ni van en un mensaje de error). Cambiar de proveedor (Resend u otro con webhooks)
// es un pendiente aparte: el remitente y el transporte viven en este único archivo.
//
// «ok» significa que el servidor de correo ACEPTÓ el mensaje para esa dirección (nodemailer: la dirección está en
// `accepted` y `rejected` está vacío). NO significa que llegó: un buzón inexistente en un dominio real rebota más tarde,
// a la bandeja del remitente, y la app no lo ve.
import { GUARDADO } from '@/lib/textos/correoGuardado'
import { CORREO } from '@/lib/textos/correo'
import { createTransport } from 'nodemailer'

export interface MensajeCorreo { to: string; subject: string; html: string }
/** `motivo` es la frase para quien administra; `guardado`, el texto técnico que se escribe en invitations.email_error (lib/textos/correoGuardado.ts). */
export type ResultadoCorreo = { ok: true } | { ok: false; motivo: string; guardado: string }

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
  return t || CORREO.noSePudoEnviar
}

/** El texto técnico de siempre para GUARDAR el motivo (no se muestra tal cual: se traduce al mostrar). */
export function guardadoDeError(e: any): string {
  const code: string = e?.code || ''
  const respuesta: string = String(e?.response || e?.message || '')
  if (code === 'EAUTH' || e?.responseCode === 535) return GUARDADO.accesoRechazado
  if (/daily user sending limit|sending limit|5\.4\.5/i.test(respuesta)) return GUARDADO.limiteDiario
  if (code === 'EENVELOPE' || /no recipients defined|invalid (recipient|address)/i.test(respuesta)) return limpiarMotivo(GUARDADO.direccionRechazada(respuesta))
  if (['ECONNECTION', 'ESOCKET', 'ETIMEDOUT', 'ECONNRESET', 'EDNS', 'ECONNREFUSED'].includes(code)) return GUARDADO.sinConexion
  return limpiarMotivo(e?.message || e)
}

/** Traduce el error de nodemailer a una frase que quien administra pueda entender y actuar. El detalle técnico no va aquí: enviarCorreo lo escribe en la consola, recortado y sin claves. */
export function motivoDeError(e: any): string {
  const code: string = e?.code || ''
  const respuesta: string = String(e?.response || e?.message || '')
  if (code === 'EAUTH' || e?.responseCode === 535)
    return CORREO.accesoRechazado
  if (/daily user sending limit|sending limit|5\.4\.5/i.test(respuesta))
    return CORREO.limiteDiario
  if (code === 'EENVELOPE' || /no recipients defined|invalid (recipient|address)/i.test(respuesta))
    return CORREO.direccionRechazada
  if (['ECONNECTION', 'ESOCKET', 'ETIMEDOUT', 'ECONNRESET', 'EDNS', 'ECONNREFUSED'].includes(code))
    return CORREO.sinConexion
  return CORREO.noSePudoEnviar
}

let transporteGmail: { t: TransporteCorreo; remitente: string } | null = null

function transporteDelServidor(): { t: TransporteCorreo; remitente: string } | { error: string; guardado: string } {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) { console.error('[correo] faltan GMAIL_USER y GMAIL_APP_PASSWORD en el servidor'); return { error: CORREO.sinConfigurar, guardado: GUARDADO.sinConfigurar } }
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
  if ('error' in tr) return { ok: false, motivo: tr.error, guardado: tr.guardado }
  try {
    const info = await tr.t.sendMail({ from: tr.remitente, to: m.to, subject: m.subject, html: m.html })
    const aceptado = (info?.accepted ?? []).some(a => mismaDireccion(a, m.to))
    const rechazado = (info?.rejected ?? []).length > 0
    if (aceptado && !rechazado) return { ok: true }
    console.error('[correo] el servidor de correo no aceptó la dirección (accepted/rejected):', limpiarMotivo(JSON.stringify({ accepted: info?.accepted?.length ?? 0, rejected: info?.rejected?.length ?? 0 })))
    return { ok: false, motivo: CORREO.direccionNoAceptada, guardado: GUARDADO.noAceptada }
  } catch (e: any) {
    console.error('[correo] no se pudo enviar:', e?.code || '', e?.responseCode || '', limpiarMotivo(e?.response || e?.message || e))
    return { ok: false, motivo: motivoDeError(e), guardado: guardadoDeError(e) }
  }
}
