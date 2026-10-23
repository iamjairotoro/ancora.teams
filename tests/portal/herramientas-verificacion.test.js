// Las herramientas de verificación están en el repo (no en una carpeta temporal) y los documentos apuntan a ellas. Correr: `node tests/portal/herramientas-verificacion.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const ex = f => fs.existsSync(path.join(RAIZ, f)), leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
correr(async () => {
  await prueba('verificar.sh y construir.sh existen, son ejecutables y no dependen de una carpeta temporal fija', async () => {
    for (const f of ['scripts/verificacion/verificar.sh', 'scripts/verificacion/construir.sh']) { assert.ok(ex(f), f); assert.ok(fs.statSync(path.join(RAIZ, f)).mode & 0o111, f + ' no es ejecutable'); const t = leer(f); assert.ok(!/\/private\/tmp\/claude|0a9e7b6d/.test(t), f + ' apunta a una carpeta temporal de una sesión'); assert.ok(/\$\{WORK:-/.test(t)) }
    const v = leer('scripts/verificacion/verificar.sh'); for (const x of ['tsc --noEmit', 'git archive HEAD', 'next build', 'test:portal test:auth test:correo test:textos']) assert.ok(v.includes(x), 'verificar.sh sin ' + x) })
  await prueba('las herramientas de capturas y de escritorio están en tests/e2e-menus con su LEEME, los simuladores y los escenarios', async () => {
    for (const f of ['cdp.js', 'cap.js', 'desk.js', 'pngdiff.js', 'menus-recorte.js', 'inv5-mock.js', 'home-mock.js', 'portal-mock.js', 'homeadmin-mock.js', 'LEEME.md', 'escenarios/inicio.json', 'escenarios/homeadmin.json', 'escenarios/desk-home.json', 'escenarios/desk-portal.json']) assert.ok(ex('tests/e2e-menus/' + f), f)
    for (const f of fs.readdirSync(path.join(RAIZ, 'tests/e2e-menus/escenarios'))) JSON.parse(leer('tests/e2e-menus/escenarios/' + f)) })
  await prueba('PENDIENTES-code.md deja lo abierto: Home del líder sin captura, fechas repetidas del escritorio del portal y los puntos de seguridad antes de `main`; apunta a las herramientas', async () => {
    const p = leer('docs/PENDIENTES-code.md'); assert.ok(/## Abierto tras el rediseño de teléfono/.test(p)); for (const x of ['Home del líder sin captura real', 'Fechas repetidas y filas «Nominación pendiente» en el ESCRITORIO del portal', 'Puntos de seguridad pendientes ANTES de llevar nada a `main`']) assert.ok(p.includes(x), 'falta «' + x + '»')
    assert.ok(p.includes('scripts/verificacion/verificar.sh') && p.includes('tests/e2e-menus/LEEME.md')) })
  terminar()
})
