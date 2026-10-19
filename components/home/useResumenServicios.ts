'use client'
// Trae el resumen de servicios por equipo (GET /api/admin/servicios-resumen: solo conteos y estados; la organización sale de la sesión del administrador). Solo si `activo`.
import { useCallback, useEffect, useState } from 'react'
import type { ServicioResumen } from '@/lib/admin/resumenServicios'

export type EstadoResumen = { servicios: ServicioResumen[] | null; cargando: boolean; error: string | null }

export function useResumenServicios(activo: boolean): EstadoResumen & { recargar: () => void } {
  const [estado, setEstado] = useState<EstadoResumen>({ servicios: null, cargando: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!activo) return
    let cancelado = false
    setEstado(e => ({ ...e, cargando: true, error: null }))
    fetch('/api/admin/servicios-resumen', { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Tu sesión no tiene permiso para ver esto.' : 'No se pudo leer el resumen.'); return r.json() })
      .then(d => { if (!cancelado) setEstado({ servicios: (d.servicios ?? []) as ServicioResumen[], cargando: false, error: null }) })
      .catch(e => { if (!cancelado) setEstado({ servicios: null, cargando: false, error: e instanceof Error ? e.message : 'No se pudo leer el resumen.' }) })
    return () => { cancelado = true }
  }, [activo, n])
  return { ...estado, recargar: () => setN(x => x + 1) }
}
