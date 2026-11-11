// «Nueva canción» paso A en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. El servidor se simula en la página; datos INVENTADOS; ninguna escritura real.
// Qué comprueba: la ventana «Datos» (seis campos, «Más datos», dos botones, campos de 16 px, todo ≥ 44 px, sin desplazamiento lateral, botones a la vista); las validaciones (título, y tono solo al escribir la letra) sin enviar nada;
// «Solo crear» envía UN insert con publicada=false, sin letra y sin tono, y NO abre el editor; «Crear y escribir la letra» envía UN insert con los datos (incluidos los de «Más datos») y abre el editor de esa canción;
// la lista marca «Borrador»; la ficha de un borrador muestra «Borrador» y «Publicar», que envía solo {publicada:true}; el formulario de escritorio no cambia (ancho 1280: abre el modal de siempre, no la ventana nueva).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/nueva-cancion-paso-a.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/nueva-cancion-paso-a'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const NUEVA_ID = '33333333-3333-4333-8333-333333333333', BORRADOR_ID = '44444444-4444-4444-8444-444444444444'
const CARGA = { tono: 'F', letra: '', origen: 'ninguno', secciones: null, sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null, actual: { secciones: [], arreglo: [] } }
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.endsWith('/rest/v1/songs')&&m!=='GET'){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch{}
 window.__escrituras.push({m,b,q:url.search});
 if(m==='POST')return j({id:'${NUEVA_ID}',created_at:'2026-11-10',...b},201);return new Response(null,{status:204})}
