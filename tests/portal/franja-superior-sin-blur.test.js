// La franja de arriba (bajo la hora y la batería) en teléfono es del color de la pantalla y sin desenfoque: lo que se desplaza por debajo se tapa limpio. La comprobación en navegador real (color idéntico al fondo, claro y oscuro, y que
// ningún elemento con desenfoque quede en los 160 px de arriba) se hizo con WebKit; esta prueba vigila el CSS. El vidrio de la lente y de la píldora del menú inferior es intencional y no se toca.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('franja superior en teléfono: color sólido, sin desenfoque')
const app = sinCom(leer('components/app.module.css')), songs = sinCom(leer('app/songs-movil.css')), nav = sinCom(leer('app/portal/_components/portal-nav.module.css'))
t('cabecera del admin y del líder (.top): en teléfono fondo var(--anc-bg) y backdrop-filter none (el escritorio conserva su vidrio)', () => {
  const tel = app.slice(app.lastIndexOf('@media (max-width:768px)')), desk = app.slice(0, app.lastIndexOf('@media (max-width:768px)'))
  assert.match(tel, /\.top\{ background:var\(--anc-bg\); -webkit-backdrop-filter:none; backdrop-filter:none; \}/)
  assert.match(desk, /\.top\{[^}]*backdrop-filter:blur\(20px\) saturate\(180%\)/) })
t('barras pegadas arriba del detalle de canción (.anc-chartBar y .anc-arrBox): en teléfono sólidas y sin desenfoque', () => {
  assert.equal((songs.match(/@media/g) || []).length, 1, 'songs-movil.css es un solo bloque de teléfono'); assert.match(songs, /\.anc \.anc-chartBar, \.anc \.anc-arrBox\{ background:var\(--anc-bg\); -webkit-backdrop-filter:none; backdrop-filter:none; \}\s*\}\s*$/) })
t('franja del portal (.statusFade): sigue sólida, del color de la pantalla y sin filtro', () => {
  const m = /\.statusFade\{([^}]*)\}/.exec(nav); assert.ok(m); assert.match(m[1], /background:var\(--anc-bg\)/); assert.doesNotMatch(m[1], /filter/) })
console.log(`${n} comprobaciones OK`)
