// Copia el worker de pdf.js (build LEGACY) a public/pdfjs/ con la VERSIÓN en el nombre (punto 55, commit 3), más su licencia.
// Lo corre `prebuild` y `predev`. Por qué no se importa desde el código con new URL(..., import.meta.url): Next lo emite como asset y
// su minificador de producción intenta procesarlo como script y falla («import.meta cannot be used outside of module code»). Los
// archivos de `public/` no se tocan, salen del propio dominio y la versión en el nombre garantiza que la librería y el worker
// coincidan (VisorPdf.tsx arma la ruta con pdfjs.version) y permite caché larga. public/pdfjs/ NO se versiona (está en .gitignore).
const fs = require('fs')
const path = require('path')

const raiz = path.join(__dirname, '..')
const pkgDir = path.join(raiz, 'node_modules', 'pdfjs-dist')
const destino = path.join(raiz, 'public', 'pdfjs')

if (!fs.existsSync(pkgDir)) { console.error('copy-pdfjs-worker: falta node_modules/pdfjs-dist (corré npm install).'); process.exit(1) }
const { version } = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const origen = path.join(pkgDir, 'legacy', 'build', 'pdf.worker.min.mjs')
if (!fs.existsSync(origen)) { console.error('copy-pdfjs-worker: no existe ' + origen); process.exit(1) }

fs.mkdirSync(destino, { recursive: true })
const nombre = `pdf.worker.${version}.min.mjs`
for (const f of fs.readdirSync(destino)) if (/^pdf\.worker\..+\.min\.mjs$/.test(f) && f !== nombre) fs.unlinkSync(path.join(destino, f))   // versiones viejas
fs.copyFileSync(origen, path.join(destino, nombre))
fs.copyFileSync(path.join(pkgDir, 'LICENSE'), path.join(destino, 'LICENSE-pdfjs.txt'))                                                        // Apache-2.0
console.log(`copy-pdfjs-worker: public/pdfjs/${nombre} (${Math.round(fs.statSync(path.join(destino, nombre)).size / 1024)} KB)`)
