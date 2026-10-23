// Fuente única (bloque B1): la letra de la app es la del body; «La app» es una opción más de la tipografía de la letra (y la predeterminada solo para quien no eligió); las cuatro cadenas de siempre no cambian; en teléfono el admin usa la del body.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { FONT_APP, FONT_OPTIONS, DEFAULT_LYRIC_FONT, lyricPrefsFrom, chartPrefsAdminFrom, parseChartPrefsPatch } = require(resolver(path.join(RAIZ, 'lib/lyricPrefs')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const VIEJAS = ['Arial, Helvetica, sans-serif', "Georgia, 'Times New Roman', serif", '-apple-system, system-ui, sans-serif', "ui-monospace, 'SF Mono', Menlo, monospace"]
correr(async () => {
  await prueba('«La app» usa la misma pila que el body de globals.css', async () => {
    const body = leer('app/globals.css').match(/body \{\s*font-family: ([^;]+);/)[1].replace(/\s+/g, ' '); assert.equal(FONT_APP.replace(/\s+/g, ' '), body) })
  await prueba('las cuatro cadenas de siempre siguen en la lista, sin cambios, y «La app» es la quinta opción', async () => {
    assert.equal(FONT_OPTIONS.length, 5); for (const v of VIEJAS) assert.ok(FONT_OPTIONS.some(o => o.f === v), 'falta ' + v); assert.deepEqual(FONT_OPTIONS.find(o => o.f === FONT_APP), { f: FONT_APP, label: 'La app', sub: 'La misma letra de la app' }) })
  await prueba('predeterminada solo para quien no eligió: sin preferencia → La app; quien guardó Arial (u otra de las viejas) la conserva; un valor desconocido vuelve a La app', async () => {
    assert.equal(DEFAULT_LYRIC_FONT, FONT_APP); assert.equal(lyricPrefsFrom(null).fontFamily, FONT_APP); assert.equal(lyricPrefsFrom({}).fontFamily, FONT_APP); assert.equal(chartPrefsAdminFrom(undefined).fontFamily, FONT_APP)
    for (const v of VIEJAS) assert.equal(lyricPrefsFrom({ fontFamily: v }).fontFamily, v); assert.equal(lyricPrefsFrom({ fontFamily: 'Comic Sans' }).fontFamily, FONT_APP) })
  await prueba('el servidor acepta guardar «La app» y las viejas; rechaza cualquier otra cadena', async () => {
    for (const v of [FONT_APP, ...VIEJAS]) assert.deepEqual(parseChartPrefsPatch({ fontFamily: v }), { fontFamily: v }); assert.equal(parseChartPrefsPatch({ fontFamily: 'Comic Sans' }), null) })
  await prueba('el admin usa la letra de la app solo en teléfono (escritorio conserva la suya); el panel de canciones parte de la predeterminada', async () => {
    assert.ok(/fontFamily: telefono===true \? FONT_APP : '-apple-system,BlinkMacSystemFont/.test(leer('app/admin/page.tsx'))); assert.ok(/fontFamily: DEFAULT_LYRIC_FONT, lineHeightWide: false/.test(leer('components/canciones/CancionesPanel.tsx'))) })
  await prueba('Personas y Equipos dejan Plus Jakarta en teléfono (usan la letra del body) y la conservan en escritorio', async () => {
    const p = leer('components/PersonasPanel.tsx'), t = leer('components/TeamsAdminPanel.tsx')
    assert.ok(/<div style=\{telefono === true \? undefined : rootStyle\}>/.test(p)); assert.ok(/const rootStyle: React\.CSSProperties = telefonoYa \? \{\} : \{ fontFamily:'var\(--font-jakarta\)/.test(t)); assert.ok(/const rootStyle: React\.CSSProperties = \{ fontFamily: 'var\(--font-jakarta\)/.test(p), 'escritorio: igual que antes') })
  terminar()
})
