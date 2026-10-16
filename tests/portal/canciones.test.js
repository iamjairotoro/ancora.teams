// Lógica pura de la pestaña Canciones (punto 54, commit 2): buscar por título y artista, la fecha en español, cuándo TERMINA un servicio (America/Santiago, con los dos cambios de horario de
// Chile) y «Del domingo». Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const { filtrarCanciones, normalizar } = require(path.join(RAIZ, 'lib/portal/filtrarCanciones.ts'))
const { fechaConDia } = require(path.join(RAIZ, 'lib/portal/fechas.ts'))
const { servicioTerminado, instanteEnSantiago } = require(path.join(RAIZ, 'lib/servicioTerminado.ts'))
const { cancionesDelProximoServicio } = require(path.join(RAIZ, 'lib/portal/cancionesDelServicio.ts'))

let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const Z = s => new Date(s)

console.log('buscar por título y artista')
const lista = [{ nombre: 'Canción de Gracia', artista: 'Ángel Núñez' }, { nombre: 'Awake My Soul', artista: 'Hillsong' }, { nombre: 'Cornerstone', artista: null }, { nombre: 'Good Grace', artista: 'Hillsong United' }]
t('sin texto devuelve todo; ignora mayúsculas y tildes en las dos direcciones', () => {
  assert.equal(filtrarCanciones(lista, '').length, 4); assert.equal(filtrarCanciones(lista, '   ').length, 4)
  assert.deepEqual(filtrarCanciones(lista, 'cancion').map(c => c.nombre), ['Canción de Gracia']); assert.deepEqual(filtrarCanciones(lista, 'CANCIÓN').map(c => c.nombre), ['Canción de Gracia'])
  assert.deepEqual(filtrarCanciones(lista, 'angel nunez').map(c => c.nombre), ['Canción de Gracia'], 'el artista también, sin tildes') })
t('busca por palabras en cualquier orden y en título o artista a la vez', () => {
  assert.deepEqual(filtrarCanciones(lista, 'soul awake').map(c => c.nombre), ['Awake My Soul']); assert.deepEqual(filtrarCanciones(lista, 'hillsong grace').map(c => c.nombre), ['Good Grace'])
  assert.deepEqual(filtrarCanciones(lista, 'hillsong').map(c => c.nombre), ['Awake My Soul', 'Good Grace']); assert.equal(filtrarCanciones(lista, 'zzz').length, 0) })
t('una canción sin artista no rompe; normalizar maneja null', () => { assert.deepEqual(filtrarCanciones(lista, 'corner').map(c => c.nombre), ['Cornerstone']); assert.equal(normalizar(null), ''); assert.equal(normalizar(' ÁÉÍ '), 'aei') })

console.log('la fecha en español')
t('«Domingo, 18 de octubre»: solo la primera letra del día en mayúscula, el mes en minúscula (antes: «Domingo 18 De Octubre»)', () => {
  assert.equal(fechaConDia('2026-10-18'), 'Domingo, 18 de octubre'); assert.equal(fechaConDia('2026-01-01'), 'Jueves, 1 de enero'); assert.equal(fechaConDia('2026-03-04'), 'Miércoles, 4 de marzo')
  assert.equal(fechaConDia('2026-10-18', true), 'Domingo, 18 de octubre de 2026'); assert.equal(fechaConDia(''), ''); assert.equal(fechaConDia(null), ''); assert.equal(fechaConDia('basura'), '') })

console.log('cuándo termina un servicio (America/Santiago)')
t('servicio de hoy con hora de fin: termina a ESA hora de Chile, no a la del servidor (UTC-3 en noviembre: las 12:00 son las 15:00Z)', () => {
  assert.equal(servicioTerminado('2026-11-08', '12:00:00', Z('2026-11-08T14:59:59Z')), false); assert.equal(servicioTerminado('2026-11-08', '12:00:00', Z('2026-11-08T15:00:00Z')), true)
  assert.equal(instanteEnSantiago('2026-11-08', '12:00'), Date.parse('2026-11-08T15:00:00Z')) })
