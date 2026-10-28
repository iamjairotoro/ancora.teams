// Equipos y detalle de un equipo (teléfono): misma escala y tonos de texto que Personas; el escritorio no cambia. Correr: `node tests/portal/fuentes-equipos.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
correr(async () => {
  await prueba('ui.module.css: el bloque de teléfono (≤768) fija tamaños en px × --esc con piso de 11 px reales y tonos --anc-ink-*; solo dentro de @media', async () => {
    const css = leer('components/ui.module.css'), m = css.indexOf('/* Teléfono: la letra del panel de Equipos'), i = css.indexOf('@media (max-width:768px){', m), bloque = css.slice(i, css.indexOf('/* Teléfono (B7)', i))
    assert.ok(m > 0 && i > m)
    for (const k of ['.pageHead h1', '.sub', '.crumb', '.btn', '.treeTop, .treePos', '.treeN', '.treeLabel', '.tblHead', '.name', '.email', '.chip', '.tagLeader', '.avatar']) assert.ok(bloque.includes(k + '{'), k)
    assert.ok(!/font-size:[^;]*\brem\b/.test(bloque.replace(/\.pageHead h1\{[^}]*\}/, '')), 'solo el título usa rem (como Personas: 2.125rem)'); assert.ok(/\.pageHead h1\{ font-size:2\.125rem; line-height:1\.1; letter-spacing:-\.02em;/.test(bloque))
    const tamanos = [...bloque.matchAll(/font-size:([^;]+);/g)].map(m => m[1]).filter(v => !/rem/.test(v)); assert.ok(tamanos.length >= 12 && tamanos.every(v => /^max\(11px, calc\(\d+(\.\d+)?px \* var\(--esc, 1\)\)\)$/.test(v)), 'todos con piso de 11 px: ' + tamanos.join(' | '))
    assert.ok(/color:var\(--anc-ink-3\)/.test(bloque) && !/var\(--ink/.test(bloque), 'tonos del sistema de teléfono (--anc-ink-*), no los v3') })
  await prueba('mismo título que Personas: 2.125rem / 1.1 / -.02em (personas-panel.module.css), y el panel «Equipos» lo usa solo en teléfono', async () => {
    const pp = leer('components/personas/personas-panel.module.css'); assert.ok(/\.titulo\{ font-size:2\.125rem; line-height:1\.1; letter-spacing:-\.02em;/.test(pp))
    const t = leer('components/TeamsAdminPanel.tsx'); assert.ok(/const estiloTituloEquipos: React\.CSSProperties = telefonoYa\s*\? \{ fontSize:'2\.125rem', lineHeight:1\.1, fontWeight:700, color:'var\(--anc-ink\)', letterSpacing:'-\.02em'/.test(t))
    assert.equal((t.match(/style=\{estiloTituloEquipos\}>Equipos<\/h2>/g) || []).length, 3, 'los tres títulos «Equipos»'); assert.ok(!/fontSize:15\.5,fontWeight:700,color:'var\(--ink\)',letterSpacing:'-0\.012em',marginBottom:2\}>Equipos/.test(t))
    assert.ok(/: \{ fontSize:15\.5, fontWeight:700, color:'var\(--ink\)', letterSpacing:'-0\.012em', marginBottom:2 \}/.test(t), 'escritorio: el estilo de siempre') })
  await prueba('la lista de equipos (nombres, conteos y «Agregar equipo») usa la misma letra solo en teléfono; escritorio con los valores de siempre', async () => {
    const x = leer('components/TeamsAdminPanel.tsx'); assert.ok(/const letraTel = \(px: number\): string \| number => telefonoYa \? `max\(11px, calc\(\$\{px\}px \* var\(--esc, 1\)\)\)` : px/.test(x))
    assert.ok(/fontSize:letraTel\(12\.5\),fontWeight:600,color:tonoNombreTel/.test(x) && (x.match(/fontSize:letraTel\(12\),color:tonoTel/g) || []).length === 3 && /fontSize:letraTel\(10\.5\),fontWeight:700,color:tonoTel/.test(x)); assert.ok(/const tonoTel = telefonoYa \? 'var\(--anc-ink-3\)' : 'var\(--ink-3\)'/.test(x)) })
  terminar()
})
