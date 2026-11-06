'use client'
// La notación (ABC o 123), la vista y la vista compacta del músico para los acordes, guardadas en su perfil (members.chart_prefs.lectura) por /api/portal/preferencias.
// Solo se monta con la hoja de acordes: una canción en formato 1 no hace esta lectura.
import { useCallback, useEffect, useState } from 'react'
import { portalFetch } from '@/lib/portal/portalFetch'
import { DEFAULT_LECTURA_PREFS, type LecturaPrefs } from '@/lib/lyricPrefs'

let enMemoria: LecturaPrefs | null = null

export function useLecturaAcordes(token: string | null) {
  const [prefs, setPrefs] = useState<LecturaPrefs>(enMemoria ?? DEFAULT_LECTURA_PREFS)
  const [errPrefs, setErrPrefs] = useState(false)

  useEffect(() => {
    if (enMemoria) return
    portalFetch(token, '/api/portal/preferencias').then(r => r.ok ? r.json() : null).then(d => { if (d?.lectura) { enMemoria = d.lectura; setPrefs(d.lectura) } }).catch(() => {})
  }, [token])

  const elegir = useCallback((patch: Partial<LecturaPrefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; enMemoria = next; return next })
    setErrPrefs(false)
    portalFetch(token, '/api/portal/preferencias', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lectura: patch }) })
      .then(r => { if (!r.ok) setErrPrefs(true) }).catch(() => setErrPrefs(true))
  }, [token])

  return { prefs, elegir, errPrefs }
}
