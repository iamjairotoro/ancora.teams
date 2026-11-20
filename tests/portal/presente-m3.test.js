// Movimiento, etapa M3: ventanas centradas (avisar y confirmar), menús flotantes que crecen desde su botón, pantalla Adjuntos y las hojas del admin móvil pasan por <Presente> (components/Presente.tsx).
// Se comprueba aquí la estructura (la medición en un navegador real está en tests/e2e-menus/hojas-m3.js). Las confirmaciones pasan todas por ventanas: un fallo aquí afecta a toda la app.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: ventanas, menús, pantalla y hojas con presencia (M3)')
const mov = sinCom(leer('app/ancora-movimiento.css'))
const bloque = (css, cab) => { const i = css.indexOf(cab); assert.ok(i >= 0, 'falta ' + cab); let d = 0, j = css.indexOf('{', i); const ini = j; for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break } return css.slice(ini + 1, j) }

t('Presente: monta al abrir, sigue montada mientras sale, congela el valor, devuelve el foco al botón y avisa cuando salió', () => {
  const p = sinCom(leer('components/Presente.tsx'))
  assert.match(p, /usePresencia\(abierta\)/); assert.match(p, /useCongelado<T>\(valor as T, abierta\)/); assert.match(p, /elementoQueAbrio\(\)/); assert.match(p, /el\.focus\(\{ preventScroll: true \}\)/); assert.match(p, /if \(estabaMontada\.current && !p\.montado\) onSalio\?\.\(\)/); assert.match(p, /if \(!p\.montado\) return null/)
  assert.match(p, /useLayoutEffect/, 'el foco se recuerda antes de que la pieza lo tome (los efectos de la pieza corren después)') })
t('ventanas centradas: fundido con escala de .96 a 1 al entrar (--anc-dur-sheet) y una salida más corta (--anc-dur-sheet-out); solo en teléfono; reducir movimiento = fundido de 120 ms', () => {
  const tel = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:no-preference) {\n  :where([data-ventana-velo])')
  assert.match(tel, /\[data-ventana\]\) \{ opacity:0; scale:\.96; transition:opacity var\(--anc-dur-sheet\) var\(--ease-out\), scale var\(--anc-dur-sheet\) var\(--ease-out\)/); assert.match(tel, /\[data-ventana\]\[data-visible="true"\]\) \{ opacity:1; scale:none; \}/)
  assert.match(tel, /\[data-ventana\]\[data-saliendo\][^{]*\{ transition-duration:var\(--anc-dur-sheet-out\); pointer-events:none; \}/)
  const red = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:reduce) {\n  [data-ventana-velo], [data-ventana]'); assert.match(red, /transition:opacity var\(--anc-dur-reduced\) linear !important/); assert.match(red, /scale:none !important/) })
t('pantalla Adjuntos: sube como una hoja (curva de drawer) y en reposo vuelve a `none` (un translate o scale, aunque sea la identidad, haría de la pantalla el bloque contenedor del visor de PDF)', () => {
  assert.match(mov, /:where\(\[data-pantalla\]\) \{ translate:0 100%; transition:translate var\(--anc-dur-sheet\) var\(--anc-ease-drawer\); \}/); assert.match(mov, /\[data-pantalla\]\[data-visible="true"\]\) \{ translate:none; \}/); assert.match(mov, /\[data-hoja\]\[data-visible="true"\]\) \{ translate:none;/)
  assert.ok(!/translate:0 0(?![\d.])|scale:1;?\s*\}\s*\n?\s*:where/.test(mov.replace(/@keyframes[^{]+\{[\s\S]*?\}\s*\}/g, '')), 'ningún estado de reposo usa una identidad distinta de none') })
t('menús flotantes: crecen desde su botón (origen calculado, --anc-dur-fast), solo en teléfono; con reducir movimiento, fundido de 120 ms', () => {
  assert.match(mov, /\[data-crece\] \{ animation:anc-menu-crece var\(--anc-dur-fast\) var\(--ease-out\); transform-origin:var\(--origen, top right\); \}/); assert.match(mov, /@keyframes anc-menu-crece \{ from \{ opacity:0; scale:\.9 \} to \{ opacity:1; scale:1 \} \}/)
  assert.match(mov, /\[data-crece\] \{ animation:anc-menu-fundido var\(--anc-dur-reduced\) linear !important; \}/)
  const m = sinCom(leer('components/MenuFlotante.tsx')); assert.match(m, /data-crece=\{telefono \? '' : undefined\}/); assert.match(m, /--origen/); assert.match(m, /top < r\.top \? h : 0/, 'abre hacia arriba → crece desde abajo') })