t('sin hora de fin: a las 14:00 de Chile (17:00Z en horario de verano)', () => { assert.equal(servicioTerminado('2026-11-08', null, Z('2026-11-08T16:59:59Z')), false); assert.equal(servicioTerminado('2026-11-08', undefined, Z('2026-11-08T17:00:00Z')), true); assert.equal(servicioTerminado('2026-11-08', '', Z('2026-11-08T17:00:00Z')), true) })
t('en invierno (UTC-4) el mismo reloj de pared cae una hora más tarde en UTC: 12:00 de Chile = 16:00Z', () => { assert.equal(instanteEnSantiago('2026-07-12', '12:00'), Date.parse('2026-07-12T16:00:00Z')); assert.equal(servicioTerminado('2026-07-12', '12:00', Z('2026-07-12T15:59:59Z')), false); assert.equal(servicioTerminado('2026-07-12', '12:00', Z('2026-07-12T16:00:00Z')), true) })
t('el día del adelanto de hora (sábado 5 sep 2026, a medianoche pasa a UTC-3): fin 23:30 del sábado = 03:30Z (aún UTC-4)', () => { assert.equal(instanteEnSantiago('2026-09-05', '23:30'), Date.parse('2026-09-06T03:30:00Z')); assert.equal(servicioTerminado('2026-09-05', '23:30', Z('2026-09-06T03:29:59Z')), false); assert.equal(servicioTerminado('2026-09-05', '23:30', Z('2026-09-06T03:30:00Z')), true) })
t('el domingo del adelanto (6 sep 2026): 12:00 ya es UTC-3 = 15:00Z', () => assert.equal(instanteEnSantiago('2026-09-06', '12:00'), Date.parse('2026-09-06T15:00:00Z')))
t('un servicio que cruza la medianoche (22:00 a 01:00 del sábado del adelanto de hora) termina a la 01:00 del domingo = 04:00Z, no antes', () => {
  assert.equal(servicioTerminado('2026-09-05', '01:00', Z('2026-09-05T20:00:00Z'), '22:00'), false, 'sin el cruce se creería terminado desde el sábado a la 01:00'); assert.equal(servicioTerminado('2026-09-05', '01:00', Z('2026-09-06T03:59:59Z'), '22:00'), false); assert.equal(servicioTerminado('2026-09-05', '01:00', Z('2026-09-06T04:00:00Z'), '22:00'), true) })
t('el día del retroceso (sábado 4 abr 2026; la hora 23:00 se repite): fin 23:30 = la PRIMERA vez que son las 23:30 (02:30Z)', () => { assert.equal(instanteEnSantiago('2026-04-04', '23:30'), Date.parse('2026-04-05T02:30:00Z')); assert.equal(servicioTerminado('2026-04-04', '23:30', Z('2026-04-05T02:29:59Z')), false); assert.equal(servicioTerminado('2026-04-04', '23:30', Z('2026-04-05T02:30:00Z')), true) })
t('fechas o horas ilegibles no afirman nada (no terminó)', () => { assert.equal(servicioTerminado(null, '12:00'), false); assert.equal(servicioTerminado('xx', '12:00', Z('2030-01-01T00:00:00Z')), false); assert.equal(instanteEnSantiago('2026-11-08', 'tarde'), null); assert.equal(servicioTerminado('2020-01-01', 'tarde', Z('2030-01-01T00:00:00Z')), true, 'hora de fin ilegible: se usa la de siempre (14:00)') })

