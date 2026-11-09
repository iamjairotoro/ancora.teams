// Etapa C1: lectura de acordes (formato 2) en la vista del músico. Funciones puras + la hoja dibujada de verdad (react-dom/server). Correr: `node tests/portal/acordes-lectura.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const real = n => require(path.join(RAIZ, n))
const { tonosDelMismoModo, mismoModo, esTonoMenor, TONOS_MAYORES, TONOS_MENORES } = real('lib/tonos.ts')
const { tonoDeLectura, seccionesParaMostrar, notacionDe } = real('lib/lecturaAcordes.ts')
const { armarHojaAcordes } = real('lib/portal/acordesCancion.ts')
const HojaAcordes = real('components/canciones/HojaAcordes.tsx').default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')

const A = (g, cal = '', alt) => ({ g, cal, ...(alt ? { alt } : {}) })
const lyric = (...segs) => ({ kind: 'lyric', segments: segs.map(([text, acorde]) => ({ text, ...(acorde ? { acorde } : {}) })) })
const mostrar = (lineas, tono, n = 'american') => seccionesParaMostrar({ tono: 'X', secciones: [{ code: 'V1', name: 'Verso', repeat: 1, lineas }] }, tono, n)[0].lineas
// El Americano escribe ♯ y ♭ de verdad; aquí se comparan en ASCII para leer mejor las pruebas.
const plano = t => String(t).replace(/♯/g, '#').replace(/♭/g, 'b')
const acordesDe = l => plano(l.segments.map(s => s.acorde || '').join(' ').trim())

