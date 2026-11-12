// Estructura S0 en un navegador REAL (Chrome por CDP): la lectura del músico con la MISMA sección varias veces NO seguidas (V1, V2, C, V1, V2, C, Bd, V3, C). Sin cambios de código: comprueba que lo que ya existe aguanta.
// Qué comprueba: 9 círculos en ese orden; 9 secciones con id parte-0…parte-8 sin duplicados y cada una con su letra; tocar el 2.º coro (6.º círculo) salta a SU sección (parte-5) y no a la del primer coro (parte-2); lo mismo con el 3.º; sin scroll horizontal.
// A 390 y 360 px, claro y oscuro; guarda las capturas. Datos INVENTADOS. Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 SOLO="390 light" node tests/e2e-menus/lectura-estructura-s0.js <carpeta>
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/estructura-s0'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const A = (g, cal = '') => ({ g, cal })
const ly = (t, g) => ({ kind: 'lyric', segments: [{ text: t, ...(g ? { acorde: A(g) } : {}) }] })
const SECS = [['V1', 'Verso 1'], ['V2', 'Verso 2'], ['C', 'Coro'], ['V1', 'Verso 1'], ['V2', 'Verso 2'], ['C', 'Coro'], ['Bd', 'Puente'], ['V3', 'Verso 3'], ['C', 'Coro']]
const LETRA = { V1: 'primerverso', V2: 'segundoverso', V3: 'tercerverso', C: 'elcoro', Bd: 'elpuente' }
const ACORDES = { tono: 'G', secciones: SECS.map(([code, name]) => ({ code, name, repeat: 1, lineas: [ly(LETRA[code] + ' línea uno de prueba para llenar la pantalla', 1), ly('otra línea de prueba de ' + name, 4), ly('y una tercera línea de prueba', 5)] })) }
const ADJ = [{ id: 'a1', nombre: 'Partitura de prueba.pdf', tamano: 1000, subidoPor: null, fecha: null }]
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(ACORDES)};d.adjuntos=${JSON.stringify(ADJ)};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9584), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`); await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const CIRC = `[...document.querySelectorAll('ul[aria-label="Partes de la canción"] button')]`
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250)
  }
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await esperar(`document.querySelector('ul li button[aria-label^="Cuán"]')`, 'la canción en la lista'); await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`)
    await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(400)

    const partes = JSON.parse(await ev(`JSON.stringify(${CIRC}.map(b=>b.firstChild.textContent))`))
    ok(partes.join() === 'V1,V2,C,V1,V2,C,Bd,V3,C', `${et}: la tira tiene 9 círculos en el orden de la estructura (${partes.join(' ')})`)
    const ids = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('section[id^="parte-"]')].map(s=>s.id))`))
    ok(ids.length === 9 && new Set(ids).size === 9 && ids.every((x, i) => x === 'parte-' + i), `${et}: 9 secciones con id distinto (${ids.join(' ')})`)
    const letras = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('section[id^="parte-"]')].map(s=>/primerverso|segundoverso|tercerverso|elcoro|elpuente/.exec(s.textContent.replace(/ /g,''))?.[0]))`))
    ok(letras.join() === 'primerverso,segundoverso,elcoro,primerverso,segundoverso,elcoro,elpuente,tercerverso,elcoro', `${et}: cada aparición lleva la letra de su sección (${letras.join(' ')})`)
    const dim = JSON.parse(await ev(`JSON.stringify({doc:document.documentElement.scrollWidth,iw:innerWidth})`))
    ok(dim.doc <= dim.iw, `${et}: la pantalla no se desliza de lado (${dim.doc} ≤ ${dim.iw})`)
    await foto('estructura-9-pasos')

    for (const [n, idx] of [[6, 5], [9, 8], [3, 2]]) {
      await ev(`window.scrollTo(0,0)`); await sleep(300)
      await ev(`${CIRC}[${idx}].scrollIntoView({inline:'center',block:'nearest'})`); await sleep(250)
      await tocar(`círculo ${n} (${partes[idx]})`, `${CIRC}[${idx}]`); await sleep(500)
      const salto = JSON.parse(await ev(`(()=>{const s=document.getElementById('parte-${idx}').getBoundingClientRect();const o=document.getElementById('parte-2').getBoundingClientRect();return JSON.stringify({top:Math.round(s.top),y:Math.round(scrollY),fin:Math.round(scrollY+innerHeight)>=document.documentElement.scrollHeight-2,activa:${CIRC}.findIndex(b=>b.getAttribute('aria-current')==='true')})})()`))
      ok(salto.top >= -2 && (salto.top <= 200 || salto.fin) && (idx === 2 || salto.y > 200), `${et}: tocar el círculo ${n} (${partes[idx]}) salta a SU aparición, parte-${idx} (queda a ${salto.top} px del borde, scrollY ${salto.y}${salto.fin ? ', al final de la página' : ''})`)
      ok(salto.activa === idx, `${et}: la parte activa es el círculo ${n} (${salto.activa + 1})`)
    }
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
