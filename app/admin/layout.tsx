// /admin y /home en teléfono (fase 2a): la misma escala del portal (--esc = .85 en ≤ 768 px; en escritorio vale 1 y no cambia nada) y `viewportFit: 'cover'` para que la zona segura del iPhone
// (env(safe-area-inset-*)) valga algo: el menú inferior y las hojas dependen de ella. Los campos de texto de lo nuevo (.admin-movil) quedan en 16 px.
import type { Viewport } from 'next'
import EscalaMovil from '@/components/EscalaMovil'

export const viewport: Viewport = { viewportFit: 'cover' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><EscalaMovil selectorCampos=".admin-movil" />{children}</>
}
