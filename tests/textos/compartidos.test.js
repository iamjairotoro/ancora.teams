// Textos compartidos (commit «textos y errores», parte 4): lo que el Home de escritorio y el móvil escribían por separado y los mensajes de error repetidos de las rutas del servidor
// salen de UN archivo. Correr: `node tests/textos/compartidos.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const { TEXTOS_HOME, confirmadosDe } = require(resolver(path.join(RAIZ, 'lib/textos/home')))
const { TEXTOS } = require(resolver(path.join(RAIZ, 'lib/textos/comun')))
const { MSG } = require(resolver(path.join(RAIZ, 'lib/textos/mensajes')))
const { archivosDeInterfaz, lineas } = require('./_fuentes')
const fuenteSinComentarios = f => require('fs').readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

correr(async () => {
  console.log('Home de escritorio y Home móvil')
  const HOME = ['components/home/Home.tsx', 'components/home/HomeMovil.tsx', 'components/home/VistaHoy.tsx', 'lib/home/hoy.ts']
  const claves = ['verTodos', 'abrirServicio', 'abrirFlecha', 'proximosServicios', 'sinProximoServicio', 'todaviaNoHayServicio', 'sinServicioAyuda', 'respuestaPorEquipo', 'comoSeReparteLaCarga', 'ultimos3Meses', 'cumpleanos', 'mesAnterior', 'mesSiguiente', 'sinAsignar', 'sinConvocar', 'confirmo', 'nadieBloqueo']
  await prueba('el archivo compartido trae todos los textos que antes se repetían, con su texto de siempre', async () => {
    assert.deepEqual(Object.keys(TEXTOS_HOME).sort(), claves.slice().sort())
    assert.equal(TEXTOS_HOME.verTodos, 'Ver todos'); assert.equal(TEXTOS_HOME.sinProximoServicio, 'SIN PRÓXIMO SERVICIO'); assert.equal(TEXTOS_HOME.mesSiguiente, 'Mes siguiente'); assert.equal(TEXTOS_HOME.nadieBloqueo, 'Nadie bloqueó este día')
    assert.equal(confirmadosDe(9, 14), '9 de 14 confirmados'); assert.equal(TEXTOS.reintentar, 'Reintentar') })
  await prueba('«X de N confirmados» concuerda con el total N: «0 de 1 confirmado», «1 de 1 confirmado», «0 de 0 confirmados», «3 de 5 confirmados»', async () => {
    assert.deepEqual([[0, 1], [1, 1], [0, 0], [3, 5], [1, 2], [2, 2]].map(([c, t]) => confirmadosDe(c, t)), ['0 de 1 confirmado', '1 de 1 confirmado', '0 de 0 confirmados', '3 de 5 confirmados', '1 de 2 confirmados', '2 de 2 confirmados'])
    const quienes = ['app/home/page.tsx', 'components/home/VistaHoy.tsx'].map(f => fuenteSinComentarios(f)).join('\n'); assert.ok(!/\$\{[^}]+\} de \$\{[^}]+\} confirmados|\} de \{[^}]+\} confirmados/.test(quienes), 'el texto sale de confirmadosDe, no escrito a mano') })
  await prueba('Home, HomeMovil, VistaHoy y lib/home/hoy.ts no vuelven a escribir esos textos: los leen del archivo', async () => {
    const malos = []
    for (const f of HOME) lineas(f).forEach((l, i) => {
      for (const [k, v] of [...Object.entries(TEXTOS_HOME), ['reintentar', TEXTOS.reintentar]]) {
        if (new RegExp(`(['"\`])${esc(v)}\\1|>\\s*${esc(v)}\\s*<`).test(l)) malos.push(`${f}:${i + 1}  «${v}» (${k}): ${l.trim().slice(0, 90)}`) } })
    assert.deepEqual(malos, [], malos.join('\n')) })
  await prueba('cada texto compartido de Home lo usan al menos dos archivos (si no, no tenía por qué estar compartido)', async () => {
    const usos = {}
    for (const f of [...HOME, 'components/DayBlocksPanel.tsx', 'app/home/page.tsx']) { const t = lineas(f).join('\n'); for (const k of claves) if (new RegExp(`\\b(T|TEXTOS_HOME)\\.${k}\\b`).test(t)) (usos[k] ??= new Set()).add(f) }
    const solos = claves.filter(k => !usos[k] || usos[k].size < 2)
    assert.deepEqual(solos, [], 'usados en un solo archivo: ' + solos.join(', ')) })

  console.log('avisos de «no se pudo cargar / guardar» y acceso')
  await prueba('«No se pudo cargar…», «No se pudo guardar…» y «No tienes acceso…» están en lib/textos/comun.ts y no escritos en las pantallas', async () => {
    const malos = []
    for (const f of archivosDeInterfaz().filter(x => !x.startsWith('app/api/'))) lineas(f).forEach((l, i) => {
      for (const k of ['noSePudoCargar', 'noSePudoGuardarConexion', 'noSePudoGuardar', 'sinAcceso']) if (l.includes(TEXTOS[k])) malos.push(`${f}:${i + 1}  (${k})`) })
    assert.deepEqual(malos, [], malos.join('\n')) })

  console.log('mensajes de las rutas del servidor')
  await prueba('los mensajes repetidos («No autorizado», «No se pudo guardar», «Datos no válidos»…) salen de lib/textos/mensajes.ts, no escritos en cada ruta', async () => {
    const malos = [], valores = Object.values(MSG)
    for (const f of archivosDeInterfaz().filter(x => x.startsWith('app/api/') || x.startsWith('lib/'))) lineas(f).forEach((l, i) => {
      const m = l.match(/\b(error|message|mensaje|msg)\s*:\s*(['"])((?:(?!\2).)+)\2/); if (m && valores.includes(m[3])) malos.push(`${f}:${i + 1}  «${m[3]}»`) })
    assert.deepEqual(malos, [], 'usa MSG.…:\n' + malos.join('\n')) })
  await prueba('los textos de MSG no cambiaron de contenido al moverlos (los clientes y las pruebas los leen tal cual)', async () => {
    assert.equal(MSG.noAutorizado, 'No autorizado'); assert.equal(MSG.noSePudoGuardar, 'No se pudo guardar'); assert.equal(MSG.datosNoValidos, 'Datos no válidos'); assert.equal(MSG.servicioNoDisponible, 'Servicio no disponible')
    assert.equal(new Set(Object.values(MSG)).size, Object.keys(MSG).length, 'dos claves con el mismo texto') })
  terminar()
})
