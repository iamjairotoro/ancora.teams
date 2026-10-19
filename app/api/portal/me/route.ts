// Datos del portal de LA PERSONA identificada en el servidor (punto 48): sustituye a
// /api/portal-by-member, que recibía el memberId por la URL y no verificaba nada. Acá no
// hay memberId en la petición: la identidad sale de resolvePortalIdentity() (sesión de
// Google o sesión del enlace de acceso, comprobada contra su enlace en cada petición).
// Los datos se leen con la llave de servicio, pero SOLO los de esa persona.
import { MSG } from '@/lib/textos/mensajes'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { armarPortal, paraSesion } from '@/lib/portal/armarPortal'
import { administracionDe, equiposDeLaPersona } from '@/lib/portal/perfil'
import { actualizarPerfil } from '@/lib/portal/actualizarPerfil'
import { cumpleanosDeEquipos } from '@/lib/portal/companeros'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(req: NextRequest) {
  const auth = await requirePortalIdentity(req)
  if (!auth.ok) return auth.response
  const memberId = auth.identity.memberId
  const supabase = createAdminSupabase()

  const { data: member } = await supabase
    .from('members').select('*').eq('id', memberId).single()
  if (!member) return json({ error: MSG.noEncontrado }, 404)

  // Todo lo demás lo arma lib/portal/armarPortal.ts (el mismo armador del portal por enlace, en lote). Esta ruta devuelve todas las tarjetas, ensayos incluidos.
  const [datos, equipos, administracion, cumpleanos] = await Promise.all([
    armarPortal(supabase, memberId, { conNominaSent: true }),
    equiposDeLaPersona(supabase, memberId),                         // «Mis equipos y posiciones» del Perfil
    administracionDe(supabase, memberId, auth.identity.via),        // la fila «Administración»: solo con sesión de Google y con rol; si no, null
    cumpleanosDeEquipos(supabase, memberId),                        // Inicio: cumpleaños de quienes comparten equipo (solo día y mes)
  ])
  return json({ member, services: paraSesion(datos), libraryAccess: datos.libraryAccess, equipos, administracion, cumpleanos })
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePortalIdentity(req)
  if (!auth.ok) return auth.response
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return json({ error: MSG.datosNoValidos }, 400)
  const r = await actualizarPerfil(createAdminSupabase(), auth.identity.memberId, b as Record<string, unknown>)
  return json(r.body, r.status)
}
