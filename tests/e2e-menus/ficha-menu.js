// Ficha de la canción del administrador (Admin móvil, paso 5): el menú «⋯» como hoja desde abajo, según el tablero «Ficha admin · Menú ⋯ como hoja», en un navegador REAL (Chrome por CDP): 390 y 360 px en claro y oscuro, y 1280 px (escritorio, que NO debe cambiar).
// Servidor simulado en la página; datos INVENTADOS. Qué comprueba (teléfono): el «⋯» (44 px o más) abre un diálogo «Acciones para <canción>» pegado abajo, con velo, la ✕ a la izquierda, el nombre al centro y tres filas de 44 px o más («Editar datos», «Archivar»,
// «Eliminar canción» en rojo); el foco entra en la ✕, Tab no sale y Escape, la ✕ y tocar el fondo la cierran y el foco vuelve al «⋯»; cada fila hace lo de siempre: «Editar datos» abre la edición de ESA canción, «Archivar» solo escribe `archived_at` y vuelve a la lista,
// «Eliminar canción» pregunta antes (cancelar no borra nada; confirmar borra solo esa canción); sin desplazamiento lateral. Escritorio: el menú flotante de siempre (Editar, Archivar, Eliminar) y nada de la hoja.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-ficha-menu.sh <carpeta-de-capturas>      (usa SOLO="<ancho> <tema>"; 390, 360 o 1280)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-letra-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/ficha-menu'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const CANCION = { tono: 'G', letra: '', origen: 'ninguno', secciones: null, sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null, actual: { secciones: [], arreglo: [] } }
// Las escrituras a `songs` (PATCH = archivar, DELETE = eliminar) se anotan y se contestan bien; cualquier otra escritura a /api o a la base se anota aparte.
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__otras=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json','Content-Range':'0-0/*'}});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(url.pathname.startsWith('/api/admin/canciones/acordes')&&m==='GET')return j({cancion:${JSON.stringify(CANCION)},hojaFicha:{hoja:null,otrasVersiones:0,desajuste:false}});
if(url.pathname.endsWith('/rest/v1/songs')&&(m==='PATCH'||m==='DELETE')){let b=null;try{b=JSON.parse(o&&o.body||'null')}catch(e){}window.__escrituras.push({m,b,q:url.search});return j([])}
if(m!=='GET'&&m!=='HEAD'&&(url.pathname.startsWith('/api/')||url.pathname.includes('/rest/v1/'))&&!url.pathname.startsWith('/api/portal/preferencias'))window.__otras.push(m+' '+url.pathname);
return f(i,o)}})()`

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
  const abrirFicha = async titulo => {
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await esperar(`[...document.querySelectorAll('.anc-songTitle')].find(e=>e.firstChild&&e.firstChild.textContent.trim()===${JSON.stringify(titulo)})`, 'la canción en la lista'); await esperar(`document.fonts.status==='loaded'`, 'fuentes')
    await ev(`window.__escrituras=[];window.__otras=[];[...document.querySelectorAll('.anc-songTitle')].find(e=>e.firstChild&&e.firstChild.textContent.trim()===${JSON.stringify(titulo)}).click()`)
    await esperar(`document.querySelector('.anc-sheet')||document.querySelector('[data-ficha=vacia]')||document.querySelector('.anc-lyrEmpty')`, 'la ficha'); await sleep(600)
  }
  const MAS = `document.querySelector('button[aria-label="Más acciones de la canción"]')`, HOJA = `document.querySelector('[role=dialog][aria-label^="Acciones para"]')`
  const tecla = async (key, code, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }); await sleep(250) }
  const medir = () => ev(`(()=>{const d=document,esc=parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--esc'))||1,hoja=${HOJA},r=e=>{const b=e.getBoundingClientRect();return[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]}
    if(!hoja)return JSON.stringify({abierta:false,expanded:${MAS}.getAttribute('aria-expanded'),haspopup:${MAS}.getAttribute('aria-haspopup'),mas:r(${MAS}),viejoMenu:!!d.querySelector('.anc-rowMenu'),viejoNombre:[...d.querySelectorAll('.anc-rowMenu button')].map(b=>b.textContent.trim()),ancho:d.documentElement.scrollWidth})
    const velo=hoja.parentElement,filas=[...hoja.querySelectorAll('button')].slice(1),cerrar=hoja.querySelector('button'),h2=hoja.querySelector('h2'),cs=(e,p)=>getComputedStyle(e)[p]
    return JSON.stringify({abierta:true,esc,expanded:${MAS}.getAttribute('aria-expanded'),modal:hoja.getAttribute('aria-modal'),nombre:hoja.getAttribute('aria-label'),titulo:h2.textContent,veloR:r(velo),hojaR:r(hoja),vh:innerHeight,vw:innerWidth,veloFondo:cs(velo,'backgroundColor'),radio:cs(hoja,'borderTopLeftRadius'),
      cerrarR:r(cerrar),cerrarEtq:cerrar.getAttribute('aria-label'),tituloR:r(h2),filas:filas.map(b=>({t:b.textContent.trim(),r:r(b),color:cs(b,'color')})),foco:d.activeElement===cerrar,overflow:d.body.style.overflow,ancho:d.documentElement.scrollWidth})})()`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 900, deviceScaleFactor: telefono ? 2 : 1, mobile: telefono }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    await abrirFicha('Cuán grande es Él')
    const cerrada = await medir()
    if (!telefono) {
      ok(cerrada.mas[2] > 0 && cerrada.haspopup === null, `${et}: escritorio: el «⋯» de siempre (sin aviso de diálogo, como antes)`); await tocar(MAS, '⋯'); await esperar(`document.querySelector('.anc-rowMenu')`, 'el menú flotante de siempre'); await sleep(250)
      const e = await medir(); ok(!e.abierta && e.viejoMenu && JSON.stringify(e.viejoNombre) === JSON.stringify(['Editar', 'Archivar', 'Eliminar']), `${et}: escritorio: el menú flotante de siempre con ${JSON.stringify(e.viejoNombre)} y SIN la hoja`); await foto('ficha-menu-escritorio')
      return
    }
    ok(cerrada.mas[2] >= 44 && cerrada.mas[3] >= 44 && cerrada.haspopup === 'dialog' && cerrada.expanded === 'false', `${et}: el «⋯» mide ${cerrada.mas[2]}×${cerrada.mas[3]} (44 o más) y avisa que abre un diálogo (cerrado)`)
    ok(!cerrada.viejoMenu, `${et}: antes de tocar no hay ningún menú abierto`)

    // ── la hoja ──
    await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); await sleep(300); const m = await medir()
    ok(m.abierta && m.modal === 'true' && m.nombre === 'Acciones para Cuán grande es Él' && m.titulo === 'Cuán grande es Él' && m.expanded === 'true', `${et}: diálogo modal «${m.nombre}» con el nombre de la canción como título; el «⋯» queda «abierto»`)
    ok(m.veloR[2] === m.vw && m.veloR[3] === m.vh && /rgba\(0, 0, 0, 0\.6\)/.test(m.veloFondo), `${et}: el velo cubre toda la pantalla (${m.veloR[2]}×${m.veloR[3]}) al 60 %`)
    ok(m.hojaR[2] === m.vw && Math.abs(m.hojaR[1] + m.hojaR[3] - m.vh) <= 1 && parseFloat(m.radio) >= 20, `${et}: la hoja ocupa el ancho y está pegada abajo (borde inferior ${m.hojaR[1] + m.hojaR[3]} de ${m.vh}), con las esquinas de arriba redondeadas (${m.radio})`)
    ok(m.cerrarR[2] >= 44 && m.cerrarR[3] >= 44 && m.cerrarEtq === 'Cerrar' && m.cerrarR[0] < m.hojaR[0] + 40, `${et}: la ✕ mide ${m.cerrarR[2]}×${m.cerrarR[3]}, tiene nombre y va a la izquierda`)
    ok(Math.abs(m.tituloR[0] + m.tituloR[2] / 2 - m.vw / 2) <= 6, `${et}: el nombre de la canción va centrado`)
    ok(JSON.stringify(m.filas.map(f => f.t)) === JSON.stringify(['Editar datos', 'Archivar', 'Eliminar canción']) && m.filas.every(f => f.r[3] >= 44 && f.r[2] >= m.hojaR[2] - 60), `${et}: tres filas a todo lo ancho y de ${Math.min(...m.filas.map(f => f.r[3]))} px o más: ${m.filas.map(f => f.t).join(' · ')}`)
    ok(m.filas[2].color !== m.filas[0].color && m.filas[0].color === m.filas[1].color, `${et}: solo «Eliminar canción» va en otro color (${m.filas[2].color} contra ${m.filas[0].color})`)
    ok(m.foco && m.overflow === 'hidden' && m.ancho <= ancho, `${et}: el foco entra en la ✕, la página de atrás no se desplaza y no hay desplazamiento lateral (${m.ancho} ≤ ${ancho})`)
    await foto('ficha-menu')
    // Tab no sale de la hoja: con 4 botones, cinco Tab vuelven a la ✕
    for (let k = 0; k < 4; k++) await tecla('Tab', 'Tab', 9); ok(await ev(`document.activeElement===(${HOJA}).querySelector('button')`), `${et}: Tab recorre los cuatro controles y vuelve a la ✕ (no sale de la hoja)`)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 }); await sleep(250)
    ok(await ev(`document.activeElement===[...(${HOJA}).querySelectorAll('button')].pop()`), `${et}: Mayús+Tab desde la ✕ salta a la última fila`)

    // ── cómo se cierra ──
    await tecla('Escape', 'Escape', 27); ok(!(await ev(`!!(${HOJA})`)) && (await ev(`document.activeElement===${MAS}`)), `${et}: Escape la cierra y el foco vuelve al «⋯»`)
    await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); await tocar(`(${HOJA}).querySelector('button')`, '✕'); ok(!(await ev(`!!(${HOJA})`)), `${et}: la ✕ la cierra`)
    await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 6, y: 120, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 6, y: 120, button: 'left', clickCount: 1 }); await sleep(300)
    ok(!(await ev(`!!(${HOJA})`)), `${et}: tocar el fondo la cierra`)
    await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); const dentro = JSON.parse(await ev(`(()=>{const b=(${HOJA}).getBoundingClientRect();return JSON.stringify({x:b.left+b.width/2,y:b.top+12})})()`)); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dentro.x, y: dentro.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dentro.x, y: dentro.y, button: 'left', clickCount: 1 }); await sleep(300)
    ok(await ev(`!!(${HOJA})`), `${et}: tocar dentro de la hoja (fuera de los botones) no la cierra`)
    ok((await ev(`JSON.stringify([window.__escrituras,window.__otras])`)) === '[[],[]]', `${et}: abrir y cerrar la hoja no escribe nada`)

    // ── «Editar datos» ──
    await tocar(`[...(${HOJA}).querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar datos')`, '«Editar datos»'); await esperar(`document.querySelector('.anc-edicion')`, 'la edición')
    ok(!(await ev(`!!(${HOJA})`)) && /Editar canción/.test(await ev(`document.querySelector('.anc-edicion').innerText`)) && (await ev(`document.querySelector('.anc-edicion input.anc-input').value`)) === 'Cuán grande es Él', `${et}: «Editar datos» cierra la hoja y abre la edición de ESTA canción (la acción de siempre)`)
    await tocar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Cancelar')`, 'Cancelar'); await sleep(300)

    // ── «Archivar» ──
    await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); await tocar(`[...(${HOJA}).querySelectorAll('button')].find(b=>b.textContent.trim()==='Archivar')`, '«Archivar»'); await sleep(600)
    const ar = JSON.parse(await ev(`JSON.stringify([window.__escrituras,window.__otras])`))
    ok(ar[0].length === 1 && ar[0][0].m === 'PATCH' && Object.keys(ar[0][0].b).join() === 'archived_at' && /id=eq\./.test(ar[0][0].q) && ar[1].length === 0, `${et}: «Archivar» escribe SOLO archived_at de esa canción (${JSON.stringify(ar[0].map(x => Object.keys(x.b)))}) y nada más`)
    ok(!(await ev(`!!(${HOJA})`)) && (await ev(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`)), `${et}: «Archivar» cierra la hoja y vuelve a la lista`)

    // ── «Eliminar canción»: pregunta antes ──
    await abrirFicha('Cuán grande es Él'); await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); await tocar(`[...(${HOJA}).querySelectorAll('button')].find(b=>b.textContent.trim()==='Eliminar canción')`, '«Eliminar canción»')
    await esperar(`document.querySelector('[role=alertdialog]')`, 'la pregunta'); const pre = await ev(`document.querySelector('[role=alertdialog]').innerText.replace(/\\s+/g,' ')`); await foto('ficha-eliminar-pregunta')
    ok(/¿Eliminar esta canción\? Esta acción no se puede deshacer\./.test(pre), `${et}: «Eliminar canción» pregunta antes («${pre.slice(0, 70)}…»)`)
    await tocar(`[...document.querySelectorAll('[role=alertdialog] button')].find(b=>b.textContent.trim()==='Cancelar')`, 'Cancelar'); await sleep(500)
    ok((await ev(`JSON.stringify([window.__escrituras,window.__otras])`)) === '[[],[]]', `${et}: cancelar la pregunta no borra nada`)
    await abrirFicha('Cuán grande es Él'); await tocar(MAS, '⋯'); await esperar(HOJA, 'la hoja'); await tocar(`[...(${HOJA}).querySelectorAll('button')].find(b=>b.textContent.trim()==='Eliminar canción')`, '«Eliminar canción»')
    await esperar(`document.querySelector('[role=alertdialog]')`, 'la pregunta'); await tocar(`[...document.querySelectorAll('[role=alertdialog] button')].find(b=>b.textContent.trim()==='Eliminar')`, 'Eliminar'); await sleep(600)
    const el = JSON.parse(await ev(`JSON.stringify([window.__escrituras,window.__otras])`))
    ok(el[0].length === 1 && el[0][0].m === 'DELETE' && /id=eq\./.test(el[0][0].q) && el[1].length === 0, `${et}: confirmar borra SOLO esa canción (${el[0].map(x => x.m + ' ' + x.q)})`)
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
