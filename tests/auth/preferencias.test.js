// Paso 0a del punto 50, commit 7: /api/portal/preferencias también guarda el tema y las preferencias de lectura (`chart`) de /admin y /home.
// Comprueba: solo las llaves de la lista y con valores válidos; solo la fila de quien está autenticado; no pisa lo demás de chart_prefs; las llaves se sacan del código real de CancionesPanel.
const { assert, db, ID, mundo, estado, prueba, terminar, correr, stubs, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
stubs['@/lib/auth/requirePortalIdentity'] = { requirePortalIdentity: async () => estado.sinSesion ? { ok: false, response: { status: 401, body: { error: 'No autorizado' } } } : ({ ok: true, identity: { memberId: ID.ME, via: 'google' } }), portalJson: (b, status = 200) => ({ status, body: JSON.parse(JSON.stringify(b)) }) }
const { GET, PATCH } = real('app/api/portal/preferencias/route'), { CLAVES_CHART_EDITABLES, FONT_OPTIONS, SIZE_STEPS } = real('lib/lyricPrefs')
const patch = cuerpo => PATCH({ json: async () => cuerpo, headers: { get: () => null } })
const yo = () => db.members.find(m => m.id === ID.ME), otro = () => db.members.find(m => m.id === ID.O1)
const preparar = () => { mundo(); estado.sinSesion = false; estado.escrituras.length = 0 }

correr(async () => {
  await prueba('las llaves que guarda CancionesPanel (sacadas de su código) están TODAS en la lista blanca', async () => {
    const fuente = fs.readFileSync(path.join(RAIZ, 'components/canciones/CancionesPanel.tsx'), 'utf8')
    const usadas = new Set([...fuente.matchAll(/updatePrefs\(\{\s*(\w+)\s*:/g)].map(m => m[1])); assert.deepEqual([...usadas].sort(), ['fontFamily', 'lineHeightWide', 'stageMode', 'textScale'])
    for (const k of usadas) assert.ok(CLAVES_CHART_EDITABLES.includes(k), k)
    assert.ok(!/from\('members'\)\.(update|select)\([^)]*\)[^\n]*chart_prefs|chart_prefs[^\n]*from\('members'\)/.test(fuente) && !/supabase\.from\('members'\)/.test(fuente), 'CancionesPanel ya no toca members con la llave pública')
    const tema = fs.readFileSync(path.join(RAIZ, 'lib/useDarkMode.ts'), 'utf8'); assert.ok(!/supabase\.from\('members'\)/.test(tema), 'useDarkMode ya no toca members con la llave pública') })
  await prueba('los cuerpos reales ({chart:{fontFamily}}, {textScale}, {lineHeightWide}, {stageMode}) guardan, mezclan con lo que ya había y devuelven los valores válidos', async () => {
    preparar(); yo().chart_prefs = { view: 'chords', notation: 'latin', textScale: 1.375 }
    for (const chart of [{ fontFamily: FONT_OPTIONS[1].f }, { textScale: SIZE_STEPS[0] }, { lineHeightWide: true }, { stageMode: true }, { stageMode: false }]) { const r = await patch({ chart }); assert.equal(r.status, 200, JSON.stringify(chart) + JSON.stringify(r.body)) }
    assert.deepEqual(yo().chart_prefs, { view: 'chords', notation: 'latin', textScale: SIZE_STEPS[0], fontFamily: FONT_OPTIONS[1].f, lineHeightWide: true, stageMode: false }, 'lo que no se tocó (view, notation) sigue igual')
    const g = await GET({ headers: { get: () => null } }); assert.deepEqual(g.body.chart, { fontFamily: FONT_OPTIONS[1].f, textScale: SIZE_STEPS[0], lineHeightWide: true, stageMode: false }) })
  await prueba('llaves de más o valores raros → 400 y NADA escrito (organization_id, nombre, view, notation, fuente desconocida, tamaño fuera de la lista, tipos equivocados)', async () => {
    preparar(); const antes = JSON.stringify(db.members)
    for (const chart of [{ organization_id: ID.ORG2 }, { nombre: 'X' }, { email: 'a@b.c' }, { view: 'lyrics' }, { notation: 'latin' }, { twoColumns: true }, { stageMode: true, id: ID.O1 }, { fontFamily: 'Comic Sans' }, { fontFamily: 5 }, { textScale: 9 }, { textScale: '1' }, { lineHeightWide: 'si' }, { stageMode: 1 },
      {}, null, 'x', [], [{ stageMode: true }]]) { const r = await patch({ chart }); assert.equal(r.status, 400, JSON.stringify(chart)) }
    assert.equal(estado.escrituras.length, 0); assert.equal(JSON.stringify(db.members), antes) })
  await prueba('solo cambia la fila de quien está autenticado (no la de otra persona, aunque el cuerpo traiga su id)', async () => {
    preparar(); const antesOtro = JSON.stringify(otro()); await patch({ chart: { stageMode: true }, id: ID.O1, memberId: ID.O1 }); await patch({ theme: 'dark', id: ID.O1 })
    assert.equal(yo().chart_prefs.stageMode, true); assert.equal(yo().theme, 'dark'); assert.equal(JSON.stringify(otro()), antesOtro)
    assert.ok(estado.escrituras.filter(e => e.tabla === 'members' && e.op === 'update').every(e => e.filas.length === 1 && e.filas[0] === ID.ME)) })
  await prueba('el tema sigue funcionando (light, dark, null = Sistema; otro valor → 400) y sin sesión → 401 sin escribir', async () => {
    preparar(); for (const t of ['light', 'dark', null]) { assert.equal((await patch({ theme: t })).status, 200); assert.equal(yo().theme, t) }
    for (const t of ['rojo', 5, undefined]) assert.equal((await patch({ theme: t })).status, 400, String(t))
    estado.escrituras.length = 0; estado.sinSesion = true; assert.equal((await patch({ chart: { stageMode: true } })).status, 401); assert.equal((await patch({ theme: 'dark' })).status, 401); assert.equal(estado.escrituras.length, 0) })
  terminar()
})
