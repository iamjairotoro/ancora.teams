// INVENTARIO (solo lectura) de los botones y pestañas de TEXTO del teléfono que aún no usan el estilo nuevo (anc-bt o el selector Segmentado). Recorre cada pantalla de ESC_JSON en un navegador real (390 px, claro) con los mismos
// simuladores de cap.js, anota para cada elemento visible su texto o nombre accesible, su clase, medidas, esquinas, fondo, peso e ícono, y escribe un JSON. No cambia nada de la app.
// Uso: ESC_JSON=tests/e2e-menus/escenarios/inventario-botones.json BASE=http://127.0.0.1:3168 node tests/e2e-menus/inventario-botones.js /tmp/inventario.json
const fs = require('fs'), { lanzar, sleep } = require('./cdp.js')
const MOCKS = { inv5: require('./inv5-mock.js'), home: require('./home-mock.js'), portal: require('./portal-mock.js'), homeadmin: require('./homeadmin-mock.js') }
const B = process.env.BASE || 'http://127.0.0.1:3168', SALIDA = process.argv[2] || '/tmp/inventario.json', ESC = JSON.parse(fs.readFileSync(process.env.ESC_JSON, 'utf8')).map(e => ({ mock: 'inv5', ...e }))
const RESUMEN = `;(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));if(u.startsWith('/api/admin/servicios-resumen'))return new Response(JSON.stringify({servicios:[]}),{status:200,headers:{'Content-Type':'application/json'}});return f(i,o)}})()`
const RECOGER = `(()=>{
  const out = [], vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' }
  const base = c => (typeof c === 'string' ? c.trim().split(/\\s+/).map(x => x.replace(/__[\\w-]{5,}$/, '')) : []).slice(0, 3).join(' ')
  for (const e of document.querySelectorAll('button, [role=button], [role=tab], a[href], summary, [role=menuitem]')) {
    if (!vis(e) || e.closest('nav') || e.closest('[data-diagnostico-viewport]')) continue
    const cl = typeof e.className === 'string' ? e.className : ''
    if (/\\banc-bt\\b/.test(cl) || e.closest('[role=radiogroup]')) continue
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e), txt = (e.innerText || '').trim().replace(/\\s+/g, ' '), lab = e.getAttribute('aria-label') || ''
    const R = Math.max(parseFloat(cs.borderTopLeftRadius) || 0, parseFloat(cs.borderTopRightRadius) || 0)
    const dlg = e.closest('[role=dialog]')
    out.push({ tag: e.tagName.toLowerCase(), rol: e.getAttribute('role') || '', texto: txt.slice(0, 60), nombre: lab.slice(0, 60), clase: base(cl), w: Math.round(r.width), h: Math.round(r.height), radio: Math.round(R), bg: cs.backgroundColor, peso: cs.fontWeight, color: cs.color, svg: !!e.querySelector('svg'), emoji: /[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u.test(txt), hoja: dlg ? (dlg.getAttribute('aria-label') || (document.getElementById(dlg.getAttribute('aria-labelledby') || '-') || {}).textContent || 'diálogo').slice(0, 40) : '', y: Math.round(r.top), ancho: innerWidth })
  }
  return JSON.stringify(out) })()`
;(async () => {
  const todo = []
  for (const grupo of Object.keys(MOCKS)) {
    const escenas = ESC.filter(e => e.mock === grupo); if (!escenas.length) continue
    const c = await lanzar(9661), { send, ev } = c, M = MOCKS[grupo]
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK + (grupo === 'homeadmin' ? '' : RESUMEN) }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
    for (const e of escenas) {
      await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(700); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`)
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + e.ruta })
      let paso = 'ok'
      for (const p of e.pasos) { const [k, ...r] = p.split(':'), v = r.join(':')
        if (k === 'e') { await sleep(+v); continue }
        if (k === 'j') { await ev(v).catch(() => {}); await sleep(400); continue }
        const js = `(()=>{ const b=[...document.querySelectorAll('button, [role=button], [role=tab]')].find(x=>x.getBoundingClientRect().width>0 && (x.textContent.trim()===${JSON.stringify(v)} || x.textContent.trim().startsWith(${JSON.stringify(v)}) || (x.getAttribute('aria-label')||'').startsWith(${JSON.stringify(v)}))); if(!b) return false; b.click(); return true })()`
        if (!(await ev(js))) paso = 'no se encontró el paso «' + p + '»'
        await sleep(500) }
      const lista = JSON.parse(await ev(RECOGER)); todo.push({ id: e.id, ruta: e.ruta, paso, elementos: lista })
      console.log(`${e.id.padEnd(30)} ${String(lista.length).padStart(3)} elementos${paso === 'ok' ? '' : '  ⚠ ' + paso}`)
    }
    await c.cerrar()
  }
  fs.writeFileSync(SALIDA, JSON.stringify(todo, null, 1)); console.log('→', SALIDA)
})().catch(e => { console.error(e); process.exit(1) })
