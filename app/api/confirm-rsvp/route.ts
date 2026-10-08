// Responder una convocatoria con el token de invitación (portal por token y vista del servicio).
// Pasa por el cliente de servicio y valida lo recibido; ver lib/portal/rsvp.ts.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { applyRsvp, rsvpFailure } from '@/lib/portal/rsvp'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return json({ error: 'Datos no válidos' }, 400)
  let result
  try { result = await applyRsvp(createAdminSupabase(), b.token, b.respuesta, b.comentario) }
  catch { return json({ error: 'Servicio no disponible' }, 503) }
  if (result.status !== 'ok') { const f = rsvpFailure(result); return json({ error: f.error }, f.status) }
  return json({ ok: true })
}
