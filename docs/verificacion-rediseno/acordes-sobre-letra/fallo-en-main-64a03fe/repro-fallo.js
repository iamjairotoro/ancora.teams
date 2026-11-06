// Reproduce el fallo: ancla al final de línea y frase larga partida en dos filas, en el EDITOR y en la LECTURA. Solo lee/dibuja; no guarda nada.
const R = '/Users/ancoravisuales/Documents/GitHub/ancora.teams/tests/e2e-menus/', { lanzar, sleep } = require(R + 'cdp.js'), B = 'http://127.0.0.1:3168'
const fs = require('fs'), OUT = process.argv[2] || '/tmp/repro', ANCHO = +(process.argv[3] || 390), TEMA = process.argv[4] || 'light'
fs.mkdirSync(OUT, { recursive: true })
const T2 = 'Señor de toda la tierra y de todo el cielo, rey de reyes y Señor de señores para siempre ', LARGA = 'Cuán grande es nuestro Dios, ' + T2 + 'amén'
const a = (g, cal) => ({ g, cal: cal || '' })
const PARCHE_EDITOR = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/admin/canciones/acordes')&&((o&&o.method)||'GET').toUpperCase()==='GET'){const d=await r.clone().json();d.cancion.letra='VERSO 1:\\nEl esplendor de un rey\\n${LARGA}\\n\\nCORO:\\nCuán grande es Él';d.cancion.secciones=[[{kind:'lyric',segments:[{text:'El esplendor de un rey',acorde:null}]},{kind:'lyric',segments:[{text:'Cuán grande es nuestro Dios, ',acorde:{g:1,cal:''}},{text:'${T2}',acorde:{g:5,cal:''}},{text:'amén',acorde:{g:1,cal:''}}]}],[{kind:'lyric',segments:[{text:'Cuán grande es Él',acorde:null}]}]];return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
const PARCHE_LECTURA = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();const A=(g)=>({g,cal:''});d.acordes={tono:'G',secciones:[{code:'V1',name:'Verso 1',repeat:1,lineas:[{kind:'lyric',segments:[{text:'El esplendor de un rey'},{text:'',acorde:A(1)}]},{kind:'lyric',segments:[{text:'Cuán grande es nuestro Dios, ',acorde:A(4)},{text:'${T2}',acorde:A(5)},{text:'amén',acorde:A(1)}]}]}]};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
;(async () => {
  for (const modo of ['editor', 'lectura']) {
    const M = modo === 'editor' ? require(R + 'inv5-mock.js') : require(R + 'portal-mock.js'), c = await lanzar(9530 + (modo === 'editor' ? 0 : 1)), { send, ev } = c
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: modo === 'editor' ? PARCHE_EDITOR : PARCHE_LECTURA }); await send('Network.enable')
    if (modo === 'editor') await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 2, mobile: true })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: TEMA }] })
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    if (modo === 'editor') {
      await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`)
      await send('Page.navigate', { url: B + '/admin?tab=canciones' }); await sleep(3000)
      await ev(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él').click()`); await sleep(800)
      await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes').click()`); await sleep(1500)
      await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Acordes').click()`); await sleep(600)
      // tocar al FINAL de la 1.ª línea (a la derecha del texto) y poner Em
      await ev(`(()=>{const t=[...document.querySelectorAll('[data-fin]')].find(l=>l.textContent.includes('esplendor'));const r=t.getBoundingClientRect();t.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.right-2,clientY:r.top+r.height-4}))})()`); await sleep(400)
      await ev(`[...document.querySelectorAll('[aria-label="Acordes en G"] button')].find(b=>b.textContent.startsWith('Em')).click()`); await sleep(400)
      await ev(`[...document.querySelectorAll('[aria-label="Acordes en G"] button')].find(b=>/^OK|Cerrar/.test(b.textContent.trim())||b.getAttribute('aria-label')==='Cerrar')?.click()`); await sleep(400)
    } else {
      await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`)
      await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3000)
      await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`); await sleep(1800)
    }
    const medida = await ev(`JSON.stringify([...document.querySelectorAll('${modo === 'editor' ? '[data-fin]' : 'p[class*=linea]'}')].map(l=>{const lr=l.getBoundingClientRect();return {txt:l.textContent.slice(0,40),h:Math.round(lr.height),acordes:[...l.querySelectorAll('${modo === 'editor' ? '[data-ac]' : 'span[class*=ac]'}')].filter(x=>x.textContent.trim()).map(x=>{const r=x.getBoundingClientRect();const t=x.parentElement.querySelector('[class*=tx]');const tr=t.getBoundingClientRect();return {ac:x.textContent,acArriba:Math.round(r.bottom<=tr.top+1?1:0),acTop:Math.round(r.top-lr.top),txTop:Math.round(tr.top-lr.top),txVacio:t.textContent===''}})}}))`)
    console.log(modo, ANCHO, TEMA, medida)
    const shot = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${modo}-${ANCHO}-${TEMA}.png`, Buffer.from(shot.data, 'base64'))
    await c.cerrar()
  }
  process.exit(0)
})().catch(e => { console.error(e); process.exit(1) })
