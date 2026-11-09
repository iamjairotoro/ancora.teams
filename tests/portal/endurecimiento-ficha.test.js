// Endurecimiento 5: aviso en la ficha cuando la canción tiene arreglo Y acordes en el formato antiguo (solo teléfono y administrador, que es quien ve «Editar con acordes»). Datos inventados; sin red.
// Correr: `node tests/portal/endurecimiento-ficha.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), Rz = require(path.join(RAIZ, 'lib/resumenGuardado.ts')), { TEXTOS_EDITOR: T } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const Aviso = require(path.join(RAIZ, 'components/canciones/AvisoArregloAcordes.tsx')), leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const SONG = '55555555-5555-4555-8555-555555555555'
const f1 = [{ kind: 'lyric', segments: [{ text: 'una de prueba', chord: 'G' }] }], f2 = [{ kind: 'lyric', segments: [{ text: 'una de prueba', acorde: { g: 1, cal: '' } }] }]
const estado = (formato, arreglo) => ({ song: { id: SONG, organization_id: 'O', tono_original: 'G', letra: 'x', default_arrangement: arreglo },
  secciones: [{ id: 's1', code: 'V1', name: 'Verso 1', sort_order: 0, variantes: [{ id: 'v1', section_id: 's1', label: 'Principal', lines: formato === 1 ? f1 : f2, is_default: true, formato }] }] })
const ARR = [{ sectionId: 's1', label: 'V1', repeat: 1 }, { sectionId: 's1', label: 'V1', repeat: 1 }]

correr(async () => {
  await prueba('la carga dice si hay acordes en formato antiguo (alguna sección viva en formato 1); en formato 2 o sin secciones, no', () => {
    assert.equal(G.construirCarga(estado(1, ARR)).formatoAntiguo, true); assert.equal(G.construirCarga(estado(2, ARR)).formatoAntiguo, false)
    assert.equal(G.construirCarga({ song: estado(1, ARR).song, secciones: [] }).formatoAntiguo, false)
    const roto = estado(1, ARR); roto.secciones[0].variantes[0].lines = [{ kind: 'lyric', segments: [{ text: 'x', chord: 'EE/G#' }] }]; assert.equal(G.construirCarga(roto).formatoAntiguo, true, 'también con acordes ilegibles: es justo el caso peligroso')
  })
  await prueba('avisoDeFicha: avisa solo con arreglo Y formato antiguo, y devuelve cuántas entradas; datos raros → nada', () => {
    assert.equal(Rz.avisoDeFicha(G.construirCarga(estado(1, ARR))), 2); assert.equal(Rz.avisoDeFicha(G.construirCarga(estado(1, []))), null, 'sin arreglo')
    assert.equal(Rz.avisoDeFicha(G.construirCarga(estado(2, ARR))), null, 'formato nuevo'); assert.equal(Rz.avisoDeFicha(G.construirCarga(estado(1, undefined))), null)
    for (const x of [null, undefined, {}, { formatoAntiguo: 'si', actual: { arreglo: ['a'] } }, { formatoAntiguo: true }, { formatoAntiguo: true, actual: {} }, { formatoAntiguo: true, actual: { arreglo: 'x' } }]) assert.equal(Rz.avisoDeFicha(x), null, JSON.stringify(x))
  })
  await prueba('el texto del aviso dice las entradas (singular y plural) y que hay un resumen antes de guardar; se dibuja como nota', () => {
    assert.ok(T.avisoFicha(8).includes('arreglo de 8 entradas') && T.avisoFicha(1).includes('arreglo de 1 entrada y') && T.avisoFicha(8).includes('verás un resumen'))
    const h = renderToStaticMarkup(React.createElement(Aviso.TextoAvisoArreglo, { entradas: 8 })); assert.ok(h.includes('role="note"') && h.includes('arreglo de 8 entradas'))
    assert.equal(renderToStaticMarkup(React.createElement(Aviso.default, { songId: SONG })), '', 'mientras no hay respuesta (y si falla, o no hay nada que avisar) no dibuja nada')
  })
  await prueba('la ficha lo muestra solo en teléfono y para administradores, y el componente solo LEE (una petición GET a la ruta del editor, sin escribir)', () => {
    const p = leer('components/canciones/CancionesPanel.tsx'); assert.ok(p.includes('{telefono && isAdmin && <AvisoArregloAcordes songId={selectedSong.id} />}'))
    assert.ok(p.indexOf('<AvisoArregloAcordes') < p.indexOf('<LyricSheet'), 'sale antes de la letra')
    const c = leer('components/canciones/AvisoArregloAcordes.tsx'); assert.equal((c.match(/fetch\(/g) || []).length, 1); assert.ok(!/method:|POST|PUT|DELETE|PATCH|localStorage/.test(c)); assert.ok(c.includes('/api/admin/canciones/acordes?id='))
    assert.ok(/\[songId\]\)/.test(c), 'al cambiar de canción vuelve a mirar'); assert.ok(/vivo = false/.test(c) && /if \(vivo\) setEntradas\(avisoDeFicha/.test(c), 'no pinta con una respuesta vieja')
  })
  terminar()
})
