// Punto 53: solo el portal declara viewport-fit=cover, para que env(safe-area-inset-*) tenga valores en el iPhone
// (muesca, isla dinámica y barra de inicio). El resto de la app (administración) queda como estaba.
//
// Punto 54 · ESCALA DEL PORTAL: `--esc` es el factor de tamaño de TODO el portal en teléfono (≤ 768 px): 0.85 (Claudia prefiere la app al 85 %); en escritorio vale 1. No es CSS `zoom` ni `transform`: es el tamaño
// de letra de la raíz (`rem`), así que las medidas en `rem` (tipografía, espaciados, alturas de fila, avatares, menú, hojas) se escalan solas y `--portal-nav-total`, las hojas fijas y `visualViewport` siguen
// midiendo en px reales. Los radios del tema (--anc-r…) se multiplican por el mismo factor. Se queda fijo: campos de texto en 16 px (Safari hace zoom al tocar campos menores), zonas táctiles de 44 px como mínimo
// (`max(44px, …)`), textos de 11 px como mínimo, líneas de 1–2 px y la zona segura. La letra y los acordes de la canción NO se escalan (--anc-letra-size divide por --esc). La etiqueta <style> la dibuja components/EscalaMovil.tsx (desde la fase 2a también la usan /admin y /home;
// el factor 0.85 se cambia ahí, y vale para todo).
import type { Viewport } from 'next'
import EscalaMovil from '@/components/EscalaMovil'

export const viewport: Viewport = { viewportFit: 'cover' }

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <><EscalaMovil selectorCampos=".portal-root" />{children}</>
}
