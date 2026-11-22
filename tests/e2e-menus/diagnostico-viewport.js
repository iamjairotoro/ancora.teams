// Panel de diagnóstico del viewport en un navegador de verdad (teléfono de 390 px). Uso: BASE=http://127.0.0.1:3168 [ESPERA=ausente] node tests/e2e-menus/diagnostico-viewport.js
// Con un build de la rama dev/local: sin ?debug no hay panel; con ?debug=viewport aparece y muestra las medidas; se minimiza, sigue al navegar dentro de la app y se apaga con × y con ?debug=off.
// Sin poder escribir una dirección (app instalada): 5 toques seguidos sobre el título de Perfil lo encienden, queda guardado y la × lo apaga.
// Con un build de main (ESPERA=ausente): el panel no existe ni con el enlace.
const { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168', ausente = process.env.ESPERA === 'ausente'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const PANEL = `document.querySelector('[data-diagnostico-viewport]')`
;(async () => {
  const c = await lanzar(9631), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const ir = async ruta => { await send('Page.navigate', { url: B + ruta }); await sleep(3500) }
  await ir('/portal/t65?debug=off'); ok(!(await ev(`!!${PANEL}`)), 'sin el parámetro (y tras ?debug=off) no hay panel')
  await ir('/portal/t65?debug=viewport')
  if (ausente) { ok(!(await ev(`!!${PANEL}`)), 'en un build de main el panel no existe ni con ?debug=viewport'); await ir('/portal/t65'); await ev(`[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Perfil')).click()`); await sleep(1200); for (let i = 0; i < 8; i++) { await ev(`[...document.querySelectorAll('h1')].find(h=>h.textContent.trim()==='Perfil').click()`); await sleep(120) } ok(!(await ev(`!!${PANEL}`)) && (await ev(`localStorage.getItem('anc-debug-viewport')`)) === null, 'en main 8 toques sobre el título de Perfil no encienden nada ni guardan nada'); await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0) }
  ok(await ev(`!!${PANEL}`), 'con ?debug=viewport aparece el panel')
  const txt = await ev(`${PANEL}.innerText`)
  for (const k of ['innerHeight', 'vv.height', 'vv.offsetTop', 'vv.pageTop', 'nav.bottom', '.statusFade alto', '--safe-top', 'instalada', 'hojas abiertas', 'hoja top', 'último evento']) ok(txt.includes(k), 'muestra «' + k + '»')
  ok(/innerHeight\s+844/.test(txt) && /vv\.height\s+844/.test(txt) && /desfase[^\n]*\s0\b/.test(txt), 'las cifras coinciden con el viewport (844) y el desfase es 0')
  const r = JSON.parse(await ev(`(()=>{const r=${PANEL}.getBoundingClientRect();return JSON.stringify({t:r.top,rt:innerWidth-r.right})})()`)); ok(r.t <= 8 && r.rt <= 8, `queda en la esquina de arriba a la derecha (top ${r.t}, a ${r.rt} px del borde derecho)`)
  await ev(`[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Canciones')).click()`); await sleep(1500)
  ok(await ev(`!!${PANEL}`), 'sigue encendido al navegar dentro de la app (queda guardado en la pestaña)')
  await ev(`[...${PANEL}.querySelectorAll('button')].find(b=>/Minimizar/.test(b.getAttribute('aria-label')||'')).click()`); await sleep(400)
  ok(!(await ev(`${PANEL}.innerText`)).includes('innerHeight'), 'el botón «–» lo minimiza')
  await ev(`[...${PANEL}.querySelectorAll('button')].find(b=>/Ocultar/.test(b.getAttribute('aria-label')||'')).click()`); await sleep(400)
  ok(!(await ev(`!!${PANEL}`)), 'el botón «×» lo oculta'); await ir('/portal/t65'); ok(!(await ev(`!!${PANEL}`)), 'y al recargar sigue apagado')
  // 5 toques sobre el título de Perfil
  const perfil = `[...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Perfil')).click()`
  const tocarTitulo = async (n, ms) => { for (let i = 0; i < n; i++) { await ev(`[...document.querySelectorAll('h1')].find(h=>h.textContent.trim()==='Perfil').click()`); await sleep(ms) } }
  await ev(perfil); await sleep(1200)
  await tocarTitulo(4, 150); ok(!(await ev(`!!${PANEL}`)), '4 toques seguidos no lo encienden')
  await sleep(2000); await tocarTitulo(2, 150); await sleep(1800); await tocarTitulo(3, 150); ok(!(await ev(`!!${PANEL}`)), '5 toques con una pausa de más de 1,5 s en medio tampoco')
  await sleep(2000); await tocarTitulo(5, 150); await sleep(500); ok(await ev(`!!${PANEL}`), '5 toques seguidos sobre el título de Perfil lo encienden')
  ok(await ev(`localStorage.getItem('anc-debug-viewport')`) === '1', 'queda guardado en el almacenamiento de la app (localStorage)')
  await ir('/portal/t65'); ok(await ev(`!!${PANEL}`), 'y sigue encendido tras cerrar y volver a abrir (recarga completa)')
  await ev(`[...${PANEL}.querySelectorAll('button')].find(b=>/Ocultar/.test(b.getAttribute('aria-label')||'')).click()`); await sleep(400)
  ok(!(await ev(`!!${PANEL}`)) && (await ev(`localStorage.getItem('anc-debug-viewport')`)) === null, 'la × lo apaga y borra lo guardado')
  await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
