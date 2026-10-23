// El Home de teléfono de un LÍDER no tiene destinos (/admin solo lo abre un administrador): sin botones, enlaces ni tarjetas que lleven allí; el administrador sí. Se dibuja el componente de verdad (react-dom/server). Correr: `node tests/portal/home-lider-destinos.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const Home = require(path.join(RAIZ, 'components/home/HomeAdminMovil.tsx')).default
const { puedeAbrirAdministracion } = require(resolver(path.join(RAIZ, 'lib/home/cifrasAdmin')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const eq = (teamId, nombre, o = {}) => ({ teamId, nombre, color: 'cobalto', asignados: 2, convocados: 3, confirmados: 1, rechazos: 0, sinResponder: 2, vacantes: 1, estado: 'convocado', ...o })
const servicios = [{ id: 's1', fecha: '2026-10-25', titulo: 'Servicio Ancora', horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos: [eq('t1', 'Alabanza'), eq('t2', 'Producción')] }, { id: 's2', fecha: '2026-11-01', titulo: 'Servicio Ancora', horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos: [eq('t1', 'Alabanza')] }]
const base = { orgName: 'Iglesia', hoy: '2026-10-21', servicios, cargando: false, error: null, onReintentar() {}, equipos: [{ id: 't1', name: 'Alabanza', color: 'cobalto' }, { id: 't2', name: 'Producción', color: 'cobalto' }], personasPorEquipo: { t1: 5, t2: 3 }, personas: [{ instaladaApp: true }], cumples: [] }
const destinos = { onAbrirServicio() {}, onVerServicios() {}, onVerPersonas() {}, onAbrirEquipo() {} }
const dibujar = (viewer, extra) => renderToStaticMarkup(React.createElement(Home, { ...base, viewer, ...extra }))

correr(async () => {
  await prueba('solo un administrador tiene destino en /admin', async () => { assert.equal(puedeAbrirAdministracion({ kind: 'admin' }), true); assert.equal(puedeAbrirAdministracion({ kind: 'leader', teamIds: new Set(['t1']) }), false) })
  await prueba('administrador con destinos: «Abrir servicio», «Ver personas», «Ver todos», la ficha, las filas de «Después», las tarjetas de equipo y los días con servicio son botones', async () => {
    const h = dibujar({ kind: 'admin' }, destinos); for (const x of ['Abrir servicio', 'Ver personas', 'Ver todos']) assert.ok(h.includes(x), 'falta ' + x)
    assert.ok(/<button[^>]*aria-label="Servicio Ancora, domingo 25 de octubre"/.test(h) || /<button[^>]*class="abrir"[^>]*aria-label="Servicio Ancora/.test(h), 'la ficha grande es un botón'); assert.ok(/<button type="button" class="tarjeta"/.test(h), 'tarjetas de equipo como botón'); assert.ok(/<button[^>]*class="celda[^"]*"/.test(h), 'los días con servicio abren') })
  await prueba('líder sin destinos: no hay «Abrir servicio», «Ver personas» ni «Ver todos»; las tarjetas de equipo, la ficha y las filas son solo informativas (sin botón ni flecha) y los días no abren nada; el contenido sigue visible', async () => {
    const h = dibujar({ kind: 'leader', teamIds: new Set(['t1']) }, {})
    for (const x of ['Abrir servicio', 'Ver personas', 'Ver todos']) assert.ok(!h.includes(x), 'no debe haber ' + x)
    assert.ok(!/<button type="button" class="tarjeta"/.test(h) && /class="tarjeta estatica"/.test(h), 'tarjetas estáticas'); assert.ok(!/<button[^>]*class="abrir"/.test(h), 'la ficha y las filas no son botones'); assert.ok(!/<button[^>]*class="celda/.test(h), 'los días no abren')
    assert.ok(h.includes('Alabanza')); assert.ok(h.includes('Voluntarios') && h.includes('Después')); assert.ok(!h.includes('Producción'), 'un líder solo ve su equipo') })
  await prueba('la página solo pasa los destinos si puedeAbrirAdministracion(viewer): un líder no recibe ninguno', async () => {
    const p = leer('app/home/page.tsx'); assert.ok(/\{\.\.\.\(puedeAbrirAdministracion\(viewer\) \? \{\s*onAbrirServicio:/.test(p)); assert.ok(/onVerPersonas: \(\) => router\.push\('\/admin\?tab=personas&vista=equipos'\), onAbrirEquipo:/.test(p)); assert.ok(!/<HomeAdminMovil[^>]*onVerPersonas=/.test(p), 'ningún destino fijo') })
  terminar()
})
