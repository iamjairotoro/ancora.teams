'use client'
// Portal por TOKEN DE INVITACIÓN (enlace del correo). La pantalla vive en
// app/portal/_components/PortalApp.tsx, compartida con /portal (identidad en el servidor).
import { useParams } from 'next/navigation'
import PortalApp from '../_components/PortalApp'
import PortalLinkInvalid from '../_components/PortalLinkInvalid'
import { isLegacyMemberToken } from '@/lib/auth/accessLink'

export default function PortalByTokenPage() {
  const { token } = useParams<{ token: string }>()
  if (isLegacyMemberToken(token)) return <PortalLinkInvalid /> // /portal/member_<id>: cerrado
  return <PortalApp token={token} />
}
