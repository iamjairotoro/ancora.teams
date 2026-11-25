// Chats en teléfono · estilo de botones (referencias taller-estilo.html y canciones-tarjetas.html). Paso 1: LA LISTA (tarjetas por conversación separadas 8 px, ficha BETA, ficha «Sin leer», botón ancho con «+», títulos de sección con el peso y tamaño de etiqueta). Paso 2: LA CONVERSACIÓN (burbujas con esquinas de botón, caja de escribir de 38 px, botón de enviar de 38 × 38).
// Solo teléfono: el marcado distinto se dibuja solo con useTelefonoYa y todo el CSS va dentro de @media (max-width:768px); el escritorio y la tablet no cambian. La medición en un navegador real está en tests/e2e-menus/chats-estilo.js.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, ''), plano = t => sinCom(t).replace(/\s+/g, ' ')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('estilo: Chats en teléfono · la lista y la conversación')
const tsx = plano(leer('app/portal/_components/chats/ListaChats.tsx')), css = leer('app/portal/_components/chats/chats.module.css')
const iL = css.lastIndexOf('/*', css.indexOf('LA LISTA DE CHATS')), iV = css.indexOf('/* la vista de un chat */'), iC = css.lastIndexOf('/*', css.indexOf('LA CONVERSACIÓN'))
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
// ── paso 2: la conversación
const conv = sinCom(css.slice(iC)), convTel = plano(conv.slice(conv.indexOf('@media (max-width:768px){')))
t('la conversación: todo el CSS nuevo va dentro de @media (max-width:768px) y el de siempre (burbuja, caja de escribir, botón de enviar de escritorio) no se tocó', () => {
  assert.ok(iC > iV); assert.equal(conv.slice(0, conv.indexOf('@media (max-width:768px){')).trim(), '')
  const base = plano(css.slice(0, iC))
  assert.match(base, /\.burbuja\{ margin:0; padding:0\.5625rem 0\.875rem; border-radius:1\.125rem;/); assert.match(base, /\.campo\{ flex:1; min-width:0; box-sizing:border-box; min-height:max\(44px, 2\.75rem\); padding:0 1rem; border:0; border-radius:1\.375rem;/)
  assert.match(base, /\.enviar\{ flex:none; width:max\(44px, 2\.75rem\); height:max\(44px, 2\.75rem\); border:0; border-radius:50%;/) })
t('burbujas con las esquinas de botón (--anc-btn-esq); caja de escribir de 38 px (--anc-btn-alto) con esquinas de 14, letra de 16 px reales intacta, zona táctil de 44 px (--anc-btn-toque) hecha con un borde transparente y el fondo recortado al relleno', () => {
  assert.ok(convTel.includes('.burbuja{ border-radius:var(--anc-btn-esq); }'))
  assert.ok(convTel.includes('.campo{ --toque-extra:calc((var(--anc-btn-toque) - var(--anc-btn-alto)) / 2); height:var(--anc-btn-toque); min-height:var(--anc-btn-toque); padding:0 var(--anc-btn-pad); border:var(--toque-extra) solid transparent; border-radius:calc(var(--anc-btn-esq) + var(--toque-extra)); background-color:var(--anc-sunk); background-clip:padding-box; box-shadow:none; }'))
  assert.ok(convTel.includes('.campo:focus-visible{ outline-offset:calc(-1 * var(--toque-extra)); }')); assert.ok(!/font-size/.test(convTel), 'no toca el tamaño de letra del campo: sigue siendo --fs-16px (iOS no hace zoom)')
  assert.match(plano(css.slice(0, iC)), /\.campo\{[^}]*font-size:var\(--fs-16px\);/) })
t('botón de enviar de 38 × 38 con esquinas de 14 y su zona de 44 px con ::after (el color y el estado deshabilitado son los de siempre)', () => {
  assert.ok(convTel.includes('.enviar{ position:relative; width:var(--anc-btn-alto); height:var(--anc-btn-alto); border-radius:var(--anc-btn-esq); }'))
  assert.ok(convTel.includes(".enviar::after{ content:''; position:absolute; inset:calc((var(--anc-btn-alto) - var(--anc-btn-toque)) / 2); }")); assert.ok(!/background|color/.test(convTel.slice(convTel.indexOf('.enviar{'))), 'no cambia el color del botón') })
t('la conversación: solo tokens existentes, sin píxeles sueltos y sin movimiento nuevo (nada que respetar de prefers-reduced-motion)', () => {
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(conv) && !/\brgba?\(/.test(conv)); assert.ok(!/\b\d+(\.\d+)?px\b/.test(convTel.replace('@media (max-width:768px){', '').replace(/var\(--[a-z0-9-]+\)/g, '')), 'sin píxeles sueltos')
  assert.ok(!/transition|animation|@keyframes/.test(conv)); const defs = leer('app/ancora-tipo.css') + leer('app/ancora-tokens-v5.css') + leer('app/globals.css'); for (const m of conv.matchAll(/var\((--[a-z0-9-]+)/g)) if (m[1] !== '--toque-extra') assert.ok(defs.includes(m[1] + ':'), m[1] + ' no existe') })
t('la vista de la conversación no cambia de marcado: la misma estructura (cabecera, mensajes, caja y botón) en teléfono y escritorio', () => {
  const v = plano(leer('app/portal/_components/chats/VistaChat.tsx')); assert.ok(!/useTelefonoYa|telefono/.test(v)); assert.match(v, /<input className=\{ui\.campo\}/); assert.match(v, /<button type="button" className=\{ui\.enviar\}/) })
console.log(`${n} comprobaciones OK`)
