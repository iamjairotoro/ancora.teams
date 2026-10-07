// Hook compartido de tema — admin, home y portal lo montan cada uno por su cuenta.
// Preferencia de tres valores (punto 42): 'system' | 'light' | 'dark'. En la
// base es members.theme: 'light' y 'dark' tal cual, y null = Sistema. La
// cookie espejo `anc-theme` guarda solo 'light' o 'dark' (con Sistema se
// borra) para que el layout del servidor renderice <html data-theme> sin
// parpadeo; con Sistema <html> queda SIN atributo y el CSS sigue
// prefers-color-scheme.
// `darkMode` es el valor RESUELTO (Sistema ya traducido con matchMedia): lo
// consumen los componentes que todavía dependen de la clase `.dark`.
// El portal del músico (app/portal/**) no entra en este cambio: lo llama sin
// opciones y conserva el comportamiento de dos estados (claro por defecto,
// atributo siempre presente). Solo admin y home pasan { system: true }.
// Opción `portal` (punto 49): SOLO para el portal. La preferencia se lee y se guarda por
// /api/portal/preferencias (el servidor identifica a la persona; el navegador no escribe
// `members` con la llave pública), la cookie `anc-theme` se escribe siempre (así las demás
// pantallas del portal pintan el mismo tema) y ya no se usa localStorage['ancora-dark-mode'].
// `portal.token` es el token de invitación del portal por token, o null en /portal. La
// administración (admin, home) NO la pasa: conserva su guardado directo con la sesión de Google.
'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { portalFetch } from '@/lib/portal/portalFetch'

export type ThemePref = 'system' | 'light' | 'dark'

const LEGACY_STORAGE_KEY = 'ancora-dark-mode'
const COOKIE_KEY = 'anc-theme'
const LEGACY_COOKIE_KEY = 'ancora-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readCookiePref(): 'light' | 'dark' | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)anc-theme=(light|dark)/)
  return m ? (m[1] as 'light' | 'dark') : null
}

// Secure solo en https: en http (localhost) el navegador descartaría la cookie.
function writeCookiePref(pref: ThemePref) {
  const secure = location.protocol === 'https:' ? '; secure' : ''
  if (pref === 'system') document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax${secure}`
  else document.cookie = `${COOKIE_KEY}=${pref}; path=/; max-age=31536000; samesite=lax${secure}`
}

// La cookie de antes del punto 42 ya no la lee nadie: se borra una vez al cargar.
function clearLegacyCookie() {
  document.cookie = `${LEGACY_COOKIE_KEY}=; path=/; max-age=0`
}

function applyAttribute(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function useDarkMode(memberId?: string | null, opts?: { system?: boolean; portal?: { token: string | null } }) {
  const system = opts?.system === true
  const portalOn = !!opts?.portal
  const portalToken = opts?.portal?.token ?? null
  const [pref, setPref] = useState<ThemePref>(system ? 'system' : 'light')
  const [osDark, setOsDark] = useState(false)
  // Hasta leer cookie/base no se escribe nada: si no, el estado inicial
  // (Sistema) borraría la cookie antes de leerla.
  const [loaded, setLoaded] = useState(false)
  const touched = useRef(false)

  // Valor inicial: cookie (ya la aplicó el layout del servidor) o, sin
  // cookie, la llave vieja de localStorage — solo en modo de dos estados.
  useEffect(() => {
    clearLegacyCookie()
    const cookie = readCookiePref()
    if (cookie) setPref(cookie)
    else if (!system && !portalOn && localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') setPref('dark')
    if (portalOn) { try { localStorage.removeItem(LEGACY_STORAGE_KEY) } catch {} }
    setLoaded(true)
  }, [system, portalOn])

  // La base de datos manda cuando hay member: si la persona lo cambió desde
  // otro dispositivo, se corrige acá. null = Sistema (solo en modo de tres
  // estados; en el de dos queda como estaba).
  useEffect(() => {
    if (!memberId) return
    let cancelled = false
    const apply = (dbTheme: 'light' | 'dark' | null | undefined) => {
      if (cancelled || touched.current) return
      if (dbTheme === 'light' || dbTheme === 'dark') setPref(dbTheme)
      else if (system && dbTheme === null) setPref('system')
    }
    if (portalOn) {
      portalFetch(portalToken, '/api/portal/preferencias').then(r => r.ok ? r.json() : null).then(d => apply(d?.theme)).catch(() => {})
    } else {
      supabase.from('members').select('theme').eq('id', memberId).single().then(({ data }) => apply(data?.theme as 'light' | 'dark' | null | undefined))
    }
    return () => { cancelled = true }
  }, [memberId, system, portalOn, portalToken])

  // Sistema: seguir el cambio de preferencia del sistema operativo en vivo.
  useEffect(() => {
    if (!system || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(DARK_QUERY)
    setOsDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setOsDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [system])

  const darkMode = pref === 'dark' || (pref === 'system' && osDark)

  // Cada cambio se refleja en <html data-theme>, la cookie y localStorage
  // (por compatibilidad con lo que todavía lo lee directo). En modo de dos
  // estados la cookie solo se escribe si la persona cambió el tema.
  useEffect(() => {
    if (!loaded) return
    applyAttribute(pref)
    if (system || touched.current || portalOn) writeCookiePref(pref)
    if (!portalOn) localStorage.setItem(LEGACY_STORAGE_KEY, String(darkMode))
  }, [loaded, pref, darkMode, system, portalOn])

  const setThemePref = useCallback((next: ThemePref) => {
    touched.current = true
    setPref(next)
    if (memberId) {
      const theme = next === 'system' ? null : next
      if (portalOn) {
        portalFetch(portalToken, '/api/portal/preferencias', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme }) }).catch(() => {})
      } else {
        supabase.from('members').update({ theme }).eq('id', memberId).then(() => {})
      }
    }
  }, [memberId, portalOn, portalToken])

  const toggleDarkMode = useCallback(() => {
    setThemePref(darkMode ? 'light' : 'dark')
  }, [darkMode, setThemePref])

  return { darkMode, toggleDarkMode, themePref: pref, setThemePref }
}
