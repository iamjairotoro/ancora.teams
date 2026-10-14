'use client'
// Controlador de las acciones de una convocatoria en el portal (punto 52, commit 4): responder, «Aceptar aquí en su lugar» y «Quitar mi confirmación».
// Lo usa CUALQUIER pantalla: le pasa sus entradas y cómo recargarse. Habla con /api/confirm-rsvp (por el token de la invitación) y con las rutas
// /api/portal/aceptar-aqui y /quitar-confirmacion (la persona la resuelve el servidor; aquí solo viaja el id de la convocatoria).
import { useCallback, useRef, useState } from 'react'
import { portalFetch } from '@/lib/portal/portalFetch'
import type { EntradaConvocatoria } from './tipos'

export type TipoHoja = 'aceptar-aqui' | 'quitar'
export interface HojaAbierta {
  tipo: TipoHoja
  entrada: EntradaConvocatoria
  /** Aceptar aquí: el equipo que se deja (null si no se sabe). */
  deja: string | null
  /** Quitar: los equipos cuya convocatoria había quedado declinada por esta confirmación y volverán a pendiente. */
  vuelven: string[]
  error: string | null
}

export interface ControladorConvocatorias {
  /** Hay una petición en curso: nada se puede pulsar dos veces. */
  ocupado: boolean
  /** Resultado para el lector de pantalla (región aria-live). */
  aviso: string | null
  /** Error de «Confirmo / No puedo» (no el de la hoja). */
  errorRespuesta: string | null
  hoja: HojaAbierta | null
  responder(entrada: EntradaConvocatoria, respuesta: 'si' | 'no'): Promise<boolean>
  pedirAceptarAqui(entrada: EntradaConvocatoria): void
  pedirQuitar(entrada: EntradaConvocatoria): void
  confirmarHoja(): Promise<void>
  cancelarHoja(): void
}

const ERROR_GENERICO = 'No se pudo completar. Intenta de nuevo.'

export function useConvocatorias(o: {
  /** Token del portal por enlace (/portal/<token>); null en el portal por sesión. */
  token: string | null
  /** Todas las entradas que la pantalla muestra (sirve para nombrar el otro equipo). */
  entradas: EntradaConvocatoria[]
  /** Vuelve a cargar los datos de la pantalla tras un cambio. */
  recargar: () => Promise<unknown> | void
}): ControladorConvocatorias {
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorRespuesta, setErrorRespuesta] = useState<string | null>(null)
  const [hoja, setHoja] = useState<HojaAbierta | null>(null)
  const ultimo = useRef(o); ultimo.current = o
  const enCurso = useRef(false)

  const responder = useCallback(async (entrada: EntradaConvocatoria, respuesta: 'si' | 'no'): Promise<boolean> => {
    const token = entrada.invitation?.token
    if (!token || enCurso.current) return false
    enCurso.current = true; setOcupado(true); setErrorRespuesta(null)
    const res = await fetch('/api/confirm-rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, respuesta }) }).catch(() => null)
    const data = res ? await res.json().catch(() => null) : null
    enCurso.current = false; setOcupado(false)
    if (res?.ok) {
      setAviso(respuesta === 'si' ? `Confirmaste${entrada.team ? ' en ' + entrada.team.name : ''}.` : `Dijiste que no puedes${entrada.team ? ' en ' + entrada.team.name : ''}.`)
      await ultimo.current.recargar(); return true
    }
    if (res?.status === 409 && data?.codigo === 'conflicto') {
      // Ya confirmó en otro equipo que se cruza: se ofrece la misma salida de «Aceptar aquí en su lugar».
      const otra = ultimo.current.entradas.find(e => e.invitation?.id && e.invitation.id === data?.conflicto?.invitacion)
      setHoja({ tipo: 'aceptar-aqui', entrada, deja: otra?.team?.name ?? null, vuelven: [], error: null })
      return false
    }
    setErrorRespuesta(typeof data?.error === 'string' && res && res.status < 500 ? data.error : 'No se pudo guardar tu respuesta. Intenta de nuevo.')
    return false
  }, [])

  const pedirAceptarAqui = useCallback((entrada: EntradaConvocatoria) => {
    setErrorRespuesta(null)
    setHoja({ tipo: 'aceptar-aqui', entrada, deja: entrada.reemplazadaPor?.name || null, vuelven: [], error: null })
  }, [])

  const pedirQuitar = useCallback((entrada: EntradaConvocatoria) => {
    setErrorRespuesta(null)
    const equipo = entrada.team?.id
    const vuelven = equipo ? ultimo.current.entradas
      .filter(e => e !== entrada && e.invitation?.declined_reason === 'conflict' && e.invitation.status === 'declinado' && e.reemplazadaPor?.id === equipo && e.team?.name)
      .map(e => e.team!.name) : []
    setHoja({ tipo: 'quitar', entrada, deja: null, vuelven: Array.from(new Set(vuelven)), error: null })
  }, [])

  const confirmarHoja = useCallback(async () => {
    const h = hoja
    if (!h || enCurso.current) return
    const id = h.entrada.invitation?.id
    if (!id) { setHoja({ ...h, error: 'No se pudo identificar la convocatoria. Recarga la pantalla e intenta de nuevo.' }); return }
    enCurso.current = true; setOcupado(true)
    const ruta = h.tipo === 'aceptar-aqui' ? '/api/portal/aceptar-aqui' : '/api/portal/quitar-confirmacion'
    const res = await portalFetch(ultimo.current.token, ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitacion: id }) }).catch(() => null)
    const data = res ? await res.json().catch(() => null) : null
    enCurso.current = false; setOcupado(false)
    if (res?.ok) {
      const eq = h.entrada.team?.name
      setHoja(null)
      setAviso(h.tipo === 'aceptar-aqui' ? `Listo: dejaste ${h.deja ?? 'el otro equipo'} y confirmaste${eq ? ' en ' + eq : ''}.` : `Quitaste tu confirmación${eq ? ' en ' + eq : ''}.`)
      await ultimo.current.recargar(); return
    }
    const mensaje = res?.status === 401 ? 'Tu sesión venció. Recarga la página para entrar de nuevo.'
      : typeof data?.error === 'string' && res && res.status < 500 ? data.error : ERROR_GENERICO
    setHoja({ ...h, error: mensaje })
  }, [hoja])

  const cancelarHoja = useCallback(() => { if (!enCurso.current) setHoja(null) }, [])

  return { ocupado, aviso, errorRespuesta, hoja, responder, pedirAceptarAqui, pedirQuitar, confirmarHoja, cancelarHoja }
}
