// «Nueva canción» paso B (el editor de una canción nueva) en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: tras «Crear y escribir la letra» se abre el editor con la cabecera «‹ Datos / título / Tono · bpm · Editar datos / Guardar» (Guardar apagado) y la tarjeta «Empieza por una parte» con los ocho tipos (sin barras de herramientas);
// elegir una parte la agrega al final con el cursor listo; «+ Parte» abre la hoja «Agregar parte» con el número que recibiría cada tipo (Verso 2, Coro 2…); Guardar de una canción nueva NO pide resumen y envía UNA petición (códigos V1, C, V2…);
// «‹ Datos» (sin cambios) reabre la ventana de datos de esa canción y «Solo guardar los datos» ACTUALIZA solo los campos de datos (nunca letra ni publicada); con cambios sin guardar pregunta «¿Descartar los cambios?».
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/nueva-cancion-paso-b.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/nueva-cancion-paso-b'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const NUEVA_ID = '33333333-3333-4333-8333-333333333333', BORRADOR_ID = '44444444-4444-4444-8444-444444444444'
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__posts=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
const CARGA=id=>({tono:id==='${BORRADOR_ID}'?'D':'F',letra:'',origen:'ninguno',secciones:null,sinConvertir:0,huella:'a'.repeat(32),formatoAntiguo:false,guardadas:null,actual:{secciones:[],arreglo:[]}});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.endsWith('/rest/v1/songs')&&m!=='GET'){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch{}
 window.__escrituras.push({m,b,q:url.search});
 if(m==='POST')return j({id:'${NUEVA_ID}',created_at:'2026-11-10',...b},201);
 if(m==='PATCH'){const id=(url.searchParams.get('id')||'').replace('eq.','');return j({id,created_at:'2026-11-09',...b},200)}}
