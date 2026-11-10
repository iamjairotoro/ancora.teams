// Editor móvil v2 · E2 en un navegador REAL (Chrome por CDP): «✎ Texto» y «♪ Acordes», la fila deslizable «+ Verso … + Final» sobre el teclado (sin quitarle el foco al cuadro), la numeración automática, lo que no reconoce el lector se ve como letra,
// el menú de una sección (cambiar tipo, borrar con aviso y Deshacer), Deshacer/Rehacer y UNA sola petición al guardar. A 390 y 360 px, claro y oscuro; guarda las capturas. El servidor se simula en el navegador.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/editor-v2-texto.js <carpeta-de-capturas>
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/editor-v2-texto'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = 15000, SONDEO = 100, REINTENTOS = 2
const L1 = ['Aquí va la primera línea', 'Otra línea del verso', 'Y una más del verso'], L2 = ['Coro que sigue con su palabra', 'Otra del coro']
const LETRA = 'VERSO 1:\n' + L1.join('\n') + '\n\nCORO:\n' + L2.join('\n')
const SEC = ls => ls.map(t => ({ kind: 'lyric', segments: [{ text: t }] }))
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__posts=0;window.__bodies=[];window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const post=esAc&&((o&&o.method)||'GET').toUpperCase()==='POST';
if(post){window.__posts++;window.__bodies.push(JSON.parse(o.body));return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})}
const r=await f(i,o);if(esAc&&!post){const d=await r.clone().json();d.cancion.letra=${JSON.stringify(LETRA)};d.cancion.tono='G';d.cancion.secciones=[${JSON.stringify(SEC(L1))},${JSON.stringify(SEC(L2))}];return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9581), { send, ev } = c
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
  const CUERPO = `document.querySelector('[role=dialog] [class*="_cuerpo__"]')`, AREA = `document.querySelector('[role=dialog] textarea')`, BARRA = `document.querySelector('[role=dialog] [class*="_barraTexto__"]')`
  // Un toque de verdad (ratón) en el centro de un elemento.
  const tocar = async (nombre, buscar) => {
    await esperar(buscar, nombre); paso = `tocar «${nombre}»`
    const r = JSON.parse(await ev(`(()=>{const e=${buscar};e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); await sleep(100)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(150)
  }
  const chip = txt => `[...${BARRA}.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const valor = () => ev(`${AREA}.value`)
  const nombres = () => ev(`JSON.stringify([...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].map(b=>b.textContent.replace('▾','').trim()))`).then(JSON.parse)
  const ponerCursor = async frag => ev(`(()=>{const a=${AREA};a.focus();const i=a.value.indexOf(${JSON.stringify(frag)});a.setSelectionRange(i+2,i+2);return i})()`)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', boton('Editar con acordes'))
    await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=5`, 'las líneas del modo Acordes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes cargadas'); await sleep(300)
    ok(await ev(`!${AREA} && !${BARRA}`), `${et}: el editor abre en modo Acordes (sin cuadro de texto ni fila de encabezados)`)
    ok((await nombres()).join() === 'VERSO 1,CORO', `${et}: los nombres de sección son botones: ${(await nombres()).join(', ')}`)

    // ── modo Texto ──
    await tocar('✎ Texto', boton('✎ Texto')); await esperar(AREA, 'el cuadro de texto'); await esperar(BARRA, 'la fila de encabezados'); await sleep(200)
    ok(await ev(`(${boton('♪ Acordes')}).textContent.trim()==='♪ Acordes'`), `${et}: «✎ Texto» pasa a «♪ Acordes» para volver`)
    const bs = JSON.parse(await ev(`JSON.stringify([...${BARRA}.querySelectorAll('[class*="_encabezados__"] button')].map(b=>b.textContent.trim()))`))
    ok(bs.join('|') === '+ Verso|+ Pre coro|+ Coro|+ Puente|+ Interludio|+ Instrumental|+ Tag|+ Final', `${et}: la fila trae «${bs.join(', ')}»`)
    const g = JSON.parse(await ev(`(()=>{const r=${BARRA}.getBoundingClientRect(),f=${BARRA}.querySelector('[class*="_encabezados__"]');return JSON.stringify({bot:r.bottom,H:innerHeight,desliza:f.scrollWidth>f.clientWidth||f.scrollWidth>=f.clientWidth,ancho:f.scrollWidth,vis:f.clientWidth,min:Math.min(...[...f.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height))})})()`))
    ok(Math.abs(g.bot - g.H) < 2, `${et}: la fila queda pegada abajo (termina en ${Math.round(g.bot)} de ${g.H}; sobre el teclado se sube con él)`)
    ok(g.min >= 44, `${et}: los botones miden ${Math.round(g.min)} px de alto (≥ 44)`)
    if (ancho <= 390) ok(g.ancho > g.vis, `${et}: la fila se desliza (contenido ${g.ancho} px en ${g.vis} px visibles)`)
    await foto('texto-barra')
    // insertar en la línea del cursor: el cuadro conserva el foco y el cursor queda debajo del encabezado
    const ini = await ponerCursor('Otra línea del verso')
    await tocar('+ Verso', chip('+ Verso'))
    const v1 = await valor()
    ok(v1.includes('Aquí va la primera línea\n\nVERSO 2:\nOtra línea del verso\n'), `${et}: «+ Verso» puso «VERSO 2:» (siguiente número) antes de la línea del cursor, con línea vacía`)
    ok(await ev(`document.activeElement===${AREA}`), `${et}: el cuadro de texto conserva el foco (el teclado no se cierra)`)
    const cur = await ev(`${AREA}.selectionStart`); ok(v1.slice(cur, cur + 5) === 'Otra ', `${et}: el cursor quedó debajo del encabezado`)
    await ponerCursor('Otra del coro'); await tocar('+ Pre coro', chip('+ Pre coro')); await ponerCursor('CORO:'); await tocar('+ Puente', chip('+ Puente'))      // el segundo, con el cursor sobre un encabezado: le cambia el tipo
    const v2 = await valor(); ok(v2.includes('PRE CORO:\nOtra del coro') && v2.includes('PUENTE:\nCoro que sigue') && !v2.includes('CORO:\n\nPUENTE') && !/\nCORO:\n/.test(v2.replace('PRE CORO:', '')), `${et}: «+ Pre coro» escribe «PRE CORO:» y «+ Puente» sobre «CORO:» le cambia el tipo a «PUENTE:» (no queda un «CORO:» huérfano)`)
    // lo que el lector no reconoce se ve como letra
    await ev(`${AREA}.focus();${AREA}.setSelectionRange(${AREA}.value.length,${AREA}.value.length)`); await send('Input.insertText', { text: '\n\nPre-coro:\nuna línea más' }); await sleep(200)
    ok((await valor()).endsWith('Pre-coro:\nuna línea más'), `${et}: se escribió a mano «Pre-coro:» (no calza con el lector)`)
    await foto('texto-encabezados')
    // ── de vuelta a Acordes ──
    await tocar('♪ Acordes', boton('♪ Acordes')); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=7`, 'las líneas del modo Acordes'); await sleep(250)
    const n1 = await nombres(); ok(n1.join() === 'VERSO 1,VERSO 2,PUENTE,PRE CORO', `${et}: las secciones del editor son las que reconoce el lector: ${n1.join(', ')}`)
    ok(await ev(`!!([...document.querySelectorAll('[role=dialog] [data-fin]')].find(l=>[...l.querySelectorAll('[data-ini]')].map(t=>t.textContent).join('').includes('Pre-coro:')))`) && !n1.some(x => /pre-coro/i.test(x)), `${et}: «Pre-coro:» se ve como una línea de letra, no como etiqueta de sección`)
    await foto('acordes-secciones')
    // un acorde en la sección VERSO 2 para ver qué pasa al borrarla
    const linea = txt => `[...document.querySelectorAll('[role=dialog] [data-fin]')].find(l=>[...l.querySelectorAll('[data-ini]')].map(t=>t.textContent).join('').includes(${JSON.stringify(txt)}))`      // solo el texto de la letra (en la línea activa los «+» también suman texto)
    await tocar('línea «Otra línea del verso»', `${linea('Otra línea del verso')}.querySelector('[data-ini]')`)
    await tocar('«+»', `${linea('Otra línea del verso')}.querySelectorAll('[data-mas]')[1]`)
    await tocar('acorde G', `[...document.querySelector('[role=dialog][aria-label^="Acordes en"]').querySelectorAll('button')].find(b=>b.childNodes[0]&&b.childNodes[0].textContent.trim()==='G')`)
    ok((await ev(`document.querySelectorAll('[data-ac]').length`)) === 1, `${et}: hay un acorde en la sección VERSO 2`)
    await tocar('Cerrar el panel', `document.querySelector('[role=dialog][aria-label^="Acordes en"] button[aria-label="Cerrar"]')`)
    // ── menú de la sección ──
    await tocar('nombre «PRE CORO»', `[...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].find(b=>b.textContent.includes('PRE CORO'))`)
    await esperar(`document.querySelector('[role=dialog][aria-label="Sección PRE CORO"]')`, 'el menú de la sección')
    const menu = JSON.parse(await ev(`(()=>{const m=document.querySelector('[role=dialog][aria-label="Sección PRE CORO"]');return JSON.stringify({tipos:[...m.querySelectorAll('[class*="_tipos__"] button')].map(b=>b.textContent.trim()),acciones:[...m.querySelectorAll('button')].filter(b=>!b.closest('[class*="_tipos__"]')).map(b=>b.textContent.trim()),marcado:[...m.querySelectorAll('[aria-pressed=true]')].map(b=>b.textContent.trim()),minH:Math.min(...[...m.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height))})})()`))
    ok(menu.tipos.join() === 'Verso,Pre coro,Coro,Puente,Interludio,Instrumental,Tag,Final' && menu.marcado.join() === 'Pre coro', `${et}: el menú ofrece los 8 tipos y marca el actual (${menu.marcado})`)
    ok(menu.acciones.join() === 'Borrar sección,Cerrar' && menu.minH >= 44, `${et}: acciones «${menu.acciones.join(', ')}» (sin «Renumerar» porque no es verso); botones ≥ 44 px (${Math.round(menu.minH)})`)
    await foto('menu-seccion')
    await tocar('tipo Coro', `[...document.querySelectorAll('[role=dialog][aria-label="Sección PRE CORO"] [class*="_tipos__"] button')].find(b=>b.textContent.trim()==='Coro')`)
    await esperar(`!document.querySelector('[role=dialog][aria-label^="Sección"]')`, 'el menú cerrado')
    ok((await nombres()).join() === 'VERSO 1,VERSO 2,PUENTE,CORO', `${et}: «Cambiar a Coro» cambió el nombre (${(await nombres()).join(', ')})`)
    // borrar la sección con el acorde: aviso y Deshacer
    await tocar('nombre «VERSO 2»', `[...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].find(b=>b.textContent.includes('VERSO 2'))`)
    await esperar(`document.querySelector('[role=dialog][aria-label="Sección VERSO 2"]')`, 'el menú de VERSO 2')
    ok(await ev(`[...document.querySelectorAll('[role=dialog][aria-label="Sección VERSO 2"] button')].some(b=>b.textContent.trim()==='Renumerar versos')`), `${et}: un verso ofrece «Renumerar versos»`)
    await tocar('Borrar sección', `[...document.querySelectorAll('[role=dialog][aria-label="Sección VERSO 2"] button')].find(b=>b.textContent.trim()==='Borrar sección')`)
    await esperar(`!document.querySelector('[role=dialog][aria-label^="Sección"]')`, 'el menú cerrado')
    const av = await ev(`(()=>{const a=document.querySelector('[role=dialog] [role=status][class*="_aviso__"]');return a?a.textContent.replace(/\\s+/g,' ').trim():null})()`)
    ok(av && av.startsWith('Se borró la sección «VERSO 2» · Se quitó 1 acorde') && av.endsWith('Deshacer'), `${et}: aviso sin confirmación previa: «${av}»`)
    ok((await nombres()).join() === 'VERSO 1,PUENTE,CORO' && (await ev(`document.querySelectorAll('[data-ac]').length`)) === 0, `${et}: la sección y su acorde ya no están (${(await nombres()).join(', ')})`)
    await foto('seccion-borrada')
    await tocar('Deshacer (del aviso)', `[...document.querySelectorAll('[role=dialog] [role=status] button')].find(b=>b.textContent.trim()==='Deshacer')`)
    ok((await nombres()).join() === 'VERSO 1,VERSO 2,PUENTE,CORO' && (await ev(`document.querySelectorAll('[data-ac]').length`)) === 1, `${et}: Deshacer devolvió la sección CON su acorde`)
    await tocar('Rehacer', `document.querySelector('[role=dialog] button[aria-label="Rehacer"]')`)
    ok((await nombres()).join() === 'VERSO 1,PUENTE,CORO', `${et}: Rehacer la vuelve a borrar`)
    await tocar('Deshacer (barra)', `document.querySelector('[role=dialog] button[aria-label="Deshacer"]')`)
    ok((await nombres()).join() === 'VERSO 1,VERSO 2,PUENTE,CORO', `${et}: Deshacer de la barra también la devuelve`)
    // ── Guardar: UNA petición, nada antes ──
    ok((await ev(`window.__posts`)) === 0, `${et}: nada se envió antes de Guardar`)
    await clic('Guardar', boton('Guardar')); await esperar(`window.__posts>=1`, 'la petición de guardado'); await sleep(300)
    ok((await ev(`window.__posts`)) === 1, `${et}: Guardar envió UNA sola petición`)
    const b = JSON.parse(await ev(`JSON.stringify(window.__bodies[0])`))
    ok(b.secciones.map(s => s.nombre).join() === 'VERSO 1,VERSO 2,PUENTE,CORO,', `${et}: el cuerpo trae las secciones en orden (${b.secciones.map(s => s.nombre).join(', ')}); la de «Pre-coro:» sin nombre`.replace(/,\)/, ')'))
    ok(b.secciones[1].lineas[0].segments.some(s => s.acorde && s.acorde.g === 1), `${et}: el acorde G viaja en la línea de VERSO 2`)
    ok(b.letra.includes('VERSO 2:\nOtra línea del verso') && b.letra.includes('PUENTE:\nCoro que sigue') && b.letra.includes('CORO:\nOtra del coro') && b.tono === 'G', `${et}: la letra guardada trae los encabezados nuevos`)
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
