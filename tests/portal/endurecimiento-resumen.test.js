// Endurecimiento 2: el resumen que se muestra ANTES del primer Guardar en una canción con contenido (letra N → M líneas, K secciones pasan a J, qué se desactiva, tamaño del arreglo) y que el servidor manda en `actual`.
// Datos inventados; sin red. Correr: `node tests/portal/endurecimiento-resumen.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), Rz = require(path.join(RAIZ, 'lib/resumenGuardado.ts')), { TEXTOS_EDITOR: T } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const SONG = '33333333-3333-4333-8333-333333333333'
const sec = (i, code, name) => ({ id: 's' + i, code, name, sort_order: i, variantes: [] })
const ACTUAL = { letra: 'VERSO 1:\nuna de prueba\notra de prueba\n\nCORO:\ncoro de prueba\n\nPUENTE:\npuente de prueba', secciones: [{ id: 's0', codigo: 'V1', nombre: 'Verso 1' }, { id: 's1', codigo: 'C', nombre: 'Coro' }, { id: 's2', codigo: 'P', nombre: 'Puente' }], arreglo: ['s0', 's1', 's2', 's1', 's1', 's0', 's2', 's1'] }

correr(async () => {
  await prueba('resumenDeCambios: líneas de letra antes → después (sin encabezados ni líneas vacías), secciones antes → después, qué se desactiva (las de más al final), entradas del arreglo', () => {
    const r = Rz.resumenDeCambios(ACTUAL, { letra: 'RELLENO:\nde prueba', secciones: [{ nombre: 'RELLENO' }] })
    assert.deepEqual(r, { hayContenido: true, letraCambia: true, lineas: [4, 1], secciones: [3, 1], seDesactivan: ['Coro', 'Puente'], entradasArreglo: 8 })
    const igual = Rz.resumenDeCambios(ACTUAL, { letra: ACTUAL.letra + '\n', secciones: [{ nombre: 'a' }, { nombre: 'b' }, { nombre: 'c' }] })
    assert.equal(igual.letraCambia, false, 'solo un salto de línea al final: la letra no cambia'); assert.deepEqual(igual.seDesactivan, []); assert.deepEqual(igual.secciones, [3, 3])
    const mas = Rz.resumenDeCambios(ACTUAL, { letra: ACTUAL.letra + '\n\nFINAL:\nfinal de prueba', secciones: [1, 2, 3, 4].map(() => ({ nombre: 'x' })) })
    assert.deepEqual(mas.secciones, [3, 4]); assert.deepEqual(mas.seDesactivan, [], 'agregar secciones no desactiva ninguna')
    assert.equal(Rz.resumenDeCambios({ letra: ACTUAL.letra.replace('\n', '\r\n'), secciones: ACTUAL.secciones, arreglo: [] }, { letra: ACTUAL.letra, secciones: [{}, {}, {}] }).letraCambia, false, 'los \\r no cuentan')
  })
  await prueba('«hay contenido» solo si ya hay letra o secciones guardadas: una canción vacía no pide confirmar', () => {
    const vacia = Rz.resumenDeCambios({ letra: '', secciones: [], arreglo: [] }, { letra: 'A:\nuna', secciones: [{ nombre: 'A' }] })
    assert.equal(vacia.hayContenido, false); assert.deepEqual(vacia.lineas, [0, 1])
    assert.equal(Rz.resumenDeCambios({ letra: '   \n', secciones: [], arreglo: [] }, { letra: '', secciones: [] }).hayContenido, false, 'solo espacios no es contenido')
    assert.equal(Rz.resumenDeCambios({ letra: 'una línea suelta de prueba', secciones: [], arreglo: [] }, { letra: '', secciones: [] }).hayContenido, true, 'letra sin secciones es contenido')
    assert.equal(Rz.resumenDeCambios({ letra: '', secciones: [{ id: 'a', codigo: 'V1', nombre: 'V' }], arreglo: [] }, { letra: '', secciones: [] }).hayContenido, true, 'secciones sin letra es contenido')
  })
  await prueba('idsDelArreglo: lee los sectionId de un arreglo guardado y no falla con cualquier otra cosa', () => {
    assert.deepEqual(Rz.idsDelArreglo([{ sectionId: 'a', label: 'V1', repeat: 1 }, { sectionId: 'b' }]), ['a', 'b'])
    for (const x of [null, undefined, 5, 'x', {}, [null, 3, 'y', {}, { sectionId: 7 }]]) assert.deepEqual(Rz.idsDelArreglo(x), [], JSON.stringify(x))
  })
  await prueba('el servidor manda `actual` en la carga: secciones activas en orden (las «__» no), y los sectionId del arreglo', () => {
    const e = { song: { id: SONG, organization_id: 'O', tono_original: 'G', letra: 'x', default_arrangement: [{ sectionId: 's0', label: 'V1', repeat: 1 }, { sectionId: 's2', label: 'P', repeat: 1 }, { sectionId: 's0', label: 'V1', repeat: 1 }] },
      secciones: [sec(2, 'P', 'Puente'), sec(1, '__C', 'Coro'), sec(0, 'V1', 'Verso 1')] }
    const c = G.construirCarga(e)
    assert.deepEqual(c.actual, { secciones: [{ id: 's0', codigo: 'V1', nombre: 'Verso 1' }, { id: 's2', codigo: 'P', nombre: 'Puente' }], arreglo: ['s0', 's2', 's0'] })
    assert.deepEqual(G.construirCarga({ ...e, song: { ...e.song, default_arrangement: undefined } }).actual.arreglo, [], 'sin arreglo, vacío')
    assert.equal(G.construirCarga(e).huella, G.construirCarga({ ...e, song: { ...e.song, default_arrangement: [] } }).huella, 'el arreglo no entra en la huella: no provoca falsos «alguien más cambió esta canción»')
  })
  await prueba('textos del resumen: singular y plural, con «y» antes del último nombre; ninguno promete algo falso (no dicen que se borra ni que se respalda la letra)', () => {
    assert.equal(T.resumenLetra(46, 3), 'Se reemplaza la letra (46 → 3 líneas)'); assert.equal(T.resumenLetra(4, 1), 'Se reemplaza la letra (4 → 1 línea)'); assert.equal(T.resumenLetra(0, 5), 'Se escribe la letra (5 líneas)')
    assert.equal(T.resumenSecciones(4, 3), '4 secciones pasan a 3'); assert.equal(T.resumenSecciones(1, 3), '1 sección pasa a 3'); assert.equal(T.resumenSecciones(3, 3), '3 secciones, se actualizan')
    assert.equal(T.resumenDesactiva(['Puente']), 'Se desactiva Puente (no se borra)'); assert.equal(T.resumenDesactiva(['Coro', 'Puente']), 'Se desactivan Coro y Puente (no se borra)'); assert.equal(T.resumenDesactiva(['A', 'B', 'C']), 'Se desactivan A, B y C (no se borra)')
    assert.equal(T.resumenArreglo(8), 'Esta canción tiene un arreglo de 8 entradas'); assert.equal(T.resumenArreglo(1), 'Esta canción tiene un arreglo de 1 entrada')
  })
  await prueba('pantalla: Guardar pasa primero por el resumen cuando hay contenido, el resumen se pide UNA vez por apertura, y «Guardar» del diálogo es el único camino a la petición (revisión del código fuente)', () => {
    const f = fs.readFileSync(path.join(RAIZ, 'components/canciones/EditorCancionMovil.tsx'), 'utf8')
    assert.ok(/onClick=\{pedirGuardar\}/.test(f), 'el botón de la cabecera llama a pedirGuardar, no a guardar'); assert.equal((f.match(/void guardar\(\)/g) || []).length, 2, 'guardar() solo se llama sin contenido o desde el diálogo')
    assert.ok(/r && r\.hayContenido && !confirmado/.test(f)); assert.ok(/setConfirmado\(false\)/.test(f), 'cada apertura vuelve a pedirlo')
    assert.ok(/!tono\) \{ setError\(T\.faltaTono\)/.test(f.split('const guardar = async')[0]), 'sin tono el aviso sale antes que el resumen')
  })
  terminar()
})
