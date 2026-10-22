// Los menús (⋯) no se recortan dentro de otro elemento (defecto general en teléfono: el menú de Checklist/Cronograma quedaba cortado por el overflow:hidden de la tarjeta de la herramienta).
// Esto vigila la ESTRUCTURA: ningún menú se abre con position:absolute dentro de un contenedor; todos salen por components/MenuFlotante.tsx (hoja inferior en teléfono, portal en escritorio).
// La medición real (caja dentro del viewport, sin ancestro que recorte ni cubra, a 390 y 360 px, claro y oscuro) es tests/e2e-menus/menus-recorte.js (necesita la app corriendo). Correr: `node tests/portal/menus-recorte.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const crudo = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const leer = f => crudo(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const archivos = d => fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? archivos(path.join(d, e.name)) : /\.tsx$/.test(e.name) ? [path.join(d, e.name)] : [])
const todos = [...archivos('components'), ...archivos('app')].filter(f => !f.includes('/portal/'))      // el portal (músico) se reporta aparte

correr(async () => {
  await prueba('ningún componente de administración dibuja un menú con la clase .anc-rowMenu / rowMenu a mano: todos pasan por <MenuFlotante>', async () => {
    const sueltos = todos.filter(f => f !== 'components/MenuFlotante.tsx').filter(f => /className=("anc-rowMenu"|\{styles\.rowMenu\})/.test(leer(f)))
    assert.deepEqual(sueltos, [], 'menú sin MenuFlotante (se recortaría dentro de su contenedor): ' + sueltos.join(', ')) })
  await prueba('MenuFlotante: sale por portal a <body>; en teléfono es una tarjeta chica junto al botón (radio 18, filas de 46, medidas × --esc), en escritorio la caja de siempre; los dos con position:fixed y abren hacia arriba si abajo no cabe', async () => {
    const m = leer('components/MenuFlotante.tsx'), c = crudo('components/menuFlotante.module.css').replace(/\/\*[\s\S]*?\*\//g, ''), esc = px => `calc(${px}px * var(--esc, 1))`
    assert.ok(/createPortal\(/.test(m) && /document\.body/.test(m)); assert.ok(!/HojaBase/.test(m), 'ya no es una hoja inferior'); assert.ok(/position: 'fixed'/.test(m)); assert.ok(/sin lugar abajo → hacia arriba/.test(crudo('components/MenuFlotante.tsx'))); assert.ok(/css\.tarjeta/.test(m))
    const caja = c.match(/\.tarjeta\.tarjeta\{([^}]*)\}/)[1], fila = c.match(/\.tarjeta\.tarjeta button\{([^}]*)\}/)[1]; assert.ok(caja.includes(`border-radius:${esc(18)}`) && /background:var\(--anc-panel-solid\)/.test(caja), 'radio 18'); assert.ok(fila.includes(`min-height:${esc(46)}`), 'filas de 46'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(c), 'solo tokens') })
  await prueba('en teléfono cualquier opción cierra el menú después de actuar', async () => {
    assert.ok(/closest\('button:not\(:disabled\)'\)\) onCerrar\(\)/.test(leer('components/MenuFlotante.tsx'))) })
  await prueba('las tarjetas de herramienta (Checklist, Cronograma, Notas) usan la tarjeta común y no llevan su propio overflow:hidden', async () => {
    for (const f of ['ChecklistTool', 'ScheduleTool', 'FreeTextTool']) {
      const t = leer(`components/${f}.tsx`)
      assert.ok(/<TarjetaHerramienta>/.test(t) && /<\/TarjetaHerramienta>/.test(t), f + ' no usa TarjetaHerramienta'); assert.ok(!/overflow: ?'hidden'/.test(t), f + ' trae su propio overflow:hidden') }
    assert.ok(/overflow: 'hidden'/.test(leer('components/TarjetaHerramienta.tsx'))) })
  await prueba('los menús de las herramientas y de las plantillas, el «Añadir» del Orden, el menú de la lista de canciones y el de los mensajes del chat usan MenuFlotante', async () => {
    const cuenta = (f, n) => assert.ok((leer(f).match(/<MenuFlotante /g) || []).length >= n, f + ' debería tener ' + n + ' MenuFlotante')
    cuenta('components/ChecklistTool.tsx', 2); cuenta('components/ScheduleTool.tsx', 2); cuenta('components/OrdenDelServicio.tsx', 4); cuenta('components/servicio-movil/PantallaHerramienta.tsx', 1)
    cuenta('components/canciones/CancionesPanel.tsx', 3); cuenta('components/ChatModerationPanel.tsx', 1); cuenta('components/TeamsAdminPanel.tsx', 2); cuenta('components/AdminServiceView.tsx', 3); cuenta('components/PersonasList.tsx', 1) })
  await prueba('las opciones destructivas siguen igual: Vaciar, Quitar esta herramienta, Archivar y Eliminar conservan sus manejadores (y su confirmación)', async () => {
    const ck = leer('components/ChecklistTool.tsx'), sc = leer('components/ScheduleTool.tsx'), or = leer('components/OrdenDelServicio.tsx')
    assert.ok(/onClick=\{vaciar\} disabled=/.test(ck) && /onClick=\{vaciar\} disabled=/.test(sc) && /onClick=\{vaciarOrder\} disabled=/.test(or))
    for (const t of [ck, sc, or]) assert.ok(/onRemoveTool\(\)|onQuitar\(\)/.test(t)); assert.ok(/archiveTemplate\(t\.id\)/.test(ck) && /archiveOrderTemplate\(t\.id\)/.test(or))
    assert.ok(/function vaciar|const vaciar/.test(ck) && /if \(!\(await confirmar\(/.test(ck), 'Vaciar del checklist perdió su confirmación') })
  await prueba('las opciones separadas llevan role="separator" (la tarjeta las dibuja como línea)', async () => {
    assert.ok(/role="separator"/.test(leer('components/ChecklistTool.tsx'))) })
  await prueba('el arnés de medición vive en el repo y cubre los cuatro ⋯ de herramientas con el contenedor vacío, a 390 y 360, en claro y oscuro', async () => {
    const a = crudo('tests/e2e-menus/menus-recorte.js')
    for (const x of ['Acciones de Checklist', 'Acciones de Cronograma', 'Acciones de Notas', 'Acciones del Orden del servicio', '[390, 360]', 'elementFromPoint']) assert.ok(a.includes(x), 'el arnés no menciona ' + x)
    assert.ok(/'dark', 'light'|\['dark', ?'light'\]|dark.*light/.test(a)) })
  terminar()
})
