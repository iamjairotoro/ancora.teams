// Endurecimiento del editor de acordes en un navegador REAL (Chrome por CDP), con el servidor simulado en la página y datos INVENTADOS (la canción es la de la maqueta, no una real): el caso del daño —la letra de la ficha es de relleno,
// la canción tiene 4 secciones en formato antiguo con acordes ilegibles y un arreglo de 8 entradas—.
//   5  aviso en la ficha (arreglo + formato antiguo) antes de abrir el editor
//   1  «Cargar desde las secciones guardadas»: reemplaza el documento, Deshacer lo devuelve
//   2  resumen antes de guardar (letra, secciones, arreglo) — y nada se envía hasta confirmarlo
//   3  borrar «PUENTE» (que el arreglo usa) → el resumen lista la sección afectada y pide «Entiendo, guardar igual»; la petición lleva confirmarArreglo:true
//   3  el servidor se adelanta (409 de arreglo) → el mismo diálogo, con lo que mandó el servidor; confirmar reenvía con confirmarArreglo:true
//   4  respaldo imposible (500 «respaldo») → el aviso claro, el editor conserva los cambios
// A 390 y 360 px, claro y oscuro; guarda capturas. Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/endurecimiento-editor.js <carpeta-de-capturas>
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/endurecimiento-editor'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const ID = k => `aaaaaaaa-0000-4000-8000-00000000000${k}`
const SECS = [{ id: ID(1), codigo: 'V1', nombre: 'Verso 1' }, { id: ID(2), codigo: 'PC', nombre: 'Pre coro' }, { id: ID(3), codigo: 'C', nombre: 'Coro' }, { id: ID(4), codigo: 'P', nombre: 'Puente' }]
const ARREGLO = [1, 2, 3, 3, 2, 4, 3, 3].map(ID)
const GUARDADA = 'VERSO 1:\nLuna de plata sobre el mar\nsegundo renglón de prueba\n\nPRE CORO:\nSube el tono de prueba\n\nCORO:\nCanta fuerte otra vez\notra línea del coro\n\nPUENTE:\nUn puente de prueba\notra línea más'
const CARGA = { tono: 'G', letra: 'TEXTO DE RELLENO\nde prueba', origen: 'ninguno', secciones: null, sinConvertir: 2, huella: 'a'.repeat(32), formatoAntiguo: true,
  guardadas: { letra: GUARDADA, secciones: null, nSecciones: 4, sinConvertir: 2 }, actual: { secciones: SECS, arreglo: ARREGLO } }
