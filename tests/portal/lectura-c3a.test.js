// Etapa C3a: barra superior, cabecera y tira de partes de la lectura con acordes (insignias por sección, salto a sección). Datos inventados; sin red. Correr: `node tests/portal/lectura-c3a.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const P = require(path.join(RAIZ, 'lib/partesCancion.ts')), { TEXTOS_ACORDES: T } = require(path.join(RAIZ, 'lib/textos/acordesLectura.ts'))
const Tira = require(path.join(RAIZ, 'components/canciones/lectura/TiraPartes.tsx')).default, Cab = require(path.join(RAIZ, 'components/canciones/lectura/CabeceraCancion.tsx')).default
const Insignia = require(path.join(RAIZ, 'components/canciones/lectura/InsigniaSeccion.tsx')).default, Hoja = require(path.join(RAIZ, 'components/canciones/HojaAcordes.tsx')).default
const Barra = require(path.join(RAIZ, 'app/portal/_components/lectura/BarraCancion.tsx')).default, Lectura = require(path.join(RAIZ, 'app/portal/_components/lectura/LecturaCancion.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), h = React.createElement
const A = (g, cal = '') => ({ g, cal })
const lin = (texto, g) => ({ kind: 'lyric', segments: [{ text: texto, ...(g ? { acorde: A(g) } : {}) }] })
// una canción inventada, con arreglo: V1, C, It, V2, C×2, Bd, Is
const SECS = [['V1', 'Verso 1', 1], ['C', 'Coro', 1], ['INT', 'Interludio', 1], ['V2', 'Verso 2', 1], ['C', 'Coro', 2], ['P', 'Puente', 1], ['INT', 'Instrumental', 1]]
const ACORDES = { tono: 'G', secciones: SECS.map(([code, name, repeat], i) => ({ code, name, repeat, lineas: [lin('línea de prueba ' + (i + 1), 1)] })) }
const HOJA = { nombre: 'Canción de prueba', original_title: null, autor: 'Autora de prueba', traductor: null, ccli: null, copyright: null }
const TIPO = { prefs: { fontFamily: 'serif', textScale: 1, lineHeightWide: false }, elegir() {}, errPrefs: false }
const PREFS = { notation: 'americano', vista: 'ambos', compacta: false }

correr(async () => {
  await prueba('mapeo de códigos a partes: por NOMBRE primero y luego por CÓDIGO; números; Intro gris; instrumental ≠ interludio; códigos raros en gris', () => {
    const t = [['V1', 'Verso 1', 'v', 'V1'], ['V2', 'Estrofa 2', 'v', 'V2'], ['V', '', 'v', 'V'], ['PC', 'Pre-coro', 'pc', 'Pc'], ['PC', 'Pre coro', 'pc', 'Pc'], ['C', 'Coro', 'c', 'C'], ['C2', 'Coro 2', 'c', 'C2'], ['C-2', 'Sección', 'c', 'C'], ['P', 'Puente', 'bd', 'Bd'],
      ['INT', 'Interludio', 'it', 'It'], ['INT', 'Instrumental', 'is', 'Is'], ['TAG', 'Tag', 'tg', 'Tg'], ['T', '', 'tg', 'Tg'], ['OUT', 'Final', 'e', 'E'], ['F', '', 'e', 'E'], ['IN', 'Intro', 'in', 'In'], ['I', '', 'in', 'In'], ['XYZ', 'Raro', 'otra', 'Xy'], ['', '', 'otra', '?']]
    for (const [c, n, clave, abrev] of t) assert.deepEqual(P.parteDe(c, n), { clave, abrev }, `${c} | ${n}`)
    assert.deepEqual(P.parteDe('INT', ''), { clave: 'it', abrev: 'It' }); assert.deepEqual(P.parteDe('INT', 'Sección rara'), { clave: 'it', abrev: 'It' }, 'INT sin un nombre que lo desmienta es interludio')
    assert.deepEqual(P.parteDe('C', 'Verso 3'), { clave: 'v', abrev: 'V3' }, 'el nombre manda sobre el código')
    assert.deepEqual(P.COLORES_PARTES, { v: '#6C7BF2', pc: '#E8590C', c: '#F59F00', it: '#F03E3E', bd: '#2F9E44', is: '#82C91E', tg: '#E64980', e: '#15AABF' })
    const css = leer('components/canciones/lectura/partes.module.css')
    for (const [k, hex] of Object.entries(P.COLORES_PARTES)) assert.ok(new RegExp(`\\[data-parte="${k}"\\]\\{ --p:${hex};`, 'i').test(css), 'el CSS usa el color de ' + k)
    assert.ok(/\[data-parte\]\{ --p:var\(--anc-ink-3\);/.test(css), 'intro y raras: gris neutro del tema')
  })
  await prueba('tira de partes: un círculo por entrada del arreglo en ese orden, con su abreviatura, el color de su parte y la insignia de repeticiones SOLO si es mayor que 1', () => {
    const partes = ACORDES.secciones.map(s => { const p = P.parteDe(s.code, s.name); return { abrev: p.abrev, clave: p.clave, nombre: s.name, repeat: s.repeat } })
    const html = R(h(Tira, { partes, activa: 1, onIr() {} }))
    const botones = [...html.matchAll(/<button[^>]*data-parte="(\w+)"[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)]
    assert.equal(botones.length, 7); assert.deepEqual(botones.map(b => b[1]), ['v', 'c', 'it', 'v', 'c', 'bd', 'is']); assert.deepEqual(botones.map(b => b[2]), ['Verso 1', 'Coro', 'Interludio', 'Verso 2', 'Coro, 2 veces', 'Puente', 'Instrumental'])
    assert.deepEqual(botones.map(b => b[3].replace(/<span[^>]*>.*?<\/span>/, '')), ['V1', 'C', 'It', 'V2', 'C', 'Bd', 'Is']); assert.equal((html.match(/class="[^"]*rep[^"]*"/g) || []).length, 1, 'solo una parte lleva insignia'); assert.equal((html.match(/aria-hidden="true">2<\/span>/g) || []).length, 1, 'y es la del coro repetido')
    assert.equal((html.match(/aria-current="true"/g) || []).length, 1); assert.ok(/data-parte="c"[^>]*aria-current="true"/.test(html), 'la activa es la que se pidió'); assert.ok(html.includes('aria-label="Partes de la canción"'))
    assert.ok(!html.includes('role="status"'), 'sin globo hasta tocar la parte activa o mantener pulsado')
    assert.equal(R(h(Tira, { partes: [], activa: 0, onIr() {} })).includes('<li'), false)
  })
  await prueba('cabecera: «artista · bpm · Original X»; lo que falta no deja separadores sueltos; los créditos siguen visibles', () => {
    const sub = o => (R(h(Cab, { titulo: 'T', ...o })).match(/<p class="[^"]*sub[^"]*">(.*?)<\/p>/) || [])[1]
    assert.equal(sub({ artista: 'Artista de prueba', bpm: 72, original: 'G' }), 'Artista de prueba · 72 bpm · Original G'); assert.equal(sub({ bpm: 72, original: 'G' }), '72 bpm · Original G'); assert.equal(sub({ artista: '  ', original: 'Em' }), 'Original Em')
    assert.equal(sub({ artista: 'X', bpm: 0 }), 'X'); assert.equal(sub({}), undefined, 'sin nada, sin subtítulo'); assert.ok(R(h(Cab, { titulo: 'T', autor: 'Autora', traductor: 'Traductor' })).includes('Letra y Música:'))
    assert.ok(R(h(Cab, { titulo: 'Un título' })).includes('<h1'))
  })
  await prueba('insignia de sección: el código en un círculo de su color y el nombre al lado', () => {
    const html = R(h(Insignia, { abrev: 'Bd', clave: 'bd', nombre: 'Puente' })); assert.ok(html.includes('data-parte="bd"') && html.includes('>Bd</span>') && html.includes('>Puente</span>'))
  })
  await prueba('HojaAcordes en la lectura nueva (c3): sin cabecera ni chips de C1, una insignia y una tarjeta por sección, un id «parte-N» por sección en el orden del arreglo, el tono local lo lleva la pantalla; sin c3 el id del selector no existe (la hoja de C1 queda igual)', () => {
    const base = { title: 'Canción de prueba', hoja: ACORDES, prefs: PREFS, onPrefs() {}, typography: TIPO.prefs }
    const c3 = R(h(Hoja, { ...base, c3: { tonoLocal: null, onTonoLocal() {} } })), c1 = R(h(Hoja, base))
    assert.ok(!c3.includes('<h1') && !c3.includes('Original G</li>')); assert.deepEqual([...c3.matchAll(/<section[^>]*id="(parte-\d+)"/g)].map(m => m[1]), [0, 1, 2, 3, 4, 5, 6].map(i => 'parte-' + i))
    assert.equal((c3.match(/data-parte=/g) || []).length, 7); assert.equal((c3.match(/class="[^"]*tarjeta/g) || []).length, 7); assert.ok(c3.includes('id="lectura-tono"'))
    assert.ok(c1.includes('<h1') && !c1.includes('id="lectura-tono"') && !c1.includes('parte-0') && !c1.includes('tarjeta'), 'sin c3, igual que antes')
    const local = R(h(Hoja, { ...base, c3: { tonoLocal: 'A', onTonoLocal() {} } })); assert.ok(/<option value="A" selected/.test(local) || /value="A"/.test(local))
  })
  await prueba('barra superior: volver, saltar a sección, píldora del tono, adjuntos (solo si hay) y ajustes; todos con nombre accesible; SIN «Editar» (llega en C3e)', () => {
    const base = { etiquetaVolver: 'Canciones', onVolver() {}, partes: [{ abrev: 'V1', clave: 'v', nombre: 'Verso 1', repeat: 1 }], activa: 0, onIr() {}, tono: 'A', onTono() {}, hayAdjuntos: true, onAdjuntos() {}, tipografia: TIPO }
    const con = R(h(Barra, base)), sin = R(h(Barra, { ...base, hayAdjuntos: false }))
    for (const n of ['Canciones', 'Saltar a sección', 'Tono A', 'Adjuntos', 'Ajustes']) assert.ok(con.includes(`aria-label="${n}"`), n)
    assert.ok(!sin.includes('aria-label="Adjuntos"') && sin.includes('aria-label="Ajustes"')); assert.ok(!/Editar/i.test(con), 'sin botón de editar todavía'); assert.ok(con.includes('>A</button>'), 'la píldora muestra el tono')
    assert.ok(!con.includes('role="dialog"'), 'cerrada: sin menú')
  })
  await prueba('lectura completa: la tira sigue el orden de las secciones del arreglo; la píldora muestra el tono de lectura (el del servicio si es del mismo modo, si no el original); la hoja de abajo es la de siempre', () => {
    const base = { token: null, hoja: HOJA, artista: 'Artista de prueba', bpm: 72, acordes: ACORDES, tipografia: TIPO, etiquetaVolver: 'Canciones', onVolver() {}, hayAdjuntos: false, onAdjuntos() {} }
    const html = R(h(Lectura, { ...base, tonoServicio: 'A' }))
    assert.ok(html.includes('aria-label="Tono A"') && html.includes('Artista de prueba · 72 bpm · Original G')); assert.ok(R(h(Lectura, { ...base, tonoServicio: 'Em' })).includes('aria-label="Tono G"'), 'un tono de otro modo se ignora')
    assert.ok(R(h(Lectura, base)).includes('aria-label="Tono G"')); const orden = [...html.matchAll(/<section[^>]*id="parte-(\d+)"/g)].map(m => +m[1]); assert.deepEqual(orden, [0, 1, 2, 3, 4, 5, 6])
    assert.equal((html.replace(/<[^>]+>/g, '').match(/línea/g) || []).length, 7, 'las siete secciones con su letra')
  })
  await prueba('CSS: círculos de 44 px, insignias y tarjetas con tokens de la app (nada de colores fijos fuera de los de las partes), tamaños en rem salvo las zonas táctiles', () => {
    const c = leer('components/canciones/lectura/lectura-partes.module.css'), b = leer('app/portal/_components/lectura/barra-cancion.module.css'), x = leer('components/canciones/lectura/hoja-c3.module.css')
    assert.ok(/\.circ\{[^}]*width:max\(44px, 2\.75rem\)[^}]*height:max\(44px, 2\.75rem\)/.test(c)); assert.ok(/\.circ\[aria-current="true"\]\{[^}]*background:var\(--p\)/.test(c))
    for (const [n, css] of [['partes', c], ['barra', b], ['hoja', x]]) { assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css.replace(/#111\b/g, '')), n + ': sin colores fijos (salvo #111 del texto sobre el color de la parte)'); assert.deepEqual([...css.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)].filter(m => parseFloat(m[1]) > 2 && parseFloat(m[1]) !== 44).map(m => m[0]), [], n + ': solo 44 px y hairlines en px') }
    assert.ok(/overflow-x:auto/.test(c) && /scrollbar-width:none/.test(c), 'la tira se desliza')
  })
  terminar()
})
