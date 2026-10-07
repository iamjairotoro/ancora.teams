'use client'
import { useParams } from 'next/navigation'
import ServicioDetalle from '../../../_components/ServicioDetalle'
import PortalLinkInvalid from '../../../_components/PortalLinkInvalid'
import { isLegacyMemberToken } from '@/lib/auth/accessLink'

export default function ServicioByTokenPage() {
  const { token, id } = useParams<{ token: string; id: string }>()
  if (isLegacyMemberToken(token)) return <PortalLinkInvalid /> // /portal/member_<id>/…: cerrado
  return <ServicioDetalle token={token} svcId={id} />
}
