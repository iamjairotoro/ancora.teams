'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/auth/callback')
      else router.push('/login')
    })
  }, [router])
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2A44] to-[#2E3D5C] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C9A14A] border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}
