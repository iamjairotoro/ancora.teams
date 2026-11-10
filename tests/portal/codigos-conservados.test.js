// Una sección ya guardada conserva su código (INT, T) cuando el editor genera uno nuevo para el mismo tipo («Inst», «Tg»); el arreglo se enlaza por sectionId, no por código; un cambio de código real sigue pidiendo confirmación.
// Datos inventados; sin red. Correr: `node tests/portal/codigos-conservados.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const C = require(path.join(RAIZ, 'lib/codigosSeccion.ts')), G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), Rz = require(path.join(RAIZ, 'lib/resumenGuardado.ts')), P = require(path.join(RAIZ, 'lib/portal/acordesCancion.ts'))
const cn = (codigo, nombre) => ({ codigo, nombre })
const A = g => ({ g, cal: '' })
const lin = (t, g) => ({ kind: 'lyric', segments: [{ text: t, acorde: A(g) }] })

correr(async () => {
  await prueba('conservarCodigos: INT→Inst y T→Tg se conservan cuando el tipo (por el nombre) es el mismo; con numeración (INT2, INT-2, T2) también; cualquier otro cambio de código es real', () => {
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INSTRUMENTAL')], [cn('Inst', 'INSTRUMENTAL')]), ['INT']); assert.deepEqual(C.conservarCodigos([cn('T', 'TAG')], [cn('Tg', 'TAG')]), ['T'])
    assert.deepEqual(C.conservarCodigos([cn('INT2', 'Instrumental 2')], [cn('Inst2', 'INSTRUMENTAL 2')]), ['INT2']); assert.deepEqual(C.conservarCodigos([cn('INT-2', 'Instrumental')], [cn('Inst', 'Instrumental')]), ['INT-2']); assert.deepEqual(C.conservarCodigos([cn('T2', 'Tag 2')], [cn('Tg2', 'Tag 2')]), ['T2'])
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INTERLUDIO')], [cn('INT', 'INTERLUDIO')]), ['INT'], 'sin cambio: igual'); assert.deepEqual(C.conservarCodigos([cn('INT', 'INTERLUDIO')], [cn('Inst', 'INSTRUMENTAL')]), ['Inst'], 'de Interludio a Instrumental SÍ es un cambio')
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INSTRUMENTAL')], [cn('C', 'CORO')]), ['C'], 'otro tipo: el nuevo'); assert.deepEqual(C.conservarCodigos([cn('C', 'CORO')], [cn('Inst', 'INSTRUMENTAL')]), ['Inst'], 'una sección de otro tipo que pasa a Instrumental: el nuevo')
    assert.deepEqual(C.conservarCodigos([cn('V1', 'VERSO 1')], [cn('V2', 'VERSO 2')]), ['V2'], 'los demás cambios no se tocan'); assert.deepEqual(C.conservarCodigos([], [cn('Inst', 'INSTRUMENTAL')]), ['Inst'], 'una sección nueva usa el del editor')
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INSTRUMENTAL')], [cn('Intro', 'INSTRUMENTAL')]), ['Intro'], 'solo el código nuevo Inst'); assert.deepEqual(C.conservarCodigos([cn('TX', 'TAG')], [cn('Tg', 'TAG')]), ['Tg'], 'solo el viejo T'); assert.deepEqual(C.conservarCodigos([cn('INT', 'INSTRUMENTAL')], [cn('Inst', 'OTRA SECCIÓN')]), ['Inst'], 'el nombre nuevo también tiene que ser Instrumental')
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INSTRUMENTAL')], [cn('XY', 'INSTRUMENTAL')]), ['XY'], 'solo el par Inst'); assert.deepEqual(C.conservarCodigos([cn('INTRO', 'INSTRUMENTAL')], [cn('Inst', 'INSTRUMENTAL')]), ['Inst'], 'INTRO no es el código viejo')
  })
  await prueba('los códigos no se repiten: si conservar uno choca con el de otra sección, esa usa el nuevo; con Interludio e Instrumental a la vez cada uno conserva el suyo', () => {
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INSTRUMENTAL')], [cn('Inst', 'INSTRUMENTAL'), cn('INT', 'INTERLUDIO')]), ['Inst', 'INT'], 'el Interludio nuevo ya se llama INT')
    assert.deepEqual(C.conservarCodigos([cn('INT', 'INTERLUDIO'), cn('INT-2', 'INSTRUMENTAL')], [cn('INT', 'INTERLUDIO'), cn('Inst', 'INSTRUMENTAL')]), ['INT', 'INT-2'])
    const r = C.conservarCodigos([cn('INT', 'INSTRUMENTAL'), cn('T', 'TAG'), cn('C', 'CORO')], [cn('Inst', 'INSTRUMENTAL'), cn('Tg', 'TAG'), cn('C', 'CORO')]); assert.deepEqual(r, ['INT', 'T', 'C']); assert.equal(new Set(r).size, 3)
  })
  const estado = (secs, arreglo) => ({ song: { id: 'S', organization_id: 'O', tono_original: 'G', letra: 'x', default_arrangement: arreglo }, secciones: secs.map(([id, code, name], i) => ({ id, code, name, sort_order: i, variantes: [{ id: 'v' + i, section_id: id, label: 'Principal', lines: [lin('línea de prueba ' + i, 1)], is_default: true, formato: 2 }] })) })
  const SECS = [['s0', 'V1', 'VERSO 1'], ['s1', 'INT', 'INSTRUMENTAL'], ['s2', 'T', 'TAG']]
  const ARREGLO = [{ sectionId: 's0', label: 'V1', repeat: 1 }, { sectionId: 's1', label: 'INT', repeat: 1 }, { sectionId: 's2', label: 'T', repeat: 1 }, { sectionId: 's1', label: 'INT', repeat: 1 }]
  const cuerpo = (cod) => ({ songId: 'S', tono: 'G', letra: 'x', base: 'a'.repeat(32), secciones: [['VERSO 1', cod[0]], ['INSTRUMENTAL', cod[1]], ['TAG', cod[2]]].map(([nombre, codigo]) => ({ nombre, codigo, lineas: [lin('línea de prueba', 1)] })) })
  await prueba('guardado: una sección del arreglo guardada como INT o T NO cambia de código al volver a guardar (el plan no la toca), no pide confirmar y el arreglo sigue intacto', () => {
    const e = estado(SECS, ARREGLO), d = cuerpo(['V1', 'Inst', 'Tg'])
    const ops = G.planificar(e, d, new Date('2026-11-10T00:00:00Z'), (() => { let n = 0; return () => `id-${++n}-00000000` })())
    assert.deepEqual(ops.filter(o => o.tabla === 'song_sections' && o.tipo === 'update'), [], 'ninguna fila de sección cambia (ni código ni nada)'); assert.deepEqual(G.seccionesDelArregloAfectadas(e, d), [], 'sin confirmación')
    assert.deepEqual(Rz.resumenDeCambios({ letra: 'x', secciones: SECS.map(([id, codigo, nombre]) => ({ id, codigo, nombre })), arreglo: ARREGLO.map(x => x.sectionId) }, { letra: 'x', secciones: d.secciones }).afectadas, [], 'la pantalla tampoco pide confirmar')
  })
  await prueba('un cambio de código REAL sigue pidiendo confirmación: pasar una sección del arreglo de Interludio a Instrumental, o quitarla, o cambiarle el tipo', () => {
    const e = estado([['s0', 'V1', 'VERSO 1'], ['s1', 'INT', 'INTERLUDIO']], [{ sectionId: 's0', label: 'V1', repeat: 1 }, { sectionId: 's1', label: 'INT', repeat: 1 }])
    const a = G.seccionesDelArregloAfectadas(e, { secciones: [cn('V1', 'VERSO 1'), cn('Inst', 'INSTRUMENTAL')] }); assert.deepEqual(a.map(x => [x.codigo, x.motivo]), [['INT', 'cambia']], 'Interludio → Instrumental')
    assert.deepEqual(G.seccionesDelArregloAfectadas(e, { secciones: [cn('V1', 'VERSO 1')] }).map(x => x.motivo), ['baja']); assert.deepEqual(G.seccionesDelArregloAfectadas(e, { secciones: [cn('V1', 'VERSO 1'), cn('C', 'CORO')] }).map(x => x.motivo), ['cambia'])
    const r = Rz.resumenDeCambios({ letra: 'x', secciones: [{ id: 's0', codigo: 'V1', nombre: 'VERSO 1' }, { id: 's1', codigo: 'INT', nombre: 'INTERLUDIO' }], arreglo: ['s0', 's1'] }, { letra: 'x', secciones: [cn('V1', 'VERSO 1'), cn('Inst', 'INSTRUMENTAL')] }); assert.deepEqual(r.afectadas.map(x => x.motivo), ['cambia'])
  })
  await prueba('el arreglo se enlaza con las secciones por sectionId: la hoja y la tira salen IGUAL aunque el código de una sección (o la etiqueta del arreglo) cambie', () => {
    const filas = cods => cods.map((c, i) => ({ id: 's' + i, code: c, name: ['Verso 1', 'Instrumental', 'Tag'][i], sort_order: i })), vars = [0, 1, 2].map(i => ({ section_id: 's' + i, label: 'Principal', is_default: true, formato: 2, lines: [lin('línea de prueba ' + i, 1)] }))
    const hoja = (cods, arreglo) => P.armarHojaAcordes({ tono: 'G', arreglo, secciones: filas(cods), variantes: vars })
    const a = hoja(['V1', 'INT', 'T'], ARREGLO), b = hoja(['V1', 'Inst', 'Tg'], ARREGLO), c = hoja(['V1', 'Inst', 'Tg'], ARREGLO.map(x => ({ ...x, label: 'cualquiera' })))
    const ver = h => h.secciones.map(s => [s.name, JSON.stringify(s.lineas), s.repeat]); assert.deepEqual(ver(a), ver(b), 'cambiar el código no cambia qué secciones muestra el arreglo'); assert.deepEqual(ver(a), ver(c), 'la etiqueta del arreglo no decide qué sección es')
    assert.deepEqual(b.secciones.map(s => s.name), ['Verso 1', 'Instrumental', 'Tag', 'Instrumental'], 'cuatro entradas del arreglo, en su orden')
  })
  terminar()
})
