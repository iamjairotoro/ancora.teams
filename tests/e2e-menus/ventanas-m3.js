// M3 en un navegador de verdad (390 px): ventanas centradas (confirmar, cancelar, abrir una justo después de cerrar otra), menús que crecen desde su botón, pantalla Adjuntos con el visor de PDF abierto (ninguna capa se rompe),
// el menú ⋯ de la ficha de canción, Preferencias y Tonalidad de la lectura, y «reducir movimiento». Todas las confirmaciones de la app pasan por ventanas: aquí se prueba que confirmar y cancelar siguen funcionando con la salida animada.
// Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/ventanas-m3.js
const { lanzar, sleep, esperarSalida } = require('./cdp.js'), inv5 = require('./inv5-mock.js'), portal = require('./portal-mock.js'), tira = require('./tira-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const RAIZ = '[data-hoja],[data-pantalla],[data-ventana]'
const MUESTREAR = `window.__m = (ms, accion, sel) => new Promise(res => { const t0 = performance.now(), out = []; window.__t0 = t0; if (accion) (0, eval)(accion); const f = () => { const hs = [...document.querySelectorAll(sel || '${RAIZ}')], h = hs[hs.length - 1], cs = h && getComputedStyle(h); out.push([Math.round(performance.now() - t0), h ? Math.round(h.getBoundingClientRect().top * 10) / 10 : null, h ? h.getAttribute('data-visible') : null, h ? +(+cs.opacity).toFixed(3) : null, h ? cs.scale : null, hs.length, hs.filter(e => e.hasAttribute('data-saliendo')).length, h ? cs.translate : null]); if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
const BTN = (texto, dentro) => `(()=>{const r=${dentro || 'document'};return [...r.querySelectorAll('button,[role=button]')].find(x=>x.getBoundingClientRect().width>0&&(((x.getAttribute('aria-label')||x.textContent.trim()).startsWith(${JSON.stringify(texto)}))))})()`
const ADJ = [{ id: 'a1', nombre: 'Partitura de prueba.pdf', tamano: 120000, subidoPor: 'Ana', fecha: '2026-10-01T10:00:00Z' }]
const PARCHE_ADJ = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.adjuntos=${JSON.stringify(ADJ)};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
;(async () => {
  const c = await lanzar(9598), { send, ev } = c
  await send('Network.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: MUESTREAR })
  let mockId = null
  const usarMock = async M => { if (mockId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: mockId }); mockId = (await send('Page.addScriptToEvaluateOnNewDocument', { source: M.PORTAL || M.MOCK })).identifier; await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B }) }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  const clic = async elExpr => { const r = JSON.parse(await ev(`(()=>{const e=${elExpr}; if(!e) return 'null'; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) return false
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); return true }
  const ir = async (ruta, esperaMs = 3500) => { await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + ruta }); await sleep(esperaMs) }
  const vp = 844, t0de = (m, f) => (m.find(f) || [0])[0]
  await usarMock(inv5)

  // ═════ 1 · ventanas centradas (confirmar) ═════
  console.log('\nVentanas centradas: confirmar, cancelar y abrir una justo después de cerrar otra')
  await ir('/home/personas?__lider=1'); await clic(BTN('Ver a Pedro')); await sleep(900)
  const QUITAR = BTN('Quitar', `document.querySelector('[data-hoja]')`)
  await ev(`window.__op = ${QUITAR}; 0`)
  let p = ev(`__m(700, null, '[data-ventana]')`); await sleep(30); ok(await clic(QUITAR), 'se tocó «Quitar…» (abre la ventana de confirmar)'); let m = await p
  const v0 = m.find(x => x[2] !== null), vf = m[m.length - 1]
  ok(v0 && v0[2] === 'false' && v0[3] === 0 && /0\.96/.test(v0[4]), `la ventana nace transparente y a escala .96 (opacity ${v0 && v0[3]}, scale ${v0 && v0[4]})`)
  ok(vf[2] === 'true' && vf[3] === 1 && vf[4] === 'none', `queda a escala 1 sin residuo (scale ${vf[4]})`)
  const cssV = JSON.parse(await ev(`(()=>{const a=getComputedStyle(document.querySelector('[data-ventana]')),b=getComputedStyle(document.querySelector('[data-ventana-velo]'));return JSON.stringify({d:a.transitionDuration,p:a.transitionProperty,vd:b.transitionDuration,rol:document.querySelector('[data-ventana]').getAttribute('role')})})()`))
  ok(cssV.d.split(', ').every(x => x === '0.24s') && /opacity/.test(cssV.p) && /scale/.test(cssV.p) && cssV.vd === '0.24s' && cssV.rol === 'alertdialog', `entrada: fundido y escala en 0,24 s (${JSON.stringify(cssV)})`)
  ok(await ev(`document.activeElement === document.querySelector('[data-ventana]')`), 'el foco entra en la ventana')
  // cancelar: sale en 200 ms (más corta), el foco vuelve a «Quitar», la hoja de debajo sigue viva
  p = ev(`__m(800, ${JSON.stringify(`(${BTN('Cancelar', "document.querySelector('[data-ventana]')")}).click()`)}, '[data-ventana]')`); await sleep(70)
  const mid = JSON.parse(await ev(`(()=>{const h=document.querySelector('[data-ventana]');if(!h)return JSON.stringify(null);const a=getComputedStyle(h);return JSON.stringify({s:h.hasAttribute('data-saliendo'),pe:a.pointerEvents,d:a.transitionDuration})})()`)); m = await p
  ok(mid && mid.s && mid.pe === 'none' && mid.d.split(', ').every(x => x === '0.2s'), `cancelar: la ventana sale en 0,2 s y no recibe toques (${JSON.stringify(mid)})`)
  const q1 = t0de(m, x => x[1] === null); ok(q1 >= 180 && q1 <= 480, `se desmonta al terminar la salida (≈${q1} ms)`)
  ok(await ev(`document.activeElement === document.querySelector('button[aria-label^="Ver a Pedro"]')`), 'el foco vuelve a la fila «Ver a Pedro» (el botón que abrió la hoja desde la que se abrió la ventana; la hoja se había cerrado)')
  ok(await ev(`!document.querySelector('[data-hoja]') && document.body.style.overflow !== 'hidden'`), '«Quitar del equipo» cierra su hoja (como siempre) y, sin ninguna capa abierta, el desplazamiento queda libre')
  // confirmar: la acción corre y la ventana sale
  await clic(BTN('Ver a Pedro')); await sleep(900); await clic(QUITAR); await sleep(900)
  const confirmar = await clic(`(()=>{const v=document.querySelector('[data-ventana]');return [...v.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0).pop()})()`)
  ok(confirmar, 'se tocó el botón primario de la ventana (confirmar)'); await sleep(1500)
  ok(await ev(`!document.querySelector('[data-ventana]')`), 'confirmar: la ventana salió y se desmontó')
  ok(await ev(`document.body.style.overflow !== 'hidden'`), 'el desplazamiento no queda bloqueado sin ninguna capa abierta')
  // «reducir movimiento»
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await ir('/home/personas?__lider=1'); await clic(BTN('Ver a Pedro')); await sleep(900)
  p = ev(`__m(600, null, '[data-ventana]')`); await sleep(30); await clic(BTN('Quitar', `document.querySelector('[data-hoja]')`)); m = await p
  const cr = JSON.parse(await ev(`(()=>{const a=getComputedStyle(document.querySelector('[data-ventana]'));return JSON.stringify({d:a.transitionDuration,p:a.transitionProperty,s:a.scale})})()`))
  ok(cr.d === '0.12s' && cr.p === 'opacity' && cr.s === 'none', `con reducir movimiento: solo opacity 0,12 s, sin escala (${JSON.stringify(cr)})`)
  await clic(BTN('Cancelar', "document.querySelector('[data-ventana]')")); await esperarSalida(ev, 1500, '[data-ventana]')
  await send('Emulation.setEmulatedMedia', { features: [] })

  // ═════ 1b · abrir una ventana justo después de cerrar otra (dos «avisar» seguidos: quitar un bloqueo que falla) ═════
  console.log('\nAbrir una ventana justo después de cerrar otra (avisar dos veces seguidas)')
  await usarMock(tira)
  await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); localStorage.setItem('__falla','1')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
  for (let i = 0; i < 40 && !(await ev(`document.querySelectorAll('[aria-label="Días"] button').length > 30`)); i++) await sleep(250)
  const QUITARB = BTN('Quitar bloqueo'); let hay = false
  for (let i = 12; i < 34 && !hay; i++) { await ev(`document.querySelectorAll('[aria-label="Días"] button')[${i}].click()`); await sleep(450); hay = await ev(`!!(${QUITARB})`) }
  ok(hay, 'hay un día bloqueado propio para probar «Quitar bloqueo» (que falla)')
  await ev(`window.__op = ${QUITARB}; 0`); await clic(QUITARB); await sleep(1500)
  ok(await ev(`!!document.querySelector('[data-ventana]') && document.querySelector('[data-ventana]').getAttribute('data-visible') === 'true'`), 'la primera ventana de aviso abre')
  const CERRAR_V = `(${BTN('Cerrar', "document.querySelector('[data-ventana]')")})`
  p = ev(`__m(1100, ${JSON.stringify(CERRAR_V + '.click()')}, '[data-ventana]')`); await sleep(45); await clic(QUITARB); m = await p
  ok(m.some(x => x[5] === 2 && x[6] === 1), 'la segunda ventana se abre justo después de cerrar la primera: conviven un instante (la que sale, inert; la nueva entra)')
  const f2 = m[m.length - 1]; ok(f2[5] === 1 && f2[2] === 'true' && f2[6] === 0, `al terminar queda solo la nueva, visible y viva (ventanas: ${f2[5]})`)
  ok(await ev(`document.activeElement === document.querySelector('[data-ventana]')`), 'el foco está en la ventana nueva (la que salió no se lo quitó)')
  await clic(BTN('Cerrar', "document.querySelector('[data-ventana]')")); ok((await esperarSalida(ev, 1500, '[data-ventana]')) >= 0, 'la ventana nueva se cierra con normalidad y se desmonta'); await sleep(100)
  ok(await ev(`document.activeElement === window.__op || /^Quitar bloqueo/.test(document.activeElement.textContent||'')`), 'el foco vuelve a «Quitar bloqueo»')
  ok(await ev(`document.body.style.overflow !== 'hidden'`), 'sin capas abiertas, el desplazamiento está libre')

  // ═════ 2 · menú ⋯ de la ficha de canción (admin) y Adjuntos admin ═════
  console.log('\nFicha de canción (admin): menú ⋯ y pantalla Adjuntos')
  await usarMock(inv5)
  await ir('/admin?tab=canciones', 3000); await ev(`[...document.querySelectorAll('.anc-songTitle')].find(e=>e.firstChild&&e.firstChild.textContent.trim()==='Cuán grande es Él').click()`); await sleep(1500)
  const MAS = `document.querySelector('button[aria-label="Más acciones de la canción"]')`
  await ev(`window.__op = ${MAS}; 0`)
  p = ev('__m(700)'); await sleep(30); ok(await clic(MAS), 'se tocó «⋯»'); m = await p
  const fa = m.find(x => x[1] !== null), fb = m[m.length - 1]
  ok(fa && fa[1] >= vp - 2 && fa[2] === 'false' && fb[2] === 'true' && fb[4] === 'none', `el menú ⋯ de la ficha sube desde abajo y queda en reposo (primer cuadro top ${fa && fa[1]}; scale ${fb[4]})`)
  p = ev(`__m(900, "document.querySelector('[role=dialog][aria-label^=\\"Acciones para\\"] button[aria-label]').click()")`); m = await p
  ok(t0de(m, x => x[1] === null) >= 180, `sale animado y se desmonta (${t0de(m, x => x[1] === null)} ms)`); await sleep(100)
  ok(await ev(`document.activeElement === window.__op`), 'el foco vuelve al botón «⋯»')
  // Adjuntos (admin) con el visor de PDF abierto
  const ADJB = `[...document.querySelectorAll('button')].find(b=>/^Adjuntos/.test(b.textContent.trim()))`
  if (await ev(`!!(${ADJB})`)) {
    p = ev('__m(700)'); await sleep(30); await clic(ADJB); m = await p
    const ad = m.find(x => x[1] !== null), af = m[m.length - 1]
    ok(ad && ad[1] >= vp - 2 && af[2] === 'true' && af[4] === 'none' && af[7] === 'none', `la pantalla Adjuntos sube como una hoja y queda sin translate residual (translate ${af[7]})`)
    ok(JSON.parse(await ev(`(()=>{const r=document.querySelector('[data-pantalla]').getBoundingClientRect();return JSON.stringify(r.top===0&&r.left===0&&Math.round(r.width)===innerWidth&&Math.round(r.height)===innerHeight)})()`)), 'y ocupa toda la pantalla')
    p = ev(`__m(900, "document.querySelector('[data-pantalla] button[aria-label=Volver]').click()")`); m = await p; ok(t0de(m, x => x[1] === null) >= 180, 'la flecha cierra: baja y se desmonta')
  } else ok(false, 'no se encontró el botón «Adjuntos» de la ficha')

  // ═════ 3 · portal: lectura (Preferencias, Tonalidad), menú que crece, Adjuntos con el visor de PDF ═════
  console.log('\nPortal: lectura, menú de Tipografía y Adjuntos con el visor de PDF')
  await usarMock(portal)
  await ir('/portal/t65', 3000); await ev(PARCHE_ADJ); ok(await ev(`(()=>{const b=document.querySelector('ul li button[aria-label^="Cuán"]');if(b)b.click();return !!b})()`), 'se abrió la canción desde la lista de Inicio'); await sleep(2500)
  const TIPO = `document.querySelector('button[aria-controls="aa-panel"]')`
  if (await ev(`!!(${TIPO})`)) {
    p = ev(`__m(500, null, '[data-crece]')`); await sleep(30); await clic(TIPO); m = await p
    const cre = JSON.parse(await ev(`(()=>{const e=document.querySelector('[data-crece]');if(!e)return JSON.stringify(null);const cs=getComputedStyle(e),r=e.getBoundingClientRect();return JSON.stringify({n:cs.animationName,d:cs.animationDuration,f:cs.animationTimingFunction,o:cs.transformOrigin,w:r.width,h:r.height,rol:e.getAttribute('role')})})()`))
    ok(cre && /anc-menu-crece/.test(cre.n || '') && cre.d === '0.16s' && /cubic-bezier\(0\.23, 1, 0\.32, 1\)/.test(cre.f), `el menú crece: animación de 160 ms con --ease-out (${JSON.stringify(cre)})`)
    ok(cre && parseFloat(cre.o) > cre.w * 0.6, `crece desde el lado de su botón: origen ${cre && cre.o} en una caja de ${cre && Math.round(cre.w)} px de ancho`)
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(400)
  } else ok(false, 'no se encontró «Tipografía» en la lectura de letra; hay: ' + await ev(`JSON.stringify([...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0).map(b=>(b.getAttribute('aria-label')||b.textContent.trim()).slice(0,24)).slice(0,14))`))
  // Adjuntos del músico con el visor de PDF
  const CLIP = `document.querySelector('button[aria-label="Adjuntos"]') || [...document.querySelectorAll('button')].find(b=>/^Adjuntos/.test(b.textContent.trim()))`
  if (await ev(`!!(${CLIP})`)) {
    await clic(CLIP); await sleep(900); await ev(`window.__pa = document.querySelector('[data-pantalla]'); 0`)
    ok(await ev(`!!window.__pa && window.__pa.getAttribute('data-visible') === 'true'`), 'Adjuntos (músico): la pantalla abre')
    await clic(BTN('Ver', `document.querySelector('[data-pantalla]')`)); await sleep(1800)
    const capas = JSON.parse(await ev(`(()=>{const f=document.querySelector('[class*="visor-pdf_fondo"]');if(!f)return JSON.stringify(null);const r=f.getBoundingClientRect(),e=document.elementFromPoint(innerWidth/2,innerHeight/2),pa=window.__pa.getBoundingClientRect(),cs=getComputedStyle(window.__pa);return JSON.stringify({top:r.top,left:r.left,w:Math.round(r.width),h:Math.round(r.height),iw:innerWidth,ih:innerHeight,centro:!!e&&f.contains(e),tr:cs.translate,sc:cs.scale,z:getComputedStyle(f).zIndex,pantalla:[pa.top,pa.left]})})()`))
    ok(capas && capas.top === 0 && capas.left === 0 && capas.w === capas.iw && capas.h === capas.ih && capas.centro && capas.tr === 'none' && capas.sc === 'none', `con el visor de PDF abierto la capa no se rompe: cubre toda la pantalla, está encima en el centro y la pantalla no deja translate/scale (${JSON.stringify(capas)})`)
    await ev(`(()=>{const b=document.querySelector('[class*="visor-pdf_fondo"] button[aria-label="Cerrar"], [class*="visor-pdf_fondo"] button');b&&b.click()})()`); await sleep(500)
    ok(await ev(`!document.querySelector('[class*="visor-pdf_fondo"]') && !!document.querySelector('[data-pantalla]')`), 'al cerrar el visor, la pantalla Adjuntos sigue ahí')
    p = ev(`__m(900, "document.querySelector('[data-pantalla] button[aria-label=Volver]').click()")`); m = await p; ok(t0de(m, x => x[1] === null) >= 180, 'Adjuntos (músico): baja y se desmonta')
  } else ok(false, 'no se encontró el clip de Adjuntos en la lectura')
  // Preferencias y Tonalidad de la lectura (canción con acordes)
  console.log('\nLectura con acordes: Preferencias y Tonalidad')
  const A = (g, cal = '') => ({ g, cal }), ly = (a, ga, b, gb) => ({ kind: 'lyric', segments: [{ text: a, acorde: A(ga) }, { text: b, acorde: A(gb) }] })
  const ACORDES = { tono: 'G', secciones: [{ code: 'V1', name: 'Verso 1', repeat: 1, lineas: [ly('Línea de prueba ', 1, 'número uno', 5)] }, { code: 'C', name: 'Coro', repeat: 1, lineas: [ly('Coro de prueba ', 1, 'con su letra', 4)] }] }
  const PARCHE_AC = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(ACORDES)};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
  await ir('/portal/t65', 3000); await ev(PARCHE_AC); for (let i = 0; i < 40 && !(await ev(`!!document.querySelector('ul li button[aria-label^="Cuán"]')`)); i++) await sleep(250); await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`); await sleep(2500)
  for (const [nombre, abre] of [['Preferencias', `document.querySelector('button[aria-label="Ajustes"]')`], ['Tonalidad', `[...document.querySelectorAll('button')].find(b=>/tonalidad|tono/i.test((b.getAttribute('aria-label')||'')+' '+b.textContent)&&b.getBoundingClientRect().width>0&&!b.closest('nav'))`]]) {
    if (!(await ev(`!!(${abre})`))) { ok(false, 'no se encontró el botón de ' + nombre); continue }
    await ev(`window.__op = ${abre}; 0`); p = ev('__m(700)'); await sleep(30); await clic(abre); m = await p
    const ha = m.find(x => x[1] !== null), hf = m[m.length - 1]
    ok(ha && ha[1] >= vp - 2 && ha[2] === 'false' && hf[2] === 'true' && hf[4] === 'none', `${nombre}: sube desde abajo y queda en reposo (primer cuadro top ${ha && ha[1]}; scale ${hf[4]})`)
    p = ev(`__m(900, "document.querySelector('[data-hoja] button[aria-label=Cerrar]').click()")`); m = await p
    ok(t0de(m, x => x[1] === null) >= 180, `${nombre}: sale animada y se desmonta (${t0de(m, x => x[1] === null)} ms)`); await sleep(100)
    ok(await ev(`document.activeElement === window.__op`), `${nombre}: el foco vuelve al botón que la abrió`)
  }
  console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); await c.cerrar(); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
