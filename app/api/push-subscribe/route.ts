import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { memberId, subscription } = await req.json()
  if (!memberId || !subscription?.endpoint) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const { error } = await supabase.from('push_subscriptions').upsert({
    member_id: memberId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'member_id,endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { memberId, endpoint } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })
  let query = supabase.from('push_subscriptions').delete().eq('member_id', memberId)
  if (endpoint) query = query.eq('endpoint', endpoint)
  await query
  return NextResponse.json({ ok: true })
}
