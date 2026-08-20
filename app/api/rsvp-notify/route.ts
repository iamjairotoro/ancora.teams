import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMembers, isVapidReady } from '@/lib/push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Solo el trigger de la base de datos puede llamar esto (mismo secreto que el del chat)
  const expectedSecret = process.env.INTERNAL_API_SECRET
  if (expectedSecret && req.headers.get('x-internal-secret') !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { memberId, serviceId, status } = await req.json()
  if (!memberId || !status) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const [{ data: member }, { data: service }, { data: adminRows }] = await Promise.all([
    supabase.from('members').select('nombre,apellido').eq('id', memberId).single(),
    serviceId ? supabase.from('services').select('fecha').eq('id', serviceId).single() : Promise.resolve({ data: null }),
    supabase.from('admin_emails').select('email'),
  ])

  const adminEmails = new Set((adminRows || []).map((a: any) => (a.email || '').toLowerCase()))
  if (!adminEmails.size) return NextResponse.json({ ok: true, targeted: 0 })

  // Cruza los emails de admin con la tabla de members para sacar sus member_id
  // (las notificaciones push están amarradas a member_id, no a email).
  const { data: allMembers } = await supabase.from('members').select('id,email').not('email', 'is', null)
  const adminMemberIds = (allMembers || [])
    .filter((m: any) => adminEmails.has((m.email || '').toLowerCase()))
    .map((m: any) => m.id)
    // No tiene sentido avisarle a la misma persona que acaba de responder, si ella es admin.
    .filter((id: string) => id !== memberId)

  if (!adminMemberIds.length) return NextResponse.json({ ok: true, targeted: 0 })

  const nombreCompleto = member ? `${member.nombre} ${member.apellido || ''}`.trim() : 'Alguien'
  const fechaFmt = service?.fecha
    ? new Date(service.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : ''
  const emoji = status === 'confirmado' ? '✅' : '❌'
  const accion = status === 'confirmado' ? 'confirmó su asistencia' : 'no podrá asistir'

  let pushResult = { totalSubs: 0, totalDelivered: 0, membersWithNoSub: adminMemberIds.length }
  try {
    pushResult = await sendPushToMembers(adminMemberIds, {
      title: `${emoji} ${nombreCompleto}`,
      body: `${accion}${fechaFmt ? ' — ' + fechaFmt : ''}`,
      url: '/admin',
      tag: `rsvp-${serviceId || 'general'}`,
    })
  } catch (e: any) {
    console.error('Push de RSVP falló:', e?.message || e)
  }

  return NextResponse.json({
    ok: true,
    vapidReady: isVapidReady(),
    targeted: adminMemberIds.length,
    subsFound: pushResult.totalSubs,
    delivered: pushResult.totalDelivered,
  })
}
