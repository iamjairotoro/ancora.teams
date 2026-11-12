// Ficha de la canción del administrador (Admin móvil, paso 3): el aviso de «Borrador» con «Publicar» y el estado vacío, según el tablero «Ficha admin · Borrador y estado vacío», en un navegador REAL (Chrome por CDP): 390 y 360 px en claro y oscuro, y
// 1280 px (escritorio, que NO debe cambiar). Servidor simulado en la página; datos INVENTADOS («Santo» sin letra, y en borrador cuando se pide).
// Qué comprueba (teléfono): el estado vacío (título, ayuda, «Agregar letra» y «Subir archivos» de 44 px o más; «Subir archivos» abre la pantalla de Adjuntos y «Agregar letra» la edición de ESA canción); el aviso de Borrador bajo el título con «Publicar»
// (44 px o más) que solo escribe `publicada: true` y, si falla, muestra el error y deja volver a intentar; con letra no hay ni vacío ni aviso; sin desplazamiento lateral. Escritorio: el aviso de siempre (con su texto largo), el vacío de siempre, nada de lo nuevo.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-ficha-vacia.sh <carpeta-de-capturas>      (usa SOLO="<ancho> <tema>"; 390, 360 o 1280)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-letra-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/ficha-vacia'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const CANCION = { tono: 'E', letra: '', origen: 'ninguno', secciones: null, sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null, actual: { secciones: [], arreglo: [] } }
// «Santo» (sin letra) pasa a borrador con localStorage.__borrador=1; los PATCH a songs se anotan y fallan con localStorage.__falla=1; cualquier otra escritura a /api o a la base se anota aparte.
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__otras=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});const L=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.startsWith('/api/admin/canciones/acordes')&&m==='GET')return j({cancion:${JSON.stringify(CANCION)},hojaFicha:{hoja:null,otrasVersiones:0,desajuste:false}});
if(url.pathname.endsWith('/rest/v1/songs')&&m==='PATCH'){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch(e){}window.__escrituras.push({m,b,q:url.search});return L('__falla')==='1'?j({message:'x'},500):j([])}
if(m!=='GET'&&m!=='HEAD'&&(url.pathname.startsWith('/api/')||url.pathname.includes('/rest/v1/'))&&!url.pathname.startsWith('/api/portal/preferencias'))window.__otras.push(m+' '+url.pathname);
const r=await f(i,o);
if(url.pathname.endsWith('/rest/v1/songs')&&m==='GET'&&(url.searchParams.get('select')||'')==='*'&&L('__borrador')==='1'){const rows=await r.clone().json();if(Array.isArray(rows)){return j(rows.map(x=>x.nombre==='Santo'?{...x,publicada:false}:x))}}
return r}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`, telefono = ancho < 700
  paso = 'abrir el navegador'; const c = await lanzar(9592), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,160)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const tocar = async (buscar, nombre) => {
    paso = `tocar «${nombre}»`; await esperar(buscar, nombre)
    const r = JSON.parse(await ev(`(()=>{const e=${buscar};e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`))
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(350)
  }
  const boton = txt => `[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\\s+/g,' ').trim()===${JSON.stringify(txt)})`
  const abrirFicha = async (titulo, banderas) => {
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();localStorage.setItem('__rol','admin');${Object.entries(banderas || {}).map(([k, v]) => `localStorage.setItem('${k}','${v}')`).join(';')}`)
    await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('.anc-songTitle')].find(e=>e.firstChild&&e.firstChild.textContent.trim()===${JSON.stringify(titulo)})`, 'la canción en la lista'); await esperar(`document.fonts.status==='loaded'`, 'fuentes')
    await ev(`window.__escrituras=[];window.__otras=[];[...document.querySelectorAll('.anc-songTitle')].find(e=>e.firstChild&&e.firstChild.textContent.trim()===${JSON.stringify(titulo)}).click()`)
    await esperar(`document.querySelector('.anc-sheet')||document.querySelector('.anc-lyrEmpty')||document.querySelector('[data-ficha=vacia]')`, 'la ficha'); await sleep(700)
  }
  const medir = () => ev(`(()=>{const d=document,esc=parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--esc'))||1,q=s=>d.querySelector(s),r=e=>{const b=e.getBoundingClientRect();return[Math.round(b.width),Math.round(b.height),Math.round(b.top)]},txt=e=>e?e.textContent.replace(/\\s+/g,' ').trim():null
    const barra=[...d.querySelectorAll('button')].find(b=>/Tipografía/.test(b.textContent)).parentElement
    return JSON.stringify({esc,vacia:!!q('[data-ficha=vacia]'),vaciaTitulo:txt(q('.anc-fichaVacia__titulo')),vaciaAyuda:txt(q('.anc-fichaVacia__ayuda')),letra:q('.anc-fichaVacia__letra')?r(q('.anc-fichaVacia__letra')):null,archivos:q('.anc-fichaVacia__archivos')?r(q('.anc-fichaVacia__archivos')):null,
      viejoVacio:!!q('.anc-lyrEmpty'),viejoVacioTxt:txt(q('.anc-lyrEmpty')),viejoAgregar:!![...d.querySelectorAll('.anc-lyrEmpty button')].find(b=>b.textContent.trim()==='Agregar letra'),
      borr:!!q('[data-ficha=borrador]'),borrTxt:txt(q('[data-ficha=borrador]')),publicar:q('.anc-fichaBorr__publicar')?r(q('.anc-fichaBorr__publicar')):null,borrTop:q('[data-ficha=borrador]')?r(q('[data-ficha=borrador]'))[2]:null,
      titTop:q('[data-ficha=titulo]')?r(q('[data-ficha=titulo]'))[2]:null,barraTop:r(barra)[2],viejoBorr:!![...d.querySelectorAll('.anc-panel')].find(p=>/Borrador: los músicos/.test(p.textContent)),
      seccion:txt(q('.anc-fichaSeccion')),ancho:d.documentElement.scrollWidth,alerta:txt(q('.anc-fichaBorr__error')),editarLetra:txt(q('.anc-fichaCab__editar'))})})()`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 900, deviceScaleFactor: telefono ? 2 : 1, mobile: telefono }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })

    // ── sin letra, publicada: el estado vacío ──
    await abrirFicha('Santo', {}); const v = await medir()
    if (telefono) {
      ok(v.vacia && v.vaciaTitulo === 'Esta canción todavía no tiene letra' && /^Escribe la letra con sus acordes, o sube un archivo para que los músicos la vean\.$/.test(v.vaciaAyuda), `${et}: estado vacío con su título y su ayuda`)
      ok(v.letra[1] >= 44 && v.archivos[1] >= 44 && v.letra[0] > 200 && v.archivos[0] > 200, `${et}: «Agregar letra» (${v.letra[0]}×${v.letra[1]}) y «Subir archivos» (${v.archivos[0]}×${v.archivos[1]}) a todo lo ancho y de 44 o más`)
      ok(!v.viejoVacio && !v.borr && v.seccion === null, `${et}: sin el vacío de antes, sin aviso de Borrador (está publicada) y sin «Letra y acordes»`)
      await foto('ficha-vacia')
      await tocar(boton('Subir archivos'), '«Subir archivos»'); await esperar(`document.querySelector('[role=dialog][aria-label="Adjuntos – Santo"]')`, 'la pantalla de Adjuntos')
      ok(true, `${et}: «Subir archivos» abre la pantalla «Adjuntos – Santo»`); await tocar(`document.querySelector('[role=dialog][aria-label="Adjuntos – Santo"] button[aria-label="Volver"]')`, 'volver de Adjuntos'); await sleep(300)
      await tocar(boton('Agregar letra'), '«Agregar letra»'); await esperar(`document.querySelector('.anc-edicion')`, 'la edición')
      ok(/Editar canción/.test(await ev(`document.querySelector('.anc-edicion').innerText`)) && (await ev(`document.querySelector('.anc-edicion input.anc-input').value`)) === 'Santo', `${et}: «Agregar letra» abre la edición de ESTA canción (la acción de siempre)`)
      await tocar(boton('Cancelar'), 'Cancelar'); await sleep(300)
      ok((await ev(`JSON.stringify([window.__escrituras,window.__otras])`)) === '[[],[]]', `${et}: nada se escribió al abrir Adjuntos ni la edición`)
    } else {
      ok(!v.vacia && v.viejoVacio && v.viejoAgregar && /todavía no tiene letra/.test(v.viejoVacioTxt), `${et}: escritorio: el vacío de siempre («${v.viejoVacioTxt}») con su «Agregar letra»`)
    }
    ok(v.ancho <= ancho, `${et}: la pantalla no se desliza de lado (${v.ancho} ≤ ${ancho})`)

    // ── en borrador: el aviso con «Publicar» ──
    await abrirFicha('Santo', { __borrador: 1 }); const b = await medir()
    if (telefono) {
      ok(b.borr && /^Borrador\s*Los músicos aún no la ven\.\s*Publicar$/.test(b.borrTxt) && !b.viejoBorr, `${et}: aviso «${b.borrTxt}» y NO el aviso largo de escritorio`)
      ok(b.borrTop > b.titTop && b.borrTop < b.barraTop, `${et}: el aviso va bajo el título (${b.titTop} < ${b.borrTop}) y antes de la barra de botones (${b.barraTop})`)
      ok(b.publicar[1] >= 44 && b.publicar[0] >= 44, `${et}: «Publicar» mide ${b.publicar[0]}×${b.publicar[1]} (44 o más)`); ok(b.vacia, `${et}: en borrador sin letra también está el estado vacío`)
      await foto('ficha-borrador')
      await tocar(boton('Publicar'), '«Publicar»'); await sleep(500)
      const e = JSON.parse(await ev(`JSON.stringify({p:window.__escrituras,o:window.__otras})`))
      ok(e.p.length === 1 && e.p[0].m === 'PATCH' && JSON.stringify(e.p[0].b) === JSON.stringify({ publicada: true }) && /id=eq\./.test(e.p[0].q) && e.o.length === 0, `${et}: «Publicar» escribe SOLO { publicada: true } sobre esa canción (${JSON.stringify(e.p.map(x => x.b))}); ninguna otra escritura (${e.o.length})`)
      // si falla: el error se ve y se puede volver a intentar
      await abrirFicha('Santo', { __borrador: 1, __falla: 1 }); await tocar(boton('Publicar'), '«Publicar» (con falla)'); await esperar(`document.querySelector('.anc-fichaBorr__error')`, 'el error de publicar')
      const f = await medir(); ok(/No se pudo publicar la canción\. Inténtalo de nuevo\./.test(f.alerta) && !!(await ev(`!document.querySelector('.anc-fichaBorr__publicar').disabled`)), `${et}: si falla se ve «${f.alerta}» y «Publicar» queda disponible para reintentar`)
      await foto('ficha-borrador-error')
    } else {
      ok(!b.borr && b.viejoBorr, `${et}: escritorio: el aviso de siempre (texto largo), sin el nuevo`)
    }

    // ── con letra: ni vacío ni aviso ──
    await abrirFicha('Cuán grande es Él', {}); const l = await medir()
    ok(!l.vacia && !l.borr && !l.viejoVacio && !l.viejoBorr, `${et}: una canción con letra no muestra ni el vacío ni el aviso de Borrador`)
  } finally { await c.cerrar() }
}

;(async () => {
  const SOLO = process.env.SOLO || ''
  for (const [ancho, tema] of [[390, 'light'], [390, 'dark'], [360, 'light'], [360, 'dark'], [1280, 'light']].filter(([a, t]) => !SOLO || SOLO === `${a} ${t}`)) {
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
