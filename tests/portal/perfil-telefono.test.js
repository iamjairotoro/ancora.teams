// El Perfil del portal en teléfono (Perfil-A): botón de apariencia con menú (Automático / Claro / Oscuro), «Sistema» renombrado «Automático» en lib/textos, y la fecha de nacimiento que NUNCA muestra ni guarda la fecha de hoy
// cuando no hay una guardada. Sin base ni servidor. Correr: `npm run test:portal`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const origResolve = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { return req.startsWith('@/') ? origResolve.call(this, path.join(RAIZ, req.slice(2) + '.ts'), ...r) : origResolve.call(this, req, ...r) }
const F = require(path.join(RAIZ, 'lib/portal/fechaNacimiento.ts'))
const A = require(path.join(RAIZ, 'lib/textos/apariencia.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('el Perfil en teléfono')
t('«Sistema» se dice «Automático»; las tres opciones tienen nombre y la etiqueta del botón dice la actual', () => {
  assert.deepEqual([A.NOMBRE_TEMA.system, A.NOMBRE_TEMA.light, A.NOMBRE_TEMA.dark], ['Automático', 'Claro', 'Oscuro'])
  assert.equal(A.etiquetaBotonApariencia('dark'), 'Apariencia: Oscuro'); assert.ok(!/Sistema/.test(JSON.stringify(A.TEXTOS_APARIENCIA))) })
t('fecha vacía → «Elegir fecha» (nunca hoy) y se guarda vacía', () => {
  for (const v of ['', null, undefined, 'x', '2026-13-01', '1990-02-31', '90-01-01']) { assert.equal(F.textoFechaNacimiento(v), 'Elegir fecha'); assert.equal(F.fechaNacimientoParaGuardar(v), '') }
  const hoy = new Date().toISOString().slice(0, 10); assert.notEqual(F.fechaNacimientoParaGuardar(''), hoy) })
t('una fecha elegida se muestra en español y se guarda tal cual', () => {
  assert.equal(F.textoFechaNacimiento('1990-11-06'), '6 de noviembre de 1990'); assert.equal(F.fechaNacimientoParaGuardar('1990-11-06'), '1990-11-06'); assert.equal(F.textoFechaNacimiento('2000-02-29'), '29 de febrero de 2000') })
t('MisDatos no inventa una fecha: el estado inicial es la guardada o vacío, y todo guardado pasa por fechaNacimientoParaGuardar', () => {
  const s = leer('app/portal/_components/perfil/MisDatos.tsx')
  assert.ok(/fecha_nacimiento: persona\.fecha_nacimiento \|\| ''/.test(s)); assert.ok(/fechaNacimientoParaGuardar\(f\.fecha_nacimiento\)/.test(s)); assert.ok(!/new Date\(\)|toISOString|hoy/.test(s)) })
t('teléfono: botón redondo de 44 con menú de MenuFlotante, check en la actual, y el selector de siempre queda para el escritorio', () => {
  const b = leer('app/portal/_components/perfil/BotonApariencia.tsx'), p = leer('app/portal/_components/perfil/Perfil.tsx'), css = leer('app/portal/_components/perfil/perfil.module.css')
  assert.ok(/<MenuFlotante /.test(b) && /role="menuitemradio"/.test(b) && /aria-checked=\{pref === p\}/.test(b)); assert.ok(/\.aparBtn\{[^}]*max\(44px, 2\.75rem\)/.test(css))
  assert.ok(/\{!telefono && <AparienciaControl/.test(p) && /telefono\s*\n?\s*\? <div className=\{ui\.cabecera\}>/.test(p)); assert.ok(/'Sistema'/.test(leer('app/portal/_components/AparienciaControl.tsx')), 'el escritorio conserva su selector') })
t('campos de teléfono y nombre con el mismo estilo (radio 12, alto 48) en teléfono, también la fecha', () => {
  const css = leer('app/portal/_components/perfil/perfil.module.css'); assert.ok(/\.formTel \.campo input, \.formTel \.fechaCaja\{[^}]*min-height:3rem; border-radius:0\.75rem/.test(css)) })
console.log(`\n${n} comprobaciones OK`)
