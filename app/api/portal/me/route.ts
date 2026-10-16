// Datos del portal de LA PERSONA identificada en el servidor (punto 48): sustituye a
// /api/portal-by-member, que recibía el memberId por la URL y no verificaba nada. Acá no
// hay memberId en la petición: la identidad sale de resolvePortalIdentity() (sesión de
// Google o sesión del enlace de acceso, comprobada contra su enlace en cada petición).
// Los datos se leen con la llave de servicio, pero SOLO los de esa persona.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { requirePortalIdentity } from '@/lib/auth/requirePortalIdentity'
import { armarPortal, paraSesion } from '@/lib/portal/armarPortal'

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

  // Todo lo demás lo arma lib/portal/armarPortal.ts (el mismo armador del portal por enlace, en lote). Esta ruta devuelve todas las tarjetas, ensayos incluidos.
  const datos = await armarPortal(supabase, memberId, { conNominaSent: true })
  return json({ member, services: paraSesion(datos), libraryAccess: datos.libraryAccess })
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
