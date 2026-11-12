// «Nueva canción» paso D («Repetir ×N» y el menú del círculo) en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: un toque en la parte ya activa (o un toque largo en cualquiera) abre la hoja «Parte» con el círculo, el nombre y «Parte 2 de 2»; «Repetir» cuenta de ×1 a ×9 (el «−» apagado en ×1 y el «+» en ×9); Renombrar, Mover (más adelante) y Eliminar parte
// aparecen apagados; la repetición se ve como insignia en el círculo y se conserva al cerrar, al reabrir, al agregar partes y al escribir; Guardar manda `arreglo` (una entrada por parte) SOLO si alguna parte se repite; con arreglo propio (tablero 5b) «Repetir»
// sale apagado, en ×1, con su aviso, y el guardado no manda `arreglo`; la hoja «Agregar parte» trae el consejo de «Repetir». Nada se escribe fuera del insert de la canción y las peticiones de guardado.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/nueva-cancion-paso-d.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/nueva-cancion-paso-d'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const NUEVA_ID = '33333333-3333-4333-8333-333333333333', BORRADOR_ID = '44444444-4444-4444-8444-444444444444'
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__posts=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
const CARGA=id=>({tono:id==='${BORRADOR_ID}'?'D':'F',letra:'',origen:'ninguno',secciones:null,sinConvertir:0,huella:'a'.repeat(32),formatoAntiguo:false,guardadas:null,arregloPropio:id==='${BORRADOR_ID}',actual:{secciones:[],arreglo:[]}});
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
  const MENU = `document.querySelector('[role=dialog][aria-label="Parte"]')`, SHEET = `document.querySelector('[role=dialog][aria-label="Agregar parte"]')`
  const T1 = 'ZZ Prueba repetir', E = ED(T1)
  const TIRA = e => `${e}.querySelector('ul[aria-label="Partes de la canción"]')`, MAS = e => `${e}.querySelector('button[aria-label="Agregar una parte"]')`
  const circ = (e, n) => `[...${TIRA(e)}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte')[${n}]`
  const circulos = e => ev(`JSON.stringify([...${TIRA(e)}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte').map(b=>({t:b.firstChild.textContent,rep:b.getAttribute('data-repetida')==='true'?'p':null,activa:b.getAttribute('aria-current')==='true',aria:b.getAttribute('aria-label')})))`).then(JSON.parse)
  const agregarParte = async (e, nombre, texto) => { await tocar('«+» de la tira', MAS(e)); await esperar(SHEET, 'la hoja «Agregar parte»'); await tocar(nombre, tipo(`${SHEET}.querySelector('[role=group]')`, nombre)); if (texto) { await send('Input.insertText', { text: texto }); await sleep(200) } }
  const menu = () => ev(`(()=>{const m=${MENU};if(!m)return 'null';const bs=[...m.querySelectorAll('button')];const paso=n=>bs.find(b=>b.getAttribute('aria-label')===n);const fila=m.querySelector('[role=group]');
    return JSON.stringify({titulo:m.querySelector('[class*="_nombre__"]').textContent,pos:m.querySelector('[class*="_pos__"]').textContent,circ:m.querySelector('[class*="_circ__"]').textContent,valor:m.querySelector('[role=status]').textContent,menosOff:paso('Una repetición menos').disabled,masOff:paso('Una repetición más').disabled,
      apagada:fila.getAttribute('aria-disabled')==='true',aviso:!!m.querySelector('[role=note]'),avisoTxt:(m.querySelector('[role=note]')||{}).textContent||'',
      acciones:bs.filter(b=>/Renombrar|Mover|Eliminar/.test(b.textContent)).map(b=>[b.textContent.trim(),b.disabled]),altos:bs.map(b=>Math.round(b.getBoundingClientRect().height)),anchos:bs.map(b=>Math.round(b.getBoundingClientRect().width)),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth})})()`).then(JSON.parse)
  const posts = () => ev(`JSON.stringify(window.__posts)`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'la lista de canciones'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)

    // ═════ canción nueva: V1 y C ═════
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), T1); await elegir(campo(V, 'Tonalidad original', 'select'), 'F')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(E, 'el editor de la canción nueva'); await esperar(`${E}.innerText.includes('Empieza por una parte')`, 'la tarjeta'); await sleep(300)
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(`${E}.querySelector('textarea')`, 'el cuadro de texto'); await send('Input.insertText', { text: lineas(4, 'del verso') }); await sleep(250)
    await agregarParte(E, 'Coro', lineas(4, 'del coro'))
    // el consejo de la maqueta en la hoja
    await tocar('«+» de la tira', MAS(E)); await esperar(SHEET, 'la hoja'); ok(await ev(`${SHEET}.innerText.includes('¿El coro se repite con la misma letra? No agregues otro: toca su círculo y elige «Repetir».')`), `${et}: la hoja «Agregar parte» trae el consejo de «Repetir»`); await foto('hoja-consejo')
    await tocar('Cerrar la hoja', `${SHEET}.querySelector('button[aria-label="Cerrar"]')`)

    // ═════ el menú del círculo ═════
    let cs = await circulos(E); ok(cs.length === 2 && cs[1].activa && cs.every(x => x.rep === null), `${et}: V1 y C, ninguna repetida (la activa es «C»)`)
    await tocar('círculo V1 (no activa)', circ(E, 0)); ok(await ev(`!${MENU}`), `${et}: un toque en una parte que NO está activa va a ella, sin abrir el menú`)
    await tocar('círculo C', circ(E, 1)); ok(await ev(`!${MENU}`), `${et}: el primer toque en «C» solo la activa`)
    await tocar('círculo C (activa)', circ(E, 1)); await esperar(MENU, 'el menú del círculo'); await sleep(200); let m = await menu()
    ok(m.titulo === 'CORO' && m.pos === 'Parte 2 de 2' && m.circ === 'C', `${et}: la hoja «Parte» muestra «${m.circ}», «${m.titulo}» y «${m.pos}»`)
    ok(m.valor === '×1' && m.menosOff && !m.masOff && !m.apagada && !m.aviso, `${et}: «Repetir» empieza en ${m.valor}, con «−» apagado y «+» activo`)
    ok(m.acciones.length === 3 && m.acciones.every(([, off]) => off) && m.acciones.some(([t]) => t === 'Mover (más adelante)') && m.acciones.some(([t]) => t === 'Renombrar') && m.acciones.some(([t]) => t === 'Eliminar parte'), `${et}: Renombrar, Mover (más adelante) y Eliminar parte aparecen apagados (${m.acciones.map(x => x[0]).join(', ')})`)
    ok(m.altos.every(x => x >= 44) && m.anchos.every(x => x >= 44), `${et}: todos los botones miden ≥ 44 px (${Math.min(...m.altos)} de alto, ${Math.min(...m.anchos)} de ancho)`); ok(m.sw <= m.cw, `${et}: sin desplazamiento lateral`); await foto('menu-repetir-1')
    const mas = `${MENU}.querySelector('button[aria-label="Una repetición más"]')`, menos = `${MENU}.querySelector('button[aria-label="Una repetición menos"]')`
    await tocar('+', mas); await tocar('+', mas); m = await menu(); ok(m.valor === '×3' && !m.menosOff && !m.masOff, `${et}: dos toques en «+» → ${m.valor}, los dos botones activos`)
    for (let k = 0; k < 6; k++) await tocar('+', mas); m = await menu(); ok(m.valor === '×9' && m.masOff && !m.menosOff, `${et}: llega a ${m.valor} y el «+» se apaga`)
    await tocar('+ (apagado)', mas); m = await menu(); ok(m.valor === '×9', `${et}: pasado de ×9 no sube`); await foto('menu-repetir-9')
    for (let k = 0; k < 7; k++) await tocar('−', menos); m = await menu(); ok(m.valor === '×2', `${et}: de ×9 bajando 7 veces queda en ${m.valor}`)
    await tocar('Cerrar el menú', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250); ok(await ev(`!${MENU}`), `${et}: la X cierra el menú`)
    cs = await circulos(E); ok(cs.map(x => x.t).join() === 'V1,C,C' && cs[2].rep === 'p' && cs[1].rep === null && cs[0].rep === null, `${et}: «C ×2» son DOS círculos seguidos, el segundo con borde punteado (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`); await foto('tira-con-repeticion')
    ok(await ev(`${E}.querySelector('textarea').value.split('CORO:').length===2`), `${et}: la repetición NO creó otra sección «CORO» en el texto`)

    // ── se conserva: reabrir, agregar partes, escribir ──
    await tocar('círculo C (reabrir)', circ(E, 1)); await esperar(MENU, 'el menú'); m = await menu(); ok(m.valor === '×2', `${et}: al reabrir el menú sigue en ${m.valor}`); await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(200)
    await agregarParte(E, 'Verso 2', lineas(3, 'del verso dos')); cs = await circulos(E); ok(cs.map(x => x.t).join() === 'V1,C,C,V2' && cs[2].rep === 'p', `${et}: al agregar «V2» el coro conserva su ×2 y la parte nueva entra al final (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`)
    await ev(`(()=>{const a=${E}.querySelector('textarea');a.focus();const i=a.value.indexOf('Línea 2 de prueba del coro');a.setSelectionRange(i,i)})()`); await send('Input.insertText', { text: 'extra ' }); await sleep(250); cs = await circulos(E); ok(cs.map(x => x.t).join() === 'V1,C,C,V2' && cs[2].rep === 'p', `${et}: escribir dentro de la letra del coro no pierde el ×2`)
    // ── toque largo en otra parte: menú de ESA parte ──
    await mantener('círculo V1 (toque largo)', circ(E, 0), 650); await esperar(MENU, 'el menú por toque largo'); m = await menu(); ok(m.titulo === 'VERSO 1' && m.pos === 'Parte 1 de 4' && m.valor === '×1', `${et}: el toque largo en «V1» abre el menú de «${m.titulo}» (${m.pos}, ${m.valor})`)
    await tocar('fuera del menú (velo)', `document.querySelector('[class*="_velo__"][class*="menu-parte"], ${MENU}.parentElement')`).catch(() => {}); await sleep(250)
    if (await ev(`!!${MENU}`)) await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`)
    ok(await ev(`!${MENU}`), `${et}: el menú se cierra`)
    // ── modo Acordes: el menú sigue funcionando ──
    await tocar('volver a Acordes', `[...${E}.querySelectorAll('button')].find(b=>/Acordes/.test(b.textContent)&&b.className.includes('modoTexto'))`); await esperar(`${E}.querySelectorAll('section[class*="_sec__"]').length>=3`, 'las secciones del modo Acordes'); await sleep(300)
    await tocar('círculo V2', circ(E, 3)); await tocar('círculo V2 (activa)', circ(E, 3)); await esperar(MENU, 'el menú en Acordes'); m = await menu(); ok(m.titulo === 'VERSO 2' && m.pos === 'Parte 4 de 4', `${et}: también en modo Acordes (${m.titulo}, ${m.pos})`); await tocar('+', mas); await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`)
    cs = await circulos(E); ok(cs.map(x => x.t).join() === 'V1,C,C,V2,V2' && cs[2].rep === 'p' && cs[4].rep === 'p', `${et}: ahora «C» y «V2» salen dos veces (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`)

    // ═════ Guardar: arreglo por índice ═════
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    let ps = await posts(), b = ps[0]
    ok(ps.length === 1 && b.songId === NUEVA_ID && Array.isArray(b.estructura) && !('arreglo' in b) && JSON.stringify(b.estructura) === JSON.stringify([{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 2 }]), `${et}: Guardar manda UNA petición con estructura = ${JSON.stringify(b.estructura)}`)
    ok(Object.keys(b).sort().join() === 'base,estructura,letra,secciones,songId,tono' && b.secciones.length === 3, `${et}: el resto del cuerpo es el de siempre (songId, tono, letra, secciones, base) más estructura`)
    await esperar(`!${E}`, 'que el editor se cierre')

    // ═════ sin repeticiones: no se manda arreglo ═════
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), 'ZZ Sin repetir'); await elegir(campo(V, 'Tonalidad original', 'select'), 'F'); await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); const E2 = ED('ZZ Sin repetir'); await esperar(E2, 'el editor 2'); await esperar(`${E2}.innerText.includes('Empieza por una parte')`, 'la tarjeta 2')
    await tocar('Verso 1', tipo(`${E2}.querySelector('section')`, 'Verso 1')); await esperar(`${E2}.querySelector('textarea')`, 'el cuadro'); await send('Input.insertText', { text: lineas(3, 'sola') }); await sleep(250)
    await tocar('círculo V1 (activa)', circ(E2, 0)); await esperar(MENU, 'el menú 2'); await tocar('+', mas); await tocar('−', menos); m = await menu(); ok(m.valor === '×1', `${et}: subir y bajar deja ×1`); await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(200)
    await tocar('Guardar', btn(E2, 'Guardar')); await esperar(`window.__posts.length>=2`, 'la segunda petición'); ps = await posts(); ok(ps.length === 2 && !('arreglo' in ps[1]) && !('estructura' in ps[1]) && Object.keys(ps[1]).sort().join() === 'base,letra,secciones,songId,tono', `${et}: con todo en ×1 NO se manda estructura (la canción queda sin arreglo propio)`)
    await esperar(`!${E2}`, 'que se cierre el editor 2')

    // ═════ con arreglo propio (tablero 5b) ═════
    await tocar('canción «ZZ Borrador con arreglo»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador con arreglo'))`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); const E3 = ED('ZZ Borrador con arreglo'); await esperar(`${E3}&&${E3}.innerText.includes('Empieza por una parte')`, 'el editor del borrador'); await sleep(300)
    await tocar('Verso 1', tipo(`${E3}.querySelector('section')`, 'Verso 1')); await esperar(`${E3}.querySelector('textarea')`, 'el cuadro 3'); await send('Input.insertText', { text: lineas(3, 'con arreglo') }); await sleep(250)
    await tocar('círculo V1 (activa)', circ(E3, 0)); await esperar(MENU, 'el menú del borrador'); await sleep(200); m = await menu()
    ok(m.apagada && m.valor === '×1' && m.menosOff && m.masOff, `${et}: con arreglo propio «Repetir» sale apagado, en ${m.valor} y con los dos botones apagados`)
    ok(m.aviso && m.avisoTxt.includes('Esta canción ya tiene un orden propio guardado. Para no pisarlo, «Repetir» no se puede cambiar aquí.'), `${et}: sale el aviso del tablero 5b`); await foto('menu-arreglo-propio')
    await tocar('+ (apagado)', `${MENU}.querySelector('button[aria-label="Una repetición más"]')`); m = await menu(); ok(m.valor === '×1', `${et}: tocar un botón apagado no cambia nada`)
    await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(200)
    await tocar('Guardar', btn(E3, 'Guardar')); await esperar(`window.__posts.length>=3`, 'la tercera petición'); ps = await posts(); ok(ps.length === 3 && !('arreglo' in ps[2]) && !('estructura' in ps[2]), `${et}: con arreglo propio el guardado NO manda estructura`)

    const e = await ev(`JSON.stringify(window.__escrituras)`).then(JSON.parse); ok(e.filter(x => x.m === 'POST').length === 2 && e.every(x => x.m === 'POST'), `${et}: en toda la prueba dos inserts de canción (las dos nuevas) y ninguna otra escritura`)
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
