import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

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
