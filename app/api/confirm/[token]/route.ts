// Página /confirm/<token> (enlace del correo) por el servidor. GET devuelve SOLO lo que la página
// muestra: nombre y apellido, fecha y título del servicio, y el estado actual; nunca la fila
// completa de la persona. POST {respuesta, comentario} responde por el mismo camino que
// /api/confirm-rsvp (lib/portal/rsvp.ts: valida, exige convocatoria enviada, escribe responded_at).
// El token es la credencial (hasta cerrar los puntos 50 y 52). Respuestas no-store.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { applyRsvp, isToken, rsvpFailure } from '@/lib/portal/rsvp'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  if (!isToken(params.token)) return json({ error: 'Invitación no encontrada' }, 404)
  let inv: any
  try {
    const { data } = await createAdminSupabase().from('invitations')
      .select('status, comentario, sent_at, member:members(nombre, apellido), service:services(fecha, titulo)')
      .eq('token', params.token).maybeSingle()
    inv = data
  } catch { return json({ error: 'Servicio no disponible' }, 503) }
  // Una convocatoria que aún no se envió no existe para quien tenga el token.
  if (!inv || !inv.sent_at) return json({ error: 'Invitación no encontrada' }, 404)
  return json({
    status: inv.status, comentario: inv.comentario ?? null,
    member: { nombre: inv.member?.nombre ?? '', apellido: inv.member?.apellido ?? '' },
    service: inv.service ? { fecha: inv.service.fecha, titulo: inv.service.titulo ?? null } : null,
  })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const b = await req.json().catch(() => null)
  let result
  try { result = await applyRsvp(createAdminSupabase(), params.token, b?.respuesta, b?.comentario) }
  catch { return json({ error: 'Servicio no disponible' }, 503) }
  if (result.status !== 'ok') { const f = rsvpFailure(result); return json({ error: f.error }, f.status) }
  return json({ ok: true })
}
