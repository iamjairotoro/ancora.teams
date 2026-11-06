// Etapa C2: el modelo del editor de acordes (lib/editorAcordes.ts): la regla de posición al insertar, borrar y pegar texto; interludios; de y hacia el formato 2; Deshacer. Correr: `node tests/portal/editor-acordes.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), { parseLyrics } = require(path.join(RAIZ, 'lib/parseLyrics.ts'))
const A = (g, cal = '') => ({ g, cal })
const doc = (texto, anclas = [], interludios = []) => ({ texto, anclas: anclas.map(([at, g]) => ({ at, acorde: A(g) })), interludios })
const ver = d => d.anclas.map(a => `${a.at}:${a.acorde.g}`).join(' ')
const T1 = 'Aquí va la letra'                                   // A0 q1 u2 í3 _4 v5 a6 _7 l8 a9 _10 l11 e12 t13 r14 a15 · largo 16
const base = () => doc(T1, [[0, 1], [5, 4], [11, 5], [16, 6]])   // G sobre «Aquí», C sobre «va», D sobre «letra», E al final de la línea
const ed = (d, s, e, t) => E.aplicarEdicion(d, { s, e, t })

correr(async () => {
  await prueba('INSERTAR — mitad de palabra: las anclas antes no cambian y las de después se corren', () => {
    const r = ed(base(), 2, 2, 'xx'); assert.equal(r.doc.texto, 'Aqxxuí va la letra'); assert.equal(ver(r.doc), '0:1 7:4 13:5 18:6'); assert.deepEqual(r.quitados, { acordes: 0, interludios: 0 }) })
  await prueba('INSERTAR — dentro de la palabra que lleva el acorde (después del ancla): el acorde no se mueve', () => { assert.equal(ver(ed(base(), 6, 6, 'h').doc), '0:1 5:4 12:5 17:6') })
  await prueba('INSERTAR — inicio de palabra, justo donde está el acorde: el acorde sigue a su letra (se corre)', () => {
    const r = ed(base(), 5, 5, '¡'); assert.equal(r.doc.texto, 'Aquí ¡va la letra'); assert.equal(ver(r.doc), '0:1 6:4 12:5 17:6'); assert.equal(r.doc.texto[6], 'v') })
  await prueba('INSERTAR — final de palabra: solo se corren las de después', () => { assert.equal(ver(ed(base(), 7, 7, 's').doc), '0:1 5:4 12:5 17:6') })
  await prueba('INSERTAR — final de la línea con un acorde al final: escribir ahí no lo arrastra', () => {
    const r = ed(base(), 16, 16, '!'); assert.equal(r.doc.texto, 'Aquí va la letra!'); assert.equal(ver(r.doc), '0:1 5:4 11:5 16:6') })
  await prueba('PEGAR — una línea en medio: se corren las anclas desde ahí', () => { assert.equal(ver(ed(base(), 8, 8, 'muy ').doc), '0:1 5:4 15:5 20:6') })
  await prueba('PEGAR — varias líneas: lo anterior queda arriba y lo posterior baja con su posición recalculada', () => {
    const r = ed(base(), 8, 8, 'uno\ndos '); assert.equal(r.doc.texto, 'Aquí va uno\ndos la letra'); assert.equal(ver(r.doc), '0:1 5:4 19:5 24:6')
    const est = E.estructura(r.doc.texto); const l2 = est.lineas[1]; assert.equal(l2.txt, 'dos la letra'); assert.equal(19 - l2.ini, 7); assert.equal(r.doc.texto[19], 'l') })
  await prueba('LÍNEA NUEVA (Enter) — en el medio; con un acorde justo en el corte, el acorde baja al inicio de la línea nueva', () => {
    assert.equal(ver(ed(base(), 8, 8, '\n').doc), '0:1 5:4 12:5 17:6')
    const d = E.ponerAcorde(base(), 8, A(2)); const r = ed(d, 8, 8, '\n'); assert.equal(r.doc.anclas.find(a => a.acorde.g === 2).at, 9); assert.equal(E.estructura(r.doc.texto).lineas[1].ini, 9) })
  await prueba('LÍNEA NUEVA — al inicio: el acorde del inicio baja con su letra; al final: el acorde del final se queda arriba', () => {
    const i = ed(base(), 0, 0, '\n'); assert.equal(ver(i.doc), '1:1 6:4 12:5 17:6'); assert.equal(E.estructura(i.doc.texto).lineas[0].txt, '')
    const f = ed(base(), 16, 16, '\n'); assert.equal(ver(f.doc), '0:1 5:4 11:5 16:6'); assert.equal(f.doc.texto, T1 + '\n') })
  await prueba('BORRAR — un carácter: las anclas de después retroceden; corregir la primera letra de una palabra con acorde SELECCIONÁNDOLA y escribiendo otra (reemplazo) no mueve ni quita el acorde', () => {
    assert.equal(ver(ed(base(), 2, 3, '').doc), '0:1 4:4 10:5 15:6')
    const corregir = ed(base(), 5, 6, 'b'); assert.equal(corregir.doc.texto, 'Aquí ba la letra'); assert.equal(ver(corregir.doc), '0:1 5:4 11:5 16:6')
    // borrar la letra y escribir otra son DOS ediciones: tras borrar el acorde queda sobre la letra que sigue y al insertar justo ahí se corre con ella (regla de insertar)
    const dos = ed(ed(base(), 5, 6, '').doc, 5, 5, 'b'); assert.equal(dos.doc.texto, 'Aquí ba la letra'); assert.equal(ver(dos.doc), '0:1 6:4 11:5 16:6') })
  await prueba('BORRAR — una palabra con su acorde: el acorde queda sobre la palabra que sigue; las de después retroceden', () => {
    const r = ed(base(), 5, 8, ''); assert.equal(r.doc.texto, 'Aquí la letra'); assert.equal(ver(r.doc), '0:1 5:4 8:5 13:6'); assert.equal(r.doc.texto[5], 'l'); assert.equal(r.quitados.acordes, 0) })
  await prueba('BORRAR — con un acorde estrictamente en el medio de lo borrado: ese acorde se quita y se cuenta', () => {
    const r = ed(base(), 4, 7, ''); assert.equal(r.doc.texto, 'Aquí la letra'); assert.equal(ver(r.doc), '0:1 8:5 13:6'); assert.equal(r.quitados.acordes, 1) })
  await prueba('REEMPLAZAR — ningún acorde se pierde: los del rango pasan al inicio, uno por lugar; los que no caben se quitan y se cuentan', () => {
    const uno = ed(base(), 4, 8, '-'); assert.equal(uno.doc.texto, 'Aquí-la letra'); assert.equal(ver(uno.doc), '0:1 4:4 8:5 13:6'); assert.equal(uno.quitados.acordes, 0)
    const dos = E.ponerAcorde(base(), 6, A(2)); const caben = ed(dos, 4, 8, 'ab'); assert.equal(ver(caben.doc), '0:1 4:4 5:2 9:5 14:6'); assert.equal(caben.quitados.acordes, 0)
    const nocaben = ed(dos, 4, 8, '-'); assert.equal(ver(nocaben.doc), '0:1 4:4 8:5 13:6'); assert.equal(nocaben.quitados.acordes, 1) })
  await prueba('UNIR LÍNEAS (borrar el salto): el acorde del final y el del inicio de la línea de abajo no se pisan', () => {
    const r = ed(doc('Aquí\nva la', [[4, 1], [5, 4]]), 4, 5, ''); assert.equal(r.doc.texto, 'Aquíva la'); assert.equal(ver(r.doc), '4:1 5:4'); assert.equal(r.quitados.acordes, 0) })
  await prueba('LÍNEA ELIMINADA — sus acordes se van con ella (incluido el del inicio); los de las líneas de después suben', () => {
    const d = doc('uno\ndos\ntres', [[0, 1], [4, 2], [8, 3]])
    const r = ed(d, 4, 8, ''); assert.equal(r.doc.texto, 'uno\ntres'); assert.equal(ver(r.doc), '0:1 4:3'); assert.equal(r.quitados.acordes, 1)
    const ultima = ed(d, 4, 12, ''); assert.equal(ultima.doc.texto, 'uno\n'); assert.equal(ver(ultima.doc), '0:1'); assert.equal(ultima.quitados.acordes, 2)
    const todo = ed(d, 0, 12, ''); assert.equal(ver(todo.doc), ''); assert.equal(todo.quitados.acordes, 3) })
  await prueba('un acorde que queda sobre una línea vacía, un encabezado o «(instrumental)» se quita y se cuenta (no se puede guardar)', () => {
    const r = ed(doc('uno\ndos', [[5, 1]]), 4, 7, ' '); assert.equal(ver(r.doc), ''); assert.equal(r.quitados.acordes, 1)
    assert.equal(E.ponerAcorde(doc('CORO\nCuán grande'), 2, A(1)), null, 'encabezado'); assert.equal(E.ponerAcorde(doc('uno\n\ndos'), 4, A(1)), null, 'línea vacía')
    assert.equal(E.ponerAcorde(doc('INTERLUDIO:\n(instrumental)'), 15, A(1)), null, 'marcador'); assert.equal(E.ponerAcorde(doc('uno'), 9, A(1)), null, 'fuera del texto')
    const h = E.ponerAcorde(doc('uno\ndos'), 5, A(1)); assert.equal(ver(h), '5:1') })
  await prueba('INTERLUDIO — queda pegado a SU línea: escribir al final de su línea lo deja al final de esa línea, escribir antes lo corre, borrar la línea lo quita, unir líneas lo lleva al final de la línea unida', () => {
    const d = { texto: 'uno\ndos', anclas: [], interludios: [{ at: 3, items: [{ acorde: A(1) }] }] }
    const fin = ed(d, 3, 3, 'x').doc; assert.equal(fin.texto, 'unox\ndos'); assert.equal(fin.interludios[0].at, 4, 'sigue al final de SU línea (la línea creció)'); assert.equal(fin.texto[4], '\n')
    assert.equal(ed(d, 1, 1, 'xx').doc.interludios[0].at, 5)
    const quita = ed(d, 0, 4, ''); assert.equal(quita.doc.interludios.length, 0); assert.equal(quita.quitados.interludios, 1)
    const une = ed(d, 3, 4, ''); assert.equal(une.doc.texto, 'unodos'); assert.deepEqual(une.doc.interludios.map(x => x.at), [6]); assert.equal(une.quitados.interludios, 0) })
  await prueba('INTERLUDIO — ponerInterludio solo al final de una línea de letra; dos interludios que caen en el mismo lugar se unen sin perder nada', () => {
    const d = doc('uno\ndos'); assert.equal(E.ponerInterludio(d, 1, [{ acorde: A(1) }]), null); assert.ok(E.ponerInterludio(d, 3, [{ acorde: A(1) }]))
    const dos = { texto: 'uno\nxdos', anclas: [], interludios: [{ at: 3, items: [{ acorde: A(1) }] }, { at: 4, items: [{ acorde: A(4) }] }] }
    const r = ed(dos, 3, 4, ''); assert.equal(r.doc.interludios.length, 1); assert.equal(r.doc.interludios[0].items.length, 2) })
  await prueba('PROPIEDADES (ediciones al azar, semilla fija): las anclas siguen ordenadas, únicas y dentro del texto; nunca aumentan; el acorde no cambia de contenido; el texto es el esperado', () => {
    let x = 12345; const rnd = n => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x % n }
    const trozos = ['a', 'bc', ' ', '\n', 'xyz ', '\n\n', 'Coro\n', '']
    let d = doc('Aquí va la letra\nsegunda línea larga\n\nCORO\ntercera línea', [[0, 1], [5, 2], [11, 3], [16, 4], [20, 5], [40, 6], [47, 7]])
    for (let i = 0; i < 400; i++) {
      const L = d.texto.length, s = rnd(L + 1), e = Math.min(L, s + (rnd(3) === 0 ? rnd(8) : 0)), t = trozos[rnd(trozos.length)], antes = d.anclas.length
      const esperado = d.texto.slice(0, s) + t + d.texto.slice(e); const r = ed(d, s, e, t)
      assert.equal(r.doc.texto, esperado); assert.ok(r.doc.anclas.length <= antes)
      assert.equal(r.doc.anclas.length + r.quitados.acordes, antes, 'cada ancla o sigue o se cuenta como quitada')
      for (let k = 0; k < r.doc.anclas.length; k++) { const a = r.doc.anclas[k]; assert.ok(a.at >= 0 && a.at <= r.doc.texto.length); if (k) assert.ok(a.at > r.doc.anclas[k - 1].at); assert.ok([1, 2, 3, 4, 5, 6, 7].includes(a.acorde.g)) }
      d = r.doc.anclas.length < 3 ? { ...r.doc, anclas: [...r.doc.anclas] } : r.doc
    } })
  await prueba('diffTexto: una sola operación; con el cursor se desempata el texto repetido y el borrado hacia atrás o adelante', () => {
    assert.deepEqual(E.diffTexto('hola', 'hoXla'), { s: 2, e: 2, t: 'X' }); assert.deepEqual(E.diffTexto('hola', 'hla'), { s: 1, e: 2, t: '' }); assert.deepEqual(E.diffTexto('hola', 'hEYla'), { s: 1, e: 2, t: 'EY' })
    assert.deepEqual(E.diffTexto('aa', 'aaa'), { s: 2, e: 2, t: 'a' }); assert.deepEqual(E.diffTexto('aa', 'aaa', 1), { s: 0, e: 0, t: 'a' }); assert.deepEqual(E.diffTexto('aaa', 'aa', 1), { s: 1, e: 2, t: '' })
    assert.deepEqual(E.diffTexto('abc', 'abc'), { s: 3, e: 3, t: '' }); const c = E.cambiarTexto(base(), T1); assert.equal(c.doc, c.doc); assert.equal(c.quitados.acordes, 0)
    assert.equal(E.cambiarTexto(doc('a\r\nb'), 'a\nb').doc.texto, 'a\nb') })
  await prueba('estructura() coincide con parseLyrics() (encabezados, bloques, líneas sueltas, espacios) para muchos textos', () => {
    const muestras = ['', 'solo una línea', 'CORO\nCuán grande es Él\ncantará', 'VERSO 1:\nuno\ndos\n\nCORO:\ntres', '\n\nVERSO\nuno\n\n\n\nCORO\ndos\n', 'Aleluya\n\nAmén', 'a\nb\nc', 'VERSO 1 (2x):\nuno\n \t \nPUENTE\ndos\ntres', 'Una frase muy larga que no es encabezado\nsegunda', 'CORO\n\nsolo', 'X\nY\n\nZ\nW\n\n\nQ']
    for (const m of muestras) { const e = E.estructura(m), a = e.secciones.map(s => ({ name: s.nombre, lyrics: s.lineas.map(i => e.lineas[i].txt).join('\n') })), b = parseLyrics(m)
      assert.deepEqual(a, b.map(s => ({ name: s.name, lyrics: s.lyrics })), JSON.stringify(m)) } })
  await prueba('aSecciones / desdeSecciones: ida y vuelta exacta (acordes al inicio, en medio y al final de la línea, interludios, sección solo instrumental)', () => {
    const texto = 'VERSO 1:\nAquí va la letra\nsegunda línea\n\nCORO:\nCuán grande\n\nINTERLUDIO:\n(instrumental)'
    const d0 = { texto, anclas: [{ at: 9, acorde: A(1) }, { at: 14, acorde: { g: 5, cal: '7', bajo: { g: 3 } } }, { at: 25, acorde: A(6, 'm') }, { at: 49, acorde: { g: 4, alt: '#', cal: 'sus4' } }], interludios: [{ at: 39, items: [{ acorde: A(1) }, { texto: '|' }, { acorde: A(5) }] }, { at: texto.length, items: [{ acorde: A(2, 'm') }] }] }
    const secs = E.aSecciones(d0); assert.deepEqual(secs.map(s => [s.nombre, s.codigo]), [['VERSO 1', 'V1'], ['CORO', 'C'], ['INTERLUDIO', 'INT']])
    const l1 = secs[0].lineas; assert.equal(l1[0].segments[0].acorde.g, 1); assert.equal(l1[0].segments[0].text, 'Aquí va la letra'.slice(0, 5)); assert.equal(l1.length, 3, '2 de letra + el interludio'); assert.equal(l1[2].kind, 'bars')
    assert.equal(secs[2].lineas.length, 1, 'la sección instrumental solo trae su interludio'); assert.equal(secs[2].lineas[0].kind, 'bars')
    const vuelta = E.desdeSecciones(texto, secs.map(s => s.lineas)); assert.deepEqual(vuelta, d0) })
  await prueba('desdeSecciones: si el chart no encaja con la letra (otro texto, otro número de secciones o de líneas, texto literal, interludio antes de la primera línea) devuelve null: no se adivina', () => {
    const texto = 'VERSO:\nuno\ndos', ok = [[{ kind: 'lyric', segments: [{ text: 'uno' }] }, { kind: 'lyric', segments: [{ text: 'dos', acorde: A(1) }] }]]
    assert.ok(E.desdeSecciones(texto, ok))
    assert.equal(E.desdeSecciones(texto, [[{ kind: 'lyric', segments: [{ text: 'uno' }] }, { kind: 'lyric', segments: [{ text: 'DOS' }] }]]), null); assert.equal(E.desdeSecciones(texto, []), null); assert.equal(E.desdeSecciones(texto, [ok[0].slice(0, 1)]), null)
    assert.equal(E.desdeSecciones(texto, [[{ kind: 'lyric', segments: [{ text: 'uno', literal: 'N.C.' }] }, ok[0][1]]]), null)
    assert.equal(E.desdeSecciones(texto, [[{ kind: 'bars', items: [{ acorde: A(1) }] }, ...ok[0]]]), null)
    assert.equal(E.desdeSecciones(texto, [[...ok[0], { kind: 'lyric', segments: [{ text: 'tres' }] }]]), null) })
  await prueba('códigos de sección únicos y cortos (Verso 1 → V1, Coro → C, Pre-coro → PC, dos «Coro» no repiten)', () => {
    const u = new Set(); const c = n => E.codigoDeSeccion(n, 0, u)
    assert.equal(c('Verso 1'), 'V1'); assert.equal(c('VERSO 2'), 'V2'); assert.equal(c('Coro'), 'C'); assert.equal(c('Pre-coro'), 'PC'); assert.equal(c('Puente'), 'P'); const c2 = c('CORO'); assert.notEqual(c2, 'C'); assert.ok(/^[A-Za-z0-9-]{1,6}$/.test(c2))
    assert.ok(/^[A-Za-z0-9-]{1,6}$/.test(c('Ñandú 3 ¿?'))); assert.ok(/^[A-Za-z0-9-]{1,6}$/.test(c(''))); assert.equal(new Set([...u]).size, u.size) })
  await prueba('agregarSeccionInstrumental: agrega «INTERLUDIO:» y «(instrumental)» al final sin mover los acordes de antes, y se le puede poner un interludio', () => {
    const d = base(); const r = E.agregarSeccionInstrumental(d); assert.equal(r.doc.texto, T1 + '\n\nINTERLUDIO:\n(instrumental)'); assert.equal(ver(r.doc), ver(d)); assert.equal(r.at, r.doc.texto.length)
    const con = E.ponerInterludio(r.doc, r.at, [{ acorde: A(1) }]); assert.ok(con); assert.equal(E.finDeSeccion(con, 1), r.at); assert.equal(E.finDeSeccion(con, 0), 16)
    assert.equal(E.agregarSeccionInstrumental(E.docVacio('')).doc.texto, 'INTERLUDIO:\n(instrumental)') })
  await prueba('Deshacer y Rehacer: una foto por acción, escribir seguido en una misma línea se junta, límite de 100, rehacer se borra al hacer algo nuevo', () => {
    let h = E.nuevoHistorial(doc('a')); assert.ok(!E.puedeDeshacer(h) && !E.puedeRehacer(h))
    h = E.registrar(h, doc('ab'), 'l1'); h = E.registrar(h, doc('abc'), 'l1'); assert.equal(h.pasado.length, 1, 'escribir seguido en la misma línea = una foto')
    h = E.registrar(h, doc('abcd'), 'l2'); assert.equal(h.pasado.length, 2)
    h = E.deshacer(h); assert.equal(h.presente.texto, 'abc'); assert.ok(E.puedeRehacer(h)); h = E.deshacer(h); assert.equal(h.presente.texto, 'a'); assert.ok(!E.puedeDeshacer(h)); assert.equal(E.deshacer(h), h)
    h = E.rehacer(h); assert.equal(h.presente.texto, 'abc'); h = E.registrar(h, doc('Z')); assert.ok(!E.puedeRehacer(h))
    let g = E.nuevoHistorial(doc('0')); for (let i = 1; i <= 150; i++) g = E.registrar(g, doc(String(i))); assert.equal(g.pasado.length, E.LIMITE_HISTORIAL)
    const igual = g.presente; assert.equal(E.registrar(g, igual), g, 'sin cambios no hay foto') })
  await prueba('HUECOS que las mutaciones encontraron: Enter al final de una línea con interludio, ancla al final del texto, colapso de varios acordes, choque al final, interludio sobre línea que queda vacía o dentro de un borrado, poner dos veces, cambiarTexto sin cambios', () => {
    const conInt = { texto: 'uno\ndos', anclas: [], interludios: [{ at: 3, items: [{ acorde: A(1) }] }] }
    const enter = ed(conInt, 3, 3, '\n'); assert.equal(enter.doc.texto, 'uno\n\ndos'); assert.deepEqual(enter.doc.interludios.map(x => x.at), [3], 'Enter al final de su línea: el interludio se queda con SU línea')
    const fin = ed(doc('uno\ndos', [[3, 1], [7, 2]]), 4, 7, ''); assert.equal(fin.doc.texto, 'uno\n'); assert.equal(ver(fin.doc), '3:1', 'borrar la última línea: se va el ancla del final del texto'); assert.equal(fin.quitados.acordes, 1)
    const tres = doc('0123456789', [[2, 1], [3, 2], [4, 3]]); const r2 = ed(tres, 1, 6, 'ab'); assert.equal(r2.doc.texto, '0ab6789'); assert.equal(ver(r2.doc), '1:1 2:2', 'tres acordes en el rango y dos lugares: el tercero se quita'); assert.equal(r2.quitados.acordes, 1)
    const r3 = ed(doc('0123456789', [[2, 1], [3, 2], [4, 3]]), 1, 6, 'abc'); assert.equal(ver(r3.doc), '1:1 2:2 3:3'); assert.equal(r3.quitados.acordes, 0)
    const choque = ed(doc('a\nb', [[1, 1], [2, 2], [3, 3]]), 1, 2, ''); assert.equal(choque.doc.texto, 'ab'); assert.equal(ver(choque.doc), '1:1 2:2'); assert.equal(choque.quitados.acordes, 1, 'el que no cabe al final se quita y se cuenta')
    const vacia = ed(conInt, 0, 3, ' '); assert.equal(vacia.doc.interludios.length, 0); assert.equal(vacia.quitados.interludios, 1, 'la línea del interludio quedó vacía')
    const dentro = { texto: 'uno\ndos\ntres', anclas: [], interludios: [{ at: 3, items: [{ acorde: A(1) }] }] }; const borra = ed(dentro, 1, 6, ''); assert.equal(borra.doc.texto, 'us\ntres'); assert.deepEqual(borra.doc.interludios.map(x => x.at), [2], 'el interludio sigue al final de la línea unida'); assert.equal(borra.quitados.interludios, 0)
    const dos = E.ponerAcorde(E.ponerAcorde(doc('uno'), 1, A(1)), 1, A(2)); assert.equal(dos.anclas.length, 1); assert.equal(dos.anclas[0].acorde.g, 2)
    assert.equal(E.ponerAcorde(doc('uno\n\u00a0\ndos'), 4, A(1)), null, 'una línea con solo un espacio duro no es letra')
    const d0 = base(); assert.equal(E.cambiarTexto(d0, d0.texto).doc, d0, 'sin cambios devuelve el MISMO documento'); assert.notEqual(E.cambiarTexto(d0, d0.texto + 'x').doc, d0)
    let h = E.nuevoHistorial(doc('a')); h = E.registrar(h, doc('b')); h = E.registrar(h, doc('c')); h = E.deshacer(E.deshacer(h)); h = E.rehacer(h); assert.equal(h.presente.texto, 'b'); assert.ok(E.puedeDeshacer(h), 'tras rehacer se puede volver a deshacer'); assert.equal(E.deshacer(h).presente.texto, 'a') })
  terminar()
})
