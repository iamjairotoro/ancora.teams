import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushToMember } from '@/lib/push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

// Llamado por el trigger de Postgres (pg_net) cuando a alguien le quitan la
// posición que tenía asignada en un servicio.
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.INTERNAL_API_SECRET
  if (expectedSecret && req.headers.get('x-internal-secret') !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { memberId, serviceId } = await req.json()
  if (!memberId || !serviceId) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  const { data: service } = await supabase.from('services').select('fecha').eq('id', serviceId).single()

  const fechaFmt = service?.fecha
    ? new Date(service.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : ''

  let pushResult = { subs: 0, delivered: 0 }
  try {
    pushResult = await sendPushToMember(memberId, {
      title: '📋 Cambio en tu nómina',
      body: `Hubo un cambio en la nómina${fechaFmt ? ' del ' + fechaFmt : ''} — ya no estás asignado`,
      url: '/portal',
      tag: `nomina-${serviceId}`,
    })
  } catch (e: any) {
    console.error('Push de remoción de nómina falló:', e?.message || e)
  }

  return NextResponse.json({ ok: true, ...pushResult })
}
