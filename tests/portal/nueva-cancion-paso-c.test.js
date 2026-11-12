// «Nueva canción» paso C: la tira de partes con «+» en el editor de una canción nueva. Las partes del documento (lib/editorAcordes.ts: partesDeDocumento, parteDeCaret, parteAlcanzada), la tira (TiraPartes con `agregar` opcional) y su conexión en el editor.
// La lectura (TiraPartes sin `agregar`) no cambia. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts'))
const Tira = require(path.join(RAIZ, 'components/canciones/lectura/TiraPartes.tsx')).default
const PARTES = [{ abrev: 'V1', clave: 'v', nombre: 'VERSO 1', repeat: 1 }, { abrev: 'C', clave: 'c', nombre: 'CORO', repeat: 1 }]
const TEXTO = 'VERSO 1:\nuna línea\notra línea\n\nCORO:\nlínea del coro\n\nPUENTE:\nlínea del puente'

correr(async () => {
  await prueba('partesDeDocumento: una parte por sección, con su nombre y el inicio de su primera línea (el encabezado); mismo orden e índice que estructura()', () => {
    const p = E.partesDeDocumento(TEXTO)
    assert.deepEqual(p.map(x => x.nombre), ['VERSO 1', 'CORO', 'PUENTE']); assert.deepEqual(p.map(x => x.ini), [0, TEXTO.indexOf('CORO:'), TEXTO.indexOf('PUENTE:')])
    assert.equal(p.length, E.estructura(TEXTO).secciones.length); assert.deepEqual(E.partesDeDocumento(''), []) })

  await prueba('un encabezado SIN letra todavía («CORO:» recién agregado) cuenta como una parte con su nombre; un bloque sin encabezado es una parte sin nombre que empieza en su primera línea', () => {
    const t = TEXTO + '\n\nTAG:\n'; const p = E.partesDeDocumento(t)
    assert.deepEqual(p.map(x => x.nombre), ['VERSO 1', 'CORO', 'PUENTE', 'TAG']); assert.equal(p[3].ini, t.indexOf('TAG:'))
    const sin = E.partesDeDocumento('una línea suelta\notra línea\n\nCORO:\nlínea'); assert.deepEqual(sin.map(x => x.nombre), ['', 'CORO']); assert.equal(sin[0].ini, 0)
    const vacio = E.partesDeDocumento('VERSO 1:\n'); assert.deepEqual(vacio.map(x => x.nombre), ['VERSO 1']) })

  await prueba('lo que agrega agregarParte aparece en la tira enseguida (aunque todavía no tenga letra) y en el mismo orden', () => {
    let d = E.docVacio(); const nombres = []
    for (const t of ['verso', 'coro', 'puente']) { const r = E.agregarParte(d, t); d = r.doc; nombres.push(E.partesDeDocumento(d.texto).map(x => x.nombre).join('|')); d = E.cambiarTexto(d, d.texto + 'letra', d.texto.length + 5).doc }
    assert.deepEqual(nombres, ['VERSO 1', 'VERSO 1|CORO', 'VERSO 1|CORO|PUENTE']) })

  await prueba('parteDeCaret: la parte donde está el cursor (encabezado, letra o línea vacía de después); antes de la primera o sin partes es la 0', () => {
    const c = i => E.parteDeCaret(TEXTO, i)
    assert.equal(c(0), 0); assert.equal(c(5), 0); assert.equal(c(TEXTO.indexOf('otra') + 2), 0); assert.equal(c(TEXTO.indexOf('\n\nCORO')), 0, 'al final de la letra del verso')
    assert.equal(c(TEXTO.indexOf('CORO:')), 1); assert.equal(c(TEXTO.indexOf('línea del coro') + 3), 1); assert.equal(c(TEXTO.indexOf('PUENTE:')), 2); assert.equal(c(TEXTO.length), 2)
    assert.equal(E.parteDeCaret('', 0), 0); assert.equal(E.parteDeCaret('   \n', 2), 0) })

  await prueba('parteAlcanzada: la última cuyo borde de arriba ya llegó a la línea; ninguna → 0; las ausentes (null) no cuentan; una justo en la línea cuenta', () => {
    assert.equal(E.parteAlcanzada([-300, -40, 90, 400], 24), 1); assert.equal(E.parteAlcanzada([10, 200], 24), 0); assert.equal(E.parteAlcanzada([100, 200], 24), 0, 'ninguna llegó: la primera')
    assert.equal(E.parteAlcanzada([-100, 24, 300], 24), 1, 'justo en la línea'); assert.equal(E.parteAlcanzada([-100, null, -50], 24), 2); assert.equal(E.parteAlcanzada([-100, null, null], 24), 0); assert.equal(E.parteAlcanzada([], 24), 0) })

  await prueba('la tira: con `agregar` dibuja al final el «+» punteado (con su nombre accesible y de 44 px por CSS); sin `agregar` es la de siempre (sin «+»)', () => {
    const sin = R(h(Tira, { partes: PARTES, activa: 0, onIr() {} })), con = R(h(Tira, { partes: PARTES, activa: 0, onIr() {}, agregar: { etiqueta: 'Agregar una parte', onClick() {} } }))
    assert.ok(!sin.includes('circAgregar') && !sin.includes('Agregar una parte') && !sin.includes('>+<')); assert.equal((sin.match(/<li>/g) || []).length, 2)
    assert.ok(con.includes('class="circAgregar"') && con.includes('aria-label="Agregar una parte"') && con.includes('>+</button>')); assert.equal((con.match(/<li>/g) || []).length, 3); assert.ok(con.lastIndexOf('circAgregar') > con.lastIndexOf('data-parte'), 'el «+» va después de las partes')
    assert.ok(R(h(Tira, { partes: [], activa: 0, onIr() {}, agregar: { etiqueta: 'x', onClick() {} } })).includes('circAgregar'), 'sin partes queda solo el «+»')
    assert.ok(con.includes('aria-current="true"'), 'la activa se marca')
    const css = leer('components/canciones/lectura/lectura-partes.module.css'); assert.match(css, /\.circAgregar\{[^}]*width:max\(44px, 2\.75rem\)[^}]*height:max\(44px, 2\.75rem\)[^}]*border:2px dashed/) })

  await prueba('la lectura NO usa el «+»: ninguna pantalla de la lectura pasa `agregar` a la tira; TiraPartes sigue exportando lo mismo', () => {
    assert.ok(!/agregar=/.test(leer('app/portal/_components/lectura/LecturaCancion.tsx'))); const T = require(path.join(RAIZ, 'components/canciones/lectura/TiraPartes.tsx'))
    assert.deepEqual(Object.keys(T).sort(), ['corrimientoParaVer', 'default', 'globoVaAbajo']) })

  await prueba('el editor: la tira solo existe en el flujo nuevo (`nueva`), con las partes del documento y el «+» que abre «Agregar parte»; el botón «+ Parte» de antes se fue; sin `nueva` no se dibuja nada nuevo', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /\{nueva && estado === 'listo' && \(\s*\n\s*<div className=\{`\$\{coloresUi\.colores\} \$\{ui\.tiraEditor\}`\}>\s*\n\s*<TiraPartes partes=\{partesTira\} activa=\{Math\.min\(activaSec, Math\.max\(0, partesTira\.length - 1\)\)\} onIr=\{irASeccion\} onMenu=\{i => \{ setActivaSec\(i\); setMenuParte\(i\) \}\} agregar=\{\{ etiqueta: TEXTOS_NUEVA\.agregarParteBoton, onClick: \(\) => setAgregando\(true\) \}\} \/>/)
    assert.ok(!f.includes('masParte') && !f.includes('+ Parte') && !leer('lib/nuevaCancion.ts').includes("'+ Parte'") && !leer('components/canciones/editor-cancion-movil.module.css').includes('masParte'))
    assert.match(f, /const nombresPartes = useMemo\(\(\) => \(nueva \? partesDeDocumento\(doc\.texto\)\.map\(p => p\.nombre\) : \[\]\), \[nueva, doc\.texto\]\)/, 'sin `nueva` no se calcula nada'); assert.match(f, /const partesTira: ParteTira\[\] = useMemo\(\(\) => \{ const rep = repeticionesDeLasPartes\(nombresPartes, repeticiones\)/)
    assert.equal((f.match(/<TiraPartes/g) || []).length, 1); assert.equal((f.match(/fetch\(/g) || []).length, 2, 'solo leer y guardar (la tira no escribe)'); assert.ok(!/supabase/.test(f))
    assert.match(f, /if \(!nueva \|\| estado !== 'listo' \|\| vacioNueva\) return/, 'los oyentes de cursor y desplazamiento solo en el flujo nuevo') })

  await prueba('ir a una parte: en modo Texto pone el cursor en su encabezado y desplaza el cuadro; en modo Acordes lleva esa sección a la parte de arriba del cuerpo; la parte activa sigue al cursor (selectionchange) y al desplazamiento', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /a\.focus\(\{ preventScroll: true \}\); a\.setSelectionRange\(p\.ini, p\.ini\); a\.scrollTop = desplazamientoHasta\(a, p\.ini\)/)
    assert.match(f, /cuerpoEl\(\)\?\.querySelectorAll\('section\[class\*="_sec__"\]'\)\[i\]\?\.scrollIntoView\(\{ behavior: reducido \? 'auto' : 'smooth', block: 'start' \}\)/)
    assert.match(f, /document\.addEventListener\('selectionchange', alMover\)/); assert.match(f, /setActivaSec\(parteDeCaret\(a\.value, a\.selectionStart \?\? 0\)\)/); assert.match(f, /parteAlcanzada\(Array\.from\(c\.querySelectorAll\('section\[class\*="_sec__"\]'\)\)\.map\(x => x\.getBoundingClientRect\(\)\.top\), arriba \+ 24\)/)
    assert.match(f, /setActivaSec\(Math\.max\(0, partesDeDocumento\(r\.doc\.texto\)\.length - 1\)\)/, 'al agregar una parte queda activa la nueva')
    assert.match(f, /alDesplazar\(\)      \/\/ al entrar al modo Acordes la activa se recalcula/, 'al entrar al modo Acordes la activa se recalcula')
    const m = leer('components/canciones/nueva/posicionTexto.ts'); assert.match(m, /return Math\.max\(0, alto - linea - respiro\)/, 'la primera parte queda en scrollTop 0'); assert.match(m, /white-space:pre-wrap/); assert.match(m, /area\.clientWidth - \(parseFloat\(cs\.paddingLeft\) \|\| 0\) - \(parseFloat\(cs\.paddingRight\) \|\| 0\)/)
    assert.ok(N.TEXTOS_NUEVA.agregarParteBoton === 'Agregar una parte' && N.TEXTOS_NUEVA.parteSinNombre === 'Sin nombre') })
  terminar()
})
