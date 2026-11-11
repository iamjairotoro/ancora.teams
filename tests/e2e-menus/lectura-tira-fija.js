// Tira de partes FIJA de la lectura con acordes (C3) en un navegador REAL (Chrome por CDP). Datos INVENTADOS; servidor simulado en la página (tests/e2e-menus/portal-mock.js).
// Qué comprueba, en los cuatro modos (Ambos, Acordes, Letras y Ambos con vista compacta), con zona segura emulada (muesca) cuando Chrome lo permite:
//  (a) tras desplazarse mucho, el borde de arriba de la tira sigue pegado justo debajo de la zona segura y NADA la cubre; tiene fondo propio y una línea sutil;
//  (b) tras tocar cada parte, la cabecera de su sección queda visible, debajo de la tira y sin taparse con ella; la parte tocada queda activa;
//  (c) la parte activa sigue al desplazamiento y siempre está visible DENTRO de la tira (que se desliza de lado);
//  (d) ninguna escritura (ni POST, PUT, PATCH ni DELETE) durante todo el recorrido;
//  y además: ningún elemento fijo (menú inferior, reproductor, franja de la barra de estado) se pisa con la tira; el globo con el nombre queda en pantalla y no tapa los círculos; la pantalla no se desliza de lado.
// A 390 y 360 px, claro y oscuro; guarda capturas. Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 tests/e2e-menus/correr-combinaciones.sh tests/e2e-menus/lectura-tira-fija.js <carpeta-de-capturas>      (SOLO="390 light" para una sola combinación)
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'portal-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/lectura-tira-fija'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, SONDEO = 100, REINTENTOS = 2, ZONA_SEGURA = 47
const A = (g, cal = '') => ({ g, cal })
const ly = (t, g) => ({ kind: 'lyric', segments: [{ text: t, ...(g ? { acorde: A(g) } : {}) }] })
const SECS = [['V1', 'Verso 1', 1], ['C', 'Coro', 1], ['INT', 'Interludio', 1], ['V2', 'Verso 2', 1], ['C', 'Coro', 2], ['P', 'Puente', 1], ['INT', 'Instrumental', 1], ['TAG', 'Tag', 1], ['OUT', 'Final', 1], ['IN', 'Intro', 1]]
const cuerpo = (code, i) => code === 'INT' || code === 'IN' ? [{ kind: 'bars', items: [{ acorde: A(1) }, { acorde: A(6, 'm') }, { acorde: A(4) }, { acorde: A(5) }] }] : [ly('Línea de prueba número uno de la parte ' + (i + 1), 1), ly('Otra línea de prueba que sigue aquí mismo', 4), ly('Y una tercera línea para dar altura a la sección', 5), ly('Una cuarta línea más, solo de relleno', 1), ly('Y una quinta para que la pantalla se desplace bastante', 4)]
const ACORDES = { tono: 'G', secciones: SECS.map(([code, name, repeat], i) => ({ code, name, repeat, lineas: cuerpo(code, i) })) }
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];
const j=(b,s)=>new Response(JSON.stringify(b),{status:s||200,headers:{'content-type':'application/json'}});
const guardada=()=>{try{return JSON.parse(localStorage.getItem('__lectura')||'{}')}catch(e){return {}}};
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||'GET').toUpperCase();
if(m!=='GET'&&m!=='HEAD')window.__escrituras.push(m+' '+u);
const r=await f(i,o);
if(u.startsWith('/api/portal/preferencias')&&m==='GET'){let d={};try{d=await r.clone().json()}catch(e){d={}};d.lectura={notation:'americano',vista:'ambos',compacta:false,detalles:true,...guardada()};return j(d)}
if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes=${JSON.stringify(ACORDES)};return j(d)}
return r}})()`
const MODOS = [['ambos', { vista: 'ambos', compacta: false }], ['acordes', { vista: 'acordes', compacta: false }], ['letras', { vista: 'letras', compacta: false }], ['compacta', { vista: 'ambos', compacta: true }]]

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9589), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`); await sleep(SONDEO) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const UL = `document.querySelector('ul[aria-label="Partes de la canción"]')`, CIRC = `[...${UL}.querySelectorAll('button')]`, CAJA = `${UL}.parentElement`
  const rect = async sel => JSON.parse(await ev(`(()=>{const e=${sel};if(!e)return 'null';const r=e.getBoundingClientRect();return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height,b:r.bottom,r:r.right,cx:r.left+r.width/2,cy:r.top+r.height/2})})()`))
  const tocarXY = async r => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.cx, y: r.cy, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.cx, y: r.cy, button: 'left', clickCount: 1 }); await sleep(250) }
  const tocarCirculo = async i => { paso = `tocar la parte ${i + 1} de la tira`; await ev(`(()=>{const u=${UL},b=${CIRC}[${i}],ur=u.getBoundingClientRect(),br=b.getBoundingClientRect();u.scrollTo({left:u.scrollLeft+(br.left+br.width/2)-(ur.left+ur.width/2),behavior:'auto'})})()`); await sleep(120); await tocarXY(await rect(`${CIRC}[${i}]`)) }
  const activa = () => ev(`${CIRC}.findIndex(b=>b.getAttribute('aria-current')==='true')`)
  const irAlto = y => ev(`window.scrollTo(0,${y})`).then(() => sleep(350))
  const abrirCancion = async () => {
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    const BTN = `(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.childElementCount===0&&x.textContent.trim()==='Cuán grande es Él');return e&&(e.closest('button')||e)})()`
    await esperar(`${UL}||${BTN}`, 'la canción o su lista')
    if (!(await ev(`!!${UL}`))) await ev(`${BTN}.click()`)
    await esperar(UL, 'la tira de partes'); await esperar(`document.fonts.status==='loaded'`, 'fuentes'); await sleep(450)
  }
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    let zona = 0; try { await send('Emulation.setSafeAreaInsetsOverride', { insets: { top: ZONA_SEGURA, bottom: 34, left: 0, right: 0 } }) } catch (_) { /* Chrome sin la emulación */ }
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`)
    zona = Number(await ev(`(()=>{const p=document.createElement('div');p.style.cssText='position:absolute;padding-top:env(safe-area-inset-top)';document.body.appendChild(p);const v=parseFloat(getComputedStyle(p).paddingTop)||0;p.remove();return v})()`))
    ok(true, `${et}: zona segura emulada: ${zona} px${zona ? ' (la muesca)' : ' (Chrome no la emula: se prueba con 0 px; la fórmula usa --safe-top)'}`)

    for (const [modo, prefs] of MODOS) {
      const m = `${et} ${modo}`
      await ev(`localStorage.setItem('__lectura',${JSON.stringify(JSON.stringify(prefs))})`)
      await abrirCancion()
      const largo = await ev(`document.documentElement.scrollHeight`), alto = await ev(`innerHeight`)
      ok(largo > alto * 2, `${m}: la canción es larga (${largo} px en ${alto} px de pantalla)`)

      // ── (a) la tira queda fija arriba ──
      const raizBg = await ev(`getComputedStyle(document.querySelector('.portal-root')).backgroundColor`)
      const est = JSON.parse(await ev(`(()=>{const e=${CAJA},cs=getComputedStyle(e);return JSON.stringify({pos:cs.position,top:cs.top,bg:cs.backgroundColor,sombra:cs.boxShadow,z:cs.zIndex})})()`))
      ok(est.pos === 'sticky' && parseFloat(est.top) === zona, `${m}: la tira es sticky y se pega a ${est.top} (la zona segura)`)
      ok(est.bg !== 'rgba(0, 0, 0, 0)' && est.bg === raizBg, `${m}: la tira tiene fondo propio, el del tema (${est.bg})`); ok(est.sombra !== 'none', `${m}: lleva una línea sutil debajo (${est.sombra})`)
      for (const y of [600, 1500, Math.floor(largo / 2), largo]) {
        await irAlto(y)
        const t = await rect(CAJA), arribaOk = Math.abs(t.y - zona) <= 1
        const tapado = await ev(`(()=>{const r=${CAJA}.getBoundingClientRect();const pts=[[r.left+12,r.top+r.height/2],[r.right-12,r.top+4],[r.left+r.width/2,r.bottom-3]];return pts.map(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&${CAJA}.contains(e)?'':(e?e.tagName+'.'+String(e.className).slice(0,30):'nada')}).filter(Boolean).join(',')})()`)
        ok(arribaOk && tapado === '', `${m}: con scrollY ${await ev('Math.round(scrollY)')} el borde de la tira está en ${Math.round(t.y)} px (esperado ${zona}) y nada la cubre${tapado ? ' — la cubre: ' + tapado : ''}`)
      }
      const fijos = await ev(`(()=>{const t=${CAJA}.getBoundingClientRect(),res=[];for(const e of document.querySelectorAll('body *')){const cs=getComputedStyle(e);if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden')continue;const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;if(r.bottom>t.top+1&&r.top<t.bottom-1&&r.right>t.left&&r.left<t.right)res.push(e.tagName+'.'+String(e.className).slice(0,40))}return res.join(' | ')})()`)
      ok(fijos === '', `${m}: ningún elemento fijo (menú inferior, reproductor, franja de la barra de estado) se pisa con la tira${fijos ? ' — se pisa con: ' + fijos : ''}`)
      ok((await ev(`document.documentElement.scrollWidth`)) <= (await ev(`innerWidth`)), `${m}: la pantalla no se desliza de lado`)
      if (modo === 'ambos') await foto('fija-arriba')

      // ── la tira se desliza de lado ──
      await irAlto(Math.floor(largo / 2))
      const lado = JSON.parse(await ev(`(()=>{const u=${UL};u.scrollTo({left:0,behavior:'auto'});const a=u.scrollLeft;u.scrollTo({left:90,behavior:'auto'});return JSON.stringify({a,b:u.scrollLeft,sw:u.scrollWidth,cw:u.clientWidth})})()`))
      ok(lado.sw > lado.cw && lado.b > lado.a, `${m}: la tira sigue deslizándose de lado con la tira fija (scrollLeft ${lado.a}→${lado.b}; ${lado.sw} px de contenido en ${lado.cw} px)`)

      // ── (b) tocar cada parte: su cabecera queda visible y debajo de la tira ──
      const fallasB = []
      for (let i = 0; i < SECS.length; i++) {
        await irAlto(0); await sleep(1000)      // pasa el bloqueo de la parte activa del salto anterior
        await tocarCirculo(i); await sleep(350)
        const act = await activa(), t = await rect(CAJA)
        const cab = await rect(`document.querySelector('section#parte-${i} p[data-parte]')`)
        const encima = await ev(`(()=>{const e=document.querySelector('section#parte-${i} p[data-parte]');const r=e.getBoundingClientRect();const x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!x&&e.contains(x)})()`)
        if (!(cab.y >= t.b - 1 && cab.b <= alto && encima)) fallasB.push(`${i + 1} (cabecera a ${Math.round(cab.y)} px, tira hasta ${Math.round(t.b)}, ${encima ? 'visible' : 'TAPADA'})`)
        if (act !== i) fallasB.push(`${i + 1} (la activa quedó en ${act + 1})`)
        if (i === 5 && modo === 'ambos') await foto('fija-tras-salto')
      }
      ok(fallasB.length === 0, `${m}: al tocar cada una de las 10 partes, su cabecera queda visible justo debajo de la tira y la parte tocada queda activa${fallasB.length ? ' — fallan: ' + fallasB.join('; ') : ''}`)

      // ── (c) la parte activa sigue al desplazamiento y se ve dentro de la tira ──
      await sleep(1000)
      const alturas = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('section[id^="parte-"]')].map(s=>Math.round(s.getBoundingClientRect().height)))`))
      const fallasC = [], finPagina = []
      for (let i = 0; i < SECS.length; i++) {
        const t0 = await rect(CAJA), s0 = await rect(`document.getElementById('parte-${i}')`)
        await ev(`window.scrollTo(0, window.scrollY + ${s0.y - (t0.b + 10)})`); await sleep(450)
        const act = await activa(), t1 = await rect(CAJA)
        const sI = await rect(`document.getElementById('parte-${i}')`), llegó = Math.abs(sI.y - (t1.b + 10)) <= 2      // al final de la página las últimas secciones no pueden subir hasta la tira
        if (!llegó) finPagina.push(SECS[i][1])
        else if (act !== i) fallasC.push(`${SECS[i][1]} (activa ${act + 1})`)      // incluidas las cortas (Interludio, Instrumental): la línea de lectura está bajo la tira
        const dentro = await ev(`(()=>{const u=${UL}.getBoundingClientRect(),b=${CIRC}[${act}].getBoundingClientRect();return b.left>=u.left-1&&b.right<=u.right+1})()`)
        if (!dentro) fallasC.push(`${SECS[i][1]} (su círculo quedó fuera de la tira)`)
        if (Math.abs(t1.y - zona) > 1) fallasC.push(`${SECS[i][1]} (la tira se movió a ${Math.round(t1.y)} px)`)
      }
      ok(fallasC.length === 0, `${m}: al desplazarse, la parte activa sigue a la lectura y su círculo se ve siempre dentro de la tira${fallasC.length ? ' — fallan: ' + fallasC.join('; ') : ''}`)
      ok(SECS.length - finPagina.length >= 7, `${m}: la comprobación de «la activa sigue al desplazamiento» cubrió ${SECS.length - finPagina.length} de 10 secciones, las cortas incluidas (el resto está al final de la página)`)
      if (finPagina.length) out.push(`AVISO ${m}: al final de la página (${finPagina.join(', ')}) la sección no puede subir hasta la tira; es así desde antes de este cambio`)
      void alturas

      // ── el globo del nombre ──
      await irAlto(Math.floor(largo / 2)); await sleep(500)
      const a = await activa(); await tocarCirculo(a); await sleep(250)
      const g = JSON.parse(await ev(`(()=>{const t=${CAJA}.querySelector('[role=status]');if(!t)return 'null';const r=t.getBoundingClientRect(),c=${CAJA}.getBoundingClientRect();const pe=t.style.pointerEvents;t.style.pointerEvents='auto';const x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);t.style.pointerEvents=pe;const circ=${CIRC}.some(b=>{const q=b.getBoundingClientRect();return q.left<r.right&&q.right>r.left&&q.top<r.bottom&&q.bottom>r.top});return JSON.stringify({txt:t.textContent,l:r.left,r:r.right,t:r.top,b:r.bottom,iw:innerWidth,ih:innerHeight,cb:c.bottom,ct:c.top,libre:!!x&&t.contains(x),pisaCirculos:circ})})()`))
      ok(g && g.txt && g.l >= 0 && g.r <= g.iw && g.t >= 0 && g.b <= g.ih && g.libre && !g.pisaCirculos, `${m}: el globo «${g && g.txt}» queda en pantalla, no lo tapa nada y no cubre ningún círculo${g ? ` (de ${Math.round(g.t)} a ${Math.round(g.b)} px; tira de ${Math.round(g.ct)} a ${Math.round(g.cb)})` : ''}`)
      ok(g && g.t >= g.cb - 4, `${m}: con la tira pegada arriba el globo va debajo de ella`)
      if (modo === 'ambos') await foto('fija-globo')
      await sleep(2400)
      if (modo !== 'ambos') await foto(`fija-${modo}`)

      // ── (d) sin escrituras ──
      const esc = JSON.parse(await ev(`JSON.stringify(window.__escrituras||[])`)), nuevas = esc.filter(x => x !== 'POST /api/portal/visita')      // la visita es el contador que la lectura ya enviaba antes de la tira fija
      ok(nuevas.length === 0, `${m}: ninguna escritura nueva durante todo el recorrido; solo las que la lectura ya hacía (${esc.length} visita${esc.length === 1 ? '' : 's'} a /api/portal/visita; otras: ${nuevas.length}${nuevas.length ? ' — ' + nuevas.join(', ') : ''})`)
    }
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
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, ${avisos} avisos`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
