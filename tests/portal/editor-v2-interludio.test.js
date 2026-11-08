// Editor móvil v2, E3 (interludios y líneas de solo acordes): VARIAS líneas de acordes por interludio, y barras y espacios como piezas propias (con − y + para el ancho). Ida y vuelta con aSecciones y desdeSecciones.
// Correr: `node tests/portal/editor-v2-interludio.test.js`   (el comportamiento táctil: tests/e2e-menus/editor-v2-interludio.js; que guardar espacios se acepte: tests/portal/compas-espacios.test.js)
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const BASE = '499ac8d'      // el commit de main justo antes del editor v2: «igual que antes» se compara contra él (no contra `main`, que cambia al fusionar)
const hayBase = require('fs').existsSync(require('path').join(RAIZ, '.git')) && require('child_process').spawnSync('git', ['cat-file', '-e', BASE + '^{commit}'], { cwd: RAIZ }).status === 0
const path = require('path'), fs = require('fs')
const Module = require('module'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), { TEXTOS_EDITOR: T } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const A = (g, cal = '') => ({ g, cal }), C = g => ({ acorde: A(g) }), BARRA = { texto: '|' }, ESP = n => ({ texto: ' '.repeat(n) })
const TEXTO = 'VERSO 1:\nAquí va\nOtra línea\n\nINTERLUDIO:\n(instrumental)'
const L1 = TEXTO.indexOf('Aquí va') + 'Aquí va'.length, L2 = TEXTO.indexOf('Otra línea') + 'Otra línea'.length, L3 = TEXTO.length
const base = () => E.docVacio(TEXTO)

