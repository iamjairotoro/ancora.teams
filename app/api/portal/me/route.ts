// Datos del portal de LA PERSONA identificada en el servidor (punto 48): sustituye a
// /api/portal-by-member, que recibía el memberId por la URL y no verificaba nada. Acá no
// hay memberId en la petición: la identidad sale de resolvePortalIdentity() (sesión de
// Google o sesión del enlace de acceso, comprobada contra su enlace en cada petición).
// Los datos se leen con la llave de servicio, pero SOLO los de esa persona.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { newSecret } from '@/lib/auth/secrets'
import { SONG_SETLIST_COLUMNS, setlistWithoutLibrary } from '@/lib/portal/songColumns'
import { libraryAccessOrFalse } from '@/lib/auth/libraryAccess'
import { BANDA_POSICION_EMBED, bandaParaPortal, etiquetaDePosicion } from '@/lib/bandaPosicion'

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

  const now = new Date()
  const futureSvcs = (allSvcs||[]).filter((s:any) => {
    const endTime = s.hora_fin ? s.fecha+'T'+s.hora_fin : s.fecha+'T14:00:00'
    return new Date(endTime) > now
  })

  // Servicios donde está asignado en la banda
  const { data: bandaAssignments } = await supabase
    .from('banda_assignments')
    .select('posicion, service_id, team_position:team_positions(name)')
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
      .map((b:any) => etiquetaDePosicion(b))

    const { data: invRes } = await supabase
      .from('invitations')
      .select('*')
      .eq('service_id', service.id)
      .eq('member_id', memberId)
      .maybeSingle()

    // Auto-crear invitación si no existe
    let invitation = invRes
    if (!invitation) {
      const autoToken = newSecret() // aleatorio (32 bytes), nunca derivado de ids
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
        // La posición y el equipo salen del id (migración 037a): renombrar una posición no rompe nada (lib/bandaPosicion.ts).
        .select(`posicion, member_id, member:members(nombre,apellido), ${BANDA_POSICION_EMBED}`)
        .eq('service_id', service.id),
      supabase.from('service_blocks')
        // Columnas explícitas de la canción (no `songs(*)`): ver lib/portal/songColumns.ts.
        .select(`*, song:songs(${SONG_SETLIST_COLUMNS}), lead:members(nombre)`)
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
      banda: canSeeDetails ? (bandaRes.data || []).map((b: any) => bandaParaPortal(b)) : [],
      setlist: canSeeDetails ? (libraryAccess ? (blocksRes.data || []) : setlistWithoutLibrary(blocksRes.data)) : [],
      nominaSent,
    }
  }))

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
