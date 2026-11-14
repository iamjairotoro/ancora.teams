// Estructura de «Nueva canción» · S6-B («Renombrar») en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: «Renombrar» abre la hoja «Renombrar parte» (la hoja de tipos de «Parte nueva», con el nombre que recibiría ESA parte); elegir un tipo cambia el encabezado de esa sección en el texto y REMAPEA la estructura: cada referencia mantiene su lugar (VERSO 2 → CORO con dos coros más, las apariciones siguen donde estaban);
// elegir el mismo nombre no cambia nada; cerrar la hoja tampoco; Deshacer restaura el texto Y la estructura y Rehacer vuelve a renombrar; Guardar manda la estructura con los índices de siempre; con arreglo propio «Renombrar» sigue apagado.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/estructura-s6b-renombrar.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/estructura-s6b-renombrar'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const NUEVA_ID = '33333333-3333-4333-8333-333333333333', BORRADOR_ID = '44444444-4444-4444-8444-444444444444'
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__posts=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
const CARGA=id=>({tono:id==='${BORRADOR_ID}'?'D':'F',letra:'',origen:'ninguno',secciones:null,sinConvertir:0,huella:'a'.repeat(32),formatoAntiguo:false,guardadas:null,arregloPropio:id==='${BORRADOR_ID}',estructuraGuardada:id==='${BORRADOR_ID}'?[{indice:0,repeat:2},{indice:1,repeat:1},{indice:0,repeat:1}]:null,actual:{secciones:[],arreglo:[]}});
let n=0;
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.endsWith('/rest/v1/songs')&&m!=='GET'){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch{}
 window.__escrituras.push({m,b,q:url.search});
 if(m==='POST'){n++;return j({id:n===1?'${NUEVA_ID}':'${NUEVA_ID}'.replace('3333','5555'),created_at:'2026-11-10',...b},201)}
 if(m==='PATCH'){const id=(url.searchParams.get('id')||'').replace('eq.','');return j({id,created_at:'2026-11-09',...b},200)}}