correr(async () => {
  await prueba('el selector de tono ofrece solo tonos del MISMO modo: Em solo menores, G solo mayores (y los de otro modo no valen)', () => {
    assert.deepEqual([...tonosDelMismoModo('Em')], [...TONOS_MENORES]); assert.deepEqual([...tonosDelMismoModo('G')], [...TONOS_MAYORES])
    assert.ok(tonosDelMismoModo('F#m').every(t => t.endsWith('m')) && tonosDelMismoModo('Bb').every(t => !t.endsWith('m')))
    assert.ok(esTonoMenor('C#m') && !esTonoMenor('C#'))
    assert.ok(mismoModo('Em', 'Am') && mismoModo('G', 'A') && !mismoModo('Em', 'A') && !mismoModo('G', 'Am') && !mismoModo('G', '') && !mismoModo('G', null) && !mismoModo('G', 'sol')) })

  await prueba('tono de lectura: local > servicio > original; un tono de otro modo, vacío o raro se ignora (Em con un servicio en «A» se lee en Em)', () => {
    assert.deepEqual(tonoDeLectura({ original: 'G' }), { tono: 'G', origen: 'original' })
    assert.deepEqual(tonoDeLectura({ original: 'G', servicio: 'A' }), { tono: 'A', origen: 'servicio' })
    assert.deepEqual(tonoDeLectura({ original: 'G', servicio: 'G' }), { tono: 'G', origen: 'original' })
    assert.deepEqual(tonoDeLectura({ original: 'G', servicio: 'A', local: 'D' }), { tono: 'D', origen: 'local' })
    assert.deepEqual(tonoDeLectura({ original: 'Em', servicio: 'A' }), { tono: 'Em', origen: 'original' }, 'servicio mayor en canción menor')
    assert.deepEqual(tonoDeLectura({ original: 'G', servicio: 'Am' }), { tono: 'G', origen: 'original' }, 'servicio menor en canción mayor')
    assert.deepEqual(tonoDeLectura({ original: 'Em', servicio: 'Am' }), { tono: 'Am', origen: 'servicio' })
    assert.deepEqual(tonoDeLectura({ original: 'Em', servicio: 'Am', local: 'C' }), { tono: 'Am', origen: 'servicio' }, 'local de otro modo se ignora')
    for (const x of [null, undefined, '', '  ', 'sol', 'H', 5]) assert.equal(tonoDeLectura({ original: 'G', servicio: x, local: x }).tono, 'G') })

  await prueba('transposición de grados al tono de lectura: el mismo grado, otra letra (G → A → Bb), en mayor y con el bajo', () => {
    const l = [lyric(['Aquí ', A(1)], ['va ', A(4)], ['la ', A(5)], ['letra', A(6, 'm')]), lyric(['x', { g: 1, cal: '', bajo: { g: 3 } }])]
    assert.deepEqual(mostrar(l, 'G').map(acordesDe), ['G C D Em', 'G/B'])
    assert.deepEqual(mostrar(l, 'A').map(acordesDe), ['A D E F#m', 'A/C#'])
    assert.deepEqual(mostrar(l, 'Bb').map(acordesDe), ['Bb Eb F Gm', 'Bb/D']) })

  await prueba('tono MENOR: los grados se miden contra el relativo mayor (Em = 6m de G); al leer en Am o F#m el 6m es Am / F#m, y el 1 (G) pasa a C / A', () => {
    const l = [lyric(['a', A(6, 'm')], ['b', A(4)], ['c', A(5)], ['d', A(1)])]
    assert.equal(acordesDe(mostrar(l, 'Em')[0]), 'Em C D G')
    assert.equal(acordesDe(mostrar(l, 'Am')[0]), 'Am F G C')
    assert.equal(acordesDe(mostrar(l, 'F#m')[0]), 'F#m D E A')
    assert.equal(acordesDe(mostrar(l, 'Em', 'number')[0]), '6m 4 5 1', 'Números no depende del tono') })

  await prueba('TRITONO: se guarda como b5 y se lee b5 en Números; en Americano es la nota a tres tonos de la tónica, escrita según el tono (G → C#, A → D#, F → B; Em → C#)', () => {
    const l = [lyric(['a', A(5, '', 'b')], ['b', A(5, '7', 'b')])]
    assert.equal(acordesDe(mostrar(l, 'G')[0]), 'C# C#7'); assert.equal(acordesDe(mostrar(l, 'A')[0]), 'D# D#7'); assert.equal(acordesDe(mostrar(l, 'F')[0]), 'B B7'); assert.equal(acordesDe(mostrar(l, 'Em')[0]), 'C# C#7')
    assert.equal(acordesDe(mostrar(l, 'G', 'number')[0]), 'b5 b5(7)') })

  await prueba('Números y Americano: mismas posiciones; las barras («bars») y los textos literales (N.C.) se conservan', () => {
    const l = [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(6, 'm') }, { texto: '|' }, { acorde: A(4) }] }, { kind: 'lyric', segments: [{ text: 'Amén', literal: 'N.C.' }, { text: ' fin' }] }]
    assert.equal(plano(mostrar(l, 'D')[0].bars), 'D Bm | G'); assert.equal(mostrar(l, 'D', 'number')[0].bars, '1 6m | 4'); assert.equal(mostrar(l, 'D')[1].segments[0].acorde, 'N.C.'); assert.equal(mostrar(l, 'D')[1].segments[1].acorde, undefined)
    assert.equal(notacionDe('numeros'), 'number'); assert.equal(notacionDe('americano'), 'american') })

  await prueba('armarHojaAcordes: todas las variantes en formato 2 y con tono → hoja, en el orden del arreglo y con sus repeticiones; la predeterminada manda', () => {
    const secciones = [{ id: 's1', code: 'V1', name: 'Verso', sort_order: 0 }, { id: 's2', code: 'C', name: 'Coro', sort_order: 1 }]
    const L = [lyric(['hola', A(1)])]
    const variantes = [{ section_id: 's1', label: 'Principal', lines: L, is_default: true, formato: 2 }, { section_id: 's2', label: 'Alt', lines: [lyric(['alt'])], is_default: false, formato: 2 }, { section_id: 's2', label: 'Principal', lines: L, is_default: true, formato: 2 }]
    const h = armarHojaAcordes({ tono: ' g ', arreglo: [{ sectionId: 's2', label: 'x', repeat: 2 }, { sectionId: 's1', label: 'y', repeat: 1 }, { sectionId: 'fantasma', repeat: 3 }], secciones, variantes })
    assert.equal(h.tono, 'G'); assert.deepEqual(h.secciones.map(s => [s.code, s.repeat]), [['C', 2], ['V1', 1]]); assert.equal(h.secciones[0].lineas[0].segments[0].text, 'hola', 'la predeterminada, no la Alt')
    const sin = armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes }); assert.deepEqual(sin.secciones.map(s => s.code), ['V1', 'C'], 'sin arreglo, por sort_order')
    const alt = armarHojaAcordes({ tono: 'G', arreglo: [{ sectionId: 's2', label: 'Alt', repeat: 1 }], secciones, variantes }); assert.equal(alt.secciones[0].lineas[0].segments[0].text, 'alt', 'el arreglo puede pedir la variante por su etiqueta') })

  await prueba('armarHojaAcordes: UNA sola variante en formato 1, sin tono, líneas raras o sin secciones → null (la canción se ve solo con letra, como hoy)', () => {
    const secciones = [{ id: 's1', code: 'V1', name: 'Verso' }, { id: 's2', code: 'C', name: 'Coro' }], L = [lyric(['hola', A(1)])]
    const ok = [{ section_id: 's1', lines: L, is_default: true, formato: 2 }, { section_id: 's2', lines: L, is_default: true, formato: 2 }]
    assert.ok(armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes: ok }))
    assert.equal(armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes: [ok[0], { ...ok[1], formato: 1 }] }), null)
    assert.equal(armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes: [ok[0], { ...ok[1], formato: undefined }] }), null)
    for (const t of [null, undefined, '', 'sol', 5]) assert.equal(armarHojaAcordes({ tono: t, arreglo: null, secciones, variantes: ok }), null, String(t))
    assert.equal(armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes: [ok[0], { ...ok[1], lines: [{ kind: 'lyric', segments: [{ text: 'x', chord: 'C' }].concat('mal') }, { kind: 'otra' }] }] }), null)
    assert.equal(armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes: [ok[0], { ...ok[1], lines: 'no es lista' }] }), null)
    assert.equal(armarHojaAcordes({ tono: 'G', arreglo: null, secciones: [], variantes: [] }), null); assert.equal(armarHojaAcordes({ tono: 'G', arreglo: null, secciones, variantes: [] }), null)
    assert.ok(armarHojaAcordes({ tono: 'Em', arreglo: null, secciones, variantes: ok }), 'un tono menor también arma la hoja') })

  const hoja = { tono: 'G', secciones: [{ code: 'V1', name: 'Estrofa 1', repeat: 1, lineas: [lyric(['Aquí ', A(1)], ['va ', A(4)], ['la letra'])] }, { code: 'C', name: 'Coro', repeat: 2, lineas: [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(5) }] }] }] }
  const tipo = { fontFamily: 'serif', textScale: 1, lineHeightWide: false }
  const prefs = (o = {}) => ({ notation: 'americano', vista: 'ambos', compacta: false, ...o })
  const dibujar = (o = {}) => renderToStaticMarkup(React.createElement(HojaAcordes, { title: 'Grande es tu fidelidad', hoja, prefs: prefs(), onPrefs() {}, typography: tipo, ...o }))

  await prueba('la hoja dibuja el acorde pegado a su sílaba (segmentos), el nombre y las repeticiones de la sección, y el CCLI; en el tono original sin servicio', () => {
    const h = dibujar({ ccli: '123', copyright: '© X' })
    assert.ok(/class="ac"[^>]*>G<\/span><span class="tx"[^>]*>Aquí <\/span>/.test(h), 'G sobre «Aquí »'); assert.ok(/class="ac"[^>]*>C<\/span><span class="tx"[^>]*>va <\/span>/.test(h)); assert.ok(/class="ac"[^>]*><\/span><span class="tx"[^>]*>la <\/span>/.test(h), 'sin acorde: el hueco queda')
    assert.ok(h.includes('Estrofa 1:') && h.includes('Coro:') && h.includes('×2') && h.includes('CCLI 123') && h.includes('© X'))
    assert.ok(/class="compas">G D<\/p>/.test(h)); assert.ok(!h.includes('Tono del servicio'), 'sin servicio no hay chip de servicio'); assert.ok(h.includes('Original G')) })

  await prueba('con tono del servicio: transpone, muestra «Tono del servicio A», «Original G», «Ver en G» y la nota; un tono de otro modo no cambia nada', () => {
    const h = dibujar({ tonoServicio: 'A' })
    assert.ok(/class="ac"[^>]*>A<\/span><span class="tx"[^>]*>Aquí /.test(h) && /class="ac"[^>]*>D<\/span>/.test(h)); assert.ok(h.includes('Tono del servicio A') && h.includes('Original G') && h.includes('Ver en G') && h.includes('Este tono lo definió quien armó el servicio'))
    const m = dibujar({ tonoServicio: 'Am' }); assert.ok(!m.includes('Tono del servicio') && /class="ac"[^>]*>G<\/span><span class="tx"[^>]*>Aquí /.test(m)) })

  await prueba('Números: los mismos lugares con 1, 4, 5; el botón 123 queda marcado y ABC no; el selector solo trae tonos del modo de la canción', () => {
    const h = dibujar({ prefs: prefs({ notation: 'numeros' }) })
    assert.ok(/class="ac"[^>]*>1<\/span><span class="tx"[^>]*>Aquí /.test(h) && /class="ac"[^>]*>4<\/span>/.test(h) && /class="compas">1 5<\/p>/.test(h))
    assert.ok(/aria-pressed="true"[^>]*>123</.test(h) && /aria-pressed="false"[^>]*>ABC</.test(h))
    const opciones = [...h.matchAll(/<option[^>]*value="([^"]+)"/g)].map(m => m[1]); assert.deepEqual(opciones, [...TONOS_MAYORES])
    const menor = dibujar({ hoja: { ...hoja, tono: 'Em' } }); assert.deepEqual([...menor.matchAll(/<option[^>]*value="([^"]+)"/g)].map(m => m[1]), [...TONOS_MENORES]) })

  await prueba('vista Acordes / Letras y compacta ponen su clase; el aviso de error de preferencias se muestra', () => {
    assert.ok(dibujar({ prefs: prefs({ vista: 'acordes' }) }).includes('soloAcordes')); assert.ok(dibujar({ prefs: prefs({ vista: 'letras' }) }).includes('soloLetras')); assert.ok(!/soloAcordes|soloLetras|compacta/.test(dibujar()))
    assert.ok(dibujar({ prefs: prefs({ compacta: true }) }).includes('class="compacta')); assert.ok(dibujar({ errPrefs: true }).includes('No se pudo guardar tu notación')) })

  await prueba('accesibilidad y reglas: el campo del tono mide 16 px literal, los botones 44 px, sin «en vivo» ni «al instante», y la hoja no usa export extra en rutas', () => {
    const css = leer('components/canciones/hoja-acordes.module.css'), txt = leer('lib/textos/acordesLectura.ts')
    assert.ok(/\.tono select\{[^}]*font-size:16px/.test(css)); assert.ok(/\.seg button\{[^}]*min-height:44px/.test(css) && /\.enlace\{[^}]*min-height:44px/.test(css))
    assert.ok(!/en vivo|al instante/i.test(txt + leer('components/canciones/HojaAcordes.tsx')))
    const ruta = leer('app/api/portal/cancion/route.ts').replace(/\/\/[^\n]*/g, ''); assert.deepEqual([...ruta.matchAll(/export (?:const|async function|function) (\w+)/g)].map(m => m[1]).sort(), ['GET', 'dynamic', 'revalidate']) })

  await prueba('CancionPortal: HojaAcordes solo aparece con `acordes` (formato 2) Y en teléfono (escritorio y tableta, idénticos a main); la rama de LyricSheet para el formato 1 queda BYTE A BYTE como en main; el menú de tamaño no se toca', () => {
    const f = leer('app/portal/_components/CancionPortal.tsx')
    assert.ok(f.includes('{nueva && acordes && hoja ? (') && f.includes('<LecturaCancion ') && f.includes('const verAcordes = !!acordes && telefono') && f.includes('const nueva = estado === \'listo\' && !!hoja && verAcordes') && /tieneLetra \? \(\n            <LyricSheet title=\{hoja\.nombre\}/.test(f), 'primero la lectura con acordes (C3), si no la letra de siempre')
    const lyricJsx = "<LyricSheet title={hoja.nombre} originalTitle={hoja.original_title || undefined} autor={hoja.autor || undefined} traductor={hoja.traductor || undefined}\n              letra={hoja.letra || ''} ccli={hoja.ccli || undefined} copyright={hoja.copyright || undefined}\n              typography={{ fontFamily: prefs.fontFamily, textScale: prefs.textScale, lineHeightWide: prefs.lineHeightWide, stageMode: false }}\n              attachmentsCount={0} attachmentsLoaded={false} />\n          ) : (\n            <div className=\"anc-sheet\" style={vars}>\n              <h1 className=\"anc-sTitle\">{hoja.nombre}</h1>\n              <p className={ui.state}>Esta canción todavía no tiene letra.</p>\n            </div>\n          ))}"
    assert.ok(f.includes(lyricJsx), 'bloque de formato 1 idéntico')
    assert.ok(f.includes('<h2 className={ui.title}>Letra</h2>'), 'el título «Letra» sigue igual en formato 1 y en escritorio')
    assert.ok(!/useLecturaAcordes/.test(f), 'CancionPortal no hace la lectura de preferencias de acordes: vive solo en LecturaCancion, que solo se monta con hoja con acordes (formato 1: nada)'); assert.ok(/useLecturaAcordes\(token\)/.test(leer('app/portal/_components/lectura/LecturaCancion.tsx'))) })
  terminar()
})
