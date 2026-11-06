// Mide el tamaño REAL (px del navegador) de todo el texto visible de una pantalla, en los tamaños de la interfaz (data-ui comodo / estandar / compacto) y a 390 y 360 px. Solo mide; no cambia nada.
// Sale con 1 si algún texto visible mide menos del piso de etiquetas (12 px). Uso: ESC_JSON=tests/e2e-menus/escenarios/escala-prueba.json BASE=http://127.0.0.1:3168 node tests/e2e-menus/medir-textos.js [filtro-de-id]
const fs = require('fs'), { lanzar, sleep } = require('./cdp.js')
const MOCKS = { inv5: require('./inv5-mock.js'), home: require('./home-mock.js'), portal: require('./portal-mock.js'), homeadmin: require('./homeadmin-mock.js') }
const B = process.env.BASE || 'http://127.0.0.1:3168', FILTRO = process.argv[2] || '', PISO = 12
const ESC = JSON.parse(fs.readFileSync(process.env.ESC_JSON, 'utf8')).filter(e => e.ui).map(e => ({ mock: 'inv5', ...e })).filter(e => !FILTRO || e.id.includes(FILTRO))
const MEDIR = `(()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.nodeValue.trim();if(!t)continue;const e=n.parentElement;if(!e||/^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName))continue;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none')continue;o.push({px:Math.round(parseFloat(cs.fontSize)*100)/100,t:t.slice(0,28),c:String(e.className||'').split(' ')[0].slice(0,50)})}return JSON.stringify({campos:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select')].filter(e=>e.getBoundingClientRect().width>0).map(e=>parseFloat(getComputedStyle(e).fontSize)),textos:o})})()`
;(async () => {
  const filas = []
  for (const grupo of ['inv5', 'home', 'portal', 'homeadmin']) {
    const escenas = ESC.filter(e => e.mock === grupo); if (!escenas.length) continue
    const c = await lanzar(grupo === 'inv5' ? 9521 : 9522), { send, ev } = c, M = MOCKS[grupo]
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    for (const W of [390, 360]) for (const e of escenas) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(350)
      await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + e.ruta }); await sleep(2800)
      for (const p of e.pasos || []) { const [k, ...r] = p.split(':'), v = r.join(':'); if (k === 'e') await sleep(+v); else if (k === 'j') { await ev(v).catch(() => {}); await sleep(500) } }
      await ev(`document.documentElement.dataset.ui=${JSON.stringify(e.ui)}`); await sleep(500)
      const m = JSON.parse(await ev(MEDIR)), hist = {}; for (const x of m.textos) hist[x.px] = (hist[x.px] || 0) + 1
      const bajos = m.textos.filter(x => x.px < PISO), min = Math.min(...m.textos.map(x => x.px)), campoMin = m.campos.length ? Math.min(...m.campos) : null
      filas.push({ id: e.id, W, ui: e.ui, textos: m.textos.length, min, bajos, campoMin, hist })
      console.log(`${e.id.padEnd(22)} ${W} ${e.ui.padEnd(9)} textos ${String(m.textos.length).padStart(3)}  mínimo ${String(min).padStart(5)} px  ${bajos.length ? 'BAJO ' + bajos.length + ': ' + bajos.slice(0, +(process.env.VER || 4)).map(x => x.t + '=' + x.px + (process.env.VER ? ' [' + x.c + ']' : '')).join(' | ') : 'sin textos bajo ' + PISO + ' px'}  campos ${campoMin === null ? '—' : campoMin + ' px'}`)
    }
    await c.cerrar()
  }
  const malos = filas.filter(f => f.bajos.length || (f.campoMin !== null && f.campoMin < 16)); console.log(`\n${filas.length - malos.length} de ${filas.length} sin textos bajo ${PISO} px ni campos bajo 16 px`)
  process.exit(malos.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
