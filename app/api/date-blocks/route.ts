import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get('memberId')
  if (!memberId) return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })
  const { data } = await supabase
    .from('date_blocks')
    .select('*, service:services(fecha, titulo)')
    .eq('member_id', memberId)
  return NextResponse.json({ blocks: data || [] })
}

export async function POST(req: NextRequest) {
  const { memberId, date, reason, startDate, endDate, serviceId } = await req.json()
  const blockedDate = date || startDate
  if (!memberId || !blockedDate) return NextResponse.json({ error: 'memberId y date son requeridos' }, { status: 400 })

  // Si no viene un serviceId explícito, buscamos si esa fecha coincide con un servicio existente
  // (solo como referencia informativa — no es obligatorio que exista)
  let resolvedServiceId = serviceId || null
  if (!resolvedServiceId) {
    const { data: svc } = await supabase.from('services').select('id').eq('fecha', blockedDate).maybeSingle()
    resolvedServiceId = svc?.id || null
  }

  const { data, error } = await supabase
    .from('date_blocks')
    .upsert({
      member_id: memberId,
      blocked_date: blockedDate,
      service_id: resolvedServiceId,
      reason: reason || null,
      start_date: startDate || blockedDate,
      end_date: endDate || blockedDate,
    }, { onConflict: 'member_id,blocked_date' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ block: data })
}

export async function DELETE(req: NextRequest) {
  const { memberId, date, serviceId } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })
  let query = supabase.from('date_blocks').delete().eq('member_id', memberId)
  if (date) query = query.eq('blocked_date', date)
  else if (serviceId) query = query.eq('service_id', serviceId)
  else return NextResponse.json({ error: 'date o serviceId requerido' }, { status: 400 })
  await query
  return NextResponse.json({ ok: true })
}
