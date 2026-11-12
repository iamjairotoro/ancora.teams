// «Nueva canción» paso C (la tira de partes con «+» en el editor de una canción nueva) en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: con el documento vacío la tira es solo el «+» punteado (44 px); cada parte que se agrega aparece al instante como un círculo de su color y abreviatura (V1, C, V2, Bd, It, E) y queda activa; el «+» abre «Agregar parte» (con Coro 2, etc.);
// la tira NO se mueve al desplazarse el texto; en modo Texto, tocar una parte pone el cursor en su encabezado y lo deja a la vista; en modo Acordes, tocar una parte lleva esa sección arriba del cuerpo; la parte activa sigue al cursor y al desplazamiento;
// el editor de una canción que ya existe NO tiene tira; Guardar envía UNA petición con las secciones del texto (la tira no guarda nada).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/nueva-cancion-paso-c.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/nueva-cancion-paso-c'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const NUEVA_ID = '33333333-3333-4333-8333-333333333333'
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__posts=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
const CARGA=id=>({tono:'F',letra:'',origen:'ninguno',secciones:null,sinConvertir:0,huella:'a'.repeat(32),formatoAntiguo:false,guardadas:null,actual:{secciones:[],arreglo:[]}});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.endsWith('/rest/v1/songs')&&m!=='GET'){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch{}
 window.__escrituras.push({m,b,q:url.search});
 if(m==='POST')return j({id:'${NUEVA_ID}',created_at:'2026-11-10',...b},201);
 if(m==='PATCH'){const id=(url.searchParams.get('id')||'').replace('eq.','');return j({id,created_at:'2026-11-09',...b},200)}}
