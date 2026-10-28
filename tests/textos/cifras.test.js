// Etiquetas de las tarjetas de cifras del Home admin (teléfono): mayúscula solo en la primera letra, sin voseo. Correr: `node tests/textos/cifras.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const T = require(resolver(path.join(RAIZ, 'lib/textos/homeNuevo'))).TEXTOS_HOME_NUEVO
correr(async () => {
  await prueba('«Equipos», «Voluntarios citados» y «Con la app»: solo la primera letra en mayúscula', async () => {
    assert.equal(T.equipos, 'Equipos'); assert.equal(T.voluntariosCitados, 'Voluntarios citados'); assert.equal(T.conLaApp, 'Con la app')
    for (const k of ['equipos', 'voluntariosCitados', 'conLaApp']) assert.ok(/^[A-ZÁÉÍÓÚ][^A-ZÁÉÍÓÚ]*$/.test(T[k]), k + ': «' + T[k] + '» tiene otra mayúscula') })
  await prueba('las tres etiquetas salen de TEXTOS_HOME_NUEVO (nada escrito a mano en la tarjeta) y no queda «Voluntarios Citados» en el código', async () => {
    const h = fs.readFileSync(path.join(RAIZ, 'components/home/HomeAdminMovil.tsx'), 'utf8'); assert.ok(/\{T\.equipos\}/.test(h) && /\{T\.voluntariosCitados\}/.test(h) && /\{T\.conLaApp\}/.test(h))
    for (const f of ['components/home/HomeAdminMovil.tsx', 'lib/home/cifrasAdmin.ts', 'lib/textos/homeNuevo.ts']) assert.ok(!/Voluntarios Citados/.test(fs.readFileSync(path.join(RAIZ, f), 'utf8')), f) })
  terminar()
})
