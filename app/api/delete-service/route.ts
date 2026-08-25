import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireOrgAdmin } from '@/lib/auth/authorize'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { serviceId } = await req.json()

  const { data: existing } = await supabase.from('services').select('organization_id').eq('id', serviceId).single()
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const auth = await requireOrgAdmin(existing.organization_id)
  if (!auth.ok) return auth.response

  await supabase.from('services').delete().eq('id', serviceId)
  return NextResponse.json({ ok: true })
}
