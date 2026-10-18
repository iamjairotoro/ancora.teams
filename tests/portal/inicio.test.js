// Lógica pura del Inicio (punto 54, commit 7): el servicio destacado (el siguiente que AÚN NO terminó, con la hora de Chile), «Lo que viene» (los dos siguientes), las convocatorias por responder, la tira de la semana,
// los cumpleaños (solo día y mes, hoy = «Hoy») y el bloque de fecha. Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const I = require(path.join(RAIZ, 'lib/portal/inicio.ts')), { proximosCumpleanos } = require(path.join(RAIZ, 'lib/portal/cumpleanos.ts'))
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const svc = (id, fecha, ini = '10:00', fin = '14:00', extra = {}) => ({ id, fecha, hora_inicio: ini, hora_fin: fin, tipo: 'servicio', ...extra })
const eq = (id, nombre, color = 'cobalto') => ({ id, name: nombre, color })
const inv = (status, extra = {}) => ({ status, sent_at: '2026-01-01', declined_reason: null, ...extra })
const e = (s, team, i, extra = {}) => ({ service: s, team, invitation: i, ...extra })
// «ahora»: sábado 17 de octubre de 2026, 12:00 en Santiago (UTC-3 → 15:00Z)
const AHORA = new Date('2026-10-17T15:00:00Z')

console.log('el servicio destacado y «Lo que viene»')
t('el destacado es el siguiente que NO terminó: uno de esta mañana que ya terminó (hora de Chile) se salta; uno de hoy que sigue en curso es el destacado', () => {
  const ent = [e(svc('ayer', '2026-10-16'), eq('A', 'Alabanza'), inv('confirmado')), e(svc('hoyMañana', '2026-10-17', '08:00', '10:30'), eq('A', 'Alabanza'), inv('confirmado')),
    e(svc('hoyEnCurso', '2026-10-17', '10:00', '13:00'), eq('A', 'Alabanza'), inv('confirmado')), e(svc('domingo', '2026-10-18'), eq('A', 'Alabanza'), inv('confirmado'))]
  const r = I.proximosServicios(ent, AHORA); assert.equal(r.destacado.service.id, 'hoyEnCurso'); assert.deepEqual(r.siguientes.map(g => g.service.id), ['domingo']) })
t('a las 13:01 de Chile ya terminó y pasa el siguiente; el servicio sin hora de fin termina a las 14:00', () => {
  const ent = [e(svc('a', '2026-10-17', '10:00', '13:00'), eq('A', 'Alabanza'), inv('confirmado')), e(svc('b', '2026-10-17', '10:00', null), eq('A', 'Alabanza'), inv('confirmado')), e(svc('c', '2026-10-18'), eq('A', 'Alabanza'), inv('confirmado'))]
  assert.equal(I.proximosServicios(ent, new Date('2026-10-17T16:01:00Z')).destacado.service.id, 'b'); assert.equal(I.proximosServicios(ent, new Date('2026-10-17T17:01:00Z')).destacado.service.id, 'c') })
t('«Lo que viene» son SOLO los dos siguientes (sin repetir el destacado) y en orden de fecha y hora', () => {
  const ent = ['d4', 'd1', 'd3', 'd2'].map((id, i) => e(svc(id, `2026-10-2${id[1]}`), eq('A', 'Alabanza'), inv('confirmado')))
  const r = I.proximosServicios(ent, AHORA); assert.equal(r.destacado.service.id, 'd1'); assert.deepEqual(r.siguientes.map(g => g.service.id), ['d2', 'd3']) })
t('si confirmó en varios equipos ese día, una caja por equipo (en el mismo grupo); las declinadas, las de otro equipo y las no enviadas no cuentan', () => {
  const s1 = svc('s1', '2026-10-18'), ent = [e(s1, eq('P', 'Producción', 'rosa'), inv('confirmado')), e(s1, eq('A', 'Alabanza'), inv('confirmado')), e(s1, eq('B', 'Bienvenida'), inv('declinado')), e(s1, eq('C', 'Coro'), inv('declinado', { declined_reason: 'conflict' })), e(s1, eq('T', 'Técnica'), inv('pendiente', { sent_at: null })), e(svc('s2', '2026-10-19'), null, null)]
  const r = I.proximosServicios(ent, AHORA); assert.deepEqual(r.destacado.entradas.map(x => x.team.name), ['Alabanza', 'Producción']); assert.deepEqual(r.siguientes, []) })
t('los ensayos cuentan como próximo servicio (sin equipo); sin nada por venir: destacado null', () => {
  const ens = e(svc('en', '2026-10-18', '19:00', '21:00', { tipo: 'ensayo' }), null, inv('pendiente'))
  assert.equal(I.proximosServicios([ens], AHORA).destacado.service.tipo, 'ensayo'); assert.equal(I.proximosServicios([], AHORA).destacado, null); assert.equal(I.proximosServicios([e(svc('x', '2026-10-01'), eq('A', 'Alabanza'), inv('confirmado'))], AHORA).destacado, null) })
t('un servicio que cruza la medianoche (fin 02:00) sigue en curso hasta el día siguiente', () => {
  const ent = [e(svc('n', '2026-10-16', '22:00', '02:00'), eq('A', 'Alabanza'), inv('confirmado'))]
  assert.equal(I.proximosServicios(ent, new Date('2026-10-17T04:00:00Z')).destacado.service.id, 'n', '01:00 del sábado en Chile'); assert.equal(I.proximosServicios(ent, new Date('2026-10-17T05:30:00Z')).destacado, null) })

