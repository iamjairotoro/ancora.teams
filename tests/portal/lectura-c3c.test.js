// Etapa C3c: la pantalla «Ajustes de fuente» (vista previa, tamaño, fuente) dentro de la hoja Preferencias. Datos inventados; sin red. Correr: `node tests/portal/lectura-c3c.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const L = require(path.join(RAIZ, 'lib/lyricPrefs.ts')), { TEXTOS_ACORDES: T } = require(path.join(RAIZ, 'lib/textos/acordesLectura.ts'))
const PF = require(path.join(RAIZ, 'app/portal/_components/lectura/PantallaFuente.tsx')), Pantalla = PF.default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const tip = (o = {}) => ({ prefs: { ...L.DEFAULT_LYRIC_PREFS, ...o }, elegir() {}, errPrefs: false })
const dibujar = (o, extra = {}) => R(h(Pantalla, { tipografia: { ...tip(o), ...extra } }))

correr(async () => {
  await prueba('el tamaño se muestra en px: los cuatro pasos de siempre son 14, 16, 19 y 22 px', () => {
    assert.deepEqual(L.SIZE_STEPS.map(PF.pxDelPaso), [14, 16, 19, 22])
    for (const [i, e] of L.SIZE_STEPS.entries()) assert.ok(dibujar({ textScale: e }).includes(`${[14, 16, 19, 22][i]} px`), 'paso ' + i)
  })
  await prueba('los botones «−» y «+» se apagan en los extremos y avanzan de paso en paso; un tamaño raro guardado se muestra como el primero sin romper', () => {
    const dis = html => [...html.matchAll(/<button[^>]*aria-label="(Reducir tamaño|Aumentar tamaño)"([^>]*)>/g)].map(m => [m[1], /disabled/.test(m[2] + m[0])])
    assert.deepEqual(dis(dibujar({ textScale: L.SIZE_STEPS[0] })), [['Reducir tamaño', true], ['Aumentar tamaño', false]])
    assert.deepEqual(dis(dibujar({ textScale: L.SIZE_STEPS[1] })), [['Reducir tamaño', false], ['Aumentar tamaño', false]])
    assert.deepEqual(dis(dibujar({ textScale: L.SIZE_STEPS[3] })), [['Reducir tamaño', false], ['Aumentar tamaño', true]])
    assert.ok(dibujar({ textScale: 7 }).includes('14 px'))
    const pedidos = []; const e = { elegir: p => pedidos.push(p) }
    const f = R(h(Pantalla, { tipografia: { ...tip({ textScale: L.SIZE_STEPS[1] }), ...e } })); assert.ok(f.includes('aria-label="Reducir tamaño"') && f.includes('aria-label="Aumentar tamaño"'))
  })
  await prueba('la fuente: un selector con La app, Arial, Georgia y Mono (sin «Sistema»); «Sistema» guardada se muestra como «La app»; 16 px de letra en el selector', () => {
    const html = dibujar({ fontFamily: L.FONT_OPTIONS[2].f })
    assert.deepEqual([...html.matchAll(/<option value="[^"]*"[^>]*>([^<]+)</g)].map(m => m[1]), ['La app', 'Arial', 'Georgia', 'Mono'])
    assert.ok(/<option value="[^"]*Georgia[^"]*" selected/.test(html)); assert.ok(html.includes('aria-label="Fuente"'))
    assert.ok(/<option value="[^"]*ui-rounded[^"]*" selected/.test(dibujar({ fontFamily: L.FONT_SISTEMA })), '«Sistema» se muestra como «La app»')
    assert.ok(/\.selector select\{[^}]*font-size:16px/.test(leer('app/portal/_components/lectura/pantalla-fuente.module.css')))
  })
  await prueba('vista previa: usa las MISMAS variables de la lectura (fuente, tamaño dividido por --esc, interlineado), es decorativa (aria-hidden) y no trae letra de ninguna canción', () => {
    const html = dibujar({ fontFamily: L.FONT_OPTIONS[1].f, textScale: 1.1875, lineHeightWide: true })
    assert.ok(html.includes('--anc-letra-font:Arial, Helvetica, sans-serif') && html.includes('--anc-letra-size:calc(1.1875rem / var(--esc, 1))') && html.includes('--anc-letra-lh:1.9'))
    assert.ok(/class="[^"]*previa[^"]*"[^>]*aria-hidden="true"/.test(html) || /aria-hidden="true"[^>]*class="[^"]*previa/.test(html)); assert.ok(html.replace(/<[^>]+>/g, '').includes('primera línea de la letra'))
    for (const x of ['A', 'E', 'F#m']) assert.ok(html.includes('>' + x + '<'), 'acorde ' + x)
  })
  await prueba('sin pesos ni colores (se dejaron fuera a propósito), con el pie y el aviso de error', () => {
    const html = dibujar({}); assert.ok(!/Negrita|Regular|Color de/.test(html)); assert.ok(html.includes('Se guarda en tu perfil y vale para todas las canciones.'))
    assert.ok(!html.includes('role="status">No se pudo guardar')); assert.ok(R(h(Pantalla, { tipografia: { ...tip(), errPrefs: true } })).includes('No se pudo guardar tu preferencia'))
  })
  await prueba('la hoja Preferencias: «Fuente y tamaño» abre la pantalla dentro de la misma hoja (con flecha para volver), ya no la ventana flotante de tipografía', () => {
    const f = leer('app/portal/_components/lectura/HojaPreferencias.tsx')
    assert.ok(!/VentanaTipografia/.test(f) && f.includes('<PantallaFuente tipografia={tipografia} />') && f.includes('onClick={() => setFuente(true)}') && f.includes('aria-label={T.volverAPrefs}') && f.includes('onClick={() => setFuente(false)}'))
    assert.ok(f.includes('T.fuenteTitulo') && T.fuenteTitulo === 'Ajustes de fuente')
  })
  await prueba('CSS: tokens de la app, sin colores fijos, rem salvo las zonas táctiles (botones de 44 px)', () => {
    const css = leer('app/portal/_components/lectura/pantalla-fuente.module.css')
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css)); assert.deepEqual([...css.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)].filter(m => ![44, 16].includes(parseFloat(m[1])) && parseFloat(m[1]) > 2).map(m => m[0]), [])
    assert.ok(/\.paso\{[^}]*width:max\(44px, 2\.75rem\)[^}]*height:max\(44px, 2\.75rem\)/.test(css)); assert.ok(/\.previa\{[^}]*font-family:var\(--anc-letra-font\)[^}]*font-size:var\(--anc-letra-size\)/.test(css))
  })
  terminar()
})
