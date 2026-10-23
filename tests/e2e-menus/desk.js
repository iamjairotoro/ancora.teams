// Escritorio (1280): PNG + HTML normalizado de una lista de estados (JSON en ESC_JSON: [{id, ruta, pasos:[js...]}]) para comparar dos builds. Uso: BASE=... ESC_JSON=... node desk.js <carpeta>
const path = require('path'), fs = require('fs'), { lanzar, sleep } = require('./cdp.js'), M = require(process.env.MOCK_FILE || './inv5-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const OUT = path.resolve(process.argv[2]); for (const d of ['capturas', 'html']) fs.mkdirSync(path.join(OUT, d), { recursive: true })
const EST = JSON.parse(fs.readFileSync(process.env.ESC_JSON, 'utf8'))
const HTML = `(()=>{const c=document.body.cloneNode(true); c.querySelectorAll('script,style,link,noscript,next-route-announcer').forEach(e=>e.remove()); return c.innerHTML.replace(/__[A-Za-z0-9_-]{5}\\b/g,'').replace(/ id="[^"]*"/g,'').replace(/ for="[^"]*"/g,'').replace(/>\\s+</g,'><')})()`
;(async () => {
  for (const tema of ['dark', 'light']) { const c = await lanzar(+process.env.PUERTO || 9571); const { send, ev } = c
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] })
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(500); await ev(`localStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Emulation.setDeviceMetricsOverride', { width: +process.env.ANCHO || 1280, height: +process.env.ALTO || 900, deviceScaleFactor: +process.env.DPR || 1, mobile: (+process.env.ANCHO || 1280) < 500 })
    for (const e of EST) { await send('Page.navigate', { url: B + e.ruta }); await sleep(+process.env.ESPERA || 2600); for (const p of e.pasos || []) { await ev(p).catch(() => {}); await sleep(700) }
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(OUT, 'capturas', `${e.id}__${tema}.png`), Buffer.from(r.data, 'base64'))
      if (tema === 'dark') fs.writeFileSync(path.join(OUT, 'html', `${e.id}.html`), await ev(HTML)) }
    await c.cerrar() }
})().catch(e => { console.error(e); process.exit(1) })