if(m!=='GET'&&url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/rpc/')){window.__escrituras.push({m,otra:url.pathname});return j([])}
if(url.pathname.startsWith('/api/admin/canciones/acordes')&&m==='GET')return j({cancion:${JSON.stringify(CARGA)},hojaFicha:null});
const r=await f(i,o);
if(url.pathname.endsWith('/rest/v1/songs')&&m==='GET'&&(url.searchParams.get('select')||'')==='*'){const rows=await r.clone().json();if(Array.isArray(rows)){rows.push({id:'${BORRADOR_ID}',nombre:'ZZ Borrador de prueba',artista:'Grupo Inventado',tono_original:'D',bpm:70,publicada:false,created_at:'2026-11-09'});return j(rows)}}
return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9589), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map(d=>d.getAttribute('role')+':'+d.getAttribute('aria-label')+':'+d.innerText.replace(/\\s+/g,' ').slice(0,80)).join(' | ')+' || '+document.body.innerText.replace(/\\s+/g,' ').slice(0,100)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); await ev(`(${buscar}).scrollIntoView({block:'nearest',inline:'nearest'})`); await sleep(80); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(250)
  }
  const V = `document.querySelector('[role=dialog][aria-label="Nueva canción"]')`
  const btn = (raiz, txt) => `[...${raiz}.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(txt)}))`
  const campo = (etq, tag = 'input') => `[...${V}.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(${JSON.stringify(etq)}))?.querySelector('${tag}')`
  const escribir = async (sel, texto) => { await ev(`(${sel}).focus()`); await send('Input.insertText', { text: texto }); await sleep(120) }
  const elegir = async (sel, valor) => { await ev(`(()=>{const s=${sel};const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;set.call(s,${JSON.stringify(valor)});s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await sleep(120) }
  const escrituras = () => ev(`JSON.stringify(window.__escrituras)`).then(JSON.parse)
  const abrirNueva = async () => { await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await esperar(V, 'la ventana «Nueva canción»'); await sleep(200) }
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: ancho === 1280 ? 900 : 844, deviceScaleFactor: 2, mobile: ancho !== 1280 }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'la lista de canciones'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)

    // ── la lista marca el borrador ──
    ok(await ev(`[...document.querySelectorAll('.anc-songRow')].some(r=>r.textContent.includes('ZZ Borrador de prueba')&&r.textContent.includes('Borrador'))`), `${et}: la lista marca «Borrador» en la canción en borrador`)
    ok(await ev(`![...document.querySelectorAll('.anc-songRow')].filter(r=>!r.textContent.includes('ZZ Borrador')).some(r=>r.textContent.includes('Borrador'))`), `${et}: las canciones publicadas no llevan la etiqueta`)
    await foto('lista-borrador')

    if (ancho === 1280) {
      await tocar('+ Agregar canción', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`); await sleep(400)
      ok(await ev(`!${V} && document.body.innerText.includes('Nueva canción') && !!document.querySelector('input.anc-input')`), `${et}: en escritorio «+ Agregar canción» abre el formulario de siempre, no la ventana nueva`)
      await foto('escritorio-formulario-viejo'); ok((await escrituras()).length === 0, `${et}: cero escrituras`); return
    }

    // ── la ventana «Datos» ──
    await abrirNueva()
    const g = JSON.parse(await ev(`(()=>{const v=${V};const etqs=[...v.querySelectorAll('label')].map(l=>l.firstChild&&l.firstChild.textContent.trim()||l.textContent.trim());const ins=[...v.querySelectorAll('input,select')];const bts=[...v.querySelectorAll('button')];
      const caja=v.getBoundingClientRect();const pie=[...bts].find(b=>b.textContent.includes('Crear y escribir')).getBoundingClientRect();
      return JSON.stringify({etqs,fuentes:ins.map(i=>parseFloat(getComputedStyle(i).fontSize)),alturas:[...ins,...bts].map(e=>Math.round(e.getBoundingClientRect().height)),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,pieDentro:pie.bottom<=innerHeight&&pie.top>=0,titulo:v.querySelector('h2').textContent,foco:document.activeElement===v.querySelector('input'),botones:bts.map(b=>b.textContent.trim())})})()`))
    ok(['Título', 'Artista', 'Tonalidad original', 'BPM', 'Compás', 'Duración'].every(e => g.etqs.some(x => x.startsWith(e))) && g.titulo === 'Nueva canción', `${et}: la ventana trae Título, Artista, Tonalidad original, BPM, Compás y Duración`)
    ok(g.botones.some(b => b === 'Crear y escribir la letra') && g.botones.some(b => b === 'Solo crear, la escribo después') && g.botones.some(b => b.startsWith('Más datos')), `${et}: trae «Más datos», «Crear y escribir la letra» y «Solo crear, la escribo después»`)
    ok(g.fuentes.every(f => f >= 16), `${et}: todos los campos miden 16 px o más (${g.fuentes.join(',')})`); ok(Math.min(...g.alturas) >= 44, `${et}: todo lo que se toca mide ≥ 44 px de alto (${Math.min(...g.alturas)})`)
    ok(g.sw <= g.cw, `${et}: sin desplazamiento lateral (${g.sw} ≤ ${g.cw})`); ok(g.pieDentro, `${et}: los botones de crear quedan a la vista`); ok(g.foco, `${et}: el cursor empieza en el título`)
    await foto('datos-vacio')

    // ── validaciones: no se envía nada ──
    await tocar('Crear y escribir (vacío)', btn(V, 'Crear y escribir')); ok(await ev(`${V}.innerText.includes('Escribe el título de la canción.')`), `${et}: sin título, el aviso lo pide`)
    ok(await ev(`document.activeElement===${campo('Título')}`), `${et}: el foco vuelve al título`); await foto('datos-error-titulo')
    await escribir(campo('Título'), 'ZZ Prueba nueva canción'); await tocar('Crear y escribir (sin tono)', btn(V, 'Crear y escribir'))
    ok(await ev(`${V}.innerText.includes('Elige la tonalidad para escribir la letra')`), `${et}: sin tono, «Crear y escribir la letra» lo pide`); ok(await ev(`document.activeElement===${campo('Tonalidad original', 'select')}`), `${et}: el foco va al tono`)
    await foto('datos-error-tono')
    await escribir(campo('Duración'), '6:75'); await tocar('Solo crear (duración mala)', btn(V, 'Solo crear')); ok(await ev(`${V}.innerText.includes('minutos:segundos')`), `${et}: una duración mala se avisa`)
    ok((await escrituras()).length === 0, `${et}: con errores no se envía NADA`)
    await ev(`(()=>{const e=${campo('Duración')};e.select()})()`); await send('Input.insertText', { text: '' }); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }); await sleep(150)

    // ── «Solo crear»: un insert en borrador, sin editor ──
    ok(await ev(`${campo('Duración')}.value===''`), `${et}: (se vació la duración)`)
    await tocar('Solo crear', btn(V, 'Solo crear')); await esperar(`!${V}`, 'que se cierre la ventana'); await sleep(300)
    let e = await escrituras(); ok(e.length === 1 && e[0].m === 'POST', `${et}: «Solo crear» envía UNA escritura (un insert) — ${e.length}`)
    const b1 = e[0] && e[0].b
    ok(!!b1 && b1.publicada === false && b1.nombre === 'ZZ Prueba nueva canción' && b1.letra === null && b1.tono_original === null && b1.bpm === null && b1.duracion_min === null, `${et}: nace en borrador (publicada=false), sin letra, sin tono y sin BPM`)
    ok(await ev(`!document.querySelector('[role=dialog][aria-label="ZZ Prueba nueva canción"]')`), `${et}: «Solo crear» no abre el editor`)
    await foto('tras-solo-crear')

    // ── «Crear y escribir la letra» con «Más datos» ──
    await abrirNueva()
    await escribir(campo('Título'), 'ZZ Segunda de prueba'); await escribir(campo('Artista'), 'Grupo Inventado'); await elegir(campo('Tonalidad original', 'select'), 'F'); await escribir(campo('BPM'), '72'); await elegir(campo('Compás', 'select'), '4/4'); await escribir(campo('Duración'), '6:59')
    await tocar('Más datos', btn(V, 'Más datos')); await esperar(`${V}.querySelector('h2').textContent==='Más datos'`, 'la pantalla «Más datos»'); await sleep(200)
    const m = JSON.parse(await ev(`(()=>{const v=${V};const ins=[...v.querySelectorAll('input[type=text],input[type=url],input:not([type])')];return JSON.stringify({etqs:[...v.querySelectorAll('label')].map(l=>l.firstChild&&l.firstChild.textContent.trim()||''),fuentes:ins.map(i=>parseFloat(getComputedStyle(i).fontSize)),sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,adj:/adjunt/i.test(v.innerText)})})()`))
    ok(['Título original', 'Autor', 'Traductor', 'CCLI', 'Copyright', 'Link YouTube', 'Letras', 'Recursos', 'Notas'].every(x => m.etqs.some(q => q.startsWith(x))), `${et}: «Más datos» trae autor, traductor, CCLI, copyright, enlaces y notas`)
    ok(await ev(`${V}.innerText.includes('Carátula')`), `${et}: la carátula vive en «Más datos»`); ok(!m.adj, `${et}: ni «Datos» ni «Más datos» llevan adjuntos`); ok(m.fuentes.every(f => f >= 16) && m.sw <= m.cw, `${et}: «Más datos»: campos de 16 px y sin desplazamiento lateral`)
    await escribir(campo('Autor'), 'Autor Inventado'); await escribir(campo('CCLI'), '000000'); await escribir(campo('Notas'), 'Nota de prueba'); await foto('mas-datos')
    await tocar('Volver', `[...${V}.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Volver')`); await esperar(`${V}.querySelector('h2').textContent==='Nueva canción'`, 'volver a «Datos»')
    ok(await ev(`${campo('Título')}.value==='ZZ Segunda de prueba' && ${campo('Tonalidad original', 'select')}.value==='F'`), `${et}: al volver de «Más datos» no se pierde lo escrito`)
    await foto('datos-lleno')
    await tocar('Crear y escribir la letra', btn(V, 'Crear y escribir')); await esperar(`document.querySelector('[role=dialog][aria-label="ZZ Segunda de prueba"]')`, 'el editor de la canción nueva'); await sleep(400)
    e = await escrituras(); const b2 = e[1] && e[1].b
    ok(e.length === 2 && e[1].m === 'POST', `${et}: «Crear y escribir la letra» envía UN insert más (total ${e.length})`)
    ok(!!b2 && b2.publicada === false && b2.tono_original === 'F' && b2.bpm === 72 && b2.compas === '4/4' && b2.duracion_min === 419 && b2.artista === 'Grupo Inventado' && b2.autor === 'Autor Inventado' && b2.ccli === '000000' && b2.notas === 'Nota de prueba' && b2.letra === null, `${et}: el insert trae los datos de «Datos» y de «Más datos», en borrador y sin letra`)
    ok(await ev(`!${V}`), `${et}: la ventana «Datos» se cerró y se abrió el editor`); await foto('editor-tras-crear')
    await tocar('Cancelar (cerrar el editor)', `[...document.querySelector('[role=dialog][aria-label="ZZ Segunda de prueba"]').querySelectorAll('button')].find(b=>b.textContent.includes('Cancelar'))`)
    await sleep(300)

    // ── la ficha de un borrador: «Borrador» y «Publicar» ──
    if (await ev(`!!document.querySelector('[role=alertdialog]')`)) await tocar('salir sin guardar', `[...document.querySelectorAll('[role=alertdialog] button')].find(b=>/salir|descartar/i.test(b.textContent))`)
    await esperar(`!document.querySelector('[role=dialog][aria-label="ZZ Segunda de prueba"]')`, 'que se cierre el editor')
    await tocar('canción «ZZ Borrador de prueba»', `[...document.querySelectorAll('.anc-songRow')].find(r=>r.textContent.includes('ZZ Borrador de prueba'))`)
    await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Publicar')`, 'el botón Publicar')
    ok(await ev(`document.body.innerText.includes('los músicos aún no la ven')`), `${et}: la ficha del borrador explica que los músicos aún no la ven`); await foto('ficha-borrador')
    const antes = (await escrituras()).length
    await tocar('Publicar', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Publicar')`); await esperar(`window.__escrituras.length>${antes}`, 'la escritura de Publicar'); await sleep(200)
    e = await escrituras(); const p = e[e.length - 1]
    ok(e.length === antes + 1 && p.m === 'PATCH' && JSON.stringify(p.b) === JSON.stringify({ publicada: true }) && p.q.includes(BORRADOR_ID), `${et}: «Publicar» envía UN update con solo {publicada:true} sobre esa canción`)
    ok(e.every(x => x.m === 'POST' || x.m === 'PATCH') && e.filter(x => x.otra).length === 0, `${et}: no hubo ninguna otra escritura (solo los dos inserts y el publicar)`)
    const errs = c.consola.filter(x => /EXCEPCIÓN|\[error\]/.test(x) && !/Failed to load resource|favicon/.test(x)); ok(errs.length === 0, `${et}: sin errores en la consola${errs.length ? ' — ' + errs[0].slice(0, 120) : ''}`)
  } finally { await c.cerrar() }
}

;(async () => {
  const SOLO = process.env.SOLO || ''
  for (const [ancho, tema] of [[390, 'light'], [390, 'dark'], [360, 'light'], [360, 'dark'], [1280, 'light']].filter(([a, t]) => (!SOLO ? a !== 1280 || process.env.ESCRITORIO !== '0' : SOLO === `${a} ${t}`))) {
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
