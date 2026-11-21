// M6 en un navegador de verdad (teléfono de 390 px): el cambio de pestaña del portal del músico. Comprueba, por fotogramas, que el contenido nuevo entra con un fundido de 160 ms y 6 px, que lo anterior desaparece al instante (sin salida), que el menú inferior
// no se mueve, que la lente usa los tokens (280 ms) y no salta, que la tarjeta del día de Inicio NO aparece vacía (su entrada ya no corre al montarse la tira), que dos toques rápidos los gana el último sin esperar (incluida la vuelta A→B→A), que con
// «reducir movimiento» solo hay un fundido de 120 ms y que en escritorio (1280 px) no cambia nada. Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/pestanas-m6.js
const { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const REGISTRO = `window.__fr = (ms, accion) => new Promise(res => { const t0 = performance.now(), out = []; if (accion) (0, eval)(accion)
  const f = () => { const nav = document.querySelector('nav'), r = nav && nav.getBoundingClientRect(), len = document.querySelector('nav [class*="lente"]'), lc = len && getComputedStyle(len), cont = document.querySelector('.portal-content-wrap')
    const hs = cont ? [...cont.children] : [], h = hs[hs.length - 1], hc = h && getComputedStyle(h), tar = document.querySelector('[class*="tarjetaIn"]'), tc = tar && getComputedStyle(tar), m = lc && new DOMMatrixReadOnly(lc.transform)
    out.push({ t: Math.round(performance.now() - t0), n: hs.length, cls: hs.map(e => String(e.className).replace(/_[A-Za-z0-9-]{5,}/g, '').slice(0, 24)).join('|'), op: hc ? +(+hc.opacity).toFixed(3) : null, tr: hc ? hc.translate : null, an: hc ? hc.animationName : null, ad: hc ? hc.animationDuration : null, af: hc ? hc.animationTimingFunction : null,
      tarOp: tc ? +(+tc.opacity).toFixed(3) : null, nav: r ? [r.top, r.left, r.width, r.height].map(x => Math.round(x * 10) / 10) : null, lx: m ? Math.round(m.m41 * 10) / 10 : null, act: (document.querySelector('nav [aria-current="page"]') || {}).textContent || null })
    if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
;(async () => {
  const c = await lanzar(9602), { send, ev } = c
  await send('Network.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: REGISTRO }); await send('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const cargar = async () => { await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(4000) }
  const clic = async texto => { const r = JSON.parse(await ev(`(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.getBoundingClientRect().width>0&&x.textContent.trim().startsWith(${JSON.stringify(texto)}));if(!b)return 'null';const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) return false
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); return true }
  const cambiar = async (texto, ms = 1200) => { const p = ev(`__fr(${ms})`); await sleep(100); await clic(texto); return p }
  await cargar()

  console.log('\nEntrada del contenido nuevo')
  for (const tab of ['Servicios', 'Canciones', 'Chats', 'Perfil', 'Inicio']) {
    await sleep(700); const fr = await cambiar(tab)
    const nuevo = fr.findIndex((x, i) => i && x.cls !== fr[i - 1].cls), a = fr[nuevo], fin = fr[fr.length - 1]
    const medios = fr.filter(x => x.op !== null && x.op > 0.001 && x.op < 0.999 && x.cls === a.cls)
    ok(nuevo > 0 && a.an === 'anc-pestana-entra' && a.ad === '0.16s' && /cubic-bezier\(0\.23, 1, 0\.32, 1\)/.test(a.af), `${tab}: entra con una animación de 160 ms con --ease-out (${a && a.an}, ${a && a.ad})`)
    ok(a.op < 0.2 && /6px/.test(a.tr || '') || (a.tr && parseFloat(a.tr.split(' ')[1]) > 4), `${tab}: nace casi transparente y 6 px más abajo (opacity ${a.op}, translate ${a.tr})`)
    ok(fin.op === 1 && fin.tr === 'none', `${tab}: queda a opacidad 1 y sin translate residual`)
    ok(fr.slice(nuevo).every(x => x.n === 1), `${tab}: lo anterior desaparece al instante (nunca conviven dos pantallas en los cuadros)`)
    const navs = fr.map(x => x.nav).filter(Boolean); ok(navs.every(n => Math.abs(n[0] - navs[0][0]) < 0.6 && Math.abs(n[3] - navs[0][3]) < 0.6 && Math.abs(n[2] - navs[0][2]) < 0.6), `${tab}: el menú inferior no se mueve ni cambia de tamaño en ningún cuadro`)
    const lx = fr.map(x => x.lx).filter(v => v !== null), saltos = lx.filter((v, i) => i && Math.abs(v - lx[i - 1]) > 90).length
    ok(saltos === 0 && fin.act && fin.act.startsWith(tab), `${tab}: la lente llega sin saltos bruscos y la pestaña activa es la tocada`)
    if (tab === 'Inicio') ok(fr.every(x => x.tarOp === null || x.tarOp === 1), 'Inicio: la tarjeta del día no aparece vacía (a media opacidad) en ningún cuadro')
    ok(medios.length >= 2 || fr.length < 30, `${tab}: pasa por ${medios.length} cuadros de fundido`)
  }
  const css = JSON.parse(await ev(`(()=>{const l=document.querySelector('nav [class*="lente"]'),z=document.querySelector('nav [class*="zoom"]'),a=getComputedStyle(l),b=getComputedStyle(z);return JSON.stringify({ld:a.transitionDuration,lp:a.transitionProperty,zd:b.transitionDuration})})()`))
  ok(css.ld.split(', ').every(d => ['0.28s', '0.24s', '0.12s'].includes(d)) && css.zd.split(', ').every(d => d === '0.28s'), `la lente usa los tokens (transform/ancho 0,28 s, sombra 0,24 s, opacidad 0,12 s): ${css.ld} / zoom ${css.zd}`)

  console.log('\nToques rápidos: el último gana sin esperar')
  for (const [secuencia, ms] of [[['Servicios', 'Canciones'], 40], [['Canciones', 'Chats', 'Perfil'], 30], [['Servicios', 'Inicio'], 35]]) {
    await clic('Inicio'); await sleep(900)
    const p = ev(`__fr(1500)`); await sleep(100)
    for (const t of secuencia) { await clic(t); await sleep(ms) }
    const fr = await p, fin = fr[fr.length - 1], ultimo = secuencia[secuencia.length - 1]
    const t0 = fr.find(x => x.act && x.act.startsWith(ultimo))
    ok(fin.act && fin.act.startsWith(ultimo) && fin.n === 1, `${secuencia.join(' → ')}: queda la última (${fin.act}) con una sola pantalla`)
    await sleep(900)
    const desv = JSON.parse(await ev(`JSON.stringify((()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.getBoundingClientRect().width>0&&x.textContent.trim().startsWith(${JSON.stringify(ultimo)})),l=document.querySelector('nav [class*="lente"]');if(!b||!l)return {error:'sin '+(b?'lente':'botón')};const r=b.getBoundingClientRect(),q=l.getBoundingClientRect();return {d:Math.round(((r.left+r.width/2)-(q.left+q.width/2))*10)/10}})())`))
    ok(Math.abs(desv.d) < 3, `${secuencia.join(' → ')}: la lente termina centrada sobre la última pestaña (${JSON.stringify(desv)})`)
    ok(await ev(`document.querySelector('.portal-content-wrap').getAnimations({subtree:true}).filter(a=>a.animationName&&a.animationName.includes('pestana')&&a.playState==='running').length === 0`), `${secuencia.join(' → ')}: no queda ninguna animación de entrada pendiente de la pantalla intermedia`)
    const iguales = fr.filter(x => x.n === 1).map(x => x.cls); ok(new Set(iguales.slice(Math.floor(iguales.length * 0.7))).size === 1, `${secuencia.join(' → ')}: el contenido final es uno solo y estable`)
    ok(t0 && t0.t < 600, `${secuencia.join(' → ')}: la pestaña final se marca activa a los ${t0 && t0.t} ms (sin esperar a terminar nada)`)
  }

  console.log('\nTeléfono lento (CPU 4×): el segundo toque no espera a que Inicio, que es pesada, termine de dibujarse')
  await send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await clic('Perfil'); await sleep(2500)
  await ev(`window.__pd = []; addEventListener('pointerdown', e => __pd.push(Math.round(performance.now() - e.timeStamp)), true); window.__lt = []; new PerformanceObserver(l => l.getEntries().forEach(e => __lt.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); window.__rg = []; window.__tt0 = performance.now(); const f = () => { const cur = (document.querySelector('nav [aria-current=page]') || {}).textContent; __rg.push([Math.round(performance.now() - __tt0), cur]); if (performance.now() - __tt0 < 4000) requestAnimationFrame(f) }; f(); 0`)
  const t1 = Date.now(); await clic('Inicio'); await clic('Servicios'); const entre = Date.now() - t1
  await sleep(4200)
  const lento = JSON.parse(await ev(`JSON.stringify({ pd: __pd, lt: __lt, rg: __rg, fin: (document.querySelector('.portal-content-wrap').firstElementChild || {}).className || '' })`))
  const llego = lento.rg.find(r => r[1] && r[1].startsWith('Servicios'))
  ok(Math.max(0, ...lento.lt) < 350, `ninguna tarea larga pasa de 350 ms (la mayor: ${Math.max(0, ...lento.lt)} ms; antes, una sola de ≈600 ms bloqueaba hasta el segundo toque)`)
  ok(lento.pd.length === 2 && lento.pd[1] < 200, `el segundo toque se atiende con un retraso de ${lento.pd[1]} ms (retraso de entrada de cada toque: ${JSON.stringify(lento.pd)}; antes, con la pantalla pesada montándose de una vez, el segundo esperaba detrás de ella: ≈600 ms)`)
  ok(!!llego && /servicios/.test(lento.fin), `gana el último: «Servicios» queda activa (a los ${llego && llego[0]} ms con el teléfono 4× más lento) y su pantalla es la que se ve (${lento.fin.slice(0, 20)}); la de Inicio nunca llega a quedarse`)
  await send('Emulation.setCPUThrottlingRate', { rate: 1 })

  console.log('\nCon «reducir movimiento»')
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await cargar(); await sleep(500)
  const fr = await cambiar('Servicios'), nuevo = fr.findIndex((x, i) => i && x.cls !== fr[i - 1].cls), a = fr[nuevo]
  ok(a.an === 'anc-pestana-fundido' && a.ad === '0.12s' && fr.every(x => x.tr === null || x.tr === 'none'), `solo un fundido de 120 ms, sin desplazamiento (${a.an}, ${a.ad})`)
  await send('Emulation.setEmulatedMedia', { features: [] })

  console.log('\nEscritorio (1280 px)')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await cargar()
  const dk = await (async () => { const p = ev(`__fr(900)`); await sleep(100); await ev(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim().startsWith('Servicios')).click()`); return p })()
  ok(dk.every(x => x.an === 'none' || x.an === null), 'escritorio: el contenido no lleva ninguna animación de entrada (todo vive en teléfono)')
  console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); await c.cerrar(); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
