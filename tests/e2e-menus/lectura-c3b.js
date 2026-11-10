// Lectura con acordes · C3b (hoja «Preferencias») en un navegador REAL (Chrome por CDP). Servidor simulado en la página; datos INVENTADOS.
// Qué comprueba: «Ajustes» abre la hoja; sus filas y botones miden ≥ 44 px y caben en pantalla; Vista de canción (Ambos / Acordes / Letras) oculta lo que debe; Notación (Americano / Números) cambia los acordes;
// «Detalles de la canción» oculta y muestra la cabecera; «Vista compacta» junta las secciones; «Fuente y tamaño» abre la tipografía de siempre; cada cambio viaja como UN parche con la clave justa a /api/portal/preferencias
// (y nada más); al recargar, las preferencias siguen. A 390 y 360 px, claro y oscuro; guarda las capturas.
// Uso: construir.sh 3168  →  SOLO="390 dark" BASE=http://127.0.0.1:3168 node tests/e2e-menus/lectura-c3b.js <carpeta-de-capturas>      (sin SOLO corre las cuatro combinaciones en un proceso cada una: usar el bucle de LEEME.md)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/lectura-c3b'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const A = (g, cal = '') => ({ g, cal })
const ly = (a, ga, b, gb) => ({ kind: 'lyric', segments: [{ text: a, acorde: A(ga) }, { text: b, acorde: A(gb) }] })
const ACORDES = { tono: 'G', secciones: [
  { code: 'V1', name: 'Verso 1', repeat: 1, lineas: [ly('Línea de prueba ', 1, 'número uno de la parte', 5), ly('Otra línea de prueba ', 4, 'que sigue aquí mismo', 5)] },
  { code: 'INT', name: 'Interludio', repeat: 1, lineas: [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(6, 'm') }, { acorde: A(4) }, { acorde: A(5) }] }] },
  { code: 'C', name: 'Coro', repeat: 1, lineas: [ly('Coro de prueba ', 1, 'con su letra', 4), ly('Y otra línea del coro ', 5, 'de prueba', 1)] },
] }
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__patches=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}});
const guardada=()=>{try{return JSON.parse(localStorage.getItem('__lectura')||'{}')}catch(e){return {}}};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();
if(u.startsWith('/api/portal/preferencias')&&m==='PATCH'){const b=JSON.parse(o.body);window.__patches.push(b);try{localStorage.setItem('__lectura',JSON.stringify({...guardada(),...(b.lectura||{})}))}catch(e){}return j({ok:true})}
const r=await f(i,o);
if(u.startsWith('/api/portal/preferencias')&&m==='GET'){let d={};try{d=await r.clone().json()}catch(e){d={}};d.lectura={notation:'americano',vista:'ambos',compacta:false,detalles:true,...guardada()};return j(d)}
if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(ACORDES)};return j(d)}
return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9585), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,160)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) }; await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const tocar = async (nombre, buscar) => {
    await esperar(buscar, nombre); paso = `tocar «${nombre}»`
    await ev(`(${buscar}).scrollIntoView({block:'nearest'})`); await sleep(80)
    const r = JSON.parse(await ev(`(()=>{const r=(${buscar}).getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`))
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250)
  }
  const AJUSTES = `document.querySelector('button[aria-label="Ajustes"]')`, HOJA = `document.querySelector('[role=dialog][aria-labelledby="prefs-titulo"]')`
  const radio = n => `[...document.querySelectorAll('[role=radio]')].find(b=>b.textContent.trim()==='${n}')`
  const interr = n => `[...document.querySelectorAll('[role=switch]')].find(b=>b.textContent.includes('${n}'))`
  const abrir = async () => { await tocar('Ajustes', AJUSTES); await esperar(HOJA, 'la hoja de Preferencias'); await sleep(350) }
  const cerrar = async () => { await tocar('Cerrar', `${HOJA}.querySelector('button[aria-label="Cerrar"]')`); await esperar(`!${HOJA}`, 'la hoja cerrada'); await sleep(250) }
  const abrirCancion = async () => {          // al recargar, el portal puede volver a la lista de Canciones o seguir en la canción: se atiende lo que haya
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    const BTN = `(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.childElementCount===0&&x.textContent.trim()==='Cuán grande es Él');return e&&(e.closest('button')||e)})()`
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')||${BTN}`, 'la canción o su lista')
    if (!(await ev(`!!document.querySelector('ul[aria-label="Partes de la canción"]')`))) await ev(`${BTN}.click()`)
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(350)
  }
  const visible = sel => `[...document.querySelectorAll('${sel}')].filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0)`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`); await abrirCancion()

    // ── la hoja ──
    await abrir()
    const hoja = JSON.parse(await ev(`(()=>{const h=${HOJA},r=h.getBoundingClientRect();return JSON.stringify({l:r.left,r:r.right,t:r.top,b:r.bottom,W:innerWidth,H:innerHeight,tit:h.querySelector('#prefs-titulo').textContent,
      radios:[...h.querySelectorAll('[role=radio]')].map(b=>[b.textContent.trim(),b.getAttribute('aria-checked'),Math.round(b.getBoundingClientRect().height)]),
      sw:[...h.querySelectorAll('[role=switch]')].map(b=>[b.textContent.replace(/\\s+/g,' ').trim(),b.getAttribute('aria-checked'),Math.round(b.getBoundingClientRect().height)]),
      filas:[...h.querySelectorAll('button[aria-haspopup=dialog]')].map(b=>[b.textContent.trim(),Math.round(b.getBoundingClientRect().height)]),
      sel:[...h.querySelectorAll('select')].map(s=>[s.value,Math.round(s.getBoundingClientRect().height),getComputedStyle(s).fontSize]),txt:h.textContent})})()`))
    ok(hoja.tit === 'Preferencias' && hoja.l >= 0 && hoja.r <= hoja.W && hoja.b <= hoja.H + 1, `${et}: la hoja «${hoja.tit}» cabe en la pantalla (${Math.round(hoja.l)}–${Math.round(hoja.r)} de ${hoja.W})`)
    ok(hoja.radios.map(x => x[0]).join() === 'Ambos,Acordes,Letras' && hoja.radios[0][1] === 'true', `${et}: Vista de canción: ${hoja.radios.map(x => x[0] + (x[1] === 'true' ? '✓' : '')).join(' · ')}`)
    ok(hoja.sw.length === 2 && hoja.sw[0][1] === 'true' && hoja.sw[1][1] === 'false' && /Detalles de la canción/.test(hoja.sw[0][0]) && /Vista compacta/.test(hoja.sw[1][0]), `${et}: «Detalles» encendido y «Vista compacta» apagada por omisión`)
    ok(/seguidas, sin separar/.test(hoja.sw[1][0]), `${et}: la vista compacta trae su ayuda`); ok(!/Exportar/i.test(hoja.txt), `${et}: no hay «Exportar canción»`)
    ok([...hoja.radios.map(x => x[2]), ...hoja.sw.map(x => x[2]), ...hoja.filas.map(x => x[1]), ...hoja.sel.map(x => x[1])].every(h => h >= 44), `${et}: todas las filas y botones miden ≥ 44 px (${[...hoja.radios.map(x => x[2]), ...hoja.sw.map(x => x[2]), ...hoja.filas.map(x => x[1]), ...hoja.sel.map(x => x[1])].join(' ')})`)
    ok(hoja.sel[0][0] === 'americano' && hoja.sel[0][2] === '16px', `${et}: el selector de notación (americano) usa 16 px de letra`)
    await foto('preferencias')

    // ── vista de canción ──
    await tocar('Acordes', radio('Acordes')); await esperar(`${radio('Acordes')}.getAttribute('aria-checked')==='true'`, 'Acordes marcado')
    await cerrar()
    ok((await ev(`${visible('[data-t]')}.length`)) === 0 && (await ev(`${visible('[data-a]')}.length`)) >= 6, `${et}: «Acordes» oculta la letra y deja los acordes`)
    await foto('vista-acordes')
    await abrir(); await tocar('Letras', radio('Letras')); await cerrar()
    ok((await ev(`${visible('[data-a]')}.length`)) === 0 && (await ev(`${visible('[data-t]')}.length`)) >= 6, `${et}: «Letras» oculta los acordes y deja la letra`)
    ok(!(await ev(`${visible('p[class*=compas]')}.length`)), `${et}: «Letras» también oculta el interludio (solo acordes)`)
    await foto('vista-letras')
    await abrir(); await tocar('Ambos', radio('Ambos')); await cerrar()
    ok((await ev(`${visible('[data-a]')}.length`)) >= 6 && (await ev(`${visible('[data-t]')}.length`)) >= 6, `${et}: «Ambos» vuelve a mostrar las dos cosas`)

    // ── notación ──
    await abrir(); await ev(`(()=>{const s=${HOJA}.querySelector('select');s.value='numeros';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(300)
    ok((await ev(`${HOJA}.querySelector('select').value`)) === 'numeros' && /Números/.test(await ev(`${HOJA}.textContent`)), `${et}: el selector muestra «Números»`)
    await cerrar()
    const acs = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[data-a]')].map(e=>e.textContent.trim()).filter(Boolean))`))
    ok(acs.length >= 6 && acs.slice(0, 2).join() === '1,5', `${et}: «Números» cambia los acordes a grados (${acs.slice(0, 8).join(' ')})`)
    await foto('notacion-numeros')
    await abrir(); await ev(`(()=>{const s=${HOJA}.querySelector('select');s.value='americano';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(250); await cerrar()
    ok((await ev(`[...document.querySelectorAll('[data-a]')].map(e=>e.textContent.trim()).filter(Boolean)[0]`)) === 'G', `${et}: «Americano» vuelve a las letras`)

    // ── detalles ──
    ok(await ev(`!!document.querySelector('header h1')`), `${et}: con «Detalles» encendido hay cabecera`)
    await abrir(); await tocar('Detalles de la canción', interr('Detalles')); await esperar(`${interr('Detalles')}.getAttribute('aria-checked')==='false'`, 'detalles apagado'); await cerrar()
    ok(!(await ev(`!!document.querySelector('header h1')`)) && !(await ev(`!!document.querySelector('header')`)), `${et}: apagado, la cabecera (título, subtítulo y créditos) desaparece`)
    ok(await ev(`!!document.querySelector('ul[aria-label="Partes de la canción"]')`), `${et}: la tira de partes sigue`)
    await foto('sin-detalles')
    await abrir(); await tocar('Detalles de la canción', interr('Detalles')); await cerrar()
    ok(await ev(`!!document.querySelector('header h1')`), `${et}: encendido otra vez, vuelve la cabecera`)

    // ── vista compacta ──
    const medida = () => ev(`(()=>{const a=document.getElementById('parte-0').getBoundingClientRect(),b=document.getElementById('parte-1').getBoundingClientRect(),t=getComputedStyle(document.querySelector('#parte-0 [class*=tarjeta]'));return JSON.stringify({sep:Math.round(b.top-a.bottom),pad:parseFloat(t.paddingTop),alto:Math.round(a.height)})})()`).then(JSON.parse)
    const normal = await medida()
    await abrir(); await tocar('Vista compacta', interr('Vista compacta')); await esperar(`${interr('Vista compacta')}.getAttribute('aria-checked')==='true'`, 'compacta encendida'); await cerrar()
    const comp = await medida()
    ok(comp.sep < normal.sep && comp.pad < normal.pad && comp.alto < normal.alto, `${et}: «Vista compacta» junta las secciones (separación ${normal.sep}→${comp.sep} px, relleno ${normal.pad}→${comp.pad} px, alto ${normal.alto}→${comp.alto} px)`)
    await foto('compacta')

    // ── fuente y tamaño (la pantalla propia se prueba en lectura-c3c.js; aquí, que la fila lleva a ella y se vuelve) ──
    await abrir(); await tocar('Fuente y tamaño', `[...${HOJA}.querySelectorAll('button')].find(b=>b.textContent.includes('Fuente y tamaño'))`)
    await esperar(`document.querySelector('#prefs-titulo')&&document.querySelector('#prefs-titulo').textContent==='Ajustes de fuente'`, 'la pantalla de fuente')
    ok(true, `${et}: «Fuente y tamaño» abre «Ajustes de fuente» dentro de la misma hoja`)
    await tocar('Volver a Preferencias', `${HOJA}.querySelector('button[aria-label="Volver a Preferencias"]')`); await esperar(`document.querySelector('#prefs-titulo')&&document.querySelector('#prefs-titulo').textContent==='Preferencias'`, 'de vuelta en Preferencias')
    ok(true, `${et}: la flecha vuelve a «Preferencias»`)
    await cerrar()

    // ── los parches ──
    const parches = JSON.parse(await ev(`JSON.stringify(window.__patches)`))
    const esperados = [{ lectura: { vista: 'acordes' } }, { lectura: { vista: 'letras' } }, { lectura: { vista: 'ambos' } }, { lectura: { notation: 'numeros' } }, { lectura: { notation: 'americano' } }, { lectura: { detalles: false } }, { lectura: { detalles: true } }, { lectura: { compacta: true } }]
    ok(JSON.stringify(parches) === JSON.stringify(esperados), `${et}: cada cambio viajó como UN parche con su clave (${parches.map(p => JSON.stringify(p.lectura)).join(' ')})`)

    // ── persistencia: otra vez desde cero ──
    await abrir(); await tocar('Acordes', radio('Acordes')); await ev(`(()=>{const s=${HOJA}.querySelector('select');s.value='numeros';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(200)
    await tocar('Detalles de la canción', interr('Detalles')); await cerrar()
    await abrirCancion()
    ok(!(await ev(`!!document.querySelector('header')`)) && (await ev(`${visible('[data-t]')}.length`)) === 0 && (await ev(`[...document.querySelectorAll('[data-a]')].map(e=>e.textContent.trim()).filter(Boolean)[0]`)) === '1', `${et}: al recargar siguen: sin cabecera, solo acordes y en números`)
    await abrir()
    const est = JSON.parse(await ev(`JSON.stringify({r:[...document.querySelectorAll('[role=radio]')].map(b=>b.getAttribute('aria-checked')),s:[...document.querySelectorAll('[role=switch]')].map(b=>b.getAttribute('aria-checked')),n:${HOJA}.querySelector('select').value})`))
    ok(est.r.join() === 'false,true,false' && est.s.join() === 'false,true' && est.n === 'numeros', `${et}: la hoja refleja lo guardado (vista ${est.r.join('/')}, interruptores ${est.s.join('/')}, notación ${est.n})`)
    ok((await ev(`document.documentElement.scrollWidth`)) <= ancho, `${et}: la pantalla no se desliza de lado`)
    await foto('preferencias-guardadas')
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
