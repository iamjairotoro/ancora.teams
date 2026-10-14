// Datos del portal de LA PERSONA identificada en el servidor (punto 48): sustituye a
// /api/portal-by-member, que recibía el memberId por la URL y no verificaba nada. Acá no
// hay memberId en la petición: la identidad sale de resolvePortalIdentity() (sesión de
// Google o sesión del enlace de acceso, comprobada contra su enlace en cada petición).
// Los datos se leen con la llave de servicio, pero SOLO los de esa persona.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { SONG_SETLIST_COLUMNS, setlistWithoutLibrary } from '@/lib/portal/songColumns'
import { libraryAccessOrFalse } from '@/lib/auth/libraryAccess'
import { BANDA_POSICION_EMBED, bandaParaPortal } from '@/lib/bandaPosicion'
import { entradasDeServicio } from '@/lib/portal/convocatorias'
import { convocatoriaCerrada } from '@/lib/convocatoriaCerrada'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req)
  if (!auth.ok) return auth.response
  const memberId = auth.identity.memberId
  const supabase = createAdminSupabase()

  const { data: member } = await supabase
    .from('members').select('*').eq('id', memberId).single()
  if (!member) return json({ error: 'No encontrado' }, 404)

  // Punto 59: sin acceso a la biblioteca el setlist solo trae lo del detalle del servicio (ver setlistWithoutLibrary).
  const libraryAccess = await libraryAccessOrFalse(supabase, memberId)

  // Todos los servicios futuros
  const { data: allSvcs } = await supabase
    .from('services').select('*').order('fecha', { ascending: true })

  // Un servicio se queda en las listas hasta el cierre de su convocatoria (fin del DÍA en America/Santiago), no hasta su hora de fin: lib/convocatoriaCerrada.ts.
  const futureSvcs = (allSvcs||[]).filter((s:any) => !convocatoriaCerrada(s.fecha))

  // Mis asignaciones (con el nombre y el equipo de su posición, por id) y MIS invitaciones (una por servicio y equipo). Punto 52: esta ruta ya NO
  // crea invitaciones: las crea solo la convocatoria que envía el admin (/api/send-invites). Sin invitación enviada, la persona no ve nada.
  const [{ data: bandaAssignments }, { data: misInvitaciones }] = await Promise.all([
    supabase.from('banda_assignments')
      .select('posicion, service_id, team_position:team_positions(name, team_id, teams(name))')
      .eq('member_id', memberId),
    supabase.from('invitations').select('*, team:teams(id, name, color)').eq('member_id', memberId),
  ])

  // Procesar todos los servicios futuros: cada uno da UNA tarjeta por equipo que me convocó (lib/portal/convocatorias.ts)
  const porServicio = await Promise.all(futureSvcs.map(async (service:any) => {
    const isEnsayo = service.tipo === 'ensayo'

    // Ver si tiene nómina enviada (al menos una invitación con sent_at)
    const { data: sentInvs } = await supabase
      .from('invitations')
      .select('member_id, sent_at')
      .eq('service_id', service.id)
      .not('sent_at', 'is', null)
    const nominaSent = (sentInvs||[]).length > 0

    const entradas = entradasDeServicio(
      isEnsayo,
      (misInvitaciones||[]).filter((i:any) => i.service_id === service.id),
      (bandaAssignments||[]).filter((b:any) => b.service_id === service.id),
      misInvitaciones || [],      // todas: la convocatoria que desplazó a una puede ser de otro servicio del mismo día
      convocatoriaCerrada(service.fecha),      // pasó el día del servicio (hora de Chile): la pantalla no ofrece botones; la base igual lo rechaza
    )

    // Nadie ve banda/setlist hasta confirmar asistencia — si mandáramos estos datos siempre, ocultarlos en la UI sería solo cosmético
    // (cualquiera podría verlos igual con las devtools abiertas). Se leen una sola vez por servicio, y solo si alguna tarjeta está confirmada.
    let bandaRows: any[] = [], blocks: any[] = []
    if (entradas.some(e => e.invitation?.status === 'confirmado')) {
      const [bandaRes, blocksRes] = await Promise.all([
        supabase.from('banda_assignments')
          // La posición y el equipo salen del id (migración 037a): renombrar una posición no rompe nada (lib/bandaPosicion.ts).
          .select(`posicion, member_id, member:members(nombre,apellido), ${BANDA_POSICION_EMBED}`)
          .eq('service_id', service.id),
        supabase.from('service_blocks')
          // Columnas explícitas de la canción (no `songs(*)`): ver lib/portal/songColumns.ts.
          .select(`*, song:songs(${SONG_SETLIST_COLUMNS}), lead:members(nombre)`)
          .eq('service_id', service.id)
          .order('orden'),
      ])
      bandaRows = bandaRes.data || []; blocks = blocksRes.data || []
    }

    return entradas.map(e => {
      // Mientras el admin no presione «Notificar», esta persona no debe ni enterarse de que existe esta convocatoria.
      if (!e.invitation) return { service, team: null, reemplazadaPor: null, posiciones: [], invitation: null, banda: [], setlist: [], nominaSent }
      const { team: _t, ...invitation } = e.invitation as any
      const canSeeDetails = invitation.status === 'confirmado'
      return {
        service,
        team: e.team,
        reemplazadaPor: e.reemplazadaPor,      // «Declinada · aceptaste en {equipo}»
        cerrada: e.cerrada,
        posiciones: e.posiciones,
        invitation,
        banda: canSeeDetails ? bandaRows.map((b: any) => bandaParaPortal(b)) : [],
        setlist: canSeeDetails ? (libraryAccess ? blocks : setlistWithoutLibrary(blocks)) : [],
        nominaSent,
      }
    })
  }))
  const services = porServicio.flat()

  return json({ member, services, libraryAccess })
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePortalIdentity(req)
  if (!auth.ok) return auth.response
  const identity = auth.identity
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return json({ error: 'Datos no válidos' }, 400)
  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, 200) : null)
  const nombre = str(b.nombre)
  if (!nombre?.trim()) return json({ error: 'El nombre es obligatorio' }, 400)
  const instrumentos = Array.isArray(b.instrumentos) ? b.instrumentos.filter((i: unknown): i is string => typeof i === 'string').slice(0, 30) : []
  const { error } = await createAdminSupabase().from('members').update({
    nombre, apellido: str(b.apellido), telefono: str(b.telefono),
    fecha_nacimiento: str(b.fecha_nacimiento) || null,
    instrumentos,
  }).eq('id', identity.memberId)
  if (error) return json({ error: 'No se pudo guardar' }, 500)
  return json({ ok: true })
}
