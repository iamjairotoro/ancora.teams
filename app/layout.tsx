import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ancora Setlist',
  description: 'Gestión de setlist y confirmaciones',
  manifest: '/manifest.json',
  icons: { icon: '/icon-192.png?v=2', apple: '/icon-192.png?v=2' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Áncora' },
}

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
