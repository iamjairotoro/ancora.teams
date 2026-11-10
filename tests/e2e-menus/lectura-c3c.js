// Lectura con acordes · C3c (pantalla «Ajustes de fuente») en un navegador REAL (Chrome por CDP). Servidor simulado en la página; datos INVENTADOS.
// Qué comprueba: «Fuente y tamaño» abre «Ajustes de fuente» dentro de la hoja; la vista previa cambia al instante con el tamaño y la fuente; «−» y «+» recorren los cuatro pasos (14, 16, 19 y 22 px) y se apagan en los extremos;
// el selector ofrece La app, Arial, Georgia y Mono; la letra de la canción cambia de verdad (tamaño y fuente medidos con getComputedStyle); cada cambio viaja como UN parche {letra:{…}}; al recargar, lo elegido sigue;
// no hay pesos ni colores; todo mide ≥ 44 px y cabe en pantalla. A 390 y 360 px, claro y oscuro; guarda las capturas.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-c3c.js <carpeta-de-capturas>
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/lectura-c3c'
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
const guardada=()=>{try{return JSON.parse(localStorage.getItem('__lectura')||'{}')}catch(e){return {}}};const guardadaLetra=()=>{try{return JSON.parse(localStorage.getItem('__letra')||'{}')}catch(e){return {}}};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();
if(u.startsWith('/api/portal/preferencias')&&m==='PATCH'){const b=JSON.parse(o.body);window.__patches.push(b);try{if(b.lectura)localStorage.setItem('__lectura',JSON.stringify({...guardada(),...b.lectura}));if(b.letra)localStorage.setItem('__letra',JSON.stringify({...guardadaLetra(),...b.letra}))}catch(e){}return j({ok:true})}
const r=await f(i,o);
if(u.startsWith('/api/portal/preferencias')&&m==='GET'){let d={};try{d=await r.clone().json()}catch(e){d={}};d.lectura={notation:'americano',vista:'ambos',compacta:false,detalles:true,...guardada()};d.letra={fontFamily:"ui-rounded, -apple-system, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif",textScale:1,lineHeightWide:false,...guardadaLetra()};return j(d)}
if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(ACORDES)};return j(d)}
return r}})()`

const SIZE = [0.875, 1, 1.1875, 1.375]
const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }
const GEORGIA = "Georgia, 'Times New Roman', serif"

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9586), { send, ev } = c
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
  const AJUSTES = `document.querySelector('button[aria-label="Ajustes"]')`, HOJA = `document.querySelector('[role=dialog][aria-labelledby="prefs-titulo"]')`
  const TIT = `(document.querySelector('#prefs-titulo')||{}).textContent`
  const abrirFuente = async () => { await tocar('Ajustes', AJUSTES); await esperar(HOJA, 'la hoja'); await sleep(300); await tocar('Fuente y tamaño', `[...${HOJA}.querySelectorAll('button')].find(b=>b.textContent.includes('Fuente y tamaño'))`); await esperar(`${TIT}==='Ajustes de fuente'`, 'Ajustes de fuente'); await sleep(250) }
  const cerrarTodo = async () => { await tocar('Cerrar', `${HOJA}.querySelector('button[aria-label="Cerrar"]')`); await esperar(`!${HOJA}`, 'la hoja cerrada'); await sleep(250) }
  const abrirCancion = async () => {
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    const BTN = `(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.childElementCount===0&&x.textContent.trim()==='Cuán grande es Él');return e&&(e.closest('button')||e)})()`
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')||${BTN}`, 'la canción o su lista')
    if (!(await ev(`!!document.querySelector('ul[aria-label="Partes de la canción"]')`))) await ev(`${BTN}.click()`)
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(350)
  }
  const letra = () => ev(`(()=>{const p=document.querySelector('#parte-0 p[class*=linea]');const cs=getComputedStyle(p);return JSON.stringify({fs:parseFloat(cs.fontSize),ff:cs.fontFamily,rem:parseFloat(getComputedStyle(document.documentElement).fontSize)})})()`).then(JSON.parse)
  const previa = () => ev(`(()=>{const p=${HOJA}.querySelector('[class*=previa]');const cs=getComputedStyle(p);return JSON.stringify({fs:parseFloat(cs.fontSize),ff:cs.fontFamily})})()`).then(JSON.parse)
  const px = () => ev(`(${HOJA}.querySelector('[role=status][class*=valor]')||{}).textContent`)
  const mas = `${HOJA}.querySelector('button[aria-label="Aumentar tamaño"]')`, menos = `${HOJA}.querySelector('button[aria-label="Reducir tamaño"]')`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`); await abrirCancion()
    const base = await letra()

    // ── la pantalla ──
    await abrirFuente()
    const g = JSON.parse(await ev(`(()=>{const h=${HOJA},r=h.getBoundingClientRect();return JSON.stringify({l:r.left,r:r.right,b:r.bottom,W:innerWidth,H:innerHeight,tit:${TIT},volver:!!h.querySelector('button[aria-label="Volver a Preferencias"]'),
      botones:[...h.querySelectorAll('button[aria-label$="tamaño"]')].map(b=>[b.getAttribute('aria-label'),Math.round(b.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().height),b.disabled]),
      sel:[...h.querySelectorAll('select')].map(s=>[[...s.options].map(o=>o.textContent).join('|'),s.value,Math.round(s.getBoundingClientRect().height),getComputedStyle(s).fontSize]),txt:h.textContent})})()`))
    ok(g.tit === 'Ajustes de fuente' && g.volver && g.l >= 0 && g.r <= g.W && g.b <= g.H + 1, `${et}: «${g.tit}» con su flecha de volver, dentro de la pantalla`)
    ok(g.botones.length === 2 && g.botones.every(([, w, h]) => w >= 44 && h >= 44), `${et}: «−» y «+» miden ≥ 44 px (${g.botones.map(b => b[1] + '×' + b[2]).join(' ')})`)
    ok(g.sel[0][0] === 'La app|Arial|Georgia|Mono' && g.sel[0][2] >= 44 && g.sel[0][3] === '16px', `${et}: el selector de fuente ofrece ${g.sel[0][0].replace(/\|/g, ', ')} (alto ${g.sel[0][2]} px, 16 px de letra)`)
    ok(!/Negrita|Regular|Color de/.test(g.txt) && /Vista previa/.test(g.txt) && /Tamaño de fuente/.test(g.txt), `${et}: sin pesos ni colores; con Vista previa y Tamaño de fuente`)
    ok((await px()) === '16 px' && (await ev(`${menos}.disabled`)) === false && (await ev(`${mas}.disabled`)) === false, `${et}: el tamaño de partida es 16 px`)
    const p0 = await previa(); await foto('fuente')

    // ── tamaño: de paso en paso ──
    const vistos = [await px()]
    await tocar('+', mas); vistos.push(await px()); const p1 = await previa()
    await tocar('+', mas); vistos.push(await px()); await tocar('+', mas); vistos.push(await px())
    ok(vistos.join() === '16 px,19 px,22 px,22 px' && (await ev(`${mas}.disabled`)) === true, `${et}: «+» recorre 16 → 19 → 22 y se apaga en el último (${vistos.join(' ')})`)
    const p3 = await previa(); ok(p1.fs > p0.fs && p3.fs > p1.fs, `${et}: la vista previa crece al instante (${p0.fs} → ${p1.fs} → ${p3.fs} px)`)
    await foto('fuente-grande')
    for (let i = 0; i < 4; i++) await tocar('−', menos)
    ok((await px()) === '14 px' && (await ev(`${menos}.disabled`)) === true, `${et}: «−» baja hasta 14 px y se apaga`)
    await tocar('+', mas); ok((await px()) === '16 px', `${et}: «+» vuelve a 16 px`)

    // ── fuente ──
    await ev(`(()=>{const s=${HOJA}.querySelector('select');s.value=${JSON.stringify(GEORGIA)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(300)
    const pg = await previa(); ok(/Georgia/.test(pg.ff) && !/Georgia/.test(p0.ff), `${et}: la vista previa cambia a Georgia (${pg.ff.slice(0, 22)}…)`)
    ok(/Georgia/.test(await ev(`${HOJA}.textContent`)), `${et}: la fila muestra «Georgia»`)
    await foto('fuente-georgia')

    // ── volver y ver el efecto en la canción ──
    await tocar('Volver a Preferencias', `${HOJA}.querySelector('button[aria-label="Volver a Preferencias"]')`); await esperar(`${TIT}==='Preferencias'`, 'de vuelta en Preferencias')
    await cerrarTodo()
    const despues = await letra()
    ok(despues.fs === base.fs && /Georgia/.test(despues.ff) && !/Georgia/.test(base.ff), `${et}: la letra de la canción pasó a Georgia (tamaño igual: ${base.fs} px)`)
    await abrirFuente(); await tocar('+', mas); await tocar('+', mas); await cerrarTodo()
    const grande = await letra(); ok(grande.fs > base.fs * 1.15, `${et}: con 22 px la letra de la canción crece (${base.fs} → ${grande.fs} px)`)
    await foto('cancion-grande')

    // ── los parches ──
    const parches = JSON.parse(await ev(`JSON.stringify(window.__patches)`))
    const esperados = [{ letra: { textScale: SIZE[2] } }, { letra: { textScale: SIZE[3] } }, { letra: { textScale: SIZE[2] } }, { letra: { textScale: SIZE[1] } }, { letra: { textScale: SIZE[0] } }, { letra: { textScale: SIZE[1] } }, { letra: { fontFamily: GEORGIA } }, { letra: { textScale: SIZE[2] } }, { letra: { textScale: SIZE[3] } }]
    ok(JSON.stringify(parches) === JSON.stringify(esperados), `${et}: cada cambio viajó como UN parche (${parches.map(p => JSON.stringify(p.letra).replace(/"/g, '').replace(/Georgia.*\}/, 'Georgia}')).join(' ')})`)
    ok(parches.every(p => Object.keys(p).join() === 'letra'), `${et}: ningún parche toca la lectura ni nada más`)

    // ── persistencia ──
    await abrirCancion(); const rec = await letra()
    ok(Math.abs(rec.fs - grande.fs) < 0.5 && /Georgia/.test(rec.ff), `${et}: al recargar siguen Georgia y el tamaño grande (${rec.fs} px)`)
    await abrirFuente(); ok((await px()) === '22 px' && /Georgia/.test(await ev(`${HOJA}.textContent`)), `${et}: la pantalla refleja lo guardado (22 px, Georgia)`)
    ok((await ev(`document.documentElement.scrollWidth`)) <= ancho, `${et}: la pantalla no se desliza de lado`)
    await foto('fuente-guardada')
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
