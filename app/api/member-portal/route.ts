import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isToken } from '@/lib/portal/rsvp'

// Datos del portal por TOKEN DE INVITACIÓN (enlace del correo). El token es la credencial (hasta
// cerrar los puntos 50 y 52); la ruta usa el cliente de servicio y valida lo que recibe.
export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return json({ error: 'Token requerido' }, 400)
  if (!isToken(token)) return json({ error: 'No encontrado' }, 404)
  let supabase
  try { supabase = createAdminSupabase() } catch { return json({ error: 'Servicio no disponible' }, 503) }

  const { data: inv } = await supabase
    .from('invitations')
    .select('*, member:members(*), service:services(*)')
    .eq('token', token)
    .maybeSingle()

  if (!inv) return json({ error: 'No encontrado' }, 404)

  const memberId = inv.member_id
  const today = new Date().toISOString().split('T')[0]

  // banda_assignments.posicion es texto libre sin FK — se empareja acá por
  // nombre contra team_positions para poder agrupar por equipo real en la
  // vista del voluntario (antes se agrupaba por 3 arrays hardcodeados en
  // lib/equipos.ts que no conocían los equipos reales de la organización).
  const { data: teamPositionsData } = await supabase
    .from('team_positions')
    .select('name, team_id, teams(name)')
  const posNameToTeam = new Map<string, { teamId: string; teamName: string }>()
  for (const p of (teamPositionsData || []) as any[]) {
    posNameToTeam.set(p.name, { teamId: p.team_id, teamName: p.teams?.name || '' })
  }

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
      banda: canSeeDetails ? (bandaData.data || []).map((b: any) => ({ ...b, ...posNameToTeam.get(b.posicion) })) : [],
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

  return json({ member: inv.member, currentInvitation: inv, services, ensayos })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return json({ error: 'Datos no válidos' }, 400)
  if (!isToken(b.token)) return json({ error: 'No encontrado' }, 404)
  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : null)
  const nombre = str(b.nombre)
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400)
  const instrumentos = Array.isArray(b.instrumentos) ? b.instrumentos.filter((i: unknown): i is string => typeof i === 'string').slice(0, 30) : []
  let supabase
  try { supabase = createAdminSupabase() } catch { return json({ error: 'Servicio no disponible' }, 503) }
  const { data: inv } = await supabase.from('invitations').select('member_id').eq('token', b.token).maybeSingle()
  if (!inv) return json({ error: 'No encontrado' }, 404)
  const { error } = await supabase.from('members').update({
    nombre, apellido: str(b.apellido), telefono: str(b.telefono),
    fecha_nacimiento: str(b.fecha_nacimiento) || null,
    instrumentos,
  }).eq('id', inv.member_id)
  if (error) return json({ error: 'No se pudo guardar' }, 500)
  return json({ ok: true })
}
