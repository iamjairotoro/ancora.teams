// El enlace viejo /portal/<token>/servicio/<id>?equipo=<id> (punto 54, commit 5): redirige al portal del enlace con el servicio en la URL.
import { redirect } from 'next/navigation'
import PortalLinkInvalid from '../../../_components/PortalLinkInvalid'
import { isLegacyMemberToken } from '@/lib/auth/accessLink'
import { urlServicio } from '@/lib/portal/urlServicio'

export default function ServicioByTokenPage({ params, searchParams }: { params: { token: string; id: string }; searchParams: { equipo?: string } }) {
  if (isLegacyMemberToken(params.token)) return <PortalLinkInvalid /> // /portal/member_<id>/…: cerrado
  redirect(urlServicio(`/portal/${encodeURIComponent(params.token)}`, params.id, typeof searchParams.equipo === 'string' ? searchParams.equipo : null))
}
