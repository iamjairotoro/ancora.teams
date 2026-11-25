// Chats en teléfono · estilo de botones (referencias taller-estilo.html y canciones-tarjetas.html). Paso 1: LA LISTA (tarjetas por conversación separadas 8 px, ficha BETA, ficha «Sin leer», botón ancho con «+», títulos de sección con el peso y tamaño de etiqueta).
// Solo teléfono: el marcado distinto se dibuja solo con useTelefonoYa y todo el CSS va dentro de @media (max-width:768px); el escritorio y la tablet no cambian. La medición en un navegador real está en tests/e2e-menus/chats-estilo.js.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, ''), plano = t => sinCom(t).replace(/\s+/g, ' ')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('estilo: Chats en teléfono · la lista')
const tsx = plano(leer('app/portal/_components/chats/ListaChats.tsx')), css = leer('app/portal/_components/chats/chats.module.css')
const iL = css.lastIndexOf('/*', css.indexOf('LA LISTA DE CHATS')), iV = css.indexOf('/* la vista de un chat */')
const lista = sinCom(css.slice(iL, iV)), fuera = plano(css.slice(0, iL))   // el bloque de teléfono de la lista, y todo lo anterior (reglas de siempre)
const tel = lista.slice(lista.indexOf('@media (max-width:768px){'))

