// Lógica pura de los chats del portal (punto 54, commit 6): «Hoy» / «Ayer» / día de la última línea, la hora de cada burbuja y el separador de día, todo con el día de CHILE (no el del navegador). Sin base ni servidor.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const { horaChat, etiquetaListaChat, separadorDiaChat, diaDeChat } = require(path.join(RAIZ, 'lib/portal/chatTiempo.ts'))
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
// Chile: UTC-3 en verano (oct–mar, desde el 1.er sábado de septiembre) y UTC-4 en invierno (abr–ago)
const AHORA = new Date('2026-10-17T15:00:00Z')      // sábado 17 de octubre, 12:00 en Santiago

console.log('hora y día de Chile')
t('la hora de cada burbuja es la de Chile, en 24 h, con dos dígitos', () => {
  assert.equal(horaChat('2026-10-17T12:05:00Z'), '09:05'); assert.equal(horaChat('2026-07-17T12:05:00Z'), '08:05', 'invierno: UTC-4'); assert.equal(horaChat('2026-10-17T03:00:00Z'), '00:00'); assert.equal(horaChat('basura'), '') })
t('«Hoy» muestra la hora; «Ayer»; el día de la semana dentro de la semana; después «5 oct»', () => {
  assert.equal(etiquetaListaChat('2026-10-17T13:12:00Z', AHORA), '10:12'); assert.equal(etiquetaListaChat('2026-10-16T20:00:00Z', AHORA), 'Ayer'); assert.equal(etiquetaListaChat('2026-10-14T20:00:00Z', AHORA), 'Mié')
  assert.equal(etiquetaListaChat('2026-10-05T20:00:00Z', AHORA), '5 oct'); assert.equal(etiquetaListaChat('2026-10-10T20:00:00Z', AHORA), '10 oct', 'hace 7 días ya es fecha'); assert.equal(etiquetaListaChat('', AHORA), '') })
t('el día cambia a medianoche de CHILE, no de UTC: las 23:30 del viernes en Santiago son sábado en UTC y siguen siendo «Ayer»', () => {
  assert.equal(etiquetaListaChat('2026-10-17T02:30:00Z', AHORA), 'Ayer', '23:30 del viernes 16 en Chile (02:30 UTC del sábado)')
  assert.equal(etiquetaListaChat('2026-10-17T03:30:00Z', AHORA), '00:30', 'las 00:30 del sábado ya son «hoy»')
  const TARDE = new Date('2026-10-18T02:30:00Z')      // 23:30 del sábado en Santiago, aunque en UTC ya sea domingo
  assert.equal(etiquetaListaChat('2026-10-17T05:00:00Z', TARDE), '02:00', 'sigue siendo hoy'); assert.equal(etiquetaListaChat('2026-10-17T02:30:00Z', TARDE), 'Ayer')
})
t('el separador de día dentro del chat y el día de cada mensaje', () => {
  assert.equal(separadorDiaChat('2026-10-17T13:12:00Z', AHORA), 'Hoy'); assert.equal(separadorDiaChat('2026-10-16T20:00:00Z', AHORA), 'Ayer'); assert.equal(separadorDiaChat('2026-10-04T20:00:00Z', AHORA), 'Domingo, 4 de octubre')
  assert.equal(diaDeChat('2026-10-17T02:30:00Z'), '2026-10-16'); assert.equal(diaDeChat('2026-10-17T03:30:00Z'), '2026-10-17'); assert.equal(diaDeChat('x'), '') })
console.log(`${n} comprobaciones OK`)
