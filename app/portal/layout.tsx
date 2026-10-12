// Punto 53: solo el portal declara viewport-fit=cover, para que env(safe-area-inset-*) tenga valores en el iPhone
// (muesca, isla dinámica y barra de inicio). El resto de la app (administración) queda como estaba.
import type { Viewport } from 'next'

export const viewport: Viewport = { viewportFit: 'cover' }

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children
}
