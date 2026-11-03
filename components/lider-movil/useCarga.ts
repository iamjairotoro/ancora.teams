'use client'
// Lectura GET de las pantallas del líder: «cargando», «ok», «error» o «prohibido» (401/403), con recarga. Sin caché del navegador.
import { useCallback, useEffect, useState } from 'react'

export type Carga<D> = { estado: 'cargando' } | { estado: 'ok'; datos: D } | { estado: 'error' } | { estado: 'prohibido' }

export function useCarga<D>(url: string): [Carga<D>, () => void] {
  const [c, setC] = useState<Carga<D>>({ estado: 'cargando' })
  const [n, setN] = useState(0)
  useEffect(() => {
    let vigente = true
    fetch(url, { cache: 'no-store' }).then(async r => {
      if (!vigente) return
      if (r.status === 401 || r.status === 403) return setC({ estado: 'prohibido' })
      if (!r.ok) return setC({ estado: 'error' })
      setC({ estado: 'ok', datos: await r.json() as D })
    }).catch(() => { if (vigente) setC({ estado: 'error' }) })
    return () => { vigente = false }
  }, [url, n])
  return [c, useCallback(() => setN(x => x + 1), [])]
}
