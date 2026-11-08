// «Acordes sobre la letra»: la línea de letra con acordes, partida por palabra (lib/palabrasConAcordes.ts) y el módulo de dibujo que comparten el editor móvil y la hoja de lectura. Todo es dibujo: ningún dato guardado cambia.
// Correr: `node tests/portal/palabras-con-acordes.test.js`   (el comportamiento en un navegador real: tests/e2e-menus/acordes-sobre-letra.js)
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), cp = require('child_process'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const { agruparPalabras } = require(path.join(RAIZ, 'lib/palabrasConAcordes.ts'))
const Linea = require(path.join(RAIZ, 'components/canciones/LineaConAcordes.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const T = (texto, acorde, marca) => ({ texto, ...(acorde !== undefined ? { acorde } : {}), ...(marca ? { marca: true } : {}) })
const planas = palabras => palabras.flat()
const forma = palabras => palabras.map(p => p.map(x => x.texto + (x.acorde !== undefined ? '/' + x.acorde : '')).join('·')).join(' | ')

correr(async () => {
  await prueba('el texto no cambia: unir las piezas da la línea exacta, y `ini` es el índice de cada pieza dentro de la línea (con espacios dobles, al inicio, al final y trozos que cortan palabras)', () => {
    const casos = [
      [T('El esplendor ', 'G'), T('de un rey', 'D')], [T('vest', 'C'), T('ido en ', 'Em'), T('majestad')], [T('  con espacios  dobles  ', 'A')], [T('a', 'F#m7'), T('b', 'Cm7'), T('c')], [T('uno'), T(' dos'), T(' tres', 'G')],
      [T('Señor de toda la tierra y de todo el cielo, rey de reyes ', 'D'), T('amén', 'G')], [T('palabra'), T('', 'D')], [T('', 'G')], [T('Aquí ', 'G'), T('va ', 'C', true), T('', 'D')],
    ]
    for (const c of casos) {
      const w = planas(agruparPalabras(c)), unido = c.map(x => x.texto).join('')
      assert.equal(w.map(x => x.texto).join(''), unido, JSON.stringify(c))
      let pos = 0; for (const x of w) { assert.equal(x.ini, pos, `ini de «${x.texto}» en ${JSON.stringify(c)}`); pos += x.texto.length }
      for (const x of w) assert.equal(unido.slice(x.ini, x.ini + x.texto.length), x.texto)
    }
    // con trozos al azar: la misma garantía
    let s = 7; const az = n => (s = (s * 48271) % 2147483647) % n, trozoAz = () => T(Array.from({ length: az(6) }, () => 'ab c é'[az(7)]).join(''), az(3) ? undefined : 'X', !az(4))
    for (let i = 0; i < 400; i++) { const c = Array.from({ length: 1 + az(5) }, trozoAz), w = planas(agruparPalabras(c)); assert.equal(w.map(x => x.texto).join(''), c.map(x => x.texto).join('')) } })

  await prueba('cada acorde sale UNA vez, en la primera pieza de su trozo y en su posición; el resto del trozo no lo repite (tampoco la marca del cursor)', () => {
    const w = agruparPalabras([T('Cuán grande es ', 'G'), T('Él', 'D', true)])
    assert.equal(forma(w), 'Cuán /G | grande  | es  | Él/D'); const todas = planas(w)
    assert.equal(todas.filter(x => x.acorde === 'G').length, 1); assert.deepEqual(todas.filter(x => x.acorde !== undefined).map(x => [x.acorde, x.ini]), [['G', 0], ['D', 15]])
    assert.deepEqual(todas.filter(x => x.marca).map(x => x.ini), [15], 'la marca del cursor solo en su pieza')
    const v = planas(agruparPalabras([T('uno dos tres ', 'C', true)])); assert.deepEqual(v.map(x => [x.texto, x.acorde, !!x.marca]), [['uno ', 'C', true], ['dos ', undefined, false], ['tres ', undefined, false]], 'un trozo de varias palabras: acorde y cursor solo en la primera pieza') })

  await prueba('se parte POR PALABRA: los espacios van pegados a la palabra de antes (una fila nunca empieza con espacio) y una palabra cortada por un acorde («vest|ido») es UNA palabra de dos piezas', () => {
    assert.equal(forma(agruparPalabras([T('El esplendor de un rey', 'G')])), 'El /G | esplendor  | de  | un  | rey')
    const w = agruparPalabras([T('vest', 'C'), T('ido en ', 'Em'), T('majestad')]); assert.equal(forma(w), 'vest/C·ido /Em | en  | majestad'); assert.equal(w[0].length, 2, '«vestido» no se rompe entre filas')
    assert.equal(w.every(p => !/^\s/.test(p[0].texto) || p === w[0]), true)
    assert.equal(forma(agruparPalabras([T('   hola')])), '   ' + ' | hola', 'los espacios del inicio (3) van en su propio grupo y no se pierden') })

  await prueba('«siempre amén»: dos trozos que se tocan en un espacio son dos palabras distintas, así que pueden ir en la MISMA fila (antes el trozo siguiente siempre saltaba a una fila nueva)', () => {
    const w = agruparPalabras([T('Señor de señores para siempre ', 'D'), T('amén', 'G')]); assert.equal(forma(w), 'Señor /D | de  | señores  | para  | siempre  | amén/G')
    assert.equal(w.length, 6, 'cada palabra es un grupo propio'); assert.ok(w.every(p => p.length === 1)) })

  await prueba('un acorde al final de la línea (trozo sin texto) y el cursor al final se pegan a la ÚLTIMA palabra; una línea vacía abre su propio grupo', () => {
    const w = agruparPalabras([T('El esplendor de un rey'), T('', 'Em')]); assert.equal(forma(w), 'El  | esplendor  | de  | un  | rey·/Em'); assert.equal(w[w.length - 1].length, 2, 'queda DENTRO del grupo de «rey»: se mueve con él')
    assert.equal(forma(agruparPalabras([T('', 'G')])), '/G'); assert.equal(agruparPalabras([]).length, 0)
    const c = agruparPalabras([T('rey'), T('', undefined, true)]); assert.deepEqual(planas(c).map(x => [x.texto, !!x.marca]), [['rey', false], ['', true]]) })

  await prueba('guion en el hueco: solo una pieza seguida de otra pieza CON texto de la misma palabra lleva data-medio; el acorde al final, el límite de palabra y la última pieza no; es solo dibujo (CSS, sin texto)', () => {
    const medio = trozos => (renderToStaticMarkup(React.createElement(Linea, { trozos, acorde: p => p.acorde })).match(/data-t="" data-medio=""/g) || []).length
    assert.equal(medio([T('vest', 'G'), T('i', 'Cm7'), T('do', 'F')]), 2, 'vest|i|do: dos cortes dentro de la palabra')
    assert.equal(medio([T('El esplendor de un rey'), T('', 'Em')]), 0, 'acorde al final de la línea: no es mitad de palabra')
    assert.equal(medio([T('vestido en majestad', 'G')]), 0); assert.equal(medio([T('vesti', 'G'), T(' do', 'D')]), 0, 'el corte cae en un espacio: no es mitad de palabra')
    const css = leer('components/canciones/linea-con-acordes.module.css')
    assert.ok(/\.tx\[data-medio\]:not\(:empty\)\{ display:flex; \}/.test(css) && /\.tx\[data-medio\]:not\(:empty\)::after\{ content:''; flex:1 1 0; min-width:0;/.test(css), 'el guion llena el hueco y no suma ancho')
    assert.ok(!/\.tx\[data-medio\][^{]*::after\{[^}]*content:'[^']/.test(css), 'sin texto: nada que copiar ni guardar') })

  await prueba('ninguna pieza con texto queda vacía y solo los trozos sin texto dan piezas sin texto', () => {
    const c = [T('a b ', 'G'), T('c'), T('', 'D'), ], w = planas(agruparPalabras(c)); assert.equal(w.filter(x => x.texto === '').length, 1)
    for (const x of planas(agruparPalabras([T(' x ', 'A'), T('y z')]))) assert.ok(x.texto.length > 0) })

  await prueba('dibujo: el acorde va en el carril de SU pieza, encima de su texto; el trozo vacío del final se dibuja dentro de la última palabra y con altura de línea (CSS)', () => {
    const h = renderToStaticMarkup(React.createElement(Linea, { className: 'linea', trozos: [T('El esplendor de un rey'), T('', 'Em')], acorde: p => p.acorde }))
    assert.ok(/class="pal"><span class="pieza"><span class="ac" data-a=""[^>]*>[^<]*<\/span><span class="tx" data-t="">rey<\/span><\/span><span class="pieza"><span class="ac" data-a="">Em<\/span><span class="tx" data-t=""><\/span><\/span><\/span><\/div>$/.test(h), h)
    const css = leer('components/canciones/linea-con-acordes.module.css')
    assert.ok(/\.tx:empty::after\{ content:'\\200b'; \}/.test(css), 'un texto vacío conserva la altura de una línea'); assert.ok(/\.pal\{ display:inline-flex;/.test(css) && /\.pieza\{ display:inline-flex; flex-direction:column;/.test(css))
    assert.ok(/overflow-wrap:anywhere/.test(css), 'una palabra más larga que la pantalla se parte en vez de salirse') })

  await prueba('relleno mínimo: el carril del acorde solo deja .3em a la derecha (antes .55em y .6em), y un acorde ancho sobre una sílaba corta ensancha la pieza lo que le falta, sin más', () => {
    const css = leer('components/canciones/linea-con-acordes.module.css'); const m = /\.ac\{[^}]*padding:0 ([\d.]+)em 0 0;/.exec(css); assert.ok(m, 'relleno derecho del carril'); assert.ok(Number(m[1]) <= 0.3, 'relleno ≤ .3em')
    for (const f of ['components/canciones/editor-cancion-movil.module.css', 'components/canciones/hoja-acordes.module.css']) { const c = leer(f); assert.ok(!/\.seg2\{|\.pieza\{/.test(c), f + ' ya no tiene su propia copia del dibujo'); assert.ok(!/\.ac\{[^}]*padding:0 \.55em/.test(c) && !/padding-right:\.6em/.test(c)) } })

  await prueba('UN solo módulo de dibujo: el editor (ModoAcordes) y la lectura (HojaAcordes) usan LineaConAcordes y ninguno parte la línea por su cuenta', () => {
    for (const f of ['components/canciones/ModoAcordes.tsx', 'components/canciones/HojaAcordes.tsx']) { const c = sinComentarios(leer(f)); assert.ok(c.includes("import LineaConAcordes from './LineaConAcordes'") && /<LineaConAcordes[\s\S]*?trozos=/.test(c), f); assert.ok(!/seg2|ui\.pieza|ui\.tx\b/.test(c), f + ' no dibuja trozos por su cuenta') }
    const comp = sinComentarios(leer('components/canciones/LineaConAcordes.tsx')); assert.ok(comp.includes("agruparPalabras(trozos)")) })

  await prueba('solo dibujo: ni el módulo, ni la función ni los dos componentes tocan datos (sin fetch, sin supabase, sin almacenamiento) y el modelo del documento y el guardado no cambian respecto de main', () => {
    for (const f of ['lib/palabrasConAcordes.ts', 'components/canciones/LineaConAcordes.tsx', 'components/canciones/HojaAcordes.tsx']) assert.ok(!/fetch\(|supabase|localStorage|sessionStorage/.test(sinComentarios(leer(f))), f)
    let hayGit = true; try { cp.execSync('git rev-parse --verify main', { cwd: RAIZ, stdio: 'ignore' }) } catch { hayGit = false }
    if (hayGit) for (const f of ['lib/admin/guardarAcordes.ts', 'app/api/admin/canciones/acordes/route.ts', 'lib/acordes.ts', 'lib/lecturaAcordes.ts', 'lib/portal/acordesCancion.ts', 'components/canciones/LyricSheet.tsx', 'app/songs.css']) {      // lib/editorAcordes.ts (editor v2: «+», mover, siguiente palabra) y EditorCancionMovil.tsx ya no están: EditorCancionMovil.tsx: lleva el aviso de error (tests/portal/aviso-editor-acordes.test.js comprueba que su cuerpo de Guardar no cambia)
      const dif = cp.spawnSync('git', ['diff', '--quiet', 'main', '--', f], { cwd: RAIZ }); assert.equal(dif.status, 0, f + ' debe quedar igual que en main') } })

  await prueba('el cursor del editor es una línea fina de alto completo con un punto arriba; el área de toque del acorde es mayor que su texto sin ensanchar la línea; el editor sigue solo en teléfono', () => {
    const css = leer('components/canciones/editor-cancion-movil.module.css')
    assert.ok(/\.caret::before\{[^}]*top:\d+px; bottom:\d+px; width:2px/.test(css) && /\.caret::after\{[^}]*width:8px; height:8px; border-radius:50%/.test(css), 'línea y punto')
    assert.ok(/\.ac::after\{ content:''; position:absolute; inset:-6px -4px; \}/.test(css), 'área de toque mayor, fuera del flujo')
    assert.ok(/telefono && isAdmin &&/.test(sinComentarios(leer('components/canciones/CancionesPanel.tsx')))) })
  terminar()
})
