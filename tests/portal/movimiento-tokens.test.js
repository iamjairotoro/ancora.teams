// Movimiento, etapa M0: las duraciones y la curva se definen UNA vez (app/globals.css) con los valores acordados; ningún otro archivo las redefine; y los CSS que ya animan con tokens (lista en
// scripts/verificacion/css-con-movimiento-por-tokens.js, hoy vacía) no llevan duraciones sueltas ni animan nada que no sea transform y opacity. La regla global de «reducir movimiento» sigue. Sin base de datos.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
// Quita los bloques @media (min-width:769px){…}: son el escritorio, que sigue con sus animaciones de siempre (las de teléfono son las que se miden).
const sinEscritorio = t => { let r = t, i; while ((i = r.indexOf('@media (min-width:769px)')) >= 0) { let d = 0, j = r.indexOf('{', i); for (; j < r.length; j++) { if (r[j] === '{') d++; else if (r[j] === '}' && --d === 0) break } r = r.slice(0, i) + r.slice(j + 1) } return r }
const lista = require('../../scripts/verificacion/css-con-movimiento-por-tokens.js')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: tokens (M0)')
const g = sinComentarios(leer('app/globals.css'))
const def = Object.fromEntries([...g.matchAll(/(--anc-(?:dur|ease)-[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
t('los tokens existen con los valores acordados (120 / 160 / 240 / 280 ms y la curva de las hojas)', () => {
  assert.equal(def['--anc-dur-press'], '120ms'); assert.equal(def['--anc-dur-fast'], '160ms'); assert.equal(def['--anc-dur-sheet'], '240ms'); assert.equal(def['--anc-dur-screen'], '280ms'); assert.equal(def['--anc-ease-drawer'], 'cubic-bezier(.32,.72,0,1)') })
t('la salida de las hojas es más rápida que la entrada y «reducir movimiento» tiene su duración corta', () => { const ms = k => parseInt(def[k]); assert.ok(ms('--anc-dur-sheet-out') < ms('--anc-dur-sheet')); assert.ok(ms('--anc-dur-reduced') <= ms('--anc-dur-fast')); assert.deepEqual(Object.keys(def).sort(), ['--anc-dur-fast', '--anc-dur-press', '--anc-dur-reduced', '--anc-dur-screen', '--anc-dur-sheet', '--anc-dur-sheet-out', '--anc-ease-drawer']) })
t('están en :root (valen igual en claro, oscuro, teléfono y escritorio) y en ningún otro archivo', () => {
  assert.match(g, /:root\s*\{\s*--anc-dur-press/)
  const otros = []; const recorrer = d => { for (const e of fs.readdirSync(path.join(R, d), { withFileTypes: true })) { if (['node_modules', '.next', '.git', 'tests', 'docs'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) recorrer(p); else if (/\.(css|tsx?)$/.test(e.name) && p !== 'app/globals.css' && /--anc-dur-[\w-]+\s*:/.test(leer(p))) otros.push(p) } }
  recorrer('app'); recorrer('components'); recorrer('lib'); assert.deepEqual(otros, [], 'redefinidos en: ' + otros.join(', ')) })
t('la regla global de «reducir movimiento» sigue en pie', () => assert.match(g, /@media \(prefers-reduced-motion:reduce\)\s*\{\s*\*\{\s*transition:none !important;\s*animation:none !important;/))
t('los CSS que animan con tokens no llevan duraciones sueltas ni animan más que transform y opacity', () => {
  const mal = []
  for (const { archivo: f, propiedades, solo } of lista) {
    let css = sinEscritorio(sinComentarios(leer(f)))
    if (solo) css = [...css.matchAll(/(^|[{}])\s*([^{}@]+)\{([^{}]*)\}/g)].filter(m => solo.some(k => m[2].split(',').some(sel => sel.trim() === k))).map(m => `${m[2]}{${m[3]}}`).join('\n')
    for (const m of css.matchAll(/(?:^|[;{\s])(transition|animation)(-duration)?\s*:\s*([^;}]+)/g)) {
      if (/^none( !important)?$/.test(m[3].trim())) continue
      for (const d of m[3].matchAll(/(?<![\w.-])(\d*\.?\d+)(m?s)\b/g)) mal.push(`${f}: duración suelta ${d[0]} en «${m[3].trim().slice(0, 50)}»`)
      if (m[1] === 'transition' && !m[2]) for (const p of m[3].split(',')) { const prop = p.trim().split(/\s+/)[0]; if (prop && !['transform', 'opacity', 'scale', 'translate', ...(propiedades || [])].includes(prop)) mal.push(`${f}: anima «${prop}»`) }
    }
  }
  assert.deepEqual(mal, [], '\n' + mal.join('\n')) })
console.log(`${n} comprobaciones OK`)
