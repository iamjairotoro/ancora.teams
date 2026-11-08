// Editor móvil v2 · E1 en un navegador REAL (Chrome por CDP): el carril con un «+» sobre cada palabra de la línea activa, elegir acorde, «Siguiente palabra ›», mover con ‹ ›, «Quitar acorde», el panel fijo abajo con la pantalla desplazada
// y UNA sola petición al guardar con el cuerpo esperado. A 390 y 360 px, claro y oscuro; guarda las capturas. El servidor se simula en el navegador (la canción se sirve desde aquí y el guardado solo se anota).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/editor-v2-carril.js <carpeta-de-capturas>
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/editor-v2-carril'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = 15000, SONDEO = 100, REINTENTOS = 2
const L1 = Array.from({ length: 12 }, (_, i) => `Aquí va la primera línea de la letra ${i + 1}`), L2 = Array.from({ length: 12 }, (_, i) => `Coro que sigue con su palabra ${i + 1}`)
const LETRA = 'VERSO 1:\n' + L1.join('\n') + '\n\nCORO:\n' + L2.join('\n')
const SEC = ls => ls.map(t => ({ kind: 'lyric', segments: [{ text: t }] }))
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__posts=0;window.__bodies=[];window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const post=esAc&&((o&&o.method)||'GET').toUpperCase()==='POST';
if(post){window.__posts++;window.__bodies.push(JSON.parse(o.body));return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})}
const r=await f(i,o);if(esAc&&!post){const d=await r.clone().json();d.cancion.letra=${JSON.stringify(LETRA)};d.cancion.tono='G';d.cancion.secciones=[${JSON.stringify(SEC(L1))},${JSON.stringify(SEC(L2))}];return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9580), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) {
      let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* la página está cambiando */ }
      if (v) return
      if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`)
      await sleep(SONDEO)
    }
  }
  const boton = txt => `[...document.querySelectorAll('[role=dialog] button, button')].find(b=>b.textContent.trim()==='${txt}')`
  const clic = async (nombre, buscar) => { await esperar(buscar, nombre); paso = `clic en «${nombre}»`; await ev(`(${buscar}).click()`) }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const CUERPO = `document.querySelector('[role=dialog] [class*="_cuerpo__"]')`, PANEL = `document.querySelector('[role=dialog][aria-label^="Acordes en"]')`
  // Un toque de verdad (ratón en la página emulada como teléfono) en el centro de un elemento; antes se trae a la vista por encima del panel.
  const tocar = async (nombre, buscar, traer = true) => {
    await esperar(buscar, nombre); paso = `tocar «${nombre}»`
    if (traer) { await ev(`(()=>{const e=${buscar};const p=${PANEL};const r=e.getBoundingClientRect();const tope=p?p.getBoundingClientRect().top:innerHeight;if(r.bottom>tope-8||r.top<130)${CUERPO}.scrollBy(0,r.top-300)})()`); await sleep(150) }
    const r = JSON.parse(await ev(`(()=>{const r=(${buscar}).getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`))
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(150)
  }
  const linea = n => `document.querySelectorAll('[role=dialog] [data-fin]')[${n}]`
  const mas = n => `${linea(n)}.querySelectorAll('[data-mas]')`
  const titulo = () => ev(`(()=>{const p=${PANEL};return p?p.querySelector('h3').textContent.replace(/\\s+/g,' ').trim():null})()`)
  const panelBtn = txt => `[...${PANEL}.querySelectorAll('button')].find(b=>b.childNodes[0]&&b.childNodes[0].textContent.trim()==='${txt}')`
  const chips = n => ev(`JSON.stringify([...${linea(n)}.querySelectorAll('[data-ac]')].map(b=>[b.textContent.trim(),+b.dataset.ac]))`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', boton('Editar con acordes'))
    await esperar(`document.querySelector('[role=dialog] textarea')`, 'el editor con la letra'); await esperar(`document.fonts.status==='loaded'`, 'fuentes cargadas')
    await clic('pestaña Acordes', boton('Acordes')); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=24`, 'las 24 líneas del modo Acordes'); await sleep(300)

    ok((await ev(`document.querySelectorAll('[role=dialog] [data-mas]').length`)) === 0 && (await ev(`!${PANEL}`)), `${et}: sin nada elegido no hay «+» ni panel`)
    // 1. tocar una línea la activa: un «+» sobre CADA palabra de esa línea y de ninguna otra
    await tocar('la línea 1', `${linea(0)}.querySelector('[data-ini]')`)
    ok((await ev(`${mas(0)}.length`)) === 9, `${et}: la línea activa tiene un «+» sobre cada una de sus 9 palabras (${await ev(`${mas(0)}.length`)})`)
    ok((await ev(`document.querySelectorAll('[role=dialog] [data-mas]').length`)) === 9, `${et}: ninguna otra línea tiene «+»`)
    ok((await ev(`!!${PANEL}`)), `${et}: el panel de acordes está abierto`)
    await foto('carril-linea-activa')
    // 2. «+» sobre la 2.ª palabra y un acorde del panel
    await tocar('«+» de «va»', `${mas(0)}[1]`)
    ok((await titulo()) === 'Elige el acorde sobre «va»', `${et}: el panel dice «Elige el acorde sobre «va»» (${await titulo()})`)
    ok((await ev(`${PANEL}.querySelector('button[aria-label="Cerrar"]')&&!![...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Quitar acorde').disabled`)), `${et}: «Quitar acorde» está desactivado sin acorde`)
    await tocar('acorde G del panel', panelBtn('G'), false)
    let ch = await chips(0); ok(ch.length === 1 && ch[0][0] === 'G', `${et}: el acorde G quedó sobre la palabra («${ch.map(x => x[0])}»)`)
    ok((await titulo()) === 'G sobre «va»', `${et}: el panel dice «G sobre «va»» (${await titulo()})`)
    ok((await ev(`${mas(0)}.length`)) === 8, `${et}: la palabra con acorde ya no muestra «+» (quedan 8)`)
    await foto('panel-acorde-elegido')
    // 3. Siguiente palabra: el ancla pasa a «la»
    await tocar('Siguiente palabra', `[...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Siguiente palabra ›')`, false)
    ok((await titulo()) === 'Elige el acorde sobre «la»', `${et}: «Siguiente palabra ›» avanza el ancla a «la» (${await titulo()})`)
    await tocar('acorde D del panel', panelBtn('D'), false)
    ch = await chips(0); ok(ch.map(x => x[0]).join() === 'G,D', `${et}: segundo acorde D (${ch.map(x => x[0])})`)
    // 4. mover el acorde seleccionado una letra con ‹ ›
    const antes = ch[1][1]
    await tocar('›', `${PANEL}.querySelector('button[aria-label="›"]')`, false)
    ch = await chips(0); ok(ch[1][1] === antes + 1, `${et}: › movió el acorde D una letra a la derecha (${antes} → ${ch[1][1]})`)
    ok((await ev(`!!${linea(0)}.querySelector('[data-sel="1"]')`)), `${et}: el ancla sigue marcada`)
    ok((await titulo()).startsWith('D sobre «'), `${et}: el panel sigue en el acorde D tras moverlo (${await titulo()})`)
    await tocar('‹', `${PANEL}.querySelector('button[aria-label="‹"]')`, false); await tocar('‹', `${PANEL}.querySelector('button[aria-label="‹"]')`, false)
    ch = await chips(0); ok(ch[1][1] === antes - 1, `${et}: ‹ ‹ lo movió dos letras a la izquierda (${antes - 1})`)
    await tocar('›', `${PANEL}.querySelector('button[aria-label="›"]')`, false)
    ch = await chips(0); ok(ch[1][1] === antes, `${et}: › lo devolvió a su lugar`)
    // 5. quitar
    await tocar('Quitar acorde', `[...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Quitar acorde')`, false)
    ch = await chips(0); ok(ch.map(x => x[0]).join() === 'G', `${et}: «Quitar acorde» quitó el D y dejó el G (${ch.map(x => x[0])})`)
    // 6. Siguiente palabra al final de la línea pasa a la línea siguiente
    for (let i = 0; i < 6; i++) await tocar('Siguiente palabra', `[...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Siguiente palabra ›')`, false)
    ok((await titulo()) === 'Elige el acorde sobre «letra»' || (await titulo()).includes('sobre «'), `${et}: el ancla llegó a la última palabra de la línea 1 (${await titulo()})`)
    await tocar('Siguiente palabra', `[...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Siguiente palabra ›')`, false)
    ok((await ev(`${mas(1)}.length`)) >= 7 && (await ev(`${mas(0)}.length`)) === 0, `${et}: al pasar de la última palabra, la línea 2 queda activa y la 1 deja de mostrar «+»`)
    ok((await titulo()) === 'Elige el acorde sobre «Aquí»', `${et}: el ancla está en la primera palabra de la línea 2 (${await titulo()})`)
    // 7. con la pantalla desplazada: el ancla se ve por encima del panel, el panel está fijo abajo y lo último de la hoja se puede alcanzar
    await tocar('línea 18 (desplazada)', `${linea(17)}.querySelector('[data-ini]')`)
    const m = JSON.parse(await ev(`(()=>{const p=${PANEL}.getBoundingClientRect(),l=${linea(17)}.getBoundingClientRect(),cab=document.querySelector('[role=dialog] [class*="_cab__"]').getBoundingClientRect();return JSON.stringify({pTop:p.top,pBot:p.bottom,lBot:l.bottom,lTop:l.top,cabB:cab.bottom,H:innerHeight,scroll:${CUERPO}.scrollTop})})()`))
    ok(m.scroll > 300, `${et}: la pantalla está desplazada (${Math.round(m.scroll)} px)`)
    ok(Math.abs(m.pBot - m.H) < 2, `${et}: el panel está pegado abajo (termina en ${Math.round(m.pBot)} de ${m.H})`)
    ok(m.lBot <= m.pTop && m.lTop >= m.cabB, `${et}: la línea activa se ve entera, entre la barra y el panel (${Math.round(m.lTop)}–${Math.round(m.lBot)}; panel desde ${Math.round(m.pTop)})`)
    ok(m.pBot - m.pTop <= m.H * 0.45, `${et}: el panel no cubre más del 45 % de la pantalla (mide ${Math.round(m.pBot - m.pTop)} de ${m.H})`)
    await ev(`(()=>{const c=${CUERPO};c.scrollTop=c.scrollHeight})()`); await sleep(250)
    const f = JSON.parse(await ev(`(()=>{const p=${PANEL}.getBoundingClientRect(),ls=document.querySelectorAll('[role=dialog] [data-fin]'),u=ls[ls.length-1].getBoundingClientRect();return JSON.stringify({pTop:p.top,uBot:u.bottom})})()`))
    ok(f.uBot <= f.pTop, `${et}: al llegar al final, la última línea queda por encima del panel (${Math.round(f.uBot)} ≤ ${Math.round(f.pTop)})`)
    await foto('panel-desplazado')
    // 8. Guardar: UNA petición con el cuerpo esperado
    await tocar('Cerrar el panel', `${PANEL}.querySelector('button[aria-label="Cerrar"]')`, false)
    ok((await ev(`!${PANEL}`)), `${et}: «✕» cierra el panel`)
    await clic('Guardar', boton('Guardar')); await esperar(`window.__posts>=1`, 'la petición de guardado'); await sleep(300)
    ok((await ev(`window.__posts`)) === 1, `${et}: Guardar envió UNA sola petición`)
    const b = JSON.parse(await ev(`JSON.stringify(window.__bodies[0])`))
    const l1 = b.secciones[0].lineas[0].segments
    ok(l1.length === 2 && l1[0].text === 'Aquí ' && l1[1].text.startsWith('va la') && l1[1].acorde && l1[1].acorde.g === 1 && b.secciones[0].lineas[1].segments.length === 1, `${et}: el cuerpo guardado trae solo el acorde G sobre «va» (${JSON.stringify(l1.map(s => [s.text.slice(0, 8), s.acorde && s.acorde.g]))})`)
    ok(b.tono === 'G' && b.letra === LETRA && typeof b.base === 'string', `${et}: el cuerpo trae tono, letra intacta y huella`)
  } finally { await c.cerrar() }
}

;(async () => {
  for (const ancho of [390, 360]) for (const tema of ['light', 'dark']) {
    const et = `${ancho} ${tema}`
    for (let n = 0; n <= REINTENTOS; n++) {
      const [lo, lf] = [out.length, fallas]
      try { await intento(ancho, tema); break }
      catch (e) {
        out.length = lo; fallas = lf
        if (n < REINTENTOS) out.push(`AVISO ${et}: se cortó en el paso «${paso}» (${e.message}) — intento ${n + 1} de ${REINTENTOS + 1}, se repite`)
        else ok(false, `${et}: se cortó en el paso «${paso}» tras ${REINTENTOS + 1} intentos — ${e.message}`)
      }
    }
  }
  const avisos = out.filter(x => x.startsWith('AVISO')).length
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, ${avisos} avisos (reintentos)`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
