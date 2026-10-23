// Compara dos carpetas de capturas (PNG RGBA/RGB de 8 bits, sin entrelazado): idénticas al píxel o área y nivel máximo de la diferencia. Uso: node pngdiff.js <A> <B>
const fs = require('fs'), zlib = require('zlib'), path = require('path')
function leer(f) { const b = fs.readFileSync(f); let o = 8, w, h, ct, idat = []; while (o < b.length) { const n = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.slice(o + 8, o + 8 + n); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9] } if (t === 'IDAT') idat.push(d); o += 12 + n }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * bpp), st = w * bpp
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x++) { const a = x >= bpp ? px[y * st + x - bpp] : 0, up = y ? px[(y - 1) * st + x] : 0, c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0; let v = raw[y * (st + 1) + 1 + x]
    if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c } px[y * st + x] = v & 255 } }
  return { w, h, bpp, px } }
const [A, B] = process.argv.slice(2).map(d => path.join(d, 'capturas')); let iguales = 0, dif = 0
for (const n of fs.readdirSync(A).sort()) { if (!fs.existsSync(path.join(B, n))) { console.log('  (sin par)', n); continue } const a = leer(path.join(A, n)), b = leer(path.join(B, n))
  if (a.w !== b.w || a.h !== b.h) { console.log('  ≠', n, `tamaño ${a.w}x${a.h} vs ${b.w}x${b.h}`); dif++; continue }
  let cnt = 0, max = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) { let m = 0; for (let k = 0; k < a.bpp; k++) m = Math.max(m, Math.abs(a.px[(y * a.w + x) * a.bpp + k] - b.px[(y * a.w + x) * a.bpp + k])); if (m) { cnt++; max = Math.max(max, m); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } }
  if (cnt) { dif++; console.log('  ≠', n, `${cnt} px · x ${x0}-${x1}, y ${y0}-${y1} · dif máx ${max}`) } else iguales++ }
console.log(`PNG: ${iguales} idénticas al píxel · ${dif} con diferencias`)
