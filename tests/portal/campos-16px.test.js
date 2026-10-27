// Campos de texto en teléfono: 16 px REALES (en iOS, menos hace zoom al enfocar y esconde botones) y las hojas con campos quedan encima del teclado. La medición con navegador es tests/e2e-menus/campos.js. Correr: `node tests/portal/campos-16px.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const recorrer = (d, ext, out = []) => { for (const n of fs.readdirSync(path.join(RAIZ, d), { withFileTypes: true })) { const r = path.join(d, n.name); if (n.isDirectory()) { if (!['node_modules', '.next'].includes(n.name)) recorrer(r, ext, out) } else if (ext.some(e => n.name.endsWith(e))) out.push(r) } return out }

correr(async () => {
  await prueba('globals.css: en ≤ 768 px todo input de texto, textarea y select miden 16px con !important (cubre hojas en el body y campos con estilo en línea); no hay tope que lo anule', async () => {
    const css = sinComentarios(leer('app/globals.css')), m = css.match(/@media \(max-width:768px\)\{\s*(input:not[^{]*textarea, select)\{ font-size:16px !important; \}\s*\}/)
    assert.ok(m, 'falta la regla global de 16px'); for (const t of ['checkbox', 'radio', 'range', 'file', 'color', 'hidden', 'button', 'submit', 'reset', 'image']) assert.ok(m[1].includes(`:not([type=${t}])`), 'excluye ' + t)
    assert.ok(/(^|,)\s*textarea\s*,\s*select$/.test(m[1].trim()), 'incluye textarea y select') })
  await prueba('no se desactiva el zoom del usuario: ni maximum-scale ni user-scalable en ningún viewport', async () => {
    for (const f of recorrer('app', ['.tsx', '.ts']).concat(recorrer('components', ['.tsx'])).concat(recorrer('lib', ['.ts']))) { const t = sinComentarios(leer(f)); assert.ok(!/maximum-scale|maximumScale|user-scalable|userScalable/.test(t), f + ' no debe limitar el zoom') } })
  await prueba('ajusteDeTeclado: con teclado abierto sube la hoja lo que tapa y limita el alto; sin teclado, con la barra de Safari que se esconde o con zoom de dedos no hace nada', async () => {
    const { ajusteDeTeclado, UMBRAL_TECLADO, RESPIRO } = require(resolver(path.join(RAIZ, 'lib/tecladoHoja')))
    assert.deepEqual(ajusteDeTeclado({ innerHeight: 844, alto: 500, arriba: 0, escala: 1 }), { tapado: 344, altoVisible: 500 - RESPIRO }); assert.deepEqual(ajusteDeTeclado({ innerHeight: 844, alto: 450, arriba: 40, escala: 1 }), { tapado: 354, altoVisible: 450 - RESPIRO }, 'con la página desplazada (offsetTop) se descuenta')
    assert.equal(ajusteDeTeclado({ innerHeight: 844, alto: 844, arriba: 0, escala: 1 }), null, 'sin teclado'); assert.equal(ajusteDeTeclado({ innerHeight: 844, alto: 844 - UMBRAL_TECLADO, arriba: 0, escala: 1 }), null, 'la barra de Safari no es teclado'); assert.equal(ajusteDeTeclado({ innerHeight: 844, alto: 500, arriba: 0, escala: 2 }), null, 'zoom de dedos')
    assert.equal(ajusteDeTeclado({ innerHeight: 844, alto: 500, arriba: 0, escala: 1.005 }).tapado, 344) })
  await prueba('las hojas con campos usan useTecladoHoja: HojaBase (admin), la hoja de Disponibilidad (portal) y «Agregar persona»', async () => {
    for (const [f, re] of [['components/admin-movil/HojaBase.tsx', /useTecladoHoja\(ref\)/], ['app/portal/_components/disponibilidad/Disponibilidad.tsx', /useTecladoHoja\(hojaRef, !!selectedDay \|\| showRange\)/], ['components/AddPersonDialog.tsx', /useTecladoHoja\(scrimRef\)/]]) assert.ok(re.test(sinComentarios(leer(f))), f)
    const h = sinComentarios(leer('components/useTecladoHoja.ts')); assert.ok(/visualViewport/.test(h) && /addEventListener\('resize'/.test(h) && /removeEventListener\('resize'/.test(h), 'sigue y suelta el visualViewport')
    assert.ok(/max-height:min\(92dvh, var\(--alto-visible, 92dvh\)\)/.test(leer('components/add-person-dialog.module.css'))) })
  await prueba('la auditoría con navegador existe: campos.js y sus escenarios (admin, portal y la hoja del Orden)', async () => {
    assert.ok(fs.existsSync(path.join(RAIZ, 'tests/e2e-menus/campos.js'))); for (const f of ['campos-admin', 'campos-portal', 'campos-orden']) assert.ok(JSON.parse(leer(`tests/e2e-menus/escenarios/${f}.json`)).length > 0, f)
    assert.ok(/Auditoría de campos/.test(leer('tests/e2e-menus/LEEME.md'))) })
  terminar()
})
