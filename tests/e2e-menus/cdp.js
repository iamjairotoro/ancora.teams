// Mini cliente CDP (Chrome sin ventana, perfil temporal propio). Solo para pruebas locales. (Reescrito: el original se perdió de la carpeta temporal.)
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path'), http = require('http')
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const getJson = url => new Promise((res, rej) => http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } }) }).on('error', rej))
async function lanzar(puerto = 9333) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-e2e-'))
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${puerto}`, `--user-data-dir=${dir}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' })
  let tabs
  for (let i = 0; i < 60; i++) { try { tabs = await getJson(`http://localhost:${puerto}/json`); if (tabs.length) break } catch {} await sleep(250) }
  const pagina = tabs.find(t => t.type === 'page')
  const ws = new WebSocket(pagina.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r))
  let id = 0; const pend = new Map(); const eventos = []; const consola = []; const red = []
  ws.addEventListener('message', m => { const d = JSON.parse(m.data)
    if (d.id && pend.has(d.id)) { const { res, rej } = pend.get(d.id); pend.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result) }
    else if (d.method) { eventos.push(d)
      if (d.method === 'Runtime.consoleAPICalled') consola.push(`[${d.params.type}] ` + d.params.args.map(a => a.value ?? a.description ?? '').join(' '))
      if (d.method === 'Runtime.exceptionThrown') consola.push('[EXCEPCIÓN] ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text))
      if (d.method === 'Network.responseReceived') red.push({ url: d.params.response.url, status: d.params.response.status, tipo: d.params.response.mimeType })
    } })
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  const cerrar = async () => { try { await send('Browser.close') } catch {} ; try { proc.kill() } catch {} ; await sleep(500); try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} }
  return { send, ev, sleep, consola, red, eventos, cerrar }
}
module.exports = { lanzar, sleep }
