// «Adjuntos» en su propia pantalla, en un navegador REAL (Chrome por CDP): 390 y 360 px, claro y oscuro. Servidor simulado en la página; datos INVENTADOS; ninguna escritura.
// Músico: el clip de la lectura con acordes (SIEMPRE visible) abre «Adjuntos – <canción>» (pantalla completa, flecha de volver ≥ 44 px, lista con «Ver»; sin archivos, «Aún no hay archivos» SIN «Sube archivos para comenzar»);
// la sección de abajo ya no existe; en la pantalla de letra (sin acordes) el botón «Adjuntos · N» de arriba la abre; la página de atrás no se desplaza mientras está abierta; sin desplazamiento lateral.
// Administración: la ficha ya no trae el bloque fijo «Adjuntos» de abajo; «Adjuntos · N» (conteo leído aparte) abre la misma pantalla con la lista y la subida; sin archivos, el vacío con «Sube archivos para comenzar»; la flecha cierra. Cero escrituras.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones-editor.sh tests/e2e-menus/adjuntos-pantalla.js <carpeta-de-capturas>      (SOLO="390 dark" para una sola combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), PM = require(R + 'portal-mock.js'), IM = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/adjuntos-pantalla'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2
const ADJ = [{ id: 'a1', nombre: 'Partitura de prueba.pdf', tamano: 120000, subidoPor: 'Ana', fecha: '2026-10-01T10:00:00Z' }, { id: 'a2', nombre: 'Acordes de prueba.pdf', tamano: 90000, subidoPor: null, fecha: null }]
// músico: ?__adj=0 → sin archivos (por localStorage __adj)
const PARCHE_MUSICO = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.adjuntos=localStorage.getItem('__adj')==='0'?[]:${JSON.stringify(ADJ)};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
// administración: song_attachments (conteo y lista) según localStorage __adj; registra TODA escritura
const FILAS = [{ id: 'f1', filename: 'Partitura de prueba.pdf', url: 'x/1.pdf', size: 120000, kind: 'pdf', created_at: '2026-10-01T10:00:00Z', uploaded_by_member: { nombre: 'Ana', apellido: 'Mora' } }, { id: 'f2', filename: 'Acordes de prueba.pdf', url: 'x/2.pdf', size: 90000, kind: 'pdf', created_at: '2026-10-02T10:00:00Z', uploaded_by_member: null }]
const PARCHE_ADMIN = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];window.__conteos=0;
const j=(b,s,h)=>new Response(JSON.stringify(b),{status:s||200,headers:Object.assign({'content-type':'application/json'},h||{})});
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();const url=new URL(u,location.href);
if(m!=='GET'&&m!=='HEAD'&&url.pathname.includes('/rest/v1/')&&!url.pathname.includes('/rpc/'))window.__escrituras.push({m,p:url.pathname});
if(url.pathname.endsWith('/rest/v1/song_attachments')){const n=localStorage.getItem('__adj')==='0'?0:${FILAS.length};
 if(m==='HEAD'||(m==='GET'&&/count=exact/.test(JSON.stringify(o&&o.headers||{})+(i&&i.headers?'':''))&&url.searchParams.get('select')==='id')){window.__conteos++;return new Response(m==='HEAD'?null:'[]',{status:200,headers:{'content-range':n?'0-'+(n-1)+'/'+n:'*/0','content-type':'application/json'}})}
 if(m==='GET')return j(n?${JSON.stringify(FILAS)}:[],200,{'content-range':n?'0-'+(n-1)+'/'+n:'*/0'})}
