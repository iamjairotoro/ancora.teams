// Canje del enlace de acceso personal (punto 48): /portal/acceso/<token>.
// Canjea el token por una sesión opaca (cookie httpOnly/Secure/SameSite=Lax) y manda a
// /portal SIN el token en la URL. Vencido o no válido (revocado, inexistente): vuelve a
// /portal con un aviso. Sin referrer y sin caché; el token no se registra en ningún log.
import { NextRequest, NextResponse } from 'next/server'
import { exchangeAccessToken, PORTAL_SESSION_COOKIE, portalCookieOptions } from '@/lib/auth/portalIdentity'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const to = (aviso?: string) => {
    const url = new URL('/portal', req.nextUrl.origin)
    if (aviso) url.searchParams.set('enlace', aviso)
    const res = NextResponse.redirect(url)
    res.headers.set('Referrer-Policy', 'no-referrer')
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  let result
  try { result = await exchangeAccessToken(params.token) } catch { return to('error') }
  if (result.status === 'expired') return to('vencido')
  if (result.status !== 'ok') return to('invalido')

  const res = to()
  res.cookies.set(PORTAL_SESSION_COOKIE, result.sessionId, portalCookieOptions(result.expiresAt))
  return res
}
