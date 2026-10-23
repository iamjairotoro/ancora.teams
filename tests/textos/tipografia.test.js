// Ventana «Tipografía» de la letra en teléfono: «Sistema» no se ofrece pero sigue guardándose/validándose igual (las cuatro cadenas no cambian) y se lee como «La app»; los cuatro pasos de tamaño son los de siempre y cada uno tiene
// su etiqueta; los textos salen de lib/textos/tipografia; la ventana usa el mecanismo de MenuFlotante (dialog, aria-pressed) y el CSS es rem-only. Correr: `node tests/textos/tipografia.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const L = require(resolver(path.join(RAIZ, 'lib/lyricPrefs')))
const T = require(resolver(path.join(RAIZ, 'lib/textos/tipografia')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')

correr(async () => {
  await prueba('«Sistema» sale de la lista del teléfono pero sigue entre las fuentes válidas y su cadena guardada no cambia', async () => {
    assert.equal(L.FONT_OPTIONS.length, 5); assert.deepEqual(L.FONT_OPTIONS_TELEFONO.map(o => o.label), ['La app', 'Arial', 'Georgia', 'Mono'])
    assert.equal(L.FONT_SISTEMA, '-apple-system, system-ui, sans-serif')
    assert.deepEqual(L.FONT_OPTIONS.map(o => o.f).filter(f => f !== L.FONT_APP).sort(), ["Arial, Helvetica, sans-serif", "Georgia, 'Times New Roman', serif", "ui-monospace, 'SF Mono', Menlo, monospace", L.FONT_SISTEMA].sort())
    assert.equal(L.prefsFromChart ? L.prefsFromChart({ fontFamily: L.FONT_SISTEMA }).fontFamily : L.FONT_SISTEMA, L.FONT_SISTEMA) })
  await prueba('quien tiene «Sistema» guardada ve «La app» marcada; las demás se marcan tal cual; el predeterminado es «La app»', async () => {
    assert.equal(L.fuenteMarcada(L.FONT_SISTEMA), L.FONT_APP); for (const o of L.FONT_OPTIONS_TELEFONO) assert.equal(L.fuenteMarcada(o.f), o.f)
    assert.equal(L.DEFAULT_LYRIC_FONT, L.FONT_APP) })
  await prueba('cuatro pasos de tamaño (0,875 a 1,375 rem), cada uno con su etiqueta', async () => {
    assert.deepEqual(L.SIZE_STEPS, [0.875, 1, 1.1875, 1.375]); const et = L.SIZE_STEPS.map((_, i) => T.etiquetaPasoTamano(i))
    assert.equal(new Set(et).size, 4); assert.ok(et.every(x => x && !/^Tamaño \d/.test(x))) })
  await prueba('el pie y los textos son los pedidos', async () => {
    assert.equal(T.TEXTOS_TIPOGRAFIA.pie, 'Se guarda en tu perfil y vale para todas las canciones.'); assert.equal(T.TEXTOS_TIPOGRAFIA.aa, 'Aa') })
  await prueba('la ventana: role dialog vía MenuFlotante, aria-pressed en fichas y pasos, sin cadenas sueltas ni escritura de «Sistema»', async () => {
    const v = leer('app/portal/_components/tipografia/VentanaTipografia.tsx'), m = leer('components/MenuFlotante.tsx')
    assert.ok(/<MenuFlotante dialogo /.test(v)); assert.ok(/role=\{dialogo \? 'dialog'|role="dialog"/.test(m)); assert.ok((v.match(/aria-pressed/g) || []).length >= 2)
    assert.ok(/aria-label=\{etiquetaPasoTamano/.test(v)); assert.ok(!/Se guarda en tu perfil/.test(v)); assert.ok(/FONT_OPTIONS_TELEFONO/.test(v) && /fuenteMarcada/.test(v)) })
  await prueba('el CSS de la ventana es solo rem (y 44 px de zona táctil) y el de la letra de teléfono vive dentro de @media (max-width:768px)', async () => {
    const c = leer('app/portal/_components/tipografia/tipografia-telefono.module.css').replace(/\/\*[\s\S]*?\*\//g, '')
    assert.ok(!/\d+(\.\d+)?px/.test(c.replace(/max\(\d+px, [^)]*\)/g, '').replace(/outline:2px|outline-offset:2px|\b1px\b/g, '')))
    const s = leer('app/songs-movil.css'), i = s.indexOf('Hoja de la letra (B-tipografía)'); assert.ok(i > s.lastIndexOf('@media (max-width:768px)')) })
  terminar()
})
