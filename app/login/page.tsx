'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TexBg from '@/components/TexBg'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('error') === 'not-member') {
      setError('Tu cuenta de Google no está registrada en el equipo. Contacta al administrador.')
    }
  }, [searchParams])

  async function loginWithGoogle() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/bg-ancora.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      position: 'relative',
    }}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.55)'}}/>
      <div style={{ position:'relative', background: 'white', borderRadius: 14, padding: '28px 24px', width: '100%', maxWidth: 320, textAlign: 'center' }}>
        {/* Logo */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
          <img src="/logo-icon-green.png" alt="Áncora" style={{height:56,width:'auto',objectFit:'contain'}}/>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 14, textAlign: 'left' }}>
            {error}
          </div>
        )}

        <button onClick={loginWithGoogle} disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, border: '0.5px solid #E0E0E0', borderRadius: 10, padding: '11px 14px', fontSize: 13, fontWeight: 500, color: '#333', background: 'white', cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}>
          {loading ? (
            <div style={{ width: 18, height: 18, border: '2px solid #DDD', borderTopColor: '#555', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Conectando...' : 'Continuar con Google'}
        </button>

        <p style={{ fontSize: 10, fontWeight: 300, color: '#BBB', marginTop: 16, letterSpacing: 0.2 }}>
          Solo miembros del equipo Áncora pueden acceder.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #F5F0E6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
