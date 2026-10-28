// Menú inferior del teléfono: pestaña activa optimista (la lente no se devuelve mientras la ruta cambia). Correr: `node tests/portal/menu-optimista.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const M = require(resolver(path.join(RAIZ, 'lib/portal/menuOptimista')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

correr(async () => {
  await prueba('la pestaña tocada pasa a ser la activa de inmediato (solo teléfono) y la real manda cuando no hay pendiente', async () => {
    assert.equal(M.pendienteAlElegir('personas', 'home', true), 'home'); assert.equal(M.activoVisible('personas', 'home', true), 'home', 'la lente va a la tocada aunque la real siga siendo la vieja')
    assert.equal(M.activoVisible('personas', null, true), 'personas'); assert.equal(M.pendienteAlElegir('personas', 'personas', true), null, 'tocar la que ya es la real no deja pendiente (y quita una anterior)')
    assert.equal(M.pendienteAlElegir('personas', 'home', false), null, 'escritorio: nada'); assert.equal(M.activoVisible('personas', 'home', false), 'personas', 'escritorio: siempre la real') })
  await prueba('espera acotada: pasados 3 s sin confirmación la lente vuelve a la real; PENDIENTE_MS es 3000', async () => { assert.equal(M.PENDIENTE_MS, 3000) })
  await prueba('PortalNav: la lente y la copia ampliada siguen a la pestaña visible; el toque pasa por elegir() (pendiente + onSelect); se quitó el retroceso de 60 ms; aria-current sigue siendo el de la ruta real', async () => {
    const s = leer('app/portal/_components/PortalNav.tsx')
    assert.ok(/const visible = activoVisible\(active, pendiente, telefono\)/.test(s)); assert.ok(/itemRefs\.current\.get\(visible\)/.test(s)); assert.ok(/lastLente\.current !== visible/.test(s) && /\[visible, items\.length, telefono\]/.test(s))
    assert.ok(/onClick=\{\(\) => elegir\(it\.key\)\}/.test(s) && /else elegir\(k\)/.test(s), 'clic y arrastre pasan por elegir')
    assert.ok(/useEffect\(\(\) => \{ limpiarTemporizador\(\); setPendiente\(null\) \}, \[active\]\)/.test(s), 'cuando la real cambia, manda la real'); assert.ok(/setTimeout\(\(\) => \{ temporizador\.current = null; setPendiente\(null\) \}, PENDIENTE_MS\)/.test(s))
    assert.ok(!/lenteRefFn\.current\(true\), 60\)/.test(s), 'ya no hay retroceso de 60 ms a la pestaña real'); assert.ok(/const on = it\.key === active/.test(s) && /aria-current=\{on \? 'page' : undefined\}/.test(s))
    assert.ok(/ui\.copia\}\$\{it\.key === visible/.test(s)) })
  await prueba('el escritorio no usa la pestaña pendiente: su indicador se mide con la real y activoVisible devuelve la real fuera del teléfono', async () => {
    const s = leer('app/portal/_components/PortalNav.tsx'); assert.ok(/const it = itemRefs\.current\.get\(active\)/.test(s), 'measure() (escritorio) sigue con la real'); assert.ok(/telefono \? null : measure\(\)/.test(s)) })
  terminar()
})
