import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { verificarSecretoInterno } from '@/lib/auth/secretoInterno'
import { sonDeLaOrganizacion, ES_UUID } from '@/lib/auth/pertenencia'
import { sendPushToMembers, isVapidReady, getVapidError } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Lo llama SOLO el disparador de la base (pg_net) cuando se guarda un mensaje. Punto 50, paso 0a: (1) el secreto interno es OBLIGATORIO (sin INTERNAL_API_SECRET, 401); (2) trabaja con la llave de servicio;
// (3) la organización sale de QUIEN ESCRIBE, y el servicio y el destinatario tienen que ser de esa organización; (4) el chat general avisa solo a las personas de esa organización (antes, a todas las de la base).
export async function POST(req: NextRequest) {
  const auth = verificarSecretoInterno(req)
  if (!auth.ok) return auth.response

  let admin
  try { admin = createAdminSupabase() } catch { return NextResponse.json({ error: MSG.servicioNoDisponible }, { status: 503 }) }

  const cuerpo = await req.json().catch(() => null)
  const { serviceId, senderMemberId, recipientMemberId, content } = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  if (typeof senderMemberId !== 'string' || typeof content !== 'string' || !content) return NextResponse.json({ error: MSG.datosIncompletos }, { status: 400 })
  const opcional = (v: unknown) => (v == null || v === '' ? null : typeof v === 'string' && ES_UUID.test(v) ? v : false)
  const servicio = opcional(serviceId), destinatario = opcional(recipientMemberId)
  if (!ES_UUID.test(senderMemberId) || servicio === false || destinatario === false) return NextResponse.json({ error: MSG.datosNoValidos }, { status: 400 })

  const { data: sender } = await admin.from('members').select('nombre, organization_id').eq('id', senderMemberId).single()
  if (!sender) return NextResponse.json({ error: MSG.noEncontrado }, { status: 404 })
  const org: string = sender.organization_id
  // el servicio y el destinatario deben ser de la organización de quien escribe (nada cruza a otra organización)
  if (!(await sonDeLaOrganizacion(admin, 'services', org, [servicio])) || !(await sonDeLaOrganizacion(admin, 'members', org, [destinatario]))) {
    return NextResponse.json({ error: MSG.noAutorizado }, { status: 403 })
  }
  const supabase = admin

  let recipientIds: string[] = []

  if (destinatario) {
    // Mensaje directo (DM) — un solo destinatario
    recipientIds = [destinatario]
  } else if (!servicio) {
    // Chat general — las personas de la organización de quien escribe, excepto quien escribió
    const { data: all } = await supabase.from('members').select('id').eq('organization_id', org)
    recipientIds = (all || []).map((m: any) => m.id as string).filter((id: string) => id !== senderMemberId)
  } else {
    // Chat de servicio/ensayo — solo quienes participan de ese día
    const [bandaRes, invRes] = await Promise.all([
      supabase.from('banda_assignments').select('member_id').eq('service_id', servicio),
      supabase.from('invitations').select('member_id').eq('service_id', servicio),
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
  const chatId = destinatario ? ['dm_', [senderMemberId, destinatario].sort().join('_')].join('') : (servicio || 'team')

  // No molestamos con push a quien ya está mirando justo este chat ahora mismo
  // (el portal la renueva con cada sondeo del hilo, ~5 s — el push sería redundante).
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
      tag: servicio ? `chat-${servicio}` : 'chat-general',
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
