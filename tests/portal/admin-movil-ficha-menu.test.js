// Admin móvil, paso 5: el menú «⋯» de la ficha del administrador como hoja desde abajo en teléfono, según el tablero «Ficha admin · Menú ⋯ como hoja»: «Editar datos», «Archivar» y «Eliminar canción». Mismas acciones de siempre;
// el escritorio conserva su menú flotante (Editar, Archivar, Eliminar). Datos inventados; sin red. Correr: `node tests/portal/admin-movil-ficha-menu.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), cp = require('child_process'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const Hoja = require(path.join(RAIZ, 'components/canciones/FichaMenuHoja.tsx')).default, T = require(path.join(RAIZ, 'lib/textos/cancionesAdmin.ts')).TEXTOS_CANCIONES_ADMIN
const ver = () => R(h(Hoja, { nombre: 'Canción de prueba', onCerrar() {}, onEditar() {}, onArchivar() {}, onEliminar() {} }))

correr(async () => {
  await prueba('la hoja: un diálogo modal con el nombre «Acciones para <canción>», la ✕ a la izquierda, el nombre al centro y tres filas en orden: «Editar datos», «Archivar» y «Eliminar canción»', () => {
    const m = ver()
    assert.ok(m.includes('role="dialog"') && m.includes('aria-modal="true"') && m.includes('aria-label="Acciones para Canción de prueba"') && m.includes('data-ficha="menu"'))
    assert.match(m, /<div class="cab"><button type="button" class="cerrar" aria-label="Cerrar"><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg><\/button><h2 class="titulo">Canción de prueba<\/h2><\/div>/)
    const filas = [...m.matchAll(/<button type="button" class="fila[^"]*">[\s\S]*?<\/span>([^<]+)<\/button>/g)].map(x => x[1]); assert.deepEqual(filas, ['Editar datos', 'Archivar', 'Eliminar canción'])
    assert.equal(T.fichaMenuTitulo('X'), 'Acciones para X'); assert.equal(T.fichaMenuEditar, 'Editar datos'); assert.equal(T.fichaMenuArchivar, 'Archivar'); assert.equal(T.fichaMenuEliminar, 'Eliminar canción'); assert.equal(T.fichaMenuCerrar, 'Cerrar') })

  await prueba('solo «Eliminar canción» va en rojo (la clase de peligro) y los íconos están ocultos para los lectores de pantalla', () => {
    const m = ver(); assert.equal((m.match(/class="fila peligro"/g) || []).length, 1); assert.ok(m.indexOf('fila peligro') > m.indexOf('Archivar')); assert.equal((m.match(/class="icono" aria-hidden="true"/g) || []).length, 3) })

  await prueba('solo dibuja y reenvía: sin fetch, sin supabase ni almacenamiento; cada control llama a lo que recibe; Escape y la ✕ y el fondo cierran; el foco entra y vuelve', () => {
    const c = leer('components/canciones/FichaMenuHoja.tsx'), sc = c.replace(/\/\/.*$/gm, ''); assert.ok(!/fetch\(|supabase|localStorage|sessionStorage/.test(sc))
    assert.match(c, /className=\{ui\.cerrar\} onClick=\{onCerrar\}/); assert.match(c, /className=\{ui\.fila\} onClick=\{onEditar\}/); assert.match(c, /className=\{ui\.fila\} onClick=\{onArchivar\}/); assert.match(c, /className=\{`\$\{ui\.fila\} \$\{ui\.peligro\}`\} onClick=\{onEliminar\}/)
    assert.match(c, /className=\{ui\.velo\} onClick=\{onCerrar\}/); assert.match(c, /onClick=\{e => e\.stopPropagation\(\)\}/, 'tocar dentro de la hoja no la cierra'); assert.match(c, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); onCerrar\(\); return \}/)
    assert.match(c, /querySelector<HTMLElement>\('button'\)\?\.focus\(\)/); assert.match(c, /return \(\) => \{ document\.body\.style\.overflow = overflow; previo\?\.focus\?\.\(\) \}/); assert.match(c, /e\.shiftKey && act === f\[0\]/); assert.match(c, /!e\.shiftKey && act === f\[f\.length - 1\]/) })

  await prueba('ficha: en teléfono el «⋯» abre la hoja y cada fila hace lo de SIEMPRE (editar: abrir la edición de esa canción; archivar: archiveSong y volver a la lista; eliminar: deleteSong —que pregunta— y volver a la lista); todas cierran la hoja', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /\{telefono && view==='chart' && selectedSong && showDetailMenu && \(\s*<FichaMenuHoja nombre=\{selectedSong\.nombre\} onCerrar=\{\(\)=>setShowDetailMenu\(false\)\}\s*onEditar=\{\(\)=>\{setEditing\(\{\.\.\.selectedSong\}\);setShowDetailMenu\(false\)\}\}\s*onArchivar=\{\(\)=>\{archiveSong\(selectedSong\.id\);setShowDetailMenu\(false\);setView\('list'\)\}\}\s*onEliminar=\{\(\)=>\{deleteSong\(selectedSong\.id\);setShowDetailMenu\(false\);setView\('list'\)\}\} \/>/)
    assert.match(p, /const botonMas = selectedSong && \(\s*<button type="button" className="anc-rowMore" style=\{\{opacity:1\}\} aria-label="Más acciones de la canción" aria-haspopup="dialog" aria-expanded=\{showDetailMenu\} onClick=\{\(\)=>setShowDetailMenu\(v=>!v\)\}>\s*<MoreHorizontal size=\{16\}\/>/)
    assert.match(p, /<FichaCabeceraMovil cancion=\{selectedSong\}[^\n]*\}>\s*\{botonMas\}\s*<\/FichaCabeceraMovil>/, 'en teléfono la cabecera lleva el botón que abre la hoja, no el menú flotante')
    assert.ok(p.includes("import FichaMenuHoja from './FichaMenuHoja'")); assert.equal((p.match(/<FichaMenuHoja/g) || []).length, 1) })

  await prueba('escritorio: sigue el menú flotante de siempre (Editar, Archivar, Eliminar, con el mismo código) y la acción de «Archivar» y «Eliminar» es la misma que la de la hoja', () => {
    const p = leer('components/canciones/CancionesPanel.tsx')
    assert.match(p, /const menuDetalle = selectedSong && \(\s*<div style=\{\{position:'relative',zIndex:41\}\}>[\s\S]*?<MenuFlotante titulo=\{`Acciones para \$\{selectedSong\.nombre\}`\} onCerrar=\{\(\)=>setShowDetailMenu\(false\)\} capa=\{41\}>[\s\S]*?>Editar<\/button>[\s\S]*?>Archivar<\/button>[\s\S]*?>Eliminar<\/button>\s*<\/MenuFlotante>/)
    assert.match(p, /<div style=\{\{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14\}\}>\s*<button className="anc-btn anc-btn--quiet" onClick=\{\(\)=>setView\('list'\)\}>← Canciones<\/button>\s*\{menuDetalle\}/)
    assert.equal((p.match(/archiveSong\(selectedSong\.id\);setShowDetailMenu\(false\);setView\('list'\)/g) || []).length, 2, 'la misma acción en el menú y en la hoja'); assert.equal((p.match(/deleteSong\(selectedSong\.id\);setShowDetailMenu\(false\);setView\('list'\)/g) || []).length, 2) })

  await prueba('estilos: la hoja usa solo tokens y rem (44 px de zona táctil), va por encima de todo (z 70, como el menú del círculo), con radio 26 arriba y filas de 54; el CSS del escritorio no la conoce', () => {
    const c = leer('components/canciones/ficha-menu-hoja.module.css'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(c), 'sin colores sueltos'); assert.ok(!/\d+(\.\d+)?px/.test(c.replace(/max\(44px,/g, '').replace(/0px\)/g, '')), 'solo rem (y los 44 px)')
    assert.match(c, /\.velo\{ position:fixed; inset:0; z-index:70;/); assert.match(c, /border-radius:1\.625rem 1\.625rem 0 0/); assert.match(c, /\.fila\{[^}]*min-height:max\(44px, 3\.375rem\)[^}]*border-radius:1rem/); assert.match(c, /\.cerrar\{[^}]*width:max\(44px, 2\.75rem\); height:max\(44px, 2\.75rem\)[^}]*border-radius:50%/)
    assert.match(c, /\.peligro, \.peligro \.icono\{ color:var\(--anc-no\); \}/); assert.ok(!/ficha-menu-hoja|FichaMenuHoja/.test(leer('app/songs.css') + leer('app/songs-movil.css'))) })

  await prueba('lo que no cambia: LyricSheet, HojaAcordes, FichaConAcordes, MenuFlotante y el menú de las canciones de la lista siguen como en el paso 3', () => {
    if (cp.spawnSync('git', ['cat-file', '-e', 'dd4bec3^{commit}'], { cwd: RAIZ }).status !== 0) return
    for (const f of ['components/canciones/LyricSheet.tsx', 'components/canciones/HojaAcordes.tsx', 'components/canciones/FichaConAcordes.tsx', 'components/MenuFlotante.tsx', 'components/menuFlotante.module.css']) assert.equal(cp.spawnSync('git', ['diff', '--quiet', 'dd4bec3', '--', f], { cwd: RAIZ }).status, 0, f)
    assert.ok(leer('components/canciones/CancionesPanel.tsx').includes('<MenuFlotante titulo={`Acciones para ${s.nombre}`} onCerrar={()=>setMenuForId(null)} capa={50} puntoDeClic={menuPos}>'), 'el menú de la fila de la lista no cambia') })
  terminar()
})
