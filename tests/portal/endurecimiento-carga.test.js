// Endurecimiento 1: cuando el editor NO puede arrancar de las secciones guardadas (la letra de la ficha no coincide, o hay acordes que no se pueden leer), `construirCarga` ofrece `guardadas`: el texto armado con
// las líneas de letra de cada sección (y sus acordes solo si todo se puede leer). Cuando sí puede arrancar de ellas, `guardadas` es null y el resto de la carga queda IGUAL que antes. Datos inventados; sin red.
// Correr: `node tests/portal/endurecimiento-carga.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const G = require(path.join(RAIZ, 'lib/admin/guardarAcordes.ts')), E = require(path.join(RAIZ, 'lib/editorAcordes.ts'))
const SONG = '22222222-2222-4222-8222-222222222222'
const L = (...partes) => ({ kind: 'lyric', segments: partes.map(p => (Array.isArray(p) ? { text: p[0], chord: p[1] } : { text: p })) })
const B = bars => ({ kind: 'bars', bars })
// una canción inventada, de 4 secciones en formato 1 (como la que se dañó): Verso 1 / Pre-coro / Coro / Puente
const secciones = () => [
  { id: 's1', song_id: SONG, code: 'V1', name: 'Verso 1', sort_order: 0 }, { id: 's2', song_id: SONG, code: 'PC', name: 'Pre-coro', sort_order: 1 },
  { id: 's3', song_id: SONG, code: 'C', name: 'Coro', sort_order: 2 }, { id: 's4', song_id: SONG, code: 'P', name: 'Puente', sort_order: 3 },
]
const f1 = (lineasPorSeccion) => lineasPorSeccion.map((lines, i) => ({ id: 'v' + (i + 1), section_id: 's' + (i + 1), label: 'Principal', lines, is_default: true, formato: 1 }))
const LEGIBLES = [[L(['Luna ', 'G'], ['de ', 'D'], 'plata'), L('segundo renglón de prueba')], [L(['Sube ', 'C'], 'el tono')], [L(['Canta ', 'G'], 'fuerte'), B('G D | Em C'), L('otra vez aquí')], [L(['Fin ', 'D'], 'de la prueba')]]
const ROTOS = [[L(['Luna ', 'G'], 'de plata'), L('segundo renglón de prueba')], [L(['Sube ', 'C'], ['el ', 'EE/G#'], 'tono')], LEGIBLES[2], LEGIBLES[3]]
const estado = ({ letra, tono = 'G', vars }) => ({ song: { id: SONG, organization_id: 'ORG', tono_original: tono, letra }, secciones: secciones().map((s, i) => ({ ...s, variantes: vars.filter(v => v.section_id === s.id) })) })
const RELLENO = 'ESTO ES RELLENO\nde prueba'

