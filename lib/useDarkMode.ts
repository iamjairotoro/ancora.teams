'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const LEGACY_STORAGE_KEY = 'ancora-dark-mode'
const COOKIE_KEY = 'ancora-theme'

function readCookieTheme(): 'light' | 'dark' | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)ancora-theme=(light|dark)/)
  return m ? (m[1] as 'light' | 'dark') : null
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)
  document.cookie = `${COOKIE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`
  localStorage.setItem(LEGACY_STORAGE_KEY, String(theme === 'dark'))
}

// Hook compartido de tema — admin y portal lo montan cada uno por su cuenta.
// Mantiene la firma de siempre ({darkMode, toggleDarkMode}) para no tocar a
// los componentes que ya lo consumen así; memberId es opcional y solo
// habilita la sincronización con members.theme en base de datos (para que
// la misma persona vea lo mismo en el teléfono y el computador). Sin
// memberId, se comporta como antes: por dispositivo, vía localStorage.
export function useDarkMode(memberId?: string | null) {
  const [darkMode, setDarkMode] = useState(false)

  // Valor inicial: cookie (ya la aplicó el script anti-flash del layout) o,
  // si no hay, la llave vieja de localStorage — mismo comportamiento de hoy.
  useEffect(() => {
    const cookieTheme = readCookieTheme()
    if (cookieTheme) { setDarkMode(cookieTheme === 'dark'); return }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'true') setDarkMode(true)
  }, [])

  // La base de datos manda cuando hay member: si la persona lo cambió desde
  // otro dispositivo, se corrige acá.
  useEffect(() => {
    if (!memberId) return
    supabase.from('members').select('theme').eq('id', memberId).single().then(({ data }) => {
      const dbTheme = data?.theme as 'light' | 'dark' | null | undefined
      if (dbTheme === 'light' || dbTheme === 'dark') setDarkMode(dbTheme === 'dark')
    })
  }, [memberId])

  // Cada cambio de darkMode se refleja en <html data-theme>, la cookie y
  // localStorage (por compatibilidad con lo que todavía lo lee directo).
  useEffect(() => {
    applyTheme(darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev
      if (memberId) {
        supabase.from('members').update({ theme: next ? 'dark' : 'light' }).eq('id', memberId).then(() => {})
      }
      return next
    })
  }, [memberId])

  return { darkMode, toggleDarkMode }
}
