// Ficha de administradora (Modo Admin) con la hoja con acordes, en un navegador REAL (Chrome por CDP): 390 px (teléfono) y 1280 px (escritorio), claro y oscuro. Servidor simulado en la página; datos INVENTADOS.
// Qué comprueba: con hoja, la ficha dibuja los acordes (el dibujo de la lectura) en lugar de la letra y los botones de siempre siguen (Tipografía, Editar, Editar con acordes solo en teléfono, Adjuntos); UNA sola lectura de la ruta por ficha
// (la comparte con el aviso del arreglo); la notación ABC/123 cambia los acordes y es lo ÚNICO que se escribe; sin hoja (o si la ruta falla) la ficha es IDÉNTICA a la de main: el HTML del panel y de la barra de botones se compara con
// una copia tomada de main (tests/e2e-menus/golden/); los avisos de «otras versiones» y «letra distinta»; sin desplazamiento lateral.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/ficha-admin-acordes.js <carpeta-de-capturas>   (la prueba usa SOLO="<ancho> <tema>"; ancho 390 o 1280)
// Copia de main: construir main y correr con BASELINE=1 (escribe los HTML en golden/ en vez de compararlos).
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-letra-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/ficha-admin-acordes', BASELINE = process.env.BASELINE === '1'
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(R + 'golden', { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const A = (g, cal = '') => ({ g, cal })
const ly = (a, ga, b, gb) => ({ kind: 'lyric', segments: [{ text: a, acorde: A(ga) }, { text: b, acorde: A(gb) }] })
const HOJA = { tono: 'G', secciones: [
  { code: 'V1', name: 'Verso 1', repeat: 1, lineas: [ly('Línea de prueba ', 1, 'número uno de la parte', 5), ly('Otra línea de prueba ', 4, 'que sigue aquí mismo', 5)] },
  { code: 'INT', name: 'Interludio', repeat: 1, lineas: [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(6, 'm') }, { acorde: A(4) }, { acorde: A(5) }] }] },
  { code: 'C', name: 'Coro', repeat: 2, lineas: [ly('Coro de prueba ', 1, 'con su letra', 4)] },
] }
const CANCION = { tono: 'G', letra: '', origen: 'formato2', secciones: null, sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null, actual: { secciones: [], arreglo: [] } }
// El servidor simulado: la ruta del editor responde según window.__modo ('sinhoja' | 'hoja' | 'avisos' | 'falla') y cuenta las lecturas; las preferencias se registran (y se recuerdan) y cualquier OTRA escritura a /api se anota.
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__lecturas=0;window.__escrituras=[];window.__patches=[];window.__modo='sinhoja';
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}});
const guardada=()=>{try{return JSON.parse(localStorage.getItem('__lectura')||'{}')}catch(e){return {}}};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();
if(u.startsWith('/api/admin/canciones/acordes')&&m==='GET'){window.__lecturas++;const md=window.__modo;if(md==='falla')return j({error:'x'},403);
const hoja=md==='sinhoja'?null:${JSON.stringify(HOJA)};return j({cancion:${JSON.stringify(CANCION)},hojaFicha:{hoja,otrasVersiones:md==='avisos'?2:0,desajuste:md==='avisos'}})}
if(u.startsWith('/api/portal/preferencias')&&m==='PATCH'){const b=JSON.parse(o.body);window.__patches.push(b);try{localStorage.setItem('__lectura',JSON.stringify({...guardada(),...(b.lectura||{})}))}catch(e){}return j({ok:true})}
if(u.startsWith('/api/')&&m!=='GET')window.__escrituras.push(m+' '+u);
const r=await f(i,o);if(u.startsWith('/api/portal/preferencias')&&m==='GET'){let d={};try{d=await r.clone().json()}catch(e){d={}};d.lectura={notation:'americano',vista:'ambos',compacta:false,detalles:true,...guardada()};return j(d)}
return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`, telefono = ancho < 700
  paso = 'abrir el navegador'; const c = await lanzar(9588), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,160)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const abrirFicha = async modo => {
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.setItem('__rol','admin')`); await ev(`window.__modo=${JSON.stringify(modo)}`).catch(() => {})
    await send('Page.navigate', { url: B + '/admin?tab=canciones' }); await sleep(500); await ev(`window.__modo=${JSON.stringify(modo)}`)
    await esperar(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`, 'la canción en la lista')
    await ev(`window.__lecturas=0;window.__escrituras=[];window.__patches=[]`)
    await ev(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él').click()`)
    await esperar(`document.querySelector('.anc-sheet')`, 'la ficha'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(700)
  }
  const botones = () => ev(`JSON.stringify([...document.querySelectorAll('button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()).filter(t=>/^(Aa )?Tipografía$|^Editar$|^Editar con acordes$|^Adjuntos/.test(t)))`).then(JSON.parse)
  const barraHtml = () => ev(`[...document.querySelectorAll('button')].find(b=>/Tipografía/.test(b.textContent)).parentElement.outerHTML`)
  const panelHtml = () => ev(`document.querySelector('.anc-sheet').closest('.anc-panel').outerHTML`)
  const golden = (nombre, html) => {
    const f = `${R}golden/${nombre}__${ancho}.html`
    if (BASELINE) { fs.writeFileSync(f, html); return true }
    return fs.existsSync(f) && fs.readFileSync(f, 'utf8') === html
  }
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 900, deviceScaleFactor: telefono ? 2 : 1, mobile: telefono }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })

    // ── sin hoja: la ficha de hoy, idéntica a la de main ──
    await abrirFicha('sinhoja')
    const sin = { panel: await panelHtml(), barra: await barraHtml(), botones: await botones() }
    ok(!(await ev(`!!document.querySelector('.anc-sheet [data-a]')`)) && /Esplendor|esplendor/.test(sin.panel), `${et}: sin hoja se ve la letra de siempre`)
    ok(golden('panel-sin-acordes', sin.panel) && golden('barra-botones', sin.barra), BASELINE ? `${et}: copia de main guardada` : `${et}: el HTML del panel y de la barra de botones es IDÉNTICO al de main (comparado con la copia tomada de main)`)
    await foto('sin-hoja')

    // ── la ruta falla: también la letra de siempre ──
    await abrirFicha('falla'); ok((await panelHtml()) === sin.panel && (await barraHtml()) === sin.barra, `${et}: si la ruta responde 403 (líder, otra organización o error) la ficha es idéntica a la de siempre`)

    // ── con hoja ──
    await abrirFicha('hoja')
    const con = JSON.parse(await ev(`JSON.stringify({lecturas:window.__lecturas,acordes:[...document.querySelectorAll('.anc-sheet [data-a]')].map(e=>e.textContent.trim()).filter(Boolean),h1:(document.querySelector('.anc-sheet h1')||{}).textContent,
      secciones:[...document.querySelectorAll('.anc-sheet section')].length,compas:!!document.querySelector('.anc-sheet p[class*=compas]'),letraVieja:/esplendor/i.test(document.querySelector('.anc-panel').textContent),notas:document.querySelectorAll('[role=note].anc-aviso-ficha').length,
      ancho:document.documentElement.scrollWidth})`))
    ok(con.acordes.length >= 5 && con.acordes.slice(0, 4).join(' ') === 'G D C D' && con.compas && con.secciones === 3, `${et}: con hoja se ven los acordes (${con.acordes.slice(0, 6).join(' ')}), el interludio con solo acordes y 3 secciones`)
    ok(/Cuán grande/.test(con.h1) && !con.letraVieja, `${et}: el título es el de la canción y ya no se ve la hoja de letra`)
    const bs = await botones(); ok(JSON.stringify(bs) === JSON.stringify(sin.botones), `${et}: los botones son los mismos que sin hoja (${bs.join(' · ')})`)
    ok(telefono ? bs.includes('Editar con acordes') : !bs.includes('Editar con acordes'), `${et}: «Editar con acordes» ${telefono ? 'está (teléfono)' : 'no está (escritorio), como siempre'}`)
    ok(con.lecturas === 1, `${et}: UNA sola lectura de la ruta para la ficha (${con.lecturas}), compartida con el aviso del arreglo`); ok(con.notas === 0, `${et}: sin avisos cuando no hay nada que avisar`)
    ok(con.ancho <= ancho, `${et}: la pantalla no se desliza de lado (${con.ancho} ≤ ${ancho})`)
    await foto('con-hoja')
    // la notación es lo ÚNICO que se escribe
    await esperar(`[...document.querySelectorAll('.anc-sheet button')].find(b=>b.textContent.trim()==='123')`, 'el botón 123')
    await ev(`[...document.querySelectorAll('.anc-sheet button')].find(b=>b.textContent.trim()==='123').click()`); await sleep(400)
    const num = JSON.parse(await ev(`JSON.stringify({a:[...document.querySelectorAll('.anc-sheet [data-a]')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,4),p:window.__patches,e:window.__escrituras})`))
    ok(num.a.join(' ') === '1 5 4 5', `${et}: «123» cambia los acordes a grados (${num.a.join(' ')})`)
    ok(JSON.stringify(num.p) === JSON.stringify([{ lectura: { notation: 'numeros' } }]) && num.e.length === 0, `${et}: lo único que se escribe es la notación de la persona (${JSON.stringify(num.p)}); ninguna otra escritura a /api (${num.e.length})`)
    await foto('con-hoja-numeros')
    await ev(`[...document.querySelectorAll('.anc-sheet button')].find(b=>b.textContent.trim()==='ABC').click()`); await sleep(250)

    // ── avisos ──
    await abrirFicha('avisos')
    const av = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[role=note].anc-aviso-ficha')].map(e=>e.textContent))`))
    ok(av.length === 2 && /no coinciden/.test(av[0]) && /Se muestra la versión principal de 2 secciones que tienen otras versiones\./.test(av[1]), `${et}: los dos avisos (letra distinta y otras versiones) con sus textos`)
    ok((await ev(`document.querySelectorAll('.anc-sheet [data-a]').length`)) >= 5, `${et}: con avisos la hoja se muestra igual`)
    await foto('avisos')
  } finally { await c.cerrar() }
}

;(async () => {
  const SOLO = process.env.SOLO || ''
  for (const [ancho, tema] of [[390, 'light'], [390, 'dark'], [1280, 'light'], [1280, 'dark']].filter(([a, t]) => !SOLO || SOLO === `${a} ${t}`)) {
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
