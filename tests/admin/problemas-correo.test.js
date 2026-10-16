// Punto 61, ajuste de octubre 2026: cuándo aparece el «!» del correo (lib/problemasCorreo.ts). Con éxito no se muestra nada; el «!» solo aparece si el correo falló, se omitió o la persona no
// tiene correo cargado; la notificación en la app NO genera un «!» por sí sola. Lógica pura, sin base. Correr: `npm run test:correo`.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), Module = require('module')
const RAIZ = path.resolve(__dirname, '..', '..'), ts = require(path.join(RAIZ, 'node_modules', 'typescript'))
Module._extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022' } }).outputText, file)
const { problemaDeCorreo, juntarResultados, resultadoDe, MOTIVO_SIN_CORREO } = require(path.join(RAIZ, 'lib/problemasCorreo.ts'))

let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const r = (memberId, estado, extra = {}) => ({ memberId, teamId: null, nombre: 'X', email: 'x@y.test', estado, motivo: null, aviso: null, push: 'no aplica', ...extra })

console.log('con éxito no se muestra nada')
t('correo aceptado (guardado) con correo cargado → sin problema', () => assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'enviado' }), null))
t('sin intento todavía y con correo cargado → sin problema (nadie sabe aún)', () => assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: null }), null))
t('el último resultado «enviado» → sin problema, aunque lo guardado diga «falló» (el reintento tuvo éxito)', () => assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló', errorGuardado: 'rebotó', ultimo: r('m', 'enviado') }), null))

console.log('el correo falló')
t('falló (guardado): problema «fallo», con el motivo guardado y «Reintentar correo»', () => {
  const p = problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló', errorGuardado: 'Dirección rechazada' }); assert.deepEqual([p.tipo, p.titulo, p.motivo, p.puedeReintentar, p.push], ['fallo', 'El correo no se envió', 'Dirección rechazada', true, null]) })
t('falló sin motivo guardado: un motivo genérico', () => assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló' }).motivo, 'No se pudo enviar el correo.'))
t('falló en el último envío: trae el motivo del resultado y el estado de la notificación en la app DENTRO del problema', () => {
  const p = problemaDeCorreo({ email: 'a@b.test', ultimo: r('m', 'falló', { motivo: 'Buzón lleno', push: 'sin dispositivo' }) })
  assert.deepEqual([p.tipo, p.motivo, p.push, p.puedeReintentar], ['fallo', 'Buzón lleno', 'Notificación en la app: no tiene la app instalada con avisos activados.', true]) })

console.log('se omitió')
t('omitido por un error al crear la invitación: problema «omitido» con su motivo, sin reintento', () => {
  const p = problemaDeCorreo({ email: 'a@b.test', ultimo: r('m', 'omitido', { motivo: 'No se pudo crear la invitación: boom' }) }); assert.deepEqual([p.tipo, p.titulo, p.motivo, p.puedeReintentar], ['omitido', 'Correo omitido', 'No se pudo crear la invitación: boom', false]) })
t('omitido porque no tiene correo: siempre el mismo texto, el aprobado', () => {
  const p = problemaDeCorreo({ email: '', ultimo: r('m', 'omitido', { motivo: 'No tiene correo cargado, así que no se le publicó la invitación.' }) }); assert.equal(p.motivo, 'No tiene correo cargado; no recibirá la convocatoria') })

console.log('sin correo cargado, desde ANTES del primer envío')
for (const email of ['', '   ', null, undefined]) t(`email ${JSON.stringify(email)} y nunca se le envió → «!» «sin-correo» con el texto aprobado y sin reintento`, () => {
  const p = problemaDeCorreo({ email, estadoGuardado: null }); assert.deepEqual([p.tipo, p.titulo, p.motivo, p.puedeReintentar, p.push], ['sin-correo', 'Sin correo cargado', MOTIVO_SIN_CORREO, false, null]); assert.equal(MOTIVO_SIN_CORREO, 'No tiene correo cargado; no recibirá la convocatoria') })
t('si ya se le aceptó un correo antes (guardado «enviado»), borrar el correo después no genera «!»', () => assert.equal(problemaDeCorreo({ email: '', estadoGuardado: 'enviado' }), null))

console.log('la notificación en la app NO genera un «!» por sí sola')
for (const push of ['falló', 'sin dispositivo', 'no configurado', 'parcial', 'enviado', 'no aplica']) t(`push «${push}» con el correo aceptado → sin problema`, () => assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'enviado', ultimo: r('m', 'enviado', { push }) }), null))
t('push «no aplica» dentro de un problema → no agrega línea', () => assert.equal(problemaDeCorreo({ email: 'a@b.test', ultimo: r('m', 'falló', { motivo: 'x', push: 'no aplica' }) }).push, null))

console.log('juntar los resultados de los envíos')
t('el resultado de una persona reemplaza al anterior (un reintento exitoso borra su problema) y los de las demás se conservan', () => {
  const a = [r('m1', 'falló', { teamId: 'T1' }), r('m2', 'omitido', { teamId: 'T1' })], b = [r('m1', 'enviado', { teamId: 'T1' })]
  const j = juntarResultados(a, b); assert.equal(j.length, 2); assert.equal(resultadoDe(j, 'm1', 'T1').estado, 'enviado'); assert.equal(resultadoDe(j, 'm2', 'T1').estado, 'omitido') })
t('la misma persona en DOS equipos son dos resultados; los ensayos (sin equipo) se buscan con null', () => {
  const j = juntarResultados([r('m1', 'falló', { teamId: 'T1' })], [r('m1', 'omitido', { teamId: 'T2' }), r('m1', 'enviado', { teamId: null })])
  assert.equal(j.length, 3); assert.equal(resultadoDe(j, 'm1', 'T1').estado, 'falló'); assert.equal(resultadoDe(j, 'm1', 'T2').estado, 'omitido'); assert.equal(resultadoDe(j, 'm1', null).estado, 'enviado'); assert.equal(resultadoDe(j, 'm9', 'T1'), null) })
console.log(`\n${n} comprobaciones OK`)
