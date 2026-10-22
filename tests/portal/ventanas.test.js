// Ventana centrada (bloque B2): los confirm()/alert() de siempre salen como ventana en teléfono y siguen siendo el diálogo nativo, con el mismo texto, en escritorio; el mensaje se parte en título y texto; medidas del mockup Ventanas-A.
// Correr: `node tests/portal/ventanas.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const { partirMensaje } = real('lib/ventanas/partirMensaje')
const V = real('lib/ventanas/ventanas')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const archivos = d => fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? archivos(path.join(d, e.name)) : /\.tsx$/.test(e.name) ? [path.join(d, e.name)] : [])

correr(async () => {
  await prueba('el mensaje de siempre se parte en título (la pregunta) y texto (el resto), con los tipos de mensaje reales (pregunta primero, pregunta al final, sin pregunta)', async () => {
    const casos = [
      ['¿Eliminar este integrante?', '¿Eliminar este integrante?', ''],
      ['¿Vaciar este cronograma? Se borran todas las filas de hoy — la plantilla aplicada no se toca.', '¿Vaciar este cronograma?', 'Se borran todas las filas de hoy — la plantilla aplicada no se toca.'],
      ['¿Archivar esta plantilla? No se borra, deja de aparecer para elegir en nuevos servicios.', '¿Archivar esta plantilla?', 'No se borra, deja de aparecer para elegir en nuevos servicios.'],
      ['¿Eliminar este mensaje? No se puede deshacer.', '¿Eliminar este mensaje?', 'No se puede deshacer.'],
      ['¿Eliminar esta canción? Esta acción no se puede deshacer.', '¿Eliminar esta canción?', 'Esta acción no se puede deshacer.'],
      ['Generar uno nuevo desactiva el enlace actual: dejará de abrir el portal. ¿Continuar?', '¿Continuar?', 'Generar uno nuevo desactiva el enlace actual: dejará de abrir el portal.'],
      ['¿Revocar el enlace? Esta persona dejará de poder abrir el portal con él, de inmediato.', '¿Revocar el enlace?', 'Esta persona dejará de poder abrir el portal con él, de inmediato.'],
      ['Vas a perder 2 canciones cargadas (con su tono y su lead) al reemplazar el orden — ¿seguir igual?', '¿Seguir igual?', 'Vas a perder 2 canciones cargadas (con su tono y su lead) al reemplazar el orden.'],
      ['¿Vaciar el orden del servicio? Se pierden 1 canción cargada (con su tono y su lead).', '¿Vaciar el orden del servicio?', 'Se pierden 1 canción cargada (con su tono y su lead).'],
      ['¿Quitar a ana@x.cl como administrador?', '¿Quitar a ana@x.cl como administrador?', ''],
      ['¿Quitar esta herramienta? Se borran sus datos para este equipo (plantillas de checklist no se ven afectadas).', '¿Quitar esta herramienta?', 'Se borran sus datos para este equipo (plantillas de checklist no se ven afectadas).'],
      ['¿Eliminar este servicio?', '¿Eliminar este servicio?', ''],
      ['La imagen debe ser menor a 3MB', 'La imagen debe ser menor a 3MB', ''],
      ['No se pudo quitar el bloqueo. Intenta de nuevo.', 'No se pudo quitar el bloqueo. Intenta de nuevo.', ''],
    ]
    for (const [m, t, x] of casos) assert.deepEqual(partirMensaje(m), { titulo: t, texto: x }, m) })
  await prueba('escritorio (o sin proveedor): confirm() y alert() nativos con el MISMO texto, sin tocarlo; teléfono con proveedor: la ventana', async () => {
    const llamadas = []; let telefono = false, impl = null
    global.window = { confirm: m => { llamadas.push(['confirm', m]); return true }, alert: m => { llamadas.push(['alert', m]) }, matchMedia: () => ({ matches: telefono }) }
    try {
      assert.equal(await V.confirmar('¿Eliminar este servicio?', { accion: 'Eliminar' }), true); await V.avisar('No se pudo quitar el bloqueo. Intenta de nuevo.'); assert.deepEqual(llamadas, [['confirm', '¿Eliminar este servicio?'], ['alert', 'No se pudo quitar el bloqueo. Intenta de nuevo.']])
      telefono = true; assert.equal(await V.confirmar('x'), true, 'teléfono sin proveedor montado: cae al nativo')
      impl = { confirmar: async (m, o) => { llamadas.push(['ventana', m, o.accion]); return false }, avisar: async m => { llamadas.push(['aviso', m]) } }; V.registrarVentanas(impl)
      assert.equal(await V.confirmar('¿Vaciar?', { accion: 'Vaciar' }), false); await V.avisar('Listo'); assert.deepEqual(llamadas.slice(-2), [['ventana', '¿Vaciar?', 'Vaciar'], ['aviso', 'Listo']])
      telefono = false; await V.confirmar('en escritorio'); assert.deepEqual(llamadas.pop(), ['confirm', 'en escritorio'], 'en escritorio, aunque haya proveedor, sigue el nativo')
    } finally { V.registrarVentanas(null); delete global.window } })
  await prueba('ningún componente usa confirm() ni alert() del navegador: todos pasan por lib/ventanas/ventanas.ts (la app, no /api)', async () => {
    const malos = [...archivos('components'), ...archivos('app')].filter(f => !f.startsWith('app/api')).filter(f => /(^|[^\w.])(window\.)?(confirm|alert)\(/.test(leer(f)))
    assert.deepEqual(malos, [], 'diálogo nativo suelto: ' + malos.join(', ')) })
  await prueba('el proveedor está en el layout raíz (admin, Home y portal) y la ventana de «Notificar» la usa en teléfono; en escritorio sigue la hoja de siempre', async () => {
    assert.ok(/<VentanasProvider>\{children\}<\/VentanasProvider>/.test(leer('app/layout.tsx'))); const h = leer('components/servicio-movil/HojasServicio.tsx')
    assert.ok(/if \(telefono\) return <VentanaCentrada titulo=\{confirmarNotificarTitulo\(nuevos\)\}/.test(h)); assert.ok(/<HojaBase idTitulo=\{id\} onCerrar=\{onCerrar\} cabeza=\{<Titulo id=\{id\}>\{confirmarNotificarTitulo\(nuevos\)\}/.test(h)) })
  await prueba('medidas (mockup Ventanas-A, × --esc): radio 22, relleno 20/18/16, ancho 300, botones de 46 con radio 13, primario claro y secundario gris; título 19, texto 15; solo tokens', async () => {
    const css = fs.readFileSync(path.join(RAIZ, 'components/ventanas/ventanas.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), regla = n => (css.match(new RegExp('\\.' + n + '\\{[^}]*\\}')) || [''])[0], esc = px => `calc(${px}px * var(--esc, 1))`
    const v = regla('ventana'); assert.ok(v.includes(`border-radius:${esc(22)}`) && v.includes(`padding:${esc(20)} ${esc(18)} ${esc(16)}`) && v.includes(`width:min(${esc(300)}, 100%)`), 'ventana'); const b = regla('boton'); assert.ok(b.includes(`border-radius:${esc(13)}`) && b.includes(`min-height:max(44px, ${esc(46)})`) && /background:var\(--anc-sunk\)/.test(b), 'botón')
    assert.ok(/background:var\(--anc-accent\); color:var\(--anc-on-accent\)/.test(regla('primario')), 'primario claro'); assert.ok(regla('titulo').includes(esc(19)) && regla('texto').includes(esc(15))); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css)) })
  await prueba('comportamiento común con las hojas: role="alertdialog", foco dentro, Tab no sale, Escape y fondo cierran (como cancelar), «atrás» cierra sin dejar entradas de historial', async () => {
    const c = leer('components/ventanas/VentanaCentrada.tsx'); for (const x of ['role="alertdialog"', 'aria-modal="true"', "e.key === 'Escape'", "e.key !== 'Tab'", "window.addEventListener('popstate'", 'history.pushState', 'history.back()', 'createPortal']) assert.ok(c.includes(x), 'falta ' + x) })
  terminar()
})
