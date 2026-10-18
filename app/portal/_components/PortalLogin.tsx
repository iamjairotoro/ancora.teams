'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import TexBg from '@/components/TexBg'
import PortalLogo from './PortalLogo'
import ui from './acceso/acceso.module.css'

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
      <div className={ui.tarjeta}>
        <div className={ui.logo}><PortalLogo height="3.5rem"/></div>

        <p className={ui.sub}>Mi espacio Áncora</p>

        {(notice || error) && <div className={ui.aviso}>{notice || error}</div>}

        <button type="button" onClick={loginWithGoogle} disabled={loading} className={ui.google}>
          {/* Marca de Google: imagen aparte (colores de la marca, no de la paleta de Áncora) */}
          <img src="/google-g.svg" alt="" width={18} height={18} aria-hidden="true"/>
          {loading ? 'Abriendo Google…' : 'Continuar con Google'}
        </button>

        <p className={ui.pie}>Ingresa con el email registrado en el equipo Áncora.</p>
      </div>
    </TexBg>
  )
}
