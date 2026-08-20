'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    async function handle() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const email = session.user.email!

      // 1. Check if admin
      const { data: adminData } = await supabase
        .from('admin_emails').select('email').eq('email', email).single()
      if (adminData) { router.push('/admin'); return }

      // 2. Check if member
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
          router.push(`/portal/${bestInv.token}`); return
        }

        // Sin ninguna invitación → portal con member_id usando mismo componente
        router.push(`/portal/member_${member.id}`); return
      }

      router.push('/login?error=not-member')
    }
    handle()
  }, [router])

  return (
    <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:32,height:32,border:'2px solid #F5F0E6',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
        <p style={{color:'rgba(245,240,230,0.5)',fontSize:13}}>Verificando acceso...</p>
      </div>
    </div>
  )
}
