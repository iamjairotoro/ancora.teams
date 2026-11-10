// Etapa C1: /api/portal/preferencias guarda la lectura de acordes (notación, vista, compacta) con una lista FIJA de claves y valores, dentro de chart_prefs.lectura, sin romper las claves de siempre (fuente, tamaño…).
const { assert, db, ID, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path')
const real = n => require(resolver(path.join(RAIZ, n)))
stubs['@/lib/auth/requirePortalIdentity'] = { requirePortalIdentity: async () => estado.sinSesion ? { ok: false, response: { status: 401, body: { error: 'No autorizado' } } } : ({ ok: true, identity: { memberId: ID.ME, via: 'google' } }), portalJson: (b, status = 200) => ({ status, body: JSON.parse(JSON.stringify(b)) }) }
const { GET, PATCH } = real('app/api/portal/preferencias/route'), { FONT_OPTIONS, SIZE_STEPS } = real('lib/lyricPrefs')
const patch = cuerpo => PATCH({ json: async () => cuerpo, headers: { get: () => null } })
const yo = () => db.members.find(m => m.id === ID.ME), otro = () => db.members.find(m => m.id === ID.O1)
const preparar = () => { mundo(); estado.sinSesion = false; estado.escrituras.length = 0 }

correr(async () => {
  await prueba('guarda notación, vista y compacta; mezcla DENTRO de lectura y no pisa fuente, tamaño ni lo viejo (view, notation del modo abandonado)', async () => {
    preparar(); yo().chart_prefs = { view: 'chords', notation: 'latin', textScale: 1.375, fontFamily: FONT_OPTIONS[1].f }
    for (const lectura of [{ notation: 'numeros' }, { vista: 'acordes' }, { compacta: true }, { vista: 'letras', notation: 'americano' }]) { const r = await patch({ lectura }); assert.equal(r.status, 200, JSON.stringify(lectura)) }
    assert.deepEqual(yo().chart_prefs, { view: 'chords', notation: 'latin', textScale: 1.375, fontFamily: FONT_OPTIONS[1].f, lectura: { notation: 'americano', vista: 'letras', compacta: true } })
    const g = await GET({ headers: { get: () => null } }); assert.deepEqual(g.body.lectura, { notation: 'americano', vista: 'letras', compacta: true }); assert.equal(g.body.letra.textScale, 1.375) })
  await prueba('las claves de siempre siguen funcionando después de guardar la lectura (fuente y tamaño; {chart}) y no borran la lectura', async () => {
    preparar(); await patch({ lectura: { notation: 'numeros', compacta: true } })
    assert.equal((await patch({ letra: { fontFamily: FONT_OPTIONS[2].f } })).status, 200); assert.equal((await patch({ letra: { textScale: SIZE_STEPS[0] } })).status, 200); assert.equal((await patch({ chart: { stageMode: true } })).status, 200)
    assert.equal(yo().chart_prefs.fontFamily, FONT_OPTIONS[2].f); assert.equal(yo().chart_prefs.textScale, SIZE_STEPS[0]); assert.equal(yo().chart_prefs.stageMode, true)
    assert.deepEqual(yo().chart_prefs.lectura, { notation: 'numeros', compacta: true }) })
  await prueba('sin nada guardado, GET devuelve los valores por defecto; lo raro que haya en la base vuelve al valor por defecto', async () => {
    preparar(); yo().chart_prefs = null; assert.deepEqual((await GET({ headers: { get: () => null } })).body.lectura, { notation: 'americano', vista: 'ambos', compacta: false })
    yo().chart_prefs = { lectura: { notation: 'latin', vista: 'both', compacta: 'si' } }; assert.deepEqual((await GET({ headers: { get: () => null } })).body.lectura, { notation: 'americano', vista: 'ambos', compacta: false })
    yo().chart_prefs = { lectura: 'x' }; assert.deepEqual((await GET({ headers: { get: () => null } })).body.lectura, { notation: 'americano', vista: 'ambos', compacta: false }) })
  await prueba('PRUEBA DE RECHAZO: llave de más, valor fuera de la lista, tipo equivocado o cuerpo vacío → 400 y NADA escrito', async () => {
    preparar(); const antes = JSON.stringify(db.members)
    for (const lectura of [{ notation: 'latin' }, { notation: 'american' }, { notation: 'number' }, { notation: 'romano' }, { notation: 'Americano' }, { notation: '' }, { notation: null }, { notation: 1 },
      { vista: 'both' }, { vista: 'chords' }, { vista: 'Ambos' }, { vista: '' }, { compacta: 'si' }, { compacta: 1 }, { compacta: null },
      { fontFamily: FONT_OPTIONS[0].f }, { organization_id: ID.ORG2 }, { notation: 'numeros', id: ID.O1 }, { view: 'lyrics' }, { stageMode: true }, {}, null, 'x', 5, [], [{ notation: 'numeros' }]]) {
      const r = await patch({ lectura }); assert.equal(r.status, 400, JSON.stringify(lectura)) }
    assert.equal(estado.escrituras.length, 0); assert.equal(JSON.stringify(db.members), antes) })
  await prueba('las claves nuevas NO se cuelan por las otras ramas ({letra}, {chart}) y solo cambia la fila de quien está autenticado', async () => {
    preparar(); const antes = JSON.stringify(db.members)
    for (const cuerpo of [{ letra: { notation: 'numeros' } }, { letra: { vista: 'acordes' } }, { chart: { notation: 'numeros' } }, { chart: { compacta: true } }, { chart: { lectura: { notation: 'numeros' } } }]) assert.equal((await patch(cuerpo)).status, 400, JSON.stringify(cuerpo))
    assert.equal(JSON.stringify(db.members), antes)
    const antesOtro = JSON.stringify(otro()); await patch({ lectura: { vista: 'acordes' }, id: ID.O1, memberId: ID.O1 })
    assert.equal(yo().chart_prefs.lectura.vista, 'acordes'); assert.equal(JSON.stringify(otro()), antesOtro)
    estado.escrituras.length = 0; estado.sinSesion = true; assert.equal((await patch({ lectura: { vista: 'letras' } })).status, 401); assert.equal(estado.escrituras.length, 0) })
  terminar()
})
