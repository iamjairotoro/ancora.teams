// Editor móvil v2, E2 (modo Texto y encabezados de sección): los botones insertan SOLO nombres que reconoce el lector de letra; insertar, cambiar de tipo, renumerar y borrar editan el texto con la regla de posición de siempre.
// Correr: `node tests/portal/editor-v2-encabezados.test.js`   (el comportamiento táctil: tests/e2e-menus/editor-v2-texto.js)
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const BASE = '499ac8d'      // el commit de main justo antes del editor v2: «igual que antes» se compara contra él (no contra `main`, que cambia al fusionar)
const hayBase = require('fs').existsSync(require('path').join(RAIZ, '.git')) && require('child_process').spawnSync('git', ['cat-file', '-e', BASE + '^{commit}'], { cwd: RAIZ }).status === 0
const path = require('path'), fs = require('fs')
const Module = require('module'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), { looksLikeHeader, parseLyrics } = require(path.join(RAIZ, 'lib/parseLyrics.ts')), { TEXTOS_EDITOR: T } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const A = g => ({ g, cal: '' })
const TEXTO = 'VERSO 1:\nAquí va\nOtra línea\n\nCORO:\nCoro uno\nDos\n\nPUENTE:\nPuente x'
const doc = () => { const d = E.docVacio(TEXTO); return { ...d, anclas: [{ at: TEXTO.indexOf('va'), acorde: A(1) }, { at: TEXTO.indexOf('Coro uno'), acorde: A(5) }, { at: TEXTO.indexOf('Puente x'), acorde: A(4) }] } }
const nombres = d => E.estructura(d.texto).secciones.map(s => s.nombre)