if(m!=='GET'&&m!=='HEAD'&&url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/rpc/')){window.__escrituras.push({m,otra:url.pathname});return j([])}
if(url.pathname.startsWith('/api/admin/canciones/acordes')){if(m==='GET')return j({cancion:CARGA(url.searchParams.get('id')),hojaFicha:null});window.__posts.push(JSON.parse(o.body));return j({ok:true,huella:'b'.repeat(32)})}
return f(i,o)}})()`
const COLOR = { V1: 'rgb(108, 123, 242)', V2: 'rgb(108, 123, 242)', C: 'rgb(245, 159, 0)', Bd: 'rgb(47, 158, 68)', It: 'rgb(240, 62, 62)', E: 'rgb(21, 170, 191)', C2: 'rgb(245, 159, 0)' }
const lineas = (n, quien) => Array.from({ length: n }, (_, i) => `Línea ${i + 1} de prueba ${quien}`).join('\n')

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9589), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map(d=>d.getAttribute('aria-label')+':'+d.innerText.replace(/\\s+/g,' ').slice(0,80)).join(' | ')`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (diálogos: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300)
  }
  const escribir = async (sel, texto) => { await ev(`(${sel}).focus()`); await send('Input.insertText', { text: texto }); await sleep(150) }
  const elegir = async (sel, valor) => { await ev(`(()=>{const s=${sel};const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(valor)});s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(120) }
  const V = `document.querySelector('[role=dialog][aria-label="Nueva canción"]')`
  const ED = t => `document.querySelector('[role=dialog][aria-label=${JSON.stringify(t)}]')`
  const btn = (raiz, txt) => `[...${raiz}.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(txt)}))`
  const campo = (raiz, etq, tag = 'input') => `[...${raiz}.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(etq)}))?.querySelector('${tag}')`
  const tipo = (raiz, nombre) => `[...${raiz}.querySelectorAll('button')].find(b=>b.lastElementChild&&b.lastElementChild.textContent.trim()===${JSON.stringify(nombre)})`
  const T = 'ZZ Prueba tira', E = ED(T), AREA = `${E}.querySelector('textarea')`
  const TIRA = `${E}.querySelector('ul[aria-label="Partes de la canción"]')`, MAS = `${E}.querySelector('button[aria-label="Agregar una parte"]')`
  const SHEET = `document.querySelector('[role=dialog][aria-label="Agregar parte"]')`
  const circulos = () => ev(`JSON.stringify([...${TIRA}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte').map(b=>({t:b.firstChild.textContent,activa:b.getAttribute('aria-current')==='true',h:Math.round(b.getBoundingClientRect().height),w:Math.round(b.getBoundingClientRect().width),borde:getComputedStyle(b).borderTopColor})))`).then(JSON.parse)
  const agregarParte = async (nombre, texto) => { await tocar('«+» de la tira', MAS); await esperar(SHEET, 'la hoja «Agregar parte»'); await tocar(nombre, tipo(`${SHEET}.querySelector('[role=group]')`, nombre)); if (texto) { await send('Input.insertText', { text: texto }); await sleep(200) } }
  // dónde queda la línea de una posición dentro del cuadro de texto (la misma medición que usa el editor), y si está a la vista
  const aLaVista = ini => ev(`(()=>{const a=${AREA};const cs=getComputedStyle(a);const w=a.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);const d=document.createElement('div');d.style.cssText='position:absolute;visibility:hidden;left:-9999px;white-space:pre-wrap;overflow-wrap:break-word;padding:0;border:0;width:'+w+'px;font:'+cs.font+';letter-spacing:'+cs.letterSpacing+';line-height:'+cs.lineHeight;d.textContent=a.value.slice(0,${ini})+'\\u200b';document.body.appendChild(d);const h=d.getBoundingClientRect().height;d.remove();const lh=parseFloat(cs.lineHeight)||24;const y=parseFloat(cs.paddingTop)+h-lh;return JSON.stringify({y:Math.round(y),top:Math.round(a.scrollTop),alto:a.clientHeight,vista:y>=a.scrollTop-2&&y+lh<=a.scrollTop+a.clientHeight+2})})()`).then(JSON.parse)
  const escrituras = () => ev(`JSON.stringify(window.__escrituras)`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'la lista de canciones'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)

    // ── un editor de una canción que YA existe: sin tira ──
    await tocar('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); await esperar(ED('Cuán grande es Él'), 'el editor de una canción que ya existe'); await sleep(500)
    ok(await ev(`!${ED('Cuán grande es Él')}.querySelector('ul[aria-label="Partes de la canción"]')&&!${ED('Cuán grande es Él')}.querySelector('button[aria-label="Agregar una parte"]')&&${ED('Cuán grande es Él')}.innerText.includes('Cancelar')`), `${et}: el editor de una canción que ya existe NO tiene tira ni «+» (y sigue con «Cancelar»)`)
    await tocar('Cancelar', btn(ED('Cuán grande es Él'), '‹ Cancelar')); await esperar(`!${ED('Cuán grande es Él')}`, 'que se cierre ese editor')
    await tocar('‹ Canciones', `document.querySelector('button[aria-label="Canciones"], .anc-back, [class*="back"]')||[...document.querySelectorAll('button')].find(b=>/Canciones/.test(b.textContent)&&b.textContent.length<20)`).catch(() => {})
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'volver a la lista')

    // ── crear la canción de prueba ──
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), T); await elegir(campo(V, 'Tonalidad original', 'select'), 'F')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(E, 'el editor de la canción nueva'); await esperar(`${E}.innerText.includes('Empieza por una parte')`, 'la tarjeta'); await sleep(300)

    // ── vacío: solo el «+» ──
    const vacio = await ev(`JSON.stringify({lis:${TIRA}.querySelectorAll('li').length,mas:(()=>{const b=${MAS};const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})(),borde:getComputedStyle(${MAS}).borderTopStyle,tarjeta:${E}.innerText.includes('Empieza por una parte')})`).then(JSON.parse)
    ok(vacio.lis === 1 && vacio.borde === 'dashed' && vacio.mas[0] >= 44 && vacio.mas[1] >= 44, `${et}: sin texto la tira es solo el «+» punteado (${vacio.mas.join('×')} px)`); await foto('tira-vacia')
    await tocar('«+» (vacío)', MAS); await esperar(SHEET, 'la hoja'); ok(await ev(`${SHEET}.innerText.includes('La parte nueva se agrega al final.')`), `${et}: el «+» abre «Agregar parte» también con el documento vacío`); await tocar('Cerrar la hoja', `${SHEET}.querySelector('button[aria-label="Cerrar"]')`)

    // ── armar la canción: V1, C, V2, Bd, It, E ──
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(AREA, 'el cuadro de texto'); await send('Input.insertText', { text: lineas(8, 'del verso uno') }); await sleep(250)
    let cs = await circulos(); ok(cs.length === 1 && cs[0].t === 'V1' && cs[0].activa, `${et}: «V1» aparece en la tira, activa`)
    await agregarParte('Coro', lineas(8, 'del coro')); cs = await circulos(); ok(cs.map(x => x.t).join() === 'V1,C' && cs[1].activa && !cs[0].activa, `${et}: «C» aparece enseguida (${cs.map(x => x.t).join(' ')}) y queda activa`)
    await agregarParte('Verso 2', lineas(8, 'del verso dos')); await agregarParte('Puente', lineas(8, 'del puente')); await agregarParte('Interludio', ''); await agregarParte('Final', lineas(8, 'del final'))
    cs = await circulos(); ok(cs.map(x => x.t).join() === 'V1,C,V2,Bd,It,E', `${et}: la tira sigue el orden del texto (${cs.map(x => x.t).join(' ')})`)
    ok(cs.every(x => x.w === 44 && x.h === 44), `${et}: los círculos miden 44 × 44 px`); ok(cs.every(x => COLOR[x.t] === x.borde), `${et}: cada círculo lleva el color de su parte (${cs.map(x => x.borde).join(' | ')})`)
    ok(cs[5].activa && cs.filter(x => x.activa).length === 1, `${et}: la parte recién agregada («E») es la activa`)
    ok(await ev(`(()=>{const u=${TIRA};const ult=[...u.querySelectorAll('li')].pop().querySelector('button');return ult.getAttribute('aria-label')==='Agregar una parte'})()`), `${et}: el «+» queda al final de la tira`)
    await foto('tira-con-partes')

    // ── la tira no se mueve; modo Texto ──
    const yTira = () => ev(`Math.round(${TIRA}.getBoundingClientRect().top)`)
    const y0 = await yTira(); await ev(`${AREA}.scrollTop=0`); await sleep(150); const y1 = await yTira(); await ev(`${AREA}.scrollTop=9999`); await sleep(150); const y2 = await yTira(); ok(y0 === y1 && y1 === y2, `${et}: la tira no se mueve al desplazar el texto (${y0}, ${y1}, ${y2})`)
    const circ = n => `[...${TIRA}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte')[${n}]`
    const ini = nombre => ev(`${AREA}.value.indexOf(${JSON.stringify(nombre)})`)
    await tocar('círculo V1', circ(0)); let sel = await ev(`JSON.stringify({s:${AREA}.selectionStart,foco:document.activeElement===${AREA}})`).then(JSON.parse), v = await aLaVista(0)
    ok(sel.s === 0 && sel.foco && v.vista && v.top === 0, `${et}: Texto: «V1» pone el cursor en «VERSO 1:» y lo deja a la vista (scrollTop ${v.top})`)
    await tocar('círculo Bd', circ(3)); const iP = await ini('PUENTE:'); sel = await ev(`JSON.stringify({s:${AREA}.selectionStart})`).then(JSON.parse); v = await aLaVista(iP)
    ok(sel.s === iP && v.vista && v.top > 0, `${et}: Texto: «Bd» lleva el cursor a «PUENTE:» (posición ${sel.s} de ${iP}) y lo deja a la vista (scrollTop ${v.top}, línea en ${v.y})`); cs = await circulos(); ok(cs[3].activa && cs.filter(x => x.activa).length === 1, `${et}: Texto: «Bd» queda activa`)
    await foto('texto-puente')
    await tocar('círculo E', circ(5)); const iF = await ini('FINAL:'); v = await aLaVista(iF); ok(v.vista && v.top > 0, `${et}: Texto: «E» deja «FINAL:» a la vista (scrollTop ${v.top})`)
    await ev(`(()=>{const a=${AREA};a.focus();const i=a.value.indexOf('Línea 3 de prueba del coro');a.setSelectionRange(i,i)})()`); await sleep(400); cs = await circulos()
    ok(cs[1].activa && cs.filter(x => x.activa).length === 1, `${et}: Texto: al mover el cursor a la letra del coro, «C» pasa a ser la activa`)

    // ── modo Acordes ──
    await tocar('volver a Acordes', `[...${E}.querySelectorAll('button')].find(b=>/Acordes/.test(b.textContent)&&b.className.includes('modoTexto'))`); await esperar(`${E}.querySelectorAll('section[class*="_sec__"]').length>=6`, 'las seis secciones del modo Acordes'); await sleep(300)
    ok(await ev(`!!${TIRA}`), `${et}: la tira sigue en el modo Acordes`)
    const cuerpo = `${E}.querySelector('[class*="_cuerpo__"]')`, secTop = n => ev(`Math.round(${E}.querySelectorAll('section[class*="_sec__"]')[${n}].getBoundingClientRect().top-${cuerpo}.getBoundingClientRect().top)+0`)
    await ev(`${cuerpo}.scrollTop=0`); await sleep(300); cs = await circulos(); ok(cs[0].activa, `${et}: Acordes: arriba del todo la activa es «V1»`)
    await tocar('círculo V2', circ(2)); await sleep(400); const t2 = await secTop(2); ok(t2 >= -2 && t2 <= 40, `${et}: Acordes: «V2» lleva su sección a la parte de arriba del cuerpo (a ${t2} px)`); cs = await circulos(); ok(cs[2].activa && cs.filter(x => x.activa).length === 1, `${et}: Acordes: «V2» queda activa`)
    await foto('acordes-verso-dos')
    await tocar('círculo Bd', circ(3)); await sleep(400); const t3 = await secTop(3); ok(t3 >= -2 && t3 <= 40, `${et}: Acordes: «Bd» arriba del cuerpo (a ${t3} px)`)
    await ev(`${cuerpo}.scrollTop=0`); await sleep(500); cs = await circulos(); ok(cs[0].activa && cs.filter(x => x.activa).length === 1, `${et}: Acordes: al volver arriba la activa vuelve a «V1»`)
    await ev(`${cuerpo}.scrollTop=99999`); await sleep(500); cs = await circulos(); ok(cs[5].activa && cs.filter(x => x.activa).length === 1, `${et}: Acordes: al llegar al final la activa es «E»`)
    ok(await ev(`(()=>{const r=${TIRA}.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`), `${et}: la tira sigue a la vista tras desplazar`)

    // ── agregar otra parte desde la tira: «Coro 2» ──
    await tocar('«+» (Coro 2)', MAS); await esperar(SHEET, 'la hoja'); ok(await ev(`/Coro 2/.test(${SHEET}.innerText)&&/Verso 3/.test(${SHEET}.innerText)&&/Ya tienes V1, C, V2, Bd, It y E\\./.test(${SHEET}.innerText.replace(/\\s+/g,' '))`), `${et}: la hoja dice «Ya tienes V1, C, V2, Bd, It y E» y ofrece «Verso 3» y «Coro 2»`)
    await tocar('Coro 2', tipo(`${SHEET}.querySelector('[role=group]')`, 'Coro 2')); await sleep(300); cs = await circulos(); ok(cs.length === 7 && cs[6].t === 'C2' && cs[6].activa, `${et}: «C2» aparece al final y queda activa (${cs.map(x => x.t).join(' ')})`)
    await send('Input.insertText', { text: 'Una línea del segundo coro' }).catch(() => {}); await sleep(200)

    // ── Guardar: una petición ──
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    const posts = await ev(`JSON.stringify(window.__posts)`).then(JSON.parse), b = posts[0]
    ok(posts.length === 1 && JSON.stringify(b.secciones.map(s => s.nombre)) === JSON.stringify(['VERSO 1', 'CORO', 'VERSO 2', 'PUENTE', 'INTERLUDIO', 'FINAL', 'CORO 2']), `${et}: Guardar envía UNA petición con las siete partes del texto (${b.secciones.map(s => s.codigo).join(' ')})`)
    const e = await escrituras(); ok(e.filter(x => x.m === 'POST').length === 1 && e.every(x => x.m === 'POST'), `${et}: en toda la prueba un solo insert de canción y ninguna otra escritura`)
    const errs = c.consola.filter(x => /EXCEPCIÓN|\[error\]/.test(x) && !/Failed to load resource|favicon/.test(x)); ok(errs.length === 0, `${et}: sin errores en la consola${errs.length ? ' — ' + errs[0].slice(0, 120) : ''}`)
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
