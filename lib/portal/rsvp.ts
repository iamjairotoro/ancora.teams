// Respuesta a una convocatoria (confirmar / no puedo) con el TOKEN DE INVITACIÓN del correo.
// Un solo camino para /api/confirm-rsvp (portal) y /api/confirm/[token] (página de confirmación):
// valida lo recibido, no deja responder una convocatoria que el admin todavía no envió, y deja la respuesta a la
// función de la base responder_convocatoria (punto 52, migración 037c): status, comentario, responded_at y el
// conflicto entre convocatorias (con bloqueo por persona) y el vencimiento (037d: 410 «Esta convocatoria ya cerró»). Solo servidor (cliente de servicio).
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEXTO_CERRADA } from '@/lib/convocatoriaCerrada'

export const TOKEN_MAX = 200
export const COMMENT_MAX = 1000

export const isToken = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= TOKEN_MAX

export type RsvpResult =
  | { status: 'ok'; desplazadas: number }
  | { status: 'invalid'; error: string }
  | { status: 'not-found' }
  | { status: 'not-sent' }
  | { status: 'closed' }       // pasó el día del servicio (hora de Chile): ya no se puede responder (037d)
  | { status: 'conflict'; equipo: string | null; invitacion: string | null }   // otra convocatoria CONFIRMADA que se cruza (punto 52): hay que «Aceptar aquí en su lugar»
  | { status: 'error' }

// Punto 52: la respuesta la resuelve la FUNCIÓN de la base responder_convocatoria (migración 037c): con bloqueo por persona, desplaza a las pendientes que
// chocan y rechaza una confirmación que chocaría con otra ya confirmada. Aquí solo se valida lo recibido y se averigua de QUIÉN es el token (el token es la
// credencial de esta ruta); la función además comprueba que la invitación sea de esa persona.
export async function applyRsvp(admin: SupabaseClient, token: unknown, respuesta: unknown, comentario: unknown): Promise<RsvpResult> {
  if (!isToken(token)) return { status: 'invalid', error: 'Invitación no válida' }
  if (respuesta !== 'si' && respuesta !== 'no') return { status: 'invalid', error: 'Respuesta no válida' }
  if (comentario != null && typeof comentario !== 'string') return { status: 'invalid', error: 'Comentario no válido' }
  const note = typeof comentario === 'string' ? comentario.trim() : ''
  if (note.length > COMMENT_MAX) return { status: 'invalid', error: `El comentario es demasiado largo (máximo ${COMMENT_MAX} caracteres)` }

  const { data: inv } = await admin.from('invitations').select('id, member_id, sent_at').eq('token', token).maybeSingle()
  if (!inv) return { status: 'not-found' }
  // No dejar responder una convocatoria que el admin todavía no envió explícitamente.
  if (!inv.sent_at) return { status: 'not-sent' }

  const { data, error } = await admin.rpc('responder_convocatoria', {
    p_member_id: inv.member_id, p_invitacion_id: inv.id, p_respuesta: respuesta, p_comentario: note || null,
  })
  if (error || !data || typeof data !== 'object') return { status: 'error' }
  switch ((data as { resultado?: string }).resultado) {
    case 'ok': return { status: 'ok', desplazadas: Array.isArray((data as any).desplazadas) ? (data as any).desplazadas.length : 0 }
    case 'conflicto': return { status: 'conflict', equipo: (data as any).equipo ?? null, invitacion: (data as any).invitacion_en_conflicto ?? null }
    case 'no_existe': return { status: 'not-found' }
    case 'no_enviada': return { status: 'not-sent' }
    case 'cerrada': return { status: 'closed' }
    case 'respuesta_invalida': return { status: 'invalid', error: 'Respuesta no válida' }
    default: return { status: 'error' }
  }
}

/** Respuesta HTTP (status + mensaje) para un RsvpResult que no es ok. `codigo` solo viaja cuando la pantalla debe reaccionar distinto. */
export function rsvpFailure(r: Exclude<RsvpResult, { status: 'ok' }>): { error: string; status: number; codigo?: string; conflicto?: { invitacion: string | null; equipo: string | null } } {
  switch (r.status) {
    case 'invalid': return { error: r.error, status: 400 }
    case 'not-found': return { error: 'Invitación no encontrada', status: 404 }
    case 'not-sent': return { error: 'Esta convocatoria aún no ha sido enviada', status: 403 }
    case 'closed': return { error: TEXTO_CERRADA, status: 410, codigo: 'cerrada' }
    case 'conflict': return { error: 'Ya confirmaste otra convocatoria que se cruza con esta. Si prefieres esta, usa «Aceptar aquí en su lugar» o quita primero tu otra confirmación.', status: 409, codigo: 'conflicto', conflicto: { invitacion: r.invitacion, equipo: r.equipo } }
    default: return { error: 'No se pudo guardar la respuesta', status: 500 }
  }
}
