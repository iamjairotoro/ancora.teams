// GET /api/lider/personas — la pantalla Personas del LÍDER: SU equipo con nombre, posiciones, teléfono y correo, y los demás equipos solo con nombre y posiciones (lib/lider/personasLider.ts). Lo decide el servidor con la llave
// de servicio; la persona y la organización salen de la SESIÓN. Un administrador pasa la autorización pero, si no lidera ningún equipo, recibe todos como ajenos (sin contacto). Sin rol 403, sin sesión 401; no-store; solo lee.
import { NextResponse } from 'next/server'
import { requireLiderDeLaSesion } from '@/lib/auth/authorize'
import { armarPersonas } from '@/lib/lider/personasLider'
import { MSG } from '@/lib/textos/mensajes'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const falla = () => NextResponse.json({ error: MSG.noSePudoLeer }, { status: 500, headers: NO_STORE })
const unicos = (xs: (string | null | undefined)[]) => Array.from(new Set(xs.filter(Boolean))) as string[]
const TROZO = 80
async function enTrozos(ids: string[], leer: (parte: string[]) => PromiseLike<{ data: any[] | null; error: any }>): Promise<{ data: any[]; error: any }> {
  const out: any[] = []
  for (let i = 0; i < ids.length; i += TROZO) { const r = await leer(ids.slice(i, i + TROZO)); if (r.error) return { data: [], error: r.error }; out.push(...(r.data || [])) }
  return { data: out, error: null }
}

export async function GET() {
  const a = await requireLiderDeLaSesion()
  if (!a.ok) return NextResponse.json({ error: MSG.noAutorizado }, { status: a.response.status, headers: NO_STORE })
  const { admin, organizationId } = a
  const [teams, positions, membresias] = await Promise.all([
    admin.from('teams').select('id, name, color, sort_order').eq('organization_id', organizationId).is('archived_at', null).order('sort_order'),
    admin.from('team_positions').select('id, name, team_id, sort_order, archived_at').eq('organization_id', organizationId),
    admin.from('team_members').select('id, member_id, team_id, is_leader').eq('organization_id', organizationId),
  ])
  if (teams.error || positions.error || membresias.error) return falla()
  const filas = (membresias.data || []) as any[]
  const enlaces = await enTrozos(unicos(filas.map(m => m.id)), parte => admin.from('team_member_positions').select('team_member_id, team_position_id').in('team_member_id', parte))
  if (enlaces.error) return falla()
  const propios = new Set(filas.filter(m => a.equiposLiderados.has(m.team_id)).map(m => m.member_id as string))
  // Nombre y apellido de TODAS las personas de los equipos (una persona puede estar en un equipo suyo y en uno ajeno); teléfono y correo se leen SOLO de las personas de los equipos que lidera.
  const [contactos, nombres] = await Promise.all([
    enTrozos(Array.from(propios), parte => admin.from('members').select('id, nombre, apellido, telefono, email').in('id', parte).eq('organization_id', organizationId)),
    enTrozos(unicos(filas.map(m => m.member_id)), parte => admin.from('members').select('id, nombre, apellido').in('id', parte).eq('organization_id', organizationId)),
  ])
  if (contactos.error || nombres.error) return falla()
  const equipos = armarPersonas({ teams: (teams.data || []) as any, positions: (positions.data || []) as any, membresias: filas, enlaces: enlaces.data, contactos: contactos.data, nombres: nombres.data }, a.equiposLiderados, a.memberId)
  return NextResponse.json({ equipos }, { headers: NO_STORE })
}