correr(async () => {
  await prueba('ponerLineaCompas: crea, cambia y quita líneas de acordes por número; varias en el mismo lugar; solo al final de una línea de letra; con items vacíos se quita', () => {
    let d = base()
    d = E.ponerLineaCompas(d, L1, 0, [C(1), BARRA, C(5)]); d = E.ponerLineaCompas(d, L1, 1, [C(4), ESP(2), C(1)]); d = E.ponerLineaCompas(d, L1, 2, [BARRA])
    assert.deepEqual(E.lineasDeCompas(d, L1).map(l => l.length), [3, 3, 1], 'tres líneas, cada una en su orden'); assert.equal(E.lineasDeCompas(d, L2).length, 0)
    d = E.ponerLineaCompas(d, L2, 0, [C(6)]); assert.deepEqual(d.interludios.map(x => x.at), [L1, L1, L1, L2], 'ordenadas por lugar y estables dentro de cada uno')
    const cambia = E.ponerLineaCompas(d, L1, 1, [C(2)]); assert.deepEqual(E.lineasDeCompas(cambia, L1).map(l => l.length), [3, 1, 1]); assert.deepEqual(E.lineasDeCompas(d, L1).map(l => l.length), [3, 3, 1], 'no cambia el original')
    const larga = E.ponerLineaCompas(E.ponerLineaCompas(base(), L1, 0, [C(1)]), L1, 1, [C(2), C(3), C(4)]); assert.deepEqual(E.lineasDeCompas(larga, L1).map(l => l.length), [1, 3], 'una línea más larga después de una corta NO se adelanta (el orden es el de la lista)')
    assert.deepEqual(E.lineasDeCompas(E.aplicarEdicion(larga, { s: 2, e: 2, t: 'x' }).doc, L1 + 1).map(l => l.length), [1, 3], 'ni al editar el texto')
    const quita = E.quitarLineaCompas(d, L1, 0); assert.deepEqual(E.lineasDeCompas(quita, L1).map(l => l.length), [3, 1], 'se quita la primera y la segunda pasa a ser la primera'); assert.deepEqual(E.lineasDeCompas(quita, L1)[0], [C(4), ESP(2), C(1)], 'la que queda primera es la que era segunda'); assert.equal(E.lineasDeCompas(quita, L2).length, 1)
    assert.equal(E.ponerLineaCompas(d, L1, 9, [C(1)]), null, 'no hay línea 9'); assert.equal(E.ponerLineaCompas(d, L1, -1, [C(1)]), null); assert.equal(E.ponerLineaCompas(d, L1 - 2, 0, [C(1)]), null, 'no es el final de la línea')
    assert.equal(E.ponerLineaCompas(d, 3, 0, [C(1)]), null, 'sobre el encabezado no')
    assert.deepEqual(E.ponerLineaCompas(base(), L1, 0, []).interludios, [], 'agregar una línea vacía no crea nada')
    assert.equal(E.ponerInterludio(d, L1, [C(7)]).interludios.filter(x => x.at === L1).length, 3, 'ponerInterludio (compatibilidad) cambia solo la primera'); assert.equal(E.quitarInterludio(d, L1).interludios.length, 1, 'quitarInterludio quita todas las de ese lugar')
  })
  await prueba('piezas: «+ Espacio» (1 a 8 espacios simples), −/+ del ancho con sus topes, «| Barra» y acordes se insertan después de la elegida (o al final) y se pueden mover', () => {
    assert.equal(E.ESPACIO_MAXIMO, 8); assert.deepEqual(E.nuevoEspacio(), { texto: '  ' }); assert.equal(E.nuevoEspacio(0).texto, ' '); assert.equal(E.nuevoEspacio(99).texto.length, 8); assert.equal(E.nuevoEspacio(3.9).texto, '   '); assert.equal(E.nuevoEspacio(NaN).texto, ' ')
    assert.equal(E.anchoDeEspacio(ESP(3)), 3); assert.equal(E.anchoDeEspacio(BARRA), null); assert.equal(E.anchoDeEspacio(C(1)), null); assert.equal(E.anchoDeEspacio({ texto: ' |' }), null, 'un espacio son SOLO espacios'); assert.equal(E.anchoDeEspacio({ texto: ' ' }), null, 'ni espacios raros'); assert.equal(E.anchoDeEspacio(undefined), null)
    const l = [C(1), ESP(2), C(5), BARRA]
    assert.deepEqual(E.conAnchoDeEspacio(l, 1, 1)[1], ESP(3)); assert.deepEqual(E.conAnchoDeEspacio(l, 1, -1)[1], ESP(1)); assert.equal(E.conAnchoDeEspacio([ESP(1)], 0, -1), null, 'no baja de 1'); assert.equal(E.conAnchoDeEspacio([ESP(8)], 0, 1), null, 'no pasa de 8'); assert.equal(E.conAnchoDeEspacio(l, 0, 1), null, 'un acorde no tiene ancho'); assert.equal(E.conAnchoDeEspacio(l, 9, 1), null)
    assert.deepEqual(E.insertarPieza(l, 0, BARRA), { items: [C(1), BARRA, ESP(2), C(5), BARRA], idx: 1 }); assert.deepEqual(E.insertarPieza(l, null, C(2)).idx, 4); assert.deepEqual(E.insertarPieza([], null, C(2)), { items: [C(2)], idx: 0 }); assert.equal(E.insertarPieza(l, 99, BARRA).idx, 4, 'una pieza elegida que no existe: al final')
    assert.deepEqual(E.moverPieza(l, 1, 1), [C(1), C(5), ESP(2), BARRA]); assert.deepEqual(E.moverPieza(l, 1, -1), [ESP(2), C(1), C(5), BARRA]); assert.equal(E.moverPieza(l, 0, -1), null); assert.equal(E.moverPieza(l, 3, 1), null)
  })
  await prueba('IDA Y VUELTA aSecciones → desdeSecciones: varias líneas de acordes por sitio, barras, espacios y acordes con bajo vuelven idénticos (orden incluido); también en una sección solo instrumental', () => {
    let d = base()
    d = { ...d, anclas: [{ at: TEXTO.indexOf('va'), acorde: A(1) }, { at: TEXTO.indexOf('Otra'), acorde: { ...A(4, 'maj7'), bajo: { g: 5 } } }] }
    d = E.ponerLineaCompas(d, L1, 0, [C(1), BARRA, ESP(3), C(5), BARRA]); d = E.ponerLineaCompas(d, L1, 1, [ESP(1), C(6)]); d = E.ponerLineaCompas(d, L2, 0, [C(4)])
    const instr = E.finDeSeccion(d, 1); d = E.ponerLineaCompas(d, instr, 0, [BARRA, ESP(8), C(1)]); d = E.ponerLineaCompas(d, instr, 1, [C(5)])
    assert.equal(d.interludios.length, 5)
    const sec = E.aSecciones(d), lineas = sec.map(s => s.lineas)
    assert.deepEqual(lineas[0].map(x => x.kind), ['lyric', 'bars', 'bars', 'lyric', 'bars'], 'cada línea de acordes sale como su propia línea, justo debajo de la letra a la que va'); assert.deepEqual(lineas[1].map(x => x.kind), ['bars', 'bars'], 'la sección instrumental trae solo sus líneas de acordes')
    const v = E.desdeSecciones(d.texto, lineas); assert.ok(v, 'vuelve a encajar'); assert.deepEqual(v.texto, d.texto); assert.deepEqual(v.anclas, d.anclas); assert.deepEqual(v.interludios, d.interludios, 'las mismas líneas, en el mismo orden y con los mismos espacios')
    assert.deepEqual(E.aSecciones(v), sec, 'y guardar de nuevo da lo mismo')
    assert.ok(JSON.stringify(sec).includes('"texto":"' + ' '.repeat(8) + '"'), 'el espacio de 8 viaja como texto de 8 espacios')
  })
  await prueba('IDA Y VUELTA al azar (semilla fija): documentos con secciones, acordes, interludios de varias líneas, barras y espacios dan lo mismo tras guardar y volver a leer', () => {
    let seed = 20261107; const rnd = n => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n
    const palabras = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete']
    for (let caso = 0; caso < 300; caso++) {
      const secs = []
      for (let k = 0, n = 1 + rnd(4); k < n; k++) { const ls = []; for (let j = 0, m = 1 + rnd(3); j < m; j++) ls.push(Array.from({ length: 1 + rnd(4) }, () => palabras[rnd(7)]).join(' ')); secs.push((rnd(4) ? ['VERSO 1', 'CORO', 'PUENTE', 'FINAL'][rnd(4)] + ':\n' : '') + ls.join('\n')) }
      if (rnd(3) === 0) secs.push('INTERLUDIO:\n(instrumental)')
      let d = E.docVacio(secs.join('\n\n')); const est = E.estructura(d.texto)
      for (const l of est.lineas) if (l.rol === 'letra' && l.txt.trim() && l.txt.trim() !== '(instrumental)') { for (let i = 0, n = rnd(3); i < n; i++) { const dd = E.ponerAcorde(d, l.ini + rnd(l.txt.length + 1), { g: 1 + rnd(7), cal: ['', 'm', '7'][rnd(3)] }); if (dd) d = dd } }
      for (const l of est.lineas) if (l.rol === 'letra') for (let i = 0, n = rnd(3); i < n; i++) { const items = Array.from({ length: 1 + rnd(5) }, () => [C(1 + rnd(7)), BARRA, ESP(1 + rnd(8))][rnd(3)]); const dd = E.ponerLineaCompas(d, l.fin, E.lineasDeCompas(d, l.fin).length, items); if (dd) d = dd }
      const sec = E.aSecciones(d), v = E.desdeSecciones(d.texto, sec.map(s => s.lineas))
      assert.ok(v, 'caso ' + caso + ': vuelve a encajar'); assert.deepEqual(v.anclas, d.anclas, 'caso ' + caso + ': anclas'); assert.deepEqual(v.interludios, d.interludios, 'caso ' + caso + ': líneas de acordes'); assert.equal(v.texto, d.texto)
    }
  })
  await prueba('al editar el texto, las líneas de acordes siguen a su letra y se conservan todas y en orden; si se borra la línea de letra se van TODAS y se cuentan', () => {
    let d = base(); d = E.ponerLineaCompas(d, L1, 0, [C(1)]); d = E.ponerLineaCompas(d, L1, 1, [C(5)]); d = E.ponerLineaCompas(d, L1, 2, [C(4)])
    const r = E.aplicarEdicion(d, { s: 2, e: 2, t: 'xx' }); assert.deepEqual(r.doc.interludios.map(x => x.at), [L1 + 2, L1 + 2, L1 + 2]); assert.deepEqual(r.doc.interludios.map(x => x.items[0].acorde.g), [1, 5, 4]); assert.deepEqual(r.quitados, { acordes: 0, interludios: 0 })
    const ini = TEXTO.indexOf('Aquí va'), borra = E.aplicarEdicion(d, { s: ini, e: L1 + 1, t: '' }); assert.equal(borra.doc.interludios.length, 0); assert.deepEqual(borra.quitados, { acordes: 0, interludios: 3 }, 'las tres líneas de acordes se cuentan')
    const sec = E.borrarSeccion(d, 0); assert.deepEqual(sec.quitados, { acordes: 0, interludios: 3 }); assert.equal(sec.doc.interludios.length, 0)
  })
  await prueba('pantalla: cada línea de acordes se dibuja aparte; los espacios son botones con su ancho (--n) y nombre; el panel del espacio dice «entre G y D · 2», trae Ancho − +, «+ Espacio», «| Barra», «Quitar» y «Siguiente ›»; − y + se desactivan en los topes', () => {
    const Modo = require(path.join(RAIZ, 'components/canciones/ModoAcordes.tsx')).default, Paleta = require(path.join(RAIZ, 'components/canciones/PaletaAcordes.tsx')).default
    let d = base(); d = E.ponerLineaCompas(d, L1, 0, [C(1), ESP(2), C(5)]); d = E.ponerLineaCompas(d, L1, 1, [BARRA, C(4)]); d = E.ponerLineaCompas(d, L2, 0, [C(6)])      // L2 es el final de la última línea de VERSO 1: ahí cuelga el «+ Línea de acordes» de la sección
    const h = renderToStaticMarkup(React.createElement(Modo, { doc: d, tono: 'G', onCambio() {} }))
    assert.equal((h.match(/>\+ Línea de acordes<\/button>/g) || []).length, 2, 'VERSO 1 (que ya tiene dos líneas de acordes) sigue ofreciendo agregar otra, igual que la sección instrumental')
    assert.equal((h.match(/class="compas"/g) || []).length, 3, 'dos líneas de acordes bajo la primera letra y una bajo la última'); assert.ok(h.includes('aria-label="Espacio de 2"') && h.includes('--n:2') && h.includes('class="espacio"'), 'el espacio es un botón con su ancho')
    assert.ok(/class="compas"[\s\S]*?>G<\/button><button[^>]*espacio[^>]*><\/button><button[^>]*>D<\/button>/.test(h), 'G, espacio, D'); assert.ok(/<button[^>]*>\|<\/button><button[^>]*>C<\/button>/.test(h), '| C')
    const base2 = { tono: 'G', actual: null, onElegir() {}, onCerrar() {}, onQuitar() {}, onSiguiente() {}, onSeparador() {}, onEspacio() {}, soloLinea: true, textoQuitar: T.quitarPieza, textoSiguiente: T.siguientePieza, titulo: { principal: 'Espacio', detalle: T.espacioEntre('G', 'D', 2), grande: false } }
    const p = renderToStaticMarkup(React.createElement(Paleta, { ...base2, ancho: { valor: 2, onMenos() {}, onMas() {} } }))
    assert.ok(p.includes('>Espacio<') && p.includes('entre G y D · 2') && p.includes('>Ancho<') && p.includes('aria-label="Más estrecho"') && p.includes('aria-label="Más ancho"') && p.includes('>+ Espacio<') && p.includes('>| Barra<'), 'panel del espacio')
    assert.ok(p.includes('>Quitar<') && p.includes('>Siguiente ›<') && !p.includes('Siguiente palabra') && !p.includes('Quitar acorde'), 'las acciones de abajo dicen «Quitar» y «Siguiente ›»'); assert.ok(!p.includes('>maj7<'), 'sin acorde elegido no hay modificadores en una línea de acordes'); assert.ok(!p.includes('>Mover<'), 'el espacio se ensancha, no se «mueve»')
    const con = v => renderToStaticMarkup(React.createElement(Paleta, { ...base2, ancho: { valor: v, onMenos() {}, onMas() {} } }))
    assert.ok(/<button[^>]*disabled=""[^>]*aria-label="Más estrecho"|aria-label="Más estrecho"[^>]*disabled=""/.test(con(1)), '− desactivado en 1'); assert.ok(!/aria-label="Más estrecho"[^>]*disabled=""/.test(con(2)))
    assert.ok(/aria-label="Más ancho"[^>]*disabled=""|disabled=""[^>]*aria-label="Más ancho"/.test(con(8)), '+ desactivado en 8'); assert.ok(!/aria-label="Más ancho"[^>]*disabled=""/.test(con(7)))
    assert.ok(!/disabled=""[^>]*>Quitar<\/button>/.test(p), 'en una línea de acordes «Quitar» está activo con una barra o un espacio elegidos (no hay acorde)')
    assert.ok(/disabled=""[^>]*>Quitar acorde<\/button>/.test(renderToStaticMarkup(React.createElement(Paleta, { tono: 'G', actual: null, onElegir() {}, onCerrar() {}, onQuitar() {} }))), 'en la letra, «Quitar acorde» sigue desactivado sin acorde')
    const c = renderToStaticMarkup(React.createElement(Paleta, { ...base2, actual: A(1), titulo: { principal: 'G', detalle: T.enLineaDeAcordes, grande: true }, onMover() {} })); assert.ok(c.includes('>maj7<') && c.includes('>Mover<') && c.includes('aria-label="‹"'), 'con un acorde elegido sí hay modificadores y Mover')
    assert.ok(!renderToStaticMarkup(React.createElement(Paleta, { ...base2, onEspacio: undefined })).includes('>+ Espacio<'), 'sin onEspacio no hay botón (ESPACIOS_EN_COMPAS)')
  })
  await prueba('fuente: el espacio mide ≥ 44 px, el panel de piezas también; ESPACIOS_EN_COMPAS gobierna el botón; sin red; LineaConAcordes y la lectura intactos', () => {
    const css = leer('components/canciones/editor-cancion-movil.module.css'), m = sinComentarios(leer('components/canciones/ModoAcordes.tsx'))
    assert.ok(/\.compas button\{[^}]*min-height:44px;[^}]*min-width:44px/.test(css) && /\.compas button\.espacio\{[^}]*min-width:max\(44px/.test(css) && /\.piezas button\{[^}]*min-height:48px/.test(css) && /\.pCab \.flecha\{/.test(css) && /\.pCab button\{[^}]*min-height:44px/.test(css), 'áreas de toque')
    assert.ok(/soloLinea: true, textoQuitar: T\.quitarPieza, textoSiguiente: T\.siguientePieza,/.test(m), 'la línea de acordes pasa sus textos «Quitar» y «Siguiente ›» (y con ellos «Quitar» queda activo sin acorde)')
    assert.ok(/onEspacio: ESPACIOS_EN_COMPAS \? \(\) => agregar\(nuevoEspacio\(2\)\) : undefined/.test(m), 'el botón depende de ESPACIOS_EN_COMPAS'); assert.equal(E.ESPACIOS_EN_COMPAS, true)
    assert.ok(/const agregar = \(pieza: ItemCompas\) => \{ const r = insertarPieza\(lista, idx, pieza\); poner\(r\.items, r\.idx\) \}/.test(m) && /quitarLineaCompas\(doc, fin, n\)/.test(m) && /ponerLineaCompas\(doc, sel\.fin, n, nuevoItems\)/.test(m))
    assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sendBeacon/.test(m) && !/(en vivo|al instante)/i.test(m + leer('lib/textos/editorAcordes.ts')))
    if (hayBase) for (const x of ['components/canciones/LineaConAcordes.tsx', 'lib/palabrasConAcordes.ts', 'components/canciones/HojaAcordes.tsx', 'lib/acordes.ts', 'app/api/admin/canciones/acordes/route.ts']) assert.equal(require('child_process').spawnSync('git', ['diff', '--quiet', BASE, '--', x], { cwd: RAIZ }).status, 0, x + ' igual que antes del editor v2')
  })
  terminar()
})
