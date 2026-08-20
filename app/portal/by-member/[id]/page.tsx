'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Redirige al portal con token si existe, sino crea experiencia directa
export default function PortalByMemberPage() {
  const { id } = useParams<{ id: string }>()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      // Registrar última conexión
      await supabase.from('members').update({ last_seen: new Date().toISOString() }).eq('id', id)

      // Buscar invitación más reciente de un servicio futuro
      const now = new Date().toISOString().split('T')[0]
      
      const { data: invitations } = await supabase
        .from('invitations')
        .select('token, service:services(fecha)')
        .eq('member_id', id)
        .order('created_at', { ascending: false })

      // Buscar invitación de servicio futuro
      const futureInv = invitations?.find((inv: any) => {
        const fecha = inv.service?.fecha
        return fecha && fecha >= now
      })

      if (futureInv) {
        window.location.href = `/portal/${futureInv.token}`
        return
      }

      // Sin invitación futura — usar la más reciente de cualquier servicio
      const anyInv = invitations?.[0]
      if (anyInv) {
        window.location.href = `/portal/${anyInv.token}`
        return
      }

      // Sin ninguna invitación — mostrar portal vacío con datos del miembro
      setChecking(false)
    }
    check()
  }, [id])

  if (checking) return (
    <div style={{minHeight:'100vh',background:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'2px solid #1A1A1A',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  )

  // Portal vacío — miembro registrado pero sin servicios asignados aún
  return (
    <div style={{minHeight:'100vh',background:'#FFFFFF',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif',padding:20}}>
      <div style={{background:'#F5F0E6',borderRadius:16,padding:32,textAlign:'center',maxWidth:320,border:'0.5px solid #E0D8C8'}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
          <img src="/logo-icon-green.png" alt="Áncora" style={{height:48,width:'auto',objectFit:'contain'}}/>
        </div>
        <p style={{fontSize:15,fontWeight:600,color:'#1A1A1A',marginBottom:8}}>¡Bienvenido al equipo! 🎵</p>
        <p style={{fontSize:13,color:'#999',fontWeight:300,lineHeight:1.5}}>
          Ya tienes acceso. Cuando seas asignado a un servicio, aquí verás el setlist, la banda del día y podrás confirmar tu asistencia.
        </p>
        <button 
          onClick={async () => { await supabase.auth.signOut(); window.location.href = '/portal' }}
          style={{marginTop:20,fontSize:12,color:'#B91C1C',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
