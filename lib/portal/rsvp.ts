// Respuesta a una convocatoria (confirmar / no puedo) con el TOKEN DE INVITACIÓN del correo.
// Un solo camino para /api/confirm-rsvp (portal) y /api/confirm/[token] (página de confirmación):
// valida lo recibido, no deja responder una convocatoria que el admin todavía no envió, y escribe
// status, comentario y responded_at. Solo servidor (cliente de servicio).
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export const TOKEN_MAX = 200
export const COMMENT_MAX = 1000

export const isToken = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= TOKEN_MAX

export type RsvpResult =
  | { status: 'ok' }
  | { status: 'invalid'; error: string }
  | { status: 'not-found' }
  | { status: 'not-sent' }
  | { status: 'error' }

export async function applyRsvp(admin: SupabaseClient, token: unknown, respuesta: unknown, comentario: unknown): Promise<RsvpResult> {
  if (!isToken(token)) return { status: 'invalid', error: 'Invitación no válida' }
  if (respuesta !== 'si' && respuesta !== 'no') return { status: 'invalid', error: 'Respuesta no válida' }
  if (comentario != null && typeof comentario !== 'string') return { status: 'invalid', error: 'Comentario no válido' }
  const note = typeof comentario === 'string' ? comentario.trim() : ''
  if (note.length > COMMENT_MAX) return { status: 'invalid', error: `El comentario es demasiado largo (máximo ${COMMENT_MAX} caracteres)` }

  const { data: inv } = await admin.from('invitations').select('sent_at').eq('token', token).maybeSingle()
  if (!inv) return { status: 'not-found' }
  // No dejar responder una convocatoria que el admin todavía no envió explícitamente.
  if (!inv.sent_at) return { status: 'not-sent' }

  const { error } = await admin.from('invitations')
    .update({ status: respuesta === 'si' ? 'confirmado' : 'declinado', comentario: note || null, responded_at: new Date().toISOString() })
    .eq('token', token)
  return error ? { status: 'error' } : { status: 'ok' }
}

/** Respuesta HTTP (status + mensaje) para un RsvpResult que no es ok. */
export function rsvpFailure(r: Exclude<RsvpResult, { status: 'ok' }>): { error: string; status: number } {
  switch (r.status) {
    case 'invalid': return { error: r.error, status: 400 }
    case 'not-found': return { error: 'Invitación no encontrada', status: 404 }
    case 'not-sent': return { error: 'Esta convocatoria aún no ha sido enviada', status: 403 }
    default: return { error: 'No se pudo guardar la respuesta', status: 500 }
  }
}
