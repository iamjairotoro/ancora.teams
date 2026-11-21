// M4 y M5 en un navegador de verdad (390 px). M4: la tarjeta, las píldoras y la hoja de la tira usan los tokens (duraciones y curva leídas del estilo calculado; el alto de la tarjeta se anima 280 ms y se suelta al terminar).
// M5: el aviso que ya existe (PersonToast, el de TeamPanel) sube desde abajo con un fundido y sale con un fundido, con los tokens; con «reducir movimiento», solo un fundido de 120 ms. No hay un aviso nuevo en la tira de días.
// Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/avisos-m4m5.js
const { lanzar, sleep } = require('./cdp.js'), inv5 = require('./inv5-mock.js'), tira = require('./tira-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const MUESTREAR = `window.__m = (ms, accion, sel) => new Promise(res => { const t0 = performance.now(), out = []; if (accion) (0, eval)(accion); const f = () => { const h = document.querySelector(sel), cs = h && getComputedStyle(h); out.push([Math.round(performance.now() - t0), h ? +(+cs.opacity).toFixed(3) : null, h ? cs.translate : null, h ? h.getAttribute('data-visible') : null, h ? h.hasAttribute('data-saliendo') : null]); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
;(async () => {
  const c = await lanzar(9600), { send, ev } = c
  await send('Network.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: MUESTREAR })
  let mockId = null
  const usarMock = async M => { if (mockId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: mockId }); mockId = (await send('Page.addScriptToEvaluateOnNewDocument', { source: M.PORTAL || M.MOCK })).identifier; await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B }) }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const ir = async (ruta, ms = 3500) => { await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + ruta }); await sleep(ms) }

  // ═════ M4 · la tira de días con tokens ═════
  console.log('\nM4 · tira de días')
  await usarMock(tira); await ir('/portal/t65', 3500)
  for (let i = 0; i < 40 && !(await ev(`document.querySelectorAll('[aria-label="Días"] button').length > 30`)); i++) await sleep(250)
  // la tarjeta anima su entrada al CAMBIAR de día (no al montarse la tira, M6): se toca otro día antes de leerla
  await ev(`document.querySelectorAll('[aria-label="Días"] button')[16].click()`); await sleep(600)
  const css = JSON.parse(await ev(`(()=>{const p=document.querySelector('[aria-label="Días"] button'),t=p.closest('section').querySelector('[aria-live]'),ti=t.firstElementChild,a=getComputedStyle(p),b=getComputedStyle(t),c=getComputedStyle(ti),l=getComputedStyle(p.parentElement.querySelector('span'));return JSON.stringify({pd:a.transitionDuration,pp:a.transitionProperty,pf:a.transitionTimingFunction,td:b.transitionDuration,tf:b.transitionTimingFunction,ad:c.animationDuration,af:c.animationTimingFunction,ld:l.transitionDuration})})()`))
  const drawer = /cubic-bezier\(0\.32, 0\.72, 0, 1\)/
  ok(css.pd.split(', ')[0] === '0.28s' && drawer.test(css.pf.split(/,(?![^(]*\))/)[0]) && css.pd.split(', ').every(d => ['0.28s', '0.24s', '0.12s'].includes(d)), `la píldora: transform en 0,28 s (--anc-dur-screen) con la curva de drawer; colores en 0,24 s; presión 0,12 s (${css.pd})`)
  ok(css.td === '0.28s' && drawer.test(css.tf), `el alto de la tarjeta se anima en 0,28 s con la curva de drawer (${css.td})`)
  ok(css.ad === '0.28s' && drawer.test(css.af), `la tarjeta nueva entra en 0,28 s (${css.ad})`)
  // el alto se anima y se suelta al terminar (280 ms + margen), sin quedar fijo
  const dia = n => ev(`document.querySelectorAll('[aria-label="Días"] button')[${n}].click()`)
  await dia(15); await sleep(800)
  const alturas = JSON.parse(await ev(`(async()=>{const t=document.querySelector('[aria-live]'),out=[];const t0=performance.now();document.querySelectorAll('[aria-label="Días"] button')[17].click();await new Promise(r=>{const f=()=>{out.push([Math.round(performance.now()-t0),t.style.height,Math.round(t.getBoundingClientRect().height)]);if(performance.now()-t0<700)requestAnimationFrame(f);else r()};f()});return JSON.stringify(out)})()`))
  const fijo = alturas.filter(x => x[1] !== ''), suelto = alturas.find(x => x[0] > 100 && x[1] === '')
  ok(fijo.length >= 5 && fijo[fijo.length - 1][0] >= 250 && suelto && suelto[0] <= 520, `el alto se fija mientras se anima (${fijo.length} cuadros, hasta ≈${fijo.length && fijo[fijo.length - 1][0]} ms) y se suelta a los ≈${suelto && suelto[0]} ms (280 + 100)`)
  const distintas = new Set(alturas.map(x => x[2])); ok(distintas.size >= 4, `el alto pasa por valores intermedios (${distintas.size} distintos)`)
  // la hoja de bloqueo y el mes siguen funcionando con los tokens
  await ev(`document.querySelectorAll('[aria-label="Días"] button')[17].click()`); await sleep(600)
  ok(await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Bloquear esta fecha');if(!b)return false;b.click();return true})()`), 'se abre la hoja de bloqueo'); await sleep(700)
  ok(await ev(`!!document.querySelector('[data-hoja][data-visible="true"]') && getComputedStyle(document.querySelector('[data-hoja] button')).transitionDuration.split(', ').every(d=>['0.12s','0.16s','0.24s'].includes(d))`), 'la hoja de bloqueo abre y sus botones y chips usan duraciones de los tokens')
  await ev(`[...document.querySelectorAll('[data-hoja] button')].find(b=>b.textContent.trim()==='Cancelar').click()`); await sleep(700)

  // ═════ M5 · el aviso que ya existe (TeamPanel / AddPersonDialog) ═════
  console.log('\nM5 · aviso («Se agregó …»)')
  await usarMock(inv5); await ir('/admin?tab=personas', 3500)
  const click = t => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getBoundingClientRect().width>0&&(x.getAttribute('aria-label')||x.textContent.trim()).startsWith(${JSON.stringify(t)}));if(b)b.click();return !!b})()`)
  const fill = (ph, v) => ev(`(()=>{const i=[...document.querySelectorAll('input')].find(x=>x.placeholder===${JSON.stringify(ph)});const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,${JSON.stringify(v)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  const guardarPersona = async (nombre, mail) => { await click('Agregar'); await sleep(900); await click('Persona'); await sleep(1200); await fill('Ana', nombre); await fill('Pérez', 'Nueva'); await fill('ana@ejemplo.com', mail); await sleep(300) }
  const AV = '[data-aviso]'
  await guardarPersona('Prueba', 'prueba.nueva@example.com')
  let p = ev(`__m(4200, "${'document.querySelectorAll(\'button\')'}" + ".length && [...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar').click()", '${AV}')`); let m = await p
  const dentro = m.filter(x => x[1] !== null), a = dentro[0], f = dentro.find(x => x[3] === 'true' && x[0] > a[0] + 280)
  ok(a && a[1] === 0 && a[2] !== 'none' && a[3] === 'false', `el aviso nace transparente y desplazado hacia abajo (opacity ${a && a[1]}, translate ${a && a[2]})`)
  ok(f && f[1] === 1 && f[2] === 'none', `queda a opacidad 1 sin translate residual (${f && JSON.stringify(f)})`)
  const tope = (dentro.find(x => x[1] >= 0.99) || [0])[0]; ok(tope - a[0] >= 180 && tope - a[0] <= 340, `la entrada dura ≈240 ms (${tope - a[0]} ms)`)
  const cssA = JSON.parse(await ev(`JSON.stringify((()=>{const e=document.querySelector('${AV}');return e?{d:getComputedStyle(e).transitionDuration,p:getComputedStyle(e).transitionProperty}:null})())`)); 
  const saliendo = dentro.filter(x => x[4] === true), quitada = (m.find(x => x[0] > a[0] + 500 && x[1] === null) || [0])[0]
  ok(saliendo.length >= 3, `al irse pasa por «saliendo» (${saliendo.length} cuadros)`)
  ok(saliendo.every(x => x[2] === 'none'), 'la salida es solo un fundido: no se desplaza (translate none)')
  const op = saliendo.map(x => x[1]); ok(op.every((v, i) => i === 0 || v <= op[i - 1] + 0.001) && op[op.length - 1] < 0.15, `se desvanece sin saltos (${op[0]} → ${op[op.length - 1]})`)
  const durSal = saliendo.length ? saliendo[saliendo.length - 1][0] - saliendo[0][0] : 0
  ok(quitada > 0 && durSal >= 140 && durSal <= 330, `sale y se desmonta (en «saliendo» ≈${durSal} ms; fuera a los ${quitada} ms)`)
  // «reducir movimiento»
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await ir('/admin?tab=personas', 3500); await guardarPersona('Otra', 'otra.nueva@example.com')
  p = ev(`__m(1200, "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar').click()", '${AV}')`); m = await p
  const dr = m.filter(x => x[1] !== null), cr = JSON.parse(await ev(`(async()=>{await new Promise(r=>setTimeout(r,300));const e=document.querySelector('${AV}');return JSON.stringify(e?{d:getComputedStyle(e).transitionDuration,p:getComputedStyle(e).transitionProperty,t:getComputedStyle(e).translate}:null)})()`))
  ok(dr.every(x => x[2] === 'none') && dr[0][1] === 0, `con reducir movimiento no hay desplazamiento, solo un fundido (translate siempre none; ${JSON.stringify(cr)})`)
  await send('Emulation.setEmulatedMedia', { features: [] })
  console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); await c.cerrar(); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
