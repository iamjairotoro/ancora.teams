// Junta dos imágenes lado a lado (mockup a la izquierda, captura a la derecha) con Chrome por CDP: node tests/e2e-menus/comparativa.js <mockup.png> <captura.png> <salida.png>
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), path = require('path'), os = require('os')
const [a, b, salida] = process.argv.slice(2).map(p => path.resolve(p))
;(async () => {
  const dim = f => { const d = fs.readFileSync(f); return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) } }
  const A = dim(a), B = dim(b), W = A.w + B.w + 40, H = Math.max(A.h, B.h)
  const html = path.join(os.tmpdir(), 'comparativa-' + process.pid + '.html')
  fs.writeFileSync(html, `<!doctype html><meta charset=utf-8><body style="margin:0;background:#808080;display:flex;gap:40px;align-items:flex-start"><img src="file://${a}" width="${A.w}" height="${A.h}"><img src="file://${b}" width="${B.w}" height="${B.h}">`)
  const c = await lanzar(9584), { send } = c
  try {
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
    await send('Page.navigate', { url: 'file://' + html }); await sleep(800)
    const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(salida, Buffer.from(s.data, 'base64'))
  } finally { await c.cerrar(); fs.unlinkSync(html) }
})().catch(e => { console.error(e); process.exit(1) })
