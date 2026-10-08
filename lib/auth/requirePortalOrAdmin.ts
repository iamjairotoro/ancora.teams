// Puerta de los datos compartidos que el portal consume y la administración también podría
// consumir (catálogo de canciones y de servicios): identidad del portal (cookie o cabecera
// x-portal-token) O sesión de administración (requireOrgAdmin). Sin ninguna de las dos: 401.
// Que sea admin NO da identidad de portal ni al revés: solo abre estas lecturas.
import 'server-only'
import type { NextRequest, NextResponse } from 'next/server'
import { requireOrgAdmin } from './authorize'
import { requirePortalIdentity } from './requirePortalIdentity'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

export async function requirePortalOrAdmin(req: NextRequest): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const portal = await requirePortalIdentity(req, { invitation: true })
  if (portal.ok) return { ok: true }
  if (portal.response.status === 401) {
    const admin = await requireOrgAdmin(DEFAULT_ORGANIZATION_ID).catch(() => null)
    if (admin?.ok) return { ok: true }
  }
  return { ok: false, response: portal.response }
}
