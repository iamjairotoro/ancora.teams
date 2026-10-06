'use client'
/* ════════════════════════════════════════════════════════════════════════
   AuthGateContext — resuelve sesión + rol UNA vez por sesión de pestaña,
   compartido entre /home y /admin (antes cada uno repetía getSession() +
   is_org_admin/is_org_owner/is_any_team_leader desde cero al montarse,
   así que navegar de una a la otra volvía a pasar por "Verificando
   acceso..." — cambiar de tab DENTRO de /admin no, porque ahí no hay
   remount, solo estado local).

   Perezoso a propósito (punto del pedido): el provider vive en
   app/layout.tsx, por encima de TODA la app — incluidas rutas públicas
   como /login y /portal/[token]. Para que esas rutas no disparen
   ninguna consulta, el provider NO resuelve nada por su cuenta al
   montarse: solo arranca cuando useAuthGate() se llama por primera vez
   (home/admin la llaman, login/portal no la importan ni la llaman).

   No decide POR SÍ SOLO quién puede entrar a qué pantalla — eso sigue
   siendo de cada página (home admite admin-u-owner-o-líder, admin solo
   admin-u-owner), exactamente como antes. Este contexto solo entrega los
   HECHOS (sesión, email, rol) una vez, para que cada página arme su
   propia decisión sin repetir las consultas.
   ════════════════════════════════════════════════════════════════════════ */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { DEFAULT_ORGANIZATION_ID } from './constants'
import { findMemberByEmail } from './findMemberByEmail'

export type AuthGateState =
  | { status: 'idle' }
  | { status: 'loading' }
  // Sin sesión — mismo destino que ya usaban /home y /admin (redirigir a
  // /login lo decide cada página, este contexto solo informa el hecho).
  | { status: 'denied' }
  | {
      status: 'ready'
      email: string
      memberId: string | null
      portalToken: string | null
      isOrgAdmin: boolean
      isOrgOwner: boolean
      isAnyTeamLeader: boolean
    }

interface AuthGateContextValue {
  state: AuthGateState
  ensureStarted: () => void
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthGateState>({ status: 'idle' })
  // Se pone en true la primera vez que algún useAuthGate() pide arrancar.
  // Mientras siga en false (rutas públicas que nunca llaman al hook), ni
  // resolve() ni el listener de abajo disparan ninguna consulta.
  const startedRef = useRef(false)

  const resolve = useCallback(async () => {
    setState({ status: 'loading' })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) { setState({ status: 'denied' }); return }
    const email = session.user.email

    const [{ data: isOrgAdmin }, { data: isAnyTeamLeader }] = await Promise.all([
      supabase.rpc('is_org_admin', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID }),
      supabase.rpc('is_any_team_leader', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID }),
    ])

    let isOrgOwner = false
    if (isOrgAdmin) {
      const { data } = await supabase.rpc('is_org_owner', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID })
      isOrgOwner = !!data
    }

    // Sin distinguir mayúsculas (la misma comparación que usan las funciones de rol).
    const found = await findMemberByEmail(email)
    const member = found.status === 'found' ? { id: found.id } : null
    let portalToken: string | null = null
    if (member) {
      const { data: inv } = await supabase.from('invitations').select('token')
        .eq('member_id', member.id).order('created_at', { ascending: false }).limit(1).single()
      portalToken = inv?.token || null
    }

    setState({
      status: 'ready', email, memberId: member?.id || null, portalToken,
      isOrgAdmin: !!isOrgAdmin, isOrgOwner, isAnyTeamLeader: !!isAnyTeamLeader,
    })
  }, [])

  const ensureStarted = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    resolve()
  }, [resolve])

  // Invalida la caché en cualquier cambio real de quién está logueado —
  // cerrar sesión o entrar con otra cuenta no debe dejar un rol viejo en
  // memoria. Gateado por startedRef: en /login o /portal, donde nadie
  // llamó a useAuthGate(), este listener no hace nada aunque esté armado.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!startedRef.current) return
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') resolve()
    })
    return () => subscription.unsubscribe()
  }, [resolve])

  return (
    <AuthGateContext.Provider value={{ state, ensureStarted }}>
      {children}
    </AuthGateContext.Provider>
  )
}

export function useAuthGate(): AuthGateState {
  const ctx = useContext(AuthGateContext)
  if (!ctx) throw new Error('useAuthGate debe usarse dentro de <AuthGateProvider>')
  useEffect(() => { ctx.ensureStarted() }, [ctx])
  return ctx.state
}
