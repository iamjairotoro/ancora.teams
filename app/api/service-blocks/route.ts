import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireOrgAdmin } from '@/lib/auth/authorize'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function requireOrgAdminForService(serviceId: string) {
  const { data: service } = await supabase.from('services').select('organization_id').eq('id', serviceId).single()
  if (!service) return { ok: false as const, response: NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 }) }
  return requireOrgAdmin(service.organization_id)
}

async function requireOrgAdminForBlock(blockId: string) {
  const { data: block } = await supabase.from('service_blocks').select('service_id').eq('id', blockId).single()
  if (!block) return { ok: false as const, response: NextResponse.json({ error: 'No encontrado' }, { status: 404 }) }
  return requireOrgAdminForService(block.service_id)
}

export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get('serviceId')
  if (!serviceId) return NextResponse.json({ blocks: [] })
  const { data } = await supabase
    .from('service_blocks')
    .select('*, song:songs(*), lead:members(nombre)')
    .eq('service_id', serviceId)
    .order('orden')
  return NextResponse.json({ blocks: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.service_id) return NextResponse.json({ error: 'service_id requerido' }, { status: 400 })

  const auth = await requireOrgAdminForService(body.service_id)
  if (!auth.ok) return auth.response

  const { data } = await supabase.from('service_blocks').insert(body).select().single()
  return NextResponse.json({ block: data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()

  const auth = await requireOrgAdminForBlock(id)
  if (!auth.ok) return auth.response

  await supabase.from('service_blocks').update(updates).eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()

  const auth = await requireOrgAdminForBlock(id)
  if (!auth.ok) return auth.response

  await supabase.from('service_blocks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
