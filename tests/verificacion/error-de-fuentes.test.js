// verificar.sh repite UNA sola vez el `next build`, y solo si el fallo es la descarga de Google Fonts de next/font. Esta prueba ejercita scripts/verificacion/es-error-de-fuentes.sh con registros de ejemplo:
// el error real (el que vimos) se reconoce; cualquier otro error del build (de tipos, módulo que falta, sintaxis, otra falla de next/font, o solo el encabezado) NO, y por eso falla a la primera. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, RAIZ } = require('../portal/_banco')
const { spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path')
const SCRIPT = path.join(RAIZ, 'scripts/verificacion/es-error-de-fuentes.sh')
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fuentes-'))
const esFuentes = texto => { const f = path.join(dir, 'registro.txt'); fs.writeFileSync(f, texto); return spawnSync('bash', [SCRIPT, f]).status === 0 }
const REAL = "app/layout.tsx\nAn error occurred in `next/font`.\n\nTypeError: Cannot read properties of null (reading '1')\n    at /x/node_modules/next/dist/compiled/@next/font/dist/google/loader.js:112:78\n    at async Promise.all (index 1)\n\n> Build failed because of webpack errors\n"
correr(async () => {
  await prueba('el error real de la descarga de Google Fonts se reconoce (y también el «Failed to fetch … from Google Fonts»)', async () => {
    assert.equal(esFuentes(REAL), true)
    assert.equal(esFuentes("app/layout.tsx\nAn error occurred in `next/font`.\n\nFailed to fetch `Inter` from Google Fonts.\n\n> Build failed because of webpack errors\n"), true)
  })
  await prueba('cualquier OTRO error del build NO se reconoce: falla a la primera', async () => {
    for (const [nombre, t] of Object.entries({
      'de tipos': 'Failed to compile.\n\n./app/page.tsx:3:5\nType error: Property \'x\' does not exist on type \'Y\'.\n',
      'módulo que falta': "Failed to compile.\n\n./app/page.tsx\nModule not found: Can't resolve '@/lib/noexiste'\n",
      'sintaxis': 'Failed to compile.\n\n./app/page.tsx\nSyntax error: Unexpected token (3:1)\n',
      'otra falla de next/font (fuente local)': "app/layout.tsx\nAn error occurred in `next/font`.\n\nError: Font file not found at ./fuentes/Inter.woff2\n",
      'solo el encabezado': "app/layout.tsx\nAn error occurred in `next/font`.\n",
      'solo la marca del cargador, sin el encabezado': 'TypeError at /x/@next/font/dist/google/loader.js:112:78\n',
      'la fuente y además un error real': REAL + "\n./app/page.tsx:3:5\nType error: Property 'x' does not exist on type 'Y'.\n",
      'vacío': '',
    })) assert.equal(esFuentes(t), false, nombre)
    assert.equal(spawnSync('bash', [SCRIPT, path.join(dir, 'no-existe.txt')]).status, 1, 'sin registro')
  })
  await prueba('verificar.sh reintenta UNA vez y solo por esa razón: hay un único «reintento 1 de 1» y el segundo fallo se informa como fallo', async () => {
    const c = fs.readFileSync(path.join(RAIZ, 'scripts/verificacion/verificar.sh'), 'utf8')
    assert.equal((c.match(/reintento 1 de 1/g) || []).length, 1); assert.equal((c.match(/es-error-de-fuentes\.sh/g) || []).length >= 1, true); assert.equal((c.match(/construir\b/g) || []).length >= 3, true)
    assert.ok(/BUILD FALLÓ \(también en el reintento\)/.test(c) && /else echo "BUILD FALLÓ"/.test(c), 'cualquier otro error: falla a la primera')
  })
  fs.rmSync(dir, { recursive: true, force: true })
  terminar()
})
