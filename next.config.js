/** @type {import('next').NextConfig} */

// Origen del almacenamiento y la API de Supabase (avatares, portadas, URLs firmadas de audio y PDF, auth). Sale de la misma variable que usa la app;
// si por algún motivo no está al construir, se cae al dominio genérico de Supabase en vez de dejar la política sin ese origen.
const SUPABASE = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin } catch { return 'https://*.supabase.co' }
})()

// Punto 55, paso 6 · CSP del portal: SOLO en modo «Report-Only» (no bloquea nada; las infracciones se ven en la consola del navegador, sin endpoint
// de reportes todavía). Cada origen está por algo que el portal usa hoy:
//   script-src  'self' 'unsafe-inline'        el JS de Next y su arranque en línea (sin nonce). En desarrollo, además 'unsafe-eval' (lo exige el recargado en caliente).
//   style-src   'self' 'unsafe-inline'        los estilos en línea de React/Next (style="…") · https://fonts.googleapis.com: globals.css importa «Dancing Script».
//   font-src    'self' data:                  las fuentes de next/font (alojadas aquí) · https://fonts.gstatic.com: los archivos de «Dancing Script».
//   img-src     'self' data: blob:            logos, bg-ancora.jpg, íconos · https://i.ytimg.com: miniatura del video de YouTube ·
//               SUPABASE                      avatares y portadas de canciones (almacenamiento público).
//   media-src   'self' data: blob:            el WAV de silencio del reproductor (data:) · SUPABASE: el audio propio (URL firmada, 60 min).
//   connect-src 'self' SUPABASE               /api/* y auth/datos de Supabase · la descarga del PDF (URL firmada, 5 min) con fetch.
//   frame-src   https://www.youtube-nocookie.com   el video incrustado de la canción (lib/youtube.ts → urlEmbebida).
//   worker-src  'self'                        el worker de PDF.js (/pdfjs/pdf.worker.*.mjs) y el service worker de las notificaciones (/sw.js).
//   manifest-src 'self'                       /manifest.json (PWA).
//   object-src 'none' · base-uri 'self' · form-action 'self' · frame-ancestors 'self'     cierres sin uso en el portal.
const cspPortal = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://i.ytimg.com ${SUPABASE}`,
  `media-src 'self' data: blob: ${SUPABASE}`,
  `connect-src 'self' ${SUPABASE}`,
  'frame-src https://www.youtube-nocookie.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const nextConfig = {
  async headers() {
    return [
      // Todo el sitio: la referencia de origen la pide YouTube (sin ella el video incrustado falla con «error 153»). Es el valor por defecto de los
      // navegadores, pero se fija explícito para no depender de ellos. Es coherente con el `referrerPolicy` del iframe (YouTubeAudio.tsx).
      { source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }] },
      // Solo el portal, y SOLO en modo informe: nunca `Content-Security-Policy` (bloqueante) hasta revisar las infracciones.
      { source: '/portal/:path*', headers: [{ key: 'Content-Security-Policy-Report-Only', value: cspPortal }] },
      // Worker de pdf.js (punto 55): lleva la versión en el nombre (lo copia scripts/copy-pdfjs-worker.js), así que su contenido nunca cambia.
      { source: '/pdfjs/pdf.worker.:version.min.mjs', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ]
  },
}
module.exports = nextConfig
