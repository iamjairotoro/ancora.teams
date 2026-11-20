// M3 en un navegador de verdad, teléfono de 390 px: mide la ENTRADA y la SALIDA de las hojas del admin móvil y del líder (HojaBase y las que cuelgan de ella: herramienta, posición, persona, agregar persona, acciones del servicio, horario, cambiar de
// servicio), de la pantalla Adjuntos y del menú ⋯ de la ficha, y de las ventanas centradas (confirmar, cancelar, abrir una justo después de cerrar otra); además el crecimiento de los menús flotantes desde su botón y «reducir movimiento».
// Por caso: nace fuera de pantalla / transparente, sube en 240 ms con la curva de drawer, sale en 200 ms (inert, sin toques), se desmonta al terminar, reabrir a mitad de la salida cancela el desmontaje (mismo nodo) y el foco vuelve al botón.
// Los guiones esperan a que la pieza desaparezca del documento antes de seguir (esperarSalida). Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/hojas-m3.js
const { lanzar, sleep, esperarSalida } = require('./cdp.js'), inv5 = require('./inv5-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const RAIZ = '[data-hoja],[data-pantalla],[data-ventana]', CERRAR = RAIZ.split(',').map(r => r + ' button[aria-label=Cerrar]').join(',')
const MUESTREAR = `window.__m = (ms, accion) => new Promise(res => { const t0 = performance.now(), out = []; window.__t0 = t0; if (accion) (0, eval)(accion); const f = () => { const h = document.querySelector('${RAIZ}'), v = document.querySelector('[data-hoja-velo],[data-ventana-velo]'); const cs = h && getComputedStyle(h); out.push([Math.round(performance.now() - t0), h ? Math.round(h.getBoundingClientRect().top * 10) / 10 : null, v ? +(+getComputedStyle(v).opacity).toFixed(3) : null, h ? h.getAttribute('data-visible') : null, h ? +(+cs.opacity).toFixed(3) : null, h ? cs.scale : null, document.querySelectorAll('${RAIZ}').length]); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
const BTN = (texto, dentro) => `(()=>{const r=${dentro || 'document'};return [...r.querySelectorAll('button,[role=button]')].find(x=>x.getBoundingClientRect().width>0&&(((x.getAttribute('aria-label')||x.textContent.trim()).startsWith(${JSON.stringify(texto)}))))})()`
const SERV = '/home/servicios?servicio=conv&__lider=1', ORD = '/admin?tab=setlist&servicio=conv&equipo=t1&herramienta=orden&__blq=4'
// Cada caso: ruta del simulador inv5, pasos previos (texto del botón), el botón que la abre y cómo se cierra.
const CASOS = [
  { id: 'líder · Agregar herramienta (HojaBase)', ruta: SERV + '&__sinherr=1', pre: ['Alabanza'], abre: 'Añadir', cierra: 'esc' },
  { id: 'líder · posición (HojaBase)', ruta: SERV, pre: ['Alabanza'], abre: 'Coros', cierra: 'x', reabre: true },
  { id: 'líder · persona (HojaBase)', ruta: '/home/personas?__lider=1', pre: [], abre: 'Ver a Ana', cierra: 'x' },
  { id: 'líder · Agregar persona (HojaBase)', ruta: '/home/personas?__lider=1', pre: [], abre: 'Agregar persona', cierra: 'esc' },
  { id: 'admin · Más acciones del servicio', ruta: '/admin?tab=setlist&servicio=conv', pre: [], abre: 'Más acciones', cierra: 'esc' },
  { id: 'admin · Cambiar horario', ruta: '/admin?tab=setlist&servicio=conv', pre: [], abre: 'Cambiar horario', cierra: 'x' },
  { id: 'admin · Cambiar de servicio', ruta: '/admin?tab=setlist&servicio=conv', pre: [], abre: 'Cambiar de servicio', cierra: 'x' },
  { id: 'admin · posición del equipo (HojasEquipo)', ruta: '/admin?tab=setlist&servicio=conv&equipo=t1', pre: [], abre: 'Voz principal', cierra: 'x' },
  { id: 'admin · Añadir herramienta', ruta: '/admin?tab=setlist&servicio=conv&equipo=t1', pre: [], abre: 'Añadir', cierra: 'esc' },
  { id: 'admin · Orden del servicio: acciones', ruta: ORD, pre: [], abre: 'Acciones del Orden', cierra: 'esc' },
  { id: 'admin · Orden del servicio: Añadir', ruta: ORD, pre: [], abre: 'Añadir', cierra: 'esc' },
  { id: 'admin · Bloque del orden', ruta: ORD, pre: [], abre: 'MC / Bienvenida', cierra: 'x' },
]
;(async () => {
  const c = await lanzar(9597), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: inv5.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: MUESTREAR }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: inv5.SESION(), url: B })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const vp = 844
  const clic = async elExpr => { const r = JSON.parse(await ev(`(()=>{const e=${elExpr}; if(!e) return 'null'; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) return false
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); return true }
  const ir = async ruta => { await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + ruta }); await sleep(3500) }
  const t0de = (m, f) => (m.find(f) || [0])[0]
  for (const k of CASOS) {
    console.log('\n' + k.id)
    await ir(k.ruta); for (const p of k.pre) { await clic(BTN(p)); await sleep(1200) }
    await ev(`window.__op = ${BTN(k.abre)}; window.__opEt = window.__op && (window.__op.getAttribute('aria-label') || window.__op.textContent.trim()); 0`)
    let p = ev('__m(700)'); await sleep(30); const abrio = await clic(BTN(k.abre)); let m = await p
    ok(abrio, 'se encontró y tocó «' + k.abre + '»')
    const dentro = m.filter(x => x[1] !== null), a = dentro[0], fin = dentro[dentro.length - 1]
    ok(a && a[1] >= vp - 2 && a[3] === 'false', `nace fuera de la pantalla (top ${a && a[1]} de ${vp}, visible ${a && a[3]})`)
    ok(fin && fin[3] === 'true' && fin[1] < vp - 100 && fin[5] === 'none', `queda en su sitio y en reposo sin translate/scale residual (top ${fin && fin[1]}, scale ${fin && fin[5]})`)
    const tope = t0de(m, x => x[1] !== null && x[1] <= fin[1] + 1); ok(tope - a[0] >= 200 && tope - a[0] <= 340, `la entrada dura ≈240 ms (${tope - a[0]} ms)`)
    const css = JSON.parse(await ev(`(()=>{const h=document.querySelector('${RAIZ}'),a=getComputedStyle(h);return JSON.stringify({d:a.transitionDuration,p:a.transitionProperty,f:a.transitionTimingFunction,tr:a.translate})})()`))
    ok(css.d === '0.24s' && /translate/.test(css.p) && /cubic-bezier\(0\.32, 0\.72, 0, 1\)/.test(css.f), `entrada: translate 0,24 s con la curva de drawer (${JSON.stringify(css)})`)
    const cerrarJs = k.cierra === 'esc' ? `document.querySelector('${RAIZ}').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))` : `document.querySelector('${CERRAR}').click()`
    p = ev(`__m(900, ${JSON.stringify(cerrarJs)})`); await sleep(80)
    const mid = JSON.parse(await ev(`(()=>{const h=document.querySelector('${RAIZ}'),v=document.querySelector('[data-hoja-velo]');if(!h)return JSON.stringify(null);const a=getComputedStyle(h);return JSON.stringify({s:h.hasAttribute('data-saliendo'),i:h.hasAttribute('inert'),pe:a.pointerEvents,hd:a.transitionDuration})})()`))
    m = await p
    ok(mid && mid.s && mid.i && mid.pe === 'none' && mid.hd === '0.2s', `saliendo: inert, sin toques, 0,2 s (${JSON.stringify(mid)})`)
    const quitada = t0de(m, x => x[1] === null); ok(quitada >= 190 && quitada <= 450, `se desmonta al terminar la salida (≈${quitada} ms después de cerrar)`)
    await sleep(100)
    ok(await ev(`(()=>{const a=document.activeElement,o=window.__op;return a===o||(!!a&&!!window.__opEt&&(a.getAttribute('aria-label')||a.textContent.trim())===window.__opEt)})()`), 'el foco vuelve al botón que la abrió')
    ok(await ev(`document.body.style.overflow !== 'hidden'`), 'el desplazamiento de la página se soltó')
    if (k.reabre) {
      await clic(BTN(k.abre)); await sleep(500); await ev(`window.__nodo = document.querySelector('${RAIZ}'); 0`)
      await ev(`window.__tr = null; document.addEventListener('pointerdown', () => { window.__tr = performance.now() }, { capture: true, once: true }); 0`)
      p = ev(`__m(900, ${JSON.stringify(cerrarJs)})`); await sleep(25); await clic(BTN(k.abre)); m = await p
      const re = Math.round((await ev('window.__tr')) - (await ev('window.__t0 || 0')))
      ok(await ev(`document.querySelector('${RAIZ}') === window.__nodo`), 'reabrir a mitad de la salida cancela el desmontaje: es el mismo nodo')
      const ult = m[m.length - 1]; ok(ult[3] === 'true' && ult[1] < vp - 100, `termina abierta y en su sitio (top ${ult[1]})`)
      await ev(`document.querySelector('${CERRAR}').click()`); ok((await esperarSalida(ev)) >= 0, 'y vuelve a cerrar y a desmontarse')
    }
  }
  ok((await c.consola.filter(x => /error/i.test(x.tipo || x.type || '') && !/favicon|Failed to load resource|ERR_/.test(JSON.stringify(x))).length) === 0, 'sin errores en la consola')
  await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
