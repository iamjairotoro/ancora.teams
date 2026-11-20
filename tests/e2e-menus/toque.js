// Respuesta al toque (movimiento M1) en un navegador de verdad, teléfono de 390 px: fuerza :active (CSS.forcePseudoState) y mide la escala y la duración; revisa que TODO lo tocable que debe responder lo haga
// (la transición incluye `scale`), que lo excluido no responda (menú inferior, deshabilitados, interruptores, editor, lectura) y que con «reducir movimiento» no haya escala. Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/toque.js [--lista]
const { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), homeadmin = require('./homeadmin-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const SEL = `button, [role="button"], summary, li > a[href]`
const MIDE = `(()=>{const out={ok:[],sin:[],excl:[]};const ex=e=>e.disabled||e.getAttribute('aria-disabled')==='true'||e.hasAttribute('aria-checked')||e.closest('nav')||e.classList.contains('anc-btn')||e.closest('[data-sin-toque]');
 for(const e of document.querySelectorAll(${JSON.stringify(SEL)})){const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;const cs=getComputedStyle(e),tp=cs.transitionProperty,resp=/\\bscale\\b|\\ball\\b/.test(tp);
  const d=(e.tagName.toLowerCase()+'.'+(typeof e.className==='string'?e.className.split(/\\s+/)[0].replace(/__[\\w-]{5,}$/,''):''));
  if(ex(e)){ if(/\\bscale\\b/.test(tp)) out.excl.push(d+' «'+(e.textContent||'').trim().slice(0,20)+'»') } else if(resp) out.ok.push(d); else out.sin.push(d+' «'+(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,22)+'» tr='+tp)}
 return JSON.stringify(out)})()`
;(async () => {
  const c = await lanzar(9582), { send, ev } = c
  const escenas = [['portal', portal, '/portal/t65', ''], ['portal', portal, '/portal/t65', "document.querySelector('nav div button:nth-of-type(2)').click()"], ['portal', portal, '/portal/t65', "document.querySelector('nav div button:nth-of-type(5)').click()"], ['admin', homeadmin, '/home', ''], ['admin', homeadmin, '/admin?tab=setlist', ''], ['admin', homeadmin, '/admin?tab=personas', ''], ['admin', homeadmin, '/admin?tab=canciones', ''], ['admin', homeadmin, '/home?__lider=1', '']]
  const sinTotal = {}, okTotal = {}, exclTotal = {}
  for (const [g, M, ruta, paso] of escenas) {
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }).catch(() => {}); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + ruta }); await sleep(3500)
    if (paso) { await ev(paso); await sleep(1500) }
    const r = JSON.parse(await ev(MIDE)); for (const x of r.sin) sinTotal[x] = (sinTotal[x] || 0) + 1; for (const x of r.ok) okTotal[x] = (okTotal[x] || 0) + 1; for (const x of r.excl) exclTotal[x] = (exclTotal[x] || 0) + 1
  }
  console.log(`responden: ${Object.values(okTotal).reduce((a, b) => a + b, 0)} · sin transición de escala: ${Object.values(sinTotal).reduce((a, b) => a + b, 0)} · excluidos que responden: ${Object.keys(exclTotal).length}`)
  if (process.argv.includes('--lista')) { console.log(JSON.stringify(sinTotal, null, 1)); console.log(JSON.stringify(exclTotal, null, 1)) }
  ok(Object.keys(exclTotal).length === 0, 'lo excluido (menú inferior, deshabilitados, interruptores, editor, lectura) no responde')
  ok(Object.keys(sinTotal).length === 0, 'todo lo tocable que debe responder lo hace (' + Object.keys(sinTotal).length + ' sin transición de escala)')
  // medición con :active forzado (otro navegador, solo con el portal simulado)
  await c.cerrar(); const c2 = await lanzar(9583); const send2 = c2.send, ev2 = c2.ev
  await send2('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await send2('Network.enable'); await send2('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B }); await send2('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send2('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
  const send3 = send2, ev3 = ev2
  await send3('DOM.enable'); await send3('CSS.enable'); const { root } = await send3('DOM.getDocument', { depth: 1 })
  const medir = async (selector, esperado, nombre) => {
    const { nodeId } = await send3('DOM.querySelector', { nodeId: root.nodeId, selector }); if (!nodeId) { ok(false, nombre + ': no se encontró ' + selector); return }
    const antes = JSON.parse(await ev3(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const cs=getComputedStyle(e);return JSON.stringify({s:cs.scale,d:cs.transitionDuration,p:cs.transitionProperty,f:cs.transitionTimingFunction})})()`))
    await send3('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] }); await sleep(40)
    const mid = JSON.parse(await ev3(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).scale`)); await sleep(260)
    const fin = JSON.parse(await ev3(`JSON.stringify(getComputedStyle(document.querySelector(${JSON.stringify(selector)})).scale)`))
    await send3('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }); await sleep(300)
    const suelto = JSON.parse(await ev3(`JSON.stringify(getComputedStyle(document.querySelector(${JSON.stringify(selector)})).scale)`))
    ok(parseFloat(fin) === esperado && /(^|, )0\.12s(,|$)/.test(antes.d) && /scale/.test(antes.p) && (suelto === 'none' || parseFloat(suelto) === 1) && /cubic-bezier\(0\.23, 1, 0\.32, 1\)/.test(antes.f), `${nombre}: escala ${fin} (esperada ${esperado}), duración ${antes.d}, curva ${antes.f}, vuelve a ${suelto}; a los 40 ms iba en ${mid}`)
  }
  await medir('li > button', 0.98, 'fila o tarjeta (hija de una lista)')
  await medir('button[class*="enlace"]', 0.97, 'botón suelto («Ver todos»)')
  await medir('[aria-label="Días"] button', 0.97, 'píldora de la tira (sigue con su transform propio)')
  // excluidos, «reducir movimiento» y escritorio: con :active forzado NO hay escala
  const sinEscala = async (selector, nombre) => { const { nodeId } = await send3('DOM.querySelector', { nodeId: (await send3('DOM.getDocument', { depth: 1 })).root.nodeId, selector }); if (!nodeId) { ok(false, nombre + ': no se encontró ' + selector); return }
    await send3('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['active'] }); await sleep(300); const e = JSON.parse(await ev3(`JSON.stringify(getComputedStyle(document.querySelector(${JSON.stringify(selector)})).scale)`)); await send3('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }); ok(e === 'none' || parseFloat(e) === 1, `${nombre}: escala ${e} al presionar (debe quedar sin escala)`) }
  await sinEscala('nav button', 'menú inferior')
  await send2('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300); await sinEscala('li > button', 'con reducir movimiento')
  await send2('Emulation.setEmulatedMedia', { features: [] }); await send2('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await send2('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500); await sinEscala('button', 'escritorio (1280 px)')
  await c2.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
