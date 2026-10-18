import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { verificarSecretoInterno } from '@/lib/auth/secretoInterno'
import { sonDeLaOrganizacion, ES_UUID } from '@/lib/auth/pertenencia'
import { sendPushToMembers, isVapidReady } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Lo llama SOLO el disparador de la base (pg_net) cuando alguien responde una convocatoria. Punto 50, paso 0a: secreto interno obligatorio; llave de servicio; la organización sale de LA PERSONA que respondió, y el servicio y el
// equipo tienen que ser de esa organización; el aviso va a los administradores de ESA organización (antes: siempre de la organización #1).
export async function POST(req: NextRequest) {
  const auth = verificarSecretoInterno(req)
  if (!auth.ok) return auth.response

  let supabase
  try { supabase = createAdminSupabase() } catch { return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 }) }

  const cuerpo = await req.json().catch(() => null)
  const { memberId, serviceId, teamId, status, declinedReason } = (cuerpo && typeof cuerpo === 'object' ? cuerpo : {}) as Record<string, unknown>
  if (typeof memberId !== 'string' || typeof status !== 'string' || !memberId || !status) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const opcional = (v: unknown) => (v == null || v === '' ? null : typeof v === 'string' && ES_UUID.test(v) ? v : false)
  const servicio = opcional(serviceId), equipo = opcional(teamId)
  if (!ES_UUID.test(memberId) || servicio === false || equipo === false) return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
  // Punto 52: una declinación por CONFLICTO (la persona aceptó en otro equipo) no es «no podrá asistir»: no se avisa a nadie. El trigger de la base ya
  // no la manda; esto es la segunda barrera.
  if (declinedReason === 'conflict') return NextResponse.json({ ok: true, targeted: 0, omitido: 'conflicto' })

  const { data: member } = await supabase.from('members').select('nombre,apellido,organization_id').eq('id', memberId).single()
  if (!member) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  const org: string = member.organization_id
  if (!(await sonDeLaOrganizacion(supabase, 'services', org, [servicio])) || !(await sonDeLaOrganizacion(supabase, 'teams', org, [equipo]))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const [{ data: service }, { data: adminRows }, { data: team }] = await Promise.all([
    servicio ? supabase.from('services').select('fecha').eq('id', servicio).single() : Promise.resolve({ data: null }),
    // team_admins con team_id null = admin global (reemplaza a admin_emails). Ya trae member_id directo — no hace falta cruzar por email.
    supabase.from('team_admins').select('member_id').is('team_id', null).eq('organization_id', org),
    equipo ? supabase.from('teams').select('name').eq('id', equipo).single() : Promise.resolve({ data: null }),
  ])

  const adminMemberIds = (adminRows || [])
    .map((a: any) => a.member_id as string)
    // No tiene sentido avisarle a la misma persona que acaba de responder, si ella es admin.
    .filter((id: string) => id !== memberId)

  if (!adminMemberIds.length) return NextResponse.json({ ok: true, targeted: 0 })

  const nombreCompleto = `${member.nombre} ${member.apellido || ''}`.trim()
  const fechaFmt = service?.fecha
    ? new Date(service.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : ''
  const emoji = status === 'confirmado' ? '✅' : '❌'
  const accion = status === 'confirmado' ? 'confirmó su asistencia' : 'no podrá asistir'

  let pushResult = { totalSubs: 0, totalDelivered: 0, membersWithNoSub: adminMemberIds.length }
  try {
    pushResult = await sendPushToMembers(adminMemberIds, {
      title: `${emoji} ${nombreCompleto}`,
      body: `${accion}${fechaFmt ? ' — ' + fechaFmt : ''}${team?.name ? ' · ' + team.name : ''}`,
      url: '/admin',
      tag: `rsvp-${servicio || 'general'}`,
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