console.log('por responder')
t('no cuenta las cerradas, las de servicios terminados, las declinadas ni las no enviadas', () => {
  const ent = [e(svc('a', '2026-10-18'), eq('A', 'A'), inv('pendiente')), e(svc('b', '2026-10-19'), eq('A', 'A'), inv('pendiente')), e(svc('c', '2026-10-20'), eq('A', 'A'), inv('pendiente'), { cerrada: true }),
    e(svc('d', '2026-10-17', '08:00', '10:00'), eq('A', 'A'), inv('pendiente')), e(svc('e', '2026-10-21'), eq('A', 'A'), inv('declinado')), e(svc('f', '2026-10-22'), eq('A', 'A'), inv('pendiente', { sent_at: null })), e(svc('g', '2026-10-23'), eq('A', 'A'), inv('confirmado'))]
  assert.equal(I.porResponder(ent, AHORA), 2) })

console.log('la tira de la semana')
t('lunes a domingo de la semana de HOY en Chile; hoy marcado y los días pasados', () => {
  const s = I.semanaActual('2026-10-17'); assert.deepEqual(s.map(d => d.fecha), ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']); assert.deepEqual(s.map(d => d.letra).join(''), 'LMMJVSD')
  assert.deepEqual(s.map(d => d.esHoy), [false, false, false, false, false, true, false]); assert.deepEqual(s.map(d => d.pasado), [true, true, true, true, true, false, false]); assert.deepEqual(s.map(d => d.numero), [12, 13, 14, 15, 16, 17, 18])
  assert.equal(I.semanaActual('2026-10-18')[6].esHoy, true, 'el domingo es el último día'); assert.equal(I.semanaActual('2026-10-12')[0].esHoy, true); assert.deepEqual(I.semanaActual('2026-11-01').map(d => d.numero), [26, 27, 28, 29, 30, 31, 1], 'cruza de mes') })
t('un punto por servicio mío, del color de su equipo (el ensayo, sin color); cuentan los de hoy que ya pasaron; no las declinadas', () => {
  const ent = [e(svc('a', '2026-10-17', '08:00', '10:00'), eq('A', 'Alabanza', 'cobalto'), inv('confirmado')), e(svc('a', '2026-10-17', '08:00', '10:00'), eq('P', 'Producción', 'rosa'), inv('pendiente')), e(svc('en', '2026-10-17', '19:00', '21:00', { tipo: 'ensayo' }), null, inv('confirmado')), e(svc('x', '2026-10-18'), eq('A', 'Alabanza'), inv('declinado'))]
  const p = I.puntosPorFecha(ent); assert.deepEqual(p.get('2026-10-17').map(x => [x.servicioId, x.color]), [['a', 'cobalto'], ['a', 'rosa'], ['en', null]]); assert.equal(p.get('2026-10-18'), undefined) })

console.log('cumpleaños y bloque de fecha')
t('solo día y mes (nunca el año ni la edad), los más próximos hasta 4, dentro de 30 días; hoy = «Hoy»', () => {
  const f = (id, nombre, fecha) => ({ id, nombre, apellido: 'X', avatar_url: null, fecha_nacimiento: fecha })
  const r = proximosCumpleanos([f('1', 'Zoe', '1990-10-17'), f('2', 'Ana', '1985-10-17'), f('3', 'Beto', '2001-10-20'), f('4', 'Cami', '1999-11-10'), f('5', 'Dani', '1980-12-31'), f('6', 'Eli', '1970-10-18'), f('7', 'Fer', '1977-10-30'), f('8', 'Gus', null), f('9', 'Hugo', '1990-10-16')], '2026-10-17')
  assert.deepEqual(r.map(c => c.nombre), ['Ana', 'Zoe', 'Eli', 'Beto'], 'hoy primero (por nombre), luego los siguientes; Hugo (ayer) ya fue; Cami y Dani caen fuera de los 30 días o del tope'); assert.deepEqual(r.map(c => c.enDias), [0, 0, 1, 3])
  assert.ok(r.every(c => Object.keys(c).sort().join() === 'apellido,avatar_url,dia,enDias,id,mes,nombre'), 'ninguna clave de año ni de edad'); assert.ok(!JSON.stringify(r).match(/19\d\d|20\d\d/), 'ningún año viaja')
  assert.deepEqual([I.textoCumple(r[0]), I.textoCumple(r[3])], ['Hoy', '20 de octubre']) })
t('el 29 de febrero cae el 28 en los años no bisiestos y el 29 en los bisiestos; el año que viene si ya pasó', () => {
  assert.deepEqual(proximosCumpleanos([{ id: '1', nombre: 'Bis', fecha_nacimiento: '1996-02-29' }], '2027-02-20').map(c => [c.dia, c.mes, c.enDias]), [[28, 2, 8]]); assert.deepEqual(proximosCumpleanos([{ id: '1', nombre: 'Bis', fecha_nacimiento: '1996-02-29' }], '2028-02-20').map(c => [c.dia, c.mes, c.enDias]), [[29, 2, 9]])
  assert.deepEqual(proximosCumpleanos([{ id: '1', nombre: 'Ene', fecha_nacimiento: '1990-01-05' }], '2026-12-20').map(c => [c.dia, c.mes, c.enDias]), [[5, 1, 16]], 'cruza de año'); assert.deepEqual(proximosCumpleanos([{ id: '1', nombre: 'X', fecha_nacimiento: 'basura' }], '2026-10-17'), []) })
t('el bloque de fecha de «Lo que viene»', () => { assert.deepEqual(I.bloqueFecha('2026-10-18'), { dow: 'DOM', dia: 18, mes: 'oct' }); assert.deepEqual(I.bloqueFecha('2026-03-04'), { dow: 'MIÉ', dia: 4, mes: 'mar' }); assert.equal(I.bloqueFecha(''), null) })
console.log(`${n} comprobaciones OK`)
