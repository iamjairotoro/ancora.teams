// /portal SIN id (punto 48): quién es la persona lo decide el SERVIDOR
// (lib/auth/portalIdentity.ts): sesión de Google con un correo del equipo, o la sesión
// opaca que deja el enlace de acceso (/portal/acceso/<token>). Nada viaja en la URL.
import PortalApp from './_components/PortalApp'
import PortalLogin from './_components/PortalLogin'
import { resolvePortalIdentity } from '@/lib/auth/portalIdentity'
import { createServerSupabase } from '@/lib/supabase-server'
import { MSG_LINK_EXPIRED, MSG_LINK_INVALID } from '@/lib/auth/accessLink'

export const dynamic = 'force-dynamic'

// Avisos que puede dejar /portal/acceso/<token> (lista cerrada; el valor de la URL nunca se muestra tal cual).
const NOTICES: Record<string, string> = {
  vencido: MSG_LINK_EXPIRED,
  invalido: MSG_LINK_INVALID,
  error: 'No pudimos verificar el enlace. Intenta de nuevo en un momento.',
}

export default async function PortalPage({ searchParams }: { searchParams: { enlace?: string } }) {
  let identity = null
  let unavailable = false
  try { identity = await resolvePortalIdentity() } catch { unavailable = true }
  if (identity) return <PortalApp token={null} />

  let notice: string | null = null
  if (unavailable) {
    notice = 'El portal no está disponible por ahora. Avísale al administrador.'
  } else {
    // ¿Entró con Google, pero su correo no es de nadie del equipo (o es ambiguo)?
    let googleEmail: string | null = null
    try { googleEmail = (await createServerSupabase().auth.getUser()).data.user?.email ?? null } catch {}
    if (googleEmail) notice = 'Tu cuenta de Google no está registrada en el equipo. Contacta al administrador.'
    else if (searchParams.enlace && NOTICES[searchParams.enlace]) notice = NOTICES[searchParams.enlace]
  }
  return <PortalLogin notice={notice} />
}
