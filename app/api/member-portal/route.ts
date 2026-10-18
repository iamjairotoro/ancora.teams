import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { isToken } from '@/lib/portal/rsvp'
import { armarPortal, paraEnlace } from '@/lib/portal/armarPortal'
import { equiposDeLaPersona } from '@/lib/portal/perfil'
import { actualizarPerfil } from '@/lib/portal/actualizarPerfil'
import { cumpleanosDeEquipos } from '@/lib/portal/companeros'

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
  const [datos, equipos, cumpleanos] = await Promise.all([armarPortal(supabase, inv.member_id, { cancionesDeEnsayo: true }), equiposDeLaPersona(supabase, inv.member_id), cumpleanosDeEquipos(supabase, inv.member_id)])
  const { services, ensayos } = paraEnlace(datos)
  // `administracion` es SIEMPRE null por el enlace del correo: la fila «Administración» solo se ofrece con sesión de Google (/api/portal/me).
  return json({ member: inv.member, currentInvitation: inv, services, ensayos, libraryAccess: datos.libraryAccess, equipos, administracion: null, cumpleanos })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null)
  if (!b || typeof b !== 'object') return json({ error: 'Datos no válidos' }, 400)
  if (!isToken(b.token)) return json({ error: 'No encontrado' }, 404)
  let supabase
  try { supabase = createAdminSupabase() } catch { return json({ error: 'Servicio no disponible' }, 503) }
  const { data: inv } = await supabase.from('invitations').select('member_id').eq('token', b.token).maybeSingle()
  if (!inv) return json({ error: 'No encontrado' }, 404)
  const r = await actualizarPerfil(supabase, inv.member_id, b as Record<string, unknown>)
  return json(r.body, r.status)
}
