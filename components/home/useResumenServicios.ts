'use client'
// Trae el resumen de servicios por equipo (GET /api/admin/servicios-resumen: solo conteos y estados; la organización sale de la sesión del administrador). Solo si `activo` (los dos llamadores lo
// activan únicamente en teléfono). Con `persona` (correo de la sesión) usa la caché en memoria de lib/cache/datosMovil.ts: si hay un resumen de ESA persona y rol lo muestra de inmediato con
// `actualizando` en true y lo vuelve a pedir por detrás; la caché se descarta sola al guardar o borrar algo y al cerrar sesión. Sin `persona`, el comportamiento de siempre.
import { useCallback, useEffect, useState } from 'react'
import type { ServicioResumen } from '@/lib/admin/resumenServicios'
import { alCambiarCache, claveDeCache, generacionActual, guardarCache, leerCache, usarInvalidacion } from '@/lib/cache/datosMovil'
import { supabase } from '@/lib/supabase'

export type EstadoResumen = { servicios: ServicioResumen[] | null; cargando: boolean; error: string | null; actualizando: boolean }

export function useResumenServicios(activo: boolean, persona?: string | null): EstadoResumen & { recargar: () => void } {
  const clave = activo ? claveDeCache(persona, 'admin', 'servicios-resumen') : null
  const [estado, setEstado] = useState<EstadoResumen>(() => {
    const previo = leerCache<ServicioResumen[]>(clave)
    return { servicios: previo, cargando: false, error: null, actualizando: false }
  })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!clave) return
    const soltar = usarInvalidacion(f => { const { data } = supabase.auth.onAuthStateChange((ev, s) => f(ev, s?.user?.id ?? null)); return () => data.subscription.unsubscribe() })
    // Si una escritura descartó la caché mientras esta pantalla estaba abierta, no se deja lo viejo a la vista: se vuelve a pedir.
    const baja = alCambiarCache(() => setN(x => x + 1))
    return () => { baja(); soltar() }
  }, [clave])
  useEffect(() => {
    if (!activo || persona === null) return   // sin sesión resuelta todavía: no se pide aún (así no se pide dos veces)
    let cancelado = false
    const previo = leerCache<ServicioResumen[]>(clave)
    const desde = generacionActual()
    // Con algo que mostrar (de la caché o lo que ya estaba en pantalla) se deja a la vista mientras llega lo nuevo.
    setEstado(e => previo ?? e.servicios ? { servicios: previo ?? e.servicios, cargando: false, error: null, actualizando: true } : { ...e, cargando: true, error: null, actualizando: false })
    fetch('/api/admin/servicios-resumen', { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Tu sesión no tiene permiso para ver esto.' : 'No se pudo leer el resumen.'); return r.json() })
      .then(d => {
        const servicios = (d.servicios ?? []) as ServicioResumen[]
        guardarCache(clave, servicios, desde)
        if (!cancelado) setEstado({ servicios, cargando: false, error: null, actualizando: false })
      })
      .catch(e => {
        if (cancelado) return
        const msg = e instanceof Error ? e.message : 'No se pudo leer el resumen.'
        // Con datos a la vista, una falla de la actualización no los borra: se avisa con el error de siempre solo si no había nada.
        setEstado(s => s.servicios ? { ...s, actualizando: false } : { servicios: null, cargando: false, error: msg, actualizando: false })
      })
    return () => { cancelado = true }
  }, [activo, clave, persona, n])
  return { ...estado, recargar: () => setN(x => x + 1) }
}
