// Endurecimiento 3: un guardado que desactive —o cambie de tipo— una sección que el ARREGLO de la canción usa pide confirmación explícita (`confirmarArreglo`): la pantalla la pide con un resumen de las secciones afectadas
// y el servidor la exige aunque la pantalla no la haya pedido (409, sin escribir nada). Datos inventados; sin red. Correr: `node tests/portal/endurecimiento-arreglo.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), Rz = require(path.join(RAIZ, 'lib/resumenGuardado.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), { TEXTOS_EDITOR: T, mensajeDeGuardado } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const SONG = '44444444-4444-4444-8444-444444444444'
// la canción inventada del caso: 4 secciones (V1, PC, C, P) y un arreglo de 8 entradas que las usa
const SECS = [{ id: 'sV1', codigo: 'V1', nombre: 'Verso 1' }, { id: 'sPC', codigo: 'PC', nombre: 'Pre coro' }, { id: 'sC', codigo: 'C', nombre: 'Coro' }, { id: 'sP', codigo: 'P', nombre: 'Puente' }]
const ARREGLO = ['sV1', 'sPC', 'sC', 'sC', 'sPC', 'sP', 'sC', 'sC']
const ACTUAL = { secciones: SECS, arreglo: ARREGLO }
const nuevas = (...codigos) => codigos.map(c => ({ codigo: c, nombre: c }))
const estado = (arreglo = ARREGLO.map(id => ({ sectionId: id, label: 'x', repeat: 1 }))) => ({ song: { id: SONG, organization_id: 'O', tono_original: 'G', letra: 'x', default_arrangement: arreglo },
  secciones: SECS.map((s, i) => ({ id: s.id, code: s.codigo, name: s.nombre, sort_order: i, variantes: [] })) })

