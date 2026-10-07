// Suscripción a los avisos push de LA PERSONA identificada (push_subscriptions). Sustituye a
// /api/push-subscribe, que recibía el memberId en la petición (cualquiera podía suscribir un
// dispositivo a los avisos de otra persona, o borrar sus suscripciones). El `member_id` sale de
// la identidad. POST {subscription} agrega o actualiza; DELETE {endpoint?} quita una (o todas
// las de la persona si no viene endpoint).
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

// El servidor enviará avisos a este endpoint: solo https y a un servidor con nombre (nada de
// IP literales ni localhost), para que no sirva de puente hacia direcciones internas.
function isPushEndpoint(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 2048) return false
  let u: URL
  try { u = new URL(v) } catch { return false }
  const h = u.hostname
  if (u.protocol !== 'https:' || u.username || u.password) return false
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || h.startsWith('[')) return false
  return true
}
const isKey = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 256

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const sub = b?.subscription
  if (!isPushEndpoint(sub?.endpoint) || !isKey(sub?.keys?.p256dh) || !isKey(sub?.keys?.auth)) {
    return portalJson({ error: 'Suscripción no válida' }, 400)
  }
  const { error } = await createAdminSupabase().from('push_subscriptions').upsert({
    member_id: auth.identity.memberId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  }, { onConflict: 'member_id,endpoint' })
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const endpoint = b?.endpoint
  if (endpoint != null && (typeof endpoint !== 'string' || endpoint.length > 2048)) return portalJson({ error: 'Datos no válidos' }, 400)
  let query = createAdminSupabase().from('push_subscriptions').delete().eq('member_id', auth.identity.memberId)
  if (endpoint) query = query.eq('endpoint', endpoint)
  const { error } = await query
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
