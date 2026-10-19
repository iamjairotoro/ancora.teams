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
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const supabase = createServerSupabase()
  const { data: isAdmin } = await supabase.rpc('is_org_admin', {
    p_email: email,
    p_organization_id: organizationId,
  })
  if (!isAdmin) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
  }
  return { ok: true, email }
}

export async function requireTeamAccess(teamId: string, organizationId: string): Promise<AuthResult> {
  const email = await getVerifiedEmail()
  if (!email) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const supabase = createServerSupabase()
  const { data: hasAccess } = await supabase.rpc('is_team_admin', {
    p_email: email,
    p_team_id: teamId,
    p_organization_id: organizationId,
  })
  if (!hasAccess) {
    return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
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
  if (!email) return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const no = () => ({ ok: false as const, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) })
  let admin
  try { admin = createAdminSupabase() } catch { return { ok: false, response: NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 }) } }
  const found = await findMemberByEmail(email, admin)
  if (found.status !== 'found') return no()
  const { data: m } = await admin.from('members').select('organization_id').eq('id', found.id).maybeSingle()
  const organizationId = m?.organization_id as string | undefined
  if (!organizationId) return no()
  const r = await requireOrgAdmin(organizationId)
  return r.ok ? { ok: true, email, organizationId } : r
}
