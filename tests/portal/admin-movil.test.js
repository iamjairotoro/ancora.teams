// Administración en teléfono (bloque B7, una sección por pantalla): medidas del resto de la app, todo detrás de la media query (el escritorio no cambia). Correr: `node tests/portal/admin-movil.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const crudo = fs.readFileSync(path.join(RAIZ, 'app/admin-movil.css'), 'utf8'), css = crudo.replace(/\/\*[\s\S]*?\*\//g, ''), esc = px => `calc(${px}px * var(--esc, 1))`
const regla = sel => { const i = css.indexOf(sel + '{'); if (i < 0) throw new Error('falta ' + sel); return css.slice(i + sel.length + 1, css.indexOf('}', i)) }
const fuente = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const clases = (f, lista) => { const t = fuente(f); for (const c of lista) assert.ok(t.includes(c), f + ' no tiene la clase ' + c) }
correr(async () => {
  await prueba('TODO el CSS está dentro de @media (max-width:768px), solo tokens, y app/layout.tsx lo importa', async () => {
    const t = css.trim(); assert.ok(t.startsWith('@media (max-width:768px){') && t.endsWith('}')); let d = 0, fuera = ''; for (const ch of t) { if (ch === '{') d++; if (d === 0) fuera += ch; if (ch === '}') d-- }
    assert.equal(fuera.trim(), '@media (max-width:768px)'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css)); assert.ok(fuente('app/layout.tsx').includes("import './admin-movil.css'")) })
  await prueba('Personas › Admins: secciones de radio 22, filas con correo 16/600 y texto 13 gris, «Quitar», «Sincronizar avisos» y «+ Agregar» de 46 (radio 13), campo de radio 12 con 16 px', async () => {
    assert.ok(regla('.am-ad-seccion').includes(`border-radius:${esc(22)}`)); assert.ok(regla('.am-ad-correo').includes(`font-size:${esc(16)}`) && regla('.am-ad-correo').includes('font-weight:600')); assert.ok(regla('.am-ad-sub').includes(`font-size:max(11px, ${esc(13)})`))
    for (const c of ['.am-ad-quitar', '.am-ad-sync', '.am-ad-agregar']) assert.ok(regla(c).includes(`min-height:max(44px, ${esc(46)})`), c); assert.ok(regla('.am-ad-quitar').includes(`border-radius:${esc(13)}`) && regla('.am-ad-agregar').includes(`border-radius:${esc(13)}`))
    const k = regla('.am-ad-campo'); assert.ok(k.includes(`border-radius:${esc(12)}`) && k.includes('font-size:16px !important') && k.includes(`min-height:max(44px, ${esc(46)})`))
    clases('components/AdminsPanel.tsx', ['am-ad-seccion', 'am-ad-cab', 'am-ad-fila', 'am-ad-correo', 'am-ad-sub', 'am-ad-quitar', 'am-ad-sync', 'am-ad-campo', 'am-ad-agregar']) })
  terminar()
})
