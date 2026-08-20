'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ancora-dark-mode'

// Hook compartido para manejar el modo oscuro en el Admin.
// Usa la misma llave de localStorage que el portal del músico, así la
// preferencia se comparte si es la misma persona usando ambos.
export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') setDarkMode(true)
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem(STORAGE_KEY, String(next))
  }

  return { darkMode, toggleDarkMode }
}
