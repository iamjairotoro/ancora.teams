// Uso (con la app construida y servida, ver LEEME.md): BASE=http://127.0.0.1:3168 node tests/e2e-menus/editor-acordes-comportamiento.js
// Comportamiento real del editor en un navegador: toca entre dos letras, elige un acorde, comprueba dónde quedó, Deshacer, que NO haya peticiones antes de Guardar y el cuerpo exacto que se envía.
const { lanzar, sleep } = require('./cdp.js'), M = require('./inv5-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const WRAP = `(()=>{const f=window.fetch.bind(window);window.__posts=[];window.__gets=0;window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));if(u.startsWith('/api/admin/canciones/acordes')){if(((o&&o.method)||'GET').toUpperCase()==='POST')window.__posts.push(JSON.parse(o.body));else window.__gets++}return f(i,o)}})()`
// La línea se parte por palabra (LineaConAcordes): se vuelve a juntar en los trozos de cada acorde (cada acorde abre uno), que es lo que se guarda.
const SEG_JS = `window.SEG=l=>{const r=[];for(const t of l.querySelectorAll('[data-ini]')){const a=t.parentElement.querySelector('[data-ac]');if(a||!r.length)r.push([t.textContent,a?a.textContent:'']);else r[r.length-1][0]+=t.textContent}return r}`
const out = []; const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) process.exitCode = 1 }
;(async () => { const c = await lanzar(9526), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: WRAP }); await send('Page.addScriptToEvaluateOnNewDocument', { source: SEG_JS }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`)
  await send('Page.navigate', { url: B + '/admin?tab=canciones' }); await sleep(3000)
  const click = js => ev(js); const esperar = ms => sleep(ms)
  await click(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él').click()`); await esperar(800)
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes').click()`); await esperar(1500)
  ok(await ev(`!!document.querySelector('textarea')`), 'el editor abre en modo Letra con el texto')
  ok((await ev(`window.__gets`)) === 1 && (await ev(`window.__posts.length`)) === 0, 'una lectura al abrir y ninguna escritura')
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Acordes').click()`); await esperar(500)
  const cuenta = () => ev(`document.querySelectorAll('[data-ac]').length`)
  ok((await cuenta()) === 7, 'se ven los 7 acordes de las líneas de letra')
  // tocar entre «vestid» y «o» (carácter 6 de la línea)
  await click(`(()=>{const t=[...document.querySelectorAll('span')].filter(e=>e.dataset.ini).find(e=>e.textContent.startsWith('vestido'));const r=t.getBoundingClientRect();const ch=r.width/t.textContent.length;t.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+ch*6.1,clientY:r.top+r.height/2}))})()`); await esperar(500)
  const caret = await ev(`(()=>{const e=document.querySelector('[data-sel="1"]');if(!e)return null;const t=e.querySelector('[data-ini]');return {ini:+t.dataset.ini,len:+t.dataset.len,previo:e.previousElementSibling?e.previousElementSibling.querySelector('[data-ini]').textContent:null}})()`)
  ok(caret && caret.previo === 'vestid' && /^o $/.test(await ev(`document.querySelector('[data-sel="1"] [data-ini]').textContent`)), 'el cursor quedó entre «vestid» y «o»: ' + JSON.stringify(caret))
  ok(await ev(`!!document.querySelector('[role=dialog][aria-label="Acordes en G"]')`), 'se abre la paleta «Acordes en G»')
  await click(`[...document.querySelectorAll('[aria-label="Acordes en G"] button')].find(b=>b.textContent.startsWith('Em')).click()`); await esperar(400)
  ok((await cuenta()) === 8, 'ahora hay 8 acordes')
  const linea = await ev(`JSON.stringify([...document.querySelectorAll('[data-fin]')].filter(l=>l.textContent.includes('vestid')).map(l=>SEG(l)))`)
  ok(JSON.parse(linea)[0].map(x => x.join('/')).join('|') === 'vestid/C|o en /Em|majestad/G', 'la línea quedó vestid/C | o en /Em | majestad/G: ' + linea)
  ok((await ev(`window.__posts.length`)) === 0, 'sigue sin haber ninguna escritura')
  // modificador 7 sobre el acorde elegido, y Deshacer
  await click(`[...document.querySelectorAll('[aria-label="Acordes en G"] button')].find(b=>b.textContent.trim()==='7').click()`); await esperar(300)
  ok(await ev(`[...document.querySelectorAll('[data-ac]')].some(e=>e.textContent==='Em7')`), 'el modificador 7 deja Em7')
  await click(`document.querySelector('[aria-label="Deshacer"]').click()`); await esperar(300)
  ok(await ev(`[...document.querySelectorAll('[data-ac]')].some(e=>e.textContent==='Em')&&![...document.querySelectorAll('[data-ac]')].some(e=>e.textContent==='Em7')`), 'Deshacer vuelve a Em')
  await click(`document.querySelector('[aria-label="Deshacer"]').click()`); await esperar(300); ok((await cuenta()) === 7, 'otro Deshacer quita el acorde puesto: vuelve a 7')
  await click(`document.querySelector('[aria-label="Rehacer"]').click()`); await esperar(300); ok((await cuenta()) === 8, 'Rehacer lo vuelve a poner')
  // escribir en el modo Letra con un teclado de verdad (Input.insertText): el acorde sigue a su letra
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Letra').click()`); await esperar(400)
  await ev(`(()=>{const a=document.querySelector('textarea');a.focus();const i=a.value.indexOf('de un rey');a.setSelectionRange(i,i)})()`)
  await send('Input.insertText', { text: 'XX' }); await esperar(400)
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Acordes').click()`); await esperar(500)
  const l1 = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[data-fin]')].filter(l=>l.textContent.includes('esplendor')).map(l=>SEG(l)))`))[0]
  ok(l1.map(x => x.join('/')).join('|') === 'El esplendor XX/G|de un rey/D', 'escribir «XX» justo donde está el acorde D lo corre con «de»: ' + JSON.stringify(l1))
  ok((await cuenta()) === 8, 'escribir no pierde acordes')
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Letra').click()`); await esperar(300)
  await ev(`(()=>{const a=document.querySelector('textarea');a.focus();const i=a.value.indexOf('vestido en majestad');a.setSelectionRange(i,i+19)})()`)
  await send('Input.insertText', { text: 'H' }); await esperar(400)
  ok(await ev(`document.body.textContent.includes('Se quitaron 2 acordes')`), 'reemplazar una línea que tiene tres acordes (uno es el recién puesto) por una sola letra conserva uno y avisa «Se quitaron 2 acordes»')
  await click(`document.querySelector('[aria-label="Deshacer"]').click()`); await esperar(300)
  ok(await ev(`document.querySelector('textarea').value.includes('vestido en majestad')`), 'Deshacer recupera el texto de la línea')
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Acordes').click()`); await esperar(500)
  ok((await cuenta()) === 8, 'y recupera los acordes de esa línea: vuelve a 8')
  // cancelar con cambios pregunta
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Cancelar')).click()`); await esperar(300)
  ok(await ev(`document.body.textContent.includes('¿Descartar los cambios?')`), 'Cancelar con cambios pregunta si se descartan')
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Seguir editando').click()`); await esperar(300)
  ok((await ev(`window.__posts.length`)) === 0, 'seguir editando no escribe nada')
  // Guardar: UNA petición con lo esperado
  await click(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar').click()`); await esperar(1200)
  const posts = JSON.parse(await ev(`JSON.stringify(window.__posts)`))
  ok(posts.length === 1, 'Guardar envía UNA sola petición')
  const p = posts[0] || {}
  ok(p.tono === 'G' && /^a{32}$/.test(p.base) && Object.keys(p).sort().join() === 'base,letra,secciones,songId,tono', 'el cuerpo trae songId, tono, letra, secciones y la huella, y nada más')
  const l2 = p.secciones && p.secciones[0].lineas[1]
  ok(l2 && JSON.stringify(l2.segments.map(s => [s.text, s.acorde && s.acorde.g + s.acorde.cal])) === JSON.stringify([['vestid', '4'], ['o en ', '6m'], ['majestad', '1']]), 'el acorde nuevo viaja como grado 6m en su lugar: ' + JSON.stringify(l2))
  ok(p.secciones && p.secciones[0].lineas[2].kind === 'bars' && p.secciones[0].lineas[2].items.length === 3, 'el interludio viaja como compás con 3 elementos')
  console.log(out.join('\n')); await c.cerrar(); process.exit(process.exitCode || 0) })().catch(e => { console.error(e); process.exit(1) })
