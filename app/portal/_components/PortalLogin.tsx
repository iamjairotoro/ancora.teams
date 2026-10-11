'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import TexBg from '@/components/TexBg'
import { C } from '@/lib/portal/theme'
import PortalLogo from './PortalLogo'

// Pantalla de entrada del portal cuando el servidor NO reconoce a nadie (ni sesión de
// Google con un correo del equipo, ni enlace de acceso vigente). Quién es la persona se
// decide en app/portal/page.tsx (servidor); acá solo se ofrece entrar con Google.
export default function PortalLogin({ notice }: { notice?: string | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loginWithGoogle() {
    setLoading(true)
    // Mismo camino que /login: el destino viaja en una cookie de un solo uso y el
    // callback del servidor intercambia el código; vuelve a /portal con la sesión puesta.
    document.cookie = `ancora-next=${encodeURIComponent('/portal')}; path=/; max-age=600; samesite=lax`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <TexBg className="min-h-screen flex items-center justify-center p-4">
      <div style={{background:C.card,borderRadius:14,padding:'28px 24px',width:'100%',maxWidth:320,textAlign:'center',fontFamily:'ui-rounded,-apple-system,"SF Pro Rounded","SF Pro Display",system-ui,sans-serif'}}>
        {/* Logo */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
          <PortalLogo height={56}/>
        </div>

        <p style={{fontSize:13,fontWeight:400,color:C.muted,marginBottom:20}}>Mi espacio Áncora</p>

        {(notice || error) && (
          <div style={{background:C.noBg,color:C.no,fontSize:12,padding:'8px 12px',borderRadius:8,marginBottom:14,textAlign:'left'}}>
            {notice || error}
          </div>
        )}

        <button onClick={loginWithGoogle} disabled={loading}
          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,border:`0.5px solid ${C.ring}`,borderRadius:10,padding:'11px 14px',fontSize:13,fontWeight:500,color:C.ink2,background:C.card,cursor:'pointer',fontFamily:'inherit'}}>
          {/* Marca de Google: imagen aparte (colores de la marca, no de la paleta de Áncora) */}
          <img src="/google-g.svg" alt="" width={18} height={18} aria-hidden="true"/>
          Continuar con Google
        </button>

        <p style={{fontSize:10,fontWeight:300,color:C.faint,marginTop:16}}>
          Ingresa con el email registrado en el equipo Áncora.
        </p>
      </div>
    </TexBg>
  )
}
