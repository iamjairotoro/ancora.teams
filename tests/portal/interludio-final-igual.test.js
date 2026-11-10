// Las canciones con Interludio, Final, Ending y Outro se leen y se guardan IGUAL que antes de agregar «Instrumental» y «Tag» al editor: el nombre, el código y las líneas que el editor entrega al guardar,
// el documento que vuelve a armar desde lo guardado y el plan de escrituras de un guardado, comparados con una copia tomada con el código de main (tests/portal/golden/editor-interludio-final.json). Datos inventados; sin red.
// Correr: `node tests/portal/interludio-final-igual.test.js`        Regenerar la copia (solo si el comportamiento de hoy cambia a propósito): COPIA=1 node tests/portal/interludio-final-igual.test.js
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts'))
const A = (g, cal = '') => ({ g, cal })
const DORADO = path.join(RAIZ, 'tests/portal/golden/editor-interludio-final.json')
const TEXTO1 = 'VERSO 1:\nLínea uno de prueba\notra línea de prueba\n\nINTERLUDIO:\n(instrumental)\n\nCORO:\nCoro de prueba\n\nINTERLUDIO 2:\n(instrumental)\n\nFINAL:\nFinal de prueba'
const TEXTO2 = 'VERSO 1:\nPrimera de prueba\n\nOUTRO:\nSalida de prueba\n\nENDING:\nCierre de prueba'
const en = (t, f) => t.indexOf(f)
const doc1 = () => ({ texto: TEXTO1, anclas: [{ at: en(TEXTO1, 'Línea'), acorde: A(1) }, { at: en(TEXTO1, 'uno'), acorde: A(5) }, { at: en(TEXTO1, 'Coro de'), acorde: A(4) }, { at: en(TEXTO1, 'Final de'), acorde: A(6, 'm') }],
  interludios: [{ at: en(TEXTO1, '(instrumental)') + 14, items: [{ acorde: A(1) }, { texto: '|' }, { acorde: A(5) }] }, { at: TEXTO1.lastIndexOf('(instrumental)') + 14, items: [{ acorde: A(4) }, { texto: ' ' }, { acorde: A(1) }] }] })
const doc2 = () => ({ texto: TEXTO2, anclas: [{ at: en(TEXTO2, 'Salida'), acorde: A(2, 'm') }, { at: en(TEXTO2, 'Cierre'), acorde: A(1) }], interludios: [] })
const resumen = d => { const sec = E.aSecciones(d); const vuelve = E.desdeSecciones(d.texto, sec.map(s => s.lineas)); return { secciones: sec, vuelve } }
const plan = d => {
  const old = E.aSecciones({ texto: d.texto, anclas: [], interludios: [] })
  const e = { song: { id: 'S', organization_id: 'O', tono_original: 'G', letra: d.texto }, secciones: old.map((s, i) => ({ id: 's' + i, code: s.codigo, name: s.nombre, sort_order: i, variantes: [{ id: 'v' + i, section_id: 's' + i, label: 'Principal', lines: s.lineas, is_default: true, formato: 2 }] })) }
  let n = 0; return G.planificar(e, { songId: 'S', tono: 'G', letra: d.texto, secciones: E.aSecciones(d), base: 'a'.repeat(32) }, new Date('2026-11-10T00:00:00Z'), () => `id-${++n}-00000000`)
}
const foto = () => ({ d1: resumen(doc1()), d2: resumen(doc2()), plan1: plan(doc1()), plan2: plan(doc2()),
  tipos: Object.fromEntries(['INTERLUDIO', 'Interludio 2', 'FINAL', 'Final', 'OUTRO', 'ENDING', 'VERSO 1', 'PRE CORO', 'CORO', 'PUENTE'].map(n => [n, E.tipoDeNombre(n)])) })

correr(async () => {
  const hoy = JSON.parse(JSON.stringify(foto()))
  if (process.env.COPIA === '1') { fs.mkdirSync(path.dirname(DORADO), { recursive: true }); fs.writeFileSync(DORADO, JSON.stringify(hoy, null, 1)); console.log('copia escrita:', DORADO) }
  await prueba('los documentos con Interludio, Final, Outro y Ending guardan los MISMOS nombres, códigos y líneas que con el código de main, y se vuelven a armar igual', () => {
    const copia = JSON.parse(fs.readFileSync(DORADO, 'utf8'))
    assert.deepEqual(hoy.d1.secciones.map(s => [s.nombre, s.codigo]), [['VERSO 1', 'V1'], ['INTERLUDIO', 'INT'], ['CORO', 'C'], ['INTERLUDIO 2', 'INT2'], ['FINAL', 'F']], 'los códigos de hoy')
    assert.deepEqual(hoy.d2.secciones.map(s => [s.nombre, s.codigo]), [['VERSO 1', 'V1'], ['OUTRO', 'F'], ['ENDING', 'EN']])
    assert.deepEqual(hoy.d1, copia.d1); assert.deepEqual(hoy.d2, copia.d2); assert.ok(hoy.d1.vuelve && hoy.d2.vuelve, 'desdeSecciones vuelve a armar el documento')
  })
  await prueba('el plan de escrituras de un guardado de esos documentos es el mismo (mismas operaciones, mismos valores) y el tipo de sección de esos nombres no cambia', () => {
    const copia = JSON.parse(fs.readFileSync(DORADO, 'utf8')); assert.deepEqual(hoy.plan1, copia.plan1); assert.deepEqual(hoy.plan2, copia.plan2)
    for (const [n, t] of Object.entries(copia.tipos)) if (!/OUTRO|ENDING/.test(n)) assert.equal(hoy.tipos[n], t, n)
    assert.equal(hoy.tipos.OUTRO, 'final'); assert.equal(hoy.tipos.ENDING, 'final')      // lo único que cambia a propósito: «Outro» y «Ending» se reconocen como Final en el menú de sección (solo visualización; el código guardado sigue igual)
  })
  terminar()
})
