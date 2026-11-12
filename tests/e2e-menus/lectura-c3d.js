// Lectura con acordes · C3d (hoja «Previsualizar tonalidad») en un navegador REAL (Chrome por CDP). Servidor simulado en la página; datos INVENTADOS.
// Qué comprueba: la píldora del tono abre «Previsualizar tonalidad»; «Original G» y «Tono del servicio A» (solo con servicio); las letras C a B, ♭ y ♯ (apagados donde el tono no existe); la pantalla de atrás cambia
// los acordes AL INSTANTE; «Guardar» deja el tono y cerrar de otra forma (✕, Escape) lo revierte; solo tonos del mismo modo (también en una canción en menor); no se escribe NADA (ni parches ni almacenamiento);
// el aviso del servicio; sin Cejilla; todo mide ≥ 44 px y cabe en pantalla. A 390 y 360 px, claro y oscuro; guarda las capturas.
// El servicio se simula con la marca __tonoServicio de este script (el tono del servicio llega a la pantalla desde donde se abrió la canción).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-c3d.js <carpeta-de-capturas>
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/lectura-c3d'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
// El servicio que lleva «Cornerstone» es el S2 del simulador (portal-mock.js: `sv('s2', 11)`), 11 días después de HOY en Chile. Su etiqueta («lunes 23 de noviembre», «jueves 3 de diciembre»…) se calcula con la misma regla del simulador, así la prueba no depende del día en que se corra
// (antes buscaba «viernes 20 de noviembre», que solo existía si se corría el lunes 9). Si el simulador cambia ese 11, cambia aquí también.
const DIAS_AL_SERVICIO = 11
const ETQ_SERVICIO = (() => {
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-').map(Number)
  const t = new Date(Date.UTC(fecha[0], fecha[1] - 1, fecha[2] + DIAS_AL_SERVICIO, 12))
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).formatToParts(t).map(x => [x.type, x.value]))
  return `${p.weekday} ${p.day} de ${p.month}`
})()
const A = (g, cal = '') => ({ g, cal })
const ly = (a, ga, b, gb) => ({ kind: 'lyric', segments: [{ text: a, acorde: A(ga) }, { text: b, acorde: A(gb) }] })
const ACORDES = { tono: 'G', secciones: [
  { code: 'V1', name: 'Verso 1', repeat: 1, lineas: [ly('Línea de prueba ', 1, 'número uno de la parte', 5), ly('Otra línea de prueba ', 4, 'que sigue aquí mismo', 5)] },
  { code: 'INT', name: 'Interludio', repeat: 1, lineas: [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(6, 'm') }, { acorde: A(4) }, { acorde: A(5) }] }] },
  { code: 'C', name: 'Coro', repeat: 1, lineas: [ly('Coro de prueba ', 1, 'con su letra', 4), ly('Y otra línea del coro ', 5, 'de prueba', 1)] },
] }
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__patches=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}});
const guardada=()=>{try{return JSON.parse(localStorage.getItem('__lectura')||'{}')}catch(e){return {}}};const guardadaLetra=()=>{try{return JSON.parse(localStorage.getItem('__letra')||'{}')}catch(e){return {}}};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();
if(u.startsWith('/api/portal/preferencias')&&m==='PATCH'){const b=JSON.parse(o.body);window.__patches.push(b);try{if(b.lectura)localStorage.setItem('__lectura',JSON.stringify({...guardada(),...b.lectura}));if(b.letra)localStorage.setItem('__letra',JSON.stringify({...guardadaLetra(),...b.letra}))}catch(e){}return j({ok:true})}
const r=await f(i,o);
if(u.startsWith('/api/portal/preferencias')&&m==='GET'){let d={};try{d=await r.clone().json()}catch(e){d={}};d.lectura={notation:'americano',vista:'ambos',compacta:false,detalles:true,...guardada()};d.letra={fontFamily:"ui-rounded, -apple-system, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif",textScale:1,lineHeightWide:false,...guardadaLetra()};return j(d)}
if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes={...${JSON.stringify(ACORDES)},tono:localStorage.getItem('__menor')?'Em':'G'};return j(d)}
return r}})()`

const SIZE = [0.875, 1, 1.1875, 1.375]
const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9587), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,160)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); await ev(`(${buscar}).scrollIntoView({block:'nearest'})`); await sleep(80); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250)
  }
  const HOJA = `document.querySelector('[role=dialog][aria-labelledby="tono-titulo"]')`
  const PILDORA = `document.querySelector('button[aria-label^="Tono "]')`
  const radio = n => `[...${HOJA}.querySelectorAll('[role=radio]')].find(b=>b.textContent.trim()==='${n}')`
  const alt = n => `${HOJA}.querySelector('button[aria-label="${n}"]')`
  const enlace = t => `[...${HOJA}.querySelectorAll('button')].find(b=>b.textContent.trim()==='${t}')`
  const abrir = async () => { await tocar('píldora del tono', PILDORA); await esperar(HOJA, 'la hoja de tonalidad'); await sleep(300) }
  const cerrarX = async () => { await tocar('Cerrar', `${HOJA}.querySelector('button[aria-label="Cerrar"]')`); await esperar(`!${HOJA}`, 'la hoja cerrada'); await sleep(250) }
  const pildora = () => ev(`${PILDORA}.getAttribute('aria-label')`)
  const acordes = () => ev(`JSON.stringify([...document.querySelectorAll('section[id^="parte-"] [data-a]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,4))`).then(JSON.parse)
  const estado = () => ev(`JSON.stringify({m:[...${HOJA}.querySelectorAll('[role=radio][aria-checked=true]')].map(b=>b.textContent.trim()),b:${alt('Bemol')}.getAttribute('aria-pressed'),bd:${alt('Bemol')}.disabled,s:${alt('Sostenido')}.getAttribute('aria-pressed'),sd:${alt('Sostenido')}.disabled})`).then(JSON.parse)
  const irAInicio = async () => {      // al recargar, el portal vuelve a donde estaba (la lista de Canciones, un servicio…): se parte siempre de Inicio
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    const NAV = `[...document.querySelectorAll('nav button, button')].find(b=>b.textContent.trim()==='Inicio'&&b.getBoundingClientRect().top>innerHeight*0.6)`
    await esperar(NAV, 'Inicio en el menú'); await ev(`(${NAV}).click()`); await sleep(500)
  }
  const abrirCancionHome = async () => {
    await irAInicio()
    await esperar(`document.querySelector('ul li button[aria-label^="Cuán"]')`, 'la canción en la lista'); await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`)
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(350)
  }
  const abrirDeServicio = async () => {          // el servicio con «Cornerstone» (11 días después de hoy): va en C en el servicio
    await irAInicio()
    await esperar(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes(${JSON.stringify(ETQ_SERVICIO)}))`, 'el servicio'); await ev(`[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes(${JSON.stringify(ETQ_SERVICIO)})).click()`)
    await esperar(`document.querySelector('button[aria-label="Abrir Cornerstone"]')`, 'Cornerstone en el orden'); await ev(`document.querySelector('button[aria-label="Abrir Cornerstone"]').click()`)
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(350)
  }
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`); await abrirCancionHome()

    // ── desde la lista de canciones (sin servicio) ──
    ok(await pildora() === 'Tono G', `${et}: la píldora muestra el tono de lectura (${await pildora()})`)
    ok(JSON.stringify(await acordes()) === JSON.stringify(['G', 'D', 'C', 'D']), `${et}: los acordes de partida son los de G (${(await acordes()).join(' ')})`)
    await abrir()
    const h = JSON.parse(await ev(`(()=>{const h=${HOJA},r=h.getBoundingClientRect();return JSON.stringify({l:r.left,r:r.right,b:r.bottom,W:innerWidth,H:innerHeight,tit:h.querySelector('#tono-titulo').textContent,txt:h.textContent.replace(/\\s+/g,' '),
      radios:[...h.querySelectorAll('[role=radio]')].map(b=>[b.textContent.trim(),Math.round(b.getBoundingClientRect().height)]),
      botones:[...h.querySelectorAll('button')].filter(b=>b.getAttribute('role')!=='radio').map(b=>[b.textContent.trim()||b.getAttribute('aria-label'),Math.round(b.getBoundingClientRect().height)])})})()`))
    ok(h.tit === 'Previsualizar tonalidad' && h.l >= 0 && h.r <= h.W && h.b <= h.H + 1, `${et}: la hoja «${h.tit}» cabe en la pantalla`)
    ok(h.radios.map(x => x[0]).join('') === 'CDEFGAB' && (await estado()).m.join() === 'G', `${et}: siete letras C a B, con la G marcada`)
    ok(/Original G/.test(h.txt) && !/Tono del servicio/.test(h.txt) && /Si cambias aquí, solo cambia lo que ves tú\./.test(h.txt), `${et}: «Original G», sin «Tono del servicio» y con el aviso`)
    ok(!/Cejilla|capo/i.test(h.txt), `${et}: no hay control de Cejilla`)
    ok(h.radios.every(x => x[1] >= 44) && h.botones.every(x => x[1] >= 44), `${et}: letras, ♭, ♯, «Original» y «Guardar» miden ≥ 44 px (${[...h.radios, ...h.botones].map(x => x[1]).join(' ')})`)
    await foto('tonalidad')

    // ── la pantalla de atrás cambia al instante ──
    await tocar('letra A', radio('A')); const a1 = await acordes()
    ok((await pildora()) === 'Tono A' && JSON.stringify(a1) === JSON.stringify(['A', 'E', 'D', 'E']), `${et}: tocar «A» cambia la píldora y los acordes al instante (${a1.join(' ')})`)
    await foto('tonalidad-a')
    await tocar('♭', alt('Bemol')); ok((await pildora()) === 'Tono Ab' && (await estado()).b === 'true', `${et}: «♭» da Ab (${await pildora()})`)
    await tocar('♭ otra vez', alt('Bemol')); ok((await pildora()) === 'Tono A' && (await estado()).b === 'false', `${et}: tocar «♭» otra vez la quita`)
    await tocar('letra C', radio('C')); const c = await estado(); ok(c.bd === true && c.sd === false, `${et}: en «C» el bemol se apaga (no existe Cb) y el sostenido sigue (${JSON.stringify(c)})`)
    await tocar('letra E', radio('E')); const e = await estado(); ok(e.sd === true && e.bd === false, `${et}: en «E» el sostenido se apaga (no existe E♯)`)
    await tocar('♯ en F', radio('F')); await tocar('♯', alt('Sostenido')); ok((await pildora()) === 'Tono F#', `${et}: «F» + «♯» da F# (${await pildora()})`)
    await tocar('letra B con ♯ puesto', radio('B')); ok((await pildora()) === 'Tono B', `${et}: de F# a «B» (B♯ no existe) queda B`)
    await tocar('Original G', enlace('Original G')); ok((await pildora()) === 'Tono G' && JSON.stringify(await acordes()) === JSON.stringify(['G', 'D', 'C', 'D']), `${et}: «Original G» vuelve al original`)

    // ── Guardar y cerrar de otra forma ──
    await tocar('letra D', radio('D')); await tocar('Guardar', enlace('Guardar')); await esperar(`!${HOJA}`, 'la hoja cerrada'); await sleep(300)
    ok((await pildora()) === 'Tono D' && JSON.stringify(await acordes()) === JSON.stringify(['D', 'A', 'G', 'A']), `${et}: «Guardar» deja el tono (${await pildora()}: ${(await acordes()).join(' ')})`)
    ok(/Solo lo ves tú/.test(await ev(`document.body.innerText`)), `${et}: la pantalla dice que solo lo ve esta persona`)
    await foto('cancion-en-d')
    await abrir(); await tocar('letra F', radio('F')); ok((await pildora()) === 'Tono F', `${et}: previsualiza F`); await cerrarX()
    ok((await pildora()) === 'Tono D', `${et}: cerrar con ✕ vuelve al tono con que se abrió (${await pildora()})`)
    await abrir(); await tocar('letra B', radio('B')); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await esperar(`!${HOJA}`, 'cerrada con Escape'); await sleep(250)
    ok((await pildora()) === 'Tono D', `${et}: cerrar con Escape también vuelve (${await pildora()})`)
    ok((await ev(`window.__patches.length`)) === 0 && (await ev(`localStorage.getItem('__lectura')===null&&localStorage.getItem('__letra')===null`)), `${et}: no se escribió nada: ningún parche, ninguna preferencia guardada`)

    // ── con tono del servicio ──
    await abrirDeServicio()
    ok((await pildora()) === 'Tono C', `${et}: abierta desde el servicio, la píldora muestra el tono del servicio (${await pildora()})`)
    await abrir()
    const sv = await ev(`${HOJA}.textContent.replace(/\\s+/g,' ')`)
    ok(/Original G/.test(sv) && /Tono del servicio C/.test(sv) && /El servicio usa C\. Si cambias aquí, solo cambia lo que ves tú\./.test(sv), `${et}: muestra «Original G», «Tono del servicio C» y el aviso del servicio`)
    ok((await estado()).m.join() === 'C', `${et}: la C está marcada`); await foto('tonalidad-servicio')
    await tocar('Original G', enlace('Original G')); ok((await pildora()) === 'Tono G', `${et}: «Original G» cambia a G`)
    await tocar('Tono del servicio C', enlace('Tono del servicio C')); ok((await pildora()) === 'Tono C', `${et}: «Tono del servicio C» vuelve al del servicio`)
    await tocar('letra E', radio('E')); await tocar('Guardar', enlace('Guardar')); await esperar(`!${HOJA}`, 'cerrada'); await sleep(250)
    ok((await pildora()) === 'Tono E', `${et}: guardar un tono distinto del servicio (${await pildora()})`)
    await abrir(); await tocar('Tono del servicio C', enlace('Tono del servicio C')); await tocar('Guardar', enlace('Guardar')); await esperar(`!${HOJA}`, 'cerrada'); await sleep(250)
    ok((await pildora()) === 'Tono C' && !/Solo lo ves tú/.test(await ev(`document.body.innerText`)), `${et}: elegir el del servicio quita la elección local (no dice «solo lo ves tú»)`)

    // ── una canción en menor: solo menores ──
    await ev(`localStorage.setItem('__menor','1')`); await abrirCancionHome()
    ok((await pildora()) === 'Tono Em', `${et}: una canción en Em: la píldora dice Em (${await pildora()})`)
    await abrir()
    const mn = JSON.parse(await ev(`JSON.stringify({l:[...${HOJA}.querySelectorAll('[role=radio]')].map(b=>b.textContent.trim()),txt:${HOJA}.textContent.replace(/\\s+/g,' ')})`))
    ok(mn.l.join() === 'Cm,Dm,Em,Fm,Gm,Am,Bm' && /Original Em/.test(mn.txt), `${et}: las letras son menores (${mn.l.join(' ')}) y el original es Em`)
    await tocar('letra Am', radio('Am')); ok((await pildora()) === 'Tono Am', `${et}: «Am» da Am`)
    await tocar('♯', alt('Sostenido')); ok((await pildora()) === 'Tono A#m', `${et}: «♯» da A#m (nunca A#)`)
    await tocar('♭ en B', radio('Bm')); await tocar('♭', alt('Bemol')); ok((await pildora()) === 'Tono Bbm', `${et}: Bbm`)
    await foto('tonalidad-menor'); await cerrarX()
    ok((await ev(`window.__patches.length`)) === 0, `${et}: tampoco aquí se escribió nada`)
    ok((await ev(`document.documentElement.scrollWidth`)) <= ancho, `${et}: la pantalla no se desliza de lado`)
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