correr(async () => {
  await prueba('afectadasEnArreglo: baja (la sección que sobra al final) y cambio de código (la fila se reutiliza por posición); con cuántas entradas del arreglo; las que no están en el arreglo no cuentan', () => {
    assert.deepEqual(Rz.afectadasEnArreglo(ACTUAL, nuevas('V1', 'PC', 'C')), [{ codigo: 'P', nombre: 'Puente', entradas: 1, motivo: 'baja' }])
    assert.deepEqual(Rz.afectadasEnArreglo(ACTUAL, nuevas('V1')), [{ codigo: 'PC', nombre: 'Pre coro', entradas: 2, motivo: 'baja' }, { codigo: 'C', nombre: 'Coro', entradas: 4, motivo: 'baja' }, { codigo: 'P', nombre: 'Puente', entradas: 1, motivo: 'baja' }])
    // el caso del daño: la fila 2 pasa de PC a C y la 3 de C a V2, y la 4 se da de baja
    assert.deepEqual(Rz.afectadasEnArreglo(ACTUAL, nuevas('V1', 'C', 'V2')).map(a => [a.codigo, a.motivo, a.entradas]), [['PC', 'cambia', 2], ['C', 'cambia', 4], ['P', 'baja', 1]])
    assert.deepEqual(Rz.afectadasEnArreglo(ACTUAL, nuevas('V1', 'PC', 'C', 'P')), [], 'igual que antes: nada')
    assert.deepEqual(Rz.afectadasEnArreglo(ACTUAL, nuevas('V1', 'PC', 'C', 'P', 'F')), [], 'agregar una sección al final no afecta')
    assert.deepEqual(Rz.afectadasEnArreglo({ secciones: SECS, arreglo: ['sV1'] }, nuevas('V1')), [], 'una sección que el arreglo no usa se puede dar de baja sin avisar')
    assert.deepEqual(Rz.afectadasEnArreglo({ secciones: SECS, arreglo: [] }, nuevas()), [], 'sin arreglo, nada')
    assert.deepEqual(Rz.afectadasEnArreglo({ secciones: SECS, arreglo: ['no-existe'] }, nuevas()), [], 'una entrada que apunta a una sección que ya no existe no se confunde con otra')
  })
  await prueba('el resumen de la pantalla trae las afectadas (para pedir la confirmación con el detalle)', () => {
    const r = Rz.resumenDeCambios({ letra: 'A:\nuna', ...ACTUAL }, { letra: 'A:\nuna', secciones: nuevas('V1', 'PC', 'C') })
    assert.deepEqual(r.afectadas, [{ codigo: 'P', nombre: 'Puente', entradas: 1, motivo: 'baja' }]); assert.equal(Rz.resumenDeCambios({ letra: 'A:\nuna', secciones: SECS, arreglo: [] }, { letra: 'A:\nuna', secciones: [] }).afectadas.length, 0)
  })
  await prueba('servidor: seccionesDelArregloAfectadas usa SOLO las secciones activas y el arreglo guardado (las dadas de baja «__» no cuentan; sin arreglo, nada); validarCuerpo acepta `confirmarArreglo` solo si es booleano', () => {
    const e = estado(), d = { secciones: nuevas('V1', 'PC', 'C') }
    assert.deepEqual(G.seccionesDelArregloAfectadas(e, d).map(a => a.codigo), ['P'])
    const conBaja = estado(); conBaja.secciones[3].code = '__P'; assert.deepEqual(G.seccionesDelArregloAfectadas(conBaja, d), [], 'una sección que ya estaba dada de baja no vuelve a avisar')
    assert.deepEqual(G.seccionesDelArregloAfectadas(estado([]), d), []); assert.deepEqual(G.seccionesDelArregloAfectadas(estado(null), d), []); assert.deepEqual(G.seccionesDelArregloAfectadas(estado('basura'), d), [])
    const cuerpo = { songId: SONG, tono: 'G', letra: 'A:\nuna', secciones: [{ nombre: 'A', codigo: 'A', lineas: [{ kind: 'lyric', segments: [{ text: 'una' }] }] }], base: 'a'.repeat(32) }
    assert.equal(G.validarCuerpo({ ...cuerpo, confirmarArreglo: true }).ok, true); assert.equal(G.validarCuerpo({ ...cuerpo, confirmarArreglo: false }).ok, true)
    for (const x of ['si', 1, null, {}]) { const r = G.validarCuerpo({ ...cuerpo, confirmarArreglo: x }); assert.equal(r.ok, false, String(x)); assert.equal(r.campo, 'cuerpo') }
  })
  await prueba('pantalla: el resumen lista las secciones del arreglo que se afectan; guardar manda confirmarArreglo:true SOLO tras confirmar ese resumen; un 409 de arreglo del servidor abre el mismo diálogo y no se confunde con «alguien más cambió esta canción»', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx')
    assert.ok(f.includes('dialogo.resumen.afectadas'), 'el diálogo muestra las afectadas'); assert.ok(/confirmarArreglo/.test(f)); assert.ok(/j\?\.campo === 'arreglo'/.test(f), 'el 409 de arreglo se reconoce por su campo')
    assert.ok(/status === 409 && j\?\.campo === 'arreglo'/.test(f) || /r\.status === 409 && j\?\.campo === 'arreglo'/.test(f))
    assert.equal(mensajeDeGuardado(409, { campo: 'arreglo' }).conflicto, true, 'mensajeDeGuardado sigue tratando todo 409 como conflicto: la pantalla separa el de arreglo ANTES de llamarlo')
    assert.ok(f.indexOf("campo === 'arreglo'") < f.indexOf('mensajeDeGuardado(r.status'), 'y lo separa antes')
    assert.equal(T.arregloItem('Puente', 1, 'baja'), 'Puente: se desactiva y el arreglo la usa 1 vez; esas entradas dejarán de verse')
    assert.equal(T.arregloItem('Coro', 4, 'cambia'), 'Coro: cambia de tipo y el arreglo la usa 4 veces; esas entradas mostrarán otro contenido')
    assert.ok(/sinConfirmarArreglo = !!r && r\.afectadas\.length > 0 && firma\(r\.afectadas\) !== arregloOk/.test(f), 'se pide aunque ya se haya confirmado otro resumen'); assert.ok(/setArregloOk\(firma\(r\.afectadas\)\)/.test(f), 'recuerda solo lo que se confirmó')
    assert.ok(T.arregloAfectado && T.arregloConfirmar)
  })
  terminar()
})
