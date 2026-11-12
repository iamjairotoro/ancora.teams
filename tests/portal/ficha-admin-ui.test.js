// Ficha de administradora (Modo Admin): la hoja con acordes en lugar de la letra cuando la ruta entrega hoja; todo lo demás de la ficha queda IGUAL que en main (botones, hoja de letra, acciones). Datos inventados; sin red.
// Correr: `node tests/portal/ficha-admin-ui.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), cp = require('child_process'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const Ficha = require(path.join(RAIZ, 'components/canciones/FichaConAcordes.tsx')).default, Aviso = require(path.join(RAIZ, 'components/canciones/AvisoArregloAcordes.tsx')).default
const { LyricSheet } = require(path.join(RAIZ, 'components/canciones/LyricSheet.tsx')), { TEXTOS_FICHA: T } = require(path.join(RAIZ, 'lib/textos/fichaAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const hayMain = require('fs').existsSync(path.join(RAIZ, '.git')) && cp.spawnSync('git', ['cat-file', '-e', 'main^{commit}'], { cwd: RAIZ }).status === 0
const deMain = f => cp.spawnSync('git', ['show', 'main:' + f], { cwd: RAIZ, encoding: 'utf8' }).stdout
const SEIS_DEL_PORTAL = ['components/canciones/LyricSheet.tsx', 'components/canciones/HojaAcordes.tsx', 'components/canciones/LineaConAcordes.tsx', 'app/portal/_components/CancionPortal.tsx', 'lib/portal/acordesCancion.ts', 'lib/lecturaAcordes.ts']
const A = g => ({ g, cal: '' })
const HOJA = { tono: 'G', secciones: [{ code: 'V1', name: 'Verso 1', repeat: 1, lineas: [{ kind: 'lyric', segments: [{ text: 'Línea de prueba ', acorde: A(1) }, { text: 'número uno', acorde: A(5) }] }] }, { code: 'INT', name: 'Interludio', repeat: 1, lineas: [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(4) }] }] }] }
const TIPO = { fontFamily: 'serif', textScale: 1, lineHeightWide: false }
const ficha = (o = {}) => R(h(Ficha, { title: 'Canción de prueba', hoja: HOJA, otrasVersiones: 0, desajuste: false, typography: TIPO, autor: 'Autora de prueba', ...o }))
const trozo = (t, ini, fin) => { const i = t.indexOf(ini); if (i < 0) return null; const j = t.indexOf(fin, i); return j < 0 ? null : t.slice(i, j + fin.length) }

