// Lógica pura de la pestaña Servicios (punto 54, commit 3): agrupar por día, el cruce de horarios (misma regla que la base, 037c), la nota del día y los días bloqueados.
// Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const { seCruzan, horarioTexto, agruparPorDia } = require(path.join(RAIZ, 'lib/portal/agruparServicios.ts'))
const { listaDeDias } = require(path.join(RAIZ, 'lib/portal/fechas.ts'))
const { estadoTras, diasParaMostrar } = require(path.join(RAIZ, 'lib/portal/bloqueosCarga.ts'))
const { diasBloqueadosParaTodos } = require(path.join(RAIZ, 'lib/portal/diasBloqueados.ts'))

let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const svc = (id, fecha, ini, fin, extra = {}) => ({ id, fecha, hora_inicio: ini, hora_fin: fin, ...extra })
const eq = (id, name) => ({ id, name })
const inv = (status, declined_reason = null) => ({ status, declined_reason })
const card = (s, team, i) => ({ service: s, team, invitation: i })
const vacia = s => ({ service: s, team: null, invitation: null })

console.log('el cruce de horarios (igual que la base)')
t('mismo día y solape estricto; si una termina cuando empieza la otra, no chocan', () => {
  assert.equal(seCruzan(svc('a', '2026-10-04', '10:00', '14:00'), svc('b', '2026-10-04', '12:00', '16:00')), true)
  assert.equal(seCruzan(svc('a', '2026-10-04', '10:00', '12:00'), svc('b', '2026-10-04', '12:00', '14:00')), false, 'borde exacto')
  assert.equal(seCruzan(svc('a', '2026-10-04', '09:00', '10:00'), svc('b', '2026-10-04', '19:00', '21:00')), false)
  assert.equal(seCruzan(svc('a', '2026-10-04', '10:00', '14:00'), svc('b', '2026-10-05', '10:00', '14:00')), false, 'otro día') })
t('nulos = 10:00 y 14:00 (cada extremo por separado); un fin <= inicio no choca con nada', () => {
  assert.equal(seCruzan(svc('a', '2026-10-04', null, null), svc('b', '2026-10-04', '13:00', '15:00')), true)
  assert.equal(seCruzan(svc('a', '2026-10-04', null, null), svc('b', '2026-10-04', '14:00', '16:00')), false)
  assert.equal(seCruzan(svc('a', '2026-10-04', '10:00:00', '10:00:00'), svc('b', '2026-10-04', '09:00', '11:00')), false, 'fin = inicio')
  assert.equal(seCruzan(svc('a', '2026-10-04', '18:00', '09:00'), svc('b', '2026-10-04', '08:00', '20:00')), false, 'fin < inicio') })
t('el horario se escribe «10:00 — 14:00» (acepta segundos) y no se inventa uno', () => {
  assert.equal(horarioTexto('10:00:00', '14:00:00'), '10:00 — 14:00'); assert.equal(horarioTexto('9:30', '11:00'), '09:30 — 11:00')
  assert.equal(horarioTexto('10:00', null), '10:00'); assert.equal(horarioTexto(null, null), null); assert.equal(horarioTexto(undefined, '14:00'), null) })

console.log('agrupar por día')
const S1 = svc('s1', '2026-10-04', '10:00:00', '14:00:00'), S1b = svc('s1b', '2026-10-04', '10:00:00', '14:00:00'), S1c = svc('s1c', '2026-10-04', '10:00:00', '14:00:00')
t('un día con tres equipos que se cruzan: una sola cabecera, un solo horario, tarjetas por nombre y la nota «elegir» con n = 3', () => {
  const g = agruparPorDia([card(S1c, eq('c', 'Bienvenida'), inv('pendiente')), card(S1, eq('a', 'Alabanza'), inv('pendiente')), card(S1b, eq('b', 'Producción'), inv('pendiente'))])
  assert.equal(g.length, 1); assert.equal(g[0].fecha, '2026-10-04'); assert.equal(g[0].horario, '10:00 — 14:00'); assert.equal(g[0].horaPorTarjeta, false)
  assert.deepEqual(g[0].tarjetas.map(x => x.team.name), ['Alabanza', 'Bienvenida', 'Producción']); assert.deepEqual(g[0].nota, { tipo: 'elegir', n: 3 }) })
