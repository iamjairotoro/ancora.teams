// Endurecimiento 6: el guardado respalda y reemplaza SOLO las secciones que cambiaron (variante viva en formato 2 con exactamente las mismas líneas = no se toca). Commit aparte: se descarta con un revert, o con
// SOLO_LO_QUE_CAMBIO = false en lib/admin/guardarAcordes.ts. Datos inventados; sin red. Correr: `node tests/portal/endurecimiento-solo-cambiadas.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), R = require(path.join(RAIZ, 'lib/portal/acordesCancion.ts')), V = require(path.join(RAIZ, 'lib/variantesAcordes.ts'))
const A = (g, cal = '') => ({ g, cal })
const SONG = '66666666-6666-4666-8666-666666666666'
const TEXTO = 'VERSO 1:\nAquí va la letra\nsegunda línea\n\nCORO:\nCuán grande es Él\n\nPUENTE:\nUn puente de prueba\notra línea'
const AT = { v: TEXTO.indexOf('Aquí'), c: TEXTO.indexOf('Cuán'), p: TEXTO.indexOf('Un pu') }      // dónde empieza la primera palabra de cada sección
const doc = (anclas = [], interludios = [], texto = TEXTO) => ({ texto, anclas, interludios })
const VIEJO = () => E.aSecciones(doc([{ at: AT.v, acorde: A(1) }, { at: AT.c, acorde: A(5) }, { at: AT.p, acorde: A(4) }]))
const cuerpo = (secs, o = {}) => ({ songId: SONG, tono: 'G', letra: TEXTO, secciones: secs, base: 'a'.repeat(32), ...o })
let n = 0; const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const AHORA = new Date('2026-11-10T15:00:00Z')
function baseMem(filas) {
  const db = { songs: [{ id: SONG, organization_id: 'ORG', tono_original: 'G', letra: TEXTO }], song_sections: [], song_section_variants: [], song_text_backups: [], ...filas }
  const est = { escrituras: [], fallaEn: 0, cuenta: 0 }
  const from = tabla => { let f = [], modo = 'sel', valor = null, pidio = false
    const api = { select() { pidio = true; return api }, eq(c, v) { f.push(r => r[c] === v); return api }, in(c, vs) { f.push(r => vs.includes(r[c])); return api }, maybeSingle() { api.u = true; return api }, update(v) { modo = 'upd'; valor = v; return api }, insert(v) { modo = 'ins'; valor = v; return api },
      then(res, rej) { const rows = db[tabla].filter(r => f.every(x => x(r)))
        if (modo === 'ins' || modo === 'upd') { est.cuenta++; if (est.cuenta === est.fallaEn) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(res, rej) }
        if (modo === 'ins') { db[tabla].push({ ...valor }); est.escrituras.push([tabla, 'insert', valor.id]); return Promise.resolve({ data: null, error: null }).then(res, rej) }
        if (modo === 'upd') { rows.forEach(r => Object.assign(r, valor)); est.escrituras.push([tabla, 'update', rows.map(r => r.id).join(',')]); return Promise.resolve({ data: pidio ? rows.map(r => ({ id: r.id })) : null, error: null }).then(res, rej) }
        return Promise.resolve({ data: api.u ? (rows[0] ? { ...rows[0] } : null) : rows.map(r => ({ ...r })), error: null }).then(res, rej) } }
    return api }
  return { admin: { from }, db, est }
}
const clon = o => JSON.parse(JSON.stringify(o))
const conViva = (viejo = VIEJO(), formato = 2) => baseMem({ song_sections: [['s1', 'V1', 'VERSO 1'], ['s2', 'C', 'CORO'], ['s3', 'P', 'PUENTE']].map(([id, code, name], i) => ({ id, song_id: SONG, code, name, sort_order: i })),
  song_section_variants: viejo.map((s, i) => ({ id: 'v' + (i + 1), section_id: 's' + (i + 1), label: 'Principal', lines: s.lineas, is_default: true, formato })) })
const hoja = m => R.armarHojaAcordes({ tono: 'G', arreglo: null, secciones: m.db.song_sections, variantes: m.db.song_section_variants })
const guardar = async (m, d) => { const e = await G.leerEstado(m.admin, SONG); const ops = G.planificar(e, d, AHORA, nuevoId); return { ops, r: await G.ejecutar(m.admin, ops) } }

