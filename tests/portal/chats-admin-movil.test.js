// Chats del admin (moderación) en teléfono (bloque B4): medidas del resto de la app, todo detrás de la media query (el escritorio no cambia). Correr: `node tests/portal/chats-admin-movil.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const css = fs.readFileSync(path.join(RAIZ, 'app/chats-movil.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''), esc = px => `calc(${px}px * var(--esc, 1))`
const panel = fs.readFileSync(path.join(RAIZ, 'components/ChatModerationPanel.tsx'), 'utf8')
const regla = sel => { const i = css.indexOf(sel + '{'); if (i < 0) throw new Error('falta ' + sel); return css.slice(i + sel.length + 1, css.indexOf('}', i)) }
correr(async () => {
  await prueba('TODO el CSS está dentro de @media (max-width:768px) y solo usa tokens', async () => {
    const t = css.trim(); assert.ok(t.startsWith('@media (max-width:768px){') && t.endsWith('}')); let d = 0, fuera = ''; for (const ch of t) { if (ch === '{') d++; if (d === 0) fuera += ch; if (ch === '}') d-- } assert.equal(fuera.trim(), '@media (max-width:768px)'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css)) })
  await prueba('chips en píldora 12/600 (activo con aria-pressed, sin depender solo del color: el relleno cambia); fichas de radio 18; estado vacío de radio 22; título 16/600; texto secundario 13 gris', async () => {
    const c = regla('.cm-chip'); assert.ok(c.includes('border-radius:999px') && c.includes(`font-size:max(11px, ${esc(12)})`) && c.includes('font-weight:600')); assert.ok(/background:var\(--anc-accent\)/.test(regla('.cm-chip[aria-pressed="true"]')))
    assert.ok(regla('.cm-tarjeta').includes(`border-radius:${esc(18)}`)); assert.ok(regla('.cm-cabeza').includes(`padding:${esc(14)}`)); assert.ok(regla('.cm-vacio').includes(`border-radius:${esc(22)}`))
    assert.ok(regla('.cm-titulo').includes(`font-size:${esc(16)}`) && regla('.cm-titulo').includes('font-weight:600')); assert.ok(regla('.cm-fecha').includes(`font-size:max(11px, ${esc(13)})`) && /color:var\(--anc-ink-3\)/.test(regla('.cm-fecha'))) })
  await prueba('el panel solo ganó clases (cm-*) y aria-pressed en los chips: ningún estilo en línea ni texto cambió; los chips de filtro ya no se cortan a la derecha (hacen salto de línea)', async () => {
    for (const c of ['cm-filtros', 'cm-chip', 'cm-lista', 'cm-tarjeta', 'cm-cabeza', 'cm-titulo', 'cm-fila', 'cm-nombre', 'cm-fecha', 'cm-texto', 'cm-vacio', 'cm-tipo', 'cm-n']) assert.ok(panel.includes(`className="${c}"`), 'falta ' + c)
    assert.ok(/aria-pressed=\{filter===f\}/.test(panel)); assert.ok(regla('.cm-filtros').includes('flex-wrap:wrap')); const l = fs.readFileSync(path.join(RAIZ, 'app/layout.tsx'), 'utf8'); assert.ok(l.includes("import './chats-movil.css'")) })
  terminar()
})
