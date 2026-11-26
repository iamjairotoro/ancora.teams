// Galería HTML de antes y después de las 37 pantallas del inventario (390 px, claro y oscuro). Uso: node galeria.js <carpetaAntes> <carpetaDespués> <carpetaSalida>
// Cada carpeta de entrada trae /capturas con <id>__390__<tema>.png (las de cap.js a 2x). Salida: index.html + img/ (PNG a 390 px de ancho: antes, después y una «diferencia» con lo que cambió en rojo).
// La etiqueta de grupo de cada pantalla se escribe a mano en GRUPOS (qué grupo de la tanda de botones, b a i, explica la diferencia); lo que cambia solo en la franja del menú inferior (la lente) se marca como ruido.
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const [A, B, OUT] = process.argv.slice(2).map(d => path.resolve(d)), ESC = path.join(__dirname, 'escenarios', 'inventario-botones.json')

function leer(f) { const b = fs.readFileSync(f); let o = 8, w, h, ct, idat = []; while (o < b.length) { const n = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.slice(o + 8, o + 8 + n); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9] } if (t === 'IDAT') idat.push(d); o += 12 + n }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * bpp), st = w * bpp
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x++) { const a = x >= bpp ? px[y * st + x - bpp] : 0, up = y ? px[(y - 1) * st + x] : 0, c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0; let v = raw[y * (st + 1) + 1 + x]
    if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c } px[y * st + x] = v & 255 } }
  return { w, h, bpp, px } }
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
function escribir(f, w, h, rgb) { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2
  fs.writeFileSync(f, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])) }

/** Baja a la mitad (2x → 1x) promediando cada bloque de 2×2. */
function mitad(im) { const w = im.w >> 1, h = im.h >> 1, out = Buffer.alloc(w * h * 3)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) { let s = 0; for (const [dy, dx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) s += im.px[((2 * y + dy) * im.w + 2 * x + dx) * im.bpp + k]; out[(y * w + x) * 3 + k] = s >> 2 }
  return { w, h, rgb: out } }

const GRUPOS = {
  b: ['b', 'Botones con ícono claro: Añadir, Gestionar equipos, Cerrar sesión, Agregar canción/persona (y el ajuste de 1 px de la etiqueta de todo botón del estilo nuevo, por las colas de g, q y p)'],
  c: ['c', 'Pastillas de herramientas del equipo en cuadrícula de 2 columnas'],
  d: ['d', 'Selector del periodo del Resumen del líder como control segmentado'],
  e: ['e', 'Pares Guardar/Cancelar, Listo/Asignar, enlace de acceso y «Abrir servicio»'],
  g: ['g', '«Escribirle a…»: ✕ con ícono X y nombres en peso 500'],
  h: ['h', 'Cronograma: Añadir ítem, ×, paneles de plantilla'],
  i: ['i', 'Notas: campo y «⋯»'],
}
// Qué grupo(s) explica(n) la diferencia de cada pantalla (por el componente que se dibuja; la zona que cambia se ve en la columna «Diferencia»).
const POR_PANTALLA = {
  'ad01-home': ['e', 'b'], 'ad03-servicio': ['b'], 'ad04-servicio-mas': ['b'], 'ad05-equipo': ['c'], 'ad06-equipo-anadir': ['c'], 'ad07-equipo-posicion': ['c', 'e'], 'ad08-orden': ['b'], 'ad09-checklist': ['b'],
  'ad10-cronograma': ['h'], 'ad11-notas': ['i'], 'ad13-personas-equipos': ['b'], 'ad14-persona-ficha': ['e'], 'ad17-canciones': ['b'], 'ad19-admin': ['b'], 'li02-equipo': ['b', 'c'], 'li03-personas': ['b'], 'li04-resumen': ['d'],
  'po04-servicios-disponibilidad': ['b'], 'po08-chats': ['b'], 'po10-chat-hoja-directo': ['g', 'b'], 'po11-perfil': ['b'], 'po12-perfil-datos': ['e', 'b'],
}
const UMBRAL = 30      // diferencia mínima (de 255) para contar un píxel como cambiado

