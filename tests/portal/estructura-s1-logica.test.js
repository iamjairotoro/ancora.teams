// Estructura de «Nueva canción», paso S1: la lógica pura de la estructura (lib/estructuraCancion.ts). Referencias a partes (la misma parte varias veces, también no seguidas), cómo se comprimen en entradas {indice, repeat} y se expanden de vuelta,
// la estructura por defecto, la sincronía con el texto y las operaciones de edición (volver a usar, repetir aquí, quitar, mover, eliminar sección). DATOS INVENTADOS; sin red.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const X = require(path.join(RAIZ, 'lib/estructuraCancion.ts'))

const NOMBRES = ['VERSO 1', 'VERSO 2', 'CORO', 'PUENTE', 'VERSO 3']          // partes del texto, en orden
const K = X.clavesDeLasPartes(NOMBRES)                                        // 'VERSO 1#0', 'VERSO 2#0', 'CORO#0', 'PUENTE#0', 'VERSO 3#0'
const [V1, V2, C, Bd, V3] = K
const NO_SEGUIDAS = [V1, V2, C, V1, V2, C, Bd, V3, C]

correr(async () => {
  await prueba('estructura por defecto: cada parte una vez y en el orden del texto; solo esa es «por defecto»', () => {
    assert.deepEqual(X.estructuraPorDefecto(NOMBRES), K); assert.ok(X.esPorDefecto(K, NOMBRES))
    for (const otra of [[V1, V2, C, Bd], [V1, V2, C, Bd, V3, V3], [V2, V1, C, Bd, V3], NO_SEGUIDAS]) assert.ok(!X.esPorDefecto(otra, NOMBRES))
    assert.deepEqual(X.estructuraPorDefecto([]), []); assert.ok(X.esPorDefecto([], [])) })

  await prueba('las claves distinguen las partes con el mismo nombre (CORO#0, CORO#1), como las repeticiones del paso D', () => {
    assert.deepEqual(X.clavesDeLasPartes(['CORO', 'VERSO 1', 'CORO']), ['CORO#0', 'VERSO 1#0', 'CORO#1']) })

  await prueba('seguidas y no seguidas: V1, V2, C, V1, V2, C, Bd, V3, C → 9 entradas con repeat 1 (la misma parte no seguida son entradas SEPARADAS)', () => {
    const e = X.aEntradas(NO_SEGUIDAS, NOMBRES)
    assert.deepEqual(e, [0, 1, 2, 0, 1, 2, 3, 4, 2].map(indice => ({ indice, repeat: 1 })))
    assert.deepEqual(X.aEntradas([V1, 'FANTASMA#0', V2], NOMBRES), [{ indice: 0, repeat: 1 }, { indice: 1, repeat: 1 }], 'una referencia a una parte inexistente se salta')
    assert.deepEqual(X.aEntradas([V1, C, C, C, V2, C, C], NOMBRES), [{ indice: 0, repeat: 1 }, { indice: 2, repeat: 3 }, { indice: 1, repeat: 1 }, { indice: 2, repeat: 2 }], 'las seguidas se comprimen en UNA entrada con repeat; la misma parte más adelante es otra entrada') })

  await prueba('una tanda de más de 9 seguidas se parte en otra entrada (repeat máximo 9): 11 → 9 + 2; 18 → 9 + 9; 19 → 9 + 9 + 1', () => {
    const tanda = n => Array(n).fill(C)
    assert.deepEqual(X.aEntradas(tanda(9), NOMBRES), [{ indice: 2, repeat: 9 }]); assert.deepEqual(X.aEntradas(tanda(11), NOMBRES), [{ indice: 2, repeat: 9 }, { indice: 2, repeat: 2 }])
    assert.deepEqual(X.aEntradas(tanda(18), NOMBRES).map(e => e.repeat), [9, 9]); assert.deepEqual(X.aEntradas(tanda(19), NOMBRES).map(e => e.repeat), [9, 9, 1])
    assert.ok(X.aEntradas(tanda(40), NOMBRES).every(e => e.repeat >= 1 && e.repeat <= X.MAX_SEGUIDAS)) })

  await prueba('de ida y vuelta: expandir las entradas da la misma estructura (también con repeat y tandas largas); cualquier estructura con todas las partes sobrevive a guardar y reabrir', () => {
    assert.deepEqual(X.desdeEntradas(X.aEntradas(NO_SEGUIDAS, NOMBRES), NOMBRES), NO_SEGUIDAS)
    const con = [V1, C, C, C, V2, C, C, Bd, V3, V3]; assert.deepEqual(X.desdeEntradas(X.aEntradas(con, NOMBRES), NOMBRES), con)
    const larga = [V1, V2, ...Array(14).fill(C), Bd, V3]; assert.deepEqual(X.desdeEntradas(X.aEntradas(larga, NOMBRES), NOMBRES), larga)
    let semilla = 7; const azar = n => { semilla = (semilla * 1103515245 + 12345) & 0x7fffffff; return semilla % n }          // generador fijo: la prueba es repetible
    for (let k = 0; k < 300; k++) {
      const est = Array.from({ length: 1 + azar(30) }, () => K[azar(K.length)]), completa = X.normalizar(est, NOMBRES)
      assert.deepEqual(X.desdeEntradas(X.aEntradas(completa, NOMBRES), NOMBRES), completa, 'ida y vuelta: ' + completa.join(',')) } })

  await prueba('desdeEntradas lee lo guardado tal cual: salta índices fuera de rango, trata un repeat raro como 1 y no pasa de 60 pasos; no completa partes que faltan', () => {
    assert.deepEqual(X.desdeEntradas([{ indice: 0, repeat: 2 }, { indice: 9, repeat: 1 }, { indice: -1, repeat: 1 }, { indice: '1', repeat: 1 }, { indice: 2, repeat: 'x' }], NOMBRES), [V1, V1, C], 'un índice que no es entero (ni siquiera «1» como texto) se salta')
    assert.deepEqual(X.desdeEntradas([{ indice: 0, repeat: 99 }], NOMBRES), Array(9).fill(V1), 'repeat se lleva a 9')
    assert.equal(X.desdeEntradas(Array.from({ length: 30 }, () => ({ indice: 2, repeat: 9 })), NOMBRES).length, X.MAX_PASOS)
    assert.deepEqual(X.desdeEntradas([{ indice: 1, repeat: 1 }], NOMBRES), [V2], 'una canción con arreglo que omite partes se ve como está guardada'); assert.deepEqual(X.desdeEntradas([], NOMBRES), []) })

  await prueba('lo que se manda al guardar: nada (undefined) si es la estructura por defecto; si no, las entradas; una parte que falta entra al final y una referencia a una parte inexistente se suelta', () => {
    assert.equal(X.estructuraParaGuardar(K, NOMBRES), undefined); assert.equal(X.estructuraParaGuardar([], NOMBRES), undefined, 'una estructura vacía se normaliza a la de por defecto')
    assert.deepEqual(X.estructuraParaGuardar(NO_SEGUIDAS, NOMBRES), X.aEntradas(NO_SEGUIDAS, NOMBRES))
    assert.deepEqual(X.estructuraParaGuardar([C, V1, V2, Bd], NOMBRES).map(e => e.indice), [2, 0, 1, 3, 4], 'V3 faltaba: entra al final')
    assert.deepEqual(X.estructuraParaGuardar([V1, 'FANTASMA#0', V2, C, Bd, V3], NOMBRES), undefined, 'sin la referencia fantasma queda la de por defecto')
    assert.equal(X.estructuraParaGuardar([V1, V1, V2, C, Bd, V3], NOMBRES)[0].repeat, 2, 'repetir un verso seguido: V1 ×2') })

  await prueba('el texto cambia: si la estructura era la de por defecto, sigue al texto; si era propia, una parte nueva entra AL FINAL y lo que ya no existe se suelta', () => {
    const antes = NOMBRES, despues = ['VERSO 1', 'PRE-CORO', 'VERSO 2', 'CORO', 'PUENTE', 'VERSO 3']
    assert.deepEqual(X.sincronizar(K, antes, despues), X.estructuraPorDefecto(despues), 'por defecto: el pre-coro entra en su lugar del texto')
    const propia = [V1, V2, C, V1, V2, C], s = X.sincronizar(propia, antes, despues)
    assert.deepEqual(s, [V1, V2, C, V1, V2, C, 'PRE-CORO#0', Bd, V3], 'propia: se conserva lo que había y las partes que no estaban entran al FINAL, en el orden del texto (pre-coro, puente, verso 3)')
    assert.deepEqual(s.slice(0, 6), propia, 'lo que ya estaba no se mueve')
    assert.deepEqual(X.sincronizar([V1, V2, C, V1, C], antes, ['VERSO 1', 'VERSO 2']), [V1, V2, V1], 'se quitaron CORO, PUENTE y VERSO 3 del texto: sus referencias se sueltan')
    assert.deepEqual(X.sincronizar(propia, antes, ['VERSO 1', 'VERSO 2', 'ESTRIBILLO']), [V1, V2, V1, V2, 'ESTRIBILLO#0'], 'renombrada a mano: CORO se suelta y ESTRIBILLO entra al final') })

  await prueba('«Volver a usar»: agrega al final una referencia a una parte que ya existe (sin crear parte); null con una clave inexistente o en el tope de 60', () => {
    assert.deepEqual(X.agregarReferencia([V1, V2], C, NOMBRES), [V1, V2, C]); assert.deepEqual(X.agregarReferencia([V1, V2, C], V1, NOMBRES), [V1, V2, C, V1])
    assert.equal(X.agregarReferencia([V1], 'FANTASMA#0', NOMBRES), null); assert.equal(X.agregarReferencia(Array(X.MAX_PASOS).fill(V1), C, NOMBRES), null)
    assert.equal(X.agregarReferencia(Array(X.MAX_PASOS - 1).fill(V1), C, NOMBRES).length, X.MAX_PASOS, '59 + 1 = 60 cabe')
    const nombres2 = [...NOMBRES, 'FINAL']; assert.deepEqual(X.agregarParteNueva([V1, C], X.clavesDeLasPartes(nombres2)[5], nombres2), [V1, C, 'FINAL#0'], '«Parte nueva»: su referencia entra al final') })

  await prueba('«Repetir aquí»: una copia justo después; null fuera de rango o en el tope', () => {
    assert.deepEqual(X.repetirAqui([V1, C, V2], 1), [V1, C, C, V2]); assert.deepEqual(X.repetirAqui([V1], 0), [V1, V1])
    assert.equal(X.repetirAqui([V1], 1), null); assert.equal(X.repetirAqui([V1], -1), null); assert.equal(X.repetirAqui(Array(X.MAX_PASOS).fill(C), 0), null) })

  await prueba('«Quitar de la estructura»: quita una referencia; en la ÚLTIMA aparición de la parte no se puede (se ofrece «Eliminar sección»)', () => {
    const est = [V1, V2, C, V1, V2, C]
    assert.ok(X.puedeQuitar(est, 0) && X.puedeQuitar(est, 5)); assert.deepEqual(X.quitarReferencia(est, 3), [V1, V2, C, V2, C])
    assert.ok(!X.puedeQuitar([V1, V2, C], 1) && X.quitarReferencia([V1, V2, C], 1) === null, 'V2 aparece una sola vez')
    const una = X.quitarReferencia(est, 0); assert.ok(!X.puedeQuitar(una, 2), 'tras quitar la primera V1, la que queda ya es la última'); assert.equal(X.quitarReferencia(est, 99), null); assert.equal(X.quitarReferencia(est, -1), null) })

  await prueba('«Mover» ‹ ›: cambia de sitio con la vecina; null en los bordes y entre dos referencias de la misma parte (no cambiaría nada)', () => {
    assert.deepEqual(X.moverReferencia([V1, V2, C], 1, 1), [V1, C, V2]); assert.deepEqual(X.moverReferencia([V1, V2, C], 1, -1), [V2, V1, C])
    assert.equal(X.moverReferencia([V1, V2, C], 0, -1), null); assert.equal(X.moverReferencia([V1, V2, C], 2, 1), null); assert.equal(X.moverReferencia([V1, C, C], 1, 1), null)
    assert.equal(X.moverReferencia([V1, V2], 5, 1), null) })

  await prueba('«Eliminar sección»: sin la parte y todas sus apariciones; y tocar un círculo salta a la parte de ESA referencia (las repeticiones, a la misma)', () => {
    assert.deepEqual(X.sinParte(NO_SEGUIDAS, C), [V1, V2, V1, V2, Bd, V3]); assert.equal(X.aparicionesDe(NO_SEGUIDAS, C), 3); assert.equal(X.aparicionesDe(NO_SEGUIDAS, Bd), 1)
    assert.deepEqual(NO_SEGUIDAS.map((_, i) => X.parteDeReferencia(NO_SEGUIDAS, NOMBRES, i)), [0, 1, 2, 0, 1, 2, 3, 4, 2], 'los tres círculos del coro saltan a la parte 2')
    assert.equal(X.parteDeReferencia(NO_SEGUIDAS, NOMBRES, 99), -1) })

  await prueba('ninguna operación modifica la estructura que recibe', () => {
    const est = Object.freeze([V1, V2, C, V1]); const copia = [...est]
    X.agregarReferencia(est, C, NOMBRES); X.repetirAqui(est, 1); X.quitarReferencia(est, 0); X.moverReferencia(est, 0, 1); X.sinParte(est, C); X.normalizar(est, NOMBRES); X.sincronizar(est, NOMBRES, ['VERSO 1']); X.aEntradas(est, NOMBRES)
    assert.deepEqual([...est], copia) })

  await prueba('el tope: normalizar no pasa de 60 pasos y deja las partes que faltan solo si caben', () => {
    const largo = Array(80).fill(V1); const n = X.normalizar(largo, NOMBRES)
    assert.equal(n.length, X.MAX_PASOS); assert.ok(n.every(c => c === V1), 'con el tope lleno de V1 no caben las demás partes (el editor nunca debe llegar ahí: «Volver a usar» ya se frena en 60)') })

  terminar()
})
