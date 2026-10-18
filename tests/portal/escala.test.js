// La escala del portal (punto 54): ningún CSS del portal lleva medidas sueltas en px (todo en rem, para que `--esc` las escale), salvo lo que se queda fijo a propósito: líneas de 1–2 px, zonas táctiles de 44 px como mínimo
// (`max(44px, …)`), pisos de texto (`max(11px, …)`), campos de texto en 16 px, anchos de 200 px o más y los breakpoints de @media. Así Inicio (y lo que venga) se construye sobre tokens. Sin base ni servidor.
const assert = require('node:assert/strict'), path = require('path'), fs = require('fs')
const RAIZ = path.resolve(__dirname, '..', '..'), PORTAL = path.join(RAIZ, 'app', 'portal', '_components')
const archivos = []; (function recorrer(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) recorrer(p); else if (/\.css$/.test(f.name)) archivos.push(p) } })(PORTAL)

// Excepciones por archivo (valor en px → motivo). Todo lo demás debe estar en rem.
const FIJOS = {
  'segmentado.module.css': { '40px': 'las opciones del selector miden 40 px (aprobado); no se escalan por debajo' },
  'perfil.module.css': { '26px': 'el botón de la cámara no baja de 26 px', '9px': 'su zona táctil de 44 px' },
}
let n = 0; const t = (m, f) => { f(); n++; console.log('  ok', m) }
console.log('la escala del portal')
t('hay CSS del portal que revisar', () => assert.ok(archivos.length >= 15, String(archivos.length)))
t('ningún px suelto en los CSS del portal (salvo lo que se queda fijo a propósito)', () => {
  const mal = []
  for (const a of archivos) {
    const nombre = path.basename(a), ok = FIJOS[nombre] || {}
    const texto = fs.readFileSync(a, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '@media{')
    for (const m of texto.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)) {
      const v = parseFloat(m[1]); if (v <= 2 || v >= 200 || v === 0) continue
      const ctx = texto.slice(Math.max(0, m.index - 12), m.index)
      if (/max\(\s*$/.test(ctx) && (v === 44 || v === 11 || v === 10)) continue            // pisos: max(44px, …), max(11px, …), max(10px, …)
      if (/font-size\s*:\s*$/.test(ctx) && v === 16) continue                                  // campos de texto
      if (ok[m[0]]) continue
      mal.push(`${nombre}: ${m[0]} en «…${texto.slice(Math.max(0, m.index - 30), m.index + 12).replace(/\s+/g, ' ')}»`)
    }
  }
  assert.deepEqual(mal, [], '\n' + mal.join('\n')) })
t('las pantallas reconstruidas en rem (Inicio, pantallas de acceso, PortalApp) no llevan px en línea ni en sus clases', () => {
  const mal = []
  for (const f of ['PortalApp.tsx', 'PortalLogin.tsx', 'PortalLinkInvalid.tsx', 'inicio/Inicio.tsx', 'servicios/Servicios.tsx', 'servicio/Servicio.tsx', 'chats/Chats.tsx']) {
    const txt = fs.readFileSync(path.join(PORTAL, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const m of txt.matchAll(/(?<![\w.-])(\d*\.?\d+)px/g)) if (parseFloat(m[1]) > 2) mal.push(`${f}: ${m[0]}`)
  }
  assert.deepEqual(mal, [], '\n' + mal.join('\n')) })
t('el layout del portal define --esc: 0.85 en teléfono y 1 en escritorio, sin zoom ni transform', () => {
  const l = fs.readFileSync(path.join(RAIZ, 'app', 'portal', 'layout.tsx'), 'utf8')
  assert.match(l, /--esc:1/); assert.match(l, /max-width:768px\)\{:root\{--esc:\.85\}/); assert.match(l, /font-size:calc\(100% \* var\(--esc\)\)/); assert.ok(!/\bzoom\s*:/.test(l) && !/transform\s*:/.test(l)) })
t('la letra y los acordes no se escalan: --anc-letra-size divide por --esc (en el portal y en la hoja compartida)', () => {
  for (const f of ['app/portal/_components/CancionPortal.tsx', 'components/canciones/LyricSheet.tsx']) assert.match(fs.readFileSync(path.join(RAIZ, f), 'utf8'), /--anc-letra-size'?: `calc\(\$\{[^}]+\}rem \/ var\(--esc, 1\)\)`/, f) })
console.log(`${n} comprobaciones OK`)
