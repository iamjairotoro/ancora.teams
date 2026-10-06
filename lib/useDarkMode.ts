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
'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export type ThemePref = 'system' | 'light' | 'dark'

const LEGACY_STORAGE_KEY = 'ancora-dark-mode'
const COOKIE_KEY = 'anc-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readCookiePref(): 'light' | 'dark' | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)anc-theme=(light|dark)/)
  return m ? (m[1] as 'light' | 'dark') : null
}

function writeCookiePref(pref: ThemePref) {
  if (pref === 'system') document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`
  else document.cookie = `${COOKIE_KEY}=${pref}; path=/; max-age=31536000; samesite=lax`
}

function applyAttribute(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function useDarkMode(memberId?: string | null, opts?: { system?: boolean }) {
  const system = opts?.system === true
  const [pref, setPref] = useState<ThemePref>(system ? 'system' : 'light')
  const [osDark, setOsDark] = useState(false)
  // Hasta leer cookie/base no se escribe nada: si no, el estado inicial
  // (Sistema) borraría la cookie antes de leerla.
  const [loaded, setLoaded] = useState(false)
  const touched = useRef(false)

  // Valor inicial: cookie (ya la aplicó el layout del servidor) o, sin
  // cookie, la llave vieja de localStorage — solo en modo de dos estados.
  useEffect(() => {
    const cookie = readCookiePref()
    if (cookie) setPref(cookie)
    else if (!system && localStorage.getItem(LEGACY_STORAGE_KEY) === 'true') setPref('dark')
    setLoaded(true)
  }, [system])

  // La base de datos manda cuando hay member: si la persona lo cambió desde
  // otro dispositivo, se corrige acá. null = Sistema (solo en modo de tres
  // estados; en el de dos queda como estaba).
  useEffect(() => {
    if (!memberId) return
    let cancelled = false
    supabase.from('members').select('theme').eq('id', memberId).single().then(({ data }) => {
      if (cancelled || touched.current) return
      const dbTheme = data?.theme as 'light' | 'dark' | null | undefined
      if (dbTheme === 'light' || dbTheme === 'dark') setPref(dbTheme)
      else if (system && dbTheme === null) setPref('system')
    })
    return () => { cancelled = true }
  }, [memberId, system])

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
    if (system || touched.current) writeCookiePref(pref)
    localStorage.setItem(LEGACY_STORAGE_KEY, String(darkMode))
  }, [loaded, pref, darkMode, system])

  const setThemePref = useCallback((next: ThemePref) => {
    touched.current = true
    setPref(next)
    if (memberId) {
      supabase.from('members').update({ theme: next === 'system' ? null : next }).eq('id', memberId).then(() => {})
    }
  }, [memberId])

  const toggleDarkMode = useCallback(() => {
    setThemePref(darkMode ? 'light' : 'dark')
  }, [darkMode, setThemePref])

  return { darkMode, toggleDarkMode, themePref: pref, setThemePref }
}
