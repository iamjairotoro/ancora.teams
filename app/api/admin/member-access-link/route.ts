// Enlaces de acceso personales del portal (punto 48) — SOLO owner/admin con sesión.
// POST   { memberId, days? }  genera (y revoca el anterior); devuelve el enlace UNA vez.
// GET    ?memberId=           estado del enlace activo (metadatos, nunca el token).
// DELETE { memberId }         revoca el enlace activo.
// Ninguna respuesta se guarda en caché y nada de esto se escribe en logs.
import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAdmin } from '@/lib/auth/authorize'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { ACCESS_LINK_DEFAULT_DAYS, isAccessLinkDays } from '@/lib/auth/accessLink'
import { generateAccessLink, getAccessLinkStatus, revokeAccessLink } from '@/lib/auth/accessLinkAdmin'

export const dynamic = 'force-dynamic'
const NO_STORE = { 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function readMemberId(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get('memberId')
  if (fromQuery) return UUID.test(fromQuery) ? fromQuery : null
  try {
    const body = await req.json()
    return typeof body?.memberId === 'string' && UUID.test(body.memberId) ? body.memberId : null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const auth = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID)
  if (!auth.ok) return auth.response
  let body: any = null
  try { body = await req.json() } catch { /* cuerpo vacío */ }
  const memberId = typeof body?.memberId === 'string' && UUID.test(body.memberId) ? body.memberId : null
  if (!memberId) return json({ error: 'Persona no válida' }, 400)
  const days = body?.days === undefined ? ACCESS_LINK_DEFAULT_DAYS : body.days
  if (!isAccessLinkDays(days)) return json({ error: 'El vencimiento debe ser de 7, 30 o 90 días' }, 400)

  const res = await generateAccessLink(memberId, days, auth.email)
  if (res.status === 'not-found') return json({ error: 'Persona no encontrada' }, 404)
  if (res.status === 'error') return json({ error: 'No se pudo generar el enlace' }, 500)
  // El token va en la ruta de canje; el servidor lo vuelve sesión y redirige a /portal.
  return json({ url: `${req.nextUrl.origin}/portal/acceso/${res.token}`, expiresAt: res.expiresAt })
}

export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID)
  if (!auth.ok) return auth.response
  const memberId = await readMemberId(req)
  if (!memberId) return json({ error: 'Persona no válida' }, 400)
  const res = await getAccessLinkStatus(memberId)
  if (res.status === 'error') return json({ error: 'No se pudo leer el estado' }, 500)
  return json(res)
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID)
  if (!auth.ok) return auth.response
  const memberId = await readMemberId(req)
  if (!memberId) return json({ error: 'Persona no válida' }, 400)
  const res = await revokeAccessLink(memberId, auth.email)
  if (res.status === 'error') return json({ error: 'No se pudo revocar el enlace' }, 500)
  return json({ ok: true, revoked: res.revoked })
}
