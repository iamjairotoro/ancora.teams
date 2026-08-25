import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireOrgAdmin } from '@/lib/auth/authorize'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const { data: existing } = await supabase.from('services').select('organization_id').eq('id', id).single()
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const auth = await requireOrgAdmin(existing.organization_id)
  if (!auth.ok) return auth.response

  const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}
