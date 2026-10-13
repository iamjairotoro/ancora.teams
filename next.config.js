/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // Worker de pdf.js (punto 55): lleva la versión en el nombre (lo copia scripts/copy-pdfjs-worker.js), así que su contenido nunca cambia.
      { source: '/pdfjs/pdf.worker.:version.min.mjs', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ]
  },
}
module.exports = nextConfig