console.log('«Del domingo»')
const cat = [{ id: 'a', nombre: 'Awake', artista: 'X', tono_original: 'F' }, { id: 'b', nombre: 'Beta', artista: 'Y', tono_original: 'C' }, { id: 'c', nombre: 'Gamma', artista: 'Z', tono_original: null }]
const sl = [{ tipo: 'bloque', orden: 1, titulo: 'Bienvenida' }, { tipo: 'cancion', orden: 3, song_id: 'b', tono: '', song: { id: 'b', nombre: 'Beta' } }, { tipo: 'cancion', orden: 2, song_id: 'a', tono: 'G' }, { tipo: 'cancion', orden: 4, song_id: 'c' }]
const ent = (id, fecha, estado, setlist = sl, extra = {}) => ({ service: { id, fecha, titulo: 'S' + id, hora_inicio: '10:00:00', hora_fin: '12:00:00', ...extra }, team: { name: 'Alabanza' }, invitation: { status: estado }, setlist })
const AHORA = Z('2026-11-06T12:00:00Z')      // viernes
t('toma el PRÓXIMO servicio confirmado; ignora pendientes y declinados aunque sean antes', () => {
  const d = cancionesDelProximoServicio([ent('1', '2026-11-07', 'pendiente'), ent('2', '2026-11-08', 'confirmado'), ent('3', '2026-11-15', 'confirmado'), ent('0', '2026-11-07', 'declinado')], cat, AHORA)
  assert.deepEqual([d.servicioId, d.fecha, d.equipo], ['2', '2026-11-08', 'Alabanza']) })
t('en orden del servicio; solo canciones (no bloques); el tono del servicio gana al original; sin tono de servicio, el original; sin ninguno, null', () => {
  const d = cancionesDelProximoServicio([ent('2', '2026-11-08', 'confirmado')], cat, AHORA); assert.deepEqual(d.items.map(i => [i.cancion.nombre, i.tono]), [['Awake', 'G'], ['Beta', 'C'], ['Gamma', null]]) })
t('el servicio de HOY que ya terminó no es «el próximo»: se salta al siguiente confirmado (y uno de hoy que aún no termina, sí)', () => {
  const ya = Z('2026-11-08T18:00:00Z')      // 15:00 en Chile: el servicio de las 10 a las 12 ya terminó
  assert.equal(cancionesDelProximoServicio([ent('2', '2026-11-08', 'confirmado'), ent('3', '2026-11-15', 'confirmado')], cat, ya).servicioId, '3')
  const temprano = Z('2026-11-08T14:00:00Z')    // 11:00 en Chile: aún no termina
  assert.equal(cancionesDelProximoServicio([ent('2', '2026-11-08', 'confirmado'), ent('3', '2026-11-15', 'confirmado')], cat, temprano).servicioId, '2') })
t('sin ningún confirmado → null; confirmado sin canciones → lista vacía (no null)', () => {
  assert.equal(cancionesDelProximoServicio([ent('1', '2026-11-08', 'pendiente')], cat, AHORA), null); assert.equal(cancionesDelProximoServicio([], cat, AHORA), null)
  assert.deepEqual(cancionesDelProximoServicio([ent('1', '2026-11-08', 'confirmado', [])], cat, AHORA).items, []); assert.deepEqual(cancionesDelProximoServicio([ent('1', '2026-11-08', 'confirmado', null)], cat, AHORA).items, []) })
t('una canción que no está en el catálogo se arma con lo que trae el orden; si no trae nada usable, se omite; dos servicios el mismo día → el de hora de inicio más temprana', () => {
  const raro = [{ tipo: 'cancion', orden: 1, song_id: 'zzz', song: { id: 'zzz', nombre: 'Solo en el orden', artista: 'Q', tono_original: 'D' } }, { tipo: 'cancion', orden: 2, song_id: 'qqq' }]
  assert.deepEqual(cancionesDelProximoServicio([ent('1', '2026-11-08', 'confirmado', raro)], cat, AHORA).items.map(i => [i.cancion.nombre, i.tono]), [['Solo en el orden', 'D']])
  assert.equal(cancionesDelProximoServicio([ent('B', '2026-11-08', 'confirmado', sl, { hora_inicio: '16:00:00', hora_fin: '18:00:00' }), ent('A', '2026-11-08', 'confirmado', sl, { hora_inicio: '10:00:00', hora_fin: '12:00:00' })], cat, AHORA).servicioId, 'A') })
console.log(`\n${n} comprobaciones OK`)
