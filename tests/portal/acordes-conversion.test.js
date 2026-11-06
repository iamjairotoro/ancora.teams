// Etapa B: el script de conversión a grados. Simula por defecto, no escribe sin --aplicar, respalda antes de escribir, no pisa filas cambiadas y se salta lo que no debe tocar. Sin base ni red (cliente falso).
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs'), os = require('os')
const RAIZ = path.resolve(__dirname, '..', '..'), S = require(path.join(RAIZ, 'scripts/acordes/convertir-a-grados.js'))
const A = S.cargarLib()
let n = 0; const t = async (m, f) => { await f(); n++; console.log('  ok', m) }
const L = (...seg) => ({ kind: 'lyric', segments: seg.map(([chord, text]) => (chord ? { chord, text } : { text })) })
const fila = (id, extra = {}) => ({ variante_id: id, cancion_id: 'c' + id, nombre: 'Canción ' + id, tono_original: 'E', formato: 1, lines: [L([null, 'Cuando '], ['C#m', 'veo']), { kind: 'bars', bars: 'C#m / B/D# / | E ||' }], ...extra })
const FILAS = () => [fila('v1'), fila('v2', { formato: 2, lines: [] }), fila('v3', { tono_original: null }), fila('v4', { lines: [L([null, 'Solo letra'])] }), fila('v5', { lines: [L(['N.C.', 'Silencio'], ['E', 'x'])] }), fila('v6', { lines: 'no es lista' }), fila('v7', { tono_original: 'C#m' }), fila('v8', { lines: [L(['Gb', 'a'])], tono_original: 'C' })]
function clienteFalso(filas, { fallaEn } = {}) {
  const c = { escrituras: [], orden: [] }
  c.from = tabla => { const q = { tabla, f: {} }; q.update = v => { q.v = v; return q }; q.eq = (k, v) => { q.f[k] = v; return q }
    q.select = async () => { const fila = filas.find(x => x.variante_id === q.f.id), ok = fila && fila.formato === q.f.formato && fallaEn !== q.f.id; c.orden.push('escribe ' + q.f.id); if (ok) { fila.formato = 2; fila.lines = q.v.lines; c.escrituras.push(q.f.id) } return { data: ok ? [{ id: q.f.id }] : [], error: null } }
    return q }
  return c
}
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'acordes-')), 'respaldo.json')

