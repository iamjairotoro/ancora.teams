// La hoja de un elemento del Orden en teléfono (Orden-Hoja-A y -B): elegir canción con buscador, campos de 16 px, «Guardar» y «Quitar del orden» con confirmación; el escritorio conserva su panel. Correr: `node tests/portal/orden-hoja-telefono.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const real = n => require(resolver(path.join(RAIZ, n)))

correr(async () => {
  await prueba('elegir canción: busca por título o artista sin importar mayúsculas ni acentos; sin búsqueda están todas, en su orden', async () => {
    const { filtrarCanciones } = real('lib/orden/elegirCancion'), L = [{ id: 'a', nombre: 'All Hail King Jesus', artista: 'Bethel Music' }, { id: 'b', nombre: 'Cuán grande es Él', artista: 'Chris Tomlin' }, { id: 'c', nombre: 'Awake My Soul', artista: 'Hillsong Worship' }, { id: 'd', nombre: 'Sin artista' }]
    assert.deepEqual(filtrarCanciones(L, '').map(c => c.id), ['a', 'b', 'c', 'd']); assert.deepEqual(filtrarCanciones(L, '  ').map(c => c.id), ['a', 'b', 'c', 'd']); assert.deepEqual(filtrarCanciones(L, 'cuan').map(c => c.id), ['b'], 'sin acentos'); assert.deepEqual(filtrarCanciones(L, 'HILLSONG').map(c => c.id), ['c'], 'por artista y sin mayúsculas')
    assert.deepEqual(filtrarCanciones(L, 'a').map(c => c.id), ['a', 'b', 'c', 'd']); assert.deepEqual(filtrarCanciones(L, 'zzz'), []); assert.deepEqual(filtrarCanciones(L, 'artista').map(c => c.id), ['d'], 'una canción sin artista no rompe la búsqueda') })
  await prueba('la duración «m:ss» ↔ segundos sigue igual al sacarla a lib/orden/duracion.ts', async () => {
    const { toMMSS, fromMMSS } = real('lib/orden/duracion'); assert.equal(toMMSS(0), '—'); assert.equal(toMMSS(300), '5:00'); assert.equal(toMMSS(65), '1:05'); assert.equal(fromMMSS('5:00'), 300); assert.equal(fromMMSS('1:05'), 65); assert.equal(fromMMSS('2'), 120); assert.equal(fromMMSS(''), 0)
    assert.ok(!/function toMMSS|function fromMMSS/.test(leer('components/OrdenDelServicio.tsx')), 'ya no se repite en el componente') })
  await prueba('en teléfono se abre la hoja nueva y en escritorio el panel de siempre (que no cambia: «Eliminar» arriba, selector nativo)', async () => {
    const o = sinCom(leer('components/OrdenDelServicio.tsx'))
    assert.ok(/const telefono = useTelefonoYa\(\)/.test(o)); assert.ok(/\{editingBlock && telefono && \(\s*<HojaBloqueOrden/.test(o)); assert.ok(/\{editingBlock && !telefono && \(\s*<EditPanel/.test(o), 'escritorio: EditPanel')
    assert.ok(/onGuardar=\{async updates=>\{ await updateBlock\(editingBlock\.id, updates\) \}\}/.test(o) && /onQuitar=\{async \(\)=>\{ await deleteBlock\(editingBlock\.id\) \}\}/.test(o), 'guardar y quitar usan las mismas funciones')
    assert.ok(/Eliminar/.test(o) && /— Seleccionar canción —/.test(o), 'el panel de escritorio sigue como estaba') })
  await prueba('la hoja: «Guardar» arriba y «Quitar del orden» abajo y en rojo, con confirmación peligrosa; «Canción» abre la lista con check; es una hoja (HojaBase), no una ventana centrada', async () => {
    const h = sinCom(leer('components/orden/HojaBloqueOrden.tsx')), T = real('lib/textos/ordenAdmin').TEXTOS_ORDEN_ADMIN
    assert.ok(/<HojaBase idTitulo=\{id\}/.test(h)); assert.ok(h.indexOf('ui.guardar') < h.indexOf('ui.quitar'), '«Guardar» antes que «Quitar»'); assert.ok(/confirmar\(T\.quitarPregunta, \{ accion: T\.quitarAccion, peligro: true \}\)/.test(h)); assert.ok(/if \(!\(await confirmar\([^)]*\)[^)]*\)\) return\s*\n\s*await onQuitar\(\)/.test(h), 'solo quita si confirma')
    assert.ok(/role="listbox"/.test(h) && /aria-selected=\{c\.id === songId\}/.test(h) && /<Check /.test(h), 'lista con check en la elegida'); assert.ok(/type="search"/.test(h) && /filtrarCanciones\(/.test(h), 'buscador'); assert.ok(!/<select[^>]*>\s*<option value="">— Seleccionar canción/.test(h), 'sin selector nativo de canciones')
    assert.deepEqual([T.guardar, T.quitar, T.tituloCancion, T.tituloElegir, T.lidera, T.observacion], ['Guardar', 'Quitar del orden', 'Canción del servicio', 'Elegir canción', 'Lidera / voz', 'Observación'])
    assert.ok(/song_id: songId \|\| undefined, titulo: elegida\?\.nombre \|\| titulo, tono: tono \|\| undefined, lead_id: leadId \|\| undefined, notas: obs/.test(h), 'guarda lo mismo que el panel de escritorio'); assert.ok(/duracion_min: fromMMSS\(dur\) \|\| 0/.test(h)) })
  await prueba('estilos: campos con borde, radio 12 y 16 px reales; etiquetas 13/600 en gris; botones de 46 y radio 13; «Quitar» en rojo; botones pegados abajo', async () => {
    const c = sinCom(leer('components/orden/hoja-bloque-orden.module.css')), r = s => { const i = ('\n' + c).indexOf('\n' + s + '{'); assert.ok(i >= 0, s); return c.slice(i, c.indexOf('}', i)) }
    const e = r('.entrada'); assert.ok(/border:1px solid var\(--anc-rule\)/.test(e) && /border-radius:0\.75rem/.test(e) && /font-size:16px/.test(e) && /min-height:max\(44px, 3rem\)/.test(e)); const l = r('.etiqueta'); assert.ok(/font-size:\.8125rem/.test(l) && /font-weight:600/.test(l) && /--anc-ink-3/.test(l))
    assert.ok(/border-radius:0\.8125rem/.test(r('.guardar, .quitar')) && /min-height:max\(44px, 2\.875rem\)/.test(r('.guardar, .quitar'))); assert.ok(/color:var\(--anc-no\)/.test(r('.quitar'))); assert.ok(/position:sticky; bottom:0/.test(r('.pie'))); assert.ok(/font-size:16px/.test(r('.buscar input')), 'el buscador también 16 px')
    assert.ok(!/px/.test(c.replace(/\b(44|16)px/g, '').replace(/1px solid/g, '').replace(/2px solid/g, '').replace(/outline-offset:-?\dpx/g, '')), 'solo rem, salvo 16 px de los campos, 44 px táctiles y líneas de 1–2 px') })
  terminar()
})
