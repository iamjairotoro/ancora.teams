// Etapa C2: el guardado del editor de acordes (lib/admin/guardarAcordes.ts): validación estricta, coherencia letra/chart, plan de escrituras, ejecución y qué queda si se corta en cualquier punto. Sin red: una base en memoria con fallos a pedido.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts')), R = require(path.join(RAIZ, 'lib/portal/acordesCancion.ts')), V = require(path.join(RAIZ, 'lib/variantesAcordes.ts'))
const A = (g, cal = '') => ({ g, cal })
const SONG = '11111111-1111-4111-8111-111111111111'
const TEXTO = 'VERSO 1:\nAquí va la letra\nsegunda línea\n\nCORO:\nCuán grande es Él'
const docConAcordes = () => ({ texto: TEXTO, anclas: [{ at: 9, acorde: A(1) }, { at: 14, acorde: A(4) }, { at: 26, acorde: A(5, '7') }, { at: 49, acorde: A(6, 'm') }], interludios: [{ at: 39, items: [{ acorde: A(1) }, { texto: '|' }, { acorde: A(5) }] }] })
const cuerpo = (o = {}) => ({ songId: SONG, tono: 'G', letra: TEXTO, secciones: E.aSecciones(docConAcordes()), base: 'a'.repeat(32), ...o })
let n = 0; const nuevoId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
const AHORA = new Date('2026-11-10T15:00:00Z')

// ── una base en memoria; `fallaEn` = número de operación de escritura que falla (1 = la primera) ──
function baseMem(filas) {
  const db = { songs: [{ id: SONG, organization_id: 'ORG', tono_original: null, letra: null }], song_sections: [], song_section_variants: [], ...filas }
  const est = { escrituras: [], borrados: 0, fallaEn: 0, cuenta: 0 }
  const from = tabla => { let f = [], modo = 'sel', valor = null, pidio = false
    const api = { select() { pidio = true; return api }, eq(c, v) { f.push(r => r[c] === v); return api }, in(c, vs) { f.push(r => vs.includes(r[c])); return api }, maybeSingle() { api.u = true; return api }, update(v) { modo = 'upd'; valor = v; return api }, insert(v) { modo = 'ins'; valor = v; return api }, delete() { est.borrados++; return api },
      then(res, rej) {
        const rows = db[tabla].filter(r => f.every(x => x(r)))
        if (modo === 'ins' || modo === 'upd') { est.cuenta++; if (est.cuenta === est.fallaEn) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(res, rej) }
        if (modo === 'ins') { db[tabla].push({ ...valor }); est.escrituras.push([tabla, 'insert', valor.id]); return Promise.resolve({ data: null, error: null }).then(res, rej) }
        if (modo === 'upd') { rows.forEach(r => Object.assign(r, valor)); est.escrituras.push([tabla, 'update', rows.map(r => r.id).join(','), Object.keys(valor).join('+')]); return Promise.resolve({ data: pidio ? rows.map(r => ({ id: r.id })) : null, error: null }).then(res, rej) }
        return Promise.resolve({ data: api.u ? (rows[0] ? { ...rows[0] } : null) : rows.map(r => ({ ...r })), error: null }).then(res, rej) } }
    return api }
  return { admin: { from }, db, est }
}
const clon = o => JSON.parse(JSON.stringify(o))
const conViva = () => {                                // una canción que YA tiene chart en formato 2 (dos secciones) y el mismo texto
  const old = E.aSecciones({ texto: TEXTO, anclas: [{ at: 9, acorde: A(2) }], interludios: [] })
  return baseMem({ songs: [{ id: SONG, organization_id: 'ORG', tono_original: 'G', letra: TEXTO }],
    song_sections: [{ id: 's1', song_id: SONG, code: 'V1', name: 'VERSO 1', sort_order: 0 }, { id: 's2', song_id: SONG, code: 'C', name: 'CORO', sort_order: 1 }],
    song_section_variants: [{ id: 'v1', section_id: 's1', label: 'Principal', lines: old[0].lineas, is_default: true, formato: 2 }, { id: 'v2', section_id: 's2', label: 'Principal', lines: old[1].lineas, is_default: true, formato: 2 }] })
}
const hoja = m => { const sec = m.db.song_sections, vars = m.db.song_section_variants; return R.armarHojaAcordes({ tono: m.db.songs[0].tono_original, arreglo: null, secciones: sec, variantes: vars }) }

