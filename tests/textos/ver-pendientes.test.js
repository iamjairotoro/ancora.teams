// Los botones de Home dicen lo que hacen: «Ver al pendiente» / «Ver a los N pendientes» (tarjeta del próximo servicio) y «Ver» (fila de «Necesita atención») solo ABREN el servicio; no envían ningún recordatorio.
// El recordatorio real queda para la fase de notificaciones (docs/PENDIENTES-code.md). Correr: `node tests/textos/ver-pendientes.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const H = require(resolver(path.join(RAIZ, 'lib/textos/home')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')

correr(async () => {
  await prueba('el botón de pendientes concuerda en número: 1 → «Ver al pendiente»; N → «Ver a los N pendientes»', async () => {
    assert.equal(H.verPendientes(1), 'Ver al pendiente'); assert.equal(H.verPendientes(2), 'Ver a los 2 pendientes'); assert.equal(H.verPendientes(12), 'Ver a los 12 pendientes'); assert.equal(H.TEXTO_VER, 'Ver') })
  await prueba('Home de escritorio y la fila de «Necesita atención» usan esos textos de lib/textos (y ya no dicen «Recordar», que prometía un envío que no existe)', async () => {
    const home = leer('components/home/Home.tsx'), pagina = leer('app/home/page.tsx')
    assert.ok(/verPendientes\(p\.next\.pendingCount\)/.test(home)); assert.ok(/actionLabel: TEXTO_VER,/.test(pagina)); assert.ok(!/Recordar/.test(home.replace(/\/\/[^\n]*/g, '') + pagina), 'ya no hay «Recordar» en pantalla') })
  await prueba('lo que hacen: onRemind y la acción de «Necesita atención» solo navegan al servicio (router.push), sin llamar a ninguna ruta de envío', async () => {
    const pagina = leer('app/home/page.tsx'); assert.ok(/onRemind: \(\) => router\.push\(urlServicioAdmin\(nextService\.id\)\)/.test(pagina)); assert.ok(/actionLabel: TEXTO_VER, onAction: \(\) => router\.push\(urlServicioAdmin\(nextService\?\.id\)\)/.test(pagina))
    assert.ok(!/api\/(reminder|send-invites|reassignment-notify|nomina-notify)/.test(pagina + leer('components/home/Home.tsx')), 'Home no llama a rutas de envío') })
  await prueba('Home móvil no tiene ese texto: sus botones son «Abrir servicio» y las filas abren el servicio', async () => {
    const m = leer('components/home/HomeMovil.tsx') + leer('components/home/VistaHoy.tsx') + leer('lib/home/hoy.ts'); assert.ok(!/Recordar|recordar/.test(m)); assert.ok(/T\.abrirServicio/.test(leer('components/home/VistaHoy.tsx'))) })
  terminar()
})
