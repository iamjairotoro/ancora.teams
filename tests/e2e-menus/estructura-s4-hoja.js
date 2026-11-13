// Estructura de «Nueva canción» · S4 (la hoja «Agregar a la estructura») en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: la hoja trae «Volver a usar una parte» (las partes que ya existen) y «Parte nueva» (los ocho tipos), todo ≥ 44 px y sin desplazamiento lateral; volver a usar una parte agrega un círculo punteado al final, activo, SIN crear sección ni tocar el texto;
// una parte nueva entra al final de la estructura; la nota «Esta letra se usa N veces…» sale en el modo Acordes; Guardar manda `estructura` con las repeticiones seguidas comprimidas y las no seguidas separadas; con arreglo propio las partes reusables salen apagadas, con el aviso.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/estructura-s4-hoja.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/estructura-s4-hoja'
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
    // con el documento vacío la hoja solo ofrece «Parte nueva»
    await tocar('«+» (vacío)', MAS(E)); await esperar(SHEET, 'la hoja'); ok(await ev(`${SHEET}.innerText.includes('Parte nueva')&&!${SHEET}.innerText.includes('Volver a usar')`), `${et}: con el documento vacío la hoja solo trae «Parte nueva»`); await tocar('Cerrar', `${SHEET}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250)
    await tocar('Verso 1', tipo(`${E}.querySelector('section')`, 'Verso 1')); await esperar(`${E}.querySelector('textarea')`, 'el cuadro de texto'); await send('Input.insertText', { text: lineas(10, 'del verso') }); await sleep(250)
    await agregarParte(E, 'Coro', lineas(10, 'del coro')); await agregarParte(E, 'Verso 2', lineas(10, 'del verso dos'))
    const texto0 = await ev(`${E}.querySelector('textarea').value`)

    // ═════ la hoja ═════
    await tocar('«+» de la tira', MAS(E)); await esperar(SHEET, 'la hoja «Agregar a la estructura»'); await sleep(250)
    const hoja = await ev(`(()=>{const h=${SHEET};const g=n=>h.querySelector('[role=group][aria-label="'+n+'"]');const et=x=>[...x.querySelectorAll('button')].map(b=>b.lastElementChild.textContent.trim());return JSON.stringify({titulo:h.querySelector('h2').textContent,secs:[...h.querySelectorAll('h3')].map(x=>x.textContent),txt:h.innerText.replace(/\\s+/g,' '),reusar:et(g('Volver a usar una parte')),nuevas:et(g('Parte nueva')),altos:[...h.querySelectorAll('button')].map(b=>Math.round(b.getBoundingClientRect().height)),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,abajo:Math.round(h.getBoundingClientRect().bottom),vh:innerHeight})})()`).then(JSON.parse)
    ok(hoja.titulo === 'Agregar a la estructura' && hoja.secs.join('|') === 'Volver a usar una parte|Parte nueva', `${et}: título «${hoja.titulo}» y secciones «${hoja.secs.join('», «')}»`)
    ok(/Entra en la estructura sin escribir su letra otra vez\./.test(hoja.txt) && /Tiene su propia letra y acordes\./.test(hoja.txt), `${et}: las dos ayudas de la maqueta están`)
    ok(hoja.reusar.join('|') === 'Verso 1|Coro|Verso 2', `${et}: «Volver a usar» ofrece las partes que ya existen (${hoja.reusar.join(', ')})`)
    ok(hoja.nuevas.join('|') === 'Verso 3|Pre-coro|Coro 2|Puente|Interludio|Instrumental|Tag|Final', `${et}: «Parte nueva» ofrece (${hoja.nuevas.join(', ')})`)
    ok(hoja.altos.every(x => x >= 44), `${et}: todo mide ≥ 44 px (${Math.min(...hoja.altos)})`); ok(hoja.sw <= hoja.cw, `${et}: sin desplazamiento lateral`); await foto('hoja-agregar-estructura')

    // ═════ volver a usar el coro ═════
    await tocar('Coro (volver a usar)', `[...${SHEET}.querySelectorAll('[role=group][aria-label="Volver a usar una parte"] button')].find(b=>b.lastElementChild.textContent.trim()==='Coro')`); await sleep(400)
    ok(await ev(`!${SHEET}`), `${et}: elegir una parte cierra la hoja`)
    let cs = await circulos(E), cab = await ev(`${E}.querySelector('[class*="_estructuraCab__"]').innerText.replace(/\\s+/g,' ').trim()`)
    ok(cs.map(x => x.t).join() === 'V1,C,V2,C' && cs.map(x => x.rep ? 'p' : '-').join('') === '---p', `${et}: el coro entra al final como círculo punteado (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`)
    ok(cs[3].activa && cs.filter(x => x.activa).length === 1, `${et}: el círculo nuevo queda activo (${cs.map(x => x.activa ? 'A' : '-').join('')})`)
    ok(/^estructura · 4 partes borde punteado = se repite$/i.test(cab), `${et}: cabecera «${cab}»`)
    await foto('estructura-coro-reusado')
    // el texto NO cambió y no hay otra sección CORO
    if (!(await ev(`!!${E}.querySelector('textarea')`))) { await tocar('Texto', `[...${E}.querySelectorAll('button')].find(b=>b.className.includes('modoTexto'))`); await sleep(300) }
    const txt = await ev(`${E}.querySelector('textarea').value`); ok(txt === texto0 && txt.split('CORO:').length === 2, `${et}: volver a usar NO escribe nada en el texto ni crea otra sección «CORO»`)
    if (await ev(`!!${E}.querySelector('textarea')`)) await tocar('volver a Acordes', `[...${E}.querySelectorAll('button')].find(b=>/Acordes/.test(b.textContent)&&b.className.includes('modoTexto'))`); await esperar(`${E}.querySelectorAll('section[class*="_sec__"]').length===3`, 'las 3 secciones'); await sleep(300)
    const notas = await ev(`JSON.stringify([...${E}.querySelectorAll('section[class*="_sec__"]')].map(s=>(s.querySelector('[role=note]')||{}).textContent||null))`).then(JSON.parse)
    ok(notas[1] === 'Esta letra se usa 2 veces en la estructura. Se escribe una sola vez.' && notas[0] === null && notas[2] === null, `${et}: la nota «${notas[1]}» sale solo bajo el CORO`)

    // ═════ verso 1 dos veces seguidas + una parte nueva ═════
    const reusar = async nombre => { await tocar('«+» de la tira', MAS(E)); await esperar(SHEET, 'la hoja'); await tocar(nombre + ' (volver a usar)', `[...${SHEET}.querySelectorAll('[role=group][aria-label="Volver a usar una parte"] button')].find(b=>b.lastElementChild.textContent.trim()===${JSON.stringify(nombre)})`); await sleep(350) }
    await reusar('Verso 1'); await reusar('Verso 1')
    await tocar('«+» de la tira', MAS(E)); await esperar(SHEET, 'la hoja'); await tocar('Coro 2', tipo(`${SHEET}.querySelector('[role=group][aria-label="Parte nueva"]')`, 'Coro 2')); await esperar(`${E}.querySelector('textarea')`, 'el cuadro (parte nueva)'); await send('Input.insertText', { text: lineas(4, 'del coro dos') }); await sleep(300)
    cs = await circulos(E); ok(cs.map(x => x.t).join() === 'V1,C,V2,C,V1,V1,C2' && cs.map(x => x.rep ? 'p' : '-').join('') === '---ppp-', `${et}: la parte nueva entra al FINAL de la estructura (${cs.map(x => x.t + (x.rep ? '*' : '')).join(' ')})`)

    // ═════ Guardar ═════
    await tocar('Guardar', btn(E, 'Guardar')); await esperar(`window.__posts.length>=1`, 'la petición de guardado'); await sleep(300)
    let ps = await posts(), b = ps[0]
    ok(ps.length === 1 && JSON.stringify(b.estructura) === JSON.stringify([{ indice: 0, repeat: 1 }, { indice: 1, repeat: 1 }, { indice: 2, repeat: 1 }, { indice: 1, repeat: 1 }, { indice: 0, repeat: 2 }, { indice: 3, repeat: 1 }]), `${et}: Guardar manda estructura = ${JSON.stringify(b.estructura)} (V1 V1 seguidas = UNA entrada ×2; C repetido no seguido = entrada aparte)`)
    ok(!('arreglo' in b) && b.secciones.length === 4, `${et}: 4 secciones (V1, C, V2, C2): ninguna nueva por volver a usar`)
    await esperar(`!${E}`, 'que el editor se cierre')

    // ═════ con arreglo propio: «Volver a usar» apagado, con el aviso ═════
    await tocar('canción «ZZ Borrador con arreglo»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador con arreglo'))`)
    await tocar('Editar con acordes', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes')`); const E3 = ED('ZZ Borrador con arreglo'); await esperar(`${E3}&&${E3}.innerText.includes('Empieza por una parte')`, 'el editor del borrador'); await sleep(300)
    await tocar('Verso 1', tipo(`${E3}.querySelector('section')`, 'Verso 1')); await esperar(`${E3}.querySelector('textarea')`, 'el cuadro 3'); await send('Input.insertText', { text: lineas(3, 'con arreglo') }); await sleep(250)
    await tocar('«+» de la tira', MAS(E3)); await esperar(SHEET, 'la hoja del borrador'); await sleep(250)
    const h3 = await ev(`(()=>{const h=${SHEET};const r=[...h.querySelectorAll('[role=group][aria-label="Volver a usar una parte"] button')];const n=[...h.querySelectorAll('[role=group][aria-label="Parte nueva"] button')];return JSON.stringify({reusar:r.map(b=>b.disabled),nuevas:n.map(b=>b.disabled),aviso:(h.querySelector('[role=note]')||{}).textContent||''})})()`).then(JSON.parse)
    ok(h3.reusar.length === 1 && h3.reusar.every(Boolean) && h3.nuevas.every(x => !x), `${et}: con arreglo propio «Volver a usar» sale apagado y «Parte nueva» sigue activa`)
    ok(h3.aviso.includes('Esta canción ya tiene un orden propio guardado. Para no pisarlo, la estructura no se puede cambiar aquí.'), `${et}: sale el aviso del orden propio`); await foto('hoja-arreglo-propio')
    await tocar('Cerrar', `${SHEET}.querySelector('button[aria-label="Cerrar"]')`); await sleep(250)
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
