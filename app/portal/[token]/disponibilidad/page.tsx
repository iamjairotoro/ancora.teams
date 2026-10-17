'use client'
// El enlace viejo /portal/<token>/disponibilidad (punto 54, commit 4): la disponibilidad ahora es la pestaña Servicios → Disponibilidad del portal. Este enlace sigue
// funcionando y lleva directo ahí (deja dos marcas de sesión que el portal lee al abrir).
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PortalLinkInvalid from '../../_components/PortalLinkInvalid'
import { isLegacyMemberToken } from '@/lib/auth/accessLink'

export default function DisponibilidadPage(){
  const token = useParams().token as string
  const router = useRouter()
  const cerrado = isLegacyMemberToken(token)  // /portal/member_<id>/…: cerrado
  useEffect(()=>{
    if(cerrado) return
    try{ sessionStorage.setItem('ancora-last-tab','servicios'); sessionStorage.setItem('ancora-servicios-seg','disponibilidad') }catch{}
    router.replace(`/portal/${token}`)
  },[cerrado, router, token])
  return cerrado ? <PortalLinkInvalid /> : null
}
