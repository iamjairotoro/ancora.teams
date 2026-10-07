// Operaciones de ADMINISTRADOR sobre los enlaces de acceso personales (punto 48):
// generar (regenerar), ver el estado y revocar. Solo servidor, con la llave de
// servicio. El token completo existe UN instante en memoria: se devuelve a quien lo
// generó UNA vez y en la base queda solo su hash. Nada de esto se registra en logs.
import 'server-only'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { findMemberByEmail } from '@/lib/findMemberByEmail'
import { hashSecret, newSecret } from './secrets'
import { expiryFrom, linkState, type AccessLinkDays } from './accessLink'

export type GenerateResult =
  | { status: 'ok'; token: string; expiresAt: string }
  | { status: 'not-found' }
  | { status: 'error' }

export type LinkStatusResult =
  | { status: 'none' }
  | { status: 'active' | 'expired'; createdAt: string; expiresAt: string; lastUsedAt: string | null }
  | { status: 'error' }

// Quién actúa (para created_by / revoked_by); null si su correo no es de ninguna persona.
async function actorId(adminEmail: string): Promise<string | null> {
  const found = await findMemberByEmail(adminEmail, createAdminSupabase())
  return found.status === 'found' ? found.id : null
}

// Revoca el enlace ACTIVO de la persona y borra sus sesiones (limpieza; aunque quedaran,
// ya no valdrían: cada petición comprueba el enlace). Devuelve cuántos revocó.
async function revokeActive(memberId: string, by: string | null): Promise<number | null> {
  const admin = createAdminSupabase()
  const { data, error } = await admin.from('member_access_links')
    .update({ revoked_at: new Date().toISOString(), revoked_by: by })
    .eq('member_id', memberId).is('revoked_at', null).select('id')
  if (error) return null
  const ids = (data || []).map((r: { id: string }) => r.id)
  if (ids.length) await admin.from('member_portal_sessions').delete().in('link_id', ids)
  return ids.length
}

/** Genera un enlace nuevo (el anterior activo queda revocado). El token solo sale por acá, una vez. */
export async function generateAccessLink(memberId: string, days: AccessLinkDays, adminEmail: string): Promise<GenerateResult> {
  const admin = createAdminSupabase()
  const { data: member } = await admin.from('members').select('id').eq('id', memberId).maybeSingle()
  if (!member) return { status: 'not-found' }

  const by = await actorId(adminEmail)
  if ((await revokeActive(memberId, by)) === null) return { status: 'error' }

  const token = newSecret()
  const expiresAt = expiryFrom(days).toISOString()
  const { error } = await admin.from('member_access_links').insert({
    organization_id: DEFAULT_ORGANIZATION_ID, member_id: memberId,
    token_hash: hashSecret(token), created_by: by, expires_at: expiresAt,
  })
  if (error) return { status: 'error' }
  return { status: 'ok', token, expiresAt }
}

/** Estado del enlace activo de la persona: solo metadatos, NUNCA el token ni su hash. */
export async function getAccessLinkStatus(memberId: string): Promise<LinkStatusResult> {
  const { data, error } = await createAdminSupabase().from('member_access_links')
    .select('created_at, expires_at, last_used_at, revoked_at')
    .eq('member_id', memberId).is('revoked_at', null).maybeSingle()
  if (error) return { status: 'error' }
  if (!data) return { status: 'none' }
  const state = linkState(data)
  return {
    status: state === 'expired' ? 'expired' : 'active',
    createdAt: data.created_at, expiresAt: data.expires_at, lastUsedAt: data.last_used_at,
  }
}

/** Revoca el enlace activo: el portal de esa persona deja de abrirse por ese enlace de inmediato. */
export async function revokeAccessLink(memberId: string, adminEmail: string): Promise<{ status: 'ok'; revoked: number } | { status: 'error' }> {
  const n = await revokeActive(memberId, await actorId(adminEmail))
  return n === null ? { status: 'error' } : { status: 'ok', revoked: n }
}