correr(async () => {
  await prueba('la ficha con hoja dibuja HojaAcordes (el mismo dibujo de la lectura): título, créditos, secciones con sus acordes y el interludio solo con acordes; sin avisos si no hay nada que avisar', () => {
    const html = ficha(); assert.ok(html.includes('<h1') && html.includes('Canción de prueba') && html.includes('Letra y Música:') && html.includes('Autora de prueba'))
    assert.ok(html.includes('Verso 1:') && /class="[^"]*compas/.test(html) && html.includes('G C'), 'sección con nombre y línea de compases'); assert.ok(html.includes('>ABC<') && html.includes('>123<') && html.includes('<select'), 'la barra de notación y tono de la lectura')
    assert.ok(!html.includes('role="note"'), 'sin avisos'); assert.ok(html.includes('--anc-letra-font:serif'), 'con la tipografía de la ficha')
  })
  await prueba('avisos: «letra distinta» y «otras versiones» solo cuando corresponden, con sus textos (singular y plural)', () => {
    assert.ok(ficha({ desajuste: true }).includes(T.desajuste) && !ficha({ desajuste: true }).includes('otras versiones')); assert.ok(ficha({ otrasVersiones: 1 }).includes('Se muestra la versión principal de 1 sección que tiene otras versiones.'))
    assert.ok(ficha({ otrasVersiones: 3 }).includes('Se muestra la versión principal de 3 secciones que tienen otras versiones.')); const dos = ficha({ desajuste: true, otrasVersiones: 2 }); assert.equal((dos.match(/role="note"/g) || []).length, 2)
    assert.ok(!ficha({ otrasVersiones: 0, desajuste: false }).includes('role="note"'))
  })
  await prueba('el aviso del arreglo comparte la lectura de la ficha: con `carga` no pide otra; sin `carga` lee por su cuenta como siempre', () => {
    const cargada = { formatoAntiguo: true, actual: { arreglo: ['a', 'b'] } }
    assert.ok(R(h(Aviso, { songId: 'x', carga: cargada })).includes('arreglo de 2 entradas')); assert.equal(R(h(Aviso, { songId: 'x', carga: null })), ''); assert.equal(R(h(Aviso, { songId: 'x', carga: { formatoAntiguo: false, actual: { arreglo: ['a'] } } })), '')
    assert.equal(R(h(Aviso, { songId: 'x' })), '', 'sin carga y sin respuesta: nada (lee por su cuenta)')
    const f = leer('components/canciones/AvisoArregloAcordes.tsx'); assert.equal((f.match(/fetch\(/g) || []).length, 1); assert.ok(/if \(!propio\) return/.test(f))
  })
  await prueba('SOLO LECTURA: ni la ficha ni su lectura escriben (sin POST/PUT/PATCH/DELETE, sin supabase, sin almacenamiento); la única petición es el GET de la ruta del editor, con la guarda contra respuestas de otra canción', () => {
    for (const f of ['components/canciones/FichaConAcordes.tsx', 'components/canciones/useFichaAcordes.ts', 'lib/admin/hojaFicha.ts']) { const c = leer(f).replace(/\/\/[^\n]*/g, ''); assert.ok(!/method:|POST|PUT|PATCH|DELETE|supabase|localStorage|sessionStorage|\.insert\(|\.update\(|\.upsert\(/.test(c), f) }
    const u = leer('components/canciones/useFichaAcordes.ts'); assert.equal((u.match(/fetch\(/g) || []).length, 1); assert.ok(u.includes('/api/admin/canciones/acordes?id=') && u.includes('datos?.id === songId') && u.includes('if (vivo) setDatos({ id: songId, d: { cancion: j?.cancion') && u.includes('.catch(() => { if (vivo) setDatos') && u.includes('if (!activa || !songId) return'))
  })
  await prueba('la ficha de administradora: la hoja solo con `isAdmin` y en la vista de la canción; con hoja reemplaza a LyricSheet, sin ella LyricSheet queda CON LAS MISMAS propiedades que en main (byte a byte)', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.ok(p.includes("useFichaAcordes(selectedSong?.id ?? null, !!isAdmin && view === 'chart')") && p.includes('{ficha.hojaFicha?.hoja ? (') && p.includes('<FichaConAcordes') && p.includes('carga={ficha.cancion}'))
    if (!hayMain) return
    const m = deMain('components/canciones/CancionesPanel.tsx'), bloque = t => trozo(t, '<LyricSheet', 'attachmentsLoaded={attachmentsLoaded}\n            />')
    assert.ok(bloque(m) && bloque(m) === bloque(p), 'las propiedades de LyricSheet son idénticas a las de main')
    // «Editar con acordes» ahora llama a abrirEditorAcordes (abre el editor en su versión «nueva» si la canción es un borrador sin letra; para las demás es el mismo setEditorAcordes de siempre). El botón «Adjuntos» ahora abre la pantalla «Adjuntos – <canción>» y su texto sale de TEXTOS_ADJUNTOS (mismo texto: «Adjuntos» o «Adjuntos · N»); las otras tres acciones siguen idénticas a las de main.
    const ETIQUETA_MAIN = "Adjuntos{attachmentsCount>0 ? ` · ${attachmentsCount}` : ''}", ETIQUETA_NUEVA = '{attachmentsCount>0 ? TEXTOS_ADJUNTOS.botonConConteo(attachmentsCount) : TEXTOS_ADJUNTOS.boton}'
    const ini = "<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>", botones = (t, etq) => trozo(t, ini, etq + '\n            </button>\n          </div>')
    assert.ok(botones(p, ETIQUETA_NUEVA), 'el bloque de botones sigue donde estaba')
    assert.equal(botones(m, ETIQUETA_MAIN).replace(ETIQUETA_MAIN, ETIQUETA_NUEVA).replace('setEditorAcordes(selectedSong)', 'abrirEditorAcordes(selectedSong)')
      // Admin móvil, paso 2: en teléfono «Editar» pasa a la cabecera de la ficha (FichaCabeceraMovil), así que en la barra solo queda en escritorio; el botón y su acción son los mismos.
      .replace('<button className="anc-btn anc-btn--quiet" onClick={()=>{setEditing({...selectedSong})}}>Editar</button>\n', '{/* en teléfono «Editar» vive en la cabecera de la ficha */}\n            {!telefono && <button className="anc-btn anc-btn--quiet" onClick={()=>{setEditing({...selectedSong})}}>Editar</button>}\n'), botones(p, ETIQUETA_NUEVA), 'Tipografía, Editar y Editar con acordes son idénticos a los de main (salvo que en teléfono «Editar» está en la cabecera), y Adjuntos conserva su acción y su texto')
    const menu = t => trozo(t, '<MenuFlotante titulo={`Acciones para ${selectedSong.nombre}`}', '</MenuFlotante>').replace(/\n\s+/g, '\n'); assert.ok(menu(m) === menu(p), 'el menú de acciones (Editar, Archivar, Eliminar) es idéntico (paso 2: se movió a `menuDetalle`, solo cambió la sangría)')
  })
  await prueba('la regla del portal no cambia: los commits de la ficha de administradora (31b8061..cdb2310) no tocaron los seis archivos de la lectura del portal', () => {
    // Rango FIJO, no `main`: otras ramas (p. ej. la lectura C3) cambian a propósito HojaAcordes.tsx y CancionPortal.tsx, y comparar contra `main` haría fallar esta prueba por algo ajeno a la ficha.
    const [DESDE, HASTA] = ['31b8061', 'cdb2310'], hayRango = [DESDE, HASTA].every(c => cp.spawnSync('git', ['cat-file', '-e', c + '^{commit}'], { cwd: RAIZ }).status === 0)
    if (!hayRango) return
    for (const f of SEIS_DEL_PORTAL) assert.equal(cp.spawnSync('git', ['diff', '--quiet', DESDE, HASTA, '--', f], { cwd: RAIZ }).status, 0, f + ` igual en ${DESDE}..${HASTA} (la ficha no lo cambió)`)
  })
  await prueba('la ficha SIN acordes: el HTML de LyricSheet es idéntico al de antes (copia tomada con el código de main)', () => {
    const props = { title: 'Canción de prueba', originalTitle: 'Test song', autor: 'Autora de prueba', traductor: 'Traductor de prueba', letra: 'VERSO 1:\nPrimera línea de prueba\nSegunda línea de prueba\n\nCORO:\nCoro de prueba\notra más', ccli: '123456', copyright: '© prueba', typography: { fontFamily: 'serif', textScale: 1, lineHeightWide: false, stageMode: false }, isAdmin: true, onAddLyrics() {}, attachmentsCount: 0, attachmentsLoaded: true }
    const html = R(h(LyricSheet, props)), dorado = path.join(RAIZ, 'tests/portal/golden/ficha-hoja-de-letra.html')
    assert.equal(html, fs.readFileSync(dorado, 'utf8'), 'HTML idéntico al de la copia de main'); const vacia = R(h(LyricSheet, { ...props, letra: '' })); assert.ok(vacia.includes('anc-sheet'))
  })
  terminar()
})
