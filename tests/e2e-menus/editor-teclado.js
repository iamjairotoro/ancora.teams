// El editor móvil frente al teclado del iPhone, en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. Canción GUARDADA de datos inventados, modo Texto. El servidor se simula; ninguna escritura real.
// Chrome de escritorio no tiene teclado: se sustituye `window.visualViewport` por uno controlable (alto y offsetTop), que es EXACTAMENTE lo que lee `useTecladoPantalla`, y se mide la geometría contra la zona visible [arriba, arriba + alto].
// La zona segura de arriba se emula (ZONA=47 por defecto, el peor caso: app instalada; ZONA=0 = Safari). Lo que NO cubre: el comportamiento real de Safari (cuánto desplaza la vista); eso se comprueba en el iPhone.
// Qué comprueba (paso 1): con el teclado abierto y la vista desplazada 0, 120 y 200 px, el editor ocupa justo la zona visible: la cabecera queda dentro, el panel de botones termina en el borde del teclado y no asoma la página de atrás;
// sin teclado y al cerrarlo todo queda como estaba.
// (paso 2): con el teclado abierto se ven Deshacer, Rehacer y el modo; se ocultan tono, ABC/123 y la frase de ayuda; el panel va en una fila y cabe entero; el texto visible mide ≥ 150 px. También en el editor de canción NUEVA (ESCENARIO=nueva).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-teclado.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/editor-teclado', ZONA = Number(process.env.ZONA ?? 47)
fs.mkdirSync(OUT, { recursive: true })
const ALTOS = { 390: 664, 360: 640 }, TECLADO = { 390: 302, 360: 291 }          // alto de la ventana con las barras de Safari y lo que tapa el teclado
const versos = n => Array.from({ length: n }, (_, i) => `Línea ${i + 1} inventada de la parte`).join('\n')
const LETRA = ['VERSO 1', 'CORO', 'VERSO 2', 'PUENTE', 'VERSO 3'].map(p => p + ':\n' + versos(6)).join('\n\n')
const SEC = JSON.stringify(Array.from({ length: 5 }, () => versos(6).split('\n').map(t => ({ kind: 'lyric', segments: [{ text: t }] }))))
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__posts=0;window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const post=esAc&&((o&&o.method)||'GET').toUpperCase()==='POST';
if(post){window.__posts++;return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})}
const r=await f(i,o);if(esAc&&!post){const d=await r.clone().json();d.cancion.letra=${JSON.stringify(LETRA)};d.cancion.tono='G';d.cancion.secciones=${SEC};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
// ESCENARIO=nueva: el editor de una canción NUEVA (misma simulación del servidor que los e2e de la estructura).
const NUEVA_ID = '33333333-3333-4333-8333-333333333333', BORRADOR_ID = '44444444-4444-4444-8444-444444444444'
const PARCHE_NUEVA = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__posts=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
const CARGA=id=>({tono:id==='${BORRADOR_ID}'?'D':'F',letra:'',origen:'ninguno',secciones:null,sinConvertir:0,huella:'a'.repeat(32),formatoAntiguo:false,guardadas:null,arregloPropio:id==='${BORRADOR_ID}',estructuraGuardada:id==='${BORRADOR_ID}'?[{indice:0,repeat:2},{indice:1,repeat:1},{indice:0,repeat:1}]:null,actual:{secciones:[],arreglo:[]}});
let n=0;
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.endsWith('/rest/v1/songs')&&m!=='GET'){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch{}
 window.__escrituras.push({m,b,q:url.search});
 if(m==='POST'){n++;return j({id:n===1?'${NUEVA_ID}':'${NUEVA_ID}'.replace('3333','5555'),created_at:'2026-11-10',...b},201)}
 if(m==='PATCH'){const id=(url.searchParams.get('id')||'').replace('eq.','');return j({id,created_at:'2026-11-09',...b},200)}}
