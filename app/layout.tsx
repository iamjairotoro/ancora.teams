import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { cookies } from 'next/headers'
import { AuthGateProvider } from '@/lib/AuthGateContext'
import './globals.css'
import './ancora-tokens-v5.css'
import './songs.css'
import './person-drawer.css'
import './person-drawer-extra.css'
import './home.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ancora Setlist',
  description: 'Gestión de setlist y confirmaciones',
  manifest: '/manifest.json',
  icons: { icon: '/icon-192.png?v=2', apple: '/icon-192.png?v=2' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Áncora' },
}

// Punto 42: el fondo del tema oscuro (#1E1E1E), no negro puro.
export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1E1E' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie espejo `anc-theme` (ver lib/useDarkMode.ts): el servidor pinta
  // data-theme sin parpadeo. Con Sistema no hay cookie y <html> queda sin
  // atributo: el CSS sigue prefers-color-scheme.
  const saved = cookies().get('anc-theme')?.value
  const theme = saved === 'light' || saved === 'dark' ? saved : undefined
  return (
    <html lang="es" className={jakarta.variable} data-theme={theme} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <AuthGateProvider>{children}</AuthGateProvider>
      </body>
    </html>
  )
}
