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

  const { data: member } = await supabase
    .from('members').select('*').eq('id', memberId).single()
  if (!member) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Todos los servicios futuros
  const { data: allSvcs } = await supabase
    .from('services').select('*').order('fecha', { ascending: true })

  const now = new Date()
  const futureSvcs = (allSvcs||[]).filter((s:any) => {
    const endTime = s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00'
    return new Date(endTime) > now
  })

  // Servicios donde está asignado en la banda
  const { data: bandaAssignments } = await supabase
    .from('banda_assignments')
    .select('posicion, service_id')
    .eq('member_id', memberId)

  const assignedServiceIds = new Set((bandaAssignments||[]).map((b:any) => b.service_id))

  // Procesar todos los servicios futuros
  const services = await Promise.all(futureSvcs.map(async (service:any) => {
    const isEnsayo = service.tipo === 'ensayo'
    const isAssigned = assignedServiceIds.has(service.id)

    // Ver si tiene nómina enviada (al menos una invitación con sent_at)
    const { data: sentInvs } = await supabase
      .from('invitations')
      .select('member_id, sent_at')
      .eq('service_id', service.id)
      .not('sent_at', 'is', null)
    const nominaSent = (sentInvs||[]).length > 0

    if (!isAssigned && !isEnsayo) {
      return { service, posiciones: [], invitation: null, banda: [], setlist: [], nominaSent }
    }

    // Posiciones del miembro en este servicio (vacío si es ensayo — no hay nominación)
    const posiciones = isEnsayo ? [] : (bandaAssignments||[])
      .filter((b:any) => b.service_id === service.id)
      .map((b:any) => b.posicion)

    const { data: invRes } = await supabase
      .from('invitations')
      .select('*')
      .eq('service_id', service.id)
      .eq('member_id', memberId)
      .maybeSingle()

    // Auto-crear invitación si no existe
    let invitation = invRes
    if (!invitation) {
      const autoToken = `auto_${memberId}_${service.id}_${Date.now()}`
      const { data: newInv } = await supabase
        .from('invitations')
        .insert({ service_id: service.id, member_id: memberId, token: autoToken, status: 'pendiente' })
        .select().single()
      invitation = newInv
    }

    // Mientras el admin no presione "Enviar invitaciones", esta persona no
    // debe ni enterarse de que existe esta convocatoria — no solo no poder
    // responderla. La tratamos igual que a alguien no asignado.
    if (!invitation?.sent_at) {
      return { service, posiciones: [], invitation: null, banda: [], setlist: [], nominaSent }
    }

    const [bandaRes, blocksRes] = await Promise.all([
      supabase.from('banda_assignments')
        .select('posicion, member_id, member:members(nombre,apellido)')
        .eq('service_id', service.id),
      supabase.from('service_blocks')
        .select('*, song:songs(*), lead:members(nombre)')
        .eq('service_id', service.id)
        .order('orden'),
    ])

    // Nadie ve banda/setlist hasta confirmar asistencia — si mandáramos estos
    // datos siempre, ocultarlos en la UI sería solo cosmético (cualquiera
    // podría verlos igual con las devtools abiertas).
    const canSeeDetails = invitation.status === 'confirmado'
    return {
      service,
      posiciones,
      invitation,
      banda: canSeeDetails ? (bandaRes.data || []) : [],
      setlist: canSeeDetails ? (blocksRes.data || []) : [],
      nominaSent,
    }
  }))

  return NextResponse.json({ member, services })
}

export async function PATCH(req: NextRequest) {
  const { memberId, nombre, apellido, telefono, fecha_nacimiento, instrumentos } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })
  await supabase.from('members').update({
    nombre, apellido, telefono,
    fecha_nacimiento: fecha_nacimiento||null,
    instrumentos: instrumentos||[]
  }).eq('id', memberId)
  return NextResponse.json({ ok: true })
}
