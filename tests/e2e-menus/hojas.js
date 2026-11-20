// Hojas inferiores (movimiento M2) en un navegador de verdad, teléfono de 390 px: mide la entrada (240 ms, curva de drawer), la salida (200 ms, el velo se desvanece, la hoja sale inert y sin recibir toques), que se desmonte al terminar,
// que reabrir a mitad de la salida cancele el desmontaje y regrese sin saltos, que el foco vuelva al botón que abrió (también cuando el toque no da foco, como en iPhone), que «reducir movimiento» deje solo un fundido de 120 ms, que
// el formulario de bloqueo nazca limpio en cada apertura y que en escritorio (1280 px) la hoja se desmonte al instante. Los guiones esperan a que la hoja desaparezca del documento antes de seguir (esperarSalida).
// Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/hojas.js
const { lanzar, sleep } = require('./cdp.js'), tira = require('./tira-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const MUESTREAR = `window.__m = (ms, accion) => new Promise(res => { const t0 = performance.now(), out = []; window.__t0 = t0; if (accion) (0, eval)(accion); const f = () => { const h = document.querySelector('[data-hoja]'), v = document.querySelector('[data-hoja-velo]'); out.push([Math.round(performance.now() - t0), h ? Math.round(h.getBoundingClientRect().top * 10) / 10 : null, v ? +(+getComputedStyle(v).opacity).toFixed(3) : null, h ? h.getAttribute('data-visible') : null, h ? +(+getComputedStyle(h).opacity).toFixed(3) : null, h ? h.getAnimations().length : null]); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
;(async () => {
  const c = await lanzar(9592), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: tira.PORTAL }); await send('Page.addScriptToEvaluateOnNewDocument', { source: MUESTREAR }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: tira.SESION(), url: B })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
  const clic = async sel => { const r = JSON.parse(await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return 'null'; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) return false
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); return true }
  const hayHoja = () => ev(`!!document.querySelector('[data-hoja]')`)
  const esperarSalida = async (max = 1500) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if (!(await hayHoja())) return Date.now() - t0; await sleep(20) } return -1 }
  const CHIP = 'button[aria-haspopup="dialog"]'
  const vp = JSON.parse(await ev('JSON.stringify({h:innerHeight})')).h
  const t0de = (m, f) => (m.find(f) || [0])[0]

  ok(!(await hayHoja()), 'sin hoja en el documento antes de abrir')
  // 1 · entrada
  await ev(`document.querySelector(${JSON.stringify(CHIP)}).focus()`)
  let p = ev('__m(700)'); await sleep(30); await clic(CHIP); let m = await p
  const dentro = m.filter(x => x[1] !== null), fin = dentro[dentro.length - 1], aparece = dentro[0], tope = t0de(m, x => x[1] !== null && x[1] <= fin[1] + 1)
  ok(aparece[1] >= vp - 2 && aparece[2] === 0, `la hoja nace fuera de la pantalla y el velo transparente (top ${aparece[1]} de ${vp}, velo ${aparece[2]})`)
  ok(fin[3] === 'true' && fin[2] === 1 && fin[1] < vp - 100, `queda en su sitio con el velo en 1 (top ${fin[1]})`)
  ok(tope - aparece[0] >= 200 && tope - aparece[0] <= 340, `la entrada dura ≈240 ms (de la aparición a su sitio: ${tope - aparece[0]} ms, incluye 2 cuadros de espera)`)
  const css = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-hoja]'),v=document.querySelector('[data-hoja-velo]'),a=getComputedStyle(h),b=getComputedStyle(v);return JSON.stringify({hd:a.transitionDuration,hp:a.transitionProperty,hf:a.transitionTimingFunction,vd:b.transitionDuration,vp:b.transitionProperty})})()`))
  ok(css.hd === '0.24s' && css.hp === 'translate' && /cubic-bezier\(0\.32, 0\.72, 0, 1\)/.test(css.hf) && css.vd === '0.24s' && css.vp === 'opacity', `entrada: translate 0,24 s con la curva de drawer; velo: opacity 0,24 s (${JSON.stringify(css)})`)
  const enfoque = await ev(`document.activeElement === document.querySelector('[data-hoja]')`)
  ok(enfoque, 'el foco entra en la hoja')
  // 2 · salida
  p = ev(`__m(700, "document.querySelector('[data-hoja-velo]').click()")`); await sleep(60)
  const mid = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-hoja]'),v=document.querySelector('[data-hoja-velo]');if(!h)return JSON.stringify(null);const a=getComputedStyle(h),b=getComputedStyle(v);return JSON.stringify({s:h.hasAttribute('data-saliendo'),i:h.hasAttribute('inert'),pe:a.pointerEvents,pv:b.pointerEvents,hd:a.transitionDuration,vd:b.transitionDuration,v:h.getAttribute('data-visible')})})()`))
  m = await p
  ok(mid && mid.s && mid.i && mid.pe === 'none' && mid.pv === 'none' && mid.hd === '0.2s' && mid.vd === '0.2s' && mid.v === 'false', `saliendo: inert, sin toques, 0,2 s (${JSON.stringify(mid)})`)
  const quitada = t0de(m, x => x[1] === null), fuera = t0de(m, x => x[1] !== null && x[1] >= vp - 1)
  ok(quitada >= 190 && quitada <= 330, `se desmonta al terminar la salida (≈${quitada} ms después del toque)`)
  const velos = m.filter(x => x[2] !== null).map(x => x[2]); ok(velos.every((v, i) => i === 0 || v <= velos[i - 1] + 0.001) && velos[velos.length - 1] <= 0.05, 'el velo se desvanece sin saltos')
  ok(fuera >= 120, `la hoja baja en el mismo sentido (llega abajo a los ${fuera} ms)`)
  ok(await ev(`document.activeElement === document.querySelector(${JSON.stringify(CHIP)})`), 'el foco vuelve al botón que abrió la hoja')
  // 2b · el toque no da foco (iPhone): se recuerda el último control tocado
  await ev(`(()=>{const b=document.querySelector(${JSON.stringify(CHIP)}); b.blur(); b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); b.click()})()`); await sleep(500)
  await ev(`document.querySelector('[data-hoja-velo]').click()`); await esperarSalida(); await sleep(50)
  ok(await ev(`document.activeElement === document.querySelector(${JSON.stringify(CHIP)})`), 'el foco vuelve al botón aun cuando el toque no le dio foco')
  // 3 · interrupción
  await clic(CHIP); await sleep(500); await ev(`window.__nodo = document.querySelector('[data-hoja]'); 0`)
  await ev(`window.__tr = null; document.addEventListener('pointerdown', () => { window.__tr = performance.now() }, { capture: true, once: true }); 0`)
  p = ev(`__m(900, "document.querySelector('[data-hoja-velo]').click()")`); await sleep(25); await clic(CHIP); m = await p
  const alto = m.filter(x => x[1] !== null).map(x => x[1]), reabierta = Math.round((await ev('window.__tr')) - (await ev('window.__t0')))
  ok(reabierta > 20 && reabierta < 180, `el toque que reabre cae a mitad de la salida (a los ${reabierta} ms de empezar a cerrar)`)
  const despues = m.filter(x => x[0] >= reabierta + 20 && x[1] !== null)
  ok(await ev(`document.querySelector('[data-hoja]') === window.__nodo`), 'reabrir a mitad de la salida cancela el desmontaje: es el mismo nodo, no se vuelve a crear')
  const final = alto[alto.length - 1], maxMedio = Math.max(...m.filter(x => x[0] <= reabierta + 20 && x[1] !== null).map(x => x[1]))
  ok(final < vp - 100 && m[m.length - 1][3] === 'true' && m[m.length - 1][2] === 1, `termina abierta y en su sitio (top ${final})`)
  ok(maxMedio < vp - 20, `sin salto: no llegó a salir del todo antes de volver (máximo ${maxMedio} de ${vp})`)
  ok(despues.every((x, i) => i === 0 || x[1] <= despues[i - 1][1] + 1.5), 'tras reabrir sube de forma continua desde donde iba (sin reiniciar la entrada)')
  await ev(`document.querySelector('[data-hoja-velo]').click()`); ok((await esperarSalida()) >= 0, 'y vuelve a cerrarse y desmontarse con normalidad')
  // 3b · tras una interrupción, la apertura siguiente vuelve a animar desde abajo (antes quedaba «lista» de más y aparecía de golpe)
  p = ev('__m(600)'); await sleep(30); await clic(CHIP); m = await p
  const tras = m.find(x => x[1] !== null)
  ok(tras && tras[1] >= vp - 2 && tras[3] === 'false', `tras una interrupción, la siguiente apertura nace fuera de pantalla y sube (primer cuadro: top ${tras && tras[1]} de ${vp}, visible ${tras && tras[3]})`)
  await ev(`document.querySelector('[data-hoja-velo]').click()`); await esperarSalida()
  // 4 · el formulario de bloqueo nace limpio cada vez
  await ev(`(()=>{const bs=[...document.querySelectorAll('[aria-label="Días"] button')];window.__bs=bs.length})()`)
  let abierto = false
  for (let i = 3; i < 25 && !abierto; i++) { await ev(`document.querySelectorAll('[aria-label="Días"] button')[${i}].click()`); await sleep(500); if (await ev(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Bloquear esta fecha')`)) abierto = true }
  ok(abierto, 'hay un día sin servicio ni bloqueo para probar la hoja de bloqueo')
  const BLOQ = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Bloquear esta fecha')`
  await ev(`${BLOQ}.click()`); await sleep(500)
  await ev(`(()=>{const i=document.querySelector('[data-hoja] input'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'Viaje largo'); i.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await ev(`[...document.querySelectorAll('[data-hoja] button')].find(b=>b.textContent.trim()==='Cancelar').click()`); await esperarSalida(); await ev(`${BLOQ}.click()`); await sleep(500)
  ok((await ev(`document.querySelector('[data-hoja] input').value`)) === '', 'la hoja de bloqueo nace con el motivo vacío en cada apertura')
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); document.querySelector('[data-hoja]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); ok((await esperarSalida()) >= 0, 'Escape cierra la hoja de bloqueo y espera la salida')
  // 5 · «reducir movimiento»: solo un fundido de 120 ms
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300)
  p = ev('__m(600)'); await sleep(30); await clic(CHIP); m = await p
  const rd = m.filter(x => x[1] !== null), tops = new Set(rd.map(x => Math.round(x[1])))
  const cr = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-hoja]'),a=getComputedStyle(h);return JSON.stringify({d:a.transitionDuration,p:a.transitionProperty,t:a.translate})})()`))
  ok(tops.size === 1 && cr.d === '0.12s' && cr.p === 'opacity' && (cr.t === 'none' || cr.t === '0px'), `con reducir movimiento no hay desplazamiento: solo opacity 0,12 s (${JSON.stringify(cr)}; posiciones distintas: ${tops.size})`)
  ok(rd[0][4] === 0 && rd[rd.length - 1][4] === 1 && rd[rd.length - 1][2] === 1, 'el fundido va de 0 a 1 en la hoja y en el velo ' + JSON.stringify(m.slice(0, 10)))
  p = ev(`__m(500, "document.querySelector('[data-hoja-velo]').click()")`); m = await p; const q2 = t0de(m, x => x[1] === null)
  ok(q2 >= 100 && q2 <= 260, `con reducir movimiento se desmonta tras ≈120 ms (${q2} ms)`)
  await send('Emulation.setEmulatedMedia', { features: [] })
  // 6 · Disponibilidad (día y rango) y «Escribirle a…» en teléfono
  const irA = async txt => { await ev(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes(${JSON.stringify(txt)})).click()`); await sleep(1200) }
  await irA('Servicios'); await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Disponibilidad').click()`); await sleep(1200)
  const DIA = `[...document.querySelectorAll('button')].find(b=>/^\\d{1,2}$/.test(b.textContent.trim()) && !b.disabled)`
  await ev(`${DIA}.click()`); await sleep(500)
  const attrs = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-hoja]');return JSON.stringify(h?{v:h.getAttribute('data-visible'),r:h.getAttribute('role')}:null)})()`))
  ok(attrs && attrs.v === 'true' && attrs.r === 'dialog', 'Disponibilidad: la hoja del día sube y queda visible')
  p = ev(`__m(700, "document.querySelector('[data-hoja] button[aria-label=Cerrar]').click()")`); m = await p
  const q3 = t0de(m, x => x[1] === null); ok(q3 >= 190 && q3 <= 330 && m.some(x => x[1] !== null && x[1] > 0 && x[3] === 'false'), `Disponibilidad: la hoja del día sale animada y se desmonta (${q3} ms)`)
  await ev(`[...document.querySelectorAll('button')].find(b=>/Bloquear un rango/.test(b.textContent)).click()`); await sleep(500)
  ok(await ev(`!!document.querySelector('[data-hoja][aria-labelledby="disp-rango-titulo"]')`), 'Disponibilidad: la hoja del rango sube')
  p = ev(`__m(700, "document.querySelector('[data-hoja] button[aria-label=Cerrar]').click()")`); m = await p; ok(t0de(m, x => x[1] === null) >= 190, 'Disponibilidad: la hoja del rango sale animada')
  await irA('Chats'); await ev(`[...document.querySelectorAll('button')].find(b=>/Nuevo mensaje directo/.test(b.textContent)).click()`); await sleep(500)
  ok(await ev(`!!document.querySelector('[data-hoja][aria-labelledby="chat-directo-titulo"]')`), 'Mensajes: «Escribirle a…» sube')
  await ev(`document.querySelector('[data-hoja]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); ok((await esperarSalida()) >= 0, 'Mensajes: Escape cierra y se desmonta tras la salida')
  await sleep(100); ok(await ev(`/Nuevo mensaje directo/.test(document.activeElement.textContent)`), 'Mensajes: el foco vuelve a «Nuevo mensaje directo»')
  // 7 · escritorio: sin espera, la hoja se desmonta al instante y no depende de la animación de teléfono
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
  await ev(`[...document.querySelectorAll('button, a')].find(b=>/Servicios/.test(b.textContent)).click()`); await sleep(1200)
  const hayDisp = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Disponibilidad'); if(!b) return false; b.click(); return true})()`); await sleep(1200)
  if (hayDisp && await ev(`!!(${DIA})`)) {
    await ev(`${DIA}.click()`); await sleep(400)
    const d = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-hoja]');const a=getComputedStyle(h);return JSON.stringify({an:a.animationName,tr:a.transitionProperty,t:a.translate})})()`))
    ok(/disp-aparece/.test(d.an) && d.t === 'none', `escritorio: la hoja conserva su animación de siempre (${JSON.stringify(d)})`)
    await ev(`document.querySelector('[data-hoja] button[aria-label=Cerrar]').click()`); await sleep(40); ok(!(await hayHoja()), 'escritorio: la hoja se desmonta al instante (a los 40 ms ya no está)')
  } else ok(false, 'escritorio: no se pudo abrir Disponibilidad para la prueba')
  await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
