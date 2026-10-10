// Acceso a la biblioteca de canciones (punto 59), decidido EN EL SERVIDOR.
//
// Una persona accede si:
//   · es owner o admin de la organización (organization_members), o
//   · pertenece a AL MENOS UN equipo ACTIVO con teams.library_access = true.
// Un líder de un equipo sin el campo, no. Cierra por defecto: sin la migración 034 (columna inexistente) o ante
// cualquier error de lectura NO se concede (la función lanza y quien la llama responde sin acceso).
//
// Solo servidor (llave de servicio). Las pantallas solo reciben el resultado (`libraryAccess`), nunca deciden.
import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { requireOrgAdmin } from './authorize'
import { requirePortalIdentity } from './requirePortalIdentity'
import { createAdminSupabase } from '@/lib/supabase/admin'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function memberHasLibraryAccess(admin: SupabaseClient, memberId: string): Promise<boolean> {
  const org = await admin.from('organization_members').select('role')
    .eq('person_id', memberId).eq('organization_id', DEFAULT_ORGANIZATION_ID)
  if (org.error) throw new Error('no se pudo leer organization_members')
  if ((org.data || []).some((r: { role: string }) => r.role === 'owner' || r.role === 'admin')) return true

  const tm = await admin.from('team_members').select('team_id').eq('member_id', memberId)
  if (tm.error) throw new Error('no se pudo leer team_members')
  const teamIds = Array.from(new Set((tm.data || []).map((r: { team_id: string }) => r.team_id)))
  if (!teamIds.length) return false

  const teams = await admin.from('teams').select('id')
    .in('id', teamIds).eq('organization_id', DEFAULT_ORGANIZATION_ID).eq('library_access', true).is('archived_at', null)
  if (teams.error) throw new Error('no se pudo leer teams')
  return (teams.data || []).length > 0
}

/** Igual que memberHasLibraryAccess pero para mostrar menos: ante un error devuelve false (cierra). */
export async function libraryAccessOrFalse(admin: SupabaseClient, memberId: string): Promise<boolean> {
  try { return await memberHasLibraryAccess(admin, memberId) } catch { return false }
}

/** null si tiene acceso; si no, la respuesta 403 (o 503 si no se pudo decidir). */
export async function libraryDenied(admin: SupabaseClient, memberId: string): Promise<NextResponse | null> {
  try {
    if (await memberHasLibraryAccess(admin, memberId)) return null
    return NextResponse.json({ error: 'Sin acceso a la biblioteca' }, { status: 403, headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503, headers: NO_STORE })
  }
}

/**
 * Puerta de los datos de la biblioteca para el portal Y la administración: identidad del portal (cookie o
 * x-portal-token) con acceso a la biblioteca, o sesión de administración (owner/admin siempre).
 */
export async function requireLibraryAccess(req: NextRequest, admin: SupabaseClient): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const portal = await requirePortalIdentity(req, { invitation: true })
  if (portal.ok) {
    const denied = await libraryDenied(admin, portal.identity.memberId)
    return denied ? { ok: false, response: denied } : { ok: true }
  }
  if (portal.response.status === 401) {
    const adm = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID).catch(() => null)
    if (adm?.ok) return { ok: true }
  }
  return { ok: false, response: portal.response }
}

/**
 * Para los correos (punto 59): ¿esta persona recibe el tono? Se calcula POR DESTINATARIO con la llave de servicio y se
 * recuerda dentro de la misma ejecución. Cierra: si no hay llave de servicio o falla cualquier lectura, es false.
 */
export function libraryAccessChecker(): (memberId: string) => Promise<boolean> {
  const memo = new Map<string, boolean>()
  let admin: SupabaseClient | null = null
  return async (memberId: string) => {
    if (memo.has(memberId)) return memo.get(memberId)!
    let ok = false
    try {
      admin = admin ?? createAdminSupabase()
      ok = await memberHasLibraryAccess(admin, memberId)
    } catch { ok = false }
    memo.set(memberId, ok)
    return ok
  }
}
