// Buscador de teléfono (Campos · A/B/C, commit 1): tokens por tema, medidas del tablero, solo tokens (sin colores sueltos), botones con nombre accesible y zona táctil, y que escritorio y tablet conserven su <input> original. Correr: `node tests/portal/campos-busqueda.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
const aplanar = t => t.replace(/\s+/g, ' ')

correr(async () => {
  await prueba('tokens --anc-campo-*: existen en claro, en oscuro por sistema y en oscuro forzado; el foco es #4C6EF5 en claro y #8DA2FB en oscuro (--anc-accent es neutro y no se usa para el foco)', async () => {
    const t = sinComentarios(leer('app/ancora-tokens-v5.css'))
    const nombres = ['bg', 'bg-foco', 'borde', 'brillo', 'foco', 'halo', 'error-borde', 'error-txt', 'error-halo', 'borrar-bg', 'borrar-ink', 'cancelar-bg']
    for (const n of nombres) assert.equal((t.match(new RegExp(`--anc-campo-${n}:`, 'g')) || []).length, 3, `--anc-campo-${n} debe estar en los 3 bloques de tema`)
    const foco = [...t.matchAll(/--anc-campo-foco:(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase()); assert.deepEqual(foco, ['#4C6EF5', '#8DA2FB', '#8DA2FB'])
    const err = [...t.matchAll(/--anc-campo-error-txt:(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase()); assert.deepEqual(err, ['#C92A2A', '#FFA8A8', '#FFA8A8'])
    const bg = [...t.matchAll(/--anc-campo-bg:([^;]+);/g)].map(m => m[1]); assert.deepEqual(bg, ['rgba(120,120,128,.12)', 'rgba(255,255,255,.07)', 'rgba(255,255,255,.07)'])
    const bb = [...t.matchAll(/--anc-campo-busq-bg:([^;]+);/g)].map(m => m[1]); assert.deepEqual(bb, ['rgba(120,120,128,.10)', 'rgba(255,255,255,.06)', 'rgba(255,255,255,.06)'])
    const pe = [...t.matchAll(/--anc-pestana-off:(#[0-9A-Fa-f]{6})/g)].map(m => m[1].toUpperCase()); assert.deepEqual(pe, ['#6B6B70', '#8A8A8F', '#8A8A8F'])
    const borde = [...t.matchAll(/--anc-campo-borde:([^;]+);/g)].map(m => m[1]); assert.deepEqual(borde, ['rgba(60,60,67,.10)', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.08)']) })
  await prueba('la hoja de estilos del buscador usa solo tokens (ni #hex ni rgb() sueltos), tiene las medidas del tablero y el halo de 4 px al enfocar', async () => {
    const c = aplanar(sinComentarios(leer('components/campos/campo-busqueda.module.css')))
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(c) && !/\brgba?\(/.test(c), 'sin colores sueltos')
    assert.ok(/\.campo\{[^}]*gap:8px; height:40px; padding:0 4px 0 14px[^}]*border-radius:20px/.test(c), 'campo de 40 con radio 20, relleno de 14 y 8 px entre lupa y texto'); assert.ok(/\.cancelar\{[^}]*width:40px; height:40px[^}]*border-radius:50%/.test(c), 'el ✕ es un círculo de 40')
    assert.ok(/\.campo::after\{[^}]*inset:-2px 0[^}]*z-index:-1/.test(c) && /\.borrar::after\{[^}]*inset:-2px -2px/.test(c) && /\.cancelar::after\{[^}]*inset:-2px/.test(c), 'zona táctil de 44 (40 + 2 + 2) con pseudo-elemento invisible, sin agrandar lo que se ve')
    assert.ok(/\.borrar\{[^}]*width:40px; height:40px/.test(c), 'el borrar visible cabe en los 40'); assert.ok(/\.borrarDisco\{[^}]*width:20px; height:20px[^}]*border-radius:50%/.test(c))
    assert.ok(/\.campo:focus-within\{[^}]*border-color:var\(--anc-campo-foco\)[^}]*0 0 0 4px var\(--anc-campo-halo\)/.test(c), 'foco: borde y halo de 4 px'); assert.ok(/caret-color:var\(--anc-campo-foco\)/.test(c), 'caret con el color de foco')
    assert.ok(/\.entrada\{[^}]*font-size:16px/.test(c), '16 px'); assert.ok(/\.campo\{[^}]*border:1px solid var\(--anc-campo-busq-borde\)[^}]*background:var\(--anc-campo-busq-bg\)/.test(c), 'el buscador usa sus tokens propios, más tenues que los de los formularios'); assert.ok(/<Search className=\{ui\.lupa\} size=\{17\}/.test(leer('components/campos/CampoBusqueda.tsx')), 'lupa de 17 px')
    assert.ok(/-webkit-search-cancel-button/.test(c), 'sin la x nativa de Safari (la reemplaza el círculo propio)') })
  await prueba('CampoBusqueda: input type=search, botones con aria-label (texto en lib/textos/campos), el ✕ solo con foco y el borrar solo con texto, y el ✕ espera antes de ocultarse (iOS desenfoca antes del clic)', async () => {
    const x = aplanar(leer('components/campos/CampoBusqueda.tsx')), tx = leer('lib/textos/campos.ts')
    assert.ok(/type="search"/.test(x) && /aria-label=\{etiqueta\}/.test(x)); assert.ok(/aria-label=\{T\.borrarTexto\}/.test(x) && /aria-label=\{T\.cancelarBusqueda\}/.test(x))
    assert.ok(/borrarTexto: 'Borrar el texto'/.test(tx) && /cancelarBusqueda: 'Cancelar la búsqueda'/.test(tx)); assert.ok(!/en vivo|al instante/i.test(tx))
    assert.ok(/valor !== '' && \(/.test(x), 'borrar solo con texto'); assert.ok(/\{enfocado && \(/.test(x), '✕ solo con foco'); assert.ok(/ESPERA_OCULTAR_MS = 200/.test(x) && /setTimeout\(\(\) => setEnfocado\(false\), ESPERA_OCULTAR_MS\)/.test(x))
    assert.ok(/const borrar = \(\) => \{ onCambio\(''\); ref\.current\?\.focus\(\)/.test(x), 'borrar conserva el foco'); assert.ok(/const cancelar = \(\) => \{ onCambio\(''\); ref\.current\?\.blur\(\)/.test(x), 'cancelar limpia y suelta el teclado') })
  await prueba('escritorio y tablet conservan su <input> original: los componentes compartidos dibujan CampoBusqueda solo con useTelefonoYa(); las hojas de teléfono lo usan directo', async () => {
    const compartidos = [['components/PersonasList.tsx', /telefono\s*\?\s*<CampoBusqueda[^>]*\/>\s*:\s*\(\s*<label className=\{styles\.search\}>/], ['components/personas/PorEquipo.tsx', /telefonoYa\s*\?\s*<CampoBusqueda[^>]*\/>\s*:\s*\(\s*<label className=\{ui\.buscar\}>/],
      ['app/portal/_components/canciones/Canciones.tsx', /telefono\s*\?\s*<CampoBusqueda[^>]*\/>\s*:\s*\(\s*<div className=\{ui\.buscar\}>/], ['components/canciones/SongList.tsx', /telefono \? \(\s*<CampoBusqueda[^>]*\/>\s*\) : \(\s*<label className="anc-search">/]]
    for (const [f, re] of compartidos) { const t = leer(f).replace(/\r/g, ''); assert.ok(re.test(t), f + ' conserva el <input> original fuera del teléfono'); assert.ok(/useTelefonoYa\(\)/.test(t), f + ' decide con useTelefonoYa') }
    for (const f of ['components/orden/HojaBloqueOrden.tsx', 'components/servicio-movil/HojasEquipo.tsx']) { const t = leer(f); assert.ok(/<CampoBusqueda /.test(t), f); assert.ok(!/type="search"/.test(t), f + ' ya no tiene su propio buscador') } })
  terminar()
})
