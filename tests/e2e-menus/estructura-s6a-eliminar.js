// Estructura de «Nueva canción» · S6-A («Eliminar sección») en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: «Eliminar sección» abre el diálogo («¿Eliminar «CORO»?», «Se borra su letra y sus acordes, y sus 3 apariciones en la estructura. Puedes deshacerlo antes de guardar.», botones «Eliminar» en rojo y «Cancelar») sin borrar de una; Cancelar no cambia nada; Eliminar borra el texto de la sección
// y TODAS sus referencias (las demás siguen en su lugar); Deshacer restaura el texto Y la estructura, y Rehacer vuelve a borrarla; con una sola aparición dice «su única aparición»; Guardar manda la estructura sin la sección; con arreglo propio «Eliminar sección» sigue apagada.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/estructura-s6a-eliminar.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/estructura-s6a-eliminar'
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



    // ═════ canción nueva: V1, C y V2; el coro tres veces y V1 otra vez al final ═════
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), T1); await elegir(campo(V, 'Tonalidad original', 'select'), 'F')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(E, 'el editor de la canción nueva'); await esperar(`${E}.innerText.includes('Empieza por una parte')`, 'la tarjeta'); await sleep(300)
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(`${E}.querySelector('textarea')`, 'el cuadro de texto'); await send('Input.insertText', { text: lineas(10, 'del verso') }); await sleep(250)
    await agregarParte(E, 'Coro', lineas(10, 'del coro')); await agregarParte(E, 'Verso 2', lineas(10, 'del verso dos'))
    const txt = () => ev(`${E}.querySelector('textarea')?${E}.querySelector('textarea').value:null`), forma = async () => (await circulos(E)).map(x => x.t + (x.rep ? '*' : '')).join(' ')
    const CERRAR = `${MENU}.querySelector('button[aria-label="Cerrar"]')`, DLG = `document.querySelector('[role=alertdialog]')`
    await abrirMenu(E, 1); await tocar('Repetir aquí', accion('Repetir aquí')); await sleep(250); await abrirMenu(E, 2); await tocar('Repetir aquí', accion('Repetir aquí')); await sleep(250)
    await tocar('«+» de la tira', MAS(E)); await esperar(SHEET, 'la hoja'); await tocar('Verso 1 (volver a usar)', `[...${SHEET}.querySelectorAll('[role=group][aria-label="Volver a usar una parte"] button')].find(b=>b.lastElementChild.textContent.trim()==='Verso 1')`); await sleep(350)
    ok((await forma()) === 'V1 C C* C* V2 V1*', `${et}: punto de partida V1 C C C V2 V1 (${await forma()})`)
    const texto0 = await txt()
    const dialogo = () => ev(`(()=>{const d=${DLG};if(!d)return 'null';const bs=[...d.querySelectorAll('button')];const r=d.getBoundingClientRect();return JSON.stringify({titulo:d.querySelector('h3').textContent,cuerpo:d.querySelector('p').textContent.replace(/\\s+/g,' ').trim(),botones:bs.map(b=>[b.textContent.trim(),getComputedStyle(b).backgroundColor,getComputedStyle(b).color,Math.round(b.getBoundingClientRect().height)]),dentro:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})})()`).then(x => (x === 'null' ? null : JSON.parse(x)))

    // ═════ el diálogo ═════
    await abrirMenu(E, 1); let m = await menu(); const el = m.acciones.find(x => x[0] === 'Eliminar sección')
    ok(!el[1] && el[2] === 'Borra la letra y sus 3 apariciones', `${et}: «Eliminar sección» está activa («${el[2]}»)`)
    await tocar('Eliminar sección', accion('Eliminar sección')); await esperar(DLG, 'el diálogo'); await sleep(250); let d = await dialogo()
    ok(await ev(`!${MENU}`), `${et}: el menú se cierra al abrir el diálogo`); ok((await txt()) === texto0 && (await forma()) === 'V1 C C* C* V2 V1*', `${et}: abrir el diálogo NO borra nada todavía`)
    ok(d.titulo === '¿Eliminar «CORO»?', `${et}: título «${d.titulo}»`); ok(d.cuerpo === 'Se borra su letra y sus acordes, y sus 3 apariciones en la estructura. Puedes deshacerlo antes de guardar.', `${et}: cuerpo «${d.cuerpo}»`)
    ok(d.botones.map(x => x[0]).join('|') === 'Eliminar|Cancelar', `${et}: botones ${d.botones.map(x => x[0]).join(' y ')}`); ok(d.botones[0][1] === 'rgb(201, 42, 42)' && d.botones[0][2] === 'rgb(255, 255, 255)', `${et}: «Eliminar» es rojo con texto blanco (${d.botones[0][1]})`)
    ok(d.botones.every(x => x[3] >= 44) && d.dentro && d.sw <= d.cw, `${et}: botones ≥ 44 px, el diálogo cabe en pantalla y no hay desplazamiento lateral`); await foto('dialogo-eliminar')

    // ═════ Cancelar: no cambia nada ═════
    await tocar('Cancelar', `[...${DLG}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cancelar')`); await sleep(300)
    ok(await ev(`!${DLG}`) && (await txt()) === texto0 && (await forma()) === 'V1 C C* C* V2 V1*', `${et}: Cancelar cierra el diálogo y no cambia el texto ni la estructura`)

    // ═════ una parte con una sola aparición: «su única aparición» ═════
    await abrirMenu(E, 4); await tocar('Eliminar sección', accion('Eliminar sección')); await esperar(DLG, 'el diálogo de V2'); d = await dialogo()
    ok(d.titulo === '¿Eliminar «VERSO 2»?' && d.cuerpo === 'Se borra su letra y sus acordes, y su única aparición en la estructura. Puedes deshacerlo antes de guardar.', `${et}: con una aparición dice «${d.cuerpo}»`)
    await tocar('Cancelar', `[...${DLG}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cancelar')`); await sleep(250)

    // ═════ Eliminar el coro ═════
    await abrirMenu(E, 1); await tocar('Eliminar sección', accion('Eliminar sección')); await esperar(DLG, 'el diálogo'); await tocar('Eliminar', `[...${DLG}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Eliminar')`); await sleep(400)
    const t1 = await txt(); ok(await ev(`!${DLG}`) && t1 !== null && !t1.includes('CORO') && !t1.includes('del coro') && t1.includes('VERSO 1:') && t1.includes('VERSO 2:'), `${et}: se borró el texto del coro (encabezado y letra) y quedaron los versos`)
    ok((await forma()) === 'V1 V2 V1*', `${et}: y sus 3 apariciones; V1, V2 y V1 siguen en su lugar (${await forma()})`)
    const cab = await ev(`${E}.querySelector('[class*="_estructuraCab__"]').innerText.replace(/\\s+/g,' ').trim()`); ok(/^estructura · 3 partes borde punteado = se repite$/i.test(cab), `${et}: cabecera «${cab}»`); await foto('despues-de-eliminar')
    const DESH = `${E}.querySelector('button[aria-label="Deshacer"]')`, REH = `${E}.querySelector('button[aria-label="Rehacer"]')`

    // ═════ Deshacer y Rehacer restauran texto Y estructura ═════
    ok(await ev(`!${DESH}.disabled`), `${et}: «Deshacer» está disponible`); await tocar('Deshacer', DESH); await sleep(400)
    ok((await txt()) === texto0 && (await forma()) === 'V1 C C* C* V2 V1*', `${et}: Deshacer devuelve la letra del coro Y sus 3 apariciones, cada una en su lugar (${await forma()})`)
    await tocar('Rehacer', REH); await sleep(400); ok((await forma()) === 'V1 V2 V1*' && !(await txt()).includes('CORO'), `${et}: Rehacer vuelve a eliminar el coro y sus apariciones (${await forma()})`)
    await tocar('Deshacer', DESH); await sleep(300); await tocar('Rehacer', REH); await sleep(300); ok((await forma()) === 'V1 V2 V1*', `${et}: deshacer y rehacer varias veces es estable`)

    // ═════ Guardar: sin la sección ═════
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    let ps = await posts(), b = ps[0]
    ok(ps.length === 1 && JSON.stringify(b.estructura) === JSON.stringify([{ indice: 0, repeat: 1 }, { indice: 1, repeat: 1 }, { indice: 0, repeat: 1 }]) && b.secciones.length === 2 && !b.letra.includes('CORO'), `${et}: Guardar manda 2 secciones y estructura = ${JSON.stringify(b.estructura)}`)
    await esperar(`!${E}`, 'que el editor se cierre')

    // ═════ con arreglo propio: «Eliminar sección» apagada ═════
    await tocar('canción «ZZ Borrador con arreglo»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador con arreglo'))`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); const E3 = ED('ZZ Borrador con arreglo'); await esperar(`${E3}&&${E3}.innerText.includes('Empieza por una parte')`, 'el editor del borrador'); await sleep(300)
    await tocar('Verso 1', tipo(`${E3}.querySelector('section')`, 'Verso 1')); await esperar(`${E3}.querySelector('textarea')`, 'el cuadro 3'); await send('Input.insertText', { text: lineas(3, 'con arreglo') }); await sleep(250)
    await abrirMenu(E3, 0); m = await menu(); const el3 = m.acciones.find(x => x[0] === 'Eliminar sección'); ok(el3[1], `${et}: con arreglo propio «Eliminar sección» sigue apagada`)
    await tocar('Eliminar sección (apagada)', accion('Eliminar sección')); await sleep(300); ok(await ev(`!${DLG}`) && await ev(`!!${MENU}`), `${et}: tocarla no abre el diálogo`)
    await tocar('Cerrar', CERRAR); await sleep(250)
    await tocar('Guardar', btn(E3, 'Guardar')); await esperar(`window.__posts.length>=2`, 'la segunda petición'); ps = await posts(); ok(ps.length === 2 && !('estructura' in ps[1]) && !('arreglo' in ps[1]), `${et}: con arreglo propio el guardado NO manda estructura`)

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
