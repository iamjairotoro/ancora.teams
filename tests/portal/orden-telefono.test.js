// El Orden del servicio en teléfono (Portal-Orden-A): cada ficha muestra solo lo que existe (tono, BPM, líder, observaciones), «Lideras tú» cuando toca, BPM con coma decimal; sin acceso a la biblioteca no hay tono ni BPM;
// el escritorio queda como estaba. Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const { fichaOrden, textoBpm } = require(path.join(RAIZ, 'lib/portal/ordenTelefono.ts'))
const { setlistWithoutLibrary } = require(path.join(RAIZ, 'lib/portal/songColumns.ts'))
const T = require(path.join(RAIZ, 'lib/textos/ordenPortal.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('el Orden del servicio en teléfono')
const cancion = (extra = {}) => ({ tipo: 'cancion', tono: 'G', song_id: 's1', lead_id: 'm2', lead: { nombre: 'Claudia Coilla' }, notas: 'Entrar solo con piano.', song: { id: 's1', nombre: 'All Hail King Jesus', artista: 'Bethel Music', bpm: 72 }, ...extra })

t('una canción completa: número, título, artista, tono, BPM, líder y observaciones', () => {
  const f = fichaOrden(cancion(), 0, 'm1')
  assert.deepEqual([f.numero, f.titulo, f.artista, f.tono, f.bpm, f.notas, f.esCancion], [1, 'All Hail King Jesus', 'Bethel Music', 'G', '72', 'Entrar solo con piano.', true])
  assert.deepEqual(f.lider, { nombre: 'Claudia Coilla', iniciales: 'CC', yo: false }) })
t('si tú la lideras: yo = true («Lideras tú»); si no, no', () => {
  assert.equal(fichaOrden(cancion({ lead_id: 'm1', lead: { nombre: 'Claudia Ruiz' } }), 1, 'm1').lider.yo, true)
  assert.equal(fichaOrden(cancion(), 1, 'm1').lider.yo, false); assert.equal(fichaOrden(cancion(), 1, null).lider.yo, false)
  assert.equal(T.TEXTOS_ORDEN_PORTAL.liderasTu, 'Lideras tú') })
t('lo que no existe no se muestra: sin observaciones, sin líder, sin tono ni BPM → null (sin fila vacía)', () => {
  const f = fichaOrden(cancion({ notas: '  ', lead_id: null, lead: null, tono: null, song: { id: 's1', nombre: 'X', artista: '', bpm: null } }), 0, 'm1')
  assert.deepEqual([f.notas, f.lider, f.tono, f.bpm, f.artista], [null, null, null, null, null]) })
t('BPM: coma decimal, enteros sin decimales, vacío/0/texto raro no se muestra', () => {
  assert.equal(textoBpm(71.5), '71,5'); assert.equal(textoBpm(72), '72'); assert.equal(textoBpm('68'), '68'); assert.equal(textoBpm('70,5'), '70,5')
  for (const v of [null, undefined, 0, '', 'x', NaN]) assert.equal(textoBpm(v), null) })
t('sin acceso a la biblioteca no viaja tono ni BPM: la ficha no los muestra; las observaciones y el líder (del bloque) sí', () => {
  const [b] = setlistWithoutLibrary([{ id: 'b1', orden: 1, tipo: 'cancion', tono: 'G', song_id: 's1', lead: { nombre: 'Claudia' }, notas: 'ojo', song: { id: 's1', nombre: 'X', artista: 'Y', bpm: 72, tono_original: 'G' } }])
  const f = fichaOrden(b, 0, 'm1'); assert.deepEqual([f.tono, f.bpm, f.notas, f.lider && f.lider.nombre], [null, null, 'ojo', 'Claudia']) })
t('un bloque sin canción (Bienvenida, Palabra) conserva título, duración y observaciones, sin artista, tono ni BPM', () => {
  const f = fichaOrden({ tipo: 'bienvenida', titulo: 'Bienvenida', duracion_min: 5, notas: 'Saludo corto', tono: 'G' }, 0, 'm1')
  assert.deepEqual([f.esCancion, f.titulo, f.duracion, f.notas, f.tono, f.artista], [false, 'Bienvenida', 5, 'Saludo corto', null, null]) })
t('los ensayos del enlace llegan sin `tipo` y con canción: se tratan como canción', () => {
  assert.equal(fichaOrden({ song: { nombre: 'A', artista: 'B' } }, 0, null).esCancion, true) })
t('la pantalla: franja de «Lideras tú» con el color del equipo, aria-label por canción, detrás de la condición de teléfono', () => {
  const tel = leer('app/portal/_components/servicio/OrdenServicioTelefono.tsx'), esc = leer('app/portal/_components/servicio/OrdenServicio.tsx'), css = leer('app/portal/_components/servicio/orden-telefono.module.css')
  assert.ok(/\.mia\{[^}]*anc-team-a/.test(css)); assert.ok(/aria-label=\{abrirCancionOrden/.test(tel)); assert.ok(/if \(telefono\) return <OrdenServicioTelefono/.test(esc)); assert.ok(/Lead: tú/.test(esc), 'el escritorio sigue igual')
  assert.ok(!/rechaz|declin/i.test(tel)) })
console.log(`\n${n} comprobaciones OK`)