t('los días salen en orden de fecha aunque lleguen desordenados', () => {
  const g = agruparPorDia([vacia(svc('x', '2026-10-18', '10:00', '14:00')), vacia(svc('y', '2026-10-04', '10:00', '14:00')), vacia(svc('z', '2026-10-11', '10:00', '14:00'))])
  assert.deepEqual(g.map(x => x.fecha), ['2026-10-04', '2026-10-11', '2026-10-18']) })
t('una confirmada y las demás declinadas por conflicto → «aceptaste en X» (no es un «No pudo»)', () => {
  const g = agruparPorDia([card(S1, eq('a', 'Alabanza'), inv('confirmado')), card(S1b, eq('b', 'Producción'), inv('declinado', 'conflict')), card(S1c, eq('c', 'Bienvenida'), inv('declinado', 'conflict'))])
  assert.deepEqual(g[0].nota, { tipo: 'aceptaste', equipo: 'Alabanza' }) })
t('confirmada y otra que llegó después, pendiente y que se cruza → «ya aceptaste en X»', () => {
  const g = agruparPorDia([card(S1, eq('a', 'Alabanza'), inv('confirmado')), card(S1b, eq('b', 'Producción'), inv('pendiente'))])
  assert.deepEqual(g[0].nota, { tipo: 'ya-aceptaste', equipo: 'Alabanza' }) })
t('sin nota: un solo equipo, uno pendiente y otro que dijo «no puedo», o horarios que no se cruzan', () => {
  assert.equal(agruparPorDia([card(S1, eq('a', 'Alabanza'), inv('pendiente'))])[0].nota, null)
  assert.equal(agruparPorDia([card(S1, eq('a', 'Alabanza'), inv('pendiente')), card(S1b, eq('b', 'Producción'), inv('declinado'))])[0].nota, null, 'rechazo propio no es conflicto')
  const tarde = svc('t', '2026-10-04', '19:00', '21:00')
  const g = agruparPorDia([card(S1, eq('a', 'Alabanza'), inv('pendiente')), card(tarde, eq('b', 'Producción'), inv('pendiente'))])
  assert.equal(g[0].nota, null, 'mañana y noche no chocan'); assert.equal(g[0].horario, null); assert.equal(g[0].horaPorTarjeta, true, 'horarios distintos: cada tarjeta lleva el suyo') })
t('dos servicios cruzados de un MISMO equipo no son conflicto; una tarjeta cerrada no genera nota', () => {
  assert.equal(agruparPorDia([card(S1, eq('a', 'Alabanza'), inv('pendiente')), card(S1b, eq('a', 'Alabanza'), inv('pendiente'))])[0].nota, null)
  assert.equal(agruparPorDia([{ ...card(S1, eq('a', 'Alabanza'), inv('pendiente')), cerrada: true }, { ...card(S1b, eq('b', 'Producción'), inv('pendiente')), cerrada: true }])[0].nota, null) })
t('los ensayos y los servicios sin convocatoria van en «otros», con los ensayos con invitación primero; no entran al conteo ni a la nota', () => {
  const ens = svc('e', '2026-10-04', '09:00', '10:00', { tipo: 'ensayo' }), otro = svc('o', '2026-10-04', '16:00', '18:00')
  const g = agruparPorDia([vacia(otro), { service: ens, team: null, invitation: inv('pendiente') }, card(S1, eq('a', 'Alabanza'), inv('pendiente')), card(S1b, eq('b', 'Producción'), inv('pendiente'))])
  assert.equal(g[0].tarjetas.length, 2); assert.deepEqual(g[0].otros.map(x => x.service.id), ['e', 'o']); assert.deepEqual(g[0].nota, { tipo: 'elegir', n: 2 }) })
