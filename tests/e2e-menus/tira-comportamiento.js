// La tira de días en un navegador de verdad (teléfono de 390 px): el desplazamiento es el nativo (overflow-x, un gesto táctil mueve la tira), tocar un día lo centra y cambia la tarjeta, el alto de la tarjeta se anima
// (~340 ms) y con prefers-reduced-motion no, la tarjeta no tiene alto mínimo, el flujo bloquear → quitar bloqueo usa /api/portal/bloqueos con el cuerpo esperado y el mes completo salta a otra fecha.
// Uso (con la app construida y servida por scripts/verificacion/construir.sh): BASE=http://127.0.0.1:3168 node tests/e2e-menus/tira-comportamiento.js
const { lanzar, sleep, esperarSalida } = require('./cdp.js'), M = require('./tira-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
;(async () => {
  const c = await lanzar(9581), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: M.PORTAL }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(900); await ev(`localStorage.clear(); sessionStorage.clear()`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
  const J = async js => JSON.parse(await ev(`JSON.stringify((()=>{${js}})())`))
  const tira = `document.querySelector('[aria-label="Días"]')`, dias = `[...document.querySelectorAll('[aria-label="Días"] button')]`
  const tarjeta = `document.querySelector('[aria-live="polite"]')`
  const nativo = await J(`const t=${tira}, cs=getComputedStyle(t); return {ox:cs.overflowX, ta:cs.touchAction, snap:cs.scrollSnapType, ancho:t.scrollWidth, visible:t.clientWidth}`)
  ok(nativo.ox === 'auto' && nativo.snap === 'none' && nativo.ancho > nativo.visible * 3 && /pan-x/.test(nativo.ta), `desplazamiento nativo: overflow-x ${nativo.ox}, sin snap, ${nativo.ancho}px de contenido en ${nativo.visible}px visibles, touch-action ${nativo.ta}`)
  const centrado = async () => J(`const t=${tira}, e=t.querySelector('[data-elegido="true"]') || t.querySelector('[data-hoy="true"]'), r=e.getBoundingClientRect(), q=t.getBoundingClientRect(); return {dx:Math.round((r.left+r.width/2)-(q.left+q.width/2))}`)
  ok(Math.abs((await centrado()).dx) <= 2, 'al abrir, hoy queda centrado en la tira')
  // Paso 5 (estilo): al abrir Inicio la tarjeta del día está escondida y no hay texto de ayuda a la vista
  const cerrada = await J(`const o=${tarjeta}, cs=getComputedStyle(o), a=document.querySelector('section[aria-label] p'); return {h:o.getBoundingClientRect().height, vis:o.hasAttribute('inert')?'hidden':'visible', hijos:o.children.length, pres:document.querySelectorAll('[aria-pressed="true"]').length, ayuda:a?Math.round(a.getBoundingClientRect().width):-1}`)
  ok(cerrada.h === 0 && cerrada.vis === 'hidden' && cerrada.hijos === 0 && cerrada.pres === 0, 'al abrir Inicio la tarjeta del día está escondida (alto 0, sin contenido, ningún día elegido) ' + JSON.stringify(cerrada))
  ok(cerrada.ayuda <= 1, 'el texto de ayuda de la tira no se ve (queda solo para lectores de pantalla)')
  // un gesto táctil de verdad desplaza la tira (sin JavaScript de por medio)
  const antes = await J(`return ${tira}.scrollLeft`)
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 200 }] }); for (let x = 300; x >= 80; x -= 20) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 200 }] }); await sleep(16) }
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(900)
  const despues = await J(`return ${tira}.scrollLeft`); ok(despues > antes + 80, `un gesto táctil mueve la tira (de ${Math.round(antes)} a ${Math.round(despues)})`)
  // tocar un día: centra y cambia la tarjeta; el alto se anima
  const alturas = []
  await ev(`window.__h=[];(()=>{const o=${tarjeta}; const t0=performance.now(); const id=setInterval(()=>{window.__h.push([Math.round(performance.now()-t0),o.getBoundingClientRect().height,o.style.height]); if(performance.now()-t0>600)clearInterval(id)},40)})()`)
  await ev(`${dias}[14+4].click()`); await sleep(900)
  const h = await J(`return window.__h`), distintas = new Set(h.map(x => Math.round(x[1]))); ok(distintas.size >= 4, `el alto de la tarjeta pasa por varios valores intermedios al cambiar de día (${[...distintas].slice(0, 8).join(' → ')})`)
  ok(Math.abs((await centrado()).dx) <= 2, 'el día tocado queda centrado (scroll suave)')
  const t = await J(`const o=${tarjeta}; return {texto:o.textContent, minH:getComputedStyle(o).minHeight, minHi:getComputedStyle(o.firstElementChild).minHeight, h:o.style.height}`)
  ok(/Abrir servicio/.test(t.texto) && /Servicio Ancora/.test(t.texto) && (t.minH === '0px' || t.minH === 'auto') && t.minHi === '0px' && t.h === '', 'la tarjeta muestra el servicio, no tiene alto mínimo y al terminar vuelve a medir su contenido ' + JSON.stringify({ minH: t.minH, minHi: t.minHi, h: t.h }))
  // Paso 5: tocar el mismo día la esconde (con animación de alto); otro día cambia el contenido sin esconderla; tocar fuera la esconde
  const estado = async () => J(`const o=${tarjeta}; return {h:Math.round(o.getBoundingClientRect().height), vis:o.hasAttribute('inert')?'hidden':'visible', texto:o.textContent.slice(0,40)}`)
  await ev(`window.__h=[];(()=>{const o=${tarjeta}; const t0=performance.now(); const id=setInterval(()=>{window.__h.push(Math.round(o.getBoundingClientRect().height)); if(performance.now()-t0>600)clearInterval(id)},30)})()`)
  await ev(`${dias}[14+4].click()`); await sleep(900)
  const cierra = await estado(), hc = await J(`return window.__h`); ok(cierra.h === 0 && cierra.vis === 'hidden' && new Set(hc).size >= 4, `tocar el mismo día esconde la tarjeta con el alto animado (${[...new Set(hc)].slice(0, 6).join(' → ')})`)
  await ev(`${dias}[14+4].click()`); await sleep(900); const abre = await estado(); ok(abre.h > 100 && abre.vis === 'visible' && /Servicio Ancora/.test(abre.texto), 'tocar un día la vuelve a mostrar')
  await ev(`${dias}[14+5].click()`); await sleep(900); const otro = await estado(); ok(otro.h > 60 && otro.vis === 'visible' && otro.texto !== abre.texto, 'tocar otro día cambia el contenido sin esconder la tarjeta ' + JSON.stringify(otro))
  await ev(`document.querySelector('h1').click()`); await sleep(900); const fuera = await estado(); ok(fuera.h === 0 && fuera.vis === 'hidden', 'tocar cualquier otra zona esconde la tarjeta')
  await ev(`${dias}[14+4].click()`); await sleep(900)
  // bloquear → hoja → guardar → bloqueado; quitar → libre
  await ev(`${dias}[14+3].click()`); await sleep(800)
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Bloquear esta fecha').click()`); await sleep(700)
  const hoja = await J(`const d=document.querySelector('[role=dialog]'); return {aviso:d&&d.textContent, safe:d&&getComputedStyle(d).paddingBottom, chips:d?[...d.querySelectorAll('[aria-pressed]')].map(b=>b.textContent):[]}`)
  ok(/Tu motivo lo ven los líderes de tu equipo\./.test(hoja.aviso || '') && ['Trabajo', 'Familia', 'Viaje', 'Estudios'].join() === hoja.chips.join(), 'la hoja de bloqueo trae el aviso y los cuatro motivos rápidos')
  await ev(`[...document.querySelectorAll('[role=dialog] [aria-pressed]')].find(b=>b.textContent==='Familia').click()`); await sleep(200)
  await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Bloquear esta fecha').click()`); await esperarSalida(ev); await sleep(900)
  let log = await J(`return window.__bloqueosLog`); ok(log.length === 1 && log[0].m === 'POST' && Object.keys(log[0].b).sort().join() === 'date,reason' && log[0].b.reason === 'Familia' && /^\d{4}-\d{2}-\d{2}$/.test(log[0].b.date), `POST de un solo día, sin teamIds: ${JSON.stringify(log[0] && log[0].b)}`)
  const bl = await J(`return {cerrada:!document.querySelector('[role=dialog]'), texto:${tarjeta}.textContent, punto:[...${dias}[14+3].querySelectorAll('span')].map(s=>s.className).join(' ')}`)
  ok(bl.cerrada && /Fecha bloqueada/.test(bl.texto) && /Motivo: Familia/.test(bl.texto) && /Quitar bloqueo/.test(bl.texto) && /bloqueado/.test(bl.punto), 'tras guardar la hoja se cierra, la tarjeta dice «Fecha bloqueada · Motivo: Familia» y el día lleva el punto ámbar')
  await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Quitar bloqueo').click()`); await sleep(1200)
  log = await J(`return window.__bloqueosLog`); const q = await J(`return {texto:${tarjeta}.textContent}`)
  ok(log.length === 2 && log[1].m === 'DELETE' && Object.keys(log[1].b).join() === 'date' && /No hay servicio este día/.test(q.texto) && /Bloquear esta fecha/.test(q.texto), 'quitar bloqueo manda DELETE con la fecha y el día vuelve a quedar libre')
  // el mes completo
  await ev(`document.querySelector('[aria-label^="Elegir otro mes"]').click()`); await sleep(700)
  const mes = await J(`const d=document.querySelector('[role=dialog]'); return {titulo:d.querySelector('h3').textContent, n:d.querySelectorAll('[aria-pressed]').length}`)
  ok(/Noviembre 2026|[A-Z][a-zé]+ \d{4}/.test(mes.titulo) && mes.n >= 35, `el chip abre el mes completo (${mes.titulo}, ${mes.n} días)`)
  await ev(`document.querySelector('[role=dialog] [aria-label="Mes siguiente"]').click()`); await sleep(300)
  await ev(`[...document.querySelectorAll('[role=dialog] [aria-pressed]')].find(b=>b.textContent.trim()==='15').click()`); await esperarSalida(ev); await sleep(900)
  const salto = await J(`const e=document.querySelector('[data-elegido="true"]'); return {t:${tarjeta}.textContent.slice(0,40), abierto:!!document.querySelector('[role=dialog]')}`)
  ok(!salto.abierto && /15 de/.test(salto.t), `elegir una fecha del mes cierra la hoja y salta ahí (${salto.t})`)
  // con «reducir movimiento» el alto no se anima
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300)
  await ev(`window.__h=[];(()=>{const o=${tarjeta}; const t0=performance.now(); const id=setInterval(()=>{window.__h.push([Math.round(o.getBoundingClientRect().height),o.style.height]); if(performance.now()-t0>500)clearInterval(id)},40)})()`)
  await ev(`${dias}[14+4].click()`); await sleep(800)
  const r = await J(`return window.__h`); ok(new Set(r.map(x => x[0])).size <= 2 && r.every(x => x[1] === ''), `con reducir movimiento el alto salta sin pasos intermedios (${[...new Set(r.map(x => x[0]))].join(' → ')})`)
  await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
