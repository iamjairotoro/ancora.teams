// Junta dos carpetas de capturas (antes y después) en UNA imagen por pareja: antes a la izquierda, después a la derecha. PNG RGB/RGBA de 8 bits sin entrelazado (el de CDP). Uso: node par.js <antes> <después> <salida>
const fs = require('fs'), zlib = require('zlib'), path = require('path')
const leer = f => { const b = fs.readFileSync(f); let o = 8, w, h, ct, idat = []; while (o < b.length) { const n = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8), d = b.slice(o + 8, o + 8 + n); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9] } if (t === 'IDAT') idat.push(d); o += 12 + n }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, px = Buffer.alloc(w * h * 4)
  const prev = Buffer.alloc(st), cur = Buffer.alloc(st)
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x++) { const a = x >= bpp ? cur[x - bpp] : 0, up = y ? prev[x] : 0, c = x >= bpp && y ? prev[x - bpp] : 0; let v = raw[y * (st + 1) + 1 + x]
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c } cur[x] = v & 255 }
    for (let x = 0; x < w; x++) { px[(y * w + x) * 4] = cur[x * bpp]; px[(y * w + x) * 4 + 1] = cur[x * bpp + 1]; px[(y * w + x) * 4 + 2] = cur[x * bpp + 2]; px[(y * w + x) * 4 + 3] = 255 } cur.copy(prev) }
  return { w, h, px } }
const crc = (() => { const t = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c }); return b => { let c = -1; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 } })()
const trozo = (tipo, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tipo), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
const [A, B, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true }); const GAP = 24
for (const n of fs.readdirSync(A).filter(f => f.endsWith('.png')).sort()) { if (!fs.existsSync(path.join(B, n))) continue
  const a = leer(path.join(A, n)), b = leer(path.join(B, n)), H = Math.max(a.h, b.h), W = a.w + GAP + b.w, out = Buffer.alloc(W * H * 4, 255)
  const pon = (im, x0) => { for (let y = 0; y < im.h; y++) im.px.copy(out, (y * W + x0) * 4, y * im.w * 4, (y + 1) * im.w * 4) }; pon(a, 0); pon(b, a.w + GAP)
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; out.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6
  fs.writeFileSync(path.join(OUT, n), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(raw, { level: 6 })), trozo('IEND', Buffer.alloc(0))])) }
console.log('listo', fs.readdirSync(OUT).length)
