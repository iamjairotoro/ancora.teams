// «Cambiar» entre dos equipos (punto 4, commit 4): la ruta y su mapeo de los 11 resultados de `cambiar_convocatoria` (migración 038), y cuándo aparece el botón.
// Correr: `node tests/portal/cambiar-convocatoria.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const D = real('lib/portal/doble'), T = real('lib/textos/doble').TEXTOS_DOBLE, { ejecutarCambioConvocatoria: cambiar } = real('lib/portal/conflicto')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const U1 = '11111111-1111-4111-8111-111111111111', U2 = '22222222-2222-4222-8222-222222222222', ME = '33333333-3333-4333-8333-333333333333'
const RESULTADOS = ['ok', 'misma', 'no_existe', 'no_enviada', 'sin_equipo', 'cerrada', 'desde_no_confirmada', 'hacia_no_declinada_por_conflicto', 'hacia_no_declinada_por_desde', 'no_chocan', 'sin_posiciones']
const admin = respuesta => { const llamadas = []; return { llamadas, rpc: async (f, a) => { llamadas.push({ f, a }); return respuesta } } }

correr(async () => {
  console.log('la ruta')
  await prueba('manda a la base la persona de la sesión y los dos ids; nunca otra persona', async () => {
    const a = admin({ data: { resultado: 'ok', desplazadas: [] }, error: null }); const r = await cambiar(a, ME, U1, U2)
    assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.deepEqual(a.llamadas, [{ f: 'cambiar_convocatoria', a: { p_member_id: ME, p_desde_id: U1, p_hacia_id: U2 } }]) })
  await prueba('ids que no son uuid, o ausentes → 400 sin llamar a la base', async () => {
    for (const [d, h] of [[undefined, U2], [U1, null], ['x', U2], [U1, "1' or '1'='1"], [{}, U2]]) { const a = admin({ data: {}, error: null }); assert.equal((await cambiar(a, ME, d, h)).status, 400); assert.equal(a.llamadas.length, 0) } })
  await prueba('los 11 resultados están mapeados: ok → 200; los otros 10, con su código y un texto en tuteo (sin «usted» ni tecnicismos)', async () => {
    assert.deepEqual(Object.keys(T.cambiarResultado).sort(), RESULTADOS.filter(x => x !== 'ok').sort())
    const esperado = { misma: 400, no_existe: 404, no_enviada: 403, sin_equipo: 400, cerrada: 410, desde_no_confirmada: 409, hacia_no_declinada_por_conflicto: 409, hacia_no_declinada_por_desde: 409, no_chocan: 409, sin_posiciones: 409 }
    for (const k of RESULTADOS.filter(x => x !== 'ok')) { const r = await cambiar(admin({ data: { resultado: k }, error: null }), ME, U1, U2); assert.equal(r.status, esperado[k], k); assert.ok(typeof r.body.error === 'string' && r.body.error.length > 8, k); assert.ok(!/\busted\b|rpc|postgres|exception/i.test(r.body.error), k) }
    assert.equal((await cambiar(admin({ data: { resultado: 'cerrada' }, error: null }), ME, U1, U2)).body.codigo, 'cerrada', 'el cliente cierra la hoja y recarga con el 410') })
  await prueba('si la base lanza una excepción (se deshace todo), devuelve un error o un resultado raro → 500 genérico, sin filtrar el mensaje de la base', async () => {
    const msg = real('lib/textos/mensajes').MSG.noSePudoCompletarLaAccion
    for (const resp of [{ data: null, error: { message: 'cambiar_convocatoria: estado final inesperado (desde=confirmado…)' } }, { data: null, error: null }, { data: 'x', error: null }, { data: { resultado: 'inventado' }, error: null }, { data: { resultado: 'constructor' }, error: null }, { data: {}, error: null }]) {
      const r = await cambiar(admin(resp), ME, U1, U2); assert.equal(r.status, 500); assert.equal(r.body.error, msg); assert.ok(!/estado final|desde=/.test(JSON.stringify(r.body))) } })
  await prueba('la ruta resuelve la persona con requirePortalIdentity y no lee ningún member de la petición', async () => {
    const r = leer('app/api/portal/cambiar-convocatoria/route.ts')
    assert.ok(/requirePortalIdentity\(req, \{ invitation: true \}\)/.test(r)); assert.ok(/auth\.identity\.memberId, b\?\.desde, b\?\.hacia/.test(r)); assert.ok(!/b\?\.member|memberId:\s*b/.test(r)) })

  console.log('cuándo aparece «Cambiar»')
  const S1 = { id: 's1', fecha: '2026-11-01', hora_inicio: '10:00:00', hora_fin: '14:00:00', tipo: 'servicio' }
  const e = (id, team, status, pos = ['X'], extra = {}, inv = {}) => ({ service: S1, team: { id: team, name: team }, posiciones: pos, cerrada: false, reemplazadaPor: null, invitation: { id, status, sent_at: '2026-10-01', declined_reason: null, ...inv }, ...extra })
  const apagada = (extra = {}) => e('p', 'tP', 'declinado', ['Sonido'], { reemplazadaPor: { id: 'tA' }, ...extra }, { declined_reason: 'conflict' })
  await prueba('en la declinada por el cruce, con la otra confirmada: sí, y deja la confirmada; con una cerrada, sin posiciones, rechazada por la persona o sin confirmada: no', async () => {
    const A = e('a', 'tA', 'confirmado'), P = apagada()
    assert.equal(D.aCambiarDesde(P, [A, P]).invitation.id, 'a'); assert.equal(D.aCambiarDesde(apagada({ cerrada: true }), [A, apagada({ cerrada: true })]), null); assert.equal(D.aCambiarDesde(apagada({ posiciones: [] }), [A, apagada({ posiciones: [] })]), null, 'sin posiciones: la base diría sin_posiciones')
    const R = e('p', 'tP', 'declinado', ['Sonido']); assert.equal(D.aCambiarDesde(R, [A, R]), null, 'la que rechazó la persona se confirma con «Confirmo»'); assert.equal(D.aCambiarDesde(P, [P]), null, 'sin otra confirmada'); assert.equal(D.aCambiarDesde(A, [A, P]), null, 'la confirmada no se cambia a sí misma')
    assert.equal(D.aCambiarDesde(P, [e('a', 'tA', 'confirmado', ['X'], { cerrada: true }), P]), null, 'la confirmada ya cerró')
    const A2 = e('a2', 'tM', 'confirmado'); assert.equal(D.aCambiarDesde(P, [A2, A, P]).invitation.id, 'a', 'si hay varias, la que la declinó') })
  await prueba('textos de la ventana en tuteo, y el cableado: ruta, hoja centrada, solo la apagada lleva el botón y el escritorio no cambia', async () => {
    assert.equal(T.cambiarTitulo('Producción'), '¿Cambiar a Producción?'); assert.equal(T.cambiarTexto('Alabanza', 'Producción'), 'Confirmas tu lugar en Producción y se declina tu convocatoria en Alabanza. Podrás volver a cambiar después.')
    const u = leer('app/portal/_components/convocatorias/useConvocatorias.ts'), h = leer('app/portal/_components/convocatorias/HojaDeConvocatoria.tsx'), d = leer('app/portal/_components/servicio/ConvocatoriasDoble.tsx'), a = leer('app/portal/_components/convocatorias/AccionesConvocatoria.tsx')
    assert.ok(/'\/api\/portal\/cambiar-convocatoria'/.test(u) && /desde: h\.desdeId, hacia: id/.test(u)); assert.ok(/h\?\.tipo === 'cambiar'/.test(h) && /TD\.cambiarTexto\(h\.deja/.test(h)); assert.ok(/aCambiarDesde\(e, entradas\) && /.test(d) && /c\.pedirCambiar\(e\)/.test(d))
    assert.ok(!/pedirCambiar/.test(a), 'el escritorio no usa «Cambiar»') })
  terminar()
})