;(async () => {
  console.log('simulación: decide sin escribir')
  await t('clasifica cada variante: convertir, ya en grados, sin tono, sin acordes, a revisar y lines inválido', () => {
    const { items, resumen } = S.planificar(FILAS(), A), acc = Object.fromEntries(items.map(i => [i.varianteId, i.accion]))
    assert.deepEqual(acc, { v1: 'convertir', v2: 'ya_en_grados', v3: 'sin_tono', v4: 'sin_acordes', v5: 'revisar', v6: 'lines_no_valido', v7: 'convertir', v8: 'convertir' })
    assert.deepEqual(resumen, { convertir: 3, ya_en_grados: 1, sin_tono: 1, sin_acordes: 1, revisar: 1, lines_no_valido: 1 })
    assert.deepEqual(items.find(i => i.varianteId === 'v5').noConvertidos, ['N.C.']) })
  await t('avisa cuando la escritura cambia aunque suene igual (Gb en C vuelve como F#), y no inventa avisos en lo demás', () => {
    const { items } = S.planificar(FILAS(), A); assert.deepEqual(items.find(i => i.varianteId === 'v8').ortografia, ['Gb → F#']); assert.deepEqual(items.find(i => i.varianteId === 'v1').ortografia, []) })
  await t('simular no toca los datos de entrada', () => { const f = FILAS(), antes = JSON.stringify(f); S.planificar(f, A); assert.equal(JSON.stringify(f), antes) })

  console.log('línea de comandos: sin --aplicar no escribe, y --aplicar tiene sus condiciones')
  await t('con --archivo solo simula, escribe el informe pedido y nunca crea un cliente', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acordes-')), a = path.join(dir, 'v.json'), inf = path.join(dir, 'inf.json'); fs.writeFileSync(a, JSON.stringify([{ variantes: FILAS() }]))
    const log = console.log, salida = []; console.log = (...x) => salida.push(x.join(' ')); let cod; try { cod = await S.main(['--archivo', a, '--informe', inf], {}) } finally { console.log = log }
    assert.equal(cod, 0); assert.ok(salida.join('\n').includes('Solo simulación: no se escribió nada')); const r = JSON.parse(fs.readFileSync(inf, 'utf8')); assert.equal(r.length, 8); assert.ok(r.every(x => !('nueva' in x) && !('original' in x))) })
  await t('--aplicar sin --supabase, sin credenciales o sin --esperar se rechaza antes de escribir', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acordes-')), a = path.join(dir, 'v.json'); fs.writeFileSync(a, JSON.stringify(FILAS())); const log = console.log; console.log = () => {}
    try { await assert.rejects(S.main(['--archivo', a, '--aplicar'], {}), /exige --supabase/); await assert.rejects(S.main(['--supabase', '--aplicar'], {}), /Faltan NEXT_PUBLIC_SUPABASE_URL/) } finally { console.log = log }
    await assert.rejects(S.aplicar({ cliente: clienteFalso(FILAS()), filas: FILAS(), A, esperar: undefined, rutaRespaldo: tmp() }), /--esperar/) })

  console.log('aplicar: respaldo primero, compara y fija, se detiene al fallar')
  await t('convierte solo lo convertible, deja el respaldo con las líneas originales ANTES de la primera escritura y las demás filas no se tocan', async () => {
    const filas = FILAS(), originales = JSON.parse(JSON.stringify(filas)), c = clienteFalso(filas), ruta = tmp(); let existiaAlEscribir = null
    const from = c.from; c.from = tabla => { const q = from(tabla), sel = q.select; q.select = async () => { if (existiaAlEscribir === null) existiaAlEscribir = fs.existsSync(ruta) && JSON.parse(fs.readFileSync(ruta, 'utf8')).length; return sel() }; return q }
    const r = await S.aplicar({ cliente: c, filas, A, esperar: 3, rutaRespaldo: ruta })
    assert.deepEqual(r, { hechas: ['v1', 'v7', 'v8'], falloEn: null }); assert.equal(existiaAlEscribir, 3, 'el respaldo ya estaba escrito con las 3 variantes')
    const resp = JSON.parse(fs.readFileSync(ruta, 'utf8')); assert.deepEqual(resp.map(x => x.variante_id), ['v1', 'v7', 'v8']); assert.deepEqual(resp[0].lines, originales[0].lines); assert.ok(resp.every(x => x.formato === 1))
    for (const id of ['v2', 'v3', 'v4', 'v5', 'v6']) assert.deepEqual(filas.find(f => f.variante_id === id), originales.find(f => f.variante_id === id), id + ' no se toca')
    assert.equal(filas.find(f => f.variante_id === 'v1').formato, 2); assert.ok(!JSON.stringify(filas[0].lines).includes('"chord"')) })
  await t('--esperar distinto de lo que se convertiría: no escribe ni crea respaldo', async () => {
    const c = clienteFalso(FILAS()), ruta = tmp(); await assert.rejects(S.aplicar({ cliente: c, filas: FILAS(), A, esperar: 4, rutaRespaldo: ruta }), /Se esperaban 4/); assert.equal(c.escrituras.length, 0); assert.ok(!fs.existsSync(ruta)) })
  await t('si una fila ya no está en formato 1 (la tocó alguien), no se pisa y se detiene ahí con el motivo', async () => {
    const filas = FILAS(), c = clienteFalso(filas, { fallaEn: 'v7' }), r = await S.aplicar({ cliente: c, filas: FILAS(), A, esperar: 3, rutaRespaldo: tmp() })
    assert.equal(r.falloEn, 'v7'); assert.deepEqual(r.hechas, ['v1']); assert.deepEqual(c.escrituras, ['v1']); assert.match(r.motivo, /formato 1/) })
  await t('un solo UPDATE por variante, con id y formato=1, nunca un update masivo ni sobre otra tabla', async () => {
    const llamadas = []; const c = { from: tabla => { const q = { f: {} }; q.update = v => { q.v = v; return q }; q.eq = (k, v) => { q.f[k] = v; return q }; q.select = async () => { llamadas.push({ tabla, claves: Object.keys(q.f).sort(), cols: Object.keys(q.v).sort() }); return { data: [{ id: q.f.id }], error: null } }; return q } }
    await S.aplicar({ cliente: c, filas: FILAS(), A, esperar: 3, rutaRespaldo: tmp() }); assert.equal(llamadas.length, 3); for (const l of llamadas) { assert.equal(l.tabla, 'song_section_variants'); assert.deepEqual(l.claves, ['formato', 'id']); assert.deepEqual(l.cols, ['formato', 'lines']) } })

  console.log('el script no trae nada que escriba por su cuenta')
  await t('el único camino que escribe es aplicar(), y la línea de comandos lo llama solo tras --aplicar', () => {
    const src = fs.readFileSync(path.join(RAIZ, 'scripts/acordes/convertir-a-grados.js'), 'utf8')
    assert.equal((src.match(/\.update\(/g) || []).length, 1); assert.equal((src.match(/\.insert\(|\.delete\(|\.upsert\(|\.rpc\(/g) || []).length, 0)
    assert.ok(src.indexOf("if (!tiene('--aplicar'))") < src.indexOf('await aplicar(')) })
  console.log(`\n${n} comprobaciones OK`)
})().catch(e => { console.error(e); process.exit(1) })
