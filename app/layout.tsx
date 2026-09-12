import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

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

export const viewport: Viewport = {
  themeColor: '#1A1A1A',
}

// Lee la cookie de tema (espejo de members.theme) antes de hidratar, para
// que el sidebar nuevo (basado en data-theme) no parpadee en claro al
// cargar en oscuro. Ver lib/useDarkMode.ts.
const NO_FLASH_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )ancora-theme=(light|dark)/);if(m)document.documentElement.setAttribute('data-theme',m[1]);}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={jakarta.variable} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        {children}
      </body>
    </html>
  )
}
