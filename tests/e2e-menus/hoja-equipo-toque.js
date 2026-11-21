// Reproduce el fallo «la pantalla se oscurece y la hoja nunca se ve» al tocar «Añadir» o una posición en la ficha de equipo del admin (teléfono, TOQUE emulado, no mouse).
// Muestrea cada cuadro: ¿existe la hoja? ¿existe el velo? opacidad, translate, top, inert, data-visible, data-saliendo. Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/hoja-equipo-toque.js
const { lanzar, sleep } = require('./cdp.js'), inv5 = require('./inv5-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const MUESTREAR = `window.__ev = []; for (const t of ['popstate','pagehide','visibilitychange','blur']) window.addEventListener(t, () => window.__ev.push([Math.round(performance.now()), t]));
const __ps = history.pushState.bind(history); history.pushState = function (...a) { window.__ev.push([Math.round(performance.now()), 'pushState']); return __ps(...a) }; const __bk = history.back.bind(history); history.back = function () { window.__ev.push([Math.round(performance.now()), 'back']); return __bk() };
window.__m = ms => new Promise(res => { const t0 = performance.now(), out = []; const f = () => { const h = document.querySelector('[data-hoja]'), v = document.querySelector('[data-hoja-velo]'); const cs = h && getComputedStyle(h), esq = !!document.querySelector('[class*=esqueleto]'), cv = v && getComputedStyle(v);
  out.push([Math.round(performance.now() - t0), h ? Math.round(h.getBoundingClientRect().top) : null, h ? cs.opacity : null, h ? h.getAttribute('data-visible') : null, h ? h.hasAttribute('data-saliendo') : null, h ? h.hasAttribute('inert') : null, v ? cv.opacity : null, h ? cs.translate : null, h ? (h.offsetParent ? 'CB:' + h.offsetParent.tagName : 'viewport') : null, esq]);
  if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
const BTN = t => `(()=>[...document.querySelectorAll('button,[role=button]')].find(x=>x.getBoundingClientRect().width>0&&(x.getAttribute('aria-label')||x.textContent.trim()).startsWith(${JSON.stringify(t)})))()`
// [botón, ruta, pasos previos (toques por texto)]. /home/servicios es la pantalla del video (portal con menú inferior); /admin es la de escritorio ≤ 768 px.
const CASOS = process.env.SOLO ? JSON.parse(process.env.SOLO) : [['Añadir', '/home/servicios?servicio=conv', ['Alabanza']], ['Voces', '/home/servicios?servicio=conv', ['Alabanza']], ['Añadir', '/home/servicios?servicio=conv&__lider=1', ['Alabanza']], ['Añadir', '/admin?tab=setlist&servicio=conv&equipo=t1', []]]
;(async () => {
  const c = await lanzar(9611), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: inv5.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: MUESTREAR }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: inv5.SESION(), url: B })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); if (process.env.REDUCIR) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); if (process.env.CPU) await send('Emulation.setCPUThrottlingRate', { rate: +process.env.CPU }); await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const toque = async expr => { const r = JSON.parse(await ev(`(()=>{const e=${expr}; if(!e) return 'null'; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) return false
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] }); await sleep(60); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); return true }
  for (const [txt, ruta, pre = []] of CASOS) {
    console.log('\n' + txt + ' · ' + ruta)
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + ruta }); await sleep(3500); for (const t of pre) { await toque(BTN(t)); await sleep(1500) }
    const p = ev('__m(2500)'); await sleep(30); const t = await toque(BTN(txt)); const m = await p; console.log('  eventos:', JSON.stringify(await ev('window.__ev')))
    ok(t, 'se tocó «' + txt + '»')
    const filas = m.filter((x, i) => i === 0 || JSON.stringify(x.slice(1)) !== JSON.stringify(m[i - 1].slice(1)))
    console.log('  ms | top | op hoja | visible | saliendo | inert | op velo | translate | cb | esqueleto'); for (const f of filas.slice(0, 40)) console.log('  ' + f.join(' | '))
    const vio = m.some(x => x[1] !== null && x[1] < 700 && parseFloat(x[2]) > 0.9)
    ok(vio, 'la hoja llegó a verse en pantalla (top < 700 y opaca)')
    const velo = m.some(x => x[6] !== null && parseFloat(x[6]) > 0.5); console.log('  velo visible en algún cuadro:', velo)
  }
  await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
