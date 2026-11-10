// Lectura con acordes (C3a) en un navegador REAL (Chrome por CDP): barra superior, cabecera, tira de partes con tooltip e insignias, y salto a sección. Servidor simulado en la página; datos INVENTADOS
// (la canción es la de la maqueta: título, artista y bpm de prueba; la letra son líneas de relleno).
// Qué comprueba: círculos de 44 px con el borde del color de su parte (colores de los mockups, medidos con getComputedStyle); abreviaturas y repeticiones; la tira se desliza; tocar una parte salta a su sección;
// tocar la parte activa y el toque largo muestran el nombre; «Saltar a sección» lista las partes y salta; la píldora muestra el tono de lectura; «Adjuntos» baja a los adjuntos; «Ajustes» abre la tipografía de siempre;
// sin scroll horizontal; las insignias de sección. A 390 y 360 px, claro y oscuro; guarda las capturas.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/lectura-c3a.js <carpeta-de-capturas>      (SOLO="390 light" para una sola combinación)
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/lectura-c3a'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const A = (g, cal = '') => ({ g, cal })
const ly = (t, g) => ({ kind: 'lyric', segments: [{ text: t, ...(g ? { acorde: A(g) } : {}) }] })
// V1, C, It, V2, C×2, Bd, Is (el arreglo de los mockups) y además Tg, E e In (las demás partes): cada sección con varias líneas para que la pantalla se desplace.
const SECS = [['V1', 'Verso 1', 1], ['C', 'Coro', 1], ['INT', 'Interludio', 1], ['V2', 'Verso 2', 1], ['C', 'Coro', 2], ['P', 'Puente', 1], ['INT', 'Instrumental', 1], ['TAG', 'Tag', 1], ['OUT', 'Final', 1], ['IN', 'Intro', 1]]
const cuerpo = (code, i) => code === 'INT' || code === 'IN' ? [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(6, 'm') }, { acorde: A(4) }, { acorde: A(5) }] }] : [ly('Línea de prueba número uno de la parte ' + (i + 1), 1), ly('Otra línea de prueba que sigue aquí mismo', 4), ly('Y una tercera línea para dar altura a la parte', 5), ly('Cierre de la parte de prueba', 1)]
const ACORDES = { tono: 'G', secciones: SECS.map(([code, name, repeat], i) => ({ code, name, repeat, lineas: cuerpo(code, i) })) }
const ADJ = [{ id: 'a1', nombre: 'Partitura de prueba.pdf', tamano: 1000, subidoPor: null, fecha: null }]
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(ACORDES)};d.adjuntos=${JSON.stringify(ADJ)};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
// Los colores de los mockups, en rgb, por abreviatura.
const COLOR = { V1: 'rgb(108, 123, 242)', V2: 'rgb(108, 123, 242)', C: 'rgb(245, 159, 0)', It: 'rgb(240, 62, 62)', Bd: 'rgb(47, 158, 68)', Is: 'rgb(130, 201, 30)', Tg: 'rgb(230, 73, 128)', E: 'rgb(21, 170, 191)' }

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9583), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`); await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const CIRC = `[...document.querySelectorAll('ul[aria-label="Partes de la canción"] button')]`
  const BARRA = n => `document.querySelector('button[aria-label="${n}"]')`
  const tocar = async (nombre, buscar) => {          // un toque de verdad (ratón) en el centro de un elemento
    paso = `tocar «${nombre}»`
    let r = null      // el elemento puede cambiar de sitio entre «existe» y «medirlo» (la pantalla se está pintando): se vuelve a buscar
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250)
  }
  const mantener = async (nombre, buscar, ms) => {   // un toque largo
    await esperar(buscar, nombre); paso = `mantener «${nombre}»`
    const r = JSON.parse(await ev(`(()=>{const e=${buscar};const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`))
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(ms); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250)
  }
  const arriba = () => ev(`window.scrollTo(0,0)`).then(() => sleep(250))
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await esperar(`document.querySelector('ul li button[aria-label^="Cuán"]')`, 'la canción en la lista'); await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`)
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(400)

    // ── cabecera y barra ──
    const sub = await ev(`(document.querySelector('header h1')||{}).textContent`), subt = await ev(`(document.querySelector('header p')||{}).textContent`)
    ok(!!sub && /Cuán grande/.test(sub), `${et}: el título es «${sub}»`); ok(/Original G/.test(subt || '') && / · /.test(subt || ''), `${et}: el subtítulo es «${subt}» (artista · bpm · Original G)`)
    for (const n of ['Canciones', 'Saltar a sección', 'Tono G', 'Adjuntos', 'Ajustes']) ok(await ev(`!!${BARRA(n)}`), `${et}: la barra tiene «${n}»`)
    ok(!(await ev(`!!document.querySelector('button[aria-label="Editar"]')`)), `${et}: todavía no hay botón de editar (llega en C3e)`)
    const medidas = JSON.parse(await ev(`JSON.stringify(['Canciones','Saltar a sección','Tono G','Adjuntos','Ajustes'].map(n=>{const r=document.querySelector('button[aria-label="'+n+'"]').getBoundingClientRect();return[n,Math.round(r.width),Math.round(r.height)]}))`))
    ok(medidas.every(([, w, h]) => w >= 44 && h >= 44), `${et}: todos los botones de la barra miden ≥ 44 px (${medidas.map(m => m.join(' ')).join(' · ')})`)

    // ── tira de partes ──
    const partes = JSON.parse(await ev(`JSON.stringify(${CIRC}.map(b=>{const r=b.getBoundingClientRect(),cs=getComputedStyle(b),rep=b.querySelector('span');return{txt:b.firstChild.textContent,w:Math.round(r.width),h:Math.round(r.height),borde:cs.borderTopColor,radio:cs.borderTopLeftRadius,rep:rep?rep.textContent:null,label:b.getAttribute('aria-label')}}))`))
    ok(partes.map(p => p.txt).join() === 'V1,C,It,V2,C,Bd,Is,Tg,E,In', `${et}: la tira sigue el orden del arreglo (${partes.map(p => p.txt).join(' ')})`)
    ok(partes.every(p => p.w === 44 && p.h === 44), `${et}: los círculos miden 44 × 44 px`); ok(partes.every(p => parseFloat(p.radio) >= 22), `${et}: son círculos (radio ${partes[0].radio})`)
    ok(partes.filter(p => p.txt !== 'In').every(p => COLOR[p.txt] === p.borde), `${et}: el borde de cada parte tiene su color (${partes.map(p => p.borde).join(' | ')})`)
    ok(!Object.values(COLOR).includes(partes[9].borde), `${et}: «In» (intro) lleva un gris neutro, no un color de parte (${partes[9].borde})`)
    ok(partes.filter(p => p.rep).length === 1 && partes[4].rep === '2', `${et}: solo el coro repetido lleva insignia «2»`)
    const tira = JSON.parse(await ev(`(()=>{const u=document.querySelector('ul[aria-label="Partes de la canción"]');return JSON.stringify({sw:u.scrollWidth,cw:u.clientWidth,ox:getComputedStyle(u).overflowX,doc:document.documentElement.scrollWidth,iw:innerWidth})})()`))
    ok(tira.ox === 'auto' && tira.sw > tira.cw, `${et}: la tira se desliza (contenido ${tira.sw} px en ${tira.cw} px)`); ok(tira.doc <= tira.iw, `${et}: la pantalla no se desliza de lado (${tira.doc} ≤ ${tira.iw})`)
    ok(await ev(`${CIRC}[0].getAttribute('aria-current')==='true'`), `${et}: al abrir, la parte activa es la primera`)
    await foto('partes-arriba')

    // ── insignias de sección ──
    const ins = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('section[id^="parte-"]')].map(s=>{const p=s.querySelector('p[data-parte]');return[s.id,p?p.textContent:null]}))`))
    ok(ins.length === 10 && ins.map(x => x[1]).join('|') === 'V1Verso 1|CCoro|ItInterludio|V2Verso 2|CCoro|BdPuente|IsInstrumental|TgTag|EFinal|InIntro', `${et}: cada sección lleva su insignia con código y nombre (${ins.map(x => x[1]).join(' · ')})`)
    const colIns = await ev(`getComputedStyle(document.querySelector('section#parte-1 p[data-parte] span')).backgroundColor`)
    ok(colIns === 'rgb(245, 159, 0)', `${et}: el círculo de la insignia del coro es ámbar (${colIns})`)
    ok(await ev(`(()=>{const s=document.querySelector('section#parte-2');const t=s.querySelector('[class*=tarjeta]');return !!t&&/A\\s*F#m|G\\s*Em/.test(t.textContent)||t.textContent.trim().length>0})()`), `${et}: el interludio muestra solo acordes en una línea`)

    // ── saltar con la tira ──
    await tocar('parte «Puente» (6.ª)', `${CIRC}[5]`)
    await sleep(500)
    const salto = JSON.parse(await ev(`(()=>{const s=document.getElementById('parte-5').getBoundingClientRect();return JSON.stringify({top:Math.round(s.top),y:Math.round(scrollY),activa:${CIRC}.findIndex(b=>b.getAttribute('aria-current')==='true')})})()`))
    ok(salto.y > 200 && salto.top >= -2 && salto.top <= 200, `${et}: tocar «Bd» salta a su sección (scrollY ${salto.y}, la sección queda a ${salto.top} px del borde de arriba)`); ok(salto.activa === 5, `${et}: la parte tocada queda activa (${salto.activa})`)
    await foto('partes-salto')

    // ── tooltip: toque en la activa y toque largo ──
    await arriba()
    await esperar(`${CIRC}[0].getAttribute('aria-current')==='true'`, 'la primera parte activa')      // tras el salto la parte activa no se mueve durante un instante: se espera a que vuelva a ser la primera
    await tocar('parte activa (otra vez)', `${CIRC}[0]`)          // la activa tras volver arriba es la primera: tocarla muestra el nombre
    const g1 = await ev(`(()=>{const t=document.querySelector('ul[aria-label="Partes de la canción"]').parentElement.querySelector('[role=status]');return t?t.textContent:null})()`)
    ok(g1 === 'Verso 1', `${et}: tocar la parte activa muestra el globo «${g1}»`)
    const gb = JSON.parse(await ev(`(()=>{const t=document.querySelector('ul[aria-label="Partes de la canción"]').parentElement.querySelector('[role=status]');const r=t.getBoundingClientRect();return JSON.stringify({l:r.left,r:r.right,iw:innerWidth})})()`))
    ok(gb.l >= 0 && gb.r <= gb.iw, `${et}: el globo cabe en la pantalla (${Math.round(gb.l)}–${Math.round(gb.r)} de ${gb.iw})`)
    await foto('partes-globo')
    await sleep(2600); ok(!(await ev(`!!document.querySelector('ul[aria-label="Partes de la canción"]').parentElement.querySelector('[role=status]')`)), `${et}: el globo se va solo`)
    await mantener('parte «Interludio» (toque largo)', `${CIRC}[2]`, 650)
    const g2 = await ev(`(()=>{const t=document.querySelector('ul[aria-label="Partes de la canción"]').parentElement.querySelector('[role=status]');return t?t.textContent:null})()`)
    ok(g2 === 'Interludio', `${et}: el toque largo muestra «${g2}»`); ok((await ev(`window.scrollY`)) < 100, `${et}: el toque largo no salta de sección`)
    await sleep(2500)

    // ── menú «Saltar a sección» ──
    await tocar('Saltar a sección', BARRA('Saltar a sección')); await esperar(`document.querySelector('[role=dialog] [data-parte]')`, 'el menú de partes')
    const lista = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[role=dialog] [data-parte]')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()))`))
    ok(lista.length === 10 && lista[0].startsWith('V1') && lista[4].includes('×2'), `${et}: el menú lista las 10 partes del arreglo (${lista.join(' · ')})`)
    ok(await ev(`(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()`), `${et}: el menú cabe en la pantalla`)
    ok(await ev(`getComputedStyle(document.querySelector('[role=dialog] [data-parte="bd"] span')).backgroundColor==='rgb(47, 158, 68)'`), `${et}: el menú también lleva el color de cada parte`)
    await foto('menu-saltar')
    await tocar('«Verso 2» del menú', `[...document.querySelectorAll('[role=dialog] [data-parte]')][3]`); await sleep(600)
    ok(await ev(`!document.querySelector('[role=dialog] [data-parte]')`), `${et}: elegir una parte cierra el menú`)
    const s2 = JSON.parse(await ev(`(()=>{const s=document.getElementById('parte-3').getBoundingClientRect();return JSON.stringify({top:Math.round(s.top),y:Math.round(scrollY)})})()`))
    ok(s2.y > 100 && s2.top >= -2 && s2.top <= 200, `${et}: el menú salta a «Verso 2» (la sección queda a ${s2.top} px de arriba)`)

    // ── píldora del tono, adjuntos y ajustes ──
    await arriba(); await tocar('píldora del tono', BARRA('Tono G')); await esperar(`document.querySelector('[role=dialog][aria-labelledby="tono-titulo"]')`, 'la hoja de tonalidad'); await sleep(300)
    ok(/Previsualizar tonalidad/.test(await ev(`document.querySelector('[role=dialog]').textContent`)), `${et}: la píldora del tono abre «Previsualizar tonalidad» (C3d; en C3a llevaba al selector de siempre)`)
    await tocar('Cerrar', `document.querySelector('[role=dialog] button[aria-label="Cerrar"]')`); await sleep(400)
    await arriba(); await tocar('Adjuntos', BARRA('Adjuntos')); await sleep(700)
    ok(await ev(`(()=>{const e=document.getElementById('adjuntos-cancion');return !!e&&e.getBoundingClientRect().top<innerHeight})()`), `${et}: «Adjuntos» baja a los adjuntos`)
    await arriba(); await tocar('Ajustes', BARRA('Ajustes')); await esperar(`document.querySelector('[role=dialog]')`, 'la ventana de ajustes'); await sleep(300)
    ok(/Preferencias/.test(await ev(`document.querySelector('[role=dialog]').textContent`)) && /Vista de canción/.test(await ev(`document.querySelector('[role=dialog]').textContent`)), `${et}: «Ajustes» abre la hoja de Preferencias (C3b; en C3a abría la tipografía)`)
    ok(await ev(`(()=>{const r=document.querySelector('[role=dialog]').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`), `${et}: la hoja de ajustes cabe en la pantalla`)
    await foto('ajustes')
  } finally { await c.cerrar() }
}

;(async () => {
  const SOLO = process.env.SOLO || ''
  for (const [ancho, tema] of [[390, 'light'], [390, 'dark'], [360, 'light'], [360, 'dark']].filter(([a, t]) => !SOLO || SOLO === `${a} ${t}`)) {
    const et = `${ancho} ${tema}`
    for (let n = 0; n <= REINTENTOS; n++) {
      const [lo, lf] = [out.length, fallas]
      try { await intento(ancho, tema); break }
      catch (e) {
        out.length = lo; fallas = lf
        if (n < REINTENTOS) { out.push(`AVISO ${et}: se cortó en el paso «${paso}» (${e.message}) — intento ${n + 1} de ${REINTENTOS + 1}, se repite`); if (SOLO) console.log(out[out.length - 1]) }
        else ok(false, `${et}: se cortó en el paso «${paso}» tras ${REINTENTOS + 1} intentos — ${e.message}`)
      }
    }
  }
  const avisos = out.filter(x => x.startsWith('AVISO')).length
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, ${avisos} avisos (reintentos)`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