correr(async () => {
  await prueba('(a) los nombres que insertan los botones son EXACTAMENTE los que reconoce el lector de letra (looksLikeHeader / parseLyrics), con y sin número, y cada uno se ve como sección', () => {
    for (const tipo of E.TIPOS_SECCION) {
      const r = E.insertarEncabezado(E.docVacio('una línea de letra'), 0, tipo), nombre = E.estructura(r.doc.texto).lineas.find(l => l.rol === 'encabezado' || /:$/.test(l.txt)).txt.replace(/:$/, '')
      assert.ok(looksLikeHeader(nombre) && looksLikeHeader(nombre + ':'), `«${nombre}» lo reconoce el lector`)
      assert.equal(E.tipoDeNombre(nombre), tipo, `«${nombre}» vuelve a ser ${tipo}`)
      const con = E.docVacio(r.doc.texto.replace(/\(instrumental\)\n*$/, '(instrumental)') + (tipo === 'interludio' ? '' : '\nmás'))
      assert.ok(parseLyrics(con.texto).some(s => s.name === nombre), `parseLyrics (el lector) saca la sección «${nombre}»`)
      assert.ok(E.estructura(con.texto).secciones.some(s => s.nombre === nombre), `el editor también`)
    }
    assert.deepEqual(['VERSO 1', 'PRE CORO', 'CORO', 'PUENTE', 'INTERLUDIO', 'FINAL'], E.TIPOS_SECCION.map(t => E.nombreDeTipo(E.docVacio(''), t)))
    assert.equal(looksLikeHeader('PRE-CORO:'), false); assert.equal(looksLikeHeader('Pre coro:'), false, 'por eso el botón escribe «PRE CORO», no «Pre-coro» ni «Pre coro»')
    assert.equal(E.codigoDeSeccion('PRE CORO', 0, new Set()), 'PC', 'abreviatura «pre»'); assert.equal(E.codigoDeSeccion('PRE CORO', 1, new Set(['PC'])), 'PC-2')
    for (const x of Object.values(T.secciones)) assert.ok(/^\+ [A-Z]/.test(x))
  })
  await prueba('lo que el lector NO reconoce se ve como letra en el editor: «Pre-coro:» y «Pre coro:» no son etiqueta de sección (sin nombre de sección, con su carril de acordes)', () => {
    for (const mal of ['Pre-coro:', 'Pre coro:', 'pre-coro:']) {
      const e = E.estructura(`${mal}\nla la la\nlo lo`)
      assert.deepEqual(e.secciones.map(s => s.nombre), [''], mal); assert.ok(e.lineas.every(l => l.rol === 'letra'), `${mal}: todas son líneas de letra`)
      assert.equal(E.ponerAcorde(E.docVacio(`${mal}\nla la`), 0, A(1)) !== null, true, 'la línea admite acordes (se nota que es letra)')
    }
    const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server')), Modo = require(path.join(RAIZ, 'components/canciones/ModoAcordes.tsx')).default
    const h = renderToStaticMarkup(React.createElement(Modo, { doc: E.docVacio('Pre-coro:\nla la\n\nCORO:\nlo lo'), tono: 'G', onCambio() {} }))
    assert.ok(h.includes('>CORO <span') && !/>Pre-coro:? <span/.test(h), 'CORO es etiqueta (botón); «Pre-coro:» no')
    assert.ok(h.includes('Pre-coro:'), 'y se ve como una línea de letra')
  })
  await prueba('insertarEncabezado: en la línea del cursor; la línea actual pasa a la sección nueva; línea vacía antes si hace falta; el cursor queda debajo; los acordes siguen a su letra', () => {
    const d = doc(), c = TEXTO.indexOf('Otra') + 2
    const r = E.insertarEncabezado(d, c, 'verso')
    assert.equal(r.doc.texto, 'VERSO 1:\nAquí va\n\nVERSO 2:\nOtra línea\n\nCORO:\nCoro uno\nDos\n\nPUENTE:\nPuente x')
    assert.equal(r.doc.texto.slice(r.caret, r.caret + 5), 'Otra ', 'el cursor queda al inicio de la línea que ahora es la primera de la sección'); assert.deepEqual(r.quitados, { acordes: 0, interludios: 0 })
    assert.equal(r.doc.anclas.length, 3); for (const a of r.doc.anclas) assert.ok(r.doc.texto.slice(a.at).startsWith(a.acorde.g === 1 ? 'va' : a.acorde.g === 5 ? 'Coro uno' : 'Puente x'), 'cada acorde sigue en su palabra')
    assert.deepEqual(nombres(r.doc), ['VERSO 1', 'VERSO 2', 'CORO', 'PUENTE'])
    const v = E.insertarEncabezado(E.docVacio(''), 0, 'coro'); assert.equal(v.doc.texto, 'CORO:\n'); assert.equal(v.caret, 6, 'en un texto vacío: «CORO:» y el cursor debajo')
    const fin = E.insertarEncabezado(E.docVacio('a\n'), 2, 'final'); assert.equal(fin.doc.texto, 'a\n\nFINAL:\n', 'en la línea vacía de abajo: una línea vacía antes (la sección anterior no se come el encabezado)')
    assert.equal(E.insertarEncabezado(E.docVacio('a\n\n'), 3, 'puente').doc.texto, 'a\n\nPUENTE:\n', 'si ya hay línea vacía, no se agrega otra')
    for (const [raro, igual] of [[-5, 0], [9999, TEXTO.length], [NaN, 0], [3.7, 3]]) assert.deepEqual(E.insertarEncabezado(doc(), raro, 'coro'), E.insertarEncabezado(doc(), igual, 'coro'), `un cursor en ${raro} se acota a ${igual}`)
    const sobre = E.insertarEncabezado(d, TEXTO.indexOf('CORO:') + 2, 'puente'); assert.deepEqual(nombres(sobre.doc), ['VERSO 1', 'PUENTE', 'PUENTE'], 'con el cursor en un encabezado, el botón le cambia el tipo (no queda uno huérfano)')
    assert.equal(sobre.doc.texto.slice(sobre.caret, sobre.caret + 8), 'Coro uno', 'y el cursor queda en la primera línea de la sección'); for (const a of sobre.doc.anclas) assert.ok(sobre.doc.texto.slice(a.at).startsWith(a.acorde.g === 1 ? 'va' : a.acorde.g === 5 ? 'Coro uno' : 'Puente x'), 'cada acorde sigue en su palabra'); assert.equal(sobre.doc.anclas.length, 3)
    assert.equal(E.insertarEncabezado(d, TEXTO.indexOf('VERSO 1') + 3, 'verso').doc.texto, TEXTO, 'el mismo tipo y número: no cambia nada')
    const ac = E.insertarEncabezado(d, TEXTO.indexOf('Aquí'), 'coro'); assert.equal(ac.doc.anclas.find(a => a.acorde.g === 1).at, ac.doc.texto.indexOf('va'), 'un acorde en la línea de abajo no se queda en el encabezado')
  })
  await prueba('numeración automática: Verso = el mayor número que hay + 1 (también con huecos), el resto sin número; «Interludio» trae su «(instrumental)» y deja la letra siguiente en otra sección', () => {
    assert.equal(E.nombreDeTipo(E.docVacio('VERSO 1:\na\n\nVERSO 3:\nb'), 'verso'), 'VERSO 4'); assert.equal(E.nombreDeTipo(E.docVacio('VERSO:\na'), 'verso'), 'VERSO 2'); assert.equal(E.nombreDeTipo(E.docVacio('CORO:\na'), 'verso'), 'VERSO 1')
    const d = E.docVacio('VERSO 1:\nuno\n\nCORO:\ndos'), r = E.insertarEncabezado(d, d.texto.indexOf('dos'), 'interludio')
    assert.equal(r.doc.texto, 'VERSO 1:\nuno\n\nCORO:\n\nINTERLUDIO:\n(instrumental)\n\ndos')
    const sola = E.insertarEncabezado(E.docVacio('hola\n\n'), 6, 'interludio'); assert.equal(sola.doc.texto, 'hola\n\nINTERLUDIO:\n(instrumental)\n')
    assert.deepEqual(nombres(sola.doc), ['', 'INTERLUDIO'])
    assert.equal(E.estructura(sola.doc.texto).secciones[1].lineas.length, 1, 'la sección instrumental tiene su línea')
  })
  await prueba('cambiarTipoSeccion y renumerarVersos: solo el texto del encabezado; conservan lo de entre paréntesis, los acordes y las líneas de acordes; null si la sección no tiene encabezado', () => {
    const d = doc(), r = E.cambiarTipoSeccion(d, 1, 'puente'); assert.deepEqual(nombres(r), ['VERSO 1', 'PUENTE', 'PUENTE']); assert.deepEqual(r.anclas.map(a => a.acorde.g), [1, 5, 4])
    for (const a of r.anclas) assert.ok(r.texto.slice(a.at).startsWith(a.acorde.g === 1 ? 'va' : a.acorde.g === 5 ? 'Coro uno' : 'Puente x'))
    assert.equal(E.cambiarTipoSeccion(E.docVacio('VERSO 1 (2x):\na'), 0, 'coro').texto, 'CORO (2x):\na'); assert.equal(E.cambiarTipoSeccion(E.docVacio('VERSO 1:\na\n\nVERSO 2:\nb'), 1, 'verso').texto, 'VERSO 1:\na\n\nVERSO 2:\nb', 'sin número repetido: ignora la propia sección')
    assert.equal(E.cambiarTipoSeccion(E.docVacio('VERSO 1:\na\n\nCORO:\nb'), 1, 'verso').texto, 'VERSO 1:\na\n\nVERSO 2:\nb', 'a verso toma el siguiente número')
    assert.equal(E.cambiarTipoSeccion(E.docVacio('sin encabezado\nuna'), 0, 'coro'), null); assert.equal(E.cambiarTipoSeccion(d, 1, 'coro'), d, 'mismo nombre: no cambia nada (mismo documento)')
    const con = { ...E.docVacio('VERSO 1:\na\n\nCORO:\n(instrumental)'), interludios: [{ at: 'VERSO 1:\na\n\nCORO:\n(instrumental)'.length, items: [{ acorde: A(1) }] }] }
    assert.equal(E.cambiarTipoSeccion(con, 1, 'interludio').interludios.length, 1, 'las líneas de acordes se quedan')
    const n = E.renumerarVersos(E.docVacio('VERSO 3:\na\n\nCORO:\nc\n\nVERSO 7 (2x):\nb\n\nVERSO:\nz')); assert.deepEqual(nombres(n), ['VERSO 1', 'CORO', 'VERSO 2 (2x)', 'VERSO 3']); const mismo = doc(); assert.equal(E.renumerarVersos(mismo), mismo, 'ya en orden: el mismo documento')
  })
  await prueba('borrarSeccion: quita encabezado, líneas y la línea vacía que la separaba; sus acordes y líneas de acordes se van y se cuentan (para avisar y Deshacer); las demás no se mueven; no queda cola vacía', () => {
    const d = doc(), r = E.borrarSeccion(d, 1)
    assert.equal(r.doc.texto, 'VERSO 1:\nAquí va\nOtra línea\n\nPUENTE:\nPuente x'); assert.deepEqual(r.quitados, { acordes: 1, interludios: 0 }); assert.equal(r.nombre, 'CORO'); assert.deepEqual(r.doc.anclas.map(a => a.acorde.g), [1, 4])
    for (const a of r.doc.anclas) assert.ok(r.doc.texto.slice(a.at).startsWith(a.acorde.g === 1 ? 'va' : 'Puente x'), 'los acordes de las demás siguen en su palabra')
    const u = E.borrarSeccion(d, 2); assert.equal(u.doc.texto, 'VERSO 1:\nAquí va\nOtra línea\n\nCORO:\nCoro uno\nDos', 'la última: sin líneas vacías al final'); assert.deepEqual(u.quitados, { acordes: 1, interludios: 0 }); assert.deepEqual(u.doc.anclas.map(a => a.acorde.g), [1, 5])
    const p = E.borrarSeccion(d, 0); assert.equal(p.doc.texto.startsWith('CORO:'), true); assert.deepEqual(p.doc.anclas.map(a => a.acorde.g), [5, 4])
    const x = { ...d, interludios: [{ at: TEXTO.indexOf('Dos') + 3, items: [{ acorde: A(1) }] }] }; const q = E.borrarSeccion(x, 1); assert.deepEqual(q.quitados, { acordes: 1, interludios: 1 }, 'la línea de acordes de la sección se cuenta'); assert.equal(q.doc.interludios.length, 0)
    assert.equal(E.borrarSeccion(d, 9), null); const todo = E.borrarSeccion(E.borrarSeccion(E.borrarSeccion(d, 2).doc, 1).doc, 0); assert.equal(todo.doc.texto, '', 'borrar todas deja el texto vacío')
    const h = E.nuevoHistorial(d), h2 = E.registrar(h, r.doc), h3 = E.deshacer(h2); assert.equal(h3.presente, d, 'Deshacer devuelve la sección con sus acordes (el documento anterior entero)'); assert.equal(E.rehacer(h3).presente, r.doc)
    assert.deepEqual(E.aSecciones(r.doc).map(s => s.nombre), ['VERSO 1', 'PUENTE'])
  })
  await prueba('pantalla (modo Texto): botones «+ Verso, + Pre coro, + Coro, + Puente, + Interludio, + Final» en una fila deslizable que no le quita el foco al cuadro; «♪ Acordes» para volver; menú de sección con tipos, renumerar, borrar y cerrar', () => {
    const f = sinComentarios(leer('components/canciones/EditorCancionMovil.tsx')), css = leer('components/canciones/editor-cancion-movil.module.css'), m = sinComentarios(leer('components/canciones/ModoAcordes.tsx'))
    assert.ok(/TIPOS_SECCION\.map\(tp => <button key=\{tp\} type="button" onMouseDown=\{e => e\.preventDefault\(\)\} onClick=\{\(\) => insertarSeccion\(tp\)\}>\{T\.secciones\[tp\]\}/.test(f), 'cada botón inserta su tipo y no roba el foco')
    assert.ok(/\.encabezados\{[^}]*overflow-x:auto/.test(css) && /\.encabezados button\{[^}]*flex:none[^}]*min-height:44px/.test(css), 'fila deslizable, botones de 44 px')
    assert.ok(/\.barraTexto\{[^}]*flex:none/.test(css) && /useTecladoHoja\(raizRef\)/.test(f) && /ref=\{raizRef\}/.test(f), 'la barra va pegada sobre el teclado (useTecladoHoja)')
    assert.ok(/setModo\(m => \(m === 'texto' \? 'acordes' : 'texto'\)\)/.test(f) && /modo === 'texto' \? T\.volverAcordes : T\.modoTexto/.test(f) && /setModo\('acordes'\)/.test(f), '«✎ Texto» y «♪ Acordes» alternan el modo')
    assert.ok(!/fetch\(|XMLHttpRequest|localStorage|sendBeacon/.test(m), 'el menú no llama a la red'); assert.equal((f.match(/fetch\(/g) || []).length, 2)
    assert.ok(/insertarEncabezado\(doc, area\?\.selectionStart \?\? doc\.texto\.length, tipo\)/.test(f), 'el encabezado va donde está el cursor del cuadro')
    assert.ok(/if \(d && d !== doc\) onCambio\(d\); cerrar\(\) \}\}>\{T\.tiposSeccion\[tp\]\}/.test(m) && /setSel\(null\); cerrar\(\) \}\}>\{T\.borrarSeccion\}/.test(m), 'cambiar de tipo aplica el cambio; borrar suelta la selección y cierra el menú')
    assert.ok(/cambiarTipoSeccion\(doc, menu, tp\)/.test(m) && /renumerarVersos\(doc\)/.test(m) && /borrarSeccion\(doc, menu\)/.test(m) && /T\.seccionBorrada\(r\.nombre, r\.quitados\.acordes, r\.quitados\.interludios\)/.test(m))
    assert.ok(/\.tipos button\{[^}]*min-height:44px/.test(css) && /\.fila2\{[^}]*min-height:48px/.test(css) && /\.secNombre\{[^}]*min-height:44px/.test(css))
    assert.ok(/<span>\{T\.ayudaTexto\}<\/span>/.test(f) && T.ayudaTexto === 'Cada acorde se queda con su palabra.')
    assert.equal(T.seccionBorrada('CORO', 2, 1), 'Se borró la sección «CORO» · Se quitaron 2 acordes · Se quitó 1 línea de acordes'); assert.equal(T.seccionBorrada('', 0, 0), 'Se borró la sección sin nombre')
    assert.ok(/\{quitados && <p className=\{ui\.aviso\} role="status">\{quitados\}\{puedeDeshacer\(hist\) && <> <button type="button" className=\{ui\.texto\} onClick=\{\(\) => \{ setHist\(deshacer\); setQuitados\(null\) \}\}>\{T\.deshacer\}/.test(f), 'el aviso trae «Deshacer»')
    assert.ok(!/(en vivo|al instante)/i.test(f + m + leer('lib/textos/editorAcordes.ts')))
    if (hayBase) for (const x of ['components/canciones/LineaConAcordes.tsx', 'lib/palabrasConAcordes.ts']) assert.equal(require('child_process').spawnSync('git', ['diff', '--quiet', BASE, '--', x], { cwd: RAIZ }).status, 0, `${x} igual que antes del editor v2`)
  })
  terminar()
})
