import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  const { data } = await supabase.from('service_blocks').insert(body).select().single()
  return NextResponse.json({ block: data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  await supabase.from('service_blocks').update(updates).eq('id', id)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await supabase.from('service_blocks').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
