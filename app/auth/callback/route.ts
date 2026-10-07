import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants'
import { findMemberByEmail } from '@/lib/findMemberByEmail'

const NEXT_COOKIE = 'ancora-next'

// Primer segmento permitido para "next" — no alcanza con que sea una ruta
// relativa: tiene que ser una de las secciones reales de la app. Así un
// "next" corrupto o con otro origen nunca manda a una ruta arbitraria del
// propio sitio, solo a las tres de siempre.
const ALLOWED_NEXT_PREFIXES = ['/home', '/admin', '/portal']

// "next" viaja en una cookie de un solo uso (ver app/login/page.tsx), no en
// el redirectTo de OAuth — las Redirect URLs de Supabase se validan por URL
// exacta/wildcard, y si la de producción no tiene comodín, un redirectTo
// con query string se descarta en silencio. Se valida acá para que nunca
// sea una URL externa (open redirect):
//   - tiene que empezar con un único "/" (no "//", eso es protocol-relative)
//   - no puede contener "\" ni "://" en ningún punto de la cadena
//   - su primer segmento de ruta tiene que estar en ALLOWED_NEXT_PREFIXES
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//')) return null
  if (next.includes('\\')) return null
  if (next.includes('://')) return null
  const pathOnly = next.split(/[?#]/)[0]
  const firstSegment = '/' + (pathOnly.split('/').filter(Boolean)[0] || '')
  if (!ALLOWED_NEXT_PREFIXES.includes(firstSegment)) return null
  return next
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const rawNext = req.cookies.get(NEXT_COOKIE)?.value
  const next = safeNext(rawNext ? decodeURIComponent(rawNext) : null)
  const supabase = createServerSupabase()

  // La cookie es de un solo uso: se borra acá se la use o no, para que un
  // valor viejo (ej. una pestaña que quedó a mitad del login) nunca influya
  // en un login posterior.
  function redirect(path: string) {
    const res = NextResponse.redirect(new URL(path, req.url))
    res.cookies.delete(NEXT_COOKIE)
    return res
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return redirect('/login')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return redirect('/login')

  const email = user.email

  // Un enlace directo (ej. /admin?tab=canciones) manda su propio destino,
  // sin importar el rol — la pantalla de destino vuelve a chequear el
  // permiso por su cuenta (AuthGateContext), esto solo decide A DÓNDE.
  if (next) return redirect(next)

  // 1. ¿Es admin u owner de la organización, o líder de algún equipo?
  // Antes esto mandaba solo a los admins a /admin. Ahora el destino por
  // defecto tras el login es /home para admin Y líder — /home ya sabe
  // distinguir entre los dos (ve todo vs. ve solo su equipo).
  const [{ data: isOrgAdmin }, { data: isAnyTeamLeader }] = await Promise.all([
    supabase.rpc('is_org_admin', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID }),
    supabase.rpc('is_any_team_leader', { p_email: email, p_organization_id: DEFAULT_ORGANIZATION_ID }),
  ])
  if (isOrgAdmin || isAnyTeamLeader) return redirect('/home')

  // 2. ¿Es miembro?
  // Sin distinguir mayúsculas; si hay dos personas con ese correo no se adivina.
  const found = await findMemberByEmail(email, supabase)
  const member = found.status === 'found' ? { id: found.id } : null

  // /portal resuelve en el servidor quién es (sesión de Google → members.email); ya no
  // hay que buscar una invitación ni armar una URL con un id (punto 48).
  if (member) return redirect('/portal')

  return redirect('/login?error=not-member')
}
