// Los tonos (etapa C): la lista compartida con tonos menores, el formato igual al de las restricciones de la base (054b), el 400 de /api/service-blocks y el aviso de error al guardar una canción. Sin base ni servidor. Correr: `node tests/portal/tonos.test.js`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const { TONOS, TONOS_MAYORES, TONOS_MENORES, TONO_FORMATO, esTonoValido } = require(path.join(RAIZ, 'lib/tonos.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('los tonos')
t('17 mayores y 17 menores, sin repetidos, cada menor es su mayor + «m», todos válidos', () => {
  assert.equal(TONOS_MAYORES.length, 17); assert.equal(TONOS_MENORES.length, 17); assert.equal(TONOS.length, 34); assert.equal(new Set(TONOS).size, 34)
  TONOS_MAYORES.forEach((m, i) => assert.equal(TONOS_MENORES[i], m + 'm')); for (const x of TONOS) assert.ok(esTonoValido(x), x) })
t('el formato es el de las restricciones de la base (054b, que vive en acordes-datos-b): letra A–G, # o b, m, o vacío', () => { assert.equal(TONO_FORMATO.source, '^([A-G][#b]?m?)?$') })
t('acepta vacío y tonos con # o b y menores', () => { for (const v of ['', 'C', 'F#', 'Bb', 'Am', 'C#m', 'Ebm', 'G']) assert.ok(esTonoValido(v), v) })
t('rechaza espacios, minúsculas, nombres en español, barras, otras letras y lo que no es texto', () => {
  for (const v of [' C', 'C ', 'c', 'am', 'Sol', 'Do', 'G/A', 'C/E', 'H', 'Cmaj7', 'C7', 'C##', 'Cbb', 'Mm', 'C\n']) assert.ok(!esTonoValido(v), JSON.stringify(v))
  for (const v of [null, undefined, 5, {}, []]) assert.ok(!esTonoValido(v), String(v)) })
console.log('la ruta y las pantallas')
t('/api/service-blocks responde 400 si el tono no es válido (acepta null y el formato; PATCH y POST usan la misma validación)', () => {
  const r = leer('app/api/service-blocks/route.ts').replace(/\s+/g, ' ')
  assert.ok(r.includes("import { esTonoValido } from '@/lib/tonos'")); assert.ok(r.includes('tono: v => v === null || esTonoValido(v)'), 'el validador del tono')
  assert.equal((r.match(/const mal = invalidos\(datos\); if \(mal\.length\) return error400\(/g) || []).length, 2, 'las dos rutas que escriben validan') })
t('Canciones y Orden usan la lista compartida; no queda otra lista suelta de notas', () => {
  for (const f of ['components/canciones/CancionesPanel.tsx', 'components/OrdenDelServicio.tsx']) { const c = leer(f); assert.ok(/from '@\/lib\/tonos'/.test(c), f); assert.ok(/const NOTAS\s*= TONOS/.test(c), f); assert.ok(!/\['A','A#','Bb'/.test(c), f) } })
t('CancionesPanel revisa el error al guardar: no cierra el formulario, avisa y distingue el tono', () => {
  const c = leer('components/canciones/CancionesPanel.tsx').replace(/\s+/g, ' ')
  assert.ok(c.includes('const { error } = editing.id ?')); assert.ok(/if \(error\) \{ setErrorGuardar\(/.test(c)); assert.ok(/tono_original_formato/.test(c)); assert.ok(c.includes('!esTonoValido(payload.tono_original ?? \'\')'))
  assert.ok(/errorGuardar && <div className="anc-legalWarn" role="alert"/.test(c)); assert.ok(c.indexOf('if (error) { setErrorGuardar(') < c.indexOf('setSaving(false); setEditing(null); onRefreshSongs()'), 'primero el error, luego cerrar')
  const x = leer('lib/textos/cancionesAdmin.ts'); assert.ok(/tonoNoValido: '[^']+'/.test(x) && /errorAlGuardar: '[^']+'/.test(x)) })
console.log(`\n${n} comprobaciones OK`)
