// La lista de Servicios del portal en teléfono (bloque A2): una ficha por servicio (mockup Lista-Usuario), con TU estado; sin porcentajes ni quién rechazó; escritorio igual que antes. Correr: `node tests/portal/lista-servicios-portal.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const { filasDeServicios } = real('lib/portal/listaServicios')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const svc = (id, fecha, o = {}) => ({ id, fecha, titulo: 'Servicio Ancora', tipo: 'servicio', hora_inicio: '10:00:00', hora_fin: '14:00:00', ...o })
const eq = (id, name, color = 'cobalto') => ({ id, name, color })
const e = (s, team, status, o = {}) => ({ service: s, team, invitation: status ? { status, declined_reason: o.motivo ?? null, needs_reassignment_confirm: o.rol ?? false } : null, posiciones: o.pos ?? [], cerrada: o.cerrada ?? false, reemplazadaPor: o.otro ?? null, nominaSent: o.nomina ?? false })
const vacia = (s, nomina) => ({ service: s, team: null, invitation: null, posiciones: [], nominaSent: nomina })

correr(async () => {
  await prueba('UNA fila por servicio aunque haya varias convocatorias (una por equipo) y servicios sin convocatoria; en orden de fecha y hora', async () => {
    const s1 = svc('s1', '2026-10-25'), s2 = svc('s2', '2026-11-01'), s3 = svc('s3', '2026-10-25', { hora_inicio: '19:00:00', hora_fin: '21:00:00', tipo: 'ensayo', titulo: 'Ensayo' })
    const f = filasDeServicios([e(s2, eq('t1', 'Alabanza'), 'pendiente'), vacia(s3, true), e(s1, eq('t1', 'Alabanza'), 'pendiente', { pos: ['Voces'] }), e(s1, eq('t2', 'Producción', 'ambar'), 'confirmado', { pos: ['Cámara'] })])
    assert.deepEqual(f.map(x => x.servicioId), ['s1', 's3', 's2']); assert.deepEqual(f[0].equipos.map(x => x.inicial), ['A', 'P'], 'cuadritos de los equipos que te convocaron'); assert.deepEqual([f[0].diaSemana, f[0].dia, f[0].mes, f[0].cuando, f[0].horario], ['dom', '25', 'oct', 'domingo 25 de octubre', '10:00 – 14:00']) })
  await prueba('el estado que manda: «Por responder» (ámbar, con «Responder» y «Tu posición») pesa más que «Confirmada»; abre el equipo de esa convocatoria y toma su color', async () => {
    const s = svc('s1', '2026-10-25'), f = filasDeServicios([e(s, eq('t2', 'Producción', 'ambar'), 'confirmado', { pos: ['Cámara'] }), e(s, eq('t1', 'Alabanza', 'cobalto'), 'pendiente', { pos: ['Voces', 'Teclado'] })])[0]
    assert.deepEqual([f.estado, f.ambar, f.responder, f.posicion, f.equipoId, f.color], ['Por responder', true, true, 'Voces · Teclado', 't1', 'cobalto']) })
  await prueba('los demás estados son tuyos y en texto: Confirmada, Tu rol cambió (ámbar), No respondiste (cerrada, sin «Responder»), Dijiste que no puedes, Declinada · aceptaste en X', async () => {
    const s = svc('s1', '2026-10-25'), un = (st, o) => filasDeServicios([e(s, eq('t1', 'Alabanza'), st, o)])[0]
    assert.deepEqual([un('confirmado').estado, un('confirmado').ambar, un('confirmado').responder], ['Confirmada', false, false])
    assert.deepEqual([un('confirmado', { rol: true }).estado, un('confirmado', { rol: true }).ambar], ['Tu rol cambió', true])
    assert.deepEqual([un('pendiente', { cerrada: true }).estado, un('pendiente', { cerrada: true }).responder], ['No respondiste', false])
    assert.equal(un('declinado').estado, 'Dijiste que no puedes'); assert.equal(un('declinado', { motivo: 'conflict', otro: { id: 't2', name: 'Producción' } }).estado, 'Declinada · aceptaste en Producción') })
  await prueba('sin convocatoria: «Nominación pendiente» si el admin aún no envió la nómina; «No convocado» si ya la envió o es un ensayo; sin cuadritos ni «Responder»', async () => {
    const s = svc('s1', '2026-10-25'), a = filasDeServicios([vacia(s, false)])[0], b = filasDeServicios([vacia(s, true)])[0], c = filasDeServicios([vacia(svc('s2', '2026-10-26', { tipo: 'ensayo', titulo: 'Ensayo' }), false)])[0]
    assert.deepEqual([a.estado, b.estado, c.estado], ['Nominación pendiente', 'No convocado', 'No convocado']); assert.deepEqual([a.equipos, a.responder, a.equipoId, a.posicion], [[], false, null, '']) })
  await prueba('la nota del cruce de equipos y el día bloqueado se cuelgan de la PRIMERA fila de ese día (no se repiten); la fecha ya no aparece duplicada', async () => {
    const a = svc('a', '2026-11-01'), b = svc('b', '2026-11-01', { hora_inicio: '12:00:00', hora_fin: '16:00:00' })
    const f = filasDeServicios([e(a, eq('t1', 'Alabanza'), 'pendiente'), e(b, eq('t2', 'Producción'), 'pendiente')], new Set(['2026-11-01']))
    assert.equal(f.length, 2); assert.deepEqual([f[0].nota, f[0].bloqueado, f[1].nota, f[1].bloqueado], [{ tipo: 'elegir', n: 2 }, true, null, false]) })
  await prueba('reglas de datos: ni porcentajes ni nombres de otras personas ni «quién rechazó» (solo TU respuesta), en la lógica, los textos y la pantalla', async () => {
    for (const f of ['lib/portal/listaServicios.ts', 'lib/textos/serviciosPortal.ts', 'components/servicio-movil/FichaServicio.tsx']) assert.ok(!/%/.test(leer(f)), f + ' sin porcentajes')
    assert.ok(!/rechaz|declin(?!ada)/i.test(leer('lib/textos/serviciosPortal.ts')), 'los textos no cuentan quién rechazó'); assert.ok(!/member|apellido|rechazad|rechazos/i.test(leer('lib/portal/listaServicios.ts')), 'la lista no maneja otras personas') })
  await prueba('la pantalla: en teléfono usa FichaServicio (la primera, grande, con «Tu posición» y «Responder» que ABRE el servicio sin escribir nada); en escritorio sigue la lista de siempre (Dia, TarjetaConvocatoria, TarjetaOtra)', async () => {
    const s = leer('app/portal/_components/servicios/Servicios.tsx')
    assert.ok(/const telefono = useTelefonoYa\(\)/.test(s)); assert.ok(/matchMedia\('\(max-width: 768px\)'\)/.test(leer('lib/useTelefonoYa.ts'))); assert.ok(/telefono \? filasDeServicios\(entradas, bloqueados\) : \[\]/.test(s)); assert.ok(/grande=\{i === 0\}/.test(s)); assert.ok(/<BotonResponder texto=\{T\.responder\} onClick=\{abrir\} \/>/.test(leer('app/portal/_components/servicios/FichaPortal.tsx'))); assert.ok(/<FichaPortal f=\{f\} grande=\{grande\} onAbrir=\{onAbrir\}/.test(s)); assert.ok(/onAbrirFila\(x\.servicioId, x\.equipoId\)/.test(s))
    assert.ok(/function Dia\(/.test(s) && /<TarjetaConvocatoria/.test(s) && /<TarjetaOtra/.test(s), 'el escritorio conserva sus tarjetas'); assert.ok(!/c\.responder|c\.pedir/.test(s.slice(s.indexOf('function FichaTelefono'), s.indexOf('export default function Servicios'))), 'la ficha no escribe')
    assert.ok(/onAbrirFila=\{\(id,equipo\)=>abrirServicio\(id,equipo\)\}/.test(leer('app/portal/_components/PortalApp.tsx'))) })
  await prueba('convocado a DOS equipos: una sola fila, «Por responder» y «Tu posición: Bass · Sonido» (las de las dos); al confirmar una queda «Confirmada» con la suya y la otra declinada no cuenta como rechazo ni como pendiente', async () => {
    const s = svc('s1', '2026-11-01'), A = eq('t1', 'Alabanza', 'rosa'), P = eq('t2', 'Producción', 'cobalto')
    const dos = filasDeServicios([e(s, P, 'pendiente', { pos: ['Sonido'] }), e(s, A, 'pendiente', { pos: ['Bass'] })]); assert.equal(dos.length, 1); const f = dos[0]
    assert.deepEqual([f.estado, f.ambar, f.responder, f.posicion, f.equipos.map(x => x.inicial)], ['Por responder', true, true, 'Bass · Sonido', ['A', 'P']], 'Alabanza antes que Producción (por nombre)')
    const conf = filasDeServicios([e(s, A, 'confirmado', { pos: ['Bass'] }), e(s, P, 'declinado', { motivo: 'conflict', otro: { id: 't1', name: 'Alabanza' }, pos: ['Sonido'] })])[0]
    assert.deepEqual([conf.estado, conf.ambar, conf.responder, conf.posicion], ['Confirmada', false, false, 'Bass'], 'ya no queda nada por responder: el chip «Por responder» se va')
    const mixto = filasDeServicios([e(s, A, 'confirmado', { pos: ['Bass'] }), e(s, P, 'declinado', { pos: ['Sonido'] })])[0]; assert.deepEqual([mixto.estado, mixto.posicion], ['Confirmada', 'Bass'], 'la que la persona rechazó tampoco pesa más que la confirmada')
    const mismo = filasDeServicios([e(s, A, 'pendiente', { pos: ['Bass', 'Voces'] })])[0]; assert.equal(mismo.posicion, 'Bass · Voces', 'dos posiciones del mismo equipo: una convocatoria, «Bass · Voces»')
    const aun = filasDeServicios([e(s, A, 'confirmado', { pos: ['Bass'] }), e(s, P, 'pendiente', { pos: ['Sonido'] })])[0]; assert.deepEqual([aun.estado, aun.responder, aun.posicion], ['Por responder', true, 'Sonido'], 'una pendiente que llegó después de confirmar otra sigue pidiendo respuesta') })
  terminar()
})
