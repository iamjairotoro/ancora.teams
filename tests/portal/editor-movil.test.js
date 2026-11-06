// Etapa C2 (pantalla): el editor móvil de acordes. Se dibuja de verdad (react-dom/server) y se revisa su código: nada se guarda hasta Guardar, mensajes, campos de 16 px, áreas de 44 px, entrada solo en teléfono y para administración.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const Editor = require(path.join(RAIZ, 'components/canciones/EditorCancionMovil.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const fuente = sinComentarios(leer('components/canciones/EditorCancionMovil.tsx'))
const css = leer('components/canciones/editor-cancion-movil.module.css')

correr(async () => {
  await prueba('se dibuja como diálogo de pantalla completa con Cancelar y Guardar; mientras carga, Guardar está desactivado y no hay modos ni campos', () => {
    const h = renderToStaticMarkup(React.createElement(Editor, { songId: 'x', titulo: 'Grande es tu fidelidad', onCerrar() {}, onGuardado() {} }))
    assert.ok(/role="dialog"[^>]*aria-modal="true"[^>]*aria-label="Grande es tu fidelidad"/.test(h)); assert.ok(h.includes('‹ Cancelar') && h.includes('>Guardar<')); assert.ok(/<button[^>]*disabled=""[^>]*>Guardar<\/button>/.test(h)); assert.ok(!h.includes('<textarea') && !h.includes('<select')) })
  await prueba('NADA se guarda hasta pulsar Guardar: solo hay dos peticiones en todo el editor (leer al abrir y guardar) y ninguna dentro de los manejadores que cambian el documento', () => {
    assert.equal((fuente.match(/fetch\(/g) || []).length, 2); assert.ok(/const cargar = useCallback\(async \(\) => \{[\s\S]*?fetch\(`\/api\/admin\/canciones\/acordes\?id=/.test(fuente))
    assert.ok(/const guardar = async \(\) => \{[\s\S]*?fetch\('\/api\/admin\/canciones\/acordes', \{ method: 'POST'/.test(fuente))
    for (const nombre of ['alEscribir', 'agregarSeccion', 'pedirTono', 'cancelar']) { const m = new RegExp(`const ${nombre} = [\\s\\S]*?\\n  (?=const |useEffect|\\n)`).exec(fuente); assert.ok(m, nombre); assert.ok(!/fetch\(/.test(m[0]), nombre + ' no llama a la red') }
    assert.ok(!/localStorage|sessionStorage|navigator\.sendBeacon/.test(fuente), 'ni siquiera un borrador a escondidas') })
  await prueba('mensajes: sin tono, Guardar muestra «Para guardar con acordes, elige el tono de la canción» y no envía nada; Cancelar con cambios pregunta «¿Descartar los cambios?»; cambiar el tono con acordes pide confirmación', () => {
    assert.ok(/if \(!tono\) \{ setError\(T\.faltaTono\);[^}]*\}\s*[\s\S]*?return \}/.test(fuente) && /const guardar[\s\S]*?if \(!tono\)[\s\S]*?return[\s\S]*?setGuardando\(true\)/.test(fuente), 'se corta antes de guardar')
    assert.ok(fuente.includes("const cancelar = () => (sucio ? setDialogo({ tipo: 'salir' }) : onCerrar())")); assert.ok(/if \(doc\.anclas\.length \|\| doc\.interludios\.length\) setDialogo\(\{ tipo: 'tono', a \}\)/.test(fuente))
    assert.ok(fuente.includes('T.cambiarTonoCuerpo(tono, dialogo.a)') && fuente.includes('T.cambiarTonoSi') && fuente.includes('T.descartar')); const t = leer('lib/textos/editorAcordes.ts')
    assert.ok(t.includes("'Para guardar con acordes, elige el tono de la canción'") && t.includes("'¿Descartar los cambios?'")); assert.ok(t.includes('quitados: (n: number) => (n === 1 ?') && t.includes('Se quitaron ${n} acordes')) })
  await prueba('Deshacer y Rehacer: botones de 44 px conectados al historial; una foto por acción; el aviso «Se quitaron N acordes» sale de la edición', () => {
    assert.ok(/aria-label=\{T\.deshacer\} disabled=\{!puedeDeshacer\(hist\)\} onClick=\{\(\) => \{ setHist\(deshacer\)/.test(fuente) && /aria-label=\{T\.rehacer\} disabled=\{!puedeRehacer\(hist\)\} onClick=\{\(\) => \{ setHist\(rehacer\)/.test(fuente))
    assert.ok(fuente.includes('const r = cambiarTexto(doc, valor, caret)') && fuente.includes('avisarQuitados(r.quitados)') && fuente.includes('registrar(h, r.doc, linea)')); assert.ok(/\.icono\{[^}]*min-height:44px;[^}]*min-width:44px/.test(css)) })
  await prueba('campos y toques: el selector del tono y el cuadro de la letra miden 16 px literal; modos, chips, botones y diálogos miden 44 px o más; sin maximum-scale ni user-scalable=no', () => {
    assert.ok(/\.tono select\{[^}]*font-size:16px/.test(css) && /\.area\{[^}]*font-size:16px/.test(css))
    for (const clase of ['\\.texto', '\\.modos button', '\\.chips button', '\\.botones button', '\\.tono select']) assert.ok(new RegExp(`${clase}\\{[^}]*min-height:44px`).test(css), clase)
    assert.ok(!/maximum-scale|user-scalable/i.test(fuente + css + leer('lib/textos/editorAcordes.ts'))); assert.ok(!/en vivo|al instante/i.test(fuente + leer('lib/textos/editorAcordes.ts'))) })
  await prueba('el selector de tono ofrece «Sin tono» y los tonos de lib/tonos.ts (mayores y menores); la sección «Instrumental» y las demás se agregan sin tocar los acordes de antes', () => {
    assert.ok(fuente.includes("import { TONOS } from '@/lib/tonos'") && fuente.includes('{TONOS.map(t => <option key={t} value={t}>{t}</option>)}') && fuente.includes('{T.sinTono}'))
    assert.ok(/agregarSeccionInstrumental\(doc\)/.test(fuente) && /aplicarEdicion\(doc, \{ s: T0\.length, e: T0\.length/.test(fuente)) })
  await prueba('la entrada «Editar con acordes» solo aparece en teléfono y para administración; el escritorio y la tableta quedan como estaban', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.ok(p.includes('{telefono && isAdmin && <button className="anc-btn anc-btn--quiet" onClick={()=>setEditorAcordes(selectedSong)}>{TEXTOS_EDITOR.entrada}</button>}'))
    assert.equal((p.match(/setEditorAcordes\(/g) || []).length, 3, 'abrir, cerrar y guardar'); assert.ok(p.includes('<EditorCancionMovil songId={editorAcordes.id}'))
    assert.ok(p.includes("const telefono = useTelefonoYa()")) })
  terminar()
})
