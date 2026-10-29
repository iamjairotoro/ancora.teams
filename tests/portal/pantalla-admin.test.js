// Pantalla «Admin» del teléfono (Admin-Menu-A, reemplaza la hoja «Más») y Personas con UN solo juego de pestañas (Personas-C y D). Se dibuja la pantalla de verdad (react-dom/server). Correr: `node tests/portal/pantalla-admin.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const Pantalla = require(path.join(RAIZ, 'components/admin-movil/PantallaAdmin.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const dibujar = (o = {}) => renderToStaticMarkup(React.createElement(Pantalla, { nombreOrg: 'Iglesia Áncora', esOwner: true, themePref: 'system', onThemePref() {}, onIr() {}, onSignOut() {}, ...o }))
const cuenta = (h, re) => (h.match(re) || []).length

correr(async () => {
  await prueba('la pantalla Admin: título, botón redondo de apariencia, tarjeta de la organización (IA, «Administración · Propietario»), «Gestión» con sus filas y «Cerrar sesión» al final', async () => {
    const h = dibujar()
    assert.ok(/<h1[^>]*>Admin<\/h1>/.test(h)); assert.ok(/aria-haspopup="menu"/.test(h) && /aria-label="Apariencia/.test(h), 'el botón de apariencia (sol/luna/teléfono)'); assert.ok(h.includes('>IA<') && h.includes('Iglesia Áncora') && h.includes('Administración · Propietario'))
    for (const x of ['Calendario', 'Bloqueos y disponibilidad', 'Chats', 'Moderación', 'Admins', 'Solo el propietario', 'Equipos', 'Colores, posiciones y herramientas', 'Historial', 'Servicios pasados']) assert.ok(h.includes(x), 'falta ' + x)
    assert.equal(cuenta(h, /class="fila"/g), 5, 'cinco filas con flecha'); assert.equal(cuenta(h, /<svg[^>]*lucide-chevron-right/g), 5); assert.ok(h.indexOf('Gestión') < h.indexOf('Calendario') && h.lastIndexOf('Cerrar sesión') > h.lastIndexOf('Historial'), 'Cerrar sesión al final') })
  await prueba('un administrador que no es propietario no ve «Admins» ni se le dice «Propietario»; lo que se dejó fuera de la primera versión no aparece', async () => {
    const h = dibujar({ esOwner: false }); assert.ok(!h.includes('Admins') && !h.includes('Solo el propietario') && !h.includes('Propietario')); assert.ok(h.includes('Administración · Administrador')); assert.equal(cuenta(h, /class="fila"/g), 4)
    for (const fuera of [/convocatoria/i, /ajustes de la organizaci/i, /sincronizar/i, /respaldo/i]) assert.ok(!fuera.test(dibujar()), String(fuera)) })
  await prueba('el cableado: «Admin» es el último ítem y abre la pantalla (ya no hay hoja «Más»); las filas navegan; solo un administrador la tiene (un líder en /home no tiene menú)', async () => {
    const page = leer('app/admin/page.tsx'), home = leer('app/home/page.tsx'), menu = leer('components/admin-movil/MenuAdminMovil.tsx')
    assert.ok(!fs.existsSync(path.join(RAIZ, 'components/admin-movil/HojaMas.tsx')), 'la hoja «Más» ya no existe'); assert.ok(!/HojaMas|masAbierto/.test(menu)); assert.ok(/tab==='admin'\s+&& <PantallaAdmin/.test(page)); assert.ok(/onIr=\{d=>\{ if \('tab' in d\) setTab\(d\.tab\); else router\.push\(d\.url\) \}\}/.test(page))
    assert.ok(/menuMovil=\{viewerIsAdmin \? <MenuAdminMovil/.test(home) && /: undefined\}/.test(home), 'un líder no tiene menú inferior'); assert.ok(/onSelect=\{k=>\{ if\(k!=='home'\) router\.push\(`\/admin\?tab=\$\{k\}`\) \}\}/.test(home), 'desde /home, «Admin» lleva a /admin?tab=admin')
    const { VALID_TABS, pestanaInicial } = require(resolver(path.join(RAIZ, 'lib/admin/pestanas'))); assert.ok(VALID_TABS.includes('admin')); assert.equal(pestanaInicial('admin'), 'admin') })
  await prueba('Personas en teléfono: UN solo juego de pestañas («Personas | Equipos»); «Personas | Admins» solo en escritorio; «Admins» vuelve a «‹ Admin»; la letra del body desde el primer pintado', async () => {
    const p = leer('components/PersonasPanel.tsx')
    assert.ok(/\{canSeeAdmins && !telefonoYa && \(\s*<div className=\{styles\.tabs\} role="tablist"/.test(p), 'la fila de arriba solo fuera del teléfono'); assert.ok(/telefonoYa && activeTab === 'admins' && onVolverAAdmin/.test(p) && /TEXTOS_ADMIN_MOVIL\.titulo/.test(p))
    assert.ok(/<div style=\{telefonoYa \? undefined : rootStyle\}>/.test(p), 'sin Jakarta en el primer pintado del teléfono'); assert.ok(/\(!telefonoYa \|\| vista === 'equipo'\)/.test(p), '«Gestionar equipos» solo en Equipos en teléfono'); assert.ok(/onVolverAAdmin=\{\(\) => setTab\('admin'\)\}/.test(leer('app/admin/page.tsx')))
    const eq = leer('components/personas/PorEquipo.tsx'); assert.ok(/telefonoYa\s*\? <PersonaCelda [^>]*etiqueta=\{p\.lider \? 'Líder' : null\}/.test(eq), 'en teléfono «Líder» es una etiqueta junto al nombre (PersonaCelda)'); assert.ok(/<span className=\{ui\.lider\}>Líder<\/span>/.test(eq), 'el escritorio la conserva en la línea de abajo') })
  await prueba('«Historial» de la pantalla Admin abre la lista de Servicios con el historial desplegado (?historial=1, leído de useSearchParams) y la URL lo suelta al salir de Servicio', async () => {
    const l = leer('components/servicio-movil/ListaServicios.tsx'); assert.ok(/const params = useSearchParams\(\)/.test(l) && /useState\(\(\) => params\.get\('historial'\) === '1'\)/.test(l))
    const { urlConPestana } = require(resolver(path.join(RAIZ, 'lib/admin/urlPestana'))); assert.equal(urlConPestana('http://x.test/admin?tab=setlist&historial=1', 'personas'), '/admin?tab=personas', 'al salir de Servicio se va historial'); assert.equal(urlConPestana('http://x.test/admin?tab=admin', 'setlist'), '/admin?tab=setlist') })
  terminar()
})
