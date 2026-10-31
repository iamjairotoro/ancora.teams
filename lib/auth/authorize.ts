import { MSG } from '@/lib/textos/mensajes'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { findMemberByEmail } from '@/lib/findMemberByEmail'

type AuthResult =
  | { ok: true; email: string }
  | { ok: false; response: NextResponse }

async function getVerifiedEmail(): Promise<string | null> {
  const supabase = createServerSupabase()
  // getUser(), no getSession() — getUser() revalida contra Supabase Auth en
  // vez de solo leer el JWT local, que es lo que hace confiable este check
  // del lado del servidor (una sesión falsificada en el cliente no pasa).
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? null
}

export async function requireOrgAdmin(organizationId: string): Promise<AuthResult> {
  const email = await getVerifiedEmail()
  if (!email) {
    return { ok: false, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 401 }) }
  }
  const supabase = createServerSupabase()
  const { data: isAdmin } = await supabase.rpc('is_org_admin', {
    p_email: email,
    p_organization_id: organizationId,
  })
  if (!isAdmin) {
    return { ok: false, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 403 }) }
  }
  return { ok: true, email }
}

export async function requireTeamAccess(teamId: string, organizationId: string): Promise<AuthResult> {
  const email = await getVerifiedEmail()
  if (!email) {
    return { ok: false, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 401 }) }
  }
  const supabase = createServerSupabase()
  const { data: hasAccess } = await supabase.rpc('is_team_admin', {
    p_email: email,
    p_team_id: teamId,
    p_organization_id: organizationId,
  })
  if (hasAccess) return { ok: true, email }
  // El líder de ESTE equipo (is_team_leader: team_members.is_leader del equipo exacto, sin herencia a los equipos hijos).
  // Un líder de otro equipo, o una persona sin rol, recibe el mismo 403 de siempre.
  const { data: esLider } = await supabase.rpc('is_team_leader', {
    p_email: email,
    p_team_id: teamId,
    p_organization_id: organizationId,
  })
  if (esLider !== true) {
    return { ok: false, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 403 }) }
  }
  return { ok: true, email }
}

type AuthOrgResult =
  | { ok: true; email: string; organizationId: string }
  | { ok: false; response: NextResponse }

/** Para las rutas SIN un recurso del que sacar la organización (listas de la administración): la organización sale de la SESIÓN — la persona del correo verificado de Google, y su `organization_id` —
 *  y NUNCA de un parámetro de la petición. Después exige administrador/owner de ESA organización. Sin sesión 401; persona no encontrada o ambigua, o sin permiso, 403. */
export async function requireOrgAdminDeLaSesion(): Promise<AuthOrgResult> {
  const email = await getVerifiedEmail()
  if (!email) return { ok: false, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 401 }) }
  const no = () => ({ ok: false as const, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 403 }) })
  let admin
  try { admin = createAdminSupabase() } catch { return { ok: false, response: NextResponse.json({ error: MSG.servicioNoDisponible }, { status: 503 }) } }
  const found = await findMemberByEmail(email, admin)
  if (found.status !== 'found') return no()
  const { data: m } = await admin.from('members').select('organization_id').eq('id', found.id).maybeSingle()
  const organizationId = m?.organization_id as string | undefined
  if (!organizationId) return no()
  const r = await requireOrgAdmin(organizationId)
  return r.ok ? { ok: true, email, organizationId } : r
}

type AuthLiderResult =
  | { ok: true; email: string; organizationId: string; esAdmin: boolean; equiposLiderados: Set<string>; admin: ReturnType<typeof createAdminSupabase> }
  | { ok: false; response: NextResponse }

/** Para las rutas de /api/lider/*: la persona y la organización salen de la SESIÓN de Google (nunca de un parámetro). Exige ser administrador/owner o líder de algún equipo de ESA organización;
 *  `equiposLiderados` son los equipos que lidera (team_members.is_leader). Sin sesión 401; sin rol, persona no encontrada o ambigua, 403 genérico. */
export async function requireLiderDeLaSesion(): Promise<AuthLiderResult> {
  const email = await getVerifiedEmail()
  if (!email) return { ok: false, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 401 }) }
  const no = () => ({ ok: false as const, response: NextResponse.json({ error: MSG.noAutorizado }, { status: 403 }) })
  let admin
  try { admin = createAdminSupabase() } catch { return { ok: false, response: NextResponse.json({ error: MSG.servicioNoDisponible }, { status: 503 }) } }
  const found = await findMemberByEmail(email, admin)
  if (found.status !== 'found') return no()
  const { data: m } = await admin.from('members').select('organization_id').eq('id', found.id).maybeSingle()
  const organizationId = m?.organization_id as string | undefined
  if (!organizationId) return no()
  const supabase = createServerSupabase()
  const [{ data: esAdmin }, { data: esLider }] = await Promise.all([
    supabase.rpc('is_org_admin', { p_email: email, p_organization_id: organizationId }),
    supabase.rpc('is_any_team_leader', { p_email: email, p_organization_id: organizationId }),
  ])
  if (esAdmin !== true && esLider !== true) return no()
  const { data: filas } = await admin.from('team_members').select('team_id').eq('member_id', found.id).eq('organization_id', organizationId).eq('is_leader', true)
  const equiposLiderados = new Set<string>((filas || []).map((f: any) => f.team_id as string))
  return { ok: true, email, organizationId, esAdmin: esAdmin === true, equiposLiderados, admin }
}