// El servidor simulado: GET devuelve CARGA; POST responde según `window.__modo` ('ok' | 'arreglo409' | 'sinrespaldo') y guarda los cuerpos recibidos.
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__posts=0;window.__bodies=[];window.__modo='ok';window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const post=esAc&&((o&&o.method)||'GET').toUpperCase()==='POST';
const j=(b,s)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
if(post){window.__posts++;const b=JSON.parse(o.body);window.__bodies.push(b);if(window.__modo==='sinrespaldo')return j({error:'x',campo:'respaldo',parcial:false},500);if(window.__modo==='arreglo409'&&!b.confirmarArreglo)return j({error:'x',campo:'arreglo',afectadas:[{codigo:'P',nombre:'Puente',entradas:1,motivo:'baja'}]},409);return j({ok:true,huella:'b'.repeat(32)},200)}
if(esAc)return j({cancion:${JSON.stringify(CARGA)}},200);return f(i,o)}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9582), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) {
      let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* la página está cambiando */ }
      if (v) return
      if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`)
      await sleep(SONDEO)
    }
  }
  const boton = txt => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const clic = async (nombre, buscar) => { await esperar(buscar, nombre); paso = `clic en «${nombre}»`; await ev(`(${buscar}).click()`); await sleep(150) }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const AREA = `document.querySelector('[role=dialog] textarea')`, DIALOGO = `document.querySelector('[role=alertdialog]')`
  const textoDialogo = () => ev(`(${DIALOGO}||{textContent:''}).textContent.replace(/\\s+/g,' ').trim()`)
  const nombres = () => ev(`JSON.stringify([...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].map(b=>b.textContent.replace('▾','').trim()))`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)

    // ── 5: aviso en la ficha ──
    await esperar(`document.querySelector('.anc-aviso-arreglo')`, 'el aviso de la ficha')
    const fichaTxt = await ev(`document.querySelector('.anc-aviso-arreglo').textContent`)
    ok(fichaTxt.includes('arreglo de 8 entradas') && fichaTxt.includes('formato antiguo') && fichaTxt.includes('verás un resumen'), `${et}: la ficha avisa «${fichaTxt.slice(0, 70)}…»`)
    ok(await ev(`document.querySelector('.anc-aviso-arreglo').getBoundingClientRect().right<=innerWidth`), `${et}: el aviso cabe en el ancho (sin desbordar)`)
    await foto('ficha-aviso')
    await clic('Editar con acordes', boton('Editar con acordes'))
    await esperar(`document.querySelector('[role=dialog][aria-modal=true]')`, 'el editor'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)

    // ── 1: cargar desde las secciones guardadas ──
    const aviso = await ev(`(()=>{const a=[...document.querySelectorAll('[role=dialog] [role=status]')].find(x=>x.textContent.includes('secciones guardadas'));return a?a.textContent.replace(/\\s+/g,' ').trim():null})()`)
    ok(aviso && aviso.includes('Hay 4 secciones guardadas') && aviso.includes('Cargar desde las secciones guardadas'), `${et}: el editor ofrece cargar las secciones guardadas («${(aviso || '').slice(0, 60)}…»)`)
    ok((await ev(`window.__posts`)) === 0, `${et}: abrir el editor no escribe nada`)
    await foto('editor-oferta')
    await clic('Cargar desde las secciones guardadas', boton('Cargar desde las secciones guardadas')); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=7`, 'las líneas cargadas'); await sleep(250)
    ok(JSON.stringify(await nombres()) === JSON.stringify(['VERSO 1', 'PRE CORO', 'CORO', 'PUENTE']), `${et}: las 4 secciones quedaron en el editor (${(await nombres()).join(', ')})`)
    ok(await ev(`![...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent.trim()==='Cargar desde las secciones guardadas')`), `${et}: la oferta desaparece tras cargar`)
    await clic('Deshacer', `document.querySelector('[role=dialog] button[aria-label="Deshacer"]')`); await sleep(250)
    ok((await nombres()).length <= 1, `${et}: Deshacer devuelve lo anterior (${(await nombres()).join(', ') || 'sin secciones'})`)
    await clic('Rehacer', `document.querySelector('[role=dialog] button[aria-label="Rehacer"]')`); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=7`, 'las líneas otra vez'); await sleep(250)
    ok(JSON.stringify(await nombres()) === JSON.stringify(['VERSO 1', 'PRE CORO', 'CORO', 'PUENTE']), `${et}: Rehacer las vuelve a poner`)

    // ── 2: resumen antes de guardar ──
    await clic('Guardar', boton('Guardar')); await esperar(DIALOGO, 'el resumen'); await sleep(200)
    const t1 = await textoDialogo()
    ok(t1.includes('Esto es lo que va a pasar al guardar') && t1.includes('Se reemplaza la letra (') && t1.includes('4 secciones, se actualizan') && t1.includes('arreglo de 8 entradas') && t1.includes('Lo anterior queda como respaldo'), `${et}: el resumen dice qué cambia («${t1.slice(0, 120)}…»)`)
    ok(!t1.includes('Afecta al arreglo'), `${et}: sin secciones del arreglo en riesgo, no hay bloque de arreglo`)
    ok((await ev(`window.__posts`)) === 0, `${et}: con el resumen abierto no se envió nada`)
    await foto('resumen')
    await clic('Seguir editando', boton('Seguir editando')); await sleep(200)
    ok((await ev(`window.__posts`)) === 0 && !(await ev(`!!${DIALOGO}`)), `${et}: «Seguir editando» cierra el resumen y no envía nada`)

    // ── 3: borrar PUENTE (el arreglo lo usa) → el resumen lista lo afectado ──
    await clic('nombre «PUENTE»', `[...document.querySelectorAll('[role=dialog] [class*="_secNombre__"]')].find(b=>b.textContent.includes('PUENTE'))`)
    await esperar(`document.querySelector('[role=dialog][aria-label="Sección PUENTE"]')`, 'el menú de PUENTE')
    await clic('Borrar sección', `[...document.querySelectorAll('[role=dialog][aria-label="Sección PUENTE"] button')].find(b=>b.textContent.trim()==='Borrar sección')`); await sleep(250)
    ok(JSON.stringify(await nombres()) === JSON.stringify(['VERSO 1', 'PRE CORO', 'CORO']), `${et}: PUENTE se borró del editor (todavía nada guardado)`)
    await clic('Guardar', boton('Guardar')); await esperar(DIALOGO, 'el resumen con arreglo'); await sleep(200)
    const t2 = await textoDialogo()
    ok(t2.includes('4 secciones pasan a 3') && t2.includes('Se desactiva Puente (no se borra)'), `${et}: el resumen dice «4 secciones pasan a 3» y qué se desactiva`)
    ok(t2.includes('Afecta al arreglo de la canción') && t2.includes('Puente: se desactiva y el arreglo la usa 1 vez; esas entradas dejarán de verse'), `${et}: lista la sección del arreglo que se afecta`)
    ok(await ev(`!![...${DIALOGO}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Entiendo, guardar igual')`) && (await ev(`![...${DIALOGO}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar')`)), `${et}: el botón dice «Entiendo, guardar igual»`)
    ok((await ev(`window.__posts`)) === 0, `${et}: con el resumen abierto no se envió nada`)
    await foto('resumen-arreglo')
    await clic('Entiendo, guardar igual', boton('Entiendo, guardar igual')); await esperar(`window.__posts>=1`, 'la petición'); await sleep(250)
    const b1 = JSON.parse(await ev(`JSON.stringify(window.__bodies[0])`))
    ok((await ev(`window.__posts`)) === 1 && b1.confirmarArreglo === true && b1.secciones.length === 3, `${et}: se envió UNA petición con confirmarArreglo:true y 3 secciones`)
  } finally { await c.cerrar() }
}

// Los casos 3b (el servidor se adelanta) y 4 (respaldo imposible) en una sesión aparte: no dependen del resto y así un corte de uno no repite todo.
async function intento2(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9582), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`); await sleep(SONDEO) }
  }
  const boton = txt => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const clic = async (nombre, buscar) => { await esperar(buscar, nombre); paso = `clic en «${nombre}»`; await ev(`(${buscar}).click()`); await sleep(150) }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const DIALOGO = `document.querySelector('[role=alertdialog]')`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', boton('Editar con acordes')); await esperar(`document.querySelector('[role=dialog][aria-modal=true]')`, 'el editor')
    await clic('Cargar desde las secciones guardadas', boton('Cargar desde las secciones guardadas')); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=7`, 'las líneas cargadas'); await sleep(250)

    // ── 3b: el servidor responde 409 de arreglo aunque la pantalla no lo previó ──
    await ev(`window.__modo='arreglo409'`)
    await clic('Guardar', boton('Guardar')); await esperar(DIALOGO, 'el resumen'); await clic('Guardar (resumen)', `[...${DIALOGO}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar')`)
    await esperar(`window.__posts>=1 && ${DIALOGO} && ${DIALOGO}.textContent.includes('Afecta al arreglo de la canción')`, 'el diálogo con lo que mandó el servidor'); await sleep(200)
    const t = await ev(`${DIALOGO}.textContent.replace(/\\s+/g,' ').trim()`)
    ok(t.includes('Puente: se desactiva y el arreglo la usa 1 vez') && !(await ev(`!!document.querySelector('[role=dialog] [role=alert]')`)), `${et}: el 409 de arreglo abre el diálogo con la sección afectada y NO el aviso de «alguien más cambió esta canción»`)
    ok((await ev(`window.__bodies[0].confirmarArreglo`)) === undefined, `${et}: la primera petición iba sin confirmarArreglo`)
    await foto('arreglo-409')
    await clic('Entiendo, guardar igual', boton('Entiendo, guardar igual')); await esperar(`window.__posts>=2`, 'la segunda petición'); await sleep(250)
    ok((await ev(`window.__bodies[1].confirmarArreglo`)) === true && (await ev(`window.__posts`)) === 2, `${et}: confirmar reenvía UNA vez con confirmarArreglo:true`)
  } finally { await c.cerrar() }
}

