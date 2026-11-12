// Estructura de «Nueva canción», paso S3: la tira del editor ES la estructura (un círculo por aparición, borde punteado desde la segunda, cabecera «Estructura · N partes»). Ayudas puras de lib/estructuraCancion.ts (repetidas, pasoActivo, seguidasEn, fijarSeguidas),
// la tira (`repetida`, `etiqueta`), la nota «Esta letra se usa N veces…» del modo Acordes y la conexión en el editor (el guardado manda `estructura`, con arreglo propio la estructura guardada se muestra de solo lectura). DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const S = require(path.join(RAIZ, 'lib/estructuraCancion.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), N = require(path.join(RAIZ, 'lib/nuevaCancion.ts'))
const Tira = require(path.join(RAIZ, 'components/canciones/lectura/TiraPartes.tsx')).default, Modo = require(path.join(RAIZ, 'components/canciones/ModoAcordes.tsx')).default

const NOMBRES = ['VERSO 1', 'VERSO 2', 'CORO', 'PUENTE', 'VERSO 3']
const [V1, V2, C, Bd, V3] = S.clavesDeLasPartes(NOMBRES)
const TEXTO = 'VERSO 1:\nuna línea\n\nCORO:\nlínea del coro'

correr(async () => {
  await prueba('repetidas: marca solo las apariciones que ya salieron antes (V1, V2, C, V1, V2, C, Bd, V3, C → 4.º, 5.º, 6.º y 9.º)', () => {
    assert.deepEqual(S.repetidas([V1, V2, C, V1, V2, C, Bd, V3, C]), [false, false, false, true, true, true, false, false, true])
    assert.deepEqual(S.repetidas([]), []); assert.deepEqual(S.repetidas([C, C, C]), [false, true, true]); assert.deepEqual(S.repetidas([V1, V2]), [false, false]) })

  await prueba('seguidasEn: el largo de la tanda de referencias seguidas a la misma parte donde está el paso (1 si está sola; 0 fuera de rango)', () => {
    const est = [V1, C, C, C, V2, C]
    assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => S.seguidasEn(est, i)), [1, 3, 3, 3, 1, 1]); for (const i of [-1, 6, 1.5, NaN]) assert.equal(S.seguidasEn(est, i), 0, String(i)) })

  await prueba('fijarSeguidas: deja la tanda con exactamente n copias (1 a 9) sin tocar el resto; null si no cabe en 60 pasos o n no es válido; no modifica lo que recibe', () => {
    const est = Object.freeze([V1, C, V2, C])
    assert.deepEqual(S.fijarSeguidas(est, 1, 3), [V1, C, C, C, V2, C]); assert.deepEqual(S.fijarSeguidas(est, 3, 2), [V1, C, V2, C, C])
    assert.deepEqual(S.fijarSeguidas([V1, C, C, C, V2], 2, 1), [V1, C, V2], 'bajar a 1 deja una sola referencia'); assert.deepEqual(S.fijarSeguidas([V1, C, C, V2], 1, 2), [V1, C, C, V2], 'misma cantidad: igual')
    assert.deepEqual(S.fijarSeguidas([C], 0, 9), Array(9).fill(C))
    for (const n of [0, 10, 1.5, NaN, '3']) assert.equal(S.fijarSeguidas(est, 1, n), null, String(n))
    assert.equal(S.fijarSeguidas(est, 9, 2), null, 'paso fuera de rango')
    const lleno = Array.from({ length: 60 }, (_, i) => (i % 2 ? V2 : C)); assert.equal(S.fijarSeguidas(lleno, 0, 2), null, 'ya hay 60: no cabe una más'); assert.equal(S.fijarSeguidas(lleno, 0, 1).length, 60, 'pero dejar como está sí') })

  await prueba('pasoActivo: manda la parte activa; si el último círculo tocado ya es de esa parte se queda ese (el 2.º coro sigue activo aunque el 1.º también sea el coro); si no, el primero de esa parte', () => {
    const est = [V1, V2, C, V1, V2, C, Bd, V3, C], i = n => NOMBRES.indexOf(n)
    assert.equal(S.pasoActivo(est, NOMBRES, i('CORO'), 5), 5, 'tocó el 2.º coro y el coro es la activa'); assert.equal(S.pasoActivo(est, NOMBRES, i('CORO'), 8), 8)
    assert.equal(S.pasoActivo(est, NOMBRES, i('CORO'), 0), 2, 'lo tocado era de otra parte: el primer coro'); assert.equal(S.pasoActivo(est, NOMBRES, i('PUENTE'), 5), 6)
    assert.equal(S.pasoActivo(est, NOMBRES, i('VERSO 1'), 99), 0, 'un paso tocado que ya no existe se ignora'); assert.equal(S.pasoActivo(est, NOMBRES, i('VERSO 1'), -1), 0)
    assert.equal(S.pasoActivo([], NOMBRES, 0, 0), 0, 'sin estructura: 0'); assert.equal(S.pasoActivo([V1, C], ['VERSO 1', 'CORO'], 7, 1), 1, 'una parte activa que no está en la estructura deja el paso tocado (sin salirse de la lista)') })

  await prueba('la tira dibuja `repetida` con data-repetida y `etiqueta` como nombre accesible; sin ellas (la lectura) no cambia nada: ni atributo ni insignia de más', () => {
    const partes = [{ abrev: 'C', clave: 'c', nombre: 'Coro', repeat: 1, etiqueta: 'Coro, lugar 1 de 2' }, { abrev: 'C', clave: 'c', nombre: 'Coro', repeat: 1, repetida: true, etiqueta: 'Coro, lugar 2 de 2' }]
    const html = R(h(Tira, { partes, activa: 0, onIr() {} }))
    assert.equal((html.match(/data-repetida="true"/g) || []).length, 1, 'solo la repetida'); assert.ok(html.includes('aria-label="Coro, lugar 1 de 2"') && html.includes('aria-label="Coro, lugar 2 de 2"')); assert.ok(!html.includes('class="rep"'), 'sin insignia con repeat 1')
    const lectura = R(h(Tira, { partes: [{ abrev: 'C', clave: 'c', nombre: 'Coro', repeat: 3 }], activa: 0, onIr() {} })); assert.ok(!lectura.includes('data-repetida') && lectura.includes('aria-label="Coro, 3 veces"') && lectura.includes('class="rep"'), 'la lectura sigue con su insignia ×N') })

  await prueba('el borde punteado vive en la tira (CSS) y la cabecera reserva su alto; textos: «Estructura · 9 partes» (1 → «1 parte»), «Borde punteado = se repite», «Coro, lugar 6 de 9», nota de usos', () => {
    assert.match(leer('components/canciones/lectura/lectura-partes.module.css'), /\.circ\[data-repetida="true"\]\{ border-style:dashed; \}/)
    assert.equal(N.TEXTOS_NUEVA.estructuraTitulo(9), 'Estructura · 9 partes'); assert.equal(N.TEXTOS_NUEVA.estructuraTitulo(1), 'Estructura · 1 parte'); assert.equal(N.TEXTOS_NUEVA.estructuraBorde, 'Borde punteado = se repite')
    assert.equal(N.TEXTOS_NUEVA.lugarEnEstructura('Coro', 6, 9), 'Coro, lugar 6 de 9'); assert.equal(N.TEXTOS_NUEVA.usosDeLaLetra(3), 'Esta letra se usa 3 veces en la estructura. Se escribe una sola vez.') })

  await prueba('modo Acordes: con `usos` la parte que sale más de una vez lleva la nota «Esta letra se usa N veces…»; la que sale una vez no; sin `usos` (editor de siempre) no hay nota', () => {
    const doc = E.docVacio(TEXTO), props = { doc, tono: 'F', onCambio() {} }
    const con = R(h(Modo, { ...props, usos: [1, 3] })); assert.equal((con.match(/Esta letra se usa/g) || []).length, 1); assert.ok(con.includes('Esta letra se usa 3 veces en la estructura. Se escribe una sola vez.') && con.includes('role="note"'))
    const orden = con.indexOf('Esta letra se usa'), coro = con.indexOf('CORO'), verso = con.indexOf('VERSO 1'); assert.ok(verso < coro && coro < orden, 'la nota va bajo el nombre del CORO')
    assert.ok(!R(h(Modo, { ...props, usos: [1, 1] })).includes('Esta letra se usa')); assert.ok(!R(h(Modo, props)).includes('Esta letra se usa')) })

  await prueba('el editor: la estructura se calcula solo en el flujo nuevo; por defecto sigue al texto; con arreglo propio sale de la guardada (solo lectura); lo propio se guarda null si vuelve a ser la de por defecto', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const pasos: Estructura = useMemo\(\(\) => \{\s*\n\s*if \(!nueva\) return \[\]/); assert.match(f, /if \(carga\?\.arregloPropio\) \{ const g = carga\.estructuraGuardada, d = g\?\.length \? desdeEntradas\(g, nombresPartes\) : \[\]; return d\.length \? normalizar\(d, nombresPartes\) : estructuraPorDefecto\(nombresPartes\) \}/)
    assert.match(f, /return propia \? normalizar\(propia, nombresPartes\) : estructuraPorDefecto\(nombresPartes\)/); assert.match(f, /const guardarPasos = \(e: Estructura\) => setPropia\(esPorDefecto\(e, nombresPartes\) \? null : e\)/)
    assert.match(f, /type Cargado = \{ arregloPropio\?: boolean; estructuraGuardada\?: \{ indice: number; repeat: number \}\[\] \| null;/); assert.ok(!/repeticiones|arregloParaGuardar|conRepeticion/.test(f), 'ya no hay un segundo estado de repeticiones')
    assert.match(f, /setPropia\(null\); setPasoSel\(0\)/, 'al cargar la canción la estructura vuelve a la de por defecto') })

  await prueba('el editor: Guardar manda `estructura` (entradas {indice, repeat}) solo en el flujo nuevo, sin arreglo propio y si la estructura NO es la de por defecto; ya no manda `arreglo`', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /const entradas = nueva && !carga\.arregloPropio \? estructuraParaGuardar\(pasos, nombresPartes\) : undefined/); assert.match(f, /\.\.\.\(entradas \? \{ estructura: entradas \} : \{\}\) \}\)/); assert.ok(!/arreglo: |\{ arreglo \}/.test(f.replace(/arregloPropio|confirmarArreglo|arregloOk/g, '')), 'el cuerpo ya no lleva `arreglo`')
    assert.equal((f.match(/fetch\(/g) || []).length, 2, 'sin peticiones nuevas') })

  await prueba('el editor: cabecera «Estructura · N partes» (la leyenda del borde solo si hay repetidas) y un círculo por aparición; tocar un círculo lleva a SU parte y recuerda el paso; el menú recibe el lugar (paso)', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(f, /<div className=\{ui\.estructuraCab\}>\{partesTira\.length > 0 && <><span className=\{ui\.estructuraTitulo\}>\{TEXTOS_NUEVA\.estructuraTitulo\(partesTira\.length\)\}<\/span>\{hayRepetidas && <span>\{TEXTOS_NUEVA\.estructuraBorde\}<\/span>\}<\/>\}<\/div>/)
    assert.match(f, /const irAPaso = \(k: number\) => \{ setPasoSel\(k\); irASeccion\(Math\.max\(0, parteDeReferencia\(pasos, nombresPartes, k\)\)\) \}/)
    assert.match(f, /repetida: rep\[k\], etiqueta: TEXTOS_NUEVA\.lugarEnEstructura\(n, k \+ 1, pasos\.length\)/); assert.match(f, /usos=\{nueva \? usosPorParte : undefined\}/) })

  await prueba('la ruta y el esquema no cambian en este paso: sin peticiones nuevas ni migraciones; la lectura del músico y TiraPartes sin `repetida` quedan como estaban', () => {
    assert.ok(!/estructura/.test(leer('app/portal/_components/lectura/LecturaCancion.tsx')), 'la lectura no conoce la estructura del editor')
    assert.ok(!fs.readdirSync(path.join(RAIZ, 'migrations')).some(x => /^057/.test(x)), 'sin migraciones nuevas') })
  terminar()
})
