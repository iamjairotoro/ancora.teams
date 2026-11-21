// Movimiento, etapas M4 y M5. M4: la tarjeta, las píldoras y la hoja de la tira de días usan los tokens (nada de duraciones propias, tampoco los 340 y 380 ms del alto). M5: se animan SOLO los avisos que ya existen (PersonToast, el de TeamPanel, y PersonNotice,
// ambos de AddPersonDialog): entrada desde abajo con fundido, salida con fundido, con los tokens, solo en teléfono; NO hay un aviso nuevo en la tira de días.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const R = path.resolve(__dirname, '..', '..'), leer = f => fs.readFileSync(path.join(R, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('movimiento: tira de días a tokens (M4) y avisos (M5)')
const bloque = (css, cab) => { const i = css.indexOf(cab); assert.ok(i >= 0, 'falta ' + cab); let d = 0, j = css.indexOf('{', i); const ini = j; for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break } return css.slice(ini + 1, j) }
const tira = sinCom(leer('components/home/tira-dias.module.css')), mov = sinCom(leer('app/ancora-movimiento.css')), tsx = sinCom(leer('components/home/TiraDias.tsx'))

t('M4: ninguna duración ni curva propia en la tira: todo sale de --anc-dur-… y --anc-ease-drawer; el alto de la tarjeta (340 ms) y su temporizador (380 ms) también', () => {
  assert.ok(!/--curva/.test(tira)); assert.ok(!/(?<![\w.-])\d*\.?\d+m?s\b/.test(tira.replace(/[\d.]+(px|rem|em)\b/g, '')), 'duración suelta en tira-dias.module.css')
  assert.match(tira, /transition:height var\(--anc-dur-screen\) var\(--anc-ease-drawer\)/); assert.match(tsx, /msDeToken\('--anc-dur-screen', 280\) \+ 100/); assert.ok(!/\b(340|380)\b/.test(tsx), 'el 340 y el 380 ya no están en TiraDias.tsx') })
t('M4: con «reducir movimiento» la tarjeta solo hace un fundido de 120 ms (token); el alto salta y las píldoras no se mueven (regla global)', () => {
  assert.match(tira, /@media \(prefers-reduced-motion:reduce\)\{\s*\.tarjetaIn\[data-animar\]\{ animation:tira-fundido var\(--anc-dur-reduced\) linear !important; \}/); assert.match(tsx, /menosMovimiento\(\)\) \{ o\.style\.height = ''; return \}/) })
t('M5: los avisos suben desde abajo con un fundido y salen con un fundido, con los tokens, solo en teléfono', () => {
  const tel = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:no-preference) {\n  :where([data-aviso])')
  assert.match(tel, /\[data-aviso\]\) \{ opacity:0; translate:0 0\.875rem; transition:opacity var\(--anc-dur-sheet\) var\(--ease-out\), translate var\(--anc-dur-sheet\) var\(--anc-ease-drawer\); \}/); assert.match(tel, /\[data-aviso\]\[data-visible="true"\]\) \{ opacity:1; translate:none; \}/)
  assert.match(tel, /\[data-aviso\]\[data-saliendo\] \{ translate:none; transition-duration:var\(--anc-dur-fast\); pointer-events:none; \}/, 'la salida es solo un fundido (sin desplazamiento)')
  const red = bloque(mov, '@media (max-width:768px) and (prefers-reduced-motion:reduce) {\n  [data-aviso]'); assert.match(red, /transition:opacity var\(--anc-dur-reduced\) linear !important; translate:none !important/) })
t('M5: escritorio con su entrada de siempre; el aviso se centra con transform y la animación nueva usa `translate` (no lo pisa)', () => {
  const c = sinCom(leer('components/add-person-dialog.module.css')); assert.match(c, /@media \(min-width:769px\)\{ \.toast, \.notice\{ animation:toastIn 200ms var\(--anc-ease\); \} \}/)
  assert.ok(!/\.(toast|notice)\{[^}]*animation/.test(c.replace(/@media \(min-width:769px\)\{[^}]*\}\s*\}/, '').replace(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\n\}/, '')), 'fuera de escritorio los avisos no llevan animación propia'); assert.match(c, /\.toast\{[^}]*transform:translateX\(-50%\)/) })
t('M5: PersonToast (el de TeamPanel y el de admin) y PersonNotice pasan por la presencia; sus lugares de uso no cambian de comportamiento', () => {
  const a = sinCom(leer('components/AddPersonDialog.tsx')); assert.match(a, /usePresencia\(!!message\), texto = useCongelado\(message, !!message\)/); assert.match(a, /atributosHoja\(p, false, 'aviso'\)/g); assert.match(a, /\{texto\}<\/div>, document\.body/)
  assert.match(sinCom(leer('components/PersonasPanel.tsx')), /<Presente abierta=\{!!notice\} valor=\{notice\}>/); assert.match(sinCom(leer('app/admin/page.tsx')), /<Presente abierta=\{!!avisosFail\} valor=\{avisosFail\}>/)
  assert.match(sinCom(leer('components/TeamPanel.tsx')), /<PersonToast message=\{toast\} \/>/) })
t('M5: la tira de días NO tiene un aviso nuevo (ni toast, ni data-aviso, ni PersonToast)', () => {
  for (const f of ['components/home/TiraDias.tsx', 'components/home/PanelDia.tsx', 'components/home/HojaBloqueo.tsx', 'components/home/HojaInferior.tsx', 'app/portal/_components/inicio/PanelDiaUsuario.tsx']) { const s = sinCom(leer(f)); assert.ok(!/PersonToast|data-aviso|'aviso'|toast/i.test(s), f) }
  assert.ok(!/data-aviso|toast/i.test(tira), 'ni en el CSS de la tira') })
console.log(`${n} comprobaciones OK`)
