// Puerta de entrada de app/api/portal/**: quién es la persona, verificado EN EL SERVIDOR.
// Solo la usan las rutas del portal; /admin y su AuthGate no la importan (punto 48).
//
//  · invitation: true  → si la petición trae la cabecera x-portal-token (portal por token de
//    invitación), manda ESA persona; un token inválido es 401 (no se cae a otra identidad).
//  · sin cabecera      → sesión de Google o sesión del enlace de acceso (resolvePortalIdentity).
//
// Respuestas siempre no-store; los mensajes de error son genéricos.
import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { PORTAL_TOKEN_HEADER } from '@/lib/portal/portalFetch'
import { resolveInvitationToken, resolvePortalIdentity, type PortalIdentity } from './portalIdentity'

const NO_STORE = { 'Cache-Control': 'no-store' }
export const portalJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })

export type PortalAuth =
  | { ok: true; identity: PortalIdentity }
  | { ok: false; response: NextResponse }

export async function requirePortalIdentity(req: NextRequest, opts: { invitation?: boolean } = {}): Promise<PortalAuth> {
  let identity: PortalIdentity | null
  try {
    const header = opts.invitation ? req.headers.get(PORTAL_TOKEN_HEADER) : null
    identity = header ? await resolveInvitationToken(header) : await resolvePortalIdentity()
  } catch {
    return { ok: false, response: portalJson({ error: 'Servicio no disponible' }, 503) }
  }
  if (!identity) return { ok: false, response: portalJson({ error: 'No autorizado' }, 401) }
  return { ok: true, identity }
}
