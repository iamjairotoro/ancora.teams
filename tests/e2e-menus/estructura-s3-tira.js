// Estructura de «Nueva canción» · S3 (la tira ES la estructura) en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: la cabecera «ESTRUCTURA · N PARTES» (y «Borde punteado = se repite» solo si hay repetidas); un círculo por aparición, con borde punteado desde la segunda (estilo calculado); el nombre accesible «Coro, lugar 3 de 5»; tocar el 3.er círculo lo activa y lleva a SU parte,
// otro toque abre el menú de ESE lugar; la parte activa sigue al desplazamiento (el paso tocado se conserva si ya es de esa parte); la nota «Esta letra se usa N veces…» bajo el nombre de la parte repetida (modo Acordes); una estructura larga no desborda la página;
// Guardar manda `estructura` (entradas {indice, repeat}) solo si no es la de por defecto; con arreglo propio la estructura guardada se muestra de solo lectura y el guardado no manda nada. Nada se escribe fuera del insert de la canción y las peticiones de guardado.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/estructura-s3-tira.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/estructura-s3-tira'
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

    // ═════ canción nueva: V1, C y V2 ═════
    await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200)
    await escribir(campo(V, 'Título'), T1); await elegir(campo(V, 'Tonalidad original', 'select'), 'F')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(E, 'el editor de la canción nueva'); await esperar(`${E}.innerText.includes('Empieza por una parte')`, 'la tarjeta'); await sleep(300)
    const CAB = `${E}.querySelector('[class*="_estructuraCab__"]')`
    ok(await ev(`!!${CAB}&&${CAB}.innerText.trim()===''`), `${et}: sin partes la cabecera de la estructura está vacía (pero reserva su sitio)`)
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(`${E}.querySelector('textarea')`, 'el cuadro de texto'); await send('Input.insertText', { text: lineas(12, 'del verso') }); await sleep(250)
    await agregarParte(E, 'Coro', lineas(12, 'del coro')); await agregarParte(E, 'Verso 2', lineas(12, 'del verso dos'))
    let cs = await circulos(E), cab = await ev(`${CAB}.innerText.replace(/\\s+/g,' ').trim()`)
    ok(cs.map(x => x.t).join() === 'V1,C,V2' && cs.every(x => x.rep === null), `${et}: la estructura por defecto: V1, C, V2, ninguna repetida`)
    ok(/^estructura · 3 partes$/i.test(cab) && !/punteado/.test(cab), `${et}: la cabecera dice «${cab}» y no trae la leyenda del borde`)
    ok(cs.map(x => x.aria).join('|') === 'VERSO 1, lugar 1 de 3|CORO, lugar 2 de 3|VERSO 2, lugar 3 de 3', `${et}: nombres accesibles con el lugar (${cs.map(x => x.aria).join(' | ')})`); await foto('estructura-por-defecto')

    // ═════ el coro se usa 3 veces (por «Repetir ×N», que sigue en el menú hasta S5) ═════
    await tocar('círculo C', circ(E, 1)); await tocar('círculo C (activa)', circ(E, 1)); await esperar(MENU, 'el menú del círculo'); const mas = `${MENU}.querySelector('button[aria-label="Una repetición más"]')`
    await tocar('+', mas); await tocar('+', mas); await tocar('Cerrar el menú', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250)
    cs = await circulos(E); cab = await ev(`${CAB}.innerText.replace(/\\s+/g,' ').trim()`)
    ok(cs.map(x => x.t).join() === 'V1,C,C,C,V2' && cs.map(x => x.rep ? 'p' : '-').join('') === '--pp-', `${et}: tres círculos «C»: el 1.º liso, el 2.º y el 3.º punteados (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`)
    ok(/^estructura · 5 partes borde punteado = se repite$/i.test(cab), `${et}: «${cab}»: la leyenda del borde aparece porque hay repetidas`)
    const bordes = await ev(`JSON.stringify([...${TIRA(E)}.querySelectorAll('li button')].filter(b=>b.getAttribute('aria-label')!=='Agregar una parte').map(b=>getComputedStyle(b).borderTopStyle))`).then(JSON.parse)
    ok(bordes.join() === 'solid,solid,dashed,dashed,solid', `${et}: el borde calculado: ${bordes.join(' ')}`); ok(cs[3].aria === 'CORO, lugar 4 de 5', `${et}: el 4.º círculo se llama «${cs[3].aria}»`); await foto('estructura-coro-tres')
    ok(await ev(`document.documentElement.scrollWidth<=document.documentElement.clientWidth`), `${et}: sin desplazamiento lateral de la página`)

    // ── tocar el 3.er círculo (el 2.º coro repetido): se activa ÉL y lleva al coro ──
    await tocar('Volver a Acordes', `[...${E}.querySelectorAll('button')].find(b=>/Acordes/.test(b.textContent)&&b.className.includes('modoTexto'))`).catch(() => {}); await esperar(`${E}.querySelectorAll('section[class*="_sec__"]').length>=3`, 'las secciones del modo Acordes'); await sleep(300)
    const notas = () => ev(`JSON.stringify([...${E}.querySelectorAll('section[class*="_sec__"]')].map(s=>({n:(s.querySelector('button[class*="_secNombre__"]')||{}).textContent||'',nota:(s.querySelector('[role=note]')||{}).textContent||null})))`).then(JSON.parse)
    let nt = await notas(); ok(nt.length === 3 && nt[1].nota === 'Esta letra se usa 3 veces en la estructura. Se escribe una sola vez.' && nt[0].nota === null && nt[2].nota === null, `${et}: la nota de usos solo sale bajo el CORO («${nt[1].nota}»)`)
    await tocar('círculo 4 (el 3.er coro)', circ(E, 3)); await sleep(500); cs = await circulos(E)
    ok(cs.map(x => x.activa ? 'A' : '-').join('') === '---A-', `${et}: tocar el 4.º círculo lo deja activo a ÉL, no al primer coro (${cs.map(x => x.activa ? 'A' : '-').join('')})`)
    ok(await ev(`!${MENU}`), `${et}: el primer toque en un círculo que no estaba activo no abre el menú`)
    const sec1 = await ev(`(()=>{const c=${E}.querySelector('[class*="_cuerpo__"]'),s=${E}.querySelectorAll('section[class*="_sec__"]')[1];return Math.round(s.getBoundingClientRect().top-c.getBoundingClientRect().top)+0})()`); ok(typeof sec1 === 'number' && sec1 <= 24 && sec1 >= -2, `${et}: el cuerpo llevó al CORO a la parte de arriba (${sec1} px)`)
    await tocar('círculo 4 (activo)', circ(E, 3)); await esperar(MENU, 'el menú del lugar 4'); let m = await menu(); ok(m.titulo === 'CORO' && m.pos === 'Parte 4 de 5' && m.valor === '×3', `${et}: el menú es el del lugar 4 («${m.titulo}», «${m.pos}», ${m.valor})`)
    await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250)

    // ── la parte activa sigue al desplazamiento ──
    await ev(`(()=>{const c=${E}.querySelector('[class*="_cuerpo__"]');c.scrollTop=c.scrollHeight/2})()`); await sleep(300); await ev(`(()=>{const c=${E}.querySelector('[class*="_cuerpo__"]');c.scrollTop=c.scrollHeight})()`); await sleep(500); cs = await circulos(E)
    ok(cs[4].activa && cs.filter(x => x.activa).length === 1, `${et}: al desplazar hasta el VERSO 2 se activa su círculo (${cs.map(x => x.activa ? 'A' : '-').join('')})`)
    await ev(`(()=>{const c=${E}.querySelector('[class*="_cuerpo__"]');c.scrollTop=0})()`); await sleep(500); cs = await circulos(E); ok(cs[0].activa && cs.filter(x => x.activa).length === 1, `${et}: de vuelta arriba se activa «V1» (${cs.map(x => x.activa ? 'A' : '-').join('')})`)
    const aCoroDesplazando = async () => { await ev(`(()=>{const c=${E}.querySelector('[class*="_cuerpo__"]');c.scrollTop=2})()`); await sleep(300); await ev(`(()=>{const c=${E}.querySelector('[class*="_cuerpo__"]');const s=c.querySelectorAll('section[class*="_sec__"]')[1];c.scrollTop+=s.getBoundingClientRect().top-c.getBoundingClientRect().top})()`); await sleep(500); return circulos(E) }
    cs = await aCoroDesplazando(); ok(cs.map(x => x.activa ? 'A' : '-').join('') === '---A-', `${et}: al llegar al CORO desplazando, sigue activo el círculo del coro que se tocó antes (${cs.map(x => x.activa ? 'A' : '-').join('')})`)
    await tocar('círculo V1', circ(E, 0)); await sleep(400); cs = await aCoroDesplazando(); ok(cs.map(x => x.activa ? 'A' : '-').join('') === '-A---', `${et}: si lo último tocado era de otra parte, al llegar al CORO desplazando se activa su PRIMER círculo (${cs.map(x => x.activa ? 'A' : '-').join('')})`)

    // ── una estructura larga (C ×9) sigue sin desbordar la página y la activa queda a la vista ──
    await abrirMenu(E, 1); for (let k = 0; k < 6; k++) await tocar('+', mas); m = await menu(); ok(m.valor === '×9' && m.masOff, `${et}: C llega a ×9 y el «+» se apaga`)
    await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250); cs = await circulos(E); ok(cs.length === 11, `${et}: la tira tiene ${cs.length} círculos`)
    ok(await ev(`document.documentElement.scrollWidth<=document.documentElement.clientWidth`), `${et}: la tira larga no desborda la página`)
    await tocar('círculo 11 (V2)', circ(E, 10)); await sleep(500); const vis = await ev(`(()=>{const u=${TIRA(E)};const b=[...u.querySelectorAll('li button')].filter(x=>x.getAttribute('aria-label')!=='Agregar una parte')[10].getBoundingClientRect(),r=u.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1})()`); ok(vis, `${et}: el último círculo quedó a la vista dentro de la tira`); await foto('estructura-larga')
    await abrirMenu(E, 1); const menos = `${MENU}.querySelector('button[aria-label="Una repetición menos"]')`; for (let k = 0; k < 7; k++) await tocar('−', menos)
    await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250); cs = await circulos(E); ok(cs.map(x => x.t).join() === 'V1,C,C,V2', `${et}: de ×9 bajando 7 veces quedan V1, C, C, V2`)

    // ═════ Guardar: la estructura viaja como `estructura` ═════
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    let ps = await posts(), b = ps[0]
    ok(ps.length === 1 && Array.isArray(b.estructura) && !('arreglo' in b) && JSON.stringify(b.estructura) === JSON.stringify([{ indice: 0, repeat: 1 }, { indice: 1, repeat: 2 }, { indice: 2, repeat: 1 }]), `${et}: Guardar manda estructura = ${JSON.stringify(b.estructura)}`)
    await esperar(`!${E}`, 'que el editor se cierre')

    // ═════ con arreglo propio: la estructura guardada, de solo lectura ═════
    await tocar('canción «ZZ Borrador con arreglo»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador con arreglo'))`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); const E3 = ED('ZZ Borrador con arreglo'); await esperar(`${E3}&&${E3}.innerText.includes('Empieza por una parte')`, 'el editor del borrador'); await sleep(300)
    await tocar('Verso 1', tipo(`${E3}.querySelector('section')`, 'Verso 1')); await esperar(`${E3}.querySelector('textarea')`, 'el cuadro 3'); await send('Input.insertText', { text: lineas(3, 'con arreglo') }); await sleep(250)
    const ag3 = async (nombre, texto) => { await tocar('«+» de la tira', MAS(E3)); await esperar(SHEET, 'la hoja'); await tocar(nombre, tipo(`${SHEET}.querySelector('[role=group][aria-label="Parte nueva"]')`, nombre)); await send('Input.insertText', { text: texto }); await sleep(250) }
    await ag3('Coro', lineas(3, 'del coro del borrador'))
    cs = await circulos(E3); ok(cs.map(x => x.t).join() === 'V1,V1,C,V1' && cs.map(x => x.rep ? 'p' : '-').join('') === '-p-p', `${et}: con arreglo propio la tira muestra la estructura GUARDADA (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`); await foto('estructura-arreglo-propio')
    cs = await circulos(E3); ok(cs[2].activa, `${et}: el círculo del coro recién agregado es el activo`); await tocar('círculo 3 (activa)', circ(E3, 2)); await esperar(MENU, 'el menú del borrador'); m = await menu(); ok(m.apagada && m.aviso && m.pos === 'Parte 3 de 4', `${et}: el menú sale apagado, con el aviso del tablero 5b (${m.pos})`)
    await tocar('Cerrar', `${MENU}.querySelector('button[aria-label="Cerrar"]')`); await sleep(200)
    await tocar('Guardar', btn(E3, 'Guardar')); await esperar(`window.__posts.length>=2`, 'la segunda petición'); ps = await posts(); ok(ps.length === 2 && !('arreglo' in ps[1]) && !('estructura' in ps[1]), `${et}: con arreglo propio el guardado NO manda estructura`)

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
