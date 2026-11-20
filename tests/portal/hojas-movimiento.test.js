// Movimiento, etapa M2: las hojas inferiores (la del mes y la de «Bloquear esta fecha» de la tira de días, la del día y la del rango de Disponibilidad y «Escribirle a…» de Mensajes) suben y bajan animadas en teléfono.
// Reglas que se comprueban aquí (la medición en un navegador de verdad está en tests/e2e-menus/hojas.js):
//   · todo vive dentro de @media (max-width:768px), con los tokens de movimiento, y anima solo translate (transform) y opacity; escritorio con sus animaciones de siempre;
//   · la salida se puede interrumpir (reabrir cancela el desmontaje) y el foco vuelve al botón que abrió; «reducir movimiento» deja solo un fundido corto; sin base de datos.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: hojas inferiores (M2)')
const hook = sinCom(leer('lib/usePresencia.ts')), mov = sinCom(leer('app/ancora-movimiento.css'))
const bloque = (css, cabecera) => { const i = css.indexOf(cabecera); assert.ok(i >= 0, 'falta ' + cabecera); let d = 0, j = css.indexOf('{', i); const ini = j; for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break } return css.slice(ini + 1, j) }

t('la presencia: se decide al dibujar sin usar estado de React, la salida dura lo que dicen los tokens, reabrir a mitad cancela el desmontaje y fuera del teléfono se desmonta al instante', () => {
  assert.match(hook, /\(max-width: 768px\)/); assert.match(hook, /--anc-dur-sheet-out/); assert.match(hook, /--anc-dur-reduced/)
  assert.ok(!/useState/.test(hook.replace(/useState con actualizaciones/g, '')), 'sin useState: las actualizaciones durante el dibujo mezcladas con las del temporizador dejaban la hoja sin animar tras una interrupción')
  assert.match(hook, /if \(s\.previa !== abierta\)/); assert.match(hook, /if \(abierta\) \{ if \(s\.saliendo \|\| !hayAnimacion\(\)\) s\.listo = true; s\.saliendo = false \}/, 'reabrir cancela la salida'); assert.match(hook, /clearTimeout\(id\)/)
  assert.match(hook, /else \{ s\.listo = false; s\.saliendo = hayAnimacion\(\) \}/, 'fuera del teléfono nunca queda «saliendo»')
  assert.match(hook, /requestAnimationFrame\(\(\) => \{ r2 = requestAnimationFrame\(\(\) => \{ void document\.documentElement\.offsetHeight; s\.listo = true/, 'la entrada espera dos cuadros y fuerza el cálculo de estilo: es una transición de verdad')
  assert.match(hook, /inert: ''/, 'mientras sale la hoja es inert')
  assert.ok(!/\b\d+ms\b|setTimeout\([^)]*,\s*\d{2,}\)/.test(hook.replace(/\+ 50/, '')), 'ninguna duración suelta en el hook') })
t('el CSS de las hojas vive en teléfono, con los tokens: velo con fundido, hoja con translate y la curva de drawer; la salida más corta; sin toques mientras sale', () => {
  const tel = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:no-preference) {\n  :where([data-hoja-velo])')
  assert.match(tel, /\[data-hoja-velo\]\) \{ opacity:0; transition:opacity var\(--anc-dur-sheet\) var\(--ease-out\)/); assert.match(tel, /\[data-hoja\]\) \{ translate:0 100%; transition:translate var\(--anc-dur-sheet\) var\(--anc-ease-drawer\)/)
  assert.match(tel, /\[data-saliendo\]\) \{ transition-duration:var\(--anc-dur-sheet-out\); pointer-events:none/)
  assert.ok(!/\d(ms|s)\b/.test(tel.replace(/100%/g, '')), 'sin duraciones sueltas') })
t('«reducir movimiento»: solo un fundido de 120 ms (token), sin desplazamiento', () => {
  const red = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:reduce) {\n  [data-hoja-velo]')
  assert.match(red, /transition:opacity var\(--anc-dur-reduced\) linear !important/); assert.match(red, /translate:none !important/); assert.ok(!/scale|translateY/.test(red)) })
t('los tres lugares que dibujan hojas usan la presencia, y los hooks de Disponibilidad van antes de su «return» temprano', () => {
  for (const f of ['components/home/HojaInferior.tsx', 'app/portal/_components/chats/HojaDirecto.tsx', 'app/portal/_components/disponibilidad/Disponibilidad.tsx']) { const s = leer(f); assert.match(s, /usePresencia\(/, f); assert.match(s, /atributosHoja\(/, f); assert.match(s, /if \(!p\.montado\) return null|presDia\.montado/, f) }
  const d = leer('app/portal/_components/disponibilidad/Disponibilidad.tsx'); assert.ok(d.indexOf('usePresencia(') < d.indexOf("if(estado!=='ok') return("), 'hooks antes del return temprano'); assert.ok(d.indexOf('useCongelado(') < d.indexOf("if(estado!=='ok') return(")) })
t('quien usa las hojas las deja siempre en el árbol con `abierta` (el formulario de bloqueo nace de nuevo en cada apertura) y el foco vuelve al botón que las abrió', () => {
  assert.match(leer('components/home/TiraDias.tsx'), /<HojaInferior abierta=\{mesAbierto\}/); assert.match(leer('app/portal/_components/inicio/PanelDiaUsuario.tsx'), /<HojaBloqueo abierta=\{hoja\}/); assert.match(leer('app/portal/_components/chats/Chats.tsx'), /<HojaDirecto abierta=\{selectorAbierto\}/)
  const b = leer('components/home/HojaBloqueo.tsx'); assert.match(b, /function ContenidoBloqueo/); assert.match(b, /<HojaInferior abierta=\{abierta\}[^>]*><ContenidoBloqueo/)
  const h = leer('components/home/HojaInferior.tsx'); assert.match(h, /volverA\.current = elementoQueAbrio\(\)/); assert.match(h, /\}, \[abierta\]\)/)
  assert.match(leer('app/portal/_components/chats/Chats.tsx'), /nuevoRef\.current\?\.focus\(\)/); assert.match(leer('app/portal/_components/disponibilidad/Disponibilidad.tsx'), /if\(el\) setTimeout\(\(\)=>\{ if\(document\.contains\(el\)\) el\.focus\(\) \},0\)/) })
t('escritorio: las animaciones de siempre de hoja.module.css siguen, ahora solo en @media (min-width:769px); la tira ya no lleva animación propia en la hoja', () => {
  const m = sinCom(leer('app/portal/_components/disponibilidad/hoja.module.css')), esc = bloque(m, '@media (min-width:769px)')
  assert.match(esc, /\.velo\{ animation:disp-velo 180ms ease-out; \}/); assert.match(esc, /\.hoja\{ animation:disp-aparece 200ms cubic-bezier\(\.23,1,\.32,1\); \}/)
  assert.ok(!/animation:\s*disp-/.test(m.replace(esc, '').replace(/@keyframes[^{]+\{[^}]*\{[^}]*\}[^}]*\{[^}]*\}\s*\}/g, '')), 'fuera de escritorio no queda ninguna animación con nombre')
  const tira = sinCom(leer('components/home/tira-dias.module.css')); assert.ok(!/tira-sube|tira-velo/.test(tira)); assert.ok(!/\.(velo|hoja)\{[^}]*animation/.test(tira)) })
t('la lista de movimiento por tokens incluye lo tocado en M2', () => { const l = require('../../scripts/verificacion/css-con-movimiento-por-tokens.js').map(x => x.archivo); assert.ok(l.includes('app/portal/_components/disponibilidad/hoja.module.css') && l.includes('app/ancora-movimiento.css')) })
console.log(`${n} comprobaciones OK`)