if(m!=='GET'&&m!=='HEAD'&&url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/rpc/')){window.__escrituras.push({m,otra:url.pathname});return j([])}
if(url.pathname.startsWith('/api/admin/canciones/acordes')){if(m==='GET')return j({cancion:CARGA(url.searchParams.get('id')),hojaFicha:null});window.__posts.push(JSON.parse(o.body));return j({ok:true,huella:'b'.repeat(32)})}
const r=await f(i,o);
if(url.pathname.endsWith('/rest/v1/songs')&&m==='GET'&&(url.searchParams.get('select')||'')==='*'){const rows=await r.clone().json();if(Array.isArray(rows)){rows.push({id:'${BORRADOR_ID}',nombre:'ZZ Borrador de prueba',artista:'Grupo Inventado',tono_original:'D',bpm:70,publicada:false,letra:null,created_at:'2026-11-09'});return j(rows)}}
return r}})()`

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
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300)
  }
  const escribir = async (sel, texto) => { await ev(`(${sel}).focus()`); await send('Input.insertText', { text: texto }); await sleep(150) }
  const elegir = async (sel, valor) => { await ev(`(()=>{const s=${sel};const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(valor)});s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(120) }
  const V = `document.querySelector('[role=dialog][aria-label="Nueva canción"]')`, VD = `document.querySelector('[role=dialog][aria-label="Datos de la canción"]')`
  const ED = t => `document.querySelector('[role=dialog][aria-label=${JSON.stringify(t)}]')`
  const btn = (raiz, txt) => `[...${raiz}.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(txt)}))`
  const tipo = (raiz, nombre) => `[...${raiz}.querySelectorAll('button')].find(b=>b.lastElementChild&&b.lastElementChild.textContent.trim()===${JSON.stringify(nombre)})`
  const campo = (raiz, etq, tag = 'input') => `[...${raiz}.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(etq)}))?.querySelector('${tag}')`
  const escrituras = () => ev(`JSON.stringify(window.__escrituras)`).then(JSON.parse)
  const AREA = t => `${ED(t)}.querySelector('textarea')`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'la lista de canciones'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)

    // ═════ crear y escribir ═════
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), 'ZZ Prueba editor'); await elegir(campo(V, 'Tonalidad original', 'select'), 'F'); await escribir(campo(V, 'BPM'), '72')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(ED('ZZ Prueba editor'), 'el editor de la canción nueva'); await esperar(`${ED('ZZ Prueba editor')}.innerText.includes('Empieza por una parte')`, 'la tarjeta «Empieza por una parte»'); await sleep(300)
    const E = ED('ZZ Prueba editor')
    const cab = JSON.parse(await ev(`(()=>{const e=${E};const bs=[...e.querySelectorAll('button')];const g=bs.find(b=>b.textContent.trim()==='Guardar');const d=bs.find(b=>b.textContent.includes('Datos')&&b.textContent.startsWith('‹'));const dr=d.getBoundingClientRect();
      return JSON.stringify({h2:e.querySelector('h2').textContent,sub:e.querySelector('h2').nextElementSibling.textContent,guardarOff:g.disabled,datosH:Math.round(dr.height),datosW:Math.round(dr.width),textarea:!!e.querySelector('textarea'),barra:!!e.querySelector('[class*="_herr__"]'),barraTexto:!!e.querySelector('[class*="_barraTexto__"]'),tipos:[...e.querySelectorAll('section button')].map(b=>b.lastElementChild.textContent.trim()),botonesH:[...e.querySelectorAll('section button')].map(b=>Math.round(b.getBoundingClientRect().height)),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,cancelar:bs.some(b=>b.textContent.includes('Cancelar'))})})()`))
    ok(cab.h2 === 'ZZ Prueba editor' && cab.sub === 'Tono F · 72 bpm · Editar datos', `${et}: cabecera: «${cab.h2}» y «${cab.sub}»`); ok(!cab.cancelar && cab.datosH >= 44 && cab.datosW >= 44, `${et}: «‹ Datos» en vez de «Cancelar» (${cab.datosW}×${cab.datosH} px)`)
    ok(cab.guardarOff, `${et}: «Guardar» apagado mientras no hay nada escrito`); ok(!cab.textarea && !cab.barra && !cab.barraTexto, `${et}: sin cuadro de texto ni barras de herramientas con el documento vacío`)
    ok(cab.tipos.length === 8 && ['Verso 1', 'Pre-coro', 'Coro', 'Puente', 'Interludio', 'Instrumental', 'Tag', 'Final'].every((n, i) => cab.tipos[i] === n), `${et}: la tarjeta ofrece los ocho tipos (${cab.tipos.join(', ')})`)
    ok(cab.botonesH.every(x => x >= 44), `${et}: los ocho miden ≥ 44 px (${Math.min(...cab.botonesH)})`); ok(cab.sw <= cab.cw, `${et}: sin desplazamiento lateral`); await foto('editor-vacio')
    const col = await ev(`JSON.stringify([...${E}.querySelectorAll('section [data-parte]')].map(s=>getComputedStyle(s).borderTopColor))`).then(JSON.parse)
    ok(new Set(col).size === 8, `${et}: cada tipo tiene su color (${new Set(col).size} distintos)`)

    // ── elegir Verso 1 ──
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(AREA('ZZ Prueba editor'), 'el cuadro de texto')
    ok(await ev(`${AREA('ZZ Prueba editor')}.value==='VERSO 1:\\n'`), `${et}: «Verso 1» agrega «VERSO 1:» al texto`)
    ok(await ev(`(()=>{const a=${AREA('ZZ Prueba editor')};return document.activeElement===a&&a.selectionStart===a.value.length})()`), `${et}: el cursor queda al final, listo para escribir la letra`)
    await send('Input.insertText', { text: 'Primera línea de prueba' }); await sleep(200)
    ok(await ev(`!${E}.innerText.includes('Empieza por una parte')&&!!${E}.querySelector('button[aria-label="Agregar una parte"]')&&![...${E}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar').disabled`), `${et}: ya hay texto: aparecen las herramientas y la tira con su «+», y «Guardar» se enciende`)
    await foto('editor-con-verso')

    // ── «+ Parte» ──
    await tocar('«+» de la tira', `${E}.querySelector('button[aria-label="Agregar una parte"]')`); await esperar(`document.querySelector('[role=dialog][aria-label="Agregar parte"]')`, 'la hoja «Agregar parte»'); await sleep(250)
    const hoja = await ev(`(()=>{const h=document.querySelector('[role=dialog][aria-label="Agregar parte"]');return JSON.stringify({txt:h.innerText.replace(/\\s+/g,' '),tipos:[...h.querySelectorAll('[role=group] button')].map(b=>b.lastElementChild.textContent.trim()),altos:[...h.querySelectorAll('[role=group] button')].map(b=>Math.round(b.getBoundingClientRect().height))})})()`).then(JSON.parse)
    ok(/Ya tienes V1\. La parte nueva recibe el número siguiente\./.test(hoja.txt), `${et}: la hoja dice «Ya tienes V1. La parte nueva recibe el número siguiente.»`)
    ok(hoja.tipos.join('|') === 'Verso 2|Pre-coro|Coro|Puente|Interludio|Instrumental|Tag|Final', `${et}: ofrece «${hoja.tipos.join(', ')}» (el verso ya con su 2)`); ok(hoja.altos.every(x => x >= 44), `${et}: todo mide ≥ 44 px`); await foto('hoja-agregar-parte')
    await tocar('Cerrar la hoja', `document.querySelector('[role=dialog][aria-label="Agregar parte"] button[aria-label="Cerrar"]')`); await sleep(250); ok(await ev(`!document.querySelector('[role=dialog][aria-label="Agregar parte"]')`), `${et}: la X cierra la hoja sin agregar nada`)
    ok(await ev(`${AREA('ZZ Prueba editor')}.value==='VERSO 1:\\nPrimera línea de prueba'`), `${et}: el texto quedó igual`)
    await tocar('«+» de la tira (otra vez)', `${E}.querySelector('button[aria-label="Agregar una parte"]')`); await esperar(`document.querySelector('[role=dialog][aria-label="Agregar parte"]')`, 'la hoja'); await tocar('Coro', `[...document.querySelectorAll('[role=dialog][aria-label="Agregar parte"] [role=group] button')].find(b=>b.lastElementChild.textContent.trim()==='Coro')`); await sleep(300)
    ok(await ev(`${AREA('ZZ Prueba editor')}.value==='VERSO 1:\\nPrimera línea de prueba\\n\\nCORO:\\n'`), `${et}: «Coro» se agrega AL FINAL, con una línea vacía de por medio`); ok(await ev(`!document.querySelector('[role=dialog][aria-label="Agregar parte"]')`), `${et}: elegir cierra la hoja`)
    await send('Input.insertText', { text: 'Línea del coro' }); await sleep(200)
    await tocar('«+» de la tira (3)', `${E}.querySelector('button[aria-label="Agregar una parte"]')`); await esperar(`document.querySelector('[role=dialog][aria-label="Agregar parte"]')`, 'la hoja'); const h2 = await ev(`document.querySelector('[role=dialog][aria-label="Agregar parte"]').innerText.replace(/\\s+/g,' ')`)
    ok(/Ya tienes V1 y C\./.test(h2) && /Coro 2/.test(h2) && /Verso 2/.test(h2), `${et}: con verso y coro, la hoja ofrece «Verso 2» y «Coro 2» («${h2.slice(0, 70)}»)`)
    await tocar('Verso 2', `[...document.querySelectorAll('[role=dialog][aria-label="Agregar parte"] [role=group] button')].find(b=>b.lastElementChild.textContent.trim()==='Verso 2')`); await sleep(300)
    ok(await ev(`${AREA('ZZ Prueba editor')}.value.endsWith('\\n\\nVERSO 2:\\n')`), `${et}: «Verso 2» al final`)
    await send('Input.insertText', { text: 'Segundo verso de prueba' }); await sleep(200)

    // ── a la vista de acordes y Guardar: sin resumen, una petición ──
    await tocar('volver a Acordes', `[...${E}.querySelectorAll('button')].find(b=>/Acordes/.test(b.textContent)&&b.className.includes('modoTexto'))`); await esperar(`${E}.querySelectorAll('[data-fin]').length>=3`, 'las líneas del modo Acordes'); await foto('editor-acordes')
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    ok(await ev(`!document.querySelector('[role=alertdialog]')`), `${et}: el primer guardado de una canción nueva NO pide resumen`)
    const posts = await ev(`JSON.stringify(window.__posts)`).then(JSON.parse), b = posts[0]
    ok(posts.length === 1 && b.songId === '33333333-3333-4333-8333-333333333333' && b.tono === 'F' && b.letra === 'VERSO 1:\nPrimera línea de prueba\n\nCORO:\nLínea del coro\n\nVERSO 2:\nSegundo verso de prueba', `${et}: UNA petición con el texto escrito y el tono F`)
    ok(JSON.stringify(b.secciones.map(s => [s.codigo, s.nombre])) === JSON.stringify([['V1', 'VERSO 1'], ['C', 'CORO'], ['V2', 'VERSO 2']]), `${et}: secciones V1, C, V2 con sus códigos`)
    await esperar(`!${E}`, 'que el editor se cierre tras guardar'); ok(true, `${et}: tras guardar, el editor se cierra`)

    // ═════ «‹ Datos» de un borrador ═════
    await tocar('canción «ZZ Borrador de prueba»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador de prueba'))`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); await esperar(`${ED('ZZ Borrador de prueba')}&&${ED('ZZ Borrador de prueba')}.innerText.includes('Empieza por una parte')`, 'el editor del borrador'); await sleep(300)
    const E2 = ED('ZZ Borrador de prueba')
    ok(await ev(`${E2}.querySelector('h2').nextElementSibling.textContent==='Tono D · 70 bpm · Editar datos'`), `${et}: un borrador sin letra abre el editor en su versión «nueva» (Tono D · 70 bpm)`)
    // con cambios sin guardar: pregunta
    await tocar('Verso 1 (borrador)', tipo(`${E2}.querySelector('section')`, 'Verso 1')); await send('Input.insertText', { text: 'Texto sin guardar' }); await sleep(200)
    await tocar('‹ Datos (con cambios)', btn(E2, '‹ Datos')); await esperar(`document.querySelector('[role=alertdialog]')`, 'el aviso de descartar'); ok(await ev(`document.querySelector('[role=alertdialog]').innerText.includes('¿Descartar los cambios?')`), `${et}: con texto sin guardar, «‹ Datos» pregunta «¿Descartar los cambios?»`)
    await tocar('Seguir editando', `[...document.querySelectorAll('[role=alertdialog] button')].find(b=>/Seguir editando/.test(b.textContent))`); await sleep(250); ok(await ev(`${AREA('ZZ Borrador de prueba')}.value.includes('Texto sin guardar')&&!document.querySelector('[role=alertdialog]')`), `${et}: «Seguir editando» conserva el texto`)
    await tocar('‹ Datos (otra vez)', btn(E2, '‹ Datos')); await esperar(`document.querySelector('[role=alertdialog]')`, 'el aviso'); await tocar('Descartar', `[...document.querySelectorAll('[role=alertdialog] button')].find(b=>/^Descartar$/.test(b.textContent.trim()))`)
    await esperar(VD, 'la ventana «Datos de la canción»'); await sleep(250)
    const dd = JSON.parse(await ev(`(()=>{const v=${VD};return JSON.stringify({nombre:${campo(VD, 'Título')}.value,tono:${campo(VD, 'Tonalidad original', 'select')}.value,bpm:${campo(VD, 'BPM')}.value,artista:${campo(VD, 'Artista')}.value,botones:[...v.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>/Guardar|Solo/.test(t)),editor:!!${E2}})})()`))
    ok(dd.nombre === 'ZZ Borrador de prueba' && dd.tono === 'D' && dd.bpm === '70' && dd.artista === 'Grupo Inventado' && !dd.editor, `${et}: «Descartar» cierra el editor y abre los datos de esa canción, ya llenos (${dd.nombre}, ${dd.tono}, ${dd.bpm})`)
    ok(dd.botones.join('|') === 'Guardar y escribir la letra|Solo guardar los datos', `${et}: los botones dicen «${dd.botones.join('» y «')}»`); await foto('datos-de-la-cancion')
    await ev(`(()=>{const e=${campo(VD, 'Artista')};e.select()})()`); await send('Input.insertText', { text: 'Otro Artista' }); await sleep(150)
    const antes = (await escrituras()).length
    await tocar('Solo guardar los datos', btn(VD, 'Solo guardar')); await esperar(`!${VD}`, 'que se cierre la ventana de datos'); await sleep(250)
    const e = await escrituras(), u = e[e.length - 1]
    ok(e.length === antes + 1 && u.m === 'PATCH' && u.q.includes(BORRADOR_ID), `${et}: «Solo guardar los datos» envía UN update sobre esa canción (no crea otra)`)
    ok(u.b.artista === 'Otro Artista' && u.b.tono_original === 'D' && u.b.bpm === 70 && !('letra' in u.b) && !('publicada' in u.b), `${et}: el update trae los datos y NUNCA la letra ni publicada`)
    ok(await ev(`!${ED('ZZ Borrador de prueba')}`), `${et}: no se abre el editor`)
    const todas = await escrituras(); if (process.env.DEPURAR) console.log('DEPURAR', JSON.stringify(todas.map(x => [x.m, x.otra || x.q]))); ok(todas.filter(x => x.m === 'POST').length === 1 && todas.filter(x => x.m === 'PATCH').length === 1 && todas.every(x => !x.otra), `${et}: en toda la prueba: un insert, un update y ninguna otra escritura`)
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
