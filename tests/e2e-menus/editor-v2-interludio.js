// Editor móvil v2 · E3 en un navegador REAL (Chrome por CDP): líneas de solo acordes (interludios) con VARIAS líneas por sitio, barras y espacios como piezas propias, ancho con − y + (con sus topes), mover y quitar piezas,
// Deshacer/Rehacer y UNA sola petición al guardar con las líneas y los espacios en el cuerpo. A 390 y 360 px, claro y oscuro; guarda las capturas. El servidor se simula en el navegador.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/editor-v2-interludio.js <carpeta-de-capturas>
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/editor-v2-interludio'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = 15000, SONDEO = 100, REINTENTOS = 2
const L1 = ['Aquí va la primera línea', 'Otra línea del verso']
const LETRA = 'VERSO 1:\n' + L1.join('\n') + '\n\nINTERLUDIO:\n(instrumental)'
const SEC = ls => ls.map(t => ({ kind: 'lyric', segments: [{ text: t }] }))
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__posts=0;window.__bodies=[];window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const post=esAc&&((o&&o.method)||'GET').toUpperCase()==='POST';
if(post){window.__posts++;window.__bodies.push(JSON.parse(o.body));return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})}
const r=await f(i,o);if(esAc&&!post){const d=await r.clone().json();d.cancion.letra=${JSON.stringify(LETRA)};d.cancion.tono='G';d.cancion.secciones=[${JSON.stringify(SEC(L1))},[]];return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9582), { send, ev } = c
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
  const tocar = async (nombre, buscar, traer = true) => {
    await esperar(buscar, nombre); paso = `tocar «${nombre}»`
    if (traer) { await ev(`(()=>{const e=${buscar};const p=${PANEL};const r=e.getBoundingClientRect();const tope=p?p.getBoundingClientRect().top:innerHeight;if(r.bottom>tope-8||r.top<130)${CUERPO}.scrollBy(0,r.top-260)})()`); await sleep(150) }
    const r = JSON.parse(await ev(`(()=>{const r=(${buscar}).getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`))
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(150)
  }
  const filas = `[...document.querySelectorAll('[role=dialog] [class*="_compas__"]')]`
  const pieza = (n, i) => `${filas}[${n}].querySelectorAll('button')[${i}]`
  const fila = async n => JSON.parse(await ev(`JSON.stringify([...${filas}[${n}].querySelectorAll('button')].filter(b=>!/^(\\+|Quitar línea)$/.test(b.textContent.trim())||b.className.includes('espacio')).map(b=>b.className.includes('espacio')?'␣'+b.style.getPropertyValue('--n'):b.textContent.trim()))`))
  const nFilas = () => ev(`${filas}.length`)
  const titulo = () => ev(`(()=>{const p=${PANEL};return p?p.querySelector('h3').textContent.replace(/\\s+/g,' ').trim():null})()`)
  const panelBtn = txt => `[...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const acorde = letra => `[...${PANEL}.querySelectorAll('button')].find(b=>b.childNodes[0]&&b.childNodes[0].textContent.trim()==='${letra}')`
  const agregarLinea = seccion => `[...document.querySelectorAll('[role=dialog] button')].filter(b=>b.textContent.trim()==='+ Línea de acordes')[${seccion}]`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', boton('Editar con acordes'))
    await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=2`, 'las líneas del modo Acordes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes cargadas'); await sleep(300)
    ok((await ev(`[...document.querySelectorAll('[role=dialog] button')].filter(b=>b.textContent.trim()==='+ Línea de acordes').length`)) === 2, `${et}: cada sección ofrece «+ Línea de acordes»`)

    // ── una línea nueva en la sección instrumental ──
    await tocar('+ Línea de acordes (INTERLUDIO)', agregarLinea(1))
    ok((await titulo()) === 'Línea de acordes elige un acorde', `${et}: el panel dice «Línea de acordes elige un acorde» (${await titulo()})`)
    const vis = JSON.parse(await ev(`JSON.stringify({esp:!!(${panelBtn('+ Espacio')}),barra:!!(${panelBtn('| Barra')}),mods:!!(${panelBtn('maj7')}),sig:!!(${panelBtn('Siguiente palabra ›')})})`))
    ok(vis.esp && vis.barra && !vis.mods, `${et}: el panel trae «+ Espacio» y «| Barra» y no los modificadores (aún no hay acorde)`)
    await tocar('acorde G', acorde('G'), false)
    ok((await fila(0)).join() === 'G', `${et}: la línea 1 tiene G (${(await fila(0)).join(' ')})`)
    ok((await titulo()) === 'G en la línea de acordes', `${et}: el panel dice «G en la línea de acordes»`)
    ok(await ev(`!!(${panelBtn('maj7')})`), `${et}: con el acorde elegido sí hay modificadores`)
    await tocar('| Barra', panelBtn('| Barra'), false); await tocar('+ Espacio', panelBtn('+ Espacio'), false)
    ok((await fila(0)).join() === 'G,|,␣2', `${et}: G, barra y un espacio de 2 (${(await fila(0)).join(' ')})`)
    ok((await titulo()) === 'Espacio entre | y el final · 2', `${et}: el panel dice «Espacio entre | y el final · 2» (${await titulo()})`)
    await tocar('acorde D (se pone después del espacio)', acorde('D'), false)
    ok((await fila(0)).join() === 'G,|,␣2,D', `${et}: el acorde nuevo va DESPUÉS de la pieza elegida (${(await fila(0)).join(' ')})`)
    await foto('interludio-linea')
    // ── ancho del espacio con − y + ──
    await tocar('el espacio', pieza(0, 2))
    ok((await titulo()) === 'Espacio entre | y D · 2', `${et}: el panel dice «Espacio entre | y D · 2» (${await titulo()})`)
    ok(await ev(`!${panelBtn('maj7')} && !document.querySelector('[role=dialog][aria-label^="Acordes en"] button[aria-label="‹"]')`), `${et}: un espacio no tiene modificadores ni «Mover» (se ensancha)`)
    await foto('interludio-espacio')
    await tocar('Más ancho', `${PANEL}.querySelector('button[aria-label="Más ancho"]')`, false)
    ok((await fila(0)).join() === 'G,|,␣3,D' && (await titulo()).endsWith('· 3'), `${et}: + lo ensanchó a 3 (${(await fila(0)).join(' ')})`)
    for (let i = 0; i < 5; i++) await tocar('Más ancho', `${PANEL}.querySelector('button[aria-label="Más ancho"]')`, false)
    ok((await fila(0))[2] === '␣8' && (await ev(`${PANEL}.querySelector('button[aria-label="Más ancho"]').disabled`)), `${et}: tope en 8: «+» queda desactivado (${(await fila(0))[2]})`)
    const w8 = await ev(`${pieza(0, 2)}.getBoundingClientRect().width`), w3 = 0
    for (let i = 0; i < 7; i++) await tocar('Más estrecho', `${PANEL}.querySelector('button[aria-label="Más estrecho"]')`, false)
    ok((await fila(0))[2] === '␣1' && (await ev(`${PANEL}.querySelector('button[aria-label="Más estrecho"]').disabled`)), `${et}: piso en 1: «−» queda desactivado (${(await fila(0))[2]})`)
    const w1 = await ev(`${pieza(0, 2)}.getBoundingClientRect().width`), h1 = await ev(`${pieza(0, 2)}.getBoundingClientRect().height`)
    ok(w8 > w1 && w1 >= 43.5 && h1 >= 43.5, `${et}: el espacio crece con el ancho (${Math.round(w1)} → ${Math.round(w8)} px) y siempre se puede tocar (≥ 44 px: ${Math.round(w1)}×${Math.round(h1)})`)
    await tocar('Más ancho', `${PANEL}.querySelector('button[aria-label="Más ancho"]')`, false); await tocar('Más ancho', `${PANEL}.querySelector('button[aria-label="Más ancho"]')`, false)
    ok((await fila(0))[2] === '␣3', `${et}: queda en 3`)
    // ── mover y quitar piezas ──
    await tocar('el acorde D', pieza(0, 3)); ok((await titulo()) === 'D en la línea de acordes', `${et}: el panel sigue a la pieza elegida (${await titulo()})`)
    await tocar('‹', `${PANEL}.querySelector('button[aria-label="‹"]')`, false)
    ok((await fila(0)).join() === 'G,|,D,␣3', `${et}: ‹ movió D antes del espacio (${(await fila(0)).join(' ')})`)
    await tocar('la barra', pieza(0, 1)); await tocar('Quitar', panelBtn('Quitar'), false)
    ok((await fila(0)).join() === 'G,D,␣3', `${et}: «Quitar» quitó la barra (${(await fila(0)).join(' ')})`)
    // ── una segunda línea en el mismo sitio ──
    await tocar('+ Línea de acordes (otra)', agregarLinea(1))
    await tocar('acorde Em', acorde('Em'), false); await tocar('| Barra', panelBtn('| Barra'), false)
    ok((await nFilas()) === 2 && (await fila(1)).join() === 'Em,|', `${et}: dos líneas de acordes en la sección (${await nFilas()}); la segunda: ${(await fila(1)).join(' ')}`)
    await foto('interludio-varias-lineas')
    // ── también bajo una línea de letra ──
    await tocar('+ Línea de acordes (VERSO 1)', agregarLinea(0)); await tocar('acorde C', acorde('C'), false)
    ok((await nFilas()) === 3 && (await ev(`${filas}[0].previousElementSibling.hasAttribute('data-fin')?1:0`)) === 1, `${et}: una línea de acordes bajo la última letra de VERSO 1 (3 en total)`)
    // ── Deshacer / Rehacer ──
    await tocar('Cerrar el panel', `${PANEL}.querySelector('button[aria-label="Cerrar"]')`, false)
    await tocar('Deshacer', `document.querySelector('[role=dialog] button[aria-label="Deshacer"]')`); ok((await nFilas()) === 2, `${et}: Deshacer quitó la línea de VERSO 1`)
    await tocar('Rehacer', `document.querySelector('[role=dialog] button[aria-label="Rehacer"]')`); ok((await nFilas()) === 3, `${et}: Rehacer la devolvió`)
    await tocar('Quitar línea (la de VERSO 1)', `${filas}[0].querySelectorAll('button')[${(await ev(`${filas}[0].querySelectorAll('button').length`)) - 1}]`)
    ok((await nFilas()) === 2, `${et}: «Quitar línea» quita solo esa línea (quedan 2)`)
    await tocar('Deshacer', `document.querySelector('[role=dialog] button[aria-label="Deshacer"]')`); ok((await nFilas()) === 3, `${et}: Deshacer la devuelve`)
    // ── Guardar: una petición con las líneas y los espacios ──
    ok((await ev(`window.__posts`)) === 0, `${et}: nada se envió antes de Guardar`)
    await clic('Guardar', boton('Guardar')); await esperar(`window.__posts>=1`, 'la petición de guardado'); await sleep(300)
    ok((await ev(`window.__posts`)) === 1, `${et}: Guardar envió UNA sola petición`)
    const b = JSON.parse(await ev(`JSON.stringify(window.__bodies[0])`))
    const s0 = b.secciones[0].lineas.map(l => l.kind), s1 = b.secciones[1].lineas
    ok(s0.join() === 'lyric,lyric,bars', `${et}: VERSO 1 trae su línea de acordes bajo su última letra (${s0.join(', ')})`)
    ok(s1.length === 2 && s1.every(l => l.kind === 'bars'), `${et}: la sección instrumental trae sus 2 líneas de acordes`)
    const r1 = s1[0].items, r2 = s1[1].items
    ok(r1.length === 3 && r1[0].acorde.g === 1 && r1[1].acorde.g === 5 && r1[2].texto === '   ', `${et}: línea 1 = G, D y un espacio de 3 (${JSON.stringify(r1.map(x => x.acorde ? x.acorde.g : x.texto.length))})`)
    ok(r2.length === 2 && r2[0].acorde.g === 6 && r2[1].texto === '|', `${et}: línea 2 = Em y «|»`)
    ok(b.letra === LETRA && b.tono === 'G', `${et}: la letra y el tono viajan intactos`)
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
