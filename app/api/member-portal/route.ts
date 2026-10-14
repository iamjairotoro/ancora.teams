import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isToken } from '@/lib/portal/rsvp'
import { setlistWithoutLibrary } from '@/lib/portal/songColumns'
import { libraryAccessOrFalse } from '@/lib/auth/libraryAccess'
import { BANDA_POSICION_EMBED, bandaParaPortal } from '@/lib/bandaPosicion'
import { entradasDeServicio } from '@/lib/portal/convocatorias'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'

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
  // Punto 59: sin acceso a la biblioteca el setlist solo trae lo del detalle del servicio (ver setlistWithoutLibrary).
  const libraryAccess = await libraryAccessOrFalse(supabase, memberId)
  const today = new Date().toISOString().split('T')[0]

  // Mis asignaciones (con el nombre y el equipo de su posición, por id) y MIS invitaciones (una por servicio y equipo; los ensayos no llevan equipo).
  const [{ data: allAssignments }, { data: misInv }] = await Promise.all([
    supabase.from('banda_assignments')
      .select('posicion, team_position:team_positions(name, team_id, teams(name)), service:services(*)')
      .eq('member_id', memberId),
    supabase.from('invitations')
      .select('id,status,comentario,token,sent_at,needs_reassignment_confirm,declined_reason,superseded_by,service_id,team_id,team:teams(id,name,color),service:services(*)')
      .eq('member_id', memberId),
  ])

  // Agrupar mis asignaciones por servicio (solo los que no pasaron)
  const serviceMap: Record<string, { svc: any; asignaciones: any[] }> = {}
  for (const a of (allAssignments || [])) {
    const svc = a.service as any
    if (!svc || svc.fecha < today) continue
    if (!serviceMap[svc.id]) serviceMap[svc.id] = { svc, asignaciones: [] }
    serviceMap[svc.id].asignaciones.push(a)
  }

  // Sort services by fecha ascending
  const sortedServices = Object.values(serviceMap).sort((a, b) =>
    a.svc.fecha.localeCompare(b.svc.fecha)
  )

  // Servicios: UNA tarjeta por equipo que me convocó (punto 52; lib/portal/convocatorias.ts). Sin convocatoria enviada no hay tarjeta.
  const services = []
  for (const { svc, asignaciones } of sortedServices) {
    const entradas = entradasDeServicio(false, (misInv || []).filter((i: any) => i.service_id === svc.id), asignaciones, misInv || [], convocatoriaCerrada(svc.fecha))
      .filter(e => e.invitation)
    if (!entradas.length) continue      // mientras el admin no presione «Notificar», esta persona no debe ni enterarse de la convocatoria

    const [setlistData, bandaData] = await Promise.all([
      supabase.from('service_blocks')
        .select('orden,tono,titulo,tipo,duracion_min,notas,song:songs(nombre,artista,bpm,link_spotify,link_letras,link_recursos,caratula_url,duracion_min),lead:members(nombre)')
        .eq('service_id', svc.id).order('orden'),
      supabase.from('banda_assignments')
        .select(`posicion,member_id,member:members(nombre,apellido),${BANDA_POSICION_EMBED}`).eq('service_id', svc.id),
    ])

    for (const e of entradas) {
      const i: any = e.invitation
      const invRow = { id: i.id, status: i.status, comentario: i.comentario, token: i.token, sent_at: i.sent_at, needs_reassignment_confirm: i.needs_reassignment_confirm, declined_reason: i.declined_reason ?? null }
      // Nadie ve banda/setlist hasta confirmar asistencia — si mandáramos estos datos siempre, ocultarlos en la UI sería solo cosmético
      // (cualquiera podría verlos igual con las devtools abiertas).
      const canSeeDetails = invRow.status === 'confirmado'
      services.push({
        service: svc,
        team: e.team,
        reemplazadaPor: e.reemplazadaPor,  // «Declinada · aceptaste en {equipo}»
        cerrada: e.cerrada,                // pasó el día del servicio (hora de Chile)
        posiciones: e.posiciones,          // las posiciones de esta persona EN ESTE equipo
        invitation: invRow,
        setlist: canSeeDetails ? (libraryAccess ? (setlistData.data || []) : setlistWithoutLibrary(setlistData.data)) : [],
        banda: canSeeDetails ? (bandaData.data || []).map((b: any) => bandaParaPortal(b)) : [],
      })
    }
  }

  // Ensayos (convocatoria directa a toda la banda, sin nominación por instrumento y sin equipo)
  const ensayoInvs = (misInv || []).filter((i: any) => !i.team_id)

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
      cerrada: convocatoriaCerrada(svc.fecha),
      setlist: cancionesData || [],
      banda: [],
    })
  }
  ensayos.sort((a,b)=>a.service.fecha.localeCompare(b.service.fecha))

  return json({ member: inv.member, currentInvitation: inv, services, ensayos, libraryAccess })
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
