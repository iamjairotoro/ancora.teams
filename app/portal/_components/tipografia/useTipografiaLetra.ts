'use client'
// La tipografía de la letra (fuente y tamaño) del músico, guardada en su perfil (members.chart_prefs) por /api/portal/preferencias. La usan la pantalla de la canción
// («Aa») y el Perfil («Tipografía de la letra»): una sola lectura y una sola escritura (punto 54, commit 1; antes vivía dentro de CancionPortal).
import { useCallback, useEffect, useState } from 'react'
import { portalFetch } from '@/lib/portal/portalFetch'
import { DEFAULT_LYRIC_PREFS, type LyricPrefs } from '@/lib/lyricPrefs'

// Las preferencias se recuerdan mientras la página siga abierta: al volver a una canción (o al Perfil) no hay parpadeo de la fuente.
let prefsEnMemoria: LyricPrefs | null = null

export function useTipografiaLetra(token: string | null) {
  const [prefs, setPrefs] = useState<LyricPrefs>(prefsEnMemoria ?? DEFAULT_LYRIC_PREFS)
  const [errPrefs, setErrPrefs] = useState(false)

  // Una vez por visita; si falla, se usa la de siempre.
  useEffect(() => {
    if (prefsEnMemoria) return
    portalFetch(token, '/api/portal/preferencias').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.letra) { prefsEnMemoria = d.letra; setPrefs(d.letra) }
    }).catch(() => {})
  }, [token])

  const elegir = useCallback((patch: Partial<Pick<LyricPrefs, 'fontFamily' | 'textScale'>>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; prefsEnMemoria = next; return next })
    setErrPrefs(false)
    portalFetch(token, '/api/portal/preferencias', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ letra: patch }) })
      .then(r => { if (!r.ok) setErrPrefs(true) }).catch(() => setErrPrefs(true))
  }, [token])

  return { prefs, elegir, errPrefs }
}
