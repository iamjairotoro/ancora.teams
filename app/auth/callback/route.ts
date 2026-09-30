import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

// "next" viaja desde /login (que a su vez lo recibió de /home o /admin
// cuando te mandaron a loguearte por no tener sesión) para volver al
// enlace original en vez de al destino por defecto. Se valida acá para
// que nunca sea una URL externa (open redirect) — solo rutas propias,
// relativas, que empiecen con un único "/".
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = safeNext(req.nextUrl.searchParams.get('next'))
  const supabase = createServerSupabase()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.redirect(new URL('/login', req.url))

  const email = user.email

  // Un enlace directo (ej. /admin?tab=canciones) manda su propio destino,
  // sin importar el rol — la pantalla de destino vuelve a chequear el
  // permiso por su cuenta (AuthGateContext), esto solo decide A DÓNDE.
  if (next) return NextResponse.redirect(new URL(next, req.url))

  // 1. ¿Es admin u owner de la organización, o líder de algún equipo?
  // Antes esto mandaba solo a los admins a /admin. Ahora el destino por
  // defecto tras el login es /home para admin Y líder — /home ya sabe
  // distinguir entre los dos (ve todo vs. ve solo su equipo).
  const [{ data: isOrgAdmin }, { data: isAnyTeamLeader }] = await Promise.all([
    supabase.rpc('is_org_admin', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID }),
    supabase.rpc('is_any_team_leader', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID }),
  ])
  if (isOrgAdmin || isAnyTeamLeader) return NextResponse.redirect(new URL('/home', req.url))

  // 2. ¿Es miembro?
  const { data: member } = await supabase
    .from('members').select('id').eq('email', email).single()

  if (member) {
    // Buscar cualquier invitación (futuras primero, luego pasadas)
    const { data: invs } = await supabase
      .from('invitations')
      .select('token, service:services(fecha, hora_fin)')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (invs && invs.length > 0) {
      // Preferir invitación de servicio futuro
      const now = new Date()
      const futureInv = invs.find((i: any) => {
        const endTime = i.service?.hora_fin
          ? i.service.fecha + 'T' + i.service.hora_fin
          : i.service?.fecha + 'T14:00:00'
        return new Date(endTime) > now
      })
      const bestInv = futureInv || invs[0]
      return NextResponse.redirect(new URL(`/portal/${bestInv.token}`, req.url))
    }

    // Sin ninguna invitación → portal con member_id usando mismo componente
    return NextResponse.redirect(new URL(`/portal/member_${member.id}`, req.url))
  }

  return NextResponse.redirect(new URL('/login?error=not-member', req.url))
}