t('el CSS nuevo de la lista va SOLO dentro de @media (max-width:768px) (salvo .soloLectores, que nada usa en escritorio); lo de siempre no se tocó', () => {
  assert.ok(iL > 0 && iV > iL); const fueraDelMedia = lista.slice(0, lista.indexOf('@media (max-width:768px){')).replace(/\s+/g, ' ').trim()
  assert.equal(fueraDelMedia, '.soloLectores{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }')
  assert.match(fuera, /\.tarjeta\{ list-style:none; margin:0; padding:0; border-radius:1rem; background:var\(--anc-panel\); box-shadow:var\(--anc-e1\); overflow:hidden; \}/)
  assert.match(fuera, /\.beta\{ display:flex; align-items:center; gap:0\.5rem; margin:0; padding:0\.5625rem 0\.75rem; border-radius:var\(--anc-r-s\); background:var\(--anc-sunk\)/)
  assert.match(fuera, /\.fila\{ width:100%; box-sizing:border-box; display:flex; align-items:center; gap:0\.75rem; min-height:4\.25rem; padding:0\.625rem 1rem;/); assert.match(fuera, /\.punto\{ flex:none; width:0\.625rem;/) })
t('cada conversación en su propia tarjeta: separadas 8 px (0,588 rem), radio y relleno de las tarjetas de Canciones, sin la caja única; el botón de «Nuevo mensaje directo» no es tarjeta', () => {
  const p = plano(tel)
  assert.ok(p.includes('.tarjeta{ display:flex; flex-direction:column; gap:.588rem; border-radius:0; background:none; box-shadow:none; overflow:visible; }'))
  assert.ok(p.includes('.tarjeta > li:not(.liBoton){ border-radius:1.176rem; background:var(--anc-panel); box-shadow:var(--anc-e1); overflow:hidden; }')); assert.ok(p.includes('.tarjeta > li + li{ border-top:0; }'))
  assert.ok(p.includes('.fila{ min-height:0; gap:.809rem; padding:.809rem 1.03rem; }')) })
t('título en peso de título (--w-nombre); última línea y hora en peso 400 (--w-normal) y color secundario; títulos de sección con el peso (--w-fuerte) y el tamaño de etiqueta (--fs-11px) nuevos', () => {
  const p = plano(tel)
  assert.ok(p.includes('.nombre, .sinLeer .nombre{ font-weight:var(--w-nombre); }')); assert.ok(p.includes('.preview, .sinLeer .preview{ font-weight:var(--w-normal); color:var(--anc-ink-3); }'))
  assert.ok(p.includes('.hora, .sinLeer .hora{ font-size:var(--fs-11px); font-weight:var(--w-normal); color:var(--anc-ink-3); }')); assert.ok(p.includes('.seccion{ font-size:var(--fs-11px); font-weight:var(--w-fuerte); }')) })
t('no leídos: una ficha pequeña «Sin leer» en teléfono (el punto con su texto para lectores sigue en escritorio); «Ensayo» con el peso de ficha', () => {
  assert.match(tsx, /\{sinLeer && \(telefono \? <span className=\{ui\.ficha\}>Sin leer<\/span> : <><span className=\{ui\.punto\} aria-hidden="true" \/><span className="sr-only"/)
  const p = plano(tel); assert.ok(p.includes('.ficha{ flex:none; padding:.088rem .515rem; border-radius:999px; background:var(--anc-ink); color:var(--anc-panel-solid); font-size:var(--fs-11px); font-weight:var(--w-fuerte); line-height:1.4; white-space:nowrap; }'))
  assert.ok(p.includes('.pill{ font-size:var(--fs-11px); font-weight:var(--w-fuerte); }')) })
t('«BETA» es una ficha neutra junto al título en teléfono (sin la franja gris; el aviso largo queda para lectores); en escritorio, la franja de siempre', () => {
  assert.match(tsx, /telefono \? <div className=\{ui\.encabezado\}><h1 className=\{ui\.titulo\}>Chats<\/h1><span className=\{ui\.betaFicha\} title=\{BETA_TEXTO\}>BETA<span className=\{ui\.soloLectores\}> · \{BETA_TEXTO\}<\/span><\/span><\/div> : <><h1 className=\{ui\.titulo\}>Chats<\/h1><p className=\{ui\.beta\}><b>BETA<\/b>Los chats están en pruebas — si algo falla, avísanos\.<\/p><\/>/)
  assert.match(tsx, /const BETA_TEXTO = 'Los chats están en pruebas — si algo falla, avísanos\.'/)
  const p = plano(tel); assert.ok(p.includes('.betaFicha{ position:relative; flex:none; padding:.088rem .515rem; border-radius:999px; background:var(--anc-sunk); color:var(--anc-ink-2); font-size:var(--fs-11px); font-weight:var(--w-fuerte); letter-spacing:.04em; line-height:1.4; }')) })
t('«Nuevo mensaje directo»: en teléfono el botón ancho del estilo nuevo (anc-bt anc-bt--s) con «+» a la izquierda y el mismo ref y clic; en escritorio, la fila con el círculo de siempre', () => {
  assert.match(tsx, /<li className=\{telefono \? ui\.liBoton : undefined\}> \{telefono \? <button ref=\{nuevoRef\} type="button" className="anc-bt anc-bt--s" onClick=\{onNuevoDirecto\}><Plus className="anc-bt__ico" aria-hidden="true" \/><span className="anc-bt__txt">Nuevo mensaje directo<\/span><\/button> : <button ref=\{nuevoRef\} type="button" className=\{ui\.nuevo\} onClick=\{onNuevoDirecto\}><span className=\{ui\.nuevoIco\} aria-hidden="true">\+<\/span>Nuevo mensaje directo<\/button>\}/)
  const b = plano(leer('app/ancora-boton.css')); assert.ok(b.includes('min-height:var(--anc-btn-alto); height:var(--anc-btn-alto);') && b.includes('border-radius:var(--anc-btn-esq);'), 'la geometría 38 px / esquinas de 14 viene de .anc-bt') })
t('solo tokens existentes y sin movimiento nuevo: nada de colores sueltos ni de píxeles (salvo el 1 px de .soloLectores y el 999px de las fichas redondas), ni transiciones ni animaciones en el bloque nuevo', () => {
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(lista) && !/\brgba?\(/.test(lista), 'sin colores sueltos'); assert.ok(!/\b(?!999px)\d+(\.\d+)?px\b/.test(tel.replace('@media (max-width:768px){', '').replace(/var\(--[a-z0-9-]+\)/g, '')), 'sin píxeles sueltos en el bloque de teléfono (solo el 999px de las fichas redondas)')
  assert.ok(!/transition|animation|@keyframes/.test(lista), 'sin movimiento nuevo (nada que respetar de prefers-reduced-motion)')
  const toks = new Set(); for (const m of lista.matchAll(/var\((--[a-z0-9-]+)/g)) toks.add(m[1]); const defs = leer('app/ancora-tipo.css') + leer('app/ancora-tokens-v5.css') + leer('app/globals.css')
  for (const k of toks) assert.ok(defs.includes(k + ':'), k + ' no existe como token') })
console.log(`${n} comprobaciones OK`)