if(m!=='GET'&&m!=='HEAD'&&url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/rpc/')){window.__escrituras.push({m,otra:url.pathname});return j([])}
if(url.pathname.startsWith('/api/admin/canciones/acordes')){if(m==='GET')return j({cancion:CARGA(url.searchParams.get('id')),hojaFicha:null});window.__posts.push(JSON.parse(o.body));return j({ok:true,huella:'b'.repeat(32)})}
const r=await f(i,o);
if(url.pathname.endsWith('/rest/v1/songs')&&m==='GET'&&(url.searchParams.get('select')||'')==='*'){const rows=await r.clone().json();if(Array.isArray(rows)){rows.push({id:'${BORRADOR_ID}',nombre:'ZZ Borrador con arreglo',artista:'Grupo Inventado',tono_original:'D',bpm:70,publicada:false,letra:null,created_at:'2026-11-09'});return j(rows)}}
return r}})()`
const NUEVA = process.env.ESCENARIO === 'nueva'
const VV = `(()=>{const et=new EventTarget();const st={height:innerHeight,offsetTop:0,scale:1,width:innerWidth,offsetLeft:0,pageTop:0,pageLeft:0};
const vv=new Proxy(et,{get(t,k){if(k in st)return st[k];const v=t[k];return typeof v==='function'?v.bind(t):v}});
Object.defineProperty(window,'visualViewport',{get:()=>vv,configurable:true});
window.__teclado=(alto,arriba)=>{st.height=alto==null?innerHeight:alto;st.offsetTop=arriba||0;et.dispatchEvent(new Event(arriba?'scroll':'resize'))}})()`
const out = []; let fallas = 0
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function caso(ancho, tema) {
  const et = `${NUEVA ? 'nueva · ' : ''}${ancho} ${tema}${ZONA ? '' : ' (zona 0)'}`, ALTO = ALTOS[ancho], VIS = ALTO - TECLADO[ancho]
  const c = await lanzar(9643), { send, ev } = c
  const esperar = async (cond, n) => { const t0 = Date.now(); for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch {} if (v) return; if (Date.now() - t0 > 20000) throw new Error('no apareció: ' + n); await sleep(100) } }
  const clic = async (n, b) => { await esperar(b, n); const r = JSON.parse(await ev(`(()=>{const e=${b};e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300) }
  let D = `document.querySelector('[role=dialog]')`
  const medir = (alto, arriba) => ev(`(()=>{window.__teclado(${alto},${arriba});const d=${D};const q=s=>d.querySelector('[class*="'+s+'"]');const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {top:Math.round(b.top),bottom:Math.round(b.bottom),alto:Math.round(b.height),visible:getComputedStyle(e).display!=='none'&&b.height>0}};
    const vis=${alto === null ? 'innerHeight' : alto},arr=${arriba},cu=r(q('_cuerpo__'));const en=y=>{const e=document.elementFromPoint(${ancho}/2,Math.max(1,Math.min(innerHeight-2,y)));return !!(e&&d.contains(e))};
    return JSON.stringify({estilo:{top:d.style.top,bottom:d.style.bottom,height:d.style.height,maxHeight:d.style.maxHeight},teclado:d.getAttribute('data-teclado'),raiz:r(d),cab:r(q('_cab__')),herr:r(q('_herr__')),cuerpo:cu,barra:r(q('_barraTexto__')),
      textoVisible:cu?Math.max(0,Math.min(cu.bottom,arr+vis)-Math.max(cu.top,arr)):0,x:(()=>{const v=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>0;const bt=n=>d.querySelector('button[aria-label="'+n+'"]');const ba=q('_barraTexto__');const vol=ba&&ba.querySelector('[class*="_volver__"]');const ch=ba?[...ba.querySelectorAll('[class*="_encabezados__"] button')]:[];const vr=vol&&vol.getBoundingClientRect();const c0=ch[0]&&ch[0].getBoundingClientRect();const toca=[...d.querySelectorAll('button,select')].filter(v).map(e=>Math.round(e.getBoundingClientRect().height));return {tira:v(q('_tiraEditor__')),subtitulo:v(q('_subtitulo__')),deshacer:v(bt('Deshacer')),rehacer:v(bt('Rehacer')),modo:v(d.querySelector('[class*="_modoTexto__"]')),tono:v(d.querySelector('select')),notacion:v(q('_notacion__')),ayuda:v(ba&&ba.querySelector('[class*="_pieTexto__"] span')),acordes:v(vol),unaFila:!!(vr&&c0&&Math.abs((vr.top+vr.height/2)-(c0.top+c0.height/2))<=2),chips:ch.filter(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.left<innerWidth-20}).length,minToque:Math.min(...toca)}})(),arribaEsEditor:en(arr+3),abajoEsEditor:en(arr+vis-4),foco:document.activeElement===d.querySelector('textarea'),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})})()`).then(JSON.parse)
  const foto = async (n, alto, arriba) => { const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: arriba, width: ancho, height: alto, scale: 1 } }); fs.writeFileSync(`${OUT}/${NUEVA ? 'nueva-' : ''}${n}__${ancho}__${tema}${ZONA ? '' : '__zona0'}.png`, Buffer.from(s.data, 'base64')) }
  try {
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: NUEVA ? PARCHE_NUEVA : PARCHE }); await send('Page.addScriptToEvaluateOnNewDocument', { source: VV })
    await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: ALTO, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    if (ZONA) await send('Emulation.setSafeAreaInsetsOverride', { insets: { top: ZONA, bottom: 34 } })
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    if (NUEVA) {
      const V = `document.querySelector('[role=dialog][aria-label="Nueva canción"]')`, campo = (etq, tag = 'input') => `[...${V}.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(etq)}))?.querySelector('${tag}')`
      await clic('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
      await ev(`(${campo('Título')}).focus()`); await send('Input.insertText', { text: 'ZZ Prueba teclado' }); await sleep(150)
      await ev(`(()=>{const s=${campo('Tonalidad original', 'select')};const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,'F');s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(200)
      await clic('Crear y escribir la letra', `[...${V}.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Crear y escribir'))`)
      D = `document.querySelector('[role=dialog][aria-label="ZZ Prueba teclado"]')`; await esperar(`${D}&&${D}.innerText.includes('Empieza por una parte')`, 'el editor de la canción nueva'); await sleep(300)
      const tipo = (raiz, n) => `[...${raiz}.querySelectorAll('button')].find(b=>b.lastElementChild&&b.lastElementChild.textContent.trim()===${JSON.stringify(n)})`
      await clic('Verso 1', tipo(`${D}.querySelector('section')`, 'Verso 1')); await esperar(`${D}.querySelector('textarea')`, 'el cuadro de texto'); await send('Input.insertText', { text: versos(8) }); await sleep(250)
      const HOJA = `document.querySelector('[role=dialog][aria-label="Agregar a la estructura"]')`
      for (const n of ['Coro', 'Verso 2']) { await clic('«+» de la tira', `${D}.querySelector('button[aria-label="Agregar una parte"]')`); await esperar(HOJA, 'la hoja'); await clic(n, tipo(`${HOJA}.querySelector('[role=group][aria-label="Parte nueva"]')`, n)); await send('Input.insertText', { text: versos(8) }); await sleep(250) }
    } else {
      await clic('la canción', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
      await clic('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`)
      await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=5`, 'el modo Acordes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)
      await clic('✎ Texto', `[...${D}.querySelectorAll('button')].find(b=>/Texto/.test(b.textContent))`); await esperar(`${D}.querySelector('textarea')`, 'el cuadro de texto'); await sleep(300)
    }
    await ev(`${D}.querySelector('textarea').focus()`)

    // ── sin teclado: como siempre ──
    const sin = await medir(null, 0)
    ok(sin.raiz.top === 0 && sin.raiz.bottom === ALTO && !sin.estilo.top && !sin.estilo.height && !sin.estilo.bottom && sin.teclado === null, `${et}: sin teclado el editor ocupa toda la pantalla y no lleva ningún ajuste`)
    ok(sin.barra.bottom === ALTO && sin.cab.top === 0, `${et}: sin teclado la cabecera está arriba y el panel de botones abajo`)
    ok(sin.x.tono && sin.x.notacion && sin.x.ayuda && !sin.x.unaFila && sin.x.deshacer, `${et}: sin teclado se ven el tono, ABC/123 y la frase de ayuda, y el panel va en dos filas (como siempre)`)

    // ── teclado abierto, con la vista desplazada 0, 120 y 200 px ──
    for (const arr of [0, 120, 200]) {
      const m = await medir(VIS, arr); await sleep(150); await foto(`teclado-desplazado-${arr}`, VIS, arr)
      ok(m.raiz.top === arr && m.raiz.bottom === arr + VIS, `${et} · desplazamiento ${arr}: el editor ocupa justo la zona visible (${m.raiz.top}–${m.raiz.bottom} de ${arr}–${arr + VIS})`)
      ok(m.cab.top === arr, `${et} · desplazamiento ${arr}: la cabecera queda dentro de la pantalla (empieza en ${m.cab.top - arr})`)
      ok(m.barra.bottom >= arr + VIS, `${et} · desplazamiento ${arr}: el panel de botones no flota sobre el teclado (hueco ${Math.max(0, arr + VIS - m.barra.bottom)} px)`)      // que además QUEPA entero (sin salirse por debajo) es del paso 2
      ok(m.arribaEsEditor && m.abajoEsEditor, `${et} · desplazamiento ${arr}: no asoma la página de atrás ni arriba ni sobre el teclado`)
      ok(m.cuerpo.bottom <= m.barra.top && m.cuerpo.alto >= 0 && m.foco && m.sw <= m.cw, `${et} · desplazamiento ${arr}: el panel no tapa el texto, el foco sigue en el cuadro y no hay desplazamiento lateral`)
      ok(m.estilo.maxHeight === '' && m.teclado === '1', `${et} · desplazamiento ${arr}: el ajuste es el de pantalla completa (top ${m.estilo.top}, alto ${m.estilo.height})`)
      PASO2(et + ` · desplazamiento ${arr}`, m)
    }
    // ── cierre del teclado ──
    const cerrado = await medir(null, 0)
    ok(cerrado.raiz.top === 0 && cerrado.raiz.bottom === ALTO && !cerrado.estilo.top && !cerrado.estilo.height && cerrado.teclado === null && cerrado.barra.bottom === ALTO, `${et}: al cerrar el teclado todo vuelve a su sitio`)
    ok(JSON.stringify([cerrado.cab.alto, cerrado.herr.alto, cerrado.barra.alto, cerrado.cuerpo.alto]) === JSON.stringify([sin.cab.alto, sin.herr.alto, sin.barra.alto, sin.cuerpo.alto]), `${et}: sin teclado las medidas son idénticas a las de antes de abrirlo (${[cerrado.cab.alto, cerrado.herr.alto, cerrado.barra.alto, cerrado.cuerpo.alto].join(', ')})`)
    if (NUEVA) ok(sin.x.tira && sin.x.subtitulo && cerrado.x.tira && cerrado.x.subtitulo, `${et}: sin teclado (antes y después) la tira y el subtítulo están a la vista`)
    ok(cerrado.x.tono && cerrado.x.notacion && cerrado.x.ayuda && !cerrado.x.unaFila, `${et}: al cerrar el teclado vuelven el tono, ABC/123, la ayuda y las dos filas`)
    ok((await ev('Array.isArray(window.__posts)?window.__posts.length:window.__posts')) === 0, `${et}: ninguna petición de guardado`)
    const errs = c.consola.filter(x => /EXCEPCIÓN|\[error\]/.test(x) && !/Failed to load resource|favicon/.test(x)); ok(errs.length === 0, `${et}: sin errores en la consola${errs.length ? ' — ' + errs[0].slice(0, 120) : ''}`)
  } finally { await c.cerrar() }
}
// Paso 2 (dar sitio al texto): con el teclado abierto el panel cabe entero y el texto visible mide al menos 150 px.
const TEXTO_MIN = 150
function PASO2(et, m) {
  ok(m.barra.bottom === m.raiz.bottom, `${et}: el panel de botones cabe entero y termina justo en el borde del teclado`)
  ok(m.textoVisible >= TEXTO_MIN, `${et}: el texto visible mide ${m.textoVisible} px (mínimo ${TEXTO_MIN})`)
  ok(m.x.deshacer && m.x.rehacer && m.x.modo, `${et}: Deshacer, Rehacer y el botón de modo siguen a la vista`)
  ok(!m.x.tono && !m.x.notacion && !m.x.ayuda, `${et}: se ocultan el tono, ABC/123 y la frase de ayuda`)
  ok(m.x.unaFila && m.x.acordes && m.x.chips >= 2, `${et}: el panel va en una sola fila, con «♪ Acordes» y los encabezados (${m.x.chips} a la vista)`)
  ok(m.x.minToque >= 44, `${et}: todo lo que se toca mide ≥ 44 px (${m.x.minToque})`)
  if (NUEVA) ok(!m.x.tira && !m.x.subtitulo, `${et}: en canción nueva se ocultan el subtítulo y la tira de la estructura mientras se escribe`)
}

;(async () => {
  const SOLO = process.env.SOLO || ''
  for (const [a, t] of [[390, 'light'], [390, 'dark'], [360, 'light'], [360, 'dark']].filter(([a, t]) => !SOLO || SOLO === `${a} ${t}`)) {
    try { await caso(a, t) } catch (e) { ok(false, `${a} ${t}: se cortó — ${e.message}`) }
  }
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, 0 avisos (reintentos)`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
