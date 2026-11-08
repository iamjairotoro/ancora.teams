// Editor móvil v2, E1 (carril, «+», ‹ ›, panel fijo y «Siguiente palabra»): las reglas puras (lib/editorAcordes.ts) y lo que dibuja la pantalla. El comportamiento táctil se prueba en un navegador real: tests/e2e-menus/editor-v2-carril.js
// Correr: `node tests/portal/editor-v2-carril.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const Module = require('module'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const G = { g: 1, cal: '' }, D = { g: 5, cal: '' }
const TEXTO = 'VERSO 1:\nAquí va la primera\nOtra línea\n\nCORO:\nCoro uno\n\nINTERLUDIO:\n(instrumental)'
const doc = (anclas = []) => ({ ...E.docVacio(TEXTO), anclas })
const L = txt => TEXTO.indexOf(txt)

correr(async () => {
  await prueba('iniciosDePalabra: el inicio de cada palabra, sin contar los espacios, como índice del texto completo', () => {
    const l = E.estructura(TEXTO).lineas.find(x => x.txt === 'Aquí va la primera')
    assert.deepEqual(E.iniciosDePalabra(l).map(i => TEXTO.slice(i).split(' ')[0].split('\n')[0]), ['Aquí', 'va', 'la', 'primera'])
    assert.deepEqual(E.iniciosDePalabra({ ini: 10, txt: '  dos   palabras ' }), [12, 18])
    assert.deepEqual(E.iniciosDePalabra({ ini: 0, txt: '' }), [])
  })
  await prueba('palabraEn: la palabra donde está el ancla (su final cuenta); null en un espacio suelto, un encabezado o «(instrumental)»', () => {
    const d = doc(), p = L('primera')
    assert.equal(E.palabraEn(d, p), 'primera'); assert.equal(E.palabraEn(d, p + 3), 'primera'); assert.equal(E.palabraEn(d, p + 'primera'.length), 'primera')
    assert.equal(E.palabraEn(d, L('Aquí va') + 'Aquí'.length + 0), 'Aquí', 'el final de «Aquí» sigue siendo «Aquí»')
    assert.equal(E.palabraEn(E.docVacio('a  b'), 2), null, 'dos espacios seguidos: el lugar del medio no es palabra')
    assert.equal(E.palabraEn(d, 2), null, 'sobre el encabezado'); assert.equal(E.palabraEn(d, L('(instrumental)') + 2), null)
  })
  await prueba('siguientePalabra: avanza por la línea, salta a la primera palabra de la línea siguiente y se salta encabezados, líneas vacías e «(instrumental)»; null al final', () => {
    const d = doc(), a = L('Aquí')
    assert.equal(E.siguientePalabra(d, a), L('va la'), 'dentro de la línea')
    assert.equal(E.siguientePalabra(d, a + 2), L('va la'), 'desde mitad de palabra va a la siguiente palabra')
    assert.equal(E.siguientePalabra(d, L('primera')), L('Otra'), 'al final de la línea pasa a la siguiente')
    assert.equal(E.siguientePalabra(d, L('Otra línea') + 5), L('Coro uno'), 'salta línea vacía y encabezado de otra sección')
    assert.equal(E.siguientePalabra(d, L('Coro uno') + 5), null, 'después de la última palabra con letra no hay más (el «(instrumental)» no acepta acordes)')
    assert.equal(E.siguientePalabra(E.docVacio('hola'), 4), null)
  })
  await prueba('moverAcorde: ‹ › mueven el acorde una letra; no se sale de su línea ni pisa a otro acorde; sin acorde no hace nada; el resultado es un documento nuevo y las anclas siguen en orden', () => {
    const p = L('va la'), d = doc([{ at: p, acorde: G }, { at: p + 3, acorde: D }])
    const r = E.moverAcorde(d, p, 1); assert.ok(r && r !== d); assert.deepEqual(r.anclas.map(a => a.at), [p + 1, p + 3]); assert.deepEqual(d.anclas.map(a => a.at), [p, p + 3], 'no cambia el original')
    assert.deepEqual(E.moverAcorde(d, p, -1).anclas.map(a => a.at), [p - 1, p + 3])
    assert.equal(E.moverAcorde(doc([{ at: p, acorde: G }, { at: p + 1, acorde: D }]), p, 1), null, 'no pisa al vecino')
    const ini = L('Aquí'); assert.equal(E.moverAcorde(doc([{ at: ini, acorde: G }]), ini, -1), null, 'no pasa al inicio de otra línea')
    const fin = L('primera') + 'primera'.length; assert.equal(E.moverAcorde(doc([{ at: fin, acorde: G }]), fin, 1), null, 'no pasa de su línea')
    assert.equal(E.moverAcorde(d, p + 1, 1), null, 'sin acorde en ese lugar')
    const x = E.moverAcorde(doc([{ at: p, acorde: { ...G, cal: 'm7', bajo: { g: 5 } } }]), p, 1); assert.deepEqual(x.anclas[0].acorde, { ...G, cal: 'm7', bajo: { g: 5 } }, 'el acorde viaja entero')
    const s = E.aSecciones(x); assert.equal(s[0].lineas[0].segments.length, 2, 'y se guarda en su nueva letra')
  })
  await prueba('pantalla: el «+» sale solo en la línea activa, sobre cada palabra; el panel muestra el acorde, «sobre «palabra»», Mover ‹ ›, los 7 acordes, modificadores, «Quitar acorde» y «Siguiente palabra ›»', () => {
    const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
    const Paleta = require(path.join(RAIZ, 'components/canciones/PaletaAcordes.tsx')).default, base = { tono: 'G', actual: null, onElegir() {}, onCerrar() {} }
    const h = renderToStaticMarkup(React.createElement(Paleta, { ...base, actual: D, palabra: 'primera', onQuitar() {}, onMover() {}, onSiguiente() {} }))
    assert.ok(h.includes('<b>D</b>') && h.includes('sobre «primera»') && h.includes('>Mover<') && h.includes('aria-label="‹"') && h.includes('aria-label="›"'))
    assert.ok(h.includes('>Quitar acorde<') && h.includes('>Siguiente palabra ›<'))
    for (const m of ['m', '7', 'maj7', 'sus4', 'add9']) assert.ok(h.includes(`>${m}</button>`), m); assert.ok(h.includes('>/ bajo<'))
    const sin = renderToStaticMarkup(React.createElement(Paleta, { ...base, onQuitar() {} })); assert.ok(sin.includes('Elige el acorde') && sin.includes('en este lugar') && !sin.includes('Siguiente palabra') && !sin.includes('>Mover<'), 'sin handlers no hay Mover ni Siguiente')
    assert.ok(/<button[^>]*disabled=""[^>]*>Quitar acorde<\/button>/.test(sin), '«Quitar acorde» desactivado sin acorde')
    const ModoAcordes = require(path.join(RAIZ, 'components/canciones/ModoAcordes.tsx')).default
    const m = renderToStaticMarkup(React.createElement(ModoAcordes, { doc: doc([{ at: L('Coro uno'), acorde: G }]), tono: 'G', onCambio() {} }))
    assert.ok(!m.includes('data-mas='), 'sin nada elegido no hay «+» en ninguna línea (solo se dibuja en la línea activa)')
  })
  await prueba('fuente: el «+» y el panel usan el módulo compartido sin tocarlo (LineaConAcordes y palabrasConAcordes igual que en main); el panel es fijo abajo y sus botones miden 44 px o más; sin peticiones ni «en vivo»', () => {
    if (fs.existsSync(path.join(RAIZ, '.git'))) for (const f of ['components/canciones/LineaConAcordes.tsx', 'lib/palabrasConAcordes.ts', 'components/canciones/linea-con-acordes.module.css', 'components/canciones/HojaAcordes.tsx', 'components/canciones/hoja-acordes.module.css']) {
      const dif = require('child_process').spawnSync('git', ['diff', '--quiet', 'main', '--', f], { cwd: RAIZ }); assert.equal(dif.status, 0, `${f} debe quedar igual que en main`)
    }
    const css = leer('components/canciones/editor-cancion-movil.module.css')
    assert.ok(/\.paleta\{[^}]*position:fixed[^}]*bottom:0/.test(css), 'franja baja fija')
    assert.ok(/\.pCab button\{[^}]*min-height:44px[^}]*min-width:44px/.test(css) && /\.acciones button\{[^}]*min-height:48px/.test(css) && /\.mas::after\{[^}]*inset:-8px/.test(css), 'áreas de toque')
    for (const f of ['components/canciones/ModoAcordes.tsx', 'components/canciones/PaletaAcordes.tsx']) { const x = sinComentarios(leer(f)); assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sendBeacon/.test(x), f); assert.ok(!/en vivo|al instante/i.test(x), f) }
    const modo = sinComentarios(leer('components/canciones/ModoAcordes.tsx'))
    assert.ok(/siguientePalabra\(doc, sel\.at\) === null \? null :/.test(modo), '«Siguiente palabra» al final cierra el panel')
    assert.ok(/onCambio\(d\); setSel\(\{ tipo: 'letra', at: sel\.at \+ delta \}\)/.test(modo), 'el ancla sigue al acorde que se mueve')
    assert.ok(/if \(acordeEn\(doc, sel\.at\)\) \{ const d = moverAcorde/.test(modo), 'con acorde, ‹ › lo mueven; sin acorde, mueven el lugar')
    assert.ok(/palabra: palabraEn\(doc, sel\.at\)/.test(modo), 'el panel dice la palabra')
    assert.ok(/closest\?\.\('\[data-ac\], \[data-mas\]'\)/.test(modo), 'tocar el «+» o un acorde elige el lugar')
    assert.ok(/aria-hidden="true" style=\{\{ height: (\d+) \}\}/.test(modo) && Number(/aria-hidden="true" style=\{\{ height: (\d+) \}\}/.exec(modo)[1]) >= 300, 'hay un espacio al final de la hoja del alto del panel, para que no tape lo último')
    assert.ok(/siguientePalabra\(doc, sel\.at\)/.test(modo) && /moverAcorde\(doc, sel\.at, delta\)/.test(modo) && /iniciosDePalabra\(l\)/.test(modo))
  })
  terminar()
})
