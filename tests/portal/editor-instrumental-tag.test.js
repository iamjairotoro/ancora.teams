// «+ Instrumental» y «+ Tag» en el editor móvil: encabezados que reconoce el lector, tipos y códigos de sección (Inst y Tg, sin chocar con INT), el mismo comportamiento que los demás botones (insertar y, con el cursor sobre un encabezado, cambiar el tipo),
// Instrumental como sección de solo acordes (con varias líneas) y Tag como sección cantada normal. Datos inventados; sin red. Correr: `node tests/portal/editor-instrumental-tag.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), { looksLikeHeader, parseLyrics } = require(path.join(RAIZ, 'lib/parseLyrics.ts')), { TEXTOS_EDITOR: T } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const A = (g, cal = '') => ({ g, cal })
const nombres = d => E.estructura(d.texto).secciones.map(s => s.nombre)

correr(async () => {
  await prueba('los ocho tipos, en este orden, con sus nombres de encabezado; «INSTRUMENTAL:» y «TAG:» los reconoce el lector de letra y el editor', () => {
    assert.deepEqual([...E.TIPOS_SECCION], ['verso', 'precoro', 'coro', 'puente', 'interludio', 'instrumental', 'tag', 'final'])
    assert.equal(E.nombreDeTipo(E.docVacio(''), 'instrumental'), 'INSTRUMENTAL'); assert.equal(E.nombreDeTipo(E.docVacio(''), 'tag'), 'TAG')
    for (const n of ['INSTRUMENTAL', 'INSTRUMENTAL:', 'TAG', 'TAG:', 'Instrumental', 'Tag 2', 'INSTRUMENTAL 2']) assert.ok(looksLikeHeader(n), n)
    const letra = 'VERSO 1:\nuna línea de prueba\n\nINSTRUMENTAL:\n(instrumental)\n\nTAG:\nun tag de prueba'
    assert.deepEqual(parseLyrics(letra).map(s => s.name), ['VERSO 1', 'INSTRUMENTAL', 'TAG']); assert.deepEqual(nombres(E.docVacio(letra)), ['VERSO 1', 'INSTRUMENTAL', 'TAG'])
  })
  await prueba('tipoDeNombre: Instrumental y Tag son tipos propios (Instrumental ya no se confunde con Interludio); «Ending» y «Outro» son Final; lo demás, igual que antes', () => {
    const t = [['INSTRUMENTAL', 'instrumental'], ['Instrumental 2', 'instrumental'], ['TAG', 'tag'], ['tag 2', 'tag'], ['Interludio', 'interludio'], ['INTERLUDIO 2', 'interludio'], ['FINAL', 'final'], ['Ending', 'final'], ['OUTRO', 'final'], ['Outro 2', 'final'],
      ['VERSO 3', 'verso'], ['Estrofa 1', 'verso'], ['PRE CORO', 'precoro'], ['Pre-coro', 'precoro'], ['CORO', 'coro'], ['Puente', 'puente'], ['Tagalog', null], ['Internacional', null], ['Instrumentales', null], ['Otra cosa', null], ['', null]]
    for (const [n, x] of t) assert.equal(E.tipoDeNombre(n), x, n)
  })
  await prueba('códigos al guardar: Instrumental → «Inst», Tag → «Tg», Interludio → «INT», Final → «F»; no chocan entre sí (se numeran si se repiten), caben en 6 caracteres y los acepta el guardado', () => {
    const cod = (...ns) => { const usados = new Set(); return ns.map((n, i) => E.codigoDeSeccion(n, i, usados)) }
    assert.deepEqual(cod('INSTRUMENTAL', 'TAG', 'INTERLUDIO', 'FINAL'), ['Inst', 'Tg', 'INT', 'F']); assert.deepEqual(cod('Instrumental 2', 'Tag 2', 'Interludio 2'), ['Inst2', 'Tg2', 'INT2'])
    assert.deepEqual(cod('INSTRUMENTAL', 'INSTRUMENTAL', 'TAG', 'TAG', 'INTERLUDIO'), ['Inst', 'Inst-2', 'Tg', 'Tg-2', 'INT'], 'repetidos')
    for (const c of ['Inst', 'Inst2', 'Inst-2', 'Tg', 'Tg-2']) assert.ok(/^[A-Za-z0-9-]{1,6}$/.test(c), c)
  })
  await prueba('insertar un encabezado de esos tipos: igual que los demás botones; con el cursor sobre un encabezado ya puesto le CAMBIA el tipo (sin dejar uno huérfano); Instrumental trae su «(instrumental)», Tag no', () => {
    const d0 = E.docVacio('una línea de prueba')
    const inst = E.insertarEncabezado(d0, 0, 'instrumental'); assert.equal(inst.doc.texto, 'INSTRUMENTAL:\n(instrumental)\n\nuna línea de prueba'); const tag = E.insertarEncabezado(d0, 0, 'tag'); assert.equal(tag.doc.texto, 'TAG:\nuna línea de prueba')
    assert.equal(tag.caret, 'TAG:\n'.length, 'el cursor queda debajo del encabezado')
    const med = E.docVacio('VERSO 1:\nuna de prueba\nsegunda'), alFinal = E.insertarEncabezado(med, 'VERSO 1:\nuna de prueba\n'.length, 'tag'); assert.equal(alFinal.doc.texto, 'VERSO 1:\nuna de prueba\n\nTAG:\nsegunda')
    const sobre = E.insertarEncabezado(E.docVacio('CORO:\nuna de prueba'), 0, 'tag'); assert.equal(sobre.doc.texto, 'TAG:\nuna de prueba', 'con el cursor sobre «CORO:» le cambia el tipo a «TAG:»'); assert.deepEqual(nombres(sobre.doc), ['TAG'])
    const aInst = E.insertarEncabezado(E.docVacio('TAG (2x):\nuna de prueba'), 0, 'instrumental'); assert.equal(aInst.doc.texto, 'INSTRUMENTAL (2x):\nuna de prueba', 'conserva lo de entre paréntesis'); assert.equal(E.cambiarTipoSeccion(E.docVacio('VERSO 1:\nuna de prueba'), 0, 'instrumental').texto, 'INSTRUMENTAL:\nuna de prueba')
    const d3 = E.insertarEncabezado(E.insertarEncabezado(E.docVacio('una de prueba'), 0, 'tag').doc, 0, 'coro'); assert.equal(d3.doc.texto, 'CORO:\nuna de prueba', 'sin encabezados huérfanos')
  })
  await prueba('Instrumental es de solo acordes como Interludio: la sección guarda solo líneas de acordes (varias), sin texto; la letra trae «(instrumental)»; guardar y volver a cargar da el mismo documento', () => {
    const t = 'VERSO 1:\nuna línea de prueba\n\nINSTRUMENTAL:\n(instrumental)\n\nINTERLUDIO:\n(instrumental)'
    const fin = nombre => { const i = t.indexOf(nombre + ':\n(instrumental)'); return i + (nombre + ':\n(instrumental)').length }
    const d = { texto: t, anclas: [], interludios: [{ at: fin('INSTRUMENTAL'), items: [{ acorde: A(1) }, { texto: '|' }, { acorde: A(5) }] }, { at: fin('INSTRUMENTAL'), items: [{ acorde: A(4) }, { acorde: A(1) }] }, { at: fin('INTERLUDIO'), items: [{ acorde: A(6, 'm') }] }] }
    const s = E.aSecciones(d); assert.deepEqual(s.map(x => [x.nombre, x.codigo]), [['VERSO 1', 'V1'], ['INSTRUMENTAL', 'Inst'], ['INTERLUDIO', 'INT']])
    assert.deepEqual(s[1].lineas.map(l => l.kind), ['bars', 'bars'], 'dos líneas de acordes, ninguna de letra'); assert.deepEqual(s[2].lineas.map(l => l.kind), ['bars'])
    assert.ok(G.textosCoinciden(t, s), 'la letra y el chart dicen lo mismo'); assert.deepEqual(E.desdeSecciones(t, s.map(x => x.lineas)).interludios.map(x => x.items.length), [3, 2, 1], 'vuelve a armarse igual')
    assert.ok(G.validarCuerpo({ songId: '11111111-1111-4111-8111-111111111111', tono: 'G', letra: t, secciones: s, base: 'a'.repeat(32) }).ok, 'el guardado lo acepta')
  })
  await prueba('Tag es una sección cantada normal: letra con acordes sobre las palabras; guarda líneas de letra con sus acordes y cabe en el guardado', () => {
    const t = 'TAG:\nun tag de prueba\notra línea del tag'; const d = { texto: t, anclas: [{ at: t.indexOf('un tag'), acorde: A(1) }, { at: t.indexOf('prueba'), acorde: A(5) }], interludios: [] }
    const s = E.aSecciones(d); assert.deepEqual(s.map(x => [x.nombre, x.codigo]), [['TAG', 'Tg']]); assert.deepEqual(s[0].lineas.map(l => l.kind), ['lyric', 'lyric']); assert.equal(s[0].lineas[0].segments.filter(g => g.acorde).length, 2)
    assert.ok(G.textosCoinciden(t, s)); assert.ok(G.validarCuerpo({ songId: '11111111-1111-4111-8111-111111111111', tono: 'G', letra: t, secciones: s, base: 'a'.repeat(32) }).ok); assert.deepEqual(E.desdeSecciones(t, s.map(x => x.lineas)).anclas.length, 2)
  })
  await prueba('textos y pantalla: los ocho botones del encabezado y los ocho tipos del menú de sección salen de la misma lista (TIPOS_SECCION), con sus textos «+ Instrumental» y «+ Tag»', () => {
    assert.equal(T.secciones.instrumental, '+ Instrumental'); assert.equal(T.secciones.tag, '+ Tag'); assert.equal(T.tiposSeccion.instrumental, 'Instrumental'); assert.equal(T.tiposSeccion.tag, 'Tag')
    for (const tp of E.TIPOS_SECCION) { assert.ok(T.secciones[tp], 'botón ' + tp); assert.ok(T.tiposSeccion[tp], 'menú ' + tp) }
    assert.ok(leer('components/canciones/EditorCancionMovil.tsx').includes('TIPOS_SECCION.map(tp =>') && leer('components/canciones/ModoAcordes.tsx').includes('TIPOS_SECCION.map(tp =>'))
  })
  terminar()
})
