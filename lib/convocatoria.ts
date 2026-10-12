// Orquestación de una convocatoria por correo (punto 61): UN resultado por destinatario, con concurrencia limitada.
// No toca la base ni el proveedor directamente: la ruta le pasa las dependencias (preparar, validar, enviar, push), y así
// las pruebas corren con un envío simulado que captura los mensajes. Solo tipos de lib/convocatoriaTypes (sin servidor).
import type { EstadoPush, ResultadoDestinatario } from './convocatoriaTypes'
import { limpiarMotivo, type MensajeCorreo, type ResultadoCorreo } from './email'
import type { ValidacionCorreo } from './emailDominio'

export const CONCURRENCIA_ENVIO = 5

export interface Destinatario { memberId: string; nombre: string; email: string | null | undefined }

export interface DependenciasDestinatario {
  /** Publica la invitación (sent_at, token) y arma el correo. `omitido` = no se pudo (sin token, error de la base...). */
  preparar(): Promise<Omit<MensajeCorreo, 'to'> | { omitido: string }>
  validar(email: string): Promise<ValidacionCorreo>
  enviar(m: MensajeCorreo): Promise<ResultadoCorreo>
  /** Notificación push; va aparte del correo y se hace aunque el correo falle (la invitación ya está publicada). */
  push(): Promise<EstadoPush>
}

/** Recorre `items` con a lo sumo `limite` a la vez y devuelve los resultados EN EL MISMO ORDEN. */
export async function enviarEnLote<T, R>(items: T[], limite: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let siguiente = 0
  const trabajador = async () => {
    for (;;) {
      const i = siguiente++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limite, items.length)) }, trabajador))
  return out
}

/** Un destinatario de principio a fin. Nunca lanza: lo inesperado se vuelve «falló» con un motivo corto. */
export async function procesarDestinatario(d: Destinatario, deps: DependenciasDestinatario): Promise<ResultadoDestinatario> {
  const base = { memberId: d.memberId, nombre: d.nombre, email: d.email?.trim() || null }
  if (!base.email) {
    return { ...base, estado: 'omitido', motivo: 'No tiene correo cargado, así que no se le publicó la invitación.', aviso: null, push: 'no aplica' }
  }
  try {
    const msg = await deps.preparar()
    if ('omitido' in msg) return { ...base, estado: 'omitido', motivo: msg.omitido, aviso: null, push: 'no aplica' }

    // La invitación ya está publicada (sent_at): el push sale pase lo que pase con el correo.
    const [push, correo] = await Promise.all([
      deps.push().catch((): EstadoPush => 'falló'),
      (async (): Promise<Omit<ResultadoDestinatario, 'memberId' | 'nombre' | 'email' | 'push'>> => {
        const v = await deps.validar(base.email!)
        if (v.estado === 'bloqueado') return { estado: 'falló', motivo: v.motivo, aviso: null }
        const r = await deps.enviar({ ...msg, to: base.email! })
        const aviso = v.estado === 'no_validado' ? v.motivo : null
        return r.ok ? { estado: 'enviado', motivo: null, aviso } : { estado: 'falló', motivo: r.motivo, aviso }
      })(),
    ])
    return { ...base, ...correo, push }
  } catch (e: any) {
    return { ...base, estado: 'falló', motivo: 'Error inesperado al enviar; revisá el estado de la invitación.', aviso: null, push: 'no aplica' }
  }
}

/** Columnas de `invitations` donde se guarda el resultado del correo (migración 035). */
export interface EstadoCorreoGuardado { email_status: 'enviado' | 'falló'; email_error: string | null; email_attempted_at: string }

/**
 * Qué se guarda de un resultado. «omitido» no se guarda: no hubo intento (y puede que ni exista la fila). `email_error` va
 * recortado a 200 caracteres y sin el valor de las claves (lo exige también el CHECK de la columna).
 */
export function estadoCorreoParaGuardar(r: ResultadoDestinatario, ahora: Date = new Date()): EstadoCorreoGuardado | null {
  if (r.estado === 'omitido') return null
  return {
    email_status: r.estado,
    email_error: r.estado === 'falló' ? limpiarMotivo(r.motivo) : null,
    email_attempted_at: ahora.toISOString(),
  }
}
