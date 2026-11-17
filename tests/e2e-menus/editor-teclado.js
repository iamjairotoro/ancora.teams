// El editor móvil frente al teclado del iPhone, en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. Canción GUARDADA de datos inventados, modo Texto. El servidor se simula; ninguna escritura real.
// Chrome de escritorio no tiene teclado: se sustituye `window.visualViewport` por uno controlable (alto y offsetTop), que es EXACTAMENTE lo que lee `useTecladoPantalla`, y se mide la geometría contra la zona visible [arriba, arriba + alto].
// La zona segura de arriba se emula (ZONA=47 por defecto, el peor caso: app instalada; ZONA=0 = Safari). Lo que NO cubre: el comportamiento real de Safari (cuánto desplaza la vista); eso se comprueba en el iPhone.
// Qué comprueba (paso 1): con el teclado abierto y la vista desplazada 0, 120 y 200 px, el editor ocupa justo la zona visible: la cabecera queda dentro, el panel de botones termina en el borde del teclado y no asoma la página de atrás;
// sin teclado y al cerrarlo todo queda como estaba.
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
const VV = `(()=>{const et=new EventTarget();const st={height:innerHeight,offsetTop:0,scale:1,width:innerWidth,offsetLeft:0,pageTop:0,pageLeft:0};
const vv=new Proxy(et,{get(t,k){if(k in st)return st[k];const v=t[k];return typeof v==='function'?v.bind(t):v}});
Object.defineProperty(window,'visualViewport',{get:()=>vv,configurable:true});
window.__teclado=(alto,arriba)=>{st.height=alto==null?innerHeight:alto;st.offsetTop=arriba||0;et.dispatchEvent(new Event(arriba?'scroll':'resize'))}})()`
const out = []; let fallas = 0
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function caso(ancho, tema) {
  const et = `${ancho} ${tema}${ZONA ? '' : ' (zona 0)'}`, ALTO = ALTOS[ancho], VIS = ALTO - TECLADO[ancho]
  const c = await lanzar(9643), { send, ev } = c
  const esperar = async (cond, n) => { const t0 = Date.now(); for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch {} if (v) return; if (Date.now() - t0 > 20000) throw new Error('no apareció: ' + n); await sleep(100) } }
  const clic = async (n, b) => { await esperar(b, n); const r = JSON.parse(await ev(`(()=>{const e=${b};e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300) }
  const D = `document.querySelector('[role=dialog]')`
  const medir = (alto, arriba) => ev(`(()=>{window.__teclado(${alto},${arriba});const d=${D};const q=s=>d.querySelector('[class*="'+s+'"]');const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {top:Math.round(b.top),bottom:Math.round(b.bottom),alto:Math.round(b.height),visible:getComputedStyle(e).display!=='none'&&b.height>0}};
    const vis=${alto === null ? 'innerHeight' : alto},arr=${arriba},cu=r(q('_cuerpo__'));const en=y=>{const e=document.elementFromPoint(${ancho}/2,Math.max(1,Math.min(innerHeight-2,y)));return !!(e&&d.contains(e))};
    return JSON.stringify({estilo:{top:d.style.top,bottom:d.style.bottom,height:d.style.height,maxHeight:d.style.maxHeight},teclado:d.getAttribute('data-teclado'),raiz:r(d),cab:r(q('_cab__')),herr:r(q('_herr__')),cuerpo:cu,barra:r(q('_barraTexto__')),
      textoVisible:cu?Math.max(0,Math.min(cu.bottom,arr+vis)-Math.max(cu.top,arr)):0,arribaEsEditor:en(arr+3),abajoEsEditor:en(arr+vis-4),foco:document.activeElement===d.querySelector('textarea'),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})})()`).then(JSON.parse)
  const foto = async (n, alto, arriba) => { const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: arriba, width: ancho, height: alto, scale: 1 } }); fs.writeFileSync(`${OUT}/${n}__${ancho}__${tema}${ZONA ? '' : '__zona0'}.png`, Buffer.from(s.data, 'base64')) }
  try {
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Page.addScriptToEvaluateOnNewDocument', { source: VV })
    await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: ALTO, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    if (ZONA) await send('Emulation.setSafeAreaInsetsOverride', { insets: { top: ZONA, bottom: 34 } })
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('la canción', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`)
    await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=5`, 'el modo Acordes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)
    await clic('✎ Texto', `[...${D}.querySelectorAll('button')].find(b=>/Texto/.test(b.textContent))`); await esperar(`${D}.querySelector('textarea')`, 'el cuadro de texto'); await sleep(300)
    await ev(`${D}.querySelector('textarea').focus()`)

    // ── sin teclado: como siempre ──
    const sin = await medir(null, 0)
    ok(sin.raiz.top === 0 && sin.raiz.bottom === ALTO && !sin.estilo.top && !sin.estilo.height && !sin.estilo.bottom && sin.teclado === null, `${et}: sin teclado el editor ocupa toda la pantalla y no lleva ningún ajuste`)
    ok(sin.barra.bottom === ALTO && sin.cab.top === 0, `${et}: sin teclado la cabecera está arriba y el panel de botones abajo`)

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
    ok((await ev('window.__posts')) === 0, `${et}: ninguna petición de guardado`)
    const errs = c.consola.filter(x => /EXCEPCIÓN|\[error\]/.test(x) && !/Failed to load resource|favicon/.test(x)); ok(errs.length === 0, `${et}: sin errores en la consola${errs.length ? ' — ' + errs[0].slice(0, 120) : ''}`)
  } finally { await c.cerrar() }
}
// Paso 2 (dar sitio al texto): se llena en su commit.
function PASO2() {}

;(async () => {
  const SOLO = process.env.SOLO || ''
  for (const [a, t] of [[390, 'light'], [390, 'dark'], [360, 'light'], [360, 'dark']].filter(([a, t]) => !SOLO || SOLO === `${a} ${t}`)) {
    try { await caso(a, t) } catch (e) { ok(false, `${a} ${t}: se cortó — ${e.message}`) }
  }
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, 0 avisos (reintentos)`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
