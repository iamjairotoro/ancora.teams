'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    // replace, no push: "/" es solo una posta de tránsito — si quedara en
    // el historial, "atrás" te devolvería a esta pantalla de spinner en
    // vez de a donde estabas antes de pasar por acá.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/auth/callback')
      else router.replace('/login')
    })
  }, [router])
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C9A14A] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
