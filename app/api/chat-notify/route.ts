import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMembers, isVapidReady, getVapidError } from '@/lib/push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Si ya se configuró el secreto interno, exigirlo — así este endpoint
  // solo lo puede llamar el trigger de la base de datos, no cualquiera
  // que encuentre la URL. Si aún no está configurado, no bloquea nada
  // (permite migrar sin dejar de recibir notificaciones mientras tanto).
  const expectedSecret = process.env.INTERNAL_API_SECRET
  if (expectedSecret && req.headers.get('x-internal-secret') !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { serviceId, senderMemberId, recipientMemberId, content } = await req.json()
  if (!senderMemberId || !content) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const { data: sender } = await supabase.from('members').select('nombre').eq('id', senderMemberId).single()

  let recipientIds: string[] = []

  if (recipientMemberId) {
    // Mensaje directo (DM) — un solo destinatario
    recipientIds = [recipientMemberId]
  } else if (!serviceId) {
    // Chat general — todos los miembros excepto quien escribió
    const { data: all } = await supabase.from('members').select('id')
    recipientIds = (all || []).map(m => m.id).filter(id => id !== senderMemberId)
  } else {
    // Chat de servicio/ensayo — solo quienes participan de ese día
    const [bandaRes, invRes] = await Promise.all([
      supabase.from('banda_assignments').select('member_id').eq('service_id', serviceId),
      supabase.from('invitations').select('member_id').eq('service_id', serviceId),
    ])
    const ids = new Set<string>()
    ;(bandaRes.data || []).forEach((b: any) => b.member_id && ids.add(b.member_id))
    ;(invRes.data || []).forEach((i: any) => i.member_id && ids.add(i.member_id))
    ids.delete(senderMemberId)
    recipientIds = Array.from(ids)
  }

  if (!recipientIds.length) return NextResponse.json({ ok: true, targeted: 0, delivered: 0 })

  // Chat identifier tal como lo usa el cliente — para DM es un id simétrico
  // (mismo string sin importar quién lo mire), para grupal/servicio es el propio id.
  const chatId = recipientMemberId ? ['dm_', [senderMemberId, recipientMemberId].sort().join('_')].join('') : (serviceId || 'team')

  // No molestamos con push a quien ya está mirando justo este chat ahora mismo
  // (se actualiza solo por polling cada 3s — el push sería redundante).
  const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString()
  const { data: viewers } = await supabase
    .from('chat_presence')
    .select('member_id')
    .in('member_id', recipientIds)
    .eq('chat_id', chatId)
    .gt('updated_at', tenSecondsAgo)
  const alreadyViewing = new Set((viewers || []).map((v: any) => v.member_id))
  recipientIds = recipientIds.filter(id => !alreadyViewing.has(id))

  if (!recipientIds.length) return NextResponse.json({ ok: true, targeted: 0, delivered: 0, skippedAlreadyViewing: alreadyViewing.size })

  const preview = content.length > 90 ? content.slice(0, 90) + '…' : content

  let pushResult = { totalSubs: 0, totalDelivered: 0, membersWithNoSub: recipientIds.length }
  try {
    pushResult = await sendPushToMembers(recipientIds, {
      title: sender?.nombre ? `💬 ${sender.nombre}` : '💬 Nuevo mensaje',
      body: preview,
      url: '/portal',
      tag: serviceId ? `chat-${serviceId}` : 'chat-general',
    })
  } catch (e: any) {
    console.error('Push notification failed:', e?.message || e)
  }

  return NextResponse.json({
    ok: true,
    vapidReady: isVapidReady(),
    vapidError: getVapidError(),
    targeted: recipientIds.length,
    skippedAlreadyViewing: alreadyViewing.size,
    subsFound: pushResult.totalSubs,
    delivered: pushResult.totalDelivered,
    membersWithNoSubscription: pushResult.membersWithNoSub,
  })
}