correr(async () => {
  await prueba('canción con acordes ilegibles y letra de relleno (el caso del daño): ofrece el texto de las 4 secciones, sin acordes, con encabezados que el editor reconoce; la carga de siempre no cambia', () => {
    const c = G.construirCarga(estado({ letra: RELLENO, vars: f1(ROTOS) }))
    assert.equal(c.origen, 'ninguno'); assert.equal(c.secciones, null); assert.ok(c.sinConvertir > 0)
    assert.ok(c.guardadas, 'se ofrece'); assert.equal(c.guardadas.secciones, null, 'con acordes ilegibles solo texto'); assert.equal(c.guardadas.nSecciones, 4); assert.ok(c.guardadas.sinConvertir > 0)
    const est = E.estructura(c.guardadas.letra)
    assert.equal(est.secciones.length, 4); assert.deepEqual(est.secciones.map(s => s.nombre), ['VERSO 1', 'PRE CORO', 'CORO', 'PUENTE'], 'cada encabezado se reconoce y no se pierde ninguno')
    assert.deepEqual(est.secciones.map(s => s.lineas.length), [2, 1, 2, 1], 'las líneas de compases no cuentan como letra')
    assert.ok(c.guardadas.letra.includes('segundo renglón de prueba') && !c.guardadas.letra.includes('G D | Em C'))
    assert.equal(c.letra, RELLENO, 'la letra de la ficha sigue siendo la de la ficha'); assert.ok(/^[0-9a-f]{32}$/.test(c.huella))
  })
  await prueba('acordes legibles pero la letra no coincide: se ofrece el texto CON sus acordes (el editor puede armar el documento: mismos acordes puestos sobre las mismas palabras)', () => {
    const c = G.construirCarga(estado({ letra: RELLENO, vars: f1(LEGIBLES) }))
    assert.equal(c.origen, 'formato1'); assert.ok(c.secciones, 'la carga trae las secciones convertidas'); assert.ok(c.guardadas, 'pero la letra no coincide: se ofrece'); assert.ok(c.guardadas.secciones, 'con acordes')
    const doc = E.desdeSecciones(c.guardadas.letra, c.guardadas.secciones)
    assert.ok(doc, 'el documento se arma'); assert.equal(doc.anclas.length, 5, 'los 5 acordes de las líneas de letra'); assert.equal(doc.interludios.length, 1, 'y la línea de compases como interludio')
    assert.equal(E.aSecciones(doc).length, 4)
  })
  await prueba('cuando el editor SÍ arranca de las secciones (letra coincide) no se ofrece nada; sin secciones, tampoco; la huella no depende de lo ofrecido', () => {
    const letra = 'ESTROFA UNO:\nLuna de plata\nsegundo renglón de prueba\n\nENTRADA:\nSube el tono\n\nESTRIBILLO:\nCanta fuerte\notra vez aquí\n\nSALIDA:\nFin de la prueba'     // otros encabezados que los de las secciones: la carga sigue sin ofrecer nada
    const buena = G.construirCarga(estado({ letra, vars: f1(LEGIBLES) }))
    assert.equal(buena.origen, 'formato1'); assert.equal(buena.guardadas, null)
    assert.equal(G.construirCarga({ song: { id: SONG, organization_id: 'ORG', tono_original: 'G', letra: RELLENO }, secciones: [] }).guardadas, null, 'sin secciones no hay nada que ofrecer')
    const a = G.construirCarga(estado({ letra: RELLENO, vars: f1(ROTOS) })), b = G.construirCarga(estado({ letra: RELLENO, vars: f1(ROTOS) }))
    assert.equal(a.huella, b.huella)
    // lo ofrecido es igual al texto de la ficha (salvo mayúsculas y espacios): nada nuevo que ofrecer
    const igual = G.construirCarga(estado({ letra: a.guardadas.letra.toLowerCase(), vars: f1(ROTOS) }))
    assert.equal(igual.guardadas, null)
  })
  await prueba('nombres raros de sección no rompen el texto ofrecido: sin nombre → «SECCIÓN», símbolos fuera, tope de 4 palabras; una sección solo de compases lleva «(instrumental)»; una sin variante se salta', () => {
    const st = estado({ letra: RELLENO, vars: f1([[L('uno de prueba')], [B('G D')], [L('tres de prueba')], [L('cuatro de prueba')]]) })
    st.secciones[0].name = '¡¡¡'; st.secciones[0].code = ''; st.secciones[2].name = 'Una dos tres cuatro cinco'; st.secciones[3].variantes = []
    const c = G.construirCarga(st)
    assert.ok(c.guardadas)
    const est = E.estructura(c.guardadas.letra)
    assert.deepEqual(est.secciones.map(s => s.nombre), ['SECCIÓN', 'PRE CORO', 'UNA DOS TRES CUATRO'])
    assert.equal(c.guardadas.nSecciones, 3)
    assert.ok(c.guardadas.letra.includes('(instrumental)'))
  })
  terminar()
})
