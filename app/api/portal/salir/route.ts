// Cerrar sesión en el portal: borra la sesión del enlace de acceso (fila + cookie). No pide
// identidad (es idempotente y siempre limpia la cookie); el botón del portal llama además a
// supabase.auth.signOut() para cerrar la sesión de Google.
import { NextResponse } from 'next/server'
import { endPortalSession, PORTAL_SESSION_COOKIE, portalCookieOptions } from '@/lib/auth/portalIdentity'

export const dynamic = 'force-dynamic'

export async function POST() {
  try { await endPortalSession() } catch { /* sin llave o sin base: igual se borra la cookie */ }
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(PORTAL_SESSION_COOKIE, '', { ...portalCookieOptions(new Date(0)), maxAge: 0 })
  return res
}
