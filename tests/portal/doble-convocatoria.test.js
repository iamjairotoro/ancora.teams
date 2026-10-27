// «Convocado a dos equipos» (punto 4): el choque, qué se declina, el orden de las tarjetas y los textos. Replica la regla de la base (037c). Correr: `node tests/portal/doble-convocatoria.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const D = real('lib/portal/doble'), T = real('lib/textos/doble').TEXTOS_DOBLE

const sv = (id, fecha, ini, fin, extra = {}) => ({ id, fecha, hora_inicio: ini, hora_fin: fin, tipo: 'servicio', ...extra })
const e = (id, team, servicio, status, extra = {}) => ({ service: servicio, team: team && { id: team, name: team === 'tA' ? 'Alabanza' : team === 'tP' ? 'Producción' : 'Montaje' }, posiciones: [], cerrada: false,
  invitation: { id, status, sent_at: '2026-10-01', declined_reason: null, ...extra } })
const S1 = sv('s1', '2026-11-01', '10:00:00', '14:00:00')

correr(async () => {
  console.log('el choque (la regla de la base)')
  await prueba('mismo día y horas que se traslapan: chocan; al día siguiente, o si una termina justo cuando empieza la otra, no; sin horario se toma 10:00–14:00; un fin <= inicio no choca con nada', async () => {
    const A = e('a', 'tA', S1, 'pendiente'), mk = s => e('b', 'tP', s, 'pendiente')
    assert.equal(D.enChoque(A, [A, mk(S1)]).length, 1, 'mismo servicio'); assert.equal(D.enChoque(A, [mk(sv('s2', '2026-11-01', '12:00:00', '16:00:00'))]).length, 1, 'otro servicio del mismo día que se traslapa')
    assert.equal(D.enChoque(A, [mk(sv('s2', '2026-11-02', '10:00:00', '14:00:00'))]).length, 0, 'otro día'); assert.equal(D.enChoque(A, [mk(sv('s2', '2026-11-01', '14:00:00', '18:00:00'))]).length, 0, 'una termina justo cuando empieza la otra')
    assert.equal(D.enChoque(A, [mk(sv('s2', '2026-11-01', null, null))]).length, 1, 'sin horario: 10:00 a 14:00'); assert.equal(D.enChoque(A, [mk(sv('s2', '2026-11-01', '12:00:00', '11:00:00'))]).length, 0, 'fin <= inicio no choca') })
  await prueba('no cuentan: los ensayos, las convocatorias sin enviar ni las sin equipo; una no choca consigo misma ni con su propia invitación', async () => {
    const A = e('a', 'tA', S1, 'pendiente'), enviada = (x, ex) => ({ ...x, invitation: { ...x.invitation, ...ex } })
    assert.equal(D.enChoque(A, [e('b', 'tP', sv('s1', '2026-11-01', '10:00:00', '14:00:00', { tipo: 'ensayo' }), 'pendiente')]).length, 0, 'ensayo'); assert.equal(D.enChoque(A, [enviada(e('b', 'tP', S1, 'pendiente'), { sent_at: null })]).length, 0, 'sin enviar')
    assert.equal(D.enChoque(A, [e('b', null, S1, 'pendiente')]).length, 0, 'sin equipo'); assert.equal(D.enChoque(A, [A, { ...A }]).length, 0, 'ella misma (misma invitación)')
    assert.deepEqual(D.enChoque(enviada(A, { sent_at: null }), [e('b', 'tP', S1, 'pendiente')]), [], 'si la propia no está enviada no choca con nada') })
  console.log('qué se declina')
  await prueba('al confirmar, se declinan SOLO las pendientes abiertas que chocan; no las confirmadas, ni las que la persona rechazó, ni las ya declinadas por conflicto, ni las cerradas', async () => {
    const A = e('a', 'tA', S1, 'pendiente'), P = e('p', 'tP', S1, 'pendiente'), M = e('m', 'tM', S1, 'pendiente', {})
    assert.deepEqual(D.aDeclinar(A, [A, P]).map(x => x.invitation.id), ['p']); assert.deepEqual(D.aDeclinar(A, [A, P, M]).map(x => x.invitation.id), ['p', 'm'])
    assert.deepEqual(D.aDeclinar(A, [A, e('p', 'tP', S1, 'confirmado')]), [], 'la confirmada no se toca'); assert.deepEqual(D.aDeclinar(A, [A, e('p', 'tP', S1, 'declinado')]), [], 'la que rechazó la persona no se toca')
    assert.deepEqual(D.aDeclinar(A, [A, e('p', 'tP', S1, 'declinado', { declined_reason: 'conflict' })]), [], 'ya declinada por conflicto'); assert.deepEqual(D.aDeclinar(A, [A, { ...P, cerrada: true }]), [], 'cerrada')
    assert.equal(D.confirmadaEnChoque(A, [A, e('p', 'tP', S1, 'confirmado')]).invitation.id, 'p', 'con otra confirmada hay que «Aceptar aquí» / «Cambiar»'); assert.equal(D.confirmadaEnChoque(A, [A, P]), null) })
  console.log('las tarjetas del detalle')
  await prueba('un servicio con dos equipos: la confirmada arriba, luego las sin responder, la declinada automática y al final la rechazada; estable; una tarjeta por equipo con sus posiciones juntas', async () => {
    const A = { ...e('a', 'tA', S1, 'pendiente'), posiciones: ['Bass', 'Voces'] }, P = { ...e('p', 'tP', S1, 'pendiente'), posiciones: ['Sonido'] }, M = e('m', 'tM', S1, 'declinado', { declined_reason: 'conflict' }), R = e('r', 'tM', S1, 'declinado'), otro = e('x', 'tA', sv('s9', '2026-11-08', '10:00:00', '14:00:00'), 'pendiente')
    assert.deepEqual(D.convocatoriasDelServicio([R, M, P, A, otro], 's1').map(x => x.invitation.id), ['p', 'a', 'm', 'r'], 'sin confirmada: pendientes (en su orden), declinada automática, rechazada')
    const Ac = { ...A, invitation: { ...A.invitation, status: 'confirmado' } }, Pd = { ...P, invitation: { ...P.invitation, status: 'declinado', declined_reason: 'conflict' } }
    assert.deepEqual(D.convocatoriasDelServicio([Pd, Ac], 's1').map(x => x.invitation.id), ['a', 'p'], 'la confirmada arriba'); assert.equal(D.convocatoriasDelServicio([A], 's1').length, 1); assert.equal(D.esDoble(D.convocatoriasDelServicio([A], 's1')), false); assert.equal(D.esDoble(D.convocatoriasDelServicio([A, P], 's1')), true)
    assert.deepEqual(D.convocatoriasDelServicio([A, P], 's1')[0].posiciones, ['Bass', 'Voces'], 'las posiciones del mismo equipo van juntas en una sola tarjeta')
    assert.deepEqual(D.convocatoriasDelServicio([e('a', 'tA', S1, 'pendiente', { sent_at: null }), P], 's1').map(x => x.invitation.id), ['p'], 'una convocatoria sin enviar no se muestra')
    assert.equal(D.entradaConfirmada([Pd, Ac]).invitation.id, 'a'); assert.equal(D.entradaConfirmada([A, P]), null, 'sin confirmar no se desbloquea nada'); assert.equal(D.entradaPrincipal([A, P]).invitation.id, 'a'); assert.equal(D.entradaPrincipal([Pd, Ac]).invitation.id, 'a'); assert.equal(D.entradaPrincipal([]), null)
    assert.equal(D.quedaAlgunaPorResponder([Ac, P]), true, 'el chip «Por responder» no se va mientras quede alguna'); assert.equal(D.quedaAlgunaPorResponder([Ac, Pd]), false); assert.equal(D.quedaAlgunaPorResponder([Ac, { ...P, cerrada: true }]), false) })
  console.log('los textos')
  await prueba('el aviso de confirmación dice a qué equipo se confirma, cuáles se declinan y la regla del cruce (día y horas)', async () => {
    assert.equal(T.confirmarTitulo('Alabanza'), '¿Confirmar en Alabanza?'); assert.equal(T.confirmarTexto(['Producción']), 'Se declinará tu convocatoria en Producción. Podrás cambiarla después.'); assert.equal(T.confirmarTexto(['Producción', 'Montaje']), 'Se declinará tu convocatoria en Producción y Montaje. Podrás cambiarla después.')
    assert.equal(T.lista(['A', 'B', 'C']), 'A, B y C'); assert.equal(T.lista([]), 'otro equipo'); const A = e('a', 'tA', S1, 'pendiente'), P = e('p', 'tP', S1, 'pendiente')
    assert.equal(D.textoDelCruce(A, [P]), 'Se cruzan el domingo 1 de noviembre, de 10:00 a 14:00.'); assert.equal(D.textoDelCruce(A, [e('p', 'tP', sv('s2', '2026-11-01', '12:00:00', '16:00:00'), 'pendiente')]), 'Se cruzan el domingo 1 de noviembre (Alabanza 10:00 a 14:00 · Producción 12:00 a 16:00).')
    assert.equal(D.textoDelCruce(A, [e('p', 'tP', sv('s2', '2026-11-01', null, null), 'pendiente')]), 'Se cruzan el domingo 1 de noviembre, de 10:00 a 14:00.', 'sin horario se toma 10:00 a 14:00 como la base')
    assert.equal(T.declinadaAuto, 'Se declinó porque confirmaste otro equipo'); assert.equal(T.convocatorias(2), '2 convocatorias'); assert.ok(/dos equipos/.test(T.aviso(2)) && /los otros se declinan/.test(T.aviso(3))) })
  await prueba('las reglas de datos: ningún porcentaje individual y nada de quién rechazó en la lógica ni en los textos', async () => {
    for (const f of ['lib/portal/doble.ts', 'lib/textos/doble.ts']) { const t = fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''); assert.ok(!/%/.test(t), f + ' sin porcentajes'); assert.ok(!/rechaz/i.test(t.replace(/rechazo/g, '')), f + ' no dice quién rechazó') } })
  terminar()
})
