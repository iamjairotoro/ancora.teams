// Ficha de administradora (Modo Admin): la hoja con acordes que ve el músico, calculada con el estado que el editor ya lee (lib/admin/hojaFicha.ts). Solo lectura. Datos inventados; sin red.
// Correr: `node tests/portal/ficha-admin-hoja.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path')
const H = require(path.join(RAIZ, 'lib/admin/hojaFicha.ts'))
const A = g => ({ g, cal: '' })
const f2 = (...textos) => textos.map((t, i) => ({ kind: 'lyric', segments: [{ text: t, acorde: A(1 + (i % 3)) }] }))
const f1 = (...textos) => textos.map(t => ({ kind: 'lyric', segments: [{ text: t, chord: 'G' }] }))
const sec = (i, code, name, variantes) => ({ id: 's' + i, code, name, sort_order: i, variantes: variantes.map((v, k) => ({ id: `v${i}-${k}`, section_id: 's' + i, label: 'Principal', is_default: true, formato: 2, ...v })) })
const estado = ({ tono = 'G', letra = 'x', arreglo = null, secciones }) => ({ song: { id: 'S', organization_id: 'O', tono_original: tono, letra, default_arrangement: arreglo }, secciones })
const BASE = () => [sec(0, 'V1', 'Verso 1', [{ lines: f2('Línea uno de prueba', 'Línea dos de prueba') }]), sec(1, 'C', 'Coro', [{ lines: f2('Coro de prueba') }])]

correr(async () => {
  await prueba('con tono y todas las variantes en formato 2: hay hoja, con las secciones en el orden de las secciones y el tono normalizado', () => {
    const r = H.armarHojaFicha(estado({ secciones: BASE() }))
    assert.ok(r.hoja); assert.equal(r.hoja.tono, 'G'); assert.deepEqual(r.hoja.secciones.map(s => s.code), ['V1', 'C'])
  })
  await prueba('sigue el arreglo guardado (cada entrada, con su repetición) y omite las secciones dadas de baja («__»)', () => {
    const e = estado({ secciones: [...BASE(), sec(2, '__P', 'Puente', [{ lines: f2('Puente de prueba') }])], arreglo: [{ sectionId: 's0', label: 'V1', repeat: 1 }, { sectionId: 's1', label: 'C', repeat: 2 }, { sectionId: 's2', label: 'P', repeat: 1 }] })
    const r = H.armarHojaFicha(e); assert.deepEqual(r.hoja.secciones.map(s => [s.code, s.repeat]), [['V1', 1], ['C', 2]])
  })
  await prueba('SIN hoja (la ficha sigue con la letra): formato 1, mezcla de formatos, sin tono, tono raro, sin secciones, sección con variantes pero ninguna viva', () => {
    const casos = [
      estado({ secciones: [sec(0, 'V1', 'V', [{ lines: f1('una de prueba'), formato: 1 }])] }),
      estado({ secciones: [sec(0, 'V1', 'V', [{ lines: f2('una de prueba') }]), sec(1, 'C', 'C', [{ lines: f1('otra de prueba'), formato: 1 }])] }),
      estado({ tono: null, secciones: BASE() }), estado({ tono: '', secciones: BASE() }), estado({ tono: 'H#', secciones: BASE() }),
      estado({ secciones: [] }), estado({ secciones: [sec(0, 'V1', 'V', [{ lines: f2('una de prueba'), label: 'Respaldo · 2026-11-08 · ab', is_default: false }])] }),
    ]
    for (const [i, e] of casos.entries()) assert.equal(H.armarHojaFicha(e).hoja, null, 'caso ' + i)
  })
  await prueba('no escribe ni toca nada: el estado de entrada queda igual (solo lectura) y las líneas inválidas dan null en vez de fallar', () => {
    const e = estado({ secciones: BASE() }), antes = JSON.stringify(e); H.armarHojaFicha(e); assert.equal(JSON.stringify(e), antes)
    const roto = estado({ secciones: [sec(0, 'V1', 'V', [{ lines: 'esto no son líneas' }])] }); assert.equal(H.armarHojaFicha(roto).hoja, null)
    const raro = estado({ secciones: [sec(0, 'V1', 'V', [{ lines: [{ kind: 'otra' }] }])] }); assert.equal(H.armarHojaFicha(raro).hoja, null)
  })
  await prueba('otras versiones (red de seguridad): cuenta las secciones con más de una versión viva cuando hay hoja con la principal; los respaldos no son versiones; sin hoja, 0', () => {
    const trad = { label: 'Traducción oficial en español', is_default: false, lines: f2('Otra versión de prueba') }
    const e = estado({ secciones: [sec(0, 'V1', 'Verso 1', [{ lines: f2('Línea uno de prueba') }, trad]), sec(1, 'C', 'Coro', [{ lines: f2('Coro de prueba') }, { lines: f2('Coro viejo'), label: 'Respaldo · 2026-11-08 · ab', is_default: false }])] })
    const r = H.armarHojaFicha(e); assert.ok(r.hoja); assert.equal(r.otrasVersiones, 1, 'solo el verso tiene otra versión (el respaldo del coro no cuenta)')
    assert.equal(r.hoja.secciones[0].lineas[0].segments[0].text, 'Línea uno de prueba', 'se muestra la predeterminada')
    assert.equal(H.armarHojaFicha(estado({ secciones: BASE() })).otrasVersiones, 0)
    const sinHoja = estado({ secciones: [sec(0, 'V1', 'Verso 1', [{ lines: f2('Una') }, { lines: f2('Otra'), label: 'Alterna', is_default: false }]), sec(1, 'C', 'Coro', [{ lines: f1('Coro de prueba'), formato: 1 }])] }); assert.deepEqual([H.armarHojaFicha(sinHoja).hoja, H.armarHojaFicha(sinHoja).otrasVersiones], [null, 0], 'sin hoja (otra sección en formato 1) no se avisa de versiones')
    const ambigua = estado({ secciones: [sec(0, 'V1', 'Verso 1', [{ lines: f2('Una') , is_default: false }, { lines: f2('Otra'), label: 'Alterna', is_default: false }])] }); const a = H.armarHojaFicha(ambigua); assert.equal(a.hoja, null, 'varias vivas y ninguna principal: no se adivina'); assert.equal(a.otrasVersiones, 0)
  })
  terminar()
})
