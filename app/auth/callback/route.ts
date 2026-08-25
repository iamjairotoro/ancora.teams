import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const supabase = createServerSupabase()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.redirect(new URL('/login', req.url))

  const email = user.email

  // 1. ¿Es admin? (de la organización, no de un team específico —
  // team_admins reemplaza a la vieja admin_emails)
  const { data: isOrgAdmin } = await supabase.rpc('is_org_admin', {
    p_email: email,
    p_organization_id: DEFAULT_ORGANIZATION_ID,
  })
  if (isOrgAdmin) return NextResponse.redirect(new URL('/admin', req.url))

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
