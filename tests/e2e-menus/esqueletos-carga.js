// El salto «antiguo → nuevo» al cargar (Admin móvil, paso 1) en un navegador REAL (Chrome por CDP): red lenta (300 ms, 150 KB/s) y caché vacía, con la API retrasada (API_MS, 900 por defecto) para que se vea qué se pinta mientras se espera.
// Graba los cuadros de pantalla con su hora (screencast) y una «firma» por cuadro de animación (qué componentes existen y qué texto hay) y COMPRUEBA que la pantalla antigua no aparece un momento para cambiarse por la nueva.
// Escenarios: lista (sin «Sin resultados» ni «0 en el repertorio» mientras llegan las canciones) · ficha-hoja (la hoja de letra no aparece antes de la hoja con acordes) · ficha (sin hoja: del marcador a la letra) · musico (la pantalla «Letra» no aparece antes de la lectura) · nueva (el subtítulo del editor no cambia).
// Uso: construir.sh 3171  →  BASE=http://127.0.0.1:3171 node tests/e2e-menus/esqueletos-carga.js <escenario> <ancho> <tema> <carpeta-de-capturas>      (correr-esqueletos.sh corre todo, un proceso por combinación)
// Sin servidor real: datos INVENTADOS y ninguna escritura fuera del insert de la canción de prueba. Con SIN_ESQUELETOS=1 las comprobaciones se invierten (sirve para medir el «antes» sobre una compilación vieja).
const REPO = __dirname + '/'
const { lanzar, sleep } = require(REPO + 'cdp.js'), fs = require('fs'), os = require('os'), path = require('path')
const MA = require(REPO + 'inv5-letra-mock.js'), MP = require(REPO + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3171'
const [escenario = 'lista', anchoS = '390', tema = 'light', OUT = '/tmp/esqueletos-carga'] = process.argv.slice(2), ANTES = process.env.SIN_ESQUELETOS === '1'
const CUADROS = fs.mkdtempSync(path.join(os.tmpdir(), 'cuadros-'))
const ancho = Number(anchoS), RAPIDA = process.env.RAPIDA === '1', API_MS = Number(process.env.API_MS || 900)
fs.mkdirSync(OUT, { recursive: true })

const A = (g, cal = '') => ({ g, cal })
const ly = (a, ga, b, gb) => ({ kind: 'lyric', segments: [{ text: a, acorde: A(ga) }, { text: b, acorde: A(gb) }] })
const HOJA = { tono: 'G', secciones: [
  { code: 'V1', name: 'Verso 1', repeat: 1, lineas: [ly('Línea de prueba ', 1, 'número uno de la parte', 5), ly('Otra línea de prueba ', 4, 'que sigue aquí mismo', 5)] },
  { code: 'C', name: 'Coro', repeat: 2, lineas: [ly('Coro de prueba ', 1, 'con su letra', 4)] } ] }
const CANCION = { tono: 'G', letra: 'VERSO 1:\nLínea de prueba', origen: 'formato2', secciones: null, sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null, actual: { secciones: [], arreglo: [] } }
const CANCION_VACIA = { ...CANCION, letra: '', tono: 'F' }      // el tono de la canción de prueba (la que se crea con «F»)

// Las rutas de administración responden con RETRASO (API_MS) para que se vea qué se pinta mientras se espera; el resto lo contesta el simulador de siempre.
const PARCHE_ADMIN = `(()=>{const f=window.fetch.bind(window);const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
const dormir=ms=>new Promise(r=>setTimeout(r,ms));window.__ESC=${JSON.stringify(escenario)};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.startsWith('/api/admin/canciones/acordes')&&m==='GET'){await dormir(${API_MS});const vacia=window.__ESC==='nueva';return j({cancion:vacia?${JSON.stringify(CANCION_VACIA)}:${JSON.stringify(CANCION)},hojaFicha:window.__ESC==='ficha-hoja'?{hoja:${JSON.stringify(HOJA)},otrasVersiones:0,desajuste:false}:{hoja:null,otrasVersiones:0,desajuste:false}})}
if(url.pathname.endsWith('/rest/v1/songs')&&m==='GET'&&(url.searchParams.get('select')||'')==='*'){await dormir(${API_MS})}
if(url.pathname.endsWith('/rest/v1/songs')&&m==='POST'){await dormir(300);return j({id:'33333333-3333-4333-8333-333333333333',created_at:'2026-11-10',...JSON.parse(o.body||'{}')},201)}
if(url.pathname.startsWith('/api/portal/preferencias')){await dormir(${API_MS})}
return f(i,o)}})()`
const PARCHE_MUSICO = `(()=>{const f=window.fetch.bind(window);const dormir=ms=>new Promise(r=>setTimeout(r,ms));
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));if(u.startsWith('/api/portal/cancion?')||u.startsWith('/api/portal/preferencias'))await dormir(${API_MS});const r=await f(i,o);
if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(HOJA)};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`

// La "firma" de cada cuadro: lo que decide cómo se ve. Solo se guarda cuando cambia.
const REGISTRO = `(()=>{window.__sig=[];window.__ls=[];let ultimo='';const cuenta=s=>document.querySelectorAll(s).length;
const firma=()=>{const b=document.body;if(!b)return null;const r=document.documentElement;const main=document.querySelector('main');const h=document.querySelector('header');const raiz=b.querySelector('div.dark')?'dark':'';
 const cs=(e,p)=>e?getComputedStyle(e)[p]:null;
 return {th:r.getAttribute('data-theme'),claseDark:raiz?1:0,bg:cs(b,'backgroundColor'),fuenteMain:(cs(main,'fontFamily')||'').split(',')[0],fuentesCargadas:[...document.fonts].filter(f=>f.status==='loaded').length,
  cabecera:h?cs(h,'display'):null,main:main?Math.round(main.getBoundingClientRect().height):0,
  panel:cuenta('.anc-panel'),chip:cuenta('.anc-chip'),buscaViejo:cuenta('label.anc-search'),skel:cuenta('.anc-skel'),hoja:cuenta('.anc-sheet'),lsec:cuenta('.anc-lsec'),esq:[...new Set([...document.querySelectorAll('[data-esqueleto]')].map(e=>e.getAttribute('data-esqueleto')))].join(','),lp:/Línea\\s+de\\s+prueba/.test(b.innerText),v1:/Verso 1/.test(b.innerText)&&/Cuán grande es Él/.test(b.innerText),sub:((document.querySelector('[class*="_subtitulo"]')||{}).textContent)||'',vacio:cuenta('.anc-lyrEmpty'),
  dialogos:cuenta('[role=dialog]'),listas:cuenta('[class*=lectura],[class*=Lectura]'),
  texto:(main?main.innerText:b.innerText).replace(/\\s+/g,' ').trim().slice(0,70)}};
const paso=()=>{try{const f=firma();if(f){const s=JSON.stringify(f);if(s!==ultimo){ultimo=s;window.__sig.push({t:Math.round(performance.timeOrigin+performance.now()),f})}}}catch(e){}requestAnimationFrame(paso)};requestAnimationFrame(paso);
try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__ls.push({t:Math.round(performance.timeOrigin+e.startTime),v:+e.value.toFixed(4),n:(e.sources||[]).length,c:(e.sources||[]).map(s=>s.node&&(s.node.className||s.node.nodeName)+'').slice(0,2)})}).observe({type:'layout-shift',buffered:true})}catch(e){}})()`

;(async () => {
  const c = await lanzar(9611 + (escenario.length % 7)), { send, ev } = c
  const marcos = [], out = []; let fallas = 0; const et = `${escenario} ${ancho} ${tema}`; const ok_ = (m, cond, esperado) => { const bien = ANTES && esperado === false ? !cond : cond; out.push((bien ? 'OK    ' : 'FALLA ') + m); if (!bien) fallas++ }
  const esperar = async (cond, nombre, max = 90000) => { const t0 = Date.now(); for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) {} if (v) return; if (Date.now() - t0 > max) throw new Error(`«${nombre}» no apareció (${await ev('document.body.innerText.slice(0,120)').catch(() => '')})`); await sleep(100) } }
  const tocar = async (buscar, nombre) => { await esperar(buscar, nombre); const r = JSON.parse(await ev(`(()=>{const e=${buscar};e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(100) }
  const esAdmin = escenario !== 'musico'
  try {
    // 1) preparar sin lentitud: simulador, sesión, tamaño y tema del sistema; entrar una vez para fijar el origen y el rol
    await send('Page.addScriptToEvaluateOnNewDocument', { source: (esAdmin ? MA : MP).MOCK })
    await send('Page.addScriptToEvaluateOnNewDocument', { source: esAdmin ? PARCHE_ADMIN : PARCHE_MUSICO })
    await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: MA.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(1500)
    await ev(esAdmin ? `localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')` : `localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`)
    // 2) caché vacía + red lenta SOLO desde aquí; el registro de cuadros se instala para las páginas nuevas
    await send('Network.clearBrowserCache'); await send('Network.setCacheDisabled', { cacheDisabled: true })
    if (!RAPIDA) await send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 150 * 1024, uploadThroughput: 75 * 1024 })
    await send('Page.addScriptToEvaluateOnNewDocument', { source: REGISTRO })
    await send('Page.startScreencast', { format: 'jpeg', quality: 55, everyNthFrame: 1 })
    let vivo = true; const bomba = (async () => { let k = 0; while (vivo) { for (; k < c.eventos.length; k++) { const e = c.eventos[k]; if (e.method === 'Page.screencastFrame') { marcos.push({ t: Math.round(e.params.metadata.timestamp * 1000), d: e.params.data }); send('Page.screencastFrameAck', { sessionId: e.params.sessionId }).catch(() => {}) } } await sleep(15) } })()
    const t0 = Date.now()
    const url = escenario === 'musico' ? '/portal/t65' : '/admin?tab=canciones'
    await send('Page.navigate', { url: B + url })
    // 3) lo que sigue de cada escenario
    if (escenario === 'lista') { await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'lista'); await sleep(2500) }
    if (escenario === 'ficha' || escenario === 'ficha-hoja') {
      await esperar(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`, 'lista'); await sleep(1500)
      await ev(`window.__marca=performance.timeOrigin+performance.now()`)
      await ev(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él').click()`)
      await esperar(`document.querySelector('.anc-sheet')||document.querySelector('.anc-lyrEmpty')`, 'ficha'); await sleep(API_MS + 2500)
    }
    if (escenario === 'nueva') {
      await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'lista'); await sleep(1500)
      await ev(`window.__marca=performance.timeOrigin+performance.now()`)
      await tocar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'Agregar'); await esperar(`document.querySelector('[role=dialog][aria-label="Nueva canción"]')`, 'ventana datos'); await sleep(500)
      await ev(`(()=>{const V=document.querySelector('[role=dialog][aria-label="Nueva canción"]');const i=[...V.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith('Título')).querySelector('input');i.focus()})()`); await send('Input.insertText', { text: 'ZZ Prueba salto' })
      const s = await ev(`(()=>{const V=document.querySelector('[role=dialog][aria-label="Nueva canción"]');const sel=[...V.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith('Tonalidad original')).querySelector('select');const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(sel,'F');sel.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`); await sleep(300)
      await ev(`window.__marcaEditor=performance.timeOrigin+performance.now()`)
      await tocar(`[...document.querySelector('[role=dialog][aria-label="Nueva canción"]').querySelectorAll('button')].find(b=>b.textContent.trim().startsWith('Crear y escribir'))`, 'Crear y escribir')
      await esperar(`document.querySelector('[role=dialog][aria-label="ZZ Prueba salto"]')`, 'editor'); await sleep(API_MS + 2500)
    }
    if (escenario === 'musico') {
      await esperar(`document.querySelector('ul li button[aria-label^="Cuán"]')`, 'lista'); await sleep(1500)
      await ev(`window.__marca=performance.timeOrigin+performance.now()`)
      await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`)
      await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'lectura'); await sleep(API_MS + 2500)
    }
    vivo = false; await bomba
    const textoFinal = await ev(`document.body.innerText`)
    const sig = JSON.parse(await ev(`JSON.stringify(window.__sig)`)), ls = JSON.parse(await ev(`JSON.stringify(window.__ls)`))
    const base = sig.length ? sig[0].t : 0, cuadros = marcos.map((m, i) => ({ t: m.t - base, d: m.d }))
    // ── comprobaciones sobre lo que se vio, en orden ──
    const F = sig.map(x => x.f), vio = fn => F.some(fn), con = (ok, msg) => { const bien = ANTES ? !ok : ok; out.push((bien ? 'OK    ' : 'FALLA ') + (ANTES ? '(antes, invertida) ' : '') + msg); if (!bien) fallas++ }
    const sinPantallaVieja = {
      lista: () => con(!vio(f => /Sin resultados|\b0 en el repertorio/.test(f.texto)), 'lista: nunca «Sin resultados» ni «0 en el repertorio» mientras llegan las canciones'),
      'ficha-hoja': () => con(!vio(f => f.lsec > 0), 'ficha con hoja: la hoja de letra (.anc-lsec) no se pinta ni un cuadro'),
      ficha: () => ok_(`${et}: ficha sin hoja: al final sí queda la hoja de letra de siempre`, vio(f => f.lsec > 0), true),
      musico: () => con(!vio(f => /Cargando letra|Letra Adjuntos/.test(f.texto)), 'músico: la pantalla «Letra» («Cargando letra…», «Adjuntos», «Tipografía») no se pinta mientras llega la canción'),
      nueva: () => con(new Set(F.map(f => f.sub).filter(Boolean)).size <= 1 && F.some(f => /Tono F/.test(f.sub)), `editor nuevo: el subtítulo no cambia durante la carga (valores: ${[...new Set(F.map(f => f.sub).filter(Boolean))].join(' | ')})`),
    }
    const marcador = { lista: 'lista', 'ficha-hoja': 'ficha', ficha: 'ficha', musico: 'lectura', nueva: 'editor' }[escenario]
    ok_(`${et}: se ve el marcador de espera («${marcador}»)`, vio(f => (f.esq || '').split(',').includes(marcador)), !ANTES)
    sinPantallaVieja[escenario]()
    if (escenario === 'ficha-hoja') ok_(`${et}: al final está la hoja con acordes`, vio(f => f.lp), true)
    if (escenario === 'musico') ok_(`${et}: al final está la lectura con acordes`, vio(f => f.v1), true)
    const cls = ls.reduce((a, x) => a + x.v, 0)
    // ── la hoja de contacto: un cuadro justo antes y uno justo después de cada cambio ──
    const quiero = new Set([0, cuadros.length - 1]), antes = t => { let k = 0; cuadros.forEach((c, i) => { if (c.t <= t) k = i }); return k }, despues = t => { const i = cuadros.findIndex(c => c.t >= t); return i < 0 ? cuadros.length - 1 : i }
    sig.forEach(x => { const t = x.t - base; quiero.add(antes(t - 30)); quiero.add(despues(t + 80)) })
    let lista = [...quiero].sort((a, b) => a - b).filter(i => cuadros[i].t >= -50)
    while (lista.length > 8) { let mejor = 1, brecha = 1e9; for (let i = 1; i < lista.length - 1; i++) { const g = cuadros[lista[i + 1]].t - cuadros[lista[i - 1]].t; if (g < brecha) { brecha = g; mejor = i } } lista.splice(mejor, 1) }
    const alto = Math.round(ancho * 844 / 390)
    const html = `<body style="margin:0;background:#888;display:flex;gap:10px;padding:10px;font:14px monospace">${lista.map(i => `<div><div style="background:#fff;padding:2px 4px">${cuadros[i].t} ms</div><img style="width:${ancho}px;height:${alto}px;object-fit:cover;object-position:top;display:block" src="data:image/jpeg;base64,${cuadros[i].d}"></div>`).join('')}</body>`
    await send('Emulation.clearDeviceMetricsOverride'); await send('Emulation.setDeviceMetricsOverride', { width: lista.length * (ancho + 10) + 10, height: alto + 50, deviceScaleFactor: 1, mobile: false })
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await send('Page.navigate', { url: 'about:blank' }); await sleep(300)
    await ev(`document.open();document.write(${JSON.stringify(html)});document.close()`); await sleep(1500)
    const foto = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${escenario}__${ancho}__${tema}.png`, Buffer.from(foto.data, 'base64'))
    if (process.env.DEPURAR) out.push('SALTOS ' + JSON.stringify(ls.map(x => [x.t - base, x.v, x.c])))
    if (process.env.DEPURAR) out.push('TEXTO ' + JSON.stringify(textoFinal.slice(0, 500)))
    if (process.env.DEPURAR) out.push('DEPURAR ' + JSON.stringify(F.map(f => ({ esq: f.esq, lsec: f.lsec, lp: f.lp, v1: f.v1, t: f.texto.slice(0, 40) }))))
    out.push(`INFO  ${et}: ${sig.length} cambios de firma, ${cuadros.length} cuadros, cambio de diseño acumulado (CLS) ${cls.toFixed(3)}`)
  } catch (e) { out.push('FALLA ' + e.message); fallas++ } finally { await c.cerrar(); fs.rmSync(CUADROS, { recursive: true, force: true }); console.log(out.join('\n')); console.log(`\n${fallas ? 'FALLÓ' : 'ok'}: ${out.filter(x => /^(OK|FALLA)/.test(x)).length} comprobaciones, ${fallas} fallas`); process.exit(fallas ? 1 : 0) }
})()
