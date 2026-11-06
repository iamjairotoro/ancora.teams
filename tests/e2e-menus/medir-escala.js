// Mide qué elementos de una pantalla SÍ siguen al factor --esc y cuáles no: carga la pantalla a 390 px, la mide con data-ui=comodo (1,00) y con data-ui=compacto (0,85) y compara elemento por elemento. Solo mide; no cambia nada.
// Uso: ESC_JSON=tests/e2e-menus/escenarios/escala-prueba.json BASE=http://127.0.0.1:3168 SALIDA=/ruta/salida.json node tests/e2e-menus/medir-escala.js [filtro-de-id]
const fs = require('fs'), { lanzar, sleep } = require('./cdp.js')
const MOCKS = { inv5: require('./inv5-mock.js'), home: require('./home-mock.js'), portal: require('./portal-mock.js'), homeadmin: require('./homeadmin-mock.js') }
const B = process.env.BASE || 'http://127.0.0.1:3168', FILTRO = process.argv[2] || ''
const ESC = JSON.parse(fs.readFileSync(process.env.ESC_JSON, 'utf8')).filter(e => e.ui === 'comodo').map(e => ({ mock: 'inv5', ...e })).filter(e => !FILTRO || e.id.includes(FILTRO))
const MEDIR = `(()=>{const px=v=>parseFloat(v)||0;return JSON.stringify([...document.body.querySelectorAll('*')].map((e,i)=>{const r=e.getBoundingClientRect();if(r.width<1||r.height<1||/^(SCRIPT|STYLE|NOSCRIPT|PATH|CIRCLE|RECT|LINE|G|TSPAN)$/i.test(e.tagName))return null;const s=getComputedStyle(e);const tx=[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim());return {i,tag:e.tagName.toLowerCase(),cl:(e.getAttribute('class')||'').toString().split(' ')[0].slice(0,40),txt:tx?e.textContent.trim().slice(0,24):'',w:r.width,h:r.height,fs:px(s.fontSize),pt:px(s.paddingTop),pl:px(s.paddingLeft),gap:px(s.rowGap),rad:px(s.borderTopLeftRadius),bg:s.backgroundColor!=='rgba(0, 0, 0, 0)',sh:s.boxShadow!=='none',lh:px(s.lineHeight)}}).filter(Boolean))})()`
;(async () => {
  const salida = {}
  for (const grupo of ['inv5', 'home', 'portal', 'homeadmin']) {
    const escenas = ESC.filter(e => e.mock === grupo); if (!escenas.length) continue
    const c = await lanzar(grupo === 'inv5' ? 9521 : 9522), { send, ev } = c, M = MOCKS[grupo]
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    for (const e of escenas) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(350)
      await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + e.ruta })
      for (const p of e.pasos || []) { const [k, ...r] = p.split(':'), v = r.join(':'); if (k === 'e') await sleep(+v); else if (k === 'j' && !/dataset\.ui/.test(v)) { await ev(v).catch(() => {}); await sleep(500) } }
      const r = {}
      for (const ui of ['comodo', 'compacto']) { await ev(`document.documentElement.dataset.ui=${JSON.stringify(ui)}`); await sleep(600); r[ui] = JSON.parse(await ev(MEDIR)) }
      salida[e.id.replace('-comodo', '')] = { comodo: r.comodo, compacto: r.compacto }
      console.log(e.id, r.comodo.length, r.compacto.length)
    }
    await c.cerrar()
  }
  fs.writeFileSync(process.env.SALIDA, JSON.stringify(salida))
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
