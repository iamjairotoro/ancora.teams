import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { verificarSecretoInterno } from '@/lib/auth/secretoInterno'
import { ES_UUID } from '@/lib/auth/pertenencia'
import { sendPushToMembers } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Llamado por el trigger de Postgres (pg_net) cuando cambia el setlist (service_blocks) de un servicio — avisa a quienes ya confirmaron.
// Punto 50, paso 0a: secreto interno obligatorio y llave de servicio; el servicio debe existir y los destinatarios salen SOLO de sus convocatorias confirmadas.
export async function POST(req: NextRequest) {
  const auth = verificarSecretoInterno(req)
  if (!auth.ok) return auth.response

  let supabase
  try { supabase = createAdminSupabase() } catch { return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 }) }

  const cuerpo = await req.json().catch(() => null)
  const serviceId = cuerpo && typeof cuerpo === 'object' ? (cuerpo as Record<string, unknown>).serviceId : null
  if (typeof serviceId !== 'string' || !serviceId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (!ES_UUID.test(serviceId)) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })

  const [{ data: service }, { data: invitations }] = await Promise.all([
    supabase.from('services').select('fecha').eq('id', serviceId).single(),
    supabase.from('invitations').select('member_id').eq('service_id', serviceId).eq('status', 'confirmado'),
  ])
  if (!service) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (!invitations?.length) return NextResponse.json({ ok: true, targeted: 0 })

  const fechaFmt = service?.fecha
    ? new Date(service.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : ''

  const memberIds = Array.from(new Set(invitations.map((i: any) => i.member_id as string)))   // una persona puede estar confirmada en más de un equipo

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