t('un día sin horario cargado no inventa uno; un día bloqueado se marca', () => {
  const g = agruparPorDia([vacia(svc('s', '2026-10-11', null, null)), vacia(svc('u', '2026-10-18', '10:00', '14:00'))], new Set(['2026-10-11']))
  assert.equal(g[0].horario, null); assert.equal(g[0].horaPorTarjeta, false); assert.equal(g[0].bloqueado, true); assert.equal(g[1].bloqueado, false) })

console.log('días bloqueados para todos los equipos')
const A = { id: 'a' }, B = { id: 'b' }
t('una fila sin equipo = todos; una fila por cada equipo = todos; solo algunos = el día no cuenta', () => {
  const s = diasBloqueadosParaTodos([
    { blocked_date: '2026-10-11', team_id: null },
    { blocked_date: '2026-10-18', team_id: 'a' }, { blocked_date: '2026-10-18', team_id: 'b' },
    { blocked_date: '2026-10-25', team_id: 'a' },
  ], [A, B])
  assert.deepEqual(Array.from(s).sort(), ['2026-10-11', '2026-10-18']) })
t('sin equipos (persona sin ninguno) solo vale la fila sin equipo; la fecha puede venir del servicio; filas sin fecha se ignoran', () => {
  assert.equal(diasBloqueadosParaTodos([{ blocked_date: '2026-10-11', team_id: 'a' }], []).size, 0)
  assert.equal(diasBloqueadosParaTodos([{ blocked_date: null, service: { fecha: '2026-10-11' }, team_id: null }], []).has('2026-10-11'), true)
  assert.equal(diasBloqueadosParaTodos([{ blocked_date: null, service: null, team_id: null }, {}], [A]).size, 0) })

console.log('la lista de días que fallaron')
t('«el 21 y el 22 de octubre»; tres días; un solo día; cruzando de mes; vacía', () => {
  assert.equal(listaDeDias(['2026-10-21', '2026-10-22']), 'el 21 y el 22 de octubre'); assert.equal(listaDeDias(['2026-10-21', '2026-10-22', '2026-10-23']), 'el 21, el 22 y el 23 de octubre')
  assert.equal(listaDeDias(['2026-10-21']), 'el 21 de octubre'); assert.equal(listaDeDias(['2026-10-30', '2026-11-01']), 'el 30 de octubre y el 1 de noviembre'); assert.equal(listaDeDias(['2026-10-30', '2026-10-31', '2026-11-01']), 'el 30, el 31 de octubre y el 1 de noviembre'); assert.equal(listaDeDias([]), '') })

console.log('si los bloqueos no cargan')
t('nunca cargaron → «error» (aviso con Reintentar); una recarga que falla DESPUÉS de haber cargado deja lo que había; reintentar con éxito → «ok»', () => {
  assert.equal(estadoTras('cargando', false), 'error'); assert.equal(estadoTras('error', false), 'error'); assert.equal(estadoTras('error', true), 'ok'); assert.equal(estadoTras('cargando', true), 'ok')
  assert.equal(estadoTras('ok', false), 'ok', 'tras guardar, una recarga fallida no borra el calendario'); assert.equal(estadoTras('ok', true), 'ok') })
t('Servicios no marca ningún día como bloqueado mientras los bloqueos no cargaron (no dice nada, en vez de mostrarlo libre)', () => {
  const dias = new Set(['2026-10-11']); assert.equal(diasParaMostrar('ok', dias).has('2026-10-11'), true)
  assert.equal(diasParaMostrar('error', dias).size, 0); assert.equal(diasParaMostrar('cargando', dias).size, 0)
  const g = agruparPorDia([vacia(svc('s', '2026-10-11', '10:00', '14:00'))], diasParaMostrar('error', dias)); assert.equal(g[0].bloqueado, false) })

console.log(`${n} comprobaciones OK`)
