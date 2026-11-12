// Ficha de la canción del administrador (Admin móvil, paso 2) en un navegador REAL (Chrome por CDP): 390 y 360 px (teléfono) en claro y oscuro, y 1280 px (escritorio, que NO debe cambiar). Servidor simulado en la página; datos INVENTADOS.
// Qué comprueba (teléfono): «‹ Canciones» y «✎ Editar» arriba (44 px o más), la portada de 76 de diseño, el título como UN solo h1 visible (22 de diseño), el artista y las pastillas «Tono G» y «72 bpm»; «Letra y acordes» sobre la hoja SOLO si hay letra;
// «Editar» abre la edición y «Canciones» vuelve a la lista (las mismas acciones de siempre); el menú «⋯» sigue ahí con Editar, Archivar y Eliminar; en la barra de botones ya no está «Editar» (queda Tipografía, Editar con acordes y Adjuntos); la hoja con
// acordes también sin título repetido; sin desplazamiento lateral; SIN «Agregar a servicio», «Transponer» ni «Usada N veces». Escritorio: la cabecera de siempre (← Canciones, «Editar» en la barra, título dentro de la hoja, sin «Letra y acordes»).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-ficha.sh tests/e2e-menus/ficha-cabecera.js <carpeta-de-capturas>   (usa SOLO="<ancho> <tema>"; 390, 360 o 1280)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-letra-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/ficha-cabecera'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const A = (g, cal = '') => ({ g, cal })
const ly = (a, ga, b, gb) => ({ kind: 'lyric', segments: [{ text: a, acorde: A(ga) }, { text: b, acorde: A(gb) }] })
const HOJA = { tono: 'G', secciones: [{ code: 'V1', name: 'Verso 1', repeat: 1, lineas: [ly('Línea de prueba ', 1, 'número uno de la parte', 5)] }, { code: 'C', name: 'Coro', repeat: 2, lineas: [ly('Coro de prueba ', 1, 'con su letra', 4)] }] }
const CANCION = { tono: 'G', letra: '', origen: 'formato2', secciones: null, sinConvertir: 0, huella: 'a'.repeat(32), formatoAntiguo: false, guardadas: null, actual: { secciones: [], arreglo: [] } }
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__modo='sinhoja';
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();
if(u.startsWith('/api/admin/canciones/acordes')&&m==='GET'){const hoja=window.__modo==='hoja'?${JSON.stringify(HOJA)}:null;return j({cancion:${JSON.stringify(CANCION)},hojaFicha:{hoja,otrasVersiones:0,desajuste:false}})}
if(u.startsWith('/api/')&&m!=='GET'&&!u.startsWith('/api/portal/preferencias'))window.__escrituras.push(m+' '+u);
return f(i,o)}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`, telefono = ancho < 700
  paso = 'abrir el navegador'; const c = await lanzar(9591), { send, ev } = c
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
  const abrirLista = async modo => {
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' }); await sleep(500); await ev(`window.__modo=${JSON.stringify(modo)}`)
    await esperar(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`, 'la canción en la lista'); await esperar(`document.fonts.status==='loaded'`, 'fuentes')
  }
  const abrirFicha = async (titulo, modo) => {
    await abrirLista(modo)
    await ev(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()===${JSON.stringify(titulo)}).click()`)
    await esperar(`document.querySelector('.anc-sheet')||document.querySelector('.anc-lyrEmpty')||document.querySelector('[data-ficha=vacia]')`, 'la ficha'); await sleep(700)
  }
  const medir = () => ev(`(()=>{const d=document,esc=parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--esc'))||1,q=s=>d.querySelector(s),cs=(e,p)=>e?getComputedStyle(e)[p]:null,r=e=>{const b=e.getBoundingClientRect();return[Math.round(b.width),Math.round(b.height)]}
    const h1s=[...d.querySelectorAll('h1')].filter(e=>e.offsetParent!==null&&e.textContent.trim()==='Cuán grande es Él')
    const barra=[...d.querySelectorAll('button')].find(b=>/Tipografía/.test(b.textContent)).parentElement
    return JSON.stringify({esc,cab:!!q('[data-ficha=cabecera]'),tit:!!q('[data-ficha=titulo]'),volver:q('.anc-fichaCab__volver')?r(q('.anc-fichaCab__volver')):null,editar:q('.anc-fichaCab__editar')?r(q('.anc-fichaCab__editar')):null,
      volverTxt:(q('.anc-fichaCab__volver')||{}).textContent,editarTxt:(q('.anc-fichaCab__editar')||{}).textContent,h1visibles:h1s.length,h1font:parseFloat(cs(q('.anc-fichaTit__titulo'),'fontSize')),h1peso:cs(q('.anc-fichaTit__titulo'),'fontWeight'),
      portada:q('.anc-fichaTit__portada')?r(q('.anc-fichaTit__portada')):null,artista:(q('.anc-fichaTit__artista')||{}).textContent,pastillas:[...d.querySelectorAll('.anc-fichaTit__pastillas li')].map(e=>e.textContent),
      seccion:(q('.anc-fichaSeccion')||{}).textContent||null,menu:q('button[aria-label="Más acciones de la canción"]')?r(q('button[aria-label="Más acciones de la canción"]')):null,
      barra:[...barra.querySelectorAll('button')].map(b=>b.textContent.replace(/\\s+/g,' ').trim()),viejoVolver:!![...d.querySelectorAll('button')].find(b=>b.textContent.trim()==='← Canciones'),
      prohibido:/Agregar a servicio|Transponer|Usada \\d/.test(d.body.innerText),ancho:d.documentElement.scrollWidth,
      tituloEnHoja:(q('.anc-sheet h1')||{}).textContent||null,tituloEnHojaVisible:!!(q('.anc-sheet h1')&&q('.anc-sheet h1').offsetParent!==null)})})()`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 900, deviceScaleFactor: telefono ? 2 : 1, mobile: telefono }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })

    // ── con letra, sin hoja con acordes ──
    await abrirFicha('Cuán grande es Él', 'sinhoja'); const m = await medir()
    if (telefono) {
      ok(m.cab && m.tit && /Canciones$/.test(m.volverTxt) && m.editarTxt === 'Editar', `${et}: cabecera «‹ Canciones» y «✎ Editar» y bloque de título`)
      ok(m.volver[1] >= 44 && m.editar[1] >= 44 && m.editar[0] >= 44 && m.menu[0] >= 44 && m.menu[1] >= 44, `${et}: «Canciones» (${m.volver}), «Editar» (${m.editar}) y «⋯» (${m.menu}) miden 44 o más`)
      ok(m.h1visibles === 1, `${et}: el título se ve UNA sola vez como h1 (${m.h1visibles}); la hoja no lo repite (en la hoja sigue en el DOM pero oculto: «${m.tituloEnHoja}», visible=${m.tituloEnHojaVisible})`)
      ok(Math.abs(m.h1font - 22 * m.esc) < 0.6 && m.h1peso === '800', `${et}: título de 22 de diseño × ${m.esc} = ${(22 * m.esc).toFixed(1)} px, medido ${m.h1font} px, peso ${m.h1peso}`)
      ok(Math.abs(m.portada[0] - 76 * m.esc) < 1.5 && Math.abs(m.portada[1] - 76 * m.esc) < 1.5, `${et}: portada de 76 de diseño × ${m.esc} = ${(76 * m.esc).toFixed(1)} px, medida ${m.portada}`)
      ok(m.artista === 'Chris Tomlin' && JSON.stringify(m.pastillas) === JSON.stringify(['Tono G', '72 bpm']), `${et}: artista «${m.artista}» y pastillas ${JSON.stringify(m.pastillas)} (la canción no tiene compás: no se inventa)`)
      ok(m.seccion === 'Letra y acordes', `${et}: «Letra y acordes» sobre la hoja`)
      ok(!m.barra.includes('Editar') && m.barra.some(t => /Tipografía/.test(t)) && m.barra.includes('Adjuntos'), `${et}: la barra de botones ya no trae «Editar» (${m.barra.join(' · ')})`)
      ok(!m.viejoVolver, `${et}: no queda la cabecera «← Canciones» de siempre`)
    } else {
      ok(!m.cab && !m.tit && m.viejoVolver, `${et}: escritorio: la cabecera de siempre («← Canciones»), sin la nueva`)
      ok(m.barra.includes('Editar') && m.seccion === null && m.tituloEnHojaVisible && m.tituloEnHoja === 'Cuán grande es Él', `${et}: escritorio: «Editar» sigue en la barra (${m.barra.join(' · ')}), el título sigue dentro de la hoja y no hay «Letra y acordes»`)
    }
    ok(!m.prohibido, `${et}: ni «Agregar a servicio», ni «Transponer», ni «Usada N veces»`); ok(m.ancho <= ancho, `${et}: la pantalla no se desliza de lado (${m.ancho} ≤ ${ancho})`)
    await foto('ficha-con-letra')

    // ── el menú «⋯» y las acciones ──
    await tocar(`document.querySelector('button[aria-label="Más acciones de la canción"]')`, '⋯')
    await esperar(boton('Archivar'), 'el menú «⋯»')
    const items = JSON.parse(await ev(`JSON.stringify([...(${boton('Archivar')}).parentElement.querySelectorAll('button')].map(b=>b.textContent.trim()))`))
    ok((telefono ? ['Editar datos', 'Archivar', 'Eliminar canción'] : ['Editar', 'Archivar', 'Eliminar']).every(t => items.includes(t)), `${et}: el menú «⋯» sigue con sus tres acciones (${items.join(', ')}; en teléfono es la hoja del paso 5)`); await foto('ficha-menu')
    paso = 'cerrar el menú tocando fuera'; await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 4, y: 120, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 4, y: 120, button: 'left', clickCount: 1 }); await sleep(400)
    ok(!(await ev(`!!(${boton('Archivar')})`)), `${et}: tocar fuera cierra el menú`)
    if (telefono) {
      await tocar(`document.querySelector('.anc-fichaCab__editar')`, '«Editar» de la cabecera'); await esperar(`document.querySelector('.anc-edicion')`, 'la edición')
      ok(/Editar canción/.test(await ev(`document.querySelector('.anc-edicion').innerText`)) && /Cuán grande es Él/.test(await ev(`document.querySelector('.anc-edicion input.anc-input').value`)), `${et}: «Editar» de la cabecera abre la edición de ESTA canción (el mismo formulario de siempre)`)
      await tocar(boton('Cancelar'), 'Cancelar'); await sleep(300)
      await tocar(`document.querySelector('.anc-fichaCab__volver')`, '«Canciones»'); await esperar(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Agregar canción')`, 'la lista')
      ok(true, `${et}: «Canciones» vuelve a la lista`)
      ok((await ev(`JSON.stringify(window.__escrituras)`)) === '[]', `${et}: nada se escribió al abrir, cancelar y volver`)

      // ── con hoja con acordes: el título tampoco se repite ──
      await abrirFicha('Cuán grande es Él', 'hoja'); const h = await medir()
      ok(h.h1visibles === 1 && h.cab && h.seccion === 'Letra y acordes', `${et}: con hoja con acordes: un solo título visible (${h.h1visibles}), cabecera y «Letra y acordes»`)
      ok((await ev(`document.querySelectorAll('.anc-sheet [data-a]').length`)) >= 2, `${et}: con hoja se ven los acordes`); await foto('ficha-con-hoja')

      // ── sin letra: el estado vacío de siempre, sin «Letra y acordes» ──
      await abrirFicha('Santo', 'sinhoja'); const v = await medir()
      ok(v.cab && v.seccion === null && /Santo/.test(await ev(`document.querySelector('.anc-fichaTit__titulo').textContent`)), `${et}: sin letra: cabecera con el título, SIN «Letra y acordes» sobre el estado vacío`)
      ok(await ev(`!!document.querySelector('[data-ficha=vacia]')&&!document.querySelector('.anc-lyrEmpty')`), `${et}: sin letra: el estado vacío nuevo (paso 3), no el de antes`); await foto('ficha-sin-letra')
    }
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
