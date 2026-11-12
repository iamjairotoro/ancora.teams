// Admin móvil, paso 1: los marcadores de espera que quitan el salto «antiguo → nuevo» al cargar (ficha del administrador, lectura del músico, editor de canción nueva y lista de canciones). Datos inventados; sin red.
// Correr: `node tests/portal/admin-movil-esqueletos.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
// «teléfono» para useTelefonoYa (se mide en el primer render): se simula con un window mínimo
const conPantalla = (telefono, fn) => { globalThis.window = { matchMedia: () => ({ matches: telefono, addEventListener() {}, removeEventListener() {} }) }; try { return fn() } finally { delete globalThis.window } }
const { useFichaAcordes } = require(path.join(RAIZ, 'components/canciones/useFichaAcordes.ts'))
const FichaEsqueleto = require(path.join(RAIZ, 'components/canciones/FichaEsqueleto.tsx')).default
const LecturaEsqueleto = require(path.join(RAIZ, 'app/portal/_components/lectura/LecturaEsqueleto.tsx')).default
const { SongList } = require(path.join(RAIZ, 'components/canciones/SongList.tsx'))
const CAN = require(path.join(RAIZ, 'lib/textos/cancionesAdmin.ts')).TEXTOS_CANCIONES_ADMIN, ACO = require(path.join(RAIZ, 'lib/textos/acordesLectura.ts')).TEXTOS_ACORDES

const ROW = { id: 's1', title: 'Canción de prueba', artist: 'Grupo inventado', key: 'G', bpm: 72, lastPlayedLabel: null, isFavorite: false }
const lista = props => h(SongList, { songs: [], totalCount: 0, query: '', onQuery() {}, filter: 'all', onFilter() {}, sortLabel: 'Alfabético', onSort() {}, onOpen() {}, onToggleFavorite() {}, onMenu() {}, onAdd() {}, ...props })
const sonda = (id, activa) => { const Sonda = () => h('i', null, JSON.stringify(useFichaAcordes(id, activa))); return R(h(Sonda)) }

