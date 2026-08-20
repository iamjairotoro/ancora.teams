import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const { data: inv } = await supabase
    .from('invitations')
    .select('*, member:members(*), service:services(*)')
    .eq('token', token)
    .single()

  if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const memberId = inv.member_id
  const today = new Date().toISOString().split('T')[0]

  // Get ALL assignments for this member — multiple posiciones per service
  const { data: allAssignments } = await supabase
    .from('banda_assignments')
    .select('posicion, service:services(*)')
    .eq('member_id', memberId)

  // Group by service_id — collect all posiciones per service
  const serviceMap: Record<string, { svc: any; posiciones: string[] }> = {}
  for (const a of (allAssignments || [])) {
    const svc = a.service as any
    if (!svc || svc.fecha < today) continue
    if (!serviceMap[svc.id]) {
      serviceMap[svc.id] = { svc, posiciones: [] }
    }
    serviceMap[svc.id].posiciones.push(a.posicion)
  }

  // Sort services by fecha ascending
  const sortedServices = Object.values(serviceMap).sort((a, b) =>
    a.svc.fecha.localeCompare(b.svc.fecha)
  )

  // Servicios (con nominación por instrumento)
  const services = []
  for (const { svc, posiciones } of sortedServices) {
    const { data: invRow } = await supabase
      .from('invitations').select('status,comentario,token,sent_at,needs_reassignment_confirm')
      .eq('service_id', svc.id).eq('member_id', memberId).single()

    // Mientras el admin no presione "Enviar invitaciones", esta persona no
    // debe ni enterarse de que existe esta convocatoria — no solo no poder
    // responderla.
    if (!invRow?.sent_at) continue

    const [setlistData, bandaData] = await Promise.all([
      supabase.from('service_blocks')
        .select('orden,tono,titulo,tipo,duracion_min,notas,song:songs(nombre,artista,bpm,link_spotify,link_letras,link_recursos,spotify_url,apple_music_url,caratula_url,duracion_min),lead:members(nombre)')
        .eq('service_id', svc.id).order('orden'),
      supabase.from('banda_assignments')
        .select('posicion,member_id,member:members(nombre,apellido)').eq('service_id', svc.id),
    ])

    // Nadie ve banda/setlist hasta confirmar asistencia — si mandáramos estos
    // datos siempre, ocultarlos en la UI sería solo cosmético (cualquiera
    // podría verlos igual con las devtools abiertas).
    const canSeeDetails = invRow.status === 'confirmado'
    services.push({
      service: svc,
      posiciones,          // array of ALL roles for this person
      invitation: invRow,
      setlist: canSeeDetails ? (setlistData.data || []) : [],
      banda: canSeeDetails ? (bandaData.data || []) : [],
    })
  }

  // Ensayos (convocatoria directa a toda la banda, sin nominación por instrumento)
  const { data: ensayoInvs } = await supabase
    .from('invitations')
    .select('status,comentario,token,sent_at,service:services(*)')
    .eq('member_id', memberId)

  const ensayos = []
  for (const ei of (ensayoInvs || [])) {
    const svc = ei.service as any
    if (!svc || svc.tipo !== 'ensayo' || svc.fecha < today) continue
    if (!ei.sent_at) continue
    const { data: cancionesData } = await supabase
      .from('service_blocks')
      .select('orden,song:songs(nombre,artista)')
      .eq('service_id', svc.id).eq('tipo', 'cancion').order('orden')
    ensayos.push({
      service: svc,
      posiciones: [],
      invitation: { status: ei.status, comentario: ei.comentario, token: ei.token, sent_at: ei.sent_at },
      setlist: cancionesData || [],
      banda: [],
    })
  }
  ensayos.sort((a,b)=>a.service.fecha.localeCompare(b.service.fecha))

  return NextResponse.json({ member: inv.member, currentInvitation: inv, services, ensayos })
}

export async function PATCH(req: NextRequest) {
  const { token, nombre, apellido, telefono, fecha_nacimiento, instrumentos } = await req.json()
  const { data: inv } = await supabase
    .from('invitations').select('member_id').eq('token', token).single()
  if (!inv) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  await supabase.from('members').update({
    nombre, apellido, telefono,
    fecha_nacimiento: fecha_nacimiento || null,
    instrumentos: instrumentos || []
  }).eq('id', inv.member_id)
  return NextResponse.json({ ok: true })
}
