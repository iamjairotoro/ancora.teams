// Identidad del músico EN EL SERVIDOR (punto 48). Dos formas, ninguna por members.id:
//
//  (a) Sesión de Google cuyo correo coincide con members.email (sin distinguir
//      mayúsculas, ver lib/findMemberByEmail.ts).
//  (b) Enlace personal secreto: el token (32 bytes aleatorios, solo su HASH está en
//      member_access_links) se canjea UNA vez (exchangeAccessToken) por una sesión
//      del portal: la cookie guarda un identificador OPACO aleatorio (en la base
//      solo su hash, en member_portal_sessions), nunca el token. Cada petición se
//      comprueba en la base contra su enlace (resolvePortalIdentity): revocar o
//      vencer el enlace corta la sesión DE INMEDIATO. Sin secretos nuevos (nada se
//      firma). La cookie es httpOnly, Secure y SameSite=Lax.
//
// Solo servidor: usa la llave de servicio (lib/supabase/admin.ts). El token y el
// identificador de sesión no se registran en ningún log.
import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { createServerSupabase } from '@/lib/supabase-server'
import { findMemberByEmail } from '@/lib/findMemberByEmail'
import { ACCESS_TOKEN_BYTES, linkState } from './accessLink'

export const PORTAL_SESSION_COOKIE = 'ancora-portal'

/** SHA-256 en hex (64 caracteres), lo único que se guarda de un token o de una sesión. */
export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex')
/** Valor aleatorio de 32 bytes en base64url: sirve de token y de identificador de sesión. */
export const newSecret = () => randomBytes(ACCESS_TOKEN_BYTES).toString('base64url')

export type PortalIdentity = { memberId: string; via: 'google' | 'link' }

export type ExchangeResult =
  | { status: 'ok'; sessionId: string; expiresAt: Date }
  | { status: 'expired' }
  | { status: 'invalid' } // revocado o inexistente: el mismo mensaje, no se distingue

/** Canjea el token del enlace por una sesión del portal. El token no se vuelve a usar como credencial. */
export async function exchangeAccessToken(token: string): Promise<ExchangeResult> {
  if (!token || token.length > 200) return { status: 'invalid' }
  const admin = createAdminSupabase()
  const { data: link } = await admin.from('member_access_links')
    .select('id, member_id, revoked_at, expires_at').eq('token_hash', hashSecret(token)).maybeSingle()
  if (!link) return { status: 'invalid' }
  const state = linkState(link)
  if (state === 'expired') return { status: 'expired' }
  if (state !== 'ok') return { status: 'invalid' }

  const sessionId = newSecret()
  const expiresAt = new Date(link.expires_at) // la sesión nunca vive más que su enlace
  const { error } = await admin.from('member_portal_sessions').insert({
    link_id: link.id, member_id: link.member_id, session_hash: hashSecret(sessionId), expires_at: expiresAt.toISOString(),
  })
  if (error) return { status: 'invalid' }
  await admin.from('member_access_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id)
  return { status: 'ok', sessionId, expiresAt }
}

/** Opciones de la cookie de sesión del portal. */
export const portalCookieOptions = (expiresAt: Date) => ({
  httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', expires: expiresAt,
})

/**
 * ¿Quién está pidiendo esto? Sesión de Google primero; si no, la sesión del portal
 * (que se comprueba EN LA BASE contra su enlace en cada petición). null = nadie.
 */
export async function resolvePortalIdentity(): Promise<PortalIdentity | null> {
  const admin = createAdminSupabase()

  // (a) Google
  const { data: { user } } = await createServerSupabase().auth.getUser()
  if (user?.email) {
    const found = await findMemberByEmail(user.email, admin)
    if (found.status === 'found') return { memberId: found.id, via: 'google' }
  }

  // (b) sesión del portal
  const sessionId = cookies().get(PORTAL_SESSION_COOKIE)?.value
  if (!sessionId) return null
  const { data: session } = await admin.from('member_portal_sessions')
    .select('member_id, expires_at, link:member_access_links(revoked_at, expires_at)')
    .eq('session_hash', hashSecret(sessionId)).maybeSingle()
  const link = session?.link as unknown as { revoked_at: string | null; expires_at: string } | null
  if (!session || !link) return null
  if (new Date(session.expires_at).getTime() <= Date.now()) return null
  if (linkState(link) !== 'ok') return null // revocado o vencido: la sesión cae YA
  return { memberId: session.member_id, via: 'link' }
}
