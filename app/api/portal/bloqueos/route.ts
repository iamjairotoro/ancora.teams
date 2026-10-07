// Bloqueos de fecha de LA PERSONA identificada (date_blocks). Sustituye a /api/date-blocks, que
// recibía el memberId en la petición. MISMA FORMA DE DATOS que antes (GET → { blocks }, POST →
// { block }, DELETE → { ok }) para que el punto 51 le agregue team_id sin tocar a quien llama.
import { NextRequest } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { portalJson, requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'

export const dynamic = 'force-dynamic'

const isDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(v + 'T12:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const { data, error } = await createAdminSupabase()
    .from('date_blocks')
    .select('*, service:services(fecha, titulo)')
    .eq('member_id', auth.identity.memberId)
  if (error) return portalJson({ error: 'No se pudo leer' }, 500)
  return portalJson({ blocks: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return portalJson({ error: 'Datos no válidos' }, 400)

  const blockedDate = b.date || b.startDate
  if (!isDate(blockedDate)) return portalJson({ error: 'Fecha no válida' }, 400)
  const startDate = b.startDate ?? blockedDate
  const endDate = b.endDate ?? blockedDate
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return portalJson({ error: 'Rango de fechas no válido' }, 400)
  if (b.reason != null && (typeof b.reason !== 'string' || b.reason.length > 500)) return portalJson({ error: 'Motivo no válido' }, 400)
  if (b.serviceId != null && !isId(b.serviceId)) return portalJson({ error: 'Servicio no válido' }, 400)

  const admin = createAdminSupabase()
  // Si no viene un serviceId explícito, se busca si esa fecha coincide con un servicio (solo
  // como referencia informativa; no es obligatorio que exista). Igual que antes.
  let resolvedServiceId: string | null = b.serviceId || null
  if (!resolvedServiceId) {
    const { data: svc } = await admin.from('services').select('id').eq('fecha', blockedDate).maybeSingle()
    resolvedServiceId = svc?.id || null
  }

  const { data, error } = await admin
    .from('date_blocks')
    .upsert({
      member_id: auth.identity.memberId,
      blocked_date: blockedDate,
      service_id: resolvedServiceId,
      reason: b.reason || null,
      start_date: startDate,
      end_date: endDate,
    }, { onConflict: 'member_id,blocked_date' })
    .select().single()
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ block: data })
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePortalIdentity(req, { invitation: true })
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  const date = b?.date, serviceId = b?.serviceId
  if (date != null ? !isDate(date) : !isId(serviceId)) return portalJson({ error: 'date o serviceId requerido' }, 400)
  let query = createAdminSupabase().from('date_blocks').delete().eq('member_id', auth.identity.memberId)
  query = date != null ? query.eq('blocked_date', date) : query.eq('service_id', serviceId)
  const { error } = await query
  if (error) return portalJson({ error: 'No se pudo guardar' }, 500)
  return portalJson({ ok: true })
}
