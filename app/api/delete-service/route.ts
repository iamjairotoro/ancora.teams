import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { ES_UUID } from '@/lib/auth/pertenencia'

// Punto 50, paso 0a: llave de servicio; la seguridad la da `requireOrgAdmin` (administrador/owner de la organización del servicio) antes de borrar.
export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase()
  const cuerpo = await req.json().catch(() => null)
  const serviceId = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>).serviceId : null
  if (typeof serviceId !== 'string' || !ES_UUID.test(serviceId)) return NextResponse.json({ error: 'serviceId no válido' }, { status: 400 })

  const { data: existing } = await supabase.from('services').select('organization_id').eq('id', serviceId).single()
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const auth = await requireOrgAdmin(existing.organization_id)
  if (!auth.ok) return auth.response

  const { error } = await supabase.from('services').delete().eq('id', serviceId).eq('organization_id', existing.organization_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
