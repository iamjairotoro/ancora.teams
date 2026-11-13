// Estructura de «Nueva canción», paso S4: la hoja «Agregar a la estructura» (tablero 6b). Arriba «Volver a usar una parte» (las que ya existen: entran a la estructura sin escribir su letra otra vez), abajo «Parte nueva» (los ocho tipos). El consejo de «Repetir» se fue.
// Con arreglo propio las partes de arriba salen apagadas, con el aviso. Conexión en el editor: «volver a usar» agrega UNA referencia al final de la estructura, sin crear sección. DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts')), S = require(path.join(RAIZ, 'lib/estructuraCancion.ts')), Sel = require(path.join(RAIZ, 'components/canciones/nueva/SelectorParte.tsx'))

const TEXTO = 'VERSO 1:\nuna línea\n\nCORO:\nlínea del coro\n\nPUENTE:\nlínea del puente'
const doc = E.docVacio(TEXTO)
const REUSABLES = [{ clave: 'VERSO 1#0', abrev: 'V1', color: 'v', etiqueta: 'Verso 1' }, { clave: 'CORO#0', abrev: 'C', color: 'c', etiqueta: 'Coro' }, { clave: 'PUENTE#0', abrev: 'Bd', color: 'bd', etiqueta: 'Puente' }]
const hoja = (o = {}) => R(h(Sel.HojaAgregarParte, { doc, reusables: REUSABLES, onReusar() {}, onElegir() {}, onCerrar() {}, ...o }))

