// El LÍDER en teléfono con las pantallas del administrador (Servicios · lista, servicio y equipo) en un navegador REAL (Chrome por CDP). Servidor simulado en la página (inv5-mock.js, ?__lider=1); datos INVENTADOS; nada se escribe.
// Qué comprueba: la lista destaca solo el servicio más cercano («en N días», fecha más grande) y los demás son filas; la pantalla del servicio tiene la ficha de la fecha con la rejilla de equipos (etiquetas «Faltan N»), la etiqueta azul «Tu equipo»
// en SU tarjeta y NINGÚN borde de énfasis (los dos bordes laterales miden lo mismo que en un equipo ajeno), el candado en los ajenos, y NO tiene lápiz del horario, «Notificar», «Orden del servicio» ni «⋯»; el equipo propio abre herramientas,
// «Añadir», «Gestionar equipo» y la ventana de una posición; el equipo AJENO no tiene ni un botón de edición y tocar sus tarjetas no abre nada; con dos equipos propios los dos llevan «Tu equipo»; mientras carga se ve el esqueleto; sin
// desplazamiento lateral; tocables de 44 px. 390 y 360 px, claro y oscuro; guarda las capturas. Ninguna petición que escriba.
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/lider-pantallas.js <carpeta-de-capturas>      (SOLO="390 dark" para una combinación)
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/lider-pantallas'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = Number(process.env.ESPERA_MAX) || 15000, REINTENTOS = 2
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__escrituras=[];
window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const m=((o&&o.method)||(i&&i.method)||'GET').toUpperCase();
if(m!=='GET'&&m!=='HEAD'&&!u.includes('/rest/v1/rpc/')&&(u.startsWith('/api/')||u.includes('/rest/v1/')))window.__escrituras.push(m+' '+u.split('?')[0]);
if(u.startsWith('/api/lider/servicio?')&&new URLSearchParams(location.search).get('__lento')==='1')await new Promise(r=>setTimeout(r,2500));
return f(i,o)}})()`
const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9597), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) { let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* cambiando */ } if (v) return; if (Date.now() - t0 > ESPERA_MAX) { let resto = ''; try { resto = String(await ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,200)`)) } catch (_) {} throw new Error(`no apareció «${nombre}». Se ve: ${resto}`) } await sleep(100) }
  }
  const foto = async nombre => { paso = `captura «${nombre}»`; await sleep(300); const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const ir = async ruta => { await send('Page.navigate', { url: B + ruta }); await sleep(500) }
  const pulsar = async expr => {
    const r = JSON.parse(await ev(`(()=>{const e=${expr};if(!e)return 'null';e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height})})()`))
    if (!r) throw new Error('no se encontró lo que se iba a tocar: ' + expr)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(500)
    return r
  }
  const texto = () => ev(`document.body.innerText.replace(/\\s+/g,' ')`)
  const boton = txt => `[...document.querySelectorAll('button')].find(b=>b.textContent.replace(/\\s+/g,' ').trim()===${JSON.stringify(txt)})`
  const tarjeta = nombre => `[...document.querySelectorAll('button')].find(b=>b.className.includes('tarjetaEquipo')&&b.innerText.includes(${JSON.stringify(nombre)}))`
  const ancho_ok = async () => (await ev(`document.documentElement.scrollWidth`)) <= ancho
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 900, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })

    // ── 1. la lista: la jerarquía del administrador ──
    await ir('/home/servicios?__lider=1')
    await esperar(`document.querySelectorAll('ul li button[aria-label]').length>=2`, 'la lista de servicios'); await esperar(`document.fonts.status==='loaded'`, 'fuentes')
    const l = JSON.parse(await ev(`(()=>{const f=[...document.querySelectorAll('ul li')].map(li=>{const d=li.querySelector('b'),r=li.getBoundingClientRect();return{dia:d?parseFloat(getComputedStyle(d).fontSize):0,alto:Math.round(r.height),enDias:/\\ben (\\d+ días|\\d+ día)|mañana|hoy\\b/.test(li.innerText)}});return JSON.stringify({f,h1:document.querySelector('h1')&&document.querySelector('h1').textContent.trim()})})()`))
    ok(l.h1 === 'Servicios' && l.f.length >= 2, `${et}: la lista se titula «Servicios» y trae al menos dos servicios`)
    ok(l.f[0].enDias && l.f.slice(1).every(x => !x.enDias), `${et}: solo el más cercano lleva «en N días»`)
    ok(l.f[0].dia > l.f[1].dia, `${et}: la fecha del más cercano es MÁS GRANDE que la de los siguientes (${l.f[0].dia}px frente a ${l.f[1].dia}px)`)
    ok(l.f[0].alto > l.f[1].alto && new Set(l.f.slice(1).map(x => x.dia)).size === 1, `${et}: la ficha destacada es más alta y los demás son filas iguales`)
    const col = JSON.parse(await ev(`(()=>{const f=[...document.querySelectorAll('ul li > div')].map(d=>getComputedStyle(d).getPropertyValue('--anc-team-a').trim());return JSON.stringify(f)})()`))
    ok(col[0] !== '' && col.slice(1).every(x => x !== col[0]), `${et}: la franja del primer servicio lleva el color del equipo del líder (${col[0]}) y las demás filas no (${col.slice(1)[0] || 'sin color propio'})`)
    ok(await ancho_ok(), `${et}: la lista no se desplaza de lado`); await foto('1-lista')

    // ── 2. el servicio: ficha de la fecha + rejilla de equipos ──
    await pulsar(`document.querySelector('ul li button[aria-label]')`)
    await esperar(`document.querySelector('h1')&&/Equipos/.test(document.body.innerText)`, 'la pantalla del servicio')
    const s = JSON.parse(await ev(`(()=>{const t=document.body.innerText.replace(/\\s+/g,' '),cards=[...document.querySelectorAll('button')].filter(b=>b.className.includes('tarjetaEquipo')),cs=e=>{const c=getComputedStyle(e);return{l:c.borderLeftWidth,r:c.borderRightWidth,b:c.borderBottomWidth,t:c.borderTopWidth}}
      return JSON.stringify({t,n:cards.length,propia:cards.map(e=>/Tu equipo/.test(e.innerText)),candado:cards.map(e=>!!e.querySelector('svg.lucide-lock')),bordes:cards.map(cs),faltan:cards.map(e=>/Falta/.test(e.innerText)),alto:cards.map(e=>Math.round(e.getBoundingClientRect().height)),
        lapiz:!!document.querySelector('[aria-label="Cambiar horario"]'),mas:!!document.querySelector('[aria-label="Más acciones"]'),selector:!!document.querySelector('[aria-label^="Cambiar servicio"]')})})()`))
    ok(s.n === 2 && s.propia[0] && !s.propia[1], `${et}: la rejilla trae sus dos equipos y SOLO el suyo dice «Tu equipo»`)
    ok(!s.candado[0] && s.candado[1], `${et}: el candado de solo lectura está en el equipo ajeno y no en el suyo`)
    ok(s.bordes[0].l === s.bordes[1].l && s.bordes[0].r === s.bordes[1].r && s.bordes[0].b === s.bordes[1].b && s.bordes[0].l === '0px' && s.bordes[0].b === '0px', `${et}: sin borde de énfasis: la tarjeta del líder tiene los mismos bordes que la ajena (${JSON.stringify(s.bordes[0])})`)
    ok(/Quien administra envía la convocatoria\. Aquí solo preparas tu equipo\./.test(s.t), `${et}: la frase de la convocatoria se mantiene`)
    ok(!/Orden del servicio|Notificar/.test(s.t) && !s.lapiz && !s.mas && !s.selector, `${et}: sin «Orden del servicio», «Notificar», lápiz del horario, «⋯» ni selector de servicio (no son del líder)`)
    ok(/Equipos/.test(s.t) && /Elige un equipo para ver a su gente y sus herramientas\. Solo puedes cambiar el tuyo\./.test(s.t) && /\d+ de \d+ confirmad/.test(s.t), `${et}: ficha de la fecha con su avance y la ayuda de la rejilla`)
    ok(s.alto.every(a => a >= 44) && await ancho_ok(), `${et}: las tarjetas se tocan (≥ 44 px) y nada se desplaza de lado`); await foto('2-servicio')

    // ── 3. SU equipo ──
    await pulsar(tarjeta('Alabanza')); await esperar(`/Gestionar equipo/.test(document.body.innerText)`, 'la pantalla de su equipo')
    const p = JSON.parse(await ev(`(()=>{const t=document.body.innerText.replace(/\\s+/g,' '),h=document.querySelector('section[aria-label="Alabanza"]'),pos=[...document.querySelectorAll('button[aria-label*="/"]')]
      return JSON.stringify({t,url:location.search,chip:/Tu equipo/.test(h?h.innerText:''),pos:pos.length,posAlto:pos.map(b=>Math.round(b.getBoundingClientRect().height)),herr:[...document.querySelectorAll('button')].filter(b=>b.className.includes('fichaHerr')&&!b.className.includes('Anadir')).length,anadir:/Añadir/.test(t),borde:h?getComputedStyle(h).borderLeftWidth:null})})()`))
    ok(/equipo=t1/.test(p.url) && p.chip, `${et}: su equipo abre con la URL del equipo y «Tu equipo» en la cabecera`)
    ok(p.herr >= 2 && !p.anadir && /Gestionar equipo/.test(p.t) && p.pos >= 2, `${et}: ve sus herramientas (abren), «Gestionar equipo» y las posiciones se pueden tocar; con las tres herramientas puestas no sobra «Añadir» (${p.herr} herramientas, ${p.pos} posiciones)`)
    ok(p.borde === '0px' && /Quien administra envía la convocatoria/.test(p.t) && !/Notificar|Orden del servicio|Solo lectura/.test(p.t), `${et}: la cabecera de su equipo no tiene borde de énfasis ni «Notificar»; sí la frase de la convocatoria`)
    await pulsar(`document.querySelector('button[aria-label*="/"]')`); await esperar(`document.querySelector('[role=dialog]:not(.anc-drawer)')`, 'la ventana de la posición')
    ok(true, `${et}: tocar una posición de su equipo abre su ventana`); await foto('3-equipo-propio-ventana')
    await pulsar(`[...document.querySelectorAll('[role=dialog]:not(.anc-drawer) button')].find(b=>/Cerrar|Cancelar/.test(b.getAttribute('aria-label')||b.textContent))`).catch(() => {})
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' }); await sleep(500)
    await ir('/home/servicios?servicio=conv&equipo=t1&__lider=1'); await esperar(`/Gestionar equipo/.test(document.body.innerText)`, 'su equipo (otra vez)'); await foto('3-equipo-propio')
    ok(await ancho_ok(), `${et}: su pantalla de equipo no se desplaza de lado`)

    await ir('/home/servicios?servicio=conv&equipo=t1&__lider=1&__sinherr=1'); await esperar(`/Gestionar equipo/.test(document.body.innerText)`, 'su equipo sin notas')
    ok(await ev(`!!${boton('Añadir')}`), `${et}: si a su equipo le falta una herramienta, sale «Añadir»`)
    await pulsar(boton('Añadir')); await esperar(`document.querySelector('[role=dialog]:not(.anc-drawer)')`, 'la hoja «Agregar herramienta»'); await foto('3-equipo-propio-anadir')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' }); await sleep(500)

    // ── 4. un equipo AJENO: solo lectura ──
    await ir('/home/servicios?servicio=conv&__lider=1'); await esperar(`/Equipos/.test(document.body.innerText)`, 'el servicio')
    await pulsar(tarjeta('Producción')); await esperar(`/Solo lectura/.test(document.body.innerText)`, 'la pantalla del equipo ajeno')
    const a = JSON.parse(await ev(`(()=>{const t=document.body.innerText.replace(/\\s+/g,' '),main=document.querySelector('h1').closest('div').parentElement,bots=[...main.querySelectorAll('button')].map(b=>(b.getAttribute('aria-label')||b.textContent).trim())
      return JSON.stringify({t,url:location.search,bots,herr:[...document.querySelectorAll('span')].filter(e=>e.className.includes('fichaHerrQuieta')).length,anadir:/Añadir|Gestionar/.test(t),tu:/Tu equipo/.test(t)})})()`))
    ok(/equipo=t2/.test(a.url) && /Producción/.test(a.t) && /Solo lectura/.test(a.t) && !a.tu, `${et}: el equipo ajeno abre con «Solo lectura» y sin «Tu equipo»`)
    ok(!a.anadir && !/Notificar|Asignar/.test(a.t) && a.bots.every(x => /Volver|Servicio|^$/.test(x) || /^(?:[A-Za-zÁ-ú]+ ?\d+ ?[a-z]+)$/.test(x)) , `${et}: sin «Añadir», «Gestionar equipo» ni botones de edición (botones en la pantalla: ${JSON.stringify(a.bots)})`)
    ok(a.herr >= 1 && /Sonido|Proyección/.test(a.t) && /Voluntarios/.test(a.t), `${et}: ve sus herramientas (quietas, no se abren), sus posiciones y quién está`)
    await pulsar(`document.querySelector('[class*=posCard]')`); await pulsar(`document.querySelector('[class*=fichaHerrQuieta]')`)
    const tras = JSON.parse(await ev(`JSON.stringify({dialogo:!!document.querySelector('[role=dialog]:not(.anc-drawer)'),url:location.search,t:document.body.innerText.replace(/\\s+/g,' ').slice(0,90)})`))
    ok(!tras.dialogo && /equipo=t2/.test(tras.url) && /Producción/.test(tras.t), `${et}: tocar las tarjetas del equipo ajeno no abre nada (${JSON.stringify(tras)})`)
    ok(await ancho_ok(), `${et}: el equipo ajeno no se desplaza de lado`); await foto('4-equipo-ajeno')
    await pulsar(`document.querySelector('button[aria-label="Volver al servicio"]')`); await esperar(`/Elige un equipo/.test(document.body.innerText)`, 'volver al servicio')
    ok(true, `${et}: desde el equipo se vuelve al servicio`)

    // ── 5. dos equipos propios ──
    await ir('/home/servicios?servicio=conv&__lider=1&__dosl=1'); await esperar(`/Equipos/.test(document.body.innerText)`, 'el servicio con dos equipos')
    const d = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('button')].filter(b=>b.className.includes('tarjetaEquipo')).map(e=>/Tu equipo/.test(e.innerText)))`))
    ok(d.length === 2 && d.every(Boolean), `${et}: si lidera dos equipos, los dos llevan «Tu equipo»`)

    // ── 6. cargando: el esqueleto, no otra pantalla ──
    await ir('/home/servicios?servicio=conv&__lider=1&__lento=1'); await sleep(900)
    const k = JSON.parse(await ev(`JSON.stringify({sk:document.querySelectorAll('.anc-skel').length,cargando:/Cargando…/.test(document.body.innerText),viejo:/Ver equipo|Solo lectura/.test(document.body.innerText)})`))
    ok(k.sk >= 3 && !k.cargando && !k.viejo, `${et}: mientras carga el servicio se ve el esqueleto (${k.sk} bloques), sin «Cargando…» suelto ni la pantalla antigua`)
    await foto('5-cargando')
    await esperar(`/Equipos/.test(document.body.innerText)`, 'el servicio ya cargado')

    // ── 7. el nombre de la herramienta y la pantalla Personas ──
    await ir('/home/servicios?servicio=conv&equipo=t1&vista=horario&ref=k3&__lider=1'); await esperar(`document.querySelector('h1')`, 'la pantalla del cronograma'); await sleep(600)
    const h1 = await ev(`document.querySelector('h1').textContent.trim()`)
    ok(h1 === 'Cronograma', `${et}: la pantalla de la herramienta se llama «${h1}», como en el administrador`); await foto('6-cronograma')
    await ir('/home/personas?__lider=1'); await esperar(`/Tu equipo/.test(document.body.innerText)`, 'Personas'); await sleep(600)
    const pe = JSON.parse(await ev(`(()=>{const s=[...document.querySelectorAll('section')].find(x=>/Tu equipo/.test(x.innerText));const c=getComputedStyle(s);return JSON.stringify({l:c.borderLeftWidth,r:c.borderRightWidth,t:c.borderTopWidth,b:c.borderBottomWidth,etq:!![...s.querySelectorAll('span')].find(e=>e.textContent.trim()==='Tu equipo')})})()`))
    ok(pe.l === '0px' && pe.r === '0px' && pe.t === '0px' && pe.b === '0px' && pe.etq, `${et}: en Personas la tarjeta «Tu equipo» no tiene borde y conserva la etiqueta azul (${JSON.stringify(pe)})`); await foto('7-personas')

    // ── 8. nada se escribió ──
    const w = JSON.parse(await ev(`JSON.stringify(window.__escrituras||[])`))
    ok(w.length === 0, `${et}: ninguna petición escribió nada${w.length ? ' (' + w.join(', ') + ')' : ''}`)
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
