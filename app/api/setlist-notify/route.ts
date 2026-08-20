import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMembers } from '@/lib/push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

// Llamado por el trigger de Postgres (pg_net) cuando cambia el setlist
// (service_blocks) de un servicio — avisa a quienes ya confirmaron.
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.INTERNAL_API_SECRET
  if (expectedSecret && req.headers.get('x-internal-secret') !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { serviceId } = await req.json()
  if (!serviceId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const [{ data: service }, { data: invitations }] = await Promise.all([
    supabase.from('services').select('fecha').eq('id', serviceId).single(),
    supabase.from('invitations').select('member_id').eq('service_id', serviceId).eq('status', 'confirmado'),
  ])

  if (!invitations?.length) return NextResponse.json({ ok: true, targeted: 0 })

  const fechaFmt = service?.fecha
    ? new Date(service.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : ''

  const memberIds = invitations.map((i: any) => i.member_id)

  let pushResult = { totalSubs: 0, totalDelivered: 0, membersWithNoSub: memberIds.length }
  try {
    pushResult = await sendPushToMembers(memberIds, {
      title: '🎵 Cambió el repertorio',
      body: `Se actualizó el setlist de tu servicio${fechaFmt ? ' del ' + fechaFmt : ''}`,
      url: '/portal',
      tag: `setlist-${serviceId}`,
    })
  } catch (e: any) {
    console.error('Push de cambio de setlist falló:', e?.message || e)
  }

  return NextResponse.json({ ok: true, targeted: memberIds.length, ...pushResult })
}
