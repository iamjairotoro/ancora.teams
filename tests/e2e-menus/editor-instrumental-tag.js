// «+ Instrumental» y «+ Tag» en el editor móvil, en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS.
// Qué comprueba: la fila de botones trae los ocho (… + Interludio, + Instrumental, + Tag, + Final) y se desliza hasta el último; «+ Instrumental» y «+ Tag» insertan su encabezado (Instrumental con «(instrumental)»); con el cursor sobre un
// encabezado le cambian el tipo y Deshacer lo devuelve; el menú de sección ofrece los ocho tipos, marca el actual y cabe en la pantalla; Instrumental admite líneas de acordes y Tag acordes sobre las palabras; Guardar envía UNA petición con los
// códigos «Inst» y «Tg» (y «V1», «C»), Instrumental solo con líneas de acordes. A 390 y 360 px, claro y oscuro; guarda las capturas.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/editor-instrumental-tag.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/editor-instrumental-tag'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const LETRA = 'VERSO 1:\nLínea de prueba uno\notra línea de prueba\n\nCORO:\nCoro de prueba'
const SEC = ls => ls.map(t => ({ kind: 'lyric', segments: [{ text: t }] }))
const CARGA = { tono: 'G', letra: LETRA, origen: 'formato2', secciones: [SEC(['Línea de prueba uno', 'otra línea de prueba']), SEC(['Coro de prueba'])], sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null,
  actual: { secciones: [{ id: 'a', codigo: 'V1', nombre: 'VERSO 1' }, { id: 'b', codigo: 'C', nombre: 'CORO' }], arreglo: [] } }
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__posts=0;window.__bodies=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const m=((o&&o.method)||'GET').toUpperCase();
if(esAc&&m==='POST'){window.__posts++;window.__bodies.push(JSON.parse(o.body));return j({ok:true,huella:'b'.repeat(32)})}
if(esAc)return j({cancion:${JSON.stringify(CARGA)},hojaFicha:null});return f(i,o)}})()`
const BOTONES = ['+ Verso', '+ Pre coro', '+ Coro', '+ Puente', '+ Interludio', '+ Instrumental', '+ Tag', '+ Final']
const TIPOS = ['Verso', 'Pre coro', 'Coro', 'Puente', 'Interludio', 'Instrumental', 'Tag', 'Final']

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9589), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,160)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const boton = txt => `[...document.querySelectorAll('[role=dialog] button, button')].find(b=>b.textContent.trim()==='${txt}')`
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); await ev(`(${buscar}).scrollIntoView({block:'nearest',inline:'nearest'})`); await sleep(80); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(200)
  }
  const AREA = `document.querySelector('[role=dialog] textarea')`, BARRA = `document.querySelector('[role=dialog] [class*="_barraTexto__"]')`
  const chip = txt => `[...${BARRA}.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const valor = () => ev(`${AREA}.value`)
  const cursorEn = frag => ev(`(()=>{const a=${AREA};a.focus();const i=a.value.indexOf(${JSON.stringify(frag)});a.setSelectionRange(i+2,i+2);return i})()`)
  const alFinal = () => ev(`(()=>{const a=${AREA};a.focus();a.setSelectionRange(a.value.length,a.value.length)})()`)
  const escribir = async t => { await ev(`${AREA}.focus()`); await send('Input.insertText', { text: t }); await sleep(200) }
  const nombres = () => ev(`JSON.stringify([...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].map(b=>b.textContent.replace('▾','').trim()))`).then(JSON.parse)
  const linea = txt => `[...document.querySelectorAll('[role=dialog] [data-fin]')].find(l=>[...l.querySelectorAll('[data-ini]')].map(t=>t.textContent).join('').includes(${JSON.stringify(txt)}))`
  const PANEL = `document.querySelector('[role=dialog][aria-label^="Acordes en"], [role=dialog][aria-label^="Línea de acordes"]')`
  const panelBtn = txt => `[...${PANEL}.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const acorde = letra => `[...${PANEL}.querySelectorAll('button')].find(b=>b.childNodes[0]&&b.childNodes[0].textContent.trim()==='${letra}')`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await tocar('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await tocar('Editar con acordes', boton('Editar con acordes'))
    await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=3`, 'las líneas del modo Acordes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)

    // ── la fila de botones ──
    await tocar('✎ Texto', boton('✎ Texto')); await esperar(AREA, 'el cuadro de texto'); await esperar(BARRA, 'la fila de encabezados'); await sleep(250)
    const fila = JSON.parse(await ev(`(()=>{const f=${BARRA}.querySelector('[class*="_encabezados__"]');const bs=[...f.querySelectorAll('button')];return JSON.stringify({t:bs.map(b=>b.textContent.trim()),min:Math.min(...bs.map(b=>b.getBoundingClientRect().height)),sw:f.scrollWidth,cw:f.clientWidth})})()`))
    ok(JSON.stringify(fila.t) === JSON.stringify(BOTONES), `${et}: la fila trae los ocho botones en orden (${fila.t.join(' ')})`); ok(fila.min >= 44, `${et}: todos miden ≥ 44 px de alto (${Math.round(fila.min)})`)
    ok(fila.sw > fila.cw, `${et}: la fila se desliza (${fila.sw} px de contenido en ${fila.cw} px visibles)`)
    await ev(`(()=>{const f=${BARRA}.querySelector('[class*="_encabezados__"]');f.scrollLeft=f.scrollWidth})()`); await sleep(200)
    ok(await ev(`(()=>{const f=${BARRA}.querySelector('[class*="_encabezados__"]');const b=[...f.querySelectorAll('button')].pop(),r=b.getBoundingClientRect(),c=f.getBoundingClientRect();return b.textContent.trim()==='+ Final'&&r.right<=c.right+1&&r.left>=c.left-1})()`), `${et}: deslizando se llega al último botón («+ Final») entero`)
    await foto('botones')

    // ── insertar al final: Instrumental y Tag ──
    await alFinal(); await escribir('\n\n'); await tocar('+ Instrumental', chip('+ Instrumental'))
    let v = await valor(); ok(v.endsWith('CORO:\nCoro de prueba\n\nINSTRUMENTAL:\n(instrumental)\n'), `${et}: «+ Instrumental» puso «INSTRUMENTAL:» con su «(instrumental)»`)
    ok(await ev(`document.activeElement===${AREA}`), `${et}: el cuadro de texto conserva el foco`)
    await alFinal(); await escribir('\n'); await tocar('+ Tag', chip('+ Tag')); await escribir('Un tag de prueba')
    v = await valor(); ok(v.endsWith('INSTRUMENTAL:\n(instrumental)\n\nTAG:\nUn tag de prueba'), `${et}: «+ Tag» puso «TAG:» (sin «(instrumental)») y se escribió debajo`)
    await foto('texto-instrumental-tag')

    // ── con el cursor sobre un encabezado cambia el tipo; Deshacer lo devuelve ──
    await cursorEn('VERSO 1:'); await tocar('+ Instrumental (sobre «VERSO 1:»)', chip('+ Instrumental')); v = await valor()
    ok(v.startsWith('INSTRUMENTAL:\nLínea de prueba uno') && !v.startsWith('INSTRUMENTAL:\n(instrumental)') && (v.match(/INSTRUMENTAL:/g) || []).length === 2, `${et}: con el cursor sobre «VERSO 1:» el botón le cambia el tipo (sin dejar un encabezado huérfano)`)
    await tocar('Deshacer', `document.querySelector('[role=dialog] button[aria-label="Deshacer"]')`); v = await valor(); ok(v.startsWith('VERSO 1:\nLínea de prueba uno'), `${et}: Deshacer devuelve «VERSO 1:»`)

    // ── el menú de sección y las líneas de acordes ──
    await tocar('♪ Acordes', boton('♪ Acordes')); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=4`, 'las líneas del modo Acordes'); await sleep(300)
    ok(JSON.stringify(await nombres()) === JSON.stringify(['VERSO 1', 'CORO', 'INSTRUMENTAL', 'TAG']), `${et}: las secciones son ${(await nombres()).join(', ')}`)
    await tocar('nombre «TAG»', `[...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].find(b=>b.textContent.includes('TAG'))`); await esperar(`document.querySelector('[role=dialog][aria-label="Sección TAG"]')`, 'el menú de TAG'); await sleep(250)
    const menu = JSON.parse(await ev(`(()=>{const m=document.querySelector('[role=dialog][aria-label="Sección TAG"]'),r=m.getBoundingClientRect();return JSON.stringify({tipos:[...m.querySelectorAll('[class*="_tipos__"] button')].map(b=>b.textContent.trim()),marcado:[...m.querySelectorAll('[class*="_tipos__"] button[aria-pressed=true]')].map(b=>b.textContent.trim()),min:Math.min(...[...m.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)),dentro:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight+1,W:document.documentElement.scrollWidth})})()`))
    ok(JSON.stringify(menu.tipos) === JSON.stringify(TIPOS) && menu.marcado.join() === 'Tag', `${et}: el menú ofrece los ocho tipos y marca «Tag» (${menu.tipos.join(', ')})`)
    ok(menu.min >= 44 && menu.dentro && menu.W <= ancho, `${et}: el menú cabe en la pantalla, sin desplazarse de lado, con botones ≥ 44 px (${Math.round(menu.min)})`)
    await foto('menu-ocho-tipos')
    await tocar('tipo Cerrar', `[...document.querySelectorAll('[role=dialog][aria-label="Sección TAG"] button')].find(b=>b.textContent.trim()==='Cerrar')`); await esperar(`!document.querySelector('[role=dialog][aria-label^="Sección"]')`, 'el menú cerrado')
    // una línea de acordes en INSTRUMENTAL (solo acordes, como Interludio)
    await tocar('+ Línea de acordes (INSTRUMENTAL)', `[...document.querySelectorAll('[role=dialog] button')].filter(b=>b.textContent.trim()==='+ Línea de acordes')[2]`)
    await tocar('acorde G', acorde('G')); await tocar('| Barra', panelBtn('| Barra')); await tocar('acorde D', acorde('D')); await sleep(200)
    const filas = await ev(`JSON.stringify([...document.querySelectorAll('[role=dialog] [class*="_compas__"]')].map(f=>[...f.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>t&&!/^(\\+|Quitar línea)$/.test(t))))`)
    ok(filas === '[["G","|","D"]]', `${et}: INSTRUMENTAL admite una línea de acordes (${filas})`)
    await tocar('Cerrar el panel', `${PANEL}.querySelector('button[aria-label="Cerrar"]')`); await sleep(200)
    // acorde sobre una palabra de TAG
    await tocar('línea del tag', `${linea('Un tag de prueba')}.querySelector('[data-ini]')`); await tocar('«+»', `${linea('Un tag de prueba')}.querySelectorAll('[data-mas]')[1]`); await tocar('acorde C', acorde('C')); await tocar('Cerrar el panel', `${PANEL}.querySelector('button[aria-label="Cerrar"]')`); await sleep(200)
    ok((await ev(`document.querySelectorAll('[data-ac]').length`)) === 1, `${et}: TAG lleva un acorde sobre una palabra, como un coro`)
    await foto('acordes-instrumental-tag')

    // ── Guardar: UNA petición con los códigos nuevos ──
    ok((await ev(`window.__posts`)) === 0, `${et}: nada se envió antes de Guardar`)
    await tocar('Guardar', boton('Guardar')); await esperar(`document.querySelector('[role=alertdialog]')`, 'el resumen'); await tocar('Guardar (resumen)', `[...document.querySelector('[role=alertdialog]').querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar')`)
    await esperar(`window.__posts>=1`, 'la petición'); await sleep(250)
    const b = JSON.parse(await ev(`JSON.stringify(window.__bodies[0])`))
    ok((await ev(`window.__posts`)) === 1 && JSON.stringify(b.secciones.map(s => [s.codigo, s.nombre])) === JSON.stringify([['V1', 'VERSO 1'], ['C', 'CORO'], ['Inst', 'INSTRUMENTAL'], ['Tg', 'TAG']]), `${et}: Guardar envió UNA petición con los códigos V1, C, Inst y Tg (${b.secciones.map(s => s.codigo).join(', ')})`)
    ok(b.secciones[2].lineas.length === 1 && b.secciones[2].lineas.every(l => l.kind === 'bars') && b.secciones[3].lineas.some(l => l.kind === 'lyric' && l.segments.some(g => g.acorde)), `${et}: INSTRUMENTAL solo guarda líneas de acordes; TAG guarda letra con su acorde`)
    ok(b.letra.includes('INSTRUMENTAL:\n(instrumental)') && b.letra.includes('TAG:\nUn tag de prueba'), `${et}: la letra guardada trae los dos encabezados`)
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