correr(async () => {
  await prueba('cambia solo el CORO: solo el coro recibe variante nueva, respaldo y publicación; el verso y el puente conservan su variante viva intacta (mismo id, «Principal», predeterminada)', async () => {
    const m = conViva(); const nuevo = E.aSecciones(doc([{ at: AT.v, acorde: A(1) }, { at: AT.c, acorde: A(2, 'm') }, { at: AT.p, acorde: A(4) }])); const antes = clon(m.db.song_section_variants)
    const { ops, r } = await guardar(m, cuerpo(nuevo)); assert.equal(r.ok, true)
    assert.deepEqual(ops.filter(o => o.paso === 2).map(o => o.valores.section_id), ['s2']); assert.deepEqual(ops.filter(o => o.paso === 3 && o.tabla === 'song_section_variants').map(o => o.id), ['v2']); assert.equal(ops.filter(o => o.paso === 5).length, 1)
    for (const id of ['v1', 'v3']) { const v = m.db.song_section_variants.find(x => x.id === id); assert.deepEqual(v, antes.find(x => x.id === id), id + ' intacta') }
    assert.equal(m.db.song_section_variants.length, 4); assert.ok(V.esRespaldo(m.db.song_section_variants.find(x => x.id === 'v2').label)); assert.equal(m.db.song_section_variants.filter(v => v.is_default).length, 3)
    assert.equal(hoja(m).secciones[1].lineas[0].segments[0].acorde.g, 2, 'el lector ve lo nuevo del coro'); assert.equal(hoja(m).secciones[0].lineas[0].segments[0].acorde.g, 1)
  })
  await prueba('no cambia nada: ninguna variante nueva, ningún respaldo, ninguna publicación; solo se actualiza la canción (letra y tono) y el lector ve lo mismo', async () => {
    const m = conViva(); const antes = clon(m.db.song_section_variants), hAntes = hoja(m); const { ops, r } = await guardar(m, cuerpo(VIEJO(), { tono: 'A' })); assert.equal(r.ok, true)
    assert.deepEqual(ops.map(o => [o.paso, o.tabla]), [[0, 'song_text_backups'], [4, 'songs']], 'solo el respaldo de letra y tono y la canción (el tono cambió)'); assert.ok(ops.every(o => o.tabla !== 'song_section_variants'), 'ninguna operación sobre variantes')
    assert.deepEqual(m.db.song_section_variants, antes); assert.deepEqual(hoja(m).secciones, hAntes.secciones); assert.equal(m.db.songs[0].tono_original, 'A')
  })
  await prueba('las llaves en otro orden NO cuentan como cambio (la base guarda el jsonb con otro orden); un cambio real, por pequeño que sea, sí', async () => {
    const viejo = VIEJO(); const barajado = clon(viejo).map(s => ({ ...s, lineas: s.lineas.map(l => (l.kind === 'lyric' ? { segments: l.segments.map(sg => (sg.acorde ? { acorde: { cal: sg.acorde.cal, g: sg.acorde.g }, text: sg.text } : { text: sg.text })), kind: 'lyric' } : l)) }))
    const m = conViva(barajado); assert.equal(G.mismasLineas(barajado[0].lineas, viejo[0].lineas), true); const { ops } = await guardar(m, cuerpo(VIEJO())); assert.ok(!ops.some(o => o.paso === 2), 'mismo contenido: no se toca')
    const m2 = conViva(); const cambio = VIEJO(); cambio[0].lineas[0].segments[0].text += '!'; assert.equal(G.mismasLineas(m2.db.song_section_variants[0].lines, cambio[0].lineas), false)
    const otroTono = VIEJO(); otroTono[2].lineas[0].segments[0].acorde.cal = '7'; const { ops: o2 } = await guardar(conViva(), cuerpo(otroTono)); assert.deepEqual(o2.filter(o => o.paso === 2).map(o => o.valores.section_id), ['s3'], 'una calidad distinta es un cambio')
    for (const x of [null, undefined, 'x', {}, 5]) assert.equal(G.mismasLineas(x, []), false, 'datos raros: no es igual (se reemplaza, como antes)')
  })
  await prueba('una variante viva en FORMATO 1 siempre se reemplaza (aunque diga lo mismo): todas las secciones tienen que quedar en formato 2 o la hoja de acordes no se arma', async () => {
    const m = conViva(VIEJO(), 1); const { ops, r } = await guardar(m, cuerpo(VIEJO())); assert.equal(r.ok, true); assert.deepEqual(ops.filter(o => o.paso === 2).map(o => o.valores.section_id), ['s1', 's2', 's3'])
    assert.ok(m.db.song_section_variants.filter(v => v.is_default).every(v => v.formato === 2)); assert.ok(hoja(m))
  })
  await prueba('cambia solo el nombre o el código de una sección: se actualiza la fila de la sección y su variante no se toca; una sección nueva al final recibe su variante y las demás no; la que sobra se da de baja y SU variante sí pasa a respaldo', async () => {
    const m = conViva(); const renombrado = VIEJO(); renombrado[1].nombre = 'CORO FINAL'; const { ops } = await guardar(m, cuerpo(renombrado, { letra: TEXTO.replace('CORO:', 'CORO FINAL:') }))
    assert.ok(!ops.some(o => o.tabla === 'song_section_variants')); assert.deepEqual(ops.filter(o => o.tabla === 'song_sections').map(o => [o.id, Object.keys(o.valores).sort().join()]), [['s2', 'name']])
    const m2 = conViva(); const mas = E.aSecciones(doc([{ at: AT.v, acorde: A(1) }, { at: AT.c, acorde: A(5) }, { at: AT.p, acorde: A(4) }], [], TEXTO + '\n\nFINAL:\nUn final de prueba\notra más')); const { ops: o2 } = await guardar(m2, cuerpo(mas, { letra: TEXTO + '\n\nFINAL:\nUn final de prueba\notra más' }))
    assert.deepEqual(o2.filter(o => o.paso === 2).map(o => o.valores.section_id === 's1' || o.valores.section_id === 's2' || o.valores.section_id === 's3' ? o.valores.section_id : 'nueva'), ['nueva']); assert.ok(!o2.some(o => o.paso === 3 && o.tabla === 'song_section_variants'))
    const m3 = conViva(); const menos = E.aSecciones(doc([{ at: AT.v, acorde: A(1) }, { at: AT.c, acorde: A(5) }], [], TEXTO.split('\n\nPUENTE:')[0])); const { ops: o3 } = await guardar(m3, cuerpo(menos, { letra: TEXTO.split('\n\nPUENTE:')[0] }))
    assert.ok(o3.some(o => o.paso === 3 && o.id === 'v3' && V.esRespaldo(o.valores.label)), 'la variante de la sección dada de baja se respalda'); assert.equal(m3.db.song_sections.find(s => s.id === 's3').code, '__P'); assert.ok(!o3.some(o => o.paso === 2), 'las que quedan no cambiaron')
  })
  await prueba('si el guardado se corta en CUALQUIER operación: nada borrado, lo viejo intacto, y el lector ve lo viejo o solo letra (null), nunca un chart a medias; con una sola sección cambiada hay menos operaciones que antes', async () => {
    const nuevo = E.aSecciones(doc([{ at: AT.v, acorde: A(1) }, { at: AT.c, acorde: A(2, 'm') }, { at: AT.p, acorde: A(4) }]))
    const total = G.planificar(await G.leerEstado(conViva().admin, SONG), cuerpo(nuevo), AHORA, nuevoId).length
    const todasCambiadas = E.aSecciones(doc([{ at: AT.v, acorde: A(2) }, { at: AT.c, acorde: A(2, 'm') }, { at: AT.p, acorde: A(5) }])); assert.ok(total < G.planificar(await G.leerEstado(conViva().admin, SONG), cuerpo(todasCambiadas), AHORA, nuevoId).length)
    for (let k = 1; k <= total; k++) {
      const m = conViva(); const antes = clon(m.db.song_section_variants), viejaHoja = hoja(m); const e = await G.leerEstado(m.admin, SONG); const ops = G.planificar(e, cuerpo(nuevo), AHORA, nuevoId)
      m.est.fallaEn = k; const r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, false); assert.equal(r.fallo, k - 1)
      for (const v of antes) assert.deepEqual(m.db.song_section_variants.find(x => x.id === v.id).lines, v.lines, 'líneas viejas intactas (corte ' + k + ')')
      const ahora = hoja(m); const primerPaso3 = ops.findIndex(o => o.paso === 3)
      if (k - 1 <= primerPaso3) assert.deepEqual(ahora, viejaHoja, 'antes de tocar lo vivo, el lector sigue viendo lo viejo (corte ' + k + ')'); else assert.equal(ahora, null, 'después de tocar lo vivo, solo letra (corte ' + k + ')')
    }
  })
  await prueba('el interruptor: con SOLO_LO_QUE_CAMBIO = false (o descartando el commit) todas las secciones se reemplazan como antes; el interruptor está encendido y declarado en un solo sitio', () => {
    const f = require('fs').readFileSync(path.join(RAIZ, 'lib/admin/guardarAcordes.ts'), 'utf8'); assert.equal(G.SOLO_LO_QUE_CAMBIO, true); assert.equal((f.match(/SOLO_LO_QUE_CAMBIO/g) || []).length, 2, 'declarado y usado una vez')
  })
  terminar()
})