return f(i,o)}})()`

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9589), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,140)`)) } catch (_) { /* sin página */ } throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s (la pantalla dice: «${resto}»)`) } await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const tocar = async (nombre, buscar) => {
    paso = `tocar «${nombre}»`; let r = null
    for (let k = 0; k < 20 && !r; k++) { await esperar(buscar, nombre); r = JSON.parse(await ev(`(()=>{const e=${buscar};if(!e)return 'null';e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) await sleep(100) }
    if (!r) throw new Error(`«${nombre}» desapareció al tocarlo`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(300)
  }
  const PANT = `document.querySelector('[role=dialog][aria-label^="Adjuntos – "]')`
  const medir = () => ev(`(()=>{const p=${PANT};if(!p)return 'null';const r=p.getBoundingClientRect(),v=p.querySelector('button[aria-label="Volver"]').getBoundingClientRect();return JSON.stringify({w:Math.round(r.width),h:Math.round(r.height),iw:innerWidth,ih:innerHeight,volver:[Math.round(v.width),Math.round(v.height)],sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,overflow:document.body.style.overflow,titulo:p.querySelector('h2').textContent,z:+getComputedStyle(p.parentElement).zIndex,txt:p.innerText.replace(/\\s+/g,' ')})})()`).then(JSON.parse)
  try {
    paso = 'preparar el navegador'
    await send('Network.enable'); await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })

    // ═════ MÚSICO ═════
    const id1 = (await send('Page.addScriptToEvaluateOnNewDocument', { source: PM.MOCK })).identifier, id2 = (await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE_MUSICO })).identifier
    const abrirCancion = async (flags) => {
      await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
      await ev(`localStorage.clear();sessionStorage.clear();${flags}`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
      await esperar(`document.querySelector('ul li button[aria-label^="Cuán"]')`, 'la canción en la lista'); await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`)
    }
    // lectura con acordes, con archivos
    await abrirCancion(`localStorage.setItem('__acordes','1')`); await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(300)
    ok(await ev(`!document.getElementById('adjuntos-cancion')&&![...document.querySelectorAll('section')].some(s=>s.getAttribute('aria-label')==='Adjuntos')`), `${et}: músico: la sección «Adjuntos» de abajo ya no existe`)
    await tocar('clip Adjuntos', `document.querySelector('button[aria-label="Adjuntos"]')`); await esperar(PANT, 'la pantalla «Adjuntos»'); await sleep(250)
    let m = await medir()
    ok(m.titulo === 'Adjuntos – Cuán grande es Él', `${et}: músico: la pantalla se llama «${m.titulo}»`); ok(m.w === m.iw && m.h === m.ih, `${et}: músico: en teléfono ocupa toda la pantalla (${m.w}×${m.h} de ${m.iw}×${m.ih})`)
    ok(m.volver[0] >= 44 && m.volver[1] >= 44, `${et}: músico: la flecha de volver mide ${m.volver.join('×')} px`); ok(m.sw <= m.cw, `${et}: músico: sin desplazamiento lateral`); ok(m.overflow === 'hidden', `${et}: músico: la página de atrás no se desplaza mientras está abierta`)
    ok(/Partitura de prueba\.pdf/.test(m.txt) && /Acordes de prueba\.pdf/.test(m.txt) && !/Aún no hay archivos/.test(m.txt), `${et}: músico: lista los dos archivos`)
    ok(await ev(`[...${PANT}.querySelectorAll('button')].filter(b=>/^Ver /.test(b.getAttribute('aria-label')||'')).every(b=>{const r=b.getBoundingClientRect();return r.height>=44&&r.width>=44})&&${PANT}.querySelectorAll('button[aria-label^="Ver "]').length===2`), `${et}: músico: cada archivo tiene su «Ver» de ≥ 44 px`)
    ok(!/Sube archivos|Subir archivo|Agregar enlace/.test(m.txt), `${et}: músico: no puede subir nada (solo ve y abre)`); ok(m.z < 28 && m.z > 20, `${et}: músico: capa ${m.z}: sobre el menú (20) y bajo el visor de PDF (28)`)
    await foto('musico-con-archivos')
    await tocar('Volver', `${PANT}.querySelector('button[aria-label="Volver"]')`); await sleep(250)
    ok(await ev(`!${PANT}&&document.body.style.overflow!=='hidden'`), `${et}: músico: la flecha cierra la pantalla y la página vuelve a desplazarse`)
    // lectura con acordes, SIN archivos: el clip sigue ahí
    await ev(`localStorage.setItem('__adj','0')`); await abrirCancion(`localStorage.setItem('__acordes','1');localStorage.setItem('__adj','0')`); await esperar(`document.querySelector('ul[aria-label="Partes de la canción"]')`, 'la tira (sin archivos)'); await sleep(300)
    ok(await ev(`!!document.querySelector('button[aria-label="Adjuntos"]')`), `${et}: músico: el clip se ve aunque no haya archivos`)
    await tocar('clip Adjuntos (vacío)', `document.querySelector('button[aria-label="Adjuntos"]')`); await esperar(PANT, 'la pantalla vacía'); await sleep(250); m = await medir()
    ok(/Aún no hay archivos/.test(m.txt) && !/Sube archivos para comenzar/.test(m.txt), `${et}: músico: vacío = «Aún no hay archivos», sin invitar a subir`); await foto('musico-vacio')
    await tocar('Volver (vacío)', `${PANT}.querySelector('button[aria-label="Volver"]')`)
    // pantalla de letra (sin acordes): botón «Adjuntos · N» arriba
    await abrirCancion(`void 0`); await esperar(`document.querySelector('h2')&&[...document.querySelectorAll('h2')].some(h=>h.textContent==='Letra')`, 'la pantalla de letra'); await sleep(300)
    ok(await ev(`!document.querySelector('ul[aria-label="Partes de la canción"]')&&!document.getElementById('adjuntos-cancion')`), `${et}: músico: la pantalla de letra no tiene la sección de abajo`)
    const bt = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^Adjuntos/.test(x.textContent.trim()));if(!b)return 'null';const r=b.getBoundingClientRect();return JSON.stringify({t:b.textContent.trim(),h:Math.round(r.height),y:Math.round(r.top)})})()`).then(JSON.parse)
    ok(!!bt && bt.t === 'Adjuntos · 2' && bt.h >= 44, `${et}: músico: pantalla de letra: botón «${bt && bt.t}» de ${bt && bt.h} px arriba (y=${bt && bt.y})`); await foto('musico-letra-boton')
    await tocar('botón Adjuntos · 2', `[...document.querySelectorAll('button')].find(x=>/^Adjuntos/.test(x.textContent.trim()))`); await esperar(PANT, 'la pantalla desde la letra'); m = await medir()
    ok(/Partitura de prueba\.pdf/.test(m.txt), `${et}: músico: el botón de la pantalla de letra abre la misma pantalla`); await tocar('Volver (letra)', `${PANT}.querySelector('button[aria-label="Volver"]')`)
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id1 }); await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: id2 })

    // ═════ ADMINISTRACIÓN ═════
    await send('Page.addScriptToEvaluateOnNewDocument', { source: IM.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE_ADMIN }); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: IM.SESION(), url: B })
    const abrirFicha = async (adj) => {
      await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(500)
      await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin');localStorage.setItem('__adj','${adj}')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
      await tocar('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
      await esperar(`[...document.querySelectorAll('button')].find(b=>/^Adjuntos/.test(b.textContent.trim()))`, 'el botón Adjuntos'); await sleep(500)
    }
    await abrirFicha('2')
    ok(await ev(`!document.body.innerText.includes('Arrastra archivos aquí')&&![...document.querySelectorAll('h2')].some(h=>h.textContent==='Adjuntos')`), `${et}: administración: la ficha ya no trae el bloque «Adjuntos» de abajo`)
    ok(await ev(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Adjuntos · 2')`), `${et}: administración: el botón dice «Adjuntos · 2» (conteo leído aparte)`)
    ok(await ev(`window.__conteos>=1`), `${et}: administración: el conteo salió de una consulta de solo conteo`)
    await tocar('Adjuntos · 2', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Adjuntos · 2')`); await esperar(PANT, 'la pantalla de administración'); await esperar(`${PANT}.innerText.includes('Partitura de prueba.pdf')`, 'la lista'); m = await medir()
    ok(m.titulo === 'Adjuntos – Cuán grande es Él' && m.w === m.iw && m.volver[0] >= 44 && m.volver[1] >= 44, `${et}: administración: misma pantalla («${m.titulo}»), a pantalla completa y flecha de ${m.volver.join('×')} px`)
    ok(/Partitura de prueba\.pdf/.test(m.txt) && /Acordes de prueba\.pdf/.test(m.txt) && /\+ Subir archivo/.test(m.txt) && /\+ Agregar enlace/.test(m.txt) && /Arrastra archivos aquí/.test(m.txt), `${et}: administración: lista, subida (arrastrar, subir, enlace) como siempre`)
    ok(m.sw <= m.cw, `${et}: administración: sin desplazamiento lateral`); await foto('admin-con-archivos')
    await tocar('Volver (admin)', `${PANT}.querySelector('button[aria-label="Volver"]')`); await sleep(250); ok(await ev(`!${PANT}`), `${et}: administración: la flecha cierra la pantalla`)
    await abrirFicha('0'); ok(await ev(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Adjuntos')`), `${et}: administración: sin archivos el botón dice solo «Adjuntos»`)
    await tocar('Adjuntos (vacío)', `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Adjuntos')`); await esperar(PANT, 'la pantalla vacía de administración'); await esperar(`${PANT}.innerText.includes('Aún no hay archivos')`, 'el vacío'); m = await medir()
    ok(/Aún no hay archivos/.test(m.txt) && /Sube archivos para comenzar/.test(m.txt), `${et}: administración: vacío = «Aún no hay archivos» y «Sube archivos para comenzar»`); await foto('admin-vacio')
    const esc = await ev(`JSON.stringify(window.__escrituras)`).then(JSON.parse); ok(esc.length === 0, `${et}: administración: cero escrituras (${esc.length})`)
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
