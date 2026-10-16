'use client'
// Las notificaciones push del músico (punto 54, commit 1: salen de PortalApp). Vive en la envoltura (se llama desde PortalApp) porque el service worker se registra al abrir el
// portal, no solo al entrar al Perfil, y `instalada` también la usa el aviso de «app instalada». Los errores ya no son un alert(): van a `error`, que el Perfil dibuja.
import { useCallback, useEffect, useState } from 'react'
import { portalFetch } from '@/lib/portal/portalFetch'
import type { ControlPush } from './tipos'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map(c => c.charCodeAt(0)))
}

export function usePush(token: string | null, memberId: string | undefined): ControlPush {
  const [activadas, setActivadas] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [soportado, setSoportado] = useState(true)
  const [esIOS, setEsIOS] = useState(false)
  const [instalada, setInstalada] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Esta variable se «hornea» en el bundle del cliente al construir. Si quedó vacía, faltaba configurar VAPID o no se ha vuelto a desplegar: sin ella no hay push posible.
  const sinClave = !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    setEsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setInstalada(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setSoportado(false); return }
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setActivadas(!!sub)
    }).catch(() => setSoportado(false))
  }, [])

  const alternar = useCallback(async () => {
    if (!memberId) return
    setError(null)
    if (sinClave) { setError('Las notificaciones todavía no están configuradas en el servidor. Avísale al administrador.'); return }
    setCargando(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (activadas) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await portalFetch(token, '/api/portal/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
          await sub.unsubscribe()
        }
        setActivadas(false)
      } else {
        const permiso = await Notification.requestPermission()
        if (permiso !== 'granted') { setError('No diste permiso para las notificaciones. Puedes cambiarlo en los ajustes de tu navegador o de tu teléfono.'); setCargando(false); return }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '') })
        const guardada = await portalFetch(token, '/api/portal/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) })
        if (!guardada.ok) { await sub.unsubscribe().catch(() => {}); throw new Error('push-save') }
        setActivadas(true)
      }
    } catch {
      setError('No se pudieron cambiar las notificaciones. Intenta de nuevo.')
    }
    setCargando(false)
  }, [memberId, sinClave, activadas, token])

  return { soportado, esIOS, instalada, sinClave, activadas, cargando, error, alternar }
}