correr(async () => {
  await prueba('hook de la ficha: activo y sin respuesta → `listo: false` (se espera); apagado o sin canción → `listo: true` (no se espera nada); lo que llega marca `listo: true` (con hoja, sin hoja o fallida)', () => {
    assert.ok(sonda('s1', true).includes('&quot;listo&quot;:false'), 'esperando la respuesta')
    assert.ok(sonda('s1', false).includes('&quot;listo&quot;:true') && sonda(null, true).includes('&quot;listo&quot;:true'), 'sin lectura activa no hay espera')
    const u = leer('components/canciones/useFichaAcordes.ts')
    assert.match(u, /hojaFicha: j\?\.hojaFicha \?\? null, listo: true/, 'una respuesta (con o sin hoja) termina la espera')
    assert.match(u, /\.catch\(\(\) => \{ if \(vivo\) setDatos\(\{ id: songId, d: VACIO \}\) \}\)/); assert.match(u, /const VACIO: DatosFicha = \{ cancion: null, hojaFicha: null, listo: true \}/, 'una falla termina la espera (la ficha cae a la letra de siempre)')
    assert.match(u, /return datos\?\.id === songId \? datos\.d : ESPERANDO/, 'la respuesta de otra canción nunca cuenta') })

  await prueba('marcador de la ficha: gris, avisa que está ocupado (role=status, aria-busy), NO usa .anc-sheet ni .anc-lsec (así ninguna prueba lo confunde con la hoja de letra) y no trae texto inventado', () => {
    const m = R(h(FichaEsqueleto)); assert.ok(m.includes('data-esqueleto="ficha"') && m.includes('role="status"') && m.includes('aria-busy="true"') && m.includes(`aria-label="${ACO.cargandoCancion}"`))
    assert.ok(!m.includes('anc-sheet') && !m.includes('anc-lsec') && !/<(p|h1|b)\b/.test(m), 'sin hoja ni texto'); assert.ok((m.match(/anc-skel /g) || []).length >= 5) })

  await prueba('ficha: en teléfono, sin respuesta, se dibuja el marcador; con hoja, la hoja con acordes; sin hoja y con respuesta, LyricSheet; el escritorio nunca usa el marcador', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /ficha\.hojaFicha\?\.hoja \? \(\s*<FichaConAcordes[\s\S]*?\) : telefono && !ficha\.listo \? \(\s*<FichaEsqueleto \/>[^\n]*\n\s*\) : telefono && !\(selectedSong\.letra\|\|''\)\.trim\(\) \? \(\s*<FichaVacia [^\n]*\/>\s*\) : \(\s*<LyricSheet/, 'orden: hoja con acordes → marcador (solo teléfono) → estado vacío (solo teléfono, paso 3) → letra')
    assert.ok(p.includes("import FichaEsqueleto from './FichaEsqueleto'")); assert.equal((p.match(/<FichaEsqueleto/g) || []).length, 1) })

  await prueba('lista (teléfono): con `cargando` y sin canciones, filas en gris, el aviso «Cargando las canciones…» y NADA de «Sin resultados» ni «0 en el repertorio»', () => {
    const m = conPantalla(true, () => R(lista({ cargando: true })))
    assert.equal((m.match(/anc-songRow--esq/g) || []).length, 4); assert.ok(m.includes(CAN.cargandoLista) && m.includes('role="status"') && m.includes('sr-only'))
    assert.ok(!m.includes(CAN.sinResultadosTitulo) && !m.includes('en el repertorio') && !m.includes('anc-empty'), 'ni «Sin resultados» ni el conteo'); assert.equal(CAN.cargandoLista, 'Cargando las canciones…') })

  await prueba('lista: sin `cargando` (o ya con canciones) todo sigue como siempre; el escritorio no cambia con `cargando`', () => {
    const vacia = conPantalla(true, () => R(lista({ cargando: false }))); assert.ok(vacia.includes(CAN.sinResultadosTitulo) && vacia.includes('0 en el repertorio') && !vacia.includes('--esq'), 'cargó y no hay: «Sin resultados» de verdad')
    const con = conPantalla(true, () => R(lista({ cargando: true, songs: [ROW], totalCount: 1 }))); assert.ok(con.includes('Canción de prueba') && con.includes('1 en el repertorio') && !con.includes('--esq'), 'con canciones nunca hay marcador')
    const esc = conPantalla(false, () => R(lista({ cargando: true }))); assert.ok(esc.includes(CAN.sinResultadosTitulo) && esc.includes('0 en el repertorio') && !esc.includes('--esq') && !esc.includes('sr-only'), 'escritorio: igual que siempre') })

  await prueba('lista: CancionesPanel pasa `cargando` a la lista y /admin le entrega `dataLoading` (los datos de verdad)', () => {
    const p = leer('components/canciones/CancionesPanel.tsx'); assert.match(p, /cargando\?: boolean/); assert.match(p, /onReintentarCarga, cargando = false \}: Props\)/); assert.match(p, /onAdd=\{[^\n]*\}\s*cargando=\{cargando\}/)
    assert.match(leer('app/admin/page.tsx'), /isAdmin=\{isOrgAdmin\} cargando=\{dataLoading\}/) })

  await prueba('marcador de la lectura: la barra con «volver» que funciona, el título y el artista de la lista (no inventa nada), el aviso para lectores de pantalla y la hoja en gris; sin la pantalla «Letra»', () => {
    let vuelve = 0; const m = R(h(LecturaEsqueleto, { nombre: 'Canción de prueba', artista: 'Grupo inventado', bpm: 72, etiquetaVolver: 'Canciones', onVolver: () => { vuelve++ } }))
    assert.ok(m.includes('data-esqueleto="lectura"') && m.includes('aria-busy="true"') && m.includes('aria-label="Canciones"') && m.includes('Canción de prueba') && m.includes('Grupo inventado · 72 bpm') && m.includes(ACO.cargandoCancion))
    assert.ok(!m.includes('Cargando letra') && !m.includes('Tipografía') && !m.includes('Adjuntos') && !m.includes('anc-sheet'), 'nada de la pantalla «Letra»'); assert.ok((m.match(/anc-skel /g) || []).length >= 10) })

  await prueba('lectura: en teléfono, esperando, se dibuja el marcador; el orden es lectura → marcador (solo teléfono) → pantalla «Letra» (que conserva «Cargando letra…» para escritorio y tableta)', () => {
    const c = leer('app/portal/_components/CancionPortal.tsx')
    assert.match(c, /\{nueva && acordes && hoja \? \([\s\S]*?\) : telefono && estado === 'cargando' \? \(\s*\/\/[^\n]*\n\s*<LecturaEsqueleto nombre=\{song\.nombre\} artista=\{song\.artista\} bpm=\{song\.bpm\} etiquetaVolver=\{etiquetaVolver\} onVolver=\{onVolver\} \/>\s*\) : \(<>\s*<button type="button" className=\{ui\.back\}/)
    assert.ok(c.includes("{estado === 'cargando' && <p className={ui.state} role=\"status\">Cargando letra…</p>}"), 'escritorio y tableta: lo de siempre') })

  await prueba('editor de canción nueva: el subtítulo usa el tono de la lista mientras carga (no cambia al llegar) y la tira tiene su sitio reservado; CancionesPanel pasa el tono', () => {
    const e = leer('components/canciones/EditorCancionMovil.tsx')
    assert.match(e, /nueva\?: \{ bpm: number \| null; tono\?: string \| null; onDatos: \(\) => void \}/); assert.ok(e.includes("subtituloEditor(estado === 'listo' ? tono : (nueva.tono ?? ''), nueva.bpm)"))
    assert.match(e, /\{nueva && estado !== 'listo' && <div className=\{`\$\{ui\.tiraEditor\} \$\{ui\.tiraEspera\}`\} data-esqueleto="editor" aria-hidden="true"><span className=\{ui\.estructuraCab\} \/><span className=\{ui\.filaEspera\}><span className=\{ui\.circuloEspera\} \/><\/span><\/div>\}/, 'el sitio de la tira, solo en el editor nuevo y solo mientras no está listo')
    assert.ok(leer('components/canciones/CancionesPanel.tsx').includes("tono: editorAcordes.tono_original ?? null"))
    const css = leer('components/canciones/editor-cancion-movil.module.css'); assert.match(css, /\.filaEspera\{ display:flex; padding:0\.5rem 0\.375rem 0\.5rem 14px; \}/); assert.match(css, /\.estructuraCab\{[^}]*min-height:1\.5rem/, 'la cabecera de la estructura reserva su alto'); assert.match(css, /\.circuloEspera\{[^}]*width:max\(44px, 2\.75rem\); height:max\(44px, 2\.75rem\)/) })

  await prueba('estilos: los marcadores de lista y de ficha viven DENTRO de la consulta de teléfono (el escritorio no cambia); songs.css y el CSS del escritorio no los conocen', () => {
    const m = leer('app/songs-movil.css'), fin = m.lastIndexOf('}'), ini = m.indexOf('@media (max-width:768px){')
    for (const k of ['.anc-songRow--esq', '.anc-songEsq__titulo', '.anc-songEsq__cuenta', '.anc-fichaEsq{', '.anc-fichaEsq__linea--corta']) { const i = m.indexOf(k); assert.ok(i > ini && i < fin, `${k} dentro de la consulta de teléfono`) }
    assert.ok(!/anc-fichaEsq|anc-songEsq/.test(leer('app/songs.css')), 'el CSS general no los toca')
    assert.match(m, /\.anc \.anc-fichaEsq\{ display:flex; flex-direction:column;/, 'el marcador de la ficha es visible (columna de huecos)')
    assert.match(m, /\.anc \.anc-panel:has\(> \.anc-fichaEsq\)\{ border-radius:calc\(22px \* var\(--esc, 1\)\); padding:calc\(8px \* var\(--esc, 1\)\); \}/, 'misma tarjeta (radio 22, relleno 8) que la hoja de la ficha') })
  terminar()
})
