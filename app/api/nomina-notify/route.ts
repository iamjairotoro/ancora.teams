import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { verificarSecretoInterno } from '@/lib/auth/secretoInterno'
import { sonDeLaOrganizacion, ES_UUID } from '@/lib/auth/pertenencia'
import { sendPushToMember } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Llamado por el trigger de Postgres (pg_net) cuando a alguien le quitan la posición que tenía asignada en un servicio.
// Punto 50, paso 0a: secreto interno obligatorio y llave de servicio; la persona debe ser de la organización del servicio.
export async function POST(req: NextRequest) {
  const auth = verificarSecretoInterno(req)
  if (!auth.ok) return auth.response

  let supabase
  try { supabase = createAdminSupabase() } catch { return NextResponse.json({ error: MSG.servicioNoDisponible }, { status: 503 }) }

  const cuerpo = await req.json().catch(() => null)
  const { memberId, serviceId } = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  if (typeof memberId !== 'string' || typeof serviceId !== 'string' || !memberId || !serviceId) return NextResponse.json({ error: MSG.datosIncompletos }, { status: 400 })
  if (!ES_UUID.test(memberId) || !ES_UUID.test(serviceId)) return NextResponse.json({ error: MSG.datosNoValidos }, { status: 400 })

  const { data: service } = await supabase.from('services').select('fecha, organization_id').eq('id', serviceId).single()
  if (!service) return NextResponse.json({ error: MSG.noEncontrado }, { status: 404 })
  if (!(await sonDeLaOrganizacion(supabase, 'members', service.organization_id, [memberId]))) return NextResponse.json({ error: MSG.noAutorizado }, { status: 403 })

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