if(m!=='GET'&&m!=='HEAD'&&url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/rpc/')){window.__escrituras.push({m,otra:url.pathname});return j([])}
if(url.pathname.startsWith('/api/admin/canciones/acordes')){if(m==='GET')return j({cancion:CARGA(url.searchParams.get('id')),hojaFicha:null});window.__posts.push(JSON.parse(o.body));return j({ok:true,huella:'b'.repeat(32)})}
const r=await f(i,o);
if(url.pathname.endsWith('/rest/v1/songs')&&m==='GET'&&(url.searchParams.get('select')||'')==='*'){const rows=await r.clone().json();if(Array.isArray(rows)){rows.push({id:'${BORRADOR_ID}',nombre:'ZZ Borrador con arreglo',artista:'Grupo Inventado',tono_original:'D',bpm:70,publicada:false,letra:null,created_at:'2026-11-09'});return j(rows)}}
return r}})()`
const lineas = (n, quien) => Array.from({ length: n }, (_, i) => `Línea ${i + 1} de prueba ${quien}`).join('\n')

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
  const posicion = buscar => ev(`(()=>{const e=${buscar};if(!e)return 'null';e.scrollIntoView({block:'nearest',inline:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`).then(JSON.parse)
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); r = await posicion(buscar); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300)
  }
  const mantener = async (nombre, buscar, ms) => {
    paso = `mantener «${nombre}»`; await esperar(buscar, nombre); const r = await posicion(buscar)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(ms); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300)
  }
  const escribir = async (sel, texto) => { await ev(`(${sel}).focus()`); await send('Input.insertText', { text: texto }); await sleep(150) }
  const elegir = async (sel, valor) => { await ev(`(()=>{const s=${sel};const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(valor)});s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(120) }
  const V = `document.querySelector('[role=dialog][aria-label="Nueva canción"]')`
  const ED = t => `document.querySelector('[role=dialog][aria-label=${JSON.stringify(t)}]')`
  const btn = (raiz, txt) => `[...${raiz}.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(txt)}))`
  const campo = (raiz, etq, tag = 'input') => `[...${raiz}.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(etq)}))?.querySelector('${tag}')`
  const tipo = (raiz, nombre) => `[...${raiz}.querySelectorAll('button')].find(b=>b.lastElementChild&&b.lastElementChild.textContent.trim()===${JSON.stringify(nombre)})`
  const MENU = `document.querySelector('[role=dialog][aria-label="Parte"]')`, SHEET = `document.querySelector('[role=dialog][aria-label="Agregar a la estructura"]')`
  const T1 = 'ZZ Prueba repetir', E = ED(T1)
  const TIRA = e => `${e}.querySelector('ul[aria-label="Partes de la canción"]')`, MAS = e => `${e}.querySelector('button[aria-label="Agregar una parte"]')`
  const circ = (e, n) => `[...${TIRA(e)}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte')[${n}]`
  const circulos = e => ev(`JSON.stringify([...${TIRA(e)}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte').map(b=>({t:b.firstChild.textContent,rep:b.getAttribute('data-repetida')==='true'?'p':null,activa:b.getAttribute('aria-current')==='true',aria:b.getAttribute('aria-label')})))`).then(JSON.parse)
  const agregarParte = async (e, nombre, texto) => { await tocar('«+» de la tira', MAS(e)); await esperar(SHEET, 'la hoja «Agregar parte»'); await tocar(nombre, tipo(`${SHEET}.querySelector('[role=group][aria-label="Parte nueva"]')`, nombre)); if (texto) { await send('Input.insertText', { text: texto }); await sleep(200) } }
  const abrirMenu = async (e, n) => { await tocar(`círculo ${n + 1}`, circ(e, n)); if (!(await ev(`!!${MENU}`))) await tocar(`círculo ${n + 1} (activo)`, circ(e, n)); await esperar(MENU, `el menú del círculo ${n + 1}`) }
  const menu = () => ev(`(()=>{const m=${MENU};if(!m)return 'null';const bs=[...m.querySelectorAll('button')];const acc=bs.filter(b=>b.getAttribute('aria-label')!=='Cerrar');
    return JSON.stringify({titulo:m.querySelector('[class*="_nombre__"]').textContent,pos:m.querySelector('[class*="_pos__"]').textContent,circ:m.querySelector('[class*="_circ__"]').textContent,aviso:(m.querySelector('[role=note]')||{}).textContent||'',
      acciones:acc.map(b=>[(b.querySelector('[class*="_titulo__"]')||{}).textContent||b.getAttribute('aria-label'),b.disabled,(b.querySelector('[class*="_ayuda__"]')||{}).textContent||'']),altos:bs.map(b=>Math.round(b.getBoundingClientRect().height)),anchos:bs.map(b=>Math.round(b.getBoundingClientRect().width)),
      sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,fondo:Math.round(m.getBoundingClientRect().bottom),vh:innerHeight})})()`).then(x => (x === 'null' ? null : JSON.parse(x)))
  const accion = (nombre) => `[...${MENU}.querySelectorAll('button')].find(b=>(b.querySelector('[class*="_titulo__"]')||{}).textContent===${JSON.stringify(nombre)}||b.getAttribute('aria-label')===${JSON.stringify(nombre)})`
  const posts = () => ev(`JSON.stringify(window.__posts)`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'la lista de canciones'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)




    // ═════ canción nueva: V1, C y V2; el coro dos veces y V2 dos veces ═════
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), T1); await elegir(campo(V, 'Tonalidad original', 'select'), 'F')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(E, 'el editor de la canción nueva'); await esperar(`${E}.innerText.includes('Empieza por una parte')`, 'la tarjeta'); await sleep(300)
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(`${E}.querySelector('textarea')`, 'el cuadro de texto'); await send('Input.insertText', { text: lineas(10, 'del verso') }); await sleep(250)
    await agregarParte(E, 'Coro', lineas(10, 'del coro')); await agregarParte(E, 'Verso 2', lineas(10, 'del verso dos'))
    const txt = () => ev(`${E}.querySelector('textarea')?${E}.querySelector('textarea').value:null`), forma = async () => (await circulos(E)).map(x => x.t + (x.rep ? '*' : '')).join(' ')
    const CERRAR = `${MENU}.querySelector('button[aria-label="Cerrar"]')`, HOJA = `document.querySelector('[role=dialog][aria-label="Renombrar parte"]')`
    await abrirMenu(E, 1); await tocar('Repetir aquí', accion('Repetir aquí')); await sleep(250)
    await tocar('«+» de la tira', MAS(E)); await esperar(SHEET, 'la hoja'); await tocar('Verso 2 (volver a usar)', `[...${SHEET}.querySelectorAll('[role=group][aria-label="Volver a usar una parte"] button')].find(b=>b.lastElementChild.textContent.trim()==='Verso 2')`); await sleep(350)
    ok((await forma()) === 'V1 C C* V2 V2*', `${et}: punto de partida V1 C C V2 V2 (${await forma()})`)
    const texto0 = await txt(), DESH = `${E}.querySelector('button[aria-label="Deshacer"]')`, REH = `${E}.querySelector('button[aria-label="Rehacer"]')`
    const hoja = () => ev(`(()=>{const h=${HOJA};if(!h)return 'null';const g=h.querySelector('[role=group]');return JSON.stringify({titulo:h.querySelector('h2').textContent,grupo:g.getAttribute('aria-label'),tipos:[...g.querySelectorAll('button')].map(b=>b.lastElementChild.textContent.trim()),altos:[...h.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height)),secs:h.querySelectorAll('h3').length,txt:h.innerText,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,fondo:Math.round(h.getBoundingClientRect().bottom),vh:innerHeight})})()`).then(x => (x === 'null' ? null : JSON.parse(x)))

    // ═════ la hoja «Renombrar parte» ═════
    await abrirMenu(E, 3); let m = await menu(); const ren = m.acciones.find(x => x[0] === 'Renombrar'); ok(!ren[1], `${et}: «Renombrar» está activo`)
    await tocar('Renombrar', accion('Renombrar')); await esperar(HOJA, 'la hoja «Renombrar parte»'); await sleep(250); let hj = await hoja()
    ok(await ev(`!${MENU}`), `${et}: el menú se cierra al abrir la hoja`); ok(hj.titulo === 'Renombrar parte' && hj.grupo === 'Renombrar parte' && hj.secs === 0, `${et}: la hoja se llama «${hj.titulo}», sin el título de «Volver a usar» ni de «Parte nueva»`)
    ok(hj.tipos.join('|') === 'Verso 2|Pre-coro|Coro|Puente|Interludio|Instrumental|Tag|Final', `${et}: ofrece el nombre que recibiría ESTA parte (${hj.tipos.join(', ')})`)
    ok(hj.altos.every(x => x >= 44) && hj.sw <= hj.cw && hj.fondo <= hj.vh + 1, `${et}: todo mide ≥ 44 px y cabe en la pantalla`); await foto('hoja-renombrar')
    // cerrar con la X no cambia nada
    await tocar('Cerrar la hoja', `${HOJA}.querySelector('button[aria-label="Cerrar"]')`); await sleep(300)
    ok(await ev(`!${HOJA}`) && (await txt()) === texto0 && (await forma()) === 'V1 C C* V2 V2*', `${et}: cerrar la hoja con la X no cambia nada`)

    // ═════ elegir «Coro»: VERSO 2 pasa a ser CORO y sus apariciones se quedan donde estaban ═════
    await abrirMenu(E, 3); await tocar('Renombrar', accion('Renombrar')); await esperar(HOJA, 'la hoja'); await tocar('Coro', `[...${HOJA}.querySelectorAll('[role=group] button')].find(b=>b.lastElementChild.textContent.trim()==='Coro')`); await sleep(400)
    const t1 = await txt(); ok(await ev(`!${HOJA}`), `${et}: elegir un tipo cierra la hoja`)
    ok(t1 !== null && !t1.includes('VERSO 2') && t1.split('CORO:').length === 3 && t1.includes('CORO:\nLínea 1 de prueba del verso dos'), `${et}: el encabezado cambió y la letra quedó donde estaba (dos «CORO:»)`)
    ok((await forma()) === 'V1 C C* C C*', `${et}: las 5 apariciones siguen en su lugar: V1, C, C, [ex-V2] C, [ex-V2] C (${await forma()})`)
    let cs = await circulos(E); ok(cs[3].rep === null && cs[4].rep === 'p' && cs[2].rep === 'p', `${et}: el borde punteado marca la segunda aparición de CADA coro (${cs.map(x => x.rep ? 'p' : '-').join('')})`); await foto('despues-de-renombrar')
    const aria = cs.map(x => x.aria).join('|'); ok(aria === 'VERSO 1, lugar 1 de 5|CORO, lugar 2 de 5|CORO, lugar 3 de 5|CORO, lugar 4 de 5|CORO, lugar 5 de 5', `${et}: nombres accesibles (${aria})`)

    // ═════ Deshacer y Rehacer restauran texto Y estructura ═════
    await tocar('Deshacer', DESH); await sleep(400)
    ok((await txt()) === texto0 && (await forma()) === 'V1 C C* V2 V2*', `${et}: Deshacer devuelve «VERSO 2» y la estructura (${await forma()})`)
    await tocar('Rehacer', REH); await sleep(400); ok((await forma()) === 'V1 C C* C C*' && (await txt()) === t1, `${et}: Rehacer vuelve a renombrar (${await forma()})`)

    // ═════ elegir el mismo nombre: no cambia nada ═════
    await abrirMenu(E, 1); await tocar('Renombrar', accion('Renombrar')); await esperar(HOJA, 'la hoja'); hj = await hoja(); ok(hj.tipos.includes('Coro'), `${et}: ofrece «Coro» para el coro`)
    await tocar('Coro', `[...${HOJA}.querySelectorAll('[role=group] button')].find(b=>b.lastElementChild.textContent.trim()==='Coro')`); await sleep(350)
    ok(await ev(`!${HOJA}`) && (await txt()) === t1 && (await forma()) === 'V1 C C* C C*', `${et}: elegir el mismo nombre cierra la hoja y no cambia nada`)

    // ═════ renombrar el verso 1 a Puente ═════
    await abrirMenu(E, 0); await tocar('Renombrar', accion('Renombrar')); await esperar(HOJA, 'la hoja'); await tocar('Puente', `[...${HOJA}.querySelectorAll('[role=group] button')].find(b=>b.lastElementChild.textContent.trim()==='Puente')`); await sleep(400)
    const t2 = await txt(); ok(t2.startsWith('PUENTE:\nLínea 1 de prueba del verso') && (await forma()) === 'Bd C C* C C*', `${et}: VERSO 1 → PUENTE; sigue primero, con otro color y abreviatura (${await forma()})`)

    // ═════ Guardar ═════
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    let ps = await posts(), b = ps[0]
    ok(ps.length === 1 && JSON.stringify(b.estructura) === JSON.stringify([{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 2 }]) && b.secciones.length === 3 && b.letra.startsWith('PUENTE:'), `${et}: Guardar manda 3 secciones y estructura = ${JSON.stringify(b.estructura)} (cada coro con sus 2 apariciones)`)
    await esperar(`!${E}`, 'que el editor se cierre')

    // ═════ con arreglo propio: «Renombrar» apagado ═════
    await tocar('canción «ZZ Borrador con arreglo»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador con arreglo'))`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); const E3 = ED('ZZ Borrador con arreglo'); await esperar(`${E3}&&${E3}.innerText.includes('Empieza por una parte')`, 'el editor del borrador'); await sleep(300)
    await tocar('Verso 1', tipo(`${E3}.querySelector('section')`, 'Verso 1')); await esperar(`${E3}.querySelector('textarea')`, 'el cuadro 3'); await send('Input.insertText', { text: lineas(3, 'con arreglo') }); await sleep(250)
    await abrirMenu(E3, 0); m = await menu(); ok(m.acciones.find(x => x[0] === 'Renombrar')[1], `${et}: con arreglo propio «Renombrar» sigue apagado`)
    await tocar('Renombrar (apagado)', accion('Renombrar')); await sleep(300); ok(await ev(`!${HOJA}`) && await ev(`!!${MENU}`), `${et}: tocarlo no abre la hoja`)
    await tocar('Cerrar', CERRAR); await sleep(250)
    await tocar('Guardar', btn(E3, 'Guardar')); await esperar(`window.__posts.length>=2`, 'la segunda petición'); ps = await posts(); ok(ps.length === 2 && !('estructura' in ps[1]), `${et}: con arreglo propio el guardado NO manda estructura`)

    const e = await ev(`JSON.stringify(window.__escrituras)`).then(JSON.parse); ok(e.filter(x => x.m === 'POST').length === 1 && e.every(x => x.m === 'POST'), `${et}: en toda la prueba un insert de canción y ninguna otra escritura`)
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