fs.mkdirSync(path.join(OUT, 'img'), { recursive: true })
const escenas = JSON.parse(fs.readFileSync(ESC, 'utf8')).map(e => e.id)
const secciones = []; let identicas = 0, cambian = 0, ruido = 0, total = 0
for (const id of escenas) {
  const filas = []
  for (const tema of ['light', 'dark']) {
    const fa = path.join(A, 'capturas', `${id}__390__${tema}.png`), fb = path.join(B, 'capturas', `${id}__390__${tema}.png`)
    if (!fs.existsSync(fa) || !fs.existsSync(fb)) { filas.push({ tema, falta: true }); continue }
    const a = leer(fa), b = leer(fb); total++
    let cnt = 0, y0 = 1e9, y1 = -1
    const dif = Buffer.alloc((a.w >> 1) * (a.h >> 1) * 3), ha = mitad(a), hb = mitad(b), W = a.w >> 1
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { let m = 0; for (let k = 0; k < a.bpp && k < 3; k++) m = Math.max(m, Math.abs(a.px[(y * a.w + x) * a.bpp + k] - b.px[(y * b.w + x) * b.bpp + k])); if (m > UMBRAL) { cnt++; y0 = Math.min(y0, y); y1 = Math.max(y1, y); const hx = x >> 1, hy = y >> 1; if (hx < W && hy < (a.h >> 1)) { const i = (hy * W + hx) * 3; dif[i] = 255; dif[i + 1] = 0; dif[i + 2] = 60 } } }
    for (let i = 0; i < dif.length; i += 3) if (!(dif[i] === 255 && dif[i + 1] === 0 && dif[i + 2] === 60)) for (let k = 0; k < 3; k++) dif[i + k] = Math.round(hb.rgb[i + k] * 0.3 + (tema === 'dark' ? 20 : 235) * 0.7)
    const base = `${id}__${tema}`
    escribir(path.join(OUT, 'img', `${base}__antes.png`), ha.w, ha.h, ha.rgb); escribir(path.join(OUT, 'img', `${base}__despues.png`), hb.w, hb.h, hb.rgb)
    if (cnt) escribir(path.join(OUT, 'img', `${base}__dif.png`), ha.w, ha.h, dif)
    // ruido: lo que cambia solo en la franja del menú inferior (la lente) y es poco
    const esRuido = cnt > 0 && y0 >= 1540 && cnt < 3000
    filas.push({ tema, cnt, ruido: esRuido, y0, y1 })
  }
  secciones.push({ id, filas })
}
const html = []
html.push(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Antes y después de los botones · 37 pantallas · 390 px</title><style>
:root{--bg:#f4f4f1;--ink:#111;--mut:#666;--card:#fff;--line:#ddd;--b:#2d4fd8;--ok:#1f7a4d;--no:#c8003c}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--ink:#eee;--mut:#9a9a9a;--card:#1e1e1e;--line:#333;--b:#8fa6ff;--ok:#52c488;--no:#ff6b8f}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 -apple-system,system-ui,sans-serif}header,section{max-width:1380px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:8px 0}h2{font-size:17px;margin:0 0 4px}.mut{color:var(--mut)}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.chip{display:inline-block;padding:2px 9px;border-radius:999px;border:1px solid var(--line);background:var(--card);font-size:12px}.chip b{color:var(--b)}.chip.ok{color:var(--ok)}.chip.ru{color:var(--mut)}
.leyenda{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px}.leyenda li{margin:2px 0}
section{border-top:1px solid var(--line)}.fila{display:grid;grid-template-columns:repeat(3,minmax(0,390px));gap:10px;margin:8px 0;align-items:start}.fila figure{margin:0}
.fila img{width:100%;height:auto;border:1px solid var(--line);border-radius:10px;display:block;background:var(--card)}figcaption{font-size:12px;color:var(--mut);margin:3px 2px}
.tema{font-size:12px;color:var(--mut);margin:10px 0 0}nav a{margin-right:10px;font-size:12px;color:var(--b)}@media (max-width:1250px){.fila{grid-template-columns:repeat(3,minmax(0,1fr))}}
</style></head><body><header><h1>Antes y después de los botones de texto · 37 pantallas · 390 px</h1>
<p class="mut">«Antes» = la línea base (tag <code>pre-botones-texto-2026-11-25</code>). «Después» = el estado actual de <code>dev</code>. La tercera columna marca en rojo lo que cambió (el resto aparece atenuado). Claro y oscuro, lado a lado.</p>
<div class="leyenda"><b>Grupos que explican las diferencias</b><ul>${Object.values(GRUPOS).map(([k, t]) => `<li><b>(${k})</b> ${t}</li>`).join('')}<li><b>ruido</b>: cambia solo en la franja del menú inferior (la «lente» de la píldora activa), que varía sola entre capturas.</li></ul></div>
<div id="resumen"></div></header>`)
for (const s of secciones) {
  const hay = s.filas.filter(f => !f.falta), conCambio = hay.filter(f => f.cnt && !f.ruido), conRuido = hay.filter(f => f.ruido)
  const etiquetas = conCambio.length ? (POR_PANTALLA[s.id] || ['?']).map(g => `<span class="chip"><b>Grupo (${g})</b></span>`).join('') : ''
  const estado = hay.length && !conCambio.length ? (conRuido.length ? '<span class="chip ru">idéntica (salvo ruido de la lente)</span>' : '<span class="chip ok">idéntica</span>') : ''
  if (conCambio.length) cambian++; else if (conRuido.length) ruido++; else identicas++
  const expl = conCambio.length ? (POR_PANTALLA[s.id] || []).map(g => GRUPOS[g] ? `(${g}) ${GRUPOS[g][1]}` : '').filter(Boolean).join(' · ') : ''
  html.push(`<section id="${s.id}"><h2>${s.id}</h2><div class="chips">${etiquetas}${estado}${s.filas.filter(f => f.cnt && f.ruido).length && conCambio.length ? '<span class="chip ru">+ ruido en algún tema</span>' : ''}</div>${expl ? `<div class="mut">${expl}</div>` : ''}`)
  for (const f of s.filas) {
    if (f.falta) { html.push(`<div class="tema">${f.tema === 'light' ? 'Claro' : 'Oscuro'}: falta la captura</div>`); continue }
    const base = `img/${s.id}__${f.tema}`, nota = !f.cnt ? 'sin diferencias' : f.ruido ? `ruido (${f.cnt} px, solo la franja inferior)` : `${f.cnt} px distintos`
    html.push(`<div class="tema">${f.tema === 'light' ? 'Claro' : 'Oscuro'} · ${nota}</div><div class="fila"><figure><img loading="lazy" src="${base}__antes.png" alt="${s.id} antes ${f.tema}"><figcaption>Antes</figcaption></figure><figure><img loading="lazy" src="${base}__despues.png" alt="${s.id} después ${f.tema}"><figcaption>Después</figcaption></figure>${f.cnt ? `<figure><img loading="lazy" src="${base}__dif.png" alt="${s.id} diferencia ${f.tema}"><figcaption>Diferencia</figcaption></figure>` : '<figure></figure>'}</div>`)
  }
  html.push('</section>')
}
html.push(`<script>document.getElementById('resumen').innerHTML='<div class="chips"><span class="chip">${total} capturas comparadas (37 pantallas × 2 temas)</span><span class="chip ok">${identicas} pantallas idénticas</span><span class="chip ru">${ruido} idénticas salvo ruido</span><span class="chip"><b>${cambian}</b> con cambios</span></div>'</script></body></html>`)
fs.writeFileSync(path.join(OUT, 'index.html'), html.join('\n'))
console.log(`galería: ${path.join(OUT, 'index.html')} · ${total} capturas · ${identicas} pantallas idénticas, ${ruido} con solo ruido, ${cambian} con cambios`)