t('VentanaCentrada: lee la presencia, no recibe toques al salir, suelta historial, foco y desplazamiento al empezar a salir y los vuelve a tomar si se reabre (efecto con `abierta`)', () => {
  const v = sinCom(leer('components/ventanas/VentanaCentrada.tsx')); assert.match(v, /usePresenciaActual\(\), abierta = p \? !p\.saliendo : true/); assert.match(v, /if \(!abierta\) return/); assert.match(v, /\}, \[abierta\]\)/); assert.match(v, /atributosHoja\(p, true, 'ventana'\)/); assert.match(v, /atributosHoja\(p, false, 'ventana'\)/)
  const c = sinCom(leer('components/ventanas/ventanas.module.css')); assert.match(c, /\.velo:not\(\[data-ventana-velo\]\)\{ animation:v-velo var\(--anc-dur-fast\)/); assert.match(c, /\.ventana:not\(\[data-ventana\]\)\{ animation:v-aparece var\(--anc-dur-sheet\)/); assert.ok(!/\d(ms|s)\b/.test(c.replace(/\b\d+\.?\d*(px|rem|em)\b/g, '')), 'sin duraciones sueltas') })
t('avisar y confirmar: cada ventana es un elemento de una lista con su propio <Presente>; la respuesta (la promesa) se da al cerrar, no al terminar la animación; abrir otra justo después deja salir la anterior', () => {
  const v = sinCom(leer('components/ventanas/VentanasProvider.tsx'))
  assert.match(v, /piezas\.map\(pz => \(\s*<Presente key=\{pz\.id\} abierta=\{pz\.abierta\} valor=\{pz\.a\} onSalio=/); assert.match(v, /l\.map\(x => x\.abierta \? \{ \.\.\.x, abierta: false \} : x\), \{ id: \+\+siguiente\.current/, 'una ventana nueva hace salir a la abierta')
  assert.match(v, /setPiezas\(l => l\.map\(x => x\.id === id \? \{ \.\.\.x, abierta: false \} : x\)\)\s*\n\s*if \(a\.tipo === 'confirmar'\) a\.fin\(v\); else a\.fin\(\)/, 'cerrar responde en el mismo instante')
  assert.match(v, /eligio\.current\.has\(id\)/, 'el «sí» se anota por ventana') })
t('las demás ventanas centradas (confirmaciones controladas del portal, Plantillas del checklist, Notificar) también van dentro de <Presente>', () => {
  assert.match(sinCom(leer('app/portal/_components/convocatorias/HojaConfirmacion.tsx')), /<Presente abierta=\{p\.abierta\} valor=\{p\}>/); assert.match(sinCom(leer('components/servicio-movil/ChecklistLider.tsx')), /<Presente abierta=\{!!\(plantillas && vista\.checklistId\)\}/)
  assert.match(sinCom(leer('components/servicio-movil/ServicioMovil.tsx')), /<Presente abierta=\{typeof hoja === 'object' && !!hoja && 'notificar' in hoja\}>/); assert.match(sinCom(leer('components/AdminServiceView.tsx')), /<Presente abierta=\{!!confirmarNotificar\}/) })
t('HojaBase, FichaMenuHoja y PantallaAdjuntos leen la presencia y sueltan el historial, el foco y el desplazamiento al empezar a salir', () => {
  for (const f of ['components/admin-movil/HojaBase.tsx', 'components/canciones/FichaMenuHoja.tsx', 'components/adjuntos/PantallaAdjuntos.tsx']) { const s = sinCom(leer(f)); assert.match(s, /usePresenciaActual\(\), abierta = p \? !p\.saliendo : true/, f); assert.match(s, /if \(!abierta\) return/, f); assert.match(s, /\}, \[abierta\]\)/, f); assert.match(s, /atributosHoja\(/, f) }
  assert.match(sinCom(leer('components/adjuntos/PantallaAdjuntos.tsx')), /atributosHoja\(p, false, 'pantalla'\)/) })
console.log(`${n} comprobaciones OK`)