async function intento3(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9582), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`); await sleep(SONDEO) }
  }
  const boton = txt => `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='${txt}')`
  const clic = async (nombre, buscar) => { await esperar(buscar, nombre); paso = `clic en «${nombre}»`; await ev(`(${buscar}).click()`); await sleep(150) }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const DIALOGO = `document.querySelector('[role=alertdialog]')`
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', boton('Editar con acordes')); await esperar(`document.querySelector('[role=dialog][aria-modal=true]')`, 'el editor')
    await clic('Cargar desde las secciones guardadas', boton('Cargar desde las secciones guardadas')); await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=7`, 'las líneas cargadas'); await sleep(250)

    // ── 4: el respaldo no se pudo escribir (la migración 055 todavía no está) ──
    await ev(`window.__modo='sinrespaldo'`)
    await clic('Guardar', boton('Guardar')); await esperar(DIALOGO, 'el resumen'); await clic('Guardar (resumen)', `[...${DIALOGO}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar')`)
    await esperar(`[...document.querySelectorAll('[role=dialog] [role=alert]')].find(x=>x.textContent.includes('respaldo'))`, 'el aviso de respaldo'); await sleep(250)
    const msg = await ev(`[...document.querySelectorAll('[role=dialog] [role=alert]')].find(x=>x.textContent.includes('respaldo')).textContent.replace(/\\s+/g,' ').trim()`)
    ok(msg.startsWith('No se pudo guardar el respaldo de la letra y el tono, así que no se cambió nada.') && msg.includes('Tus cambios siguen en el editor'), `${et}: aviso claro «${msg.slice(0, 80)}…»`)
    ok(await ev(`!!document.querySelector('[role=dialog][aria-modal=true]') && document.querySelectorAll('[role=dialog] [data-fin]').length>=6`), `${et}: el editor sigue abierto con los cambios`)
    ok(!/guardado a medias|No se pudo terminar/.test(msg), `${et}: no lo confunde con un guardado a medias`)
    await foto('sin-respaldo')
    await ev(`window.__modo='ok'`); await clic('Guardar otra vez', boton('Guardar')); await esperar(`window.__posts>=2`, 'el reintento'); await sleep(250)
    ok((await ev(`window.__posts`)) === 2 && !(await ev(`!!${DIALOGO}`)), `${et}: reintentar no vuelve a pedir el resumen (ya se confirmó) y envía`)
  } finally { await c.cerrar() }
}

;(async () => {
  const SOLO = process.env.SOLO || ''      // p. ej. SOLO="390 light" para una sola combinación al depurar
for (const [ancho, tema] of [[390, 'light'], [390, 'dark'], [360, 'light'], [360, 'dark']].filter(([a, t]) => !SOLO || SOLO === `${a} ${t}`)) for (const caso of [intento, intento2, intento3]) {
    const et = `${ancho} ${tema} ${caso.name}`
    for (let n = 0; n <= REINTENTOS; n++) {
      const [lo, lf] = [out.length, fallas]
      try { await caso(ancho, tema); break }
      catch (e) {
        out.length = lo; fallas = lf
        if (n < REINTENTOS) { out.push(`AVISO ${et}: se cortó en el paso «${paso}» (${e.message}) — intento ${n + 1} de ${REINTENTOS + 1}, se repite`); if (process.env.SOLO) console.log(out[out.length - 1]) }
        else ok(false, `${et}: se cortó en el paso «${paso}» tras ${REINTENTOS + 1} intentos — ${e.message}`)
      }
    }
  }
  const avisos = out.filter(x => x.startsWith('AVISO')).length
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, ${avisos} avisos (reintentos)`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
