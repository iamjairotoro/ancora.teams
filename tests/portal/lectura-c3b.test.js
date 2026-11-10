// Etapa C3b: la hoja «Preferencias» de la lectura (vista, notación, fuente, detalles, vista compacta) y su efecto en la pantalla. Datos inventados; sin red. Correr: `node tests/portal/lectura-c3b.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const L = require(path.join(RAIZ, 'lib/lyricPrefs.ts')), { TEXTOS_ACORDES: T } = require(path.join(RAIZ, 'lib/textos/acordesLectura.ts'))
const Hoja = require(path.join(RAIZ, 'app/portal/_components/lectura/HojaPreferencias.tsx')).default, Acordes = require(path.join(RAIZ, 'components/canciones/HojaAcordes.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const TIPO = { prefs: { fontFamily: 'serif', textScale: 1, lineHeightWide: false }, elegir() {}, errPrefs: false }
const dibujar = (prefs = {}, extra = {}) => R(h(Hoja, { prefs: { ...L.DEFAULT_LECTURA_PREFS, ...prefs }, onPrefs() {}, errPrefs: false, tipografia: TIPO, onCerrar() {}, ...extra }))

correr(async () => {
  await prueba('las preferencias de lectura traen «detalles» (true por omisión); solo el valor false lo apaga; lo raro vuelve a true; el parche lo acepta solo como booleano', () => {
    assert.deepEqual(L.DEFAULT_LECTURA_PREFS, { notation: 'americano', vista: 'ambos', compacta: false, detalles: true })
    assert.equal(L.lecturaPrefsFrom({ lectura: { detalles: false } }).detalles, false); for (const x of [true, 'no', 0, null, undefined, {}]) assert.equal(L.lecturaPrefsFrom({ lectura: { detalles: x } }).detalles, true, String(x))
    assert.deepEqual(L.parseLecturaPatch({ detalles: false }), { detalles: false }); for (const x of ['no', 0, null, 1, {}]) assert.equal(L.parseLecturaPatch({ detalles: x }), null, String(x))
    assert.equal(L.parseLecturaPatch({ detalles: true, extra: 1 }), null, 'ninguna llave de más')
  })
  await prueba('hoja Preferencias: Vista de canción (Ambos, Acordes, Letras; la elegida marcada), Notación, «Fuente y tamaño», «Detalles de la canción», «Vista compacta» con su ayuda; NO hay «Exportar canción»', () => {
    const html = dibujar({ vista: 'acordes' })
    assert.ok(html.includes('role="dialog"') && html.includes('>Preferencias<'))
    assert.deepEqual([...html.matchAll(/role="radio" aria-checked="(\w+)">([^<]+)</g)].map(m => [m[2], m[1]]), [['Ambos', 'false'], ['Acordes', 'true'], ['Letras', 'false']])
    for (const t of ['Vista de canción', 'Fuente y tamaño', 'Detalles de la canción', 'Vista compacta', 'Las secciones se muestran seguidas, sin separar cada una.', 'Opciones de visualización']) assert.ok(html.includes(t), t)
    assert.ok(!/Exportar/i.test(html), 'Exportar no existe todavía')
    assert.deepEqual([...html.matchAll(/role="switch" aria-checked="(\w+)"/g)].map(m => m[1]), ['true', 'false'], 'detalles encendido y compacta apagada por omisión')
    assert.ok(html.includes('aria-describedby="prefs-compacta-d"') && html.includes('id="prefs-compacta-d"'), 'la ayuda de la vista compacta se anuncia')
  })
  await prueba('notación: un selector nativo con Americano y Números, el valor actual elegido y 16 px de letra (sin zoom en el iPhone)', () => {
    const num = dibujar({ notation: 'numeros' }), am = dibujar({})
    assert.ok(/<option value="numeros" selected/.test(num) && /<option value="americano" selected/.test(am)); assert.ok(num.includes('>Números<') && am.includes('>Americano<')); assert.ok(/aria-label="Notación de los acordes"/.test(am))
    assert.ok(/\.selector select\{[^}]*font-size:16px/.test(leer('app/portal/_components/lectura/hoja-preferencias.module.css')))
  })
  await prueba('interruptores: toda la fila es el botón (role=switch), y vista compacta y detalles reflejan sus valores', () => {
    const html = dibujar({ detalles: false, compacta: true }); assert.deepEqual([...html.matchAll(/role="switch" aria-checked="(\w+)"/g)].map(m => m[1]), ['false', 'true'])
    for (const m of html.matchAll(/<button[^>]*role="switch"[^>]*>(.*?)<\/button>/g)) assert.ok(/class="[^"]*fila/.test(m[0]) && m[1].includes('pista'), 'la fila lleva la pista dentro')
    const css = leer('app/portal/_components/lectura/hoja-preferencias.module.css'); assert.ok(/\.fila\{[^}]*min-height:max\(44px, 3\.25rem\)/.test(css) && /\.seg button\{[^}]*min-height:max\(44px, 2\.75rem\)/.test(css))
  })
  await prueba('en la lectura nueva la notación ya no está en la hoja de acordes (vive en Preferencias); la hoja de C1 sin c3 la conserva', () => {
    const A = (g) => ({ g, cal: '' }), hoja = { tono: 'G', secciones: [{ code: 'V1', name: 'Verso 1', repeat: 1, lineas: [{ kind: 'lyric', segments: [{ text: 'una línea', acorde: A(1) }] }] }] }
    const base = { title: 'T', hoja, prefs: L.DEFAULT_LECTURA_PREFS, onPrefs() {}, typography: TIPO.prefs }
    const c3 = R(h(Acordes, { ...base, c3: { tonoLocal: null, onTonoLocal() {} } })), c1 = R(h(Acordes, base))
    assert.ok(!c3.includes('>ABC<') && !c3.includes('>123<') && !c3.includes('lectura-tono') && !c3.includes('<select')); assert.ok(c1.includes('>ABC<') && c1.includes('>123<'))
    const compacta = R(h(Acordes, { ...base, prefs: { ...L.DEFAULT_LECTURA_PREFS, compacta: true }, c3: { tonoLocal: null, onTonoLocal() {} } })); assert.ok(compacta.includes('compactaC3') && compacta.includes('class="compacta'))
    for (const [vista, clase] of [['acordes', 'soloAcordes'], ['letras', 'soloLetras']]) assert.ok(R(h(Acordes, { ...base, prefs: { ...L.DEFAULT_LECTURA_PREFS, vista }, c3: { tonoLocal: null, onTonoLocal() {} } })).includes(clase), vista)
  })
  await prueba('pantalla: Ajustes abre la hoja de Preferencias, «detalles» oculta la cabecera, y CancionPortal no hace la lectura de preferencias por su cuenta (revisión del código fuente)', () => {
    const l = leer('app/portal/_components/lectura/LecturaCancion.tsx'), b = leer('app/portal/_components/lectura/BarraCancion.tsx')
    assert.ok(l.includes('{prefs.detalles && <CabeceraCancion') && l.includes('<HojaPreferencias') && l.includes('onAjustes={() => setPrefsAbiertas(true)}')); assert.ok(!/VentanaTipografia/.test(b), 'la barra ya no abre la ventana de tipografía: abre Preferencias')
    assert.ok(!/useLecturaAcordes/.test(leer('app/portal/_components/CancionPortal.tsx')))
  })
  await prueba('CSS de la hoja: tokens de la app, sin colores fijos, tamaños en rem salvo las zonas táctiles; vista compacta con reglas propias de la lectura nueva', () => {
    const css = leer('app/portal/_components/lectura/hoja-preferencias.module.css'), c3 = leer('components/canciones/lectura/hoja-c3.module.css')
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css)); assert.deepEqual([...css.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)].filter(m => ![44, 16].includes(parseFloat(m[1])) && parseFloat(m[1]) > 2).map(m => m[0]), [])
    assert.ok(/\.compactaC3 \.tarjeta\{/.test(c3) && /\.compactaC3 > section\{/.test(c3))
  })
  terminar()
})
