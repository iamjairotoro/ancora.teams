// Tipografía, pasos 0 y 1: en los CSS de teléfono (lista en scripts/verificacion/css-telefono.js) NO vuelve a haber font-weight ni font-size sueltos: todo sale de los tokens de app/ancora-tipo.css, y cada token vale lo que valía
// el valor al que reemplazó (sin diferencia visible). Excepciones de font-size que se quedan a propósito: valores que dependen de otra variable que NO es --esc (--anc-letra-size, --nav-label-size, --ac-fs…) o de em. Sin base de datos.
const assert = require('node:assert/strict'), path = require('path')
const cp = require('child_process'), { leerCrudo, cargar } = require('./_tokens.js'), { archivos, R } = require('../../scripts/verificacion/css-telefono.js')
const leer = f => leerCrudo(path.join(R, f), 'utf8'), sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
const tokens = cargar(), lista = archivos()
console.log('tipografía: tokens (paso 0)')
t('hay unos 70 CSS de teléfono (con el calendario compartido) y el archivo de tokens existe', () => { assert.ok(lista.length >= 60, String(lista.length)); assert.ok(Object.keys(tokens).length > 60) })
t('los pesos valen 400, 500, 600, 700 y 800 (los de siempre)', () => assert.deepEqual(['normal', 'medio', 'fuerte', 'negrita', 'negra'].map(k => tokens['--w-' + k]), ['400', '500', '600', '700', '800']))
t('ningún token se apoya en otra variable que no sea --esc (así valen lo mismo que el valor suelto)', () => { for (const [k, v] of Object.entries(tokens)) assert.ok(!/var\(--(?!esc\b)/.test(v), `${k}: ${v}`) })
t('ningún font-weight suelto en los CSS de teléfono', () => { for (const f of lista) for (const m of sinComentarios(leer(f)).matchAll(/font-weight\s*:\s*([^;}!]+)/g)) assert.ok(/^var\(--w-(normal|medio|fuerte|negrita|negra)(--[a-z]+)?\)$/.test(m[1].trim()) || m[1].trim() === 'inherit', `${f}: font-weight:${m[1]}`) })
t('ningún font-size literal suelto en los CSS de teléfono', () => { for (const f of lista) for (const m of sinComentarios(leer(f)).matchAll(/font-size\s*:\s*([^;}!]+)/g)) { const v = m[1].trim(); assert.ok(/^var\(--fs-[\w-]+\)$/.test(v) || /var\(--(anc-letra-size|nav-label-size|ac-fs)|[\d.]em\b|^inherit$/.test(v), `${f}: font-size:${v}`) } })
t('cada token que se usa está definido, y cada token definido se usa (o es la base de una variante «--rol»)', () => {
  const usados = new Set(); for (const f of lista) for (const m of leer(f).matchAll(/var\((--(?:w|fs)-[\w-]+)\)/g)) usados.add(m[1])
  for (const u of usados) assert.ok(u in tokens, `${u} sin definir`)
  for (const k of Object.keys(tokens)) assert.ok(usados.has(k) || [...usados].some(u => u.startsWith(k + '--')), `${k} definido y sin uso`)
})
t('los CSS compartidos con el escritorio y los estilos en línea no se tocaron (sin tokens de tipografía)', () => { for (const f of ['app/globals.css', 'app/songs.css', 'components/app.module.css', 'components/ui.module.css', 'app/ancora-tokens-v5.css', 'components/canciones/linea-con-acordes.module.css']) assert.ok(!/var\(--(w|fs)-/.test(leer(f)), f) })
t('app/layout.tsx importa los tokens después de los de colores', () => { const l = leer('app/layout.tsx'); assert.ok(l.indexOf("'./ancora-tipo.css'") > l.indexOf("'./ancora-tokens-v5.css'") && l.includes("'./ancora-tipo.css'")) })
// ── paso 1: roles y superficies, SOLO en teléfono ──
const crudo = leer('app/ancora-tipo.css'), [defecto, telefono] = crudo.split('/* === TELÉFONO')
const tel = (telefono || '').replace(/^[^\n]*\n/, '')
const ROLES = Object.fromEntries([...tel.matchAll(/--t-(\w+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]))
t('los valores nuevos viven solo dentro de @media (max-width:768px); el bloque por defecto no tiene roles', () => { assert.ok(/^\s*@media \(max-width:768px\)/.test(tel)); assert.ok(!/--t-/.test(defecto)) })
t('hay diez roles de tamaño y ninguno baja de 11 px reales (piso de 12 px para etiquetas)', () => { assert.deepEqual(Object.keys(ROLES), ['minimo', 'etiqueta', 'secundario', 'cuerpo', 'nombre', 'seccion', 'grande', 'fecha', 'cifra', 'titulo'])
  const real = v => { const r = v.match(/^max\((\d+)px, ([\d.]+)rem\)$/); return r ? Math.max(+r[1], +r[2] * 13.6) : parseFloat(v) * 13.6 }
  for (const [k, v] of Object.entries(ROLES)) assert.ok(real(v) >= 11, `${k}: ${v}`); assert.equal(real(ROLES.etiqueta), 12); assert.equal(ROLES.fecha, '1.5rem'); assert.equal(ROLES.titulo, '2.125rem') })
t('en teléfono 600, 700 y 800 valen 500; el 600 solo en cifras y botón principal (--w-…--cifra y --w-…--principal)', () => {
  assert.match(tel, /--w-fuerte: 500; --w-negrita: 500; --w-negra: 500;/)
  const seis = [...tel.matchAll(/(--w-[\w-]+):\s*600;/g)].map(m => m[1]); assert.ok(seis.length >= 3); for (const k of seis) assert.match(k, /--(cifra|principal)$/, k)
  assert.ok(!/:\s*(700|800)\s*;/.test(tel)) })
t('todo token de tamaño tiene su rol en teléfono (salvo --fs-16px, los campos de texto que no bajan de 16 px)', () => {
  const dflt = cargar(); for (const k of Object.keys(dflt).filter(k => k.startsWith('--fs-') && k !== '--fs-16px')) { const m = tel.match(new RegExp(k.replace(/[-]/g, '\\-') + ':\\s*var\\(--t-(\\w+)\\)')); assert.ok(m && m[1] in ROLES, k) } })
t('el escritorio no cambia: cada token del paso 0 vale por defecto lo mismo que antes', () => { const base = cp.spawnSync('git', ['show', 'c577fd9:app/ancora-tipo.css'], { cwd: R, encoding: 'utf8' }); if (base.status !== 0) return
  const antes = Object.fromEntries([...base.stdout.matchAll(/(--(?:w|fs)-[\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()])), ahora = cargar(); for (const [k, v] of Object.entries(antes)) assert.equal(ahora[k], v, k) })
t('--anc-e1 es el aro de 1 px y --anc-e2 se suaviza, solo en teléfono; ancora-tokens-v5.css (escritorio) no cambió', () => {
  assert.match(tel, /:root:root:root \{\s*--anc-e1: 0 0 0 1px var\(--anc-ring\);\s*--anc-e2: 0 0 0 1px var\(--anc-ring\), 0 6px 18px -10px rgba\(0,0,0,\.28\);/)
  assert.ok(!/--anc-e1/.test(defecto.replace(/\/\*[\s\S]*?\*\//g, ''))); assert.match(leer('app/ancora-tokens-v5.css'), /--anc-e1:0 0 0 1px rgba\(0,0,0,\.06\), 0 1px 3px rgba\(0,0,0,\.08\), 0 10px 28px -8px rgba\(0,0,0,\.18\);/) })
t('el calendario compartido usa los tokens y los días de otro mes van en peso normal solo en teléfono', () => { const c = leer('components/team-blocks-calendar.module.css'); assert.ok(/var\(--fs-/.test(c) && /var\(--w-/.test(c)); assert.match(c, /@media \(max-width:768px\)\{ \.out \.n\{ font-weight:var\(--w-normal\); \}/) })
t('los chips neutros pasan a texto sin relleno solo en teléfono; los de aviso, «Tu equipo» y estado conservan el fondo', () => { const p = leer('components/servicio-movil/pantallas.module.css')
  assert.match(p, /@media \(max-width:768px\)\{ \.chip\{ background:none;/); assert.match(p, /\.chipEstado\{ background:var\(--anc-sunk\)/); assert.match(p, /\.chipFalta\{ background:var\(--anc-pe-bg\)/); assert.match(p, /\.tuEquipo\{[^}]*background:var\(--anc-modo-chip-bg/)
  assert.match(leer('components/servicio-movil/PantallaServicio.tsx'), /ui\.chip\} \$\{ui\.chipEstado\}/) })
t('Plus Jakarta Sans no se precarga (en teléfono no se usa); se descarga solo donde el escritorio la pide', () => assert.match(leer('app/layout.tsx'), /Plus_Jakarta_Sans\(\{[^}]*preload:\s*false/))
console.log(`${n} comprobaciones OK`)
