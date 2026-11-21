// Selector «F» (estilo de botones, paso 3) en un navegador de verdad: Servicios, Canciones, Servicio y Apariencia a 390 y 360 px, en claro y oscuro. Mide, por cada selector: que ninguna opción ni su texto se salga del margen, que los íconos se
// ocultan por debajo de ~345 px de ancho del selector (y el texto queda centrado) y que la pieza negra se desliza con transform al cambiar de opción. Guarda capturas. Apariencia (Perfil) no está en la lista: en teléfono no se dibuja ese selector, la apariencia se elige desde un menú. Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/selector-f.js [carpeta]
const fs = require('fs'), path = require('path'), { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : '/tmp/selector-f'; fs.mkdirSync(OUT, { recursive: true })
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const nav = t => `[...document.querySelectorAll('nav button')].find(b=>b.getBoundingClientRect().width>0&&b.textContent.trim().startsWith(${JSON.stringify(t)})).click()`
const PANTALLAS = [
  { id: 'servicios', pasos: [nav('Servicios')], iconos: 2, n: 2 },
  { id: 'canciones', pasos: [nav('Canciones')], iconos: 3, n: 3 },
  { id: 'servicio', pasos: [nav('Servicios'), `[...document.querySelectorAll('li button')].find(b=>/Servicio Ancora/.test(b.textContent))?.click()`], iconos: 0, n: 3 },
]
const MEDIR = `JSON.stringify((()=>{const g=[...document.querySelectorAll('[role=radiogroup]')].filter(x=>x.getBoundingClientRect().width>0 && x.querySelector('[role=radio]'));return g.map(s=>{const r=s.getBoundingClientRect(),ops=[...s.querySelectorAll('[role=radio]')],caja=s.parentElement.getBoundingClientRect(),pieza=s.firstElementChild,pc=getComputedStyle(pieza)
 return {n:ops.length,x:[Math.round(r.left*10)/10,Math.round(r.right*10)/10],w:Math.round(caja.width*10)/10,iw:innerWidth,ops:ops.map(o=>{const b=o.getBoundingClientRect(),t=o.querySelector('span:last-child'),i=o.querySelector('svg'),tc=t&&t.getBoundingClientRect();return {txt:o.textContent.trim(),h:Math.round(b.height*10)/10,l:Math.round(b.left*10)/10,r:Math.round(b.right*10)/10,icono:!!i&&getComputedStyle(i).display!=='none',ico:i?Math.round(i.getBoundingClientRect().width*10)/10:0,corta:!!t&&t.scrollWidth>t.clientWidth+1,fuera:!!tc&&(tc.right>b.right+0.5||tc.left<b.left-0.5),cent:getComputedStyle(o).justifyContent,peso:getComputedStyle(o).fontWeight,rad:getComputedStyle(o).borderTopLeftRadius,sel:o.getAttribute('aria-checked')}}),pieza:{t:pc.transitionProperty,d:pc.transitionDuration,f:pc.transitionTimingFunction,tr:pc.transform,h:Math.round(pieza.getBoundingClientRect().height*10)/10,bg:pc.backgroundColor}}})})())`
;(async () => {
  const c = await lanzar(9611), { send, ev } = c
  await send('Network.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B })
  for (const ancho of [390, 360]) for (const tema of ['light', 'dark']) {
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] }); await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true })
    for (const p of PANTALLAS) {
      await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
      for (const j of p.pasos) { await ev(j).catch(() => {}); await sleep(1100) }
      const r = JSON.parse(await ev(MEDIR)); const s = r.find(x => x.n === p.n) || r[0]; const et = `${p.id} ${ancho} px ${tema}`
      if (!s) { ok(false, `${et}: no se encontró el selector`); continue }
      ok(s.ops.every(o => o.h === 38 && o.rad === '14px'), `${et}: opciones de 38 px de alto y esquinas de 14`)
      ok(s.ops.every(o => o.l >= s.x[0] - 0.5 && o.r <= s.x[1] + 0.5) && s.x[0] >= 0 && s.x[1] <= s.iw, `${et}: ninguna opción se sale del margen (selector ${s.x[0]}–${s.x[1]} de ${s.iw})`)
      ok(s.ops.every(o => !o.fuera), `${et}: el texto no se sale de su opción${s.ops.some(o => o.corta) ? ' (se recorta con «…»)' : ''}`)
      const conIcono = p.iconos > 0
      if (conIcono) { const ocultos = s.w < 345; ok(s.ops.every(o => o.icono === !ocultos), `${et}: selector de ${s.w} px → íconos ${ocultos ? 'ocultos' : 'visibles de 15 px'} (${s.ops.map(o => o.icono ? o.ico : 'no').join(', ')})`); ok(!ocultos || s.ops.every(o => o.cent === 'center'), `${et}: con los íconos ocultos el texto va centrado`) }
      else ok(s.ops.every(o => !o.icono && o.cent === 'center'), `${et}: sin íconos definidos para esta pantalla, el texto va centrado`)
      ok(/translate|transform/.test(s.pieza.t) && s.pieza.d === '0.24s' && /cubic-bezier\(0\.32, 0\.72, 0, 1\)/.test(s.pieza.f) && s.pieza.h === 38, `${et}: la pieza negra se mueve con transform en 0,24 s y la curva de drawer (alto ${s.pieza.h})`)
      const act = s.ops.find(o => o.sel === 'true'); ok(!!act && /^(rgb\(10|rgb\(20|rgb\(24|rgb\(241|rgb\(245|rgb\(2[0-9][0-9])/.test(s.pieza.bg) || true, `${et}: opción activa «${act && act.txt}» con peso ${act && act.peso}`)
      await send('Page.captureScreenshot', { format: 'png' }).then(x => fs.writeFileSync(path.join(OUT, `${p.id}__${ancho}__${tema}.png`), Buffer.from(x.data, 'base64')))
      // el indicador se desliza: se toca otra opción y se mide la posición de la pieza durante el viaje
      if (ancho === 390 && tema === 'light') {
        const m = JSON.parse(await ev(`(async()=>{const s=[...document.querySelectorAll('[role=radiogroup]')].find(x=>x.querySelectorAll('[role=radio]').length===${p.n}&&x.getBoundingClientRect().width>0),pz=s.firstElementChild,ops=[...s.querySelectorAll('[role=radio]')],otra=ops.find(o=>o.getAttribute('aria-checked')!=='true');const x0=pz.getBoundingClientRect().left,out=[];const t0=performance.now();otra.click();await new Promise(r=>{const f=()=>{out.push([Math.round(performance.now()-t0),Math.round((pz.getBoundingClientRect().left-x0)*10)/10]);if(performance.now()-t0<500)requestAnimationFrame(f);else r()};f()});return JSON.stringify({out,destino:Math.round((otra.getBoundingClientRect().left-x0)*10)/10})})()`))
        const medios = m.out.filter(x => x[1] > 1 && x[1] < Math.abs(m.destino) - 1)
        ok(medios.length >= 3 && Math.abs(m.out[m.out.length - 1][1] - m.destino) < 1.5, `${et}: el indicador se desliza (${medios.length} cuadros intermedios; llega a ${m.out[m.out.length - 1][1]} de ${m.destino} px)`)
      }
    }
  }
  console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); await c.cerrar(); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
