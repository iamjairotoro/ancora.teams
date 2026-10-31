'use client'
// /home/servicios — «Servicios» del LÍDER en teléfono (etapa 1). Solo teléfono: desde 769 px lleva al Home de siempre (el escritorio no cambia). Acceso: administrador/owner o líder de algún equipo (el mismo control
// de /home); un administrador va a su pantalla de Servicios en /admin. Todo lo que muestra lo decide el servidor (/api/lider/*): aquí no se lee ninguna tabla.
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PantallaArranque from '@/components/arranque/PantallaArranque'
import MenuLiderMovil from '@/components/lider-movil/MenuLiderMovil'
import ServiciosLider, { type DestinoLider } from '@/components/lider-movil/ServiciosLider'
import { destinoDeMenuLider } from '@/lib/lider/menuMovil'
import { etiquetaDeModo } from '@/lib/modo'
import { supabase } from '@/lib/supabase'
import { useAuthGate } from '@/lib/AuthGateContext'
import { useDarkMode } from '@/lib/useDarkMode'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { TEXTOS_LIDER as T } from '@/lib/textos/servicioLider'

export default function ServiciosLiderPage() {
  return <Suspense fallback={null}><Inner /></Suspense>
}

function Inner() {
  const router = useRouter()
  const params = useSearchParams()
  const gate = useAuthGate()
  const telefono = useMediaQuery('(max-width: 768px)')
  const memberId = gate.status === 'ready' ? gate.memberId : null
  const { darkMode, themePref, setThemePref } = useDarkMode(memberId, { system: true })
  const esAdmin = gate.status === 'ready' && gate.isOrgAdmin
  const permitido = gate.status === 'ready' && (gate.isOrgAdmin || gate.isAnyTeamLeader)
  const servicioId = params.get('servicio')
  const herramientaId = servicioId ? params.get('herramienta') : null

  useEffect(() => {
    if (gate.status === 'denied') window.location.href = `/login?next=${encodeURIComponent('/home/servicios')}`
    else if (esAdmin) window.location.href = '/admin?tab=setlist'
    else if (telefono === false) router.replace('/home')
  }, [gate.status, esAdmin, telefono, router])

  const irA = (d: DestinoLider) => {
    const q = new URLSearchParams()
    if (d.servicio) q.set('servicio', d.servicio)
    if (d.servicio && d.herramienta) q.set('herramienta', d.herramienta)
    router.push(`/home/servicios${q.size ? `?${q}` : ''}`)
  }
  const salir = async () => { await supabase.auth.signOut(); window.location.href = '/login' }
  const verificando = gate.status === 'idle' || gate.status === 'loading'
  const listo = permitido && !esAdmin && telefono === true

  return (
    <div className={darkMode ? 'dark' : ''} style={{ minHeight: '100vh', background: 'var(--anc-bg)' }}>
      <div className="anc">
        <AppShell orgName="Iglesia Áncora" userInitials="··" memberItems={[]} canAdmin={false} themePref={themePref} onThemePref={setThemePref}
          etiquetaModo={listo ? etiquetaDeModo(false) : undefined}
          menuMovil={listo ? <MenuLiderMovil activo="servicios" onSelect={k => { if (k === 'servicios') router.push('/home/servicios'); else window.location.href = destinoDeMenuLider(k) }} /> : undefined}
          onSignOut={salir} loadPerson={async () => { throw new Error('No disponible todavía') }} onEditPerson={() => {}}>
          {listo && <ServiciosLider servicioId={servicioId} herramientaId={herramientaId} irA={irA} />}
          {gate.status === 'ready' && !permitido && (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--anc-ink-2)', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>{T.sinAcceso}</p>
              <button onClick={salir} style={{ background: 'var(--anc-accent)', color: 'var(--anc-on-accent)', border: 'none', borderRadius: 'var(--anc-r)', padding: '9px 18px', fontSize: '.8125rem', fontWeight: 600, cursor: 'pointer' }}>Cerrar sesión</button>
            </div>
          )}
        </AppShell>
      </div>
      {(verificando || telefono === null) && <PantallaArranque />}
    </div>
  )
}