correr(async () => {
  await prueba('la hoja (tablero 6b): título «Agregar a la estructura», «Volver a usar una parte» con su ayuda y las partes que ya existen, y «Parte nueva» con su ayuda y los ocho tipos; el de arriba va primero', () => {
    const m = hoja()
    assert.ok(m.includes('role="dialog"') && m.includes('aria-modal="true"') && m.includes('aria-label="Agregar a la estructura"') && m.includes('<h2>Agregar a la estructura</h2>') && m.includes('aria-label="Cerrar"'))
    assert.ok(m.includes('>Volver a usar una parte</h3>') && m.includes('Entra en la estructura sin escribir su letra otra vez.') && m.includes('>Parte nueva</h3>') && m.includes('Tiene su propia letra y acordes.'))
    assert.ok(m.indexOf('Volver a usar una parte') < m.indexOf('>Parte nueva</h3>'), 'primero reusar, después crear')
    const [arriba, abajo] = m.split('>Parte nueva</h3>')
    for (const [k, a, n] of [['v', 'V1', 'Verso 1'], ['c', 'C', 'Coro'], ['bd', 'Bd', 'Puente']]) assert.ok(arriba.includes(`data-parte="${k}"`) && arriba.includes(`>${a}</span>`) && arriba.includes(`>${n}</span>`), n)
    for (const n of ['Verso 2', 'Coro 2', 'Puente 2', 'Interludio', 'Instrumental', 'Tag', 'Final']) assert.ok(abajo.includes(`>${n}</span>`), n + ' (parte nueva, con el número que recibiría)')
    assert.equal((m.match(/<button/g) || []).length, 1 + 3 + 8, 'cerrar + 3 reusables + 8 tipos'); assert.ok(m.includes('aria-label="Volver a usar una parte"') && m.includes('aria-label="Parte nueva"'), 'cada grupo se anuncia por su nombre') })

  await prueba('sin partes que reusar (documento vacío) solo sale «Parte nueva»; el consejo de «Repetir» ya no existe en ningún sitio', () => {
    const vacia = R(h(Sel.HojaAgregarParte, { doc: E.docVacio(), reusables: [], onReusar() {}, onElegir() {}, onCerrar() {} }))
    assert.ok(!vacia.includes('Volver a usar') && vacia.includes('>Parte nueva</h3>') && (vacia.match(/<button/g) || []).length === 1 + 8)
    assert.ok(!hoja().includes('se repite con la misma letra') && !hoja().includes('Repetir'), 'sin el consejo'); assert.ok(!('consejoRepetir' in N.TEXTOS_NUEVA) && !('agregarParteAyuda' in N.TEXTOS_NUEVA)) })

  await prueba('con arreglo propio (`bloqueado`): las partes de arriba salen apagadas y con el aviso «Esta canción ya tiene un orden propio guardado…»; «Parte nueva» sigue activa; sin `bloqueado` no hay aviso ni botón apagado', () => {
    const b = hoja({ bloqueado: true }), arriba = b.split('>Parte nueva</h3>')[0], abajo = b.split('>Parte nueva</h3>')[1]
    assert.equal((arriba.match(/disabled=""/g) || []).length, 3, 'las 3 apagadas'); assert.ok(b.includes('Esta canción ya tiene un orden propio guardado. Para no pisarlo, la estructura no se puede cambiar aquí.') && b.includes('role="note"')); assert.ok(!abajo.includes('disabled'), 'crear una parte nueva no toca el orden guardado')
    const s = hoja(); assert.ok(!s.includes('disabled') && !s.includes('role="note"')) })

  await prueba('el editor: «volver a usar» agrega UNA referencia al final de la estructura (agregarReferencia), deja activo ese lugar y lleva a su parte; sin lugar (60) avisa; no crea sección ni escribe en el texto', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const reusarParte = \(clave: string\) => \{\s*\n\s*setAgregando\(false\)\s*\n\s*const r = agregarReferencia\(pasos, clave, nombresPartes\)\s*\n\s*if \(!r\) \{ setError\(TEXTOS_NUEVA\.limiteEstructura\); return \}\s*\n\s*guardarPasos\(r\); setError\(null\); setPasoSel\(r\.length - 1\); irASeccion\(Math\.max\(0, parteDeReferencia\(r, nombresPartes, r\.length - 1\)\)\)/)
    const cuerpo = f.slice(f.indexOf('const reusarParte'), f.indexOf('const elegirParte')); assert.ok(!/registrar\(|setHist|agregarParte\(/.test(cuerpo), 'no toca el documento')
    assert.match(leer('components/canciones/nueva/SelectorParte.tsx'), /disabled=\{bloqueado\} onClick=\{\(\) => onReusar\(r\.clave\)\}/, 'cada botón reusa SU parte')
    assert.match(f, /<HojaAgregarParte doc=\{doc\} reusables=\{reusables\} bloqueado=\{!!carga\?\.arregloPropio\} onReusar=\{reusarParte\} onElegir=\{elegirParte\} onCerrar=\{\(\) => setAgregando\(false\)\} \/>/)
    assert.match(f, /const reusables: ParteReusable\[\] = useMemo\(\(\) => \{ const claves = clavesDeLasPartes\(nombresPartes\)/); assert.equal((f.match(/fetch\(/g) || []).length, 2, 'sin peticiones nuevas') })

  await prueba('lo que hace agregarReferencia con la hoja: una parte ya usada entra de nuevo (queda repetida), una que no está en el texto no entra, y a 60 lugares ya no cabe', () => {
    const nombres = ['VERSO 1', 'CORO', 'PUENTE'], [V1, C, Bd] = S.clavesDeLasPartes(nombres)
    assert.deepEqual(S.agregarReferencia([V1, C, Bd], C, nombres), [V1, C, Bd, C]); assert.deepEqual(S.repetidas(S.agregarReferencia([V1, C, Bd], C, nombres)), [false, false, false, true])
    assert.equal(S.agregarReferencia([V1, C, Bd], 'FINAL#0', nombres), null); assert.equal(S.agregarReferencia(Array(60).fill(C), V1, nombres), null)
    assert.equal(N.TEXTOS_NUEVA.limiteEstructura, 'La estructura admite hasta 60 lugares.'); assert.equal(S.MAX_PASOS, 60) })

  await prueba('textos de la hoja y estilos: los de la maqueta; los títulos de grupo y el aviso viven en el CSS de la hoja', () => {
    const T = N.TEXTOS_NUEVA; assert.equal(T.agregarEstructuraTitulo, 'Agregar a la estructura'); assert.equal(T.reusarTitulo, 'Volver a usar una parte'); assert.equal(T.parteNuevaTitulo, 'Parte nueva')
    const css = leer('components/canciones/nueva/selector-parte.module.css'); assert.match(css, /\.grupoTitulo\{/); assert.match(css, /\.grupo\{/) })
  terminar()
})
