// Movimiento, etapa M6: el cambio de pestaña del portal del músico y la lente del menú inferior. Estructura (la medición por fotogramas en un navegador real está en tests/e2e-menus/pestanas-m6.js y pestanas-frames.js).
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: cambio de pestaña y lente (M6)')
const mov = sinCom(leer('app/ancora-movimiento.css')), nav = sinCom(leer('app/portal/_components/portal-nav.module.css')), app = sinCom(leer('app/portal/_components/PortalApp.tsx')), tira = sinCom(leer('components/home/TiraDias.tsx')), tcss = sinCom(leer('components/home/tira-dias.module.css'))
const bloque = (css, cab) => { const i = css.indexOf(cab); assert.ok(i >= 0, 'falta ' + cab); let d = 0, j = css.indexOf('{', i); const ini = j; for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break } return css.slice(ini + 1, j) }

t('la pantalla nueva entra con un fundido de 160 ms y 6 px (token, --ease-out), solo en teléfono, en reposo sin translate', () => {
  const tel = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:no-preference) {\n  .portal-content-wrap > *'); assert.match(tel, /\.portal-content-wrap > \* \{ animation:anc-pestana-entra var\(--anc-dur-fast\) var\(--ease-out\); \}/)
  assert.match(mov, /@keyframes anc-pestana-entra \{ from \{ opacity:0; translate:0 6px \} to \{ opacity:1; translate:none \} \}/) })
t('NO hay animación de salida de la pantalla anterior (ni transición ni data-saliendo para el contenido): se desmonta al instante y no bloquea el toque', () => {
  const m6 = mov.slice(mov.indexOf('M6: cambio de pestaña')); assert.ok(!/transition|data-saliendo/.test(m6.replace(/.*Con «reducir movimiento».*\n/, '')), 'M6 solo usa una animación de entrada'); assert.ok(!/startTransition\([^)]*saliendo/.test(app)) })
t('«reducir movimiento»: solo un fundido de 120 ms (token)', () => { const red = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:reduce) {\n  .portal-content-wrap > *'); assert.match(red, /animation:anc-pestana-fundido var\(--anc-dur-reduced\) linear !important/) })
t('la lente (y su zoom) usan los tokens: recorrido en --anc-dur-screen, sombra en --anc-dur-sheet, opacidad en --anc-dur-press; ninguna duración suelta en ellas', () => {
  const lente = /\.lente\{[^}]*\}/.exec(nav)[0], zoom = /\.zoom\{[^}]*\}/.exec(nav)[0]
  assert.match(lente, /transition:transform var\(--anc-dur-screen\) var\(--rebote\), width var\(--anc-dur-screen\) var\(--rebote\), box-shadow var\(--anc-dur-sheet\) ease, opacity var\(--anc-dur-press\) ease/); assert.match(zoom, /transition:transform var\(--anc-dur-screen\) var\(--rebote\), transform-origin var\(--anc-dur-screen\) var\(--rebote\)/)
  assert.ok(!/\d\s*m?s\b/.test((lente + zoom).replace(/[\d.]+(rem|px|em)/g, '').replace(/\d+%/g, '').replace(/\(\.?\d[\d.,\s]*\)/g, '')), 'duración suelta en la lente') })
t('en teléfono el contenido de la pestaña se dibuja diferido e interrumpible (la lente y los toques no esperan a que Inicio termine de dibujarse; el último toque gana) mientras el menú sigue a la pestaña al instante; en escritorio, como siempre', () => {
  assert.match(app, /import \{[^}]*useDeferredValue[^}]*\} from 'react'/); assert.match(app, /const tabDiferida = useDeferredValue\(tab\)\s*\n\s*const tabC: Tab = telefonoYa \? tabDiferida : tab/)
  for (const k of ['home', 'canciones', 'servicios', 'chats', 'perfil']) assert.match(app, new RegExp("\\{tabC==='" + k + "'&&"), 'el contenido de ' + k + ' sigue a tabC')
  assert.match(app, /\(tabC==='canciones'\|\|\(tabC==='servicios'&&!!servicioId\)\)/, 'la canción abierta sigue al contenido, no al menú')
  assert.match(app, /onSelect=\{k=>setTab\(k as Tab\)\}/, 'el menú y la lente usan la pestaña al instante (misma confirmación que antes)'); assert.ok(!/startTransition/.test(app)) })
t('la tarjeta del día de Inicio no entra animada al montarse la tira (se veía vacía), solo al cambiar de día', () => {
  assert.match(tira, /cambiosDeDia\.current > 0 \? '' : undefined/); assert.match(tcss, /\.tarjetaIn\{ box-sizing:border-box; padding:calc\(16px \* var\(--esc, 1\)\); \}/); assert.match(tcss, /\.tarjetaIn\[data-animar\]\{ animation:tira-entra var\(--anc-dur-screen\) var\(--anc-ease-drawer\); \}/) })
t('portal-nav.module.css entra en la lista de movimiento por tokens (solo la lente y su zoom)', () => { const l = require('../../scripts/verificacion/css-con-movimiento-por-tokens.js').find(x => x.archivo === 'app/portal/_components/portal-nav.module.css'); assert.ok(l && l.solo.includes('.lente') && l.solo.includes('.zoom')) })
console.log(`${n} comprobaciones OK`)
