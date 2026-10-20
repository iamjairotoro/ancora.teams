'use client'
// Lo abierto en Servicio (lista · servicio · equipo · herramienta) leído de la URL y escrito con la API nativa del historial (Next 14 la integra con su router y no pide nada al servidor), la misma técnica de
// usePortalUrl del portal. La lógica (empujar, «‹», atrás) vive en `crearNavegacionServicio` (lib/admin/urlServicio.ts, con pruebas); esto solo la conecta con `window` y con React.
// `window` solo se toca dentro de efectos y manejadores: la página también se arma en el servidor.
import { useCallback, useEffect, useRef, useState } from 'react'
import { VISTA_VACIA, crearNavegacionServicio, type VistaServicio } from '@/lib/admin/urlServicio'

const igual = (a: VistaServicio, b: VistaServicio) => a.servicio === b.servicio && a.equipo === b.equipo && a.herramienta === b.herramienta

export function useServicioUrl() {
  const [vista, setVista] = useState<VistaServicio>(VISTA_VACIA)
  const navegacion = useRef<ReturnType<typeof crearNavegacionServicio> | null>(null)
  const nav = useCallback(() => (navegacion.current ??= crearNavegacionServicio({ href: () => window.location.href, historial: window.history })), [])
  const fijar = useCallback((v: VistaServicio) => setVista(prev => (igual(prev, v) ? prev : v)), [])

  useEffect(() => {
    fijar(nav().actual())
    const alNavegar = () => { nav().alNavegar(); fijar(nav().actual()) }
    window.addEventListener('popstate', alNavegar)
    return () => window.removeEventListener('popstate', alNavegar)
  }, [nav, fijar])

  const ir = useCallback((v: VistaServicio) => { nav().ir(v); fijar(nav().actual()) }, [nav, fijar])
  const volver = useCallback(() => { nav().volver(); fijar(nav().actual()) }, [nav, fijar])
  return { vista, ir, volver }
}
