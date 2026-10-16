import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isToken } from '@/lib/portal/rsvp'
import { armarPortal, paraEnlace } from '@/lib/portal/armarPortal'

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

  // Todo lo demás lo arma lib/portal/armarPortal.ts (el mismo armador del portal por sesión, en lote); aquí solo se da la forma que esta pantalla conoce.
  const datos = await armarPortal(supabase, inv.member_id, { cancionesDeEnsayo: true })
  const { services, ensayos } = paraEnlace(datos)
  return json({ member: inv.member, currentInvitation: inv, services, ensayos, libraryAccess: datos.libraryAccess })
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
