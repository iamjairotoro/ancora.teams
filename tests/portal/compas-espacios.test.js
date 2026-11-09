// Espacios en las líneas de acordes (commit aparte: se puede quitar sin tocar el resto del editor v2): (1) el guardado acepta SOLO piezas de 1 a 8 espacios simples; (2) la lectura pasa a `white-space: pre-wrap` en `.compas` y las líneas ya guardadas
// se ven IGUAL (HTML idéntico al de antes y, en un navegador real, la misma caja: tests/e2e-menus/compas-pre-wrap.js). Sin migración: son los mismos jsonb.
// Correr: `node tests/portal/compas-espacios.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const BASE = '499ac8d'      // el commit de main justo antes del editor v2: «igual que antes» se compara contra él (no contra `main`, que cambia al fusionar)
const hayBase = require('fs').existsSync(require('path').join(RAIZ, '.git')) && require('child_process').spawnSync('git', ['cat-file', '-e', BASE + '^{commit}'], { cwd: RAIZ }).status === 0
const Module = require('module'), path = require('path'), fs = require('fs'), cp = require('child_process'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const { seccionesParaMostrar } = require(path.join(RAIZ, 'lib/lecturaAcordes.ts')), { convertirLinea } = require(path.join(RAIZ, 'lib/acordes.ts'))
const HojaAcordes = require(path.join(RAIZ, 'components/canciones/HojaAcordes.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const hayGit = hayBase
const A = (g, cal = '') => ({ g, cal }), C = g => ({ acorde: A(g) })
const lineaBars = items => ({ kind: 'bars', items })
const valida = items => G.lineaValida(lineaBars(items))

// Las líneas de compases que YA existen en la base (de la conversión del formato 1: «| G D | Em C |», «x2», «N.C.»…): ninguna trae espacios.
const LEGADAS = [
  [{ texto: '|' }, C(1), C(5), { texto: '|' }, C(6, 'm'), C(4), { texto: '|' }], [C(1), { texto: 'x2' }], [{ texto: 'N.C.' }, C(5)], [C(1), { texto: '/' }, C(4), { texto: '/' }, C(5), { texto: '||' }],
  Array.from({ length: 40 }, (_, i) => (i % 5 === 4 ? { texto: '|' } : C(1 + (i % 7)))),                                  // una línea larga que se parte en varias filas
  [{ texto: '(repetir)' }, C(2, 'm'), { texto: 'Amen' }],
]

correr(async () => {
  await prueba('guardado: una pieza de espacio son de 1 a 8 espacios simples (U+0020) y nada más; ni vacía, ni 9, ni saltos de línea, tabulaciones u otros espacios Unicode, ni mezclada con otro texto', () => {
    for (let n = 1; n <= 8; n++) assert.ok(valida([C(1), { texto: ' '.repeat(n) }, C(5)]), `${n} espacio(s) valen`)
    // (Sin cambio: una pieza de UN carácter que no cuenta como espacio en JavaScript, como U+200B o U+0085, ya valía antes de este commit como texto de compás; no se toca aquí.)
    const malos = ['', ' '.repeat(9), ' '.repeat(40), '\n', ' \n', '\t', ' \t', '\r', '\u00a0', '\u2003', '\u2007', '\u202f', '\u3000', '\u2028', '\u2029', '\u1680', '\ufeff', ' |', '| ', ' x', 'x ', 'a b', ' \u00a0', '\u00a0 ']
    for (const t of malos) assert.equal(valida([C(1), { texto: t }]), false, JSON.stringify(t) + ' NO vale')
    assert.equal(valida([{ texto: ' ', extra: 1 }]), false, 'una pieza con llaves de más tampoco'); assert.equal(valida([{ texto: 5 }]), false); assert.equal(valida([{ texto: null }]), false)
    assert.equal(valida([{ texto: ' ', acorde: A(1) }]), false, 'ni acorde y texto juntos')
    for (const t of ['|', 'x2', 'N.C.', '/', '||', '(rep)', 'Amen', 'a']) assert.ok(valida([{ texto: t }]), t + ' (lo de siempre) sigue valiendo')
    assert.equal(valida([{ texto: 'x'.repeat(9) }]), false, 'el tope de 8 de las piezas sin espacio sigue igual'); assert.equal(valida([]), false, 'una línea de acordes vacía sigue sin valer'); assert.equal(valida(Array.from({ length: 65 }, () => C(1))), false, 'y el tope de 64 piezas')
    assert.ok(valida(Array.from({ length: 64 }, (_, i) => (i % 2 ? { texto: ' '.repeat(8) } : C(1)))), '64 piezas con espacios caben')
  })
  await prueba('guardado completo: un cuerpo con líneas de acordes de espacios se valida; el editor genera piezas que el guardado acepta (todas las anchuras y varias líneas por sitio)', () => {
    const TEXTO = 'VERSO 1:\nAquí va\n\nINTERLUDIO:\n(instrumental)'
    let d = E.docVacio(TEXTO); const fin = E.finDeSeccion(d, 1), l1 = TEXTO.indexOf('Aquí va') + 7
    d = E.ponerLineaCompas(d, fin, 0, [C(1), E.nuevoEspacio(1), E.nuevoEspacio(8), { texto: '|' }, C(5)]); d = E.ponerLineaCompas(d, fin, 1, [E.nuevoEspacio(2), C(4)]); d = E.ponerLineaCompas(d, l1, 0, [C(6), E.nuevoEspacio(3)])
    const cuerpo = { songId: '11111111-1111-4111-8111-111111111111', tono: 'G', letra: d.texto, secciones: E.aSecciones(d), base: 'a'.repeat(32) }
    assert.deepEqual(G.validarCuerpo(cuerpo), { ok: true, datos: cuerpo }); assert.ok(G.textosCoinciden(cuerpo.letra, cuerpo.secciones))
    const roto = JSON.parse(JSON.stringify(cuerpo)); roto.secciones[1].lineas[0].items[1].texto = ' '.repeat(9); assert.deepEqual(G.validarCuerpo(roto), { ok: false, campo: 'secciones' })
    const raro = JSON.parse(JSON.stringify(cuerpo)); raro.secciones[1].lineas[0].items[1].texto = ' '; assert.deepEqual(G.validarCuerpo(raro), { ok: false, campo: 'secciones' })
    for (let n = 1; n <= E.ESPACIO_MAXIMO; n++) assert.ok(valida([E.nuevoEspacio(n)]), 'el editor ofrece hasta ' + E.ESPACIO_MAXIMO + ' y el guardado los acepta todos')
    assert.equal(E.ESPACIO_MAXIMO, 8, 'el tope del editor es el del guardado')
    assert.equal(E.ESPACIOS_EN_COMPAS, true, 'con la validación puesta, el botón «+ Espacio» está activo')
  })
  await prueba('lectura: las líneas de compases YA guardadas se dibujan con exactamente el mismo HTML que antes (comparado con una copia tomada antes del cambio) y sus textos no traen espacios de más', () => {
    const hoja = { tono: 'G', secciones: [{ code: 'V1', name: 'Estrofa 1', repeat: 1, lineas: [{ kind: 'lyric', segments: [{ text: 'Aquí ', acorde: A(1) }, { text: 'va ', acorde: A(4) }, { text: 'la letra' }] }, ...LEGADAS.map(lineaBars)] }, { code: 'C', name: 'Coro', repeat: 2, lineas: [lineaBars(LEGADAS[0])] }] }
    const tipo = { fontFamily: 'serif', textScale: 1, lineHeightWide: false }, prefs = { notation: 'americano', vista: 'ambos', compacta: false }
    const html = renderToStaticMarkup(React.createElement(HojaAcordes, { title: 'Grande es tu fidelidad', hoja, prefs, onPrefs() {}, typography: tipo }))
    assert.equal((html.match(/class="compas"/g) || []).length, 7, 'siete líneas de compases en la hoja')
    const dorado = fs.readFileSync(path.join(RAIZ, 'tests/portal/golden/hoja-compases-legados.html'), 'utf8')
    assert.equal(html, dorado, 'el HTML de la hoja con líneas ya guardadas es IDÉNTICO al de antes del cambio (la copia tomada con el código de main)')
    const lineas = seccionesParaMostrar(hoja, 'G', 'american').flatMap(s => s.lineas).filter(l => l.kind === 'bars')
    for (const l of lineas) assert.ok(/^\S(?: ?\S)*$/.test(l.bars), JSON.stringify(l.bars) + ': una línea ya guardada no empieza ni termina con espacios ni los repite; por eso `pre-wrap` y `normal` la dibujan igual')
    const nueva = seccionesParaMostrar({ tono: 'G', secciones: [{ code: 'V1', name: 'V', repeat: 1, lineas: [lineaBars([C(1), E.nuevoEspacio(3), C(5)])] }] }, 'G', 'american')[0].lineas[0].bars
    assert.equal(nueva, 'G' + ' '.repeat(5) + 'D', 'un espacio de 3 se lee como 3 espacios más el espacio de siempre entre piezas')
  })
  await prueba('lectura: SOLO cambia `.compas` (agrega white-space:pre-wrap); el componente, el módulo de dibujo y el formato de lectura quedan igual que antes del editor v2', () => {
    const css = leer('components/canciones/hoja-acordes.module.css')
    assert.ok(/\.compas\{[^}]*white-space:pre-wrap;[^}]*\}/.test(css), '`.compas` conserva los espacios')
    if (hayGit) {
      const vieja = cp.spawnSync('git', ['show', BASE + ':components/canciones/hoja-acordes.module.css'], { cwd: RAIZ, encoding: 'utf8' }).stdout
      assert.equal(css.replace(' white-space:pre-wrap;', ''), vieja, 'no se tocó ninguna otra regla de la hoja')
      for (const f of ['components/canciones/LineaConAcordes.tsx', 'components/canciones/linea-con-acordes.module.css', 'lib/acordes.ts', 'lib/lecturaAcordes.ts', 'lib/portal/acordesCancion.ts']) assert.equal(cp.spawnSync('git', ['diff', '--quiet', BASE, '--', f], { cwd: RAIZ }).status, 0, f + ' igual que antes del editor v2')
      // La validación de las líneas (`lineaValida`) es lo que este commit toca: se compara solo esa función con la de BASE (el resto del archivo ha crecido con el endurecimiento del guardado, que no tiene que ver con los espacios).
      const funcion = t => { const a = t.indexOf('export function lineaValida'), b = t.indexOf('export type DatosGuardado'); return t.slice(a, b).split('\n') }
      const viejaFn = funcion(cp.spawnSync('git', ['show', BASE + ':lib/admin/guardarAcordes.ts'], { cwd: RAIZ, encoding: 'utf8' }).stdout), nuevaFn = funcion(leer('lib/admin/guardarAcordes.ts'))
      assert.equal(viejaFn.length, nuevaFn.length, 'misma cantidad de líneas en `lineaValida`'); const dif = nuevaFn.map((l, i) => [viejaFn[i], l]).filter(([a, b]) => a !== b)
      assert.equal(dif.length, 1, 'en el guardado cambia UNA línea (la de las piezas de texto de una línea de acordes)'); assert.ok(dif[0][1].includes('/^ {1,8}$/') && !dif[0][0].includes('/^ {1,8}$/'))
    }
    assert.ok(!/migrat|alter table|create table/i.test(leer('lib/admin/guardarAcordes.ts') + css), 'sin migración')
  })
  terminar()
})