correr(async () => {
  await prueba('validarCuerpo acepta un cuerpo bueno y rechaza llaves de más, tipos raros y valores fuera de lista (solo devuelve el CAMPO, nunca el detalle)', () => {
    assert.equal(G.validarCuerpo(cuerpo()).ok, true)
    const malos = [['cuerpo', { ...cuerpo(), organization_id: 'x' }], ['cuerpo', null], ['cuerpo', []], ['cuerpo', 'x'], ['songId', cuerpo({ songId: 'no-es-uuid' })], ['songId', cuerpo({ songId: 5 })],
      ['tono', cuerpo({ tono: 'sol' })], ['tono', cuerpo({ tono: 'Gm7' })], ['tono', cuerpo({ tono: null })], ['letra', cuerpo({ letra: 5 })], ['letra', cuerpo({ letra: 'a\r\nb' })], ['letra', cuerpo({ letra: 'a\u0007b' })], ['letra', cuerpo({ letra: 'x'.repeat(20001) })],
      ['base', cuerpo({ base: '' })], ['base', cuerpo({ base: 'ZZ' })], ['base', cuerpo({ base: 7 })], ['secciones', cuerpo({ secciones: 'x' })], ['secciones', cuerpo({ secciones: Array(41).fill({ nombre: 'a', codigo: 'a', lineas: [] }) })]]
    for (const [campo, c] of malos) { const r = G.validarCuerpo(c); assert.equal(r.ok, false, campo + ' ' + JSON.stringify(c).slice(0, 60)); assert.equal(r.campo, campo, JSON.stringify(c).slice(0, 60)) }
    assert.equal(G.validarCuerpo(cuerpo({ tono: '' })).ok, true, 'el tono vacío pasa aquí: la ruta lo exige aparte con su mensaje') })

  await prueba('GRADOS INVÁLIDOS: g fuera de 1–7, no entero o no número; alt distinto de b/#; calidad rara o larga; bajo mal; llaves de más; texto largo o con control; líneas sin segmentos → todo rechazado', () => {
    const ok = G.acordeValido
    assert.ok(ok({ g: 1, cal: '' }) && ok({ g: 7, cal: 'maj7' }) && ok({ g: 5, alt: 'b', cal: '' }) && ok({ g: 4, alt: '#', cal: 'sus4', bajo: { g: 3 } }) && ok({ g: 2, cal: 'm7' }))
    for (const a of [{ g: 0, cal: '' }, { g: 8, cal: '' }, { g: 1.5, cal: '' }, { g: '3', cal: '' }, { g: NaN, cal: '' }, { g: Infinity, cal: '' }, { g: -1, cal: '' }, { g: null, cal: '' }, { cal: '' }, { g: 1 }, { g: 1, cal: 5 }, { g: 1, cal: 'zz' }, { g: 1, cal: '<script>' }, { g: 1, cal: 'm'.repeat(13) },
      { g: 1, alt: 'x', cal: '' }, { g: 1, alt: '♭', cal: '' }, { g: 1, alt: null, cal: '' }, { g: 1, cal: '', bajo: { g: 9 } }, { g: 1, cal: '', bajo: { g: 3, alt: 'z' } }, { g: 1, cal: '', bajo: 5 }, { g: 1, cal: '', bajo: { g: 3, extra: 1 } }, { g: 1, cal: '', otra: 1 }, null, 'C', 5, []]) assert.equal(ok(a), false, JSON.stringify(a))
    const L = G.lineaValida
    assert.ok(L({ kind: 'lyric', segments: [{ text: 'hola', acorde: A(1) }, { text: ' mundo' }] }) && L({ kind: 'bars', items: [{ acorde: A(1) }, { texto: '|' }] }))
    for (const l of [{ kind: 'lyric', segments: [] }, { kind: 'lyric' }, { kind: 'lyric', segments: [{ text: 'a', chord: 'C' }] }, { kind: 'lyric', segments: [{ text: 'a', literal: 'N.C.' }] }, { kind: 'lyric', segments: [{ text: 'x'.repeat(401) }] }, { kind: 'lyric', segments: [{ text: 'a\u0000b' }] }, { kind: 'lyric', segments: [{ text: 'a', acorde: { g: 9, cal: '' } }] },
      { kind: 'lyric', segments: [{ text: 'a' }], lang: 'es' }, { kind: 'lyric', segments: Array(81).fill({ text: 'a' }) }, { kind: 'bars', items: [] }, { kind: 'bars', items: [{ texto: 'con espacio' }] }, { kind: 'bars', items: [{ texto: '' }] }, { kind: 'bars', items: [{ texto: 'muylargoooo' }] }, { kind: 'bars', items: [{ acorde: { g: 0, cal: '' } }] }, { kind: 'bars', items: [{ acorde: A(1), texto: '|' }] }, { kind: 'bars', items: Array(65).fill({ texto: '|' }) },
      { kind: 'otra' }, {}, null, 5, 'x']) assert.equal(L(l), false, JSON.stringify(l).slice(0, 70))
    for (const s of [{ nombre: 'a', codigo: '__x', lineas: [] }, { nombre: 'a', codigo: 'ABCDEFG', lineas: [] }, { nombre: 'a', codigo: 'a b', lineas: [] }, { nombre: 'a', codigo: '', lineas: [] }, { nombre: 'x'.repeat(81), codigo: 'a', lineas: [] }, { nombre: 'a', codigo: 'a', lineas: [], extra: 1 }, { nombre: 'a', codigo: 'a', lineas: Array(201).fill({ kind: 'lyric', segments: [{ text: 'a' }] }) }, { nombre: 'a', codigo: 'a', lineas: [{ kind: 'lyric', segments: [{ text: 'a', acorde: { g: 9, cal: '' } }] }] }])
      assert.equal(G.validarCuerpo(cuerpo({ secciones: [s] })).ok, false, JSON.stringify(s).slice(0, 70))
    assert.equal(G.validarCuerpo(cuerpo({ secciones: [{ nombre: 'A', codigo: 'X', lineas: [] }, { nombre: 'B', codigo: 'X', lineas: [] }] })).ok, false, 'códigos repetidos') })

  await prueba('textosCoinciden: la letra y el chart dicen lo mismo (nombre, líneas y texto); un interludio nunca antes de la primera línea; la sección instrumental lleva «(instrumental)»', () => {
    const s = E.aSecciones(docConAcordes()); assert.equal(G.textosCoinciden(TEXTO, s), true)
    assert.equal(G.textosCoinciden(TEXTO + '\nextra', s), false); assert.equal(G.textosCoinciden(TEXTO.replace('letra', 'LETRA'), s), false); assert.equal(G.textosCoinciden(TEXTO, s.slice(0, 1)), false)
    assert.equal(G.textosCoinciden(TEXTO.replace('CORO', 'PUENTE'), s), false, 'nombre distinto')
    const antes = clon(s); antes[0].lineas.unshift({ kind: 'bars', items: [{ acorde: A(1) }] }); assert.equal(G.textosCoinciden(TEXTO, antes), false)
    const t2 = 'INTERLUDIO:\n(instrumental)', ins = E.aSecciones({ texto: t2, anclas: [], interludios: [{ at: t2.length, items: [{ acorde: A(1) }] }] }); assert.equal(G.textosCoinciden(t2, ins), true)
    const mal = clon(ins); mal[0].lineas.push({ kind: 'lyric', segments: [{ text: 'cantado' }] }); assert.equal(G.textosCoinciden(t2, mal), false) })

  await prueba('construirCarga: letra sola → «ninguno»; formato 2 → «formato2»; formato 1 con acordes → se convierte en memoria («formato1»); acordes sin leer o sin tono → sin chart; la huella cambia con la letra, el tono o los acordes', () => {
    const m0 = baseMem({ songs: [{ id: SONG, organization_id: 'ORG', tono_original: 'G', letra: TEXTO }] }); const e0 = G.construirCarga({ song: m0.db.songs[0], secciones: [] })
    assert.equal(e0.origen, 'ninguno'); assert.equal(e0.secciones, null); assert.equal(e0.tono, 'G'); assert.equal(e0.letra, TEXTO)
    const v = conViva(); const e = { song: v.db.songs[0], secciones: v.db.song_sections.map(s => ({ ...s, variantes: v.db.song_section_variants.filter(x => x.section_id === s.id) })) }
    const c = G.construirCarga(e); assert.equal(c.origen, 'formato2'); assert.equal(c.secciones.length, 2); assert.match(c.huella, /^[0-9a-f]{32}$/)
    const e2 = clon(e); e2.song.letra += ' '; assert.notEqual(G.construirCarga(e2).huella, c.huella); const e3 = clon(e); e3.song.tono_original = 'A'; assert.notEqual(G.construirCarga(e3).huella, c.huella)
    const e4 = clon(e); e4.secciones[0].variantes[0].lines[0].segments[0].acorde = A(3); assert.notEqual(G.construirCarga(e4).huella, c.huella); assert.equal(G.construirCarga(clon(e)).huella, c.huella, 'determinista')
    const f1 = clon(e); f1.secciones.forEach(s => { s.variantes[0].formato = 1; s.variantes[0].lines = [{ kind: 'lyric', segments: s.code === 'V1' ? [{ text: 'Aquí va la letra', chord: 'G' }] : [{ text: 'Cuán grande es Él' }] }] })
    f1.secciones[0].variantes[0].lines.push({ kind: 'lyric', segments: [{ text: 'segunda línea' }] }); f1.secciones[1].variantes[0].lines = [{ kind: 'lyric', segments: [{ text: 'Cuán grande es Él', chord: 'C' }] }]
    const cf1 = G.construirCarga(f1); assert.equal(cf1.origen, 'formato1'); assert.equal(cf1.secciones[0][0].segments[0].acorde.g, 1)
    const raro = clon(f1); raro.secciones[0].variantes[0].lines[0].segments[0].chord = 'N.C.'; const cr = G.construirCarga(raro); assert.equal(cr.origen, 'ninguno'); assert.equal(cr.sinConvertir, 1); assert.equal(cr.secciones, null)
    const st = clon(f1); st.song.tono_original = null; assert.equal(G.construirCarga(st).origen, 'ninguno') })

  await prueba('planificar: el orden es 1 secciones nuevas → 2 variantes pendientes → 3 respaldar y actualizar → 4 songs → 5 publicar; sin ningún borrado; nada del cliente decide ids de lo ya guardado', () => {
    const m = conViva(); const e = { song: m.db.songs[0], secciones: m.db.song_sections.map(s => ({ ...s, variantes: m.db.song_section_variants.filter(x => x.section_id === s.id) })) }
    const sec = E.aSecciones(docConAcordes()); const d = cuerpo({ secciones: sec })
    const ops = G.planificar(e, d, AHORA, nuevoId); const pasos = ops.map(o => o.paso); assert.deepEqual(pasos, [...pasos].sort()); assert.deepEqual([...new Set(pasos)], [2, 3, 4, 5], 'las dos secciones ya existen: no hay paso 1')
    assert.ok(ops.every(o => o.tipo === 'insert' || o.tipo === 'update')); assert.equal(ops.filter(o => o.paso === 2).length, 2); assert.ok(ops.filter(o => o.paso === 2).every(o => o.valores.formato === 2 && o.valores.is_default === false && /^Nuevo · /.test(o.valores.label)))
    const resp = ops.filter(o => o.paso === 3 && o.tabla === 'song_section_variants'); assert.deepEqual(resp.map(o => o.id), ['v1', 'v2']); assert.ok(resp.every(o => /^Respaldo · 2026-11-10 · /.test(o.valores.label) && o.valores.is_default === false && Object.keys(o.valores).join() === 'label,is_default'), 'solo se cambian etiqueta y predeterminada: las líneas NO se tocan')
    const songs = ops.filter(o => o.tabla === 'songs'); assert.equal(songs.length, 1); assert.deepEqual(Object.keys(songs[0].valores).sort(), ['letra', 'tono_original']); assert.equal(songs[0].valores.tono_original, 'G')
    const pub = ops.filter(o => o.paso === 5); assert.equal(pub.length, 2); assert.ok(pub.every(o => o.valores.label === 'Principal' && o.valores.is_default === true)); assert.deepEqual(pub.map(o => o.id).sort(), ops.filter(o => o.paso === 2).map(o => o.valores.id).sort())
    assert.ok(ops.every(o => !('delete' in o)) && !JSON.stringify(ops).includes('"delete"')) })

  await prueba('guardar sobre una canción con chart: lo viejo queda como «Respaldo ·» con las MISMAS líneas, lo nuevo queda vivo; nada se borra; las secciones se reutilizan; el lector ve lo nuevo', async () => {
    const m = conViva(); const antes = clon(m.db.song_section_variants); const e = await G.leerEstado(m.admin, SONG)
    const d = cuerpo(); const ops = G.planificar(e, d, AHORA, nuevoId); const r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, true); assert.equal(m.est.borrados, 0)
    for (const viejo of antes) { const ahora = m.db.song_section_variants.find(x => x.id === viejo.id); assert.deepEqual(ahora.lines, viejo.lines, 'las líneas viejas intactas'); assert.equal(ahora.formato, viejo.formato); assert.equal(ahora.is_default, false, 'is_default de ' + viejo.id + ' ' + JSON.stringify(m.est.escrituras)); assert.ok(V.esRespaldo(ahora.label)) }
    assert.equal(m.db.song_section_variants.length, 4); assert.equal(m.db.song_sections.length, 2, 'las secciones se reutilizan'); const vivas = m.db.song_section_variants.filter(x => x.is_default); assert.equal(vivas.length, 2); assert.ok(vivas.every(x => x.label === 'Principal' && x.formato === 2))
    const h = hoja(m); assert.equal(h.secciones[0].lineas[0].segments[0].acorde.g, 1, 'el lector de C1 ve lo nuevo'); assert.equal(m.db.songs[0].letra, TEXTO); assert.equal(m.db.songs[0].tono_original, 'G') })

  await prueba('guardar una canción sin chart (solo letra): crea las secciones, las variantes en formato 2 y deja la letra y el tono; nada borrado', async () => {
    const m = baseMem({ songs: [{ id: SONG, organization_id: 'ORG', tono_original: null, letra: 'otra' }] }); const e = await G.leerEstado(m.admin, SONG)
    const r = await G.ejecutar(m.admin, G.planificar(e, cuerpo(), AHORA, nuevoId)); assert.equal(r.ok, true); assert.equal(m.est.borrados, 0)
    assert.equal(m.db.song_sections.length, 2); assert.deepEqual(m.db.song_sections.map(s => [s.code, s.name, s.sort_order]), [['V1', 'VERSO 1', 0], ['C', 'CORO', 1]]); assert.equal(m.db.song_section_variants.length, 2)
    assert.equal(m.db.songs[0].tono_original, 'G'); assert.equal(m.db.songs[0].letra, TEXTO); assert.ok(hoja(m)) })

  await prueba('dar de baja una sección (el nuevo texto tiene menos): su código pasa a «__…», su variante a respaldo; no se borra y el lector la ignora', async () => {
    const m = conViva(); const e = await G.leerEstado(m.admin, SONG); const t1 = 'VERSO 1:\nAquí va la letra\nsegunda línea'
    const d = cuerpo({ letra: t1, secciones: E.aSecciones({ texto: t1, anclas: [{ at: 9, acorde: A(1) }], interludios: [] }) })
    const r = await G.ejecutar(m.admin, G.planificar(e, d, AHORA, nuevoId)); assert.equal(r.ok, true); assert.equal(m.est.borrados, 0); assert.equal(m.db.song_sections.length, 2)
    assert.equal(m.db.song_sections.find(s => s.id === 's2').code, '__C'); assert.ok(V.esRespaldo(m.db.song_section_variants.find(x => x.id === 'v2').label)); const h = hoja(m); assert.deepEqual(h.secciones.map(s => s.code), ['V1']) })

  await prueba('si el guardado se corta en CUALQUIER operación: nunca nada borrado, lo viejo intacto, y el lector ve o lo viejo (solo si no se tocó lo vivo) o solo letra (null), jamás un chart a medias', async () => {
    const total = G.planificar(await G.leerEstado(conViva().admin, SONG), cuerpo(), AHORA, nuevoId).length
    for (let k = 1; k <= total; k++) {
      const m = conViva(); const antes = clon(m.db.song_section_variants); const viejaHoja = hoja(m); const e = await G.leerEstado(m.admin, SONG); const ops = G.planificar(e, cuerpo(), AHORA, nuevoId)
      m.est.fallaEn = k; const r = await G.ejecutar(m.admin, ops); assert.equal(r.ok, false, 'falla en ' + k); assert.equal(r.fallo, k - 1); assert.equal(m.est.borrados, 0)
      for (const v of antes) assert.deepEqual(m.db.song_section_variants.find(x => x.id === v.id).lines, v.lines, 'líneas viejas intactas (corte ' + k + ')')
      const primerPaso3 = ops.findIndex(o => o.paso === 3)
      const ahora = hoja(m)
      if (k - 1 <= primerPaso3) assert.deepEqual(ahora, viejaHoja, 'antes de tocar lo vivo, el lector sigue viendo lo viejo (corte ' + k + ')')
      else assert.equal(ahora, null, 'después de tocar lo vivo, solo letra (corte ' + k + ')')
    } })

  await prueba('tras un corte la canción se puede RECUPERAR: el editor carga las variantes «Nuevo ·» pendientes (origen «pendiente») y un segundo intento termina bien', async () => {
    const m = conViva(); const e = await G.leerEstado(m.admin, SONG); const ops = G.planificar(e, cuerpo(), AHORA, nuevoId)
    m.est.fallaEn = ops.findIndex(o => o.paso === 4) + 1; assert.equal((await G.ejecutar(m.admin, ops)).ok, false)
    const c = G.construirCarga(await G.leerEstado(m.admin, SONG)); assert.equal(c.origen, 'pendiente'); assert.equal(c.secciones.length, 2); assert.equal(c.secciones[0][0].segments[0].acorde.g, 1)
    m.est.fallaEn = 0; m.est.cuenta = 0; const e2 = await G.leerEstado(m.admin, SONG); assert.equal((await G.ejecutar(m.admin, G.planificar(e2, cuerpo(), AHORA, nuevoId))).ok, true); assert.ok(hoja(m)); assert.equal(m.est.borrados, 0) })

  await prueba('ejecutar se detiene en la primera operación que falle o que no toque EXACTAMENTE una fila (id que no existe), y no sigue', async () => {
    const m = baseMem({ songs: [{ id: SONG, organization_id: 'ORG', tono_original: null, letra: null }] })
    const r = await G.ejecutar(m.admin, [{ paso: 4, tipo: 'update', tabla: 'songs', id: 'no-existe', valores: { letra: 'x' } }, { paso: 4, tipo: 'update', tabla: 'songs', id: SONG, valores: { letra: 'y' } }])
    assert.equal(r.ok, false); assert.equal(r.hechas, 0); assert.equal(r.fallo, 0); assert.equal(m.db.songs[0].letra, null) })

  await prueba('lector (C1): ignora «Respaldo ·» y «Nuevo ·»; sin variante viva en una sección con variantes → null; secciones «__» no cuentan; varias vivas sin predeterminada → null', () => {
    const L = [{ kind: 'lyric', segments: [{ text: 'x', acorde: A(1) }] }], sec = [{ id: 's1', code: 'V1', name: 'V' }, { id: 's2', code: '__C', name: 'C' }]
    const base = [{ section_id: 's1', label: 'Principal', lines: L, is_default: true, formato: 2 }, { section_id: 's1', label: 'Respaldo · 2026-11-10 · ab', lines: [{ kind: 'lyric', segments: [{ text: 'viejo' }] }], is_default: false, formato: 1 }, { section_id: 's2', label: 'Respaldo · x', lines: L, is_default: false, formato: 2 }]
    const h = R.armarHojaAcordes({ tono: 'G', arreglo: null, secciones: sec, variantes: base }); assert.deepEqual(h.secciones.map(s => s.code), ['V1']); assert.equal(h.secciones[0].lineas[0].segments[0].text, 'x')
    assert.equal(R.armarHojaAcordes({ tono: 'G', arreglo: null, secciones: [sec[0]], variantes: [base[1]] }), null, 'solo respaldo → null')
    assert.equal(R.armarHojaAcordes({ tono: 'G', arreglo: null, secciones: [sec[0]], variantes: [{ ...base[0], label: 'Nuevo · ab', is_default: false }] }), null, 'solo pendiente → null')
    assert.equal(R.armarHojaAcordes({ tono: 'G', arreglo: null, secciones: [sec[0]], variantes: [{ ...base[0], is_default: false }, { ...base[0], label: 'Alt', is_default: false }] }), null, 'dos vivas sin predeterminada → no se adivina')
    assert.ok(R.armarHojaAcordes({ tono: 'G', arreglo: null, secciones: [sec[0]], variantes: [{ ...base[0], is_default: false }] }), 'una sola viva sin marca de predeterminada se lee') })
  await prueba('HUECOS que las mutaciones encontraron: tope de tamaño del cuerpo, chart con una línea de más, secciones de otra canción, orden de las secciones, y actualizar código y orden de las secciones que se reutilizan', async () => {
    const grande = Array(40).fill(0).map((_, i) => ({ nombre: 'S' + i, codigo: 'S' + i, lineas: Array(200).fill({ kind: 'lyric', segments: [{ text: 'x'.repeat(400) }] }) }))
    const r = G.validarCuerpo(cuerpo({ secciones: grande })); assert.equal(r.ok, false); assert.equal(r.campo, 'cuerpo', 'cada pieza es válida, pero el cuerpo entero pasa del tope')
    const s = E.aSecciones(docConAcordes()); const demas = clon(s); demas[1].lineas.push({ kind: 'lyric', segments: [{ text: 'una más' }] }); assert.equal(G.textosCoinciden(TEXTO, demas), false, 'una línea de más en el chart')
    const m = conViva(); m.db.song_sections.push({ id: 'ajena', song_id: '22222222-2222-4222-8222-222222222222', code: 'X', name: 'otra canción', sort_order: 0 }); m.db.song_sections.reverse()
    const e = await G.leerEstado(m.admin, SONG); assert.deepEqual(e.secciones.map(x => x.id).sort(), ['s1', 's2'], 'solo las secciones de ESTA canción'); assert.deepEqual(G.activas(e).map(x => x.id), ['s1', 's2'], 'en orden de sort_order aunque lleguen desordenadas')
    const viejas = { song: m.db.songs[0], secciones: [{ id: 'a', code: 'X', name: 'vieja', sort_order: 7, variantes: [] }, { id: 'b', code: 'Y', name: 'otra', sort_order: 9, variantes: [] }] }
    const ops = G.planificar(viejas, cuerpo(), AHORA, nuevoId).filter(o => o.tabla === 'song_sections' && o.tipo === 'update')
    assert.deepEqual(ops.map(o => [o.id, o.valores]), [['a', { code: 'V1', name: 'VERSO 1', sort_order: 0 }], ['b', { code: 'C', name: 'CORO', sort_order: 1 }]], 'las secciones reutilizadas toman el código, el nombre y el orden nuevos') })
  terminar()
})
