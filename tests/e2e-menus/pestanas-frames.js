// El cambio entre pestañas del portal del músico, MEDIDO POR FOTOGRAMAS en un navegador de verdad (390 px). Antes de tocar nada (movimiento M6) sirve para buscar el parpadeo del diseño antiguo y los saltos del menú inferior; después, para demostrar que no
// hay saltos ni parpadeo. En cada cuadro (requestAnimationFrame) anota: la caja del menú inferior (si sube, baja o cambia de tamaño), la lente (posición, ancho, opacidad), la «firma» del contenido (clases de lo que hay en pantalla, sin los sufijos de CSS Modules),
// los marcadores de espera (esqueleto, «Cargando», giro), el desplazamiento y el alto de la página. Informa: saltos del menú, saltos de la lente (más de lo que permite su viaje), firmas que duran pocos cuadros y luego desaparecen (parpadeo) y marcadores de espera.
// `--grabar <carpeta>` guarda además un video de cuadros (Page.startScreencast, JPEG) para mirarlo. Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/pestanas-frames.js [--grabar carpeta] [--json salida.json]
const fs = require('fs'), path = require('path'), { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null }
const GRABAR = arg('--grabar'), SALIDA = arg('--json'), LATENCIA = +(arg('--lat') || 0), CPU = +(arg('--cpu') || 1), SCROLL = +(arg('--scroll') || 0)
const REGISTRO = `window.__fr = (ms, accion) => new Promise(res => { const t0 = performance.now(), out = []; if (accion) (0, eval)(accion)
  const lim = s => String(s || '').replace(/_[A-Za-z0-9-]{5,}(?=\\s|$)/g, '').replace(/__[A-Za-z0-9-]{5}/g, '').trim()
  const f = () => { const nav = document.querySelector('nav'), r = nav && nav.getBoundingClientRect(), len = document.querySelector('nav [class*="lente"]'), lc = len && getComputedStyle(len), cont = document.querySelector('.portal-content-wrap')
    const sig = cont ? [...cont.children].map(e => e.tagName.toLowerCase() + '.' + lim(e.className).split(/\\s+/).slice(0, 2).join('.')).join(' | ') : '(sin contenido)'
    const hondo = cont ? (() => { let h = 0; const clases = new Set(); for (const e of cont.querySelectorAll('*')) { const k = lim(e.className); if (k) clases.add(k.split(/\\s+/)[0]); h++ } return h + '#' + [...clases].sort().join(',').length + '#' + (cont.innerText || '').length })() : '0'
    const esperas = [...document.querySelectorAll('[class*="squelet"], [class*="Squelet"], [class*="giro"], [class*="cargando"], [aria-label="Cargando"], [aria-busy="true"]')].filter(e => e.getBoundingClientRect().width > 0).length
    const m = lc && new DOMMatrixReadOnly(lc.transform)
    const hijo = cont && cont.firstElementChild, hc = hijo && getComputedStyle(hijo), tar = document.querySelector('[class*="tarjetaIn"]'), tc = tar && getComputedStyle(tar)
    out.push({ fo: hc ? +(+hc.opacity).toFixed(3) : null, ftr: hc ? hc.translate : null, tarOp: tc ? +(+tc.opacity).toFixed(3) : null, tarAn: tc ? tc.animationName : null, t: Math.round(performance.now() - t0), nav: r ? [Math.round(r.top * 10) / 10, Math.round(r.left * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10] : null, lente: lc ? [Math.round(m.m41 * 10) / 10, Math.round(parseFloat(lc.width) * 10) / 10, +lc.opacity] : null, sig, hondo, esperas, sy: Math.round(scrollY), dh: document.documentElement.scrollHeight, act: (document.querySelector('nav [aria-current="page"]') || {}).textContent || null })
    if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(out) }; f() })`
;(async () => {
  const c = await lanzar(9601), { send, ev } = c
  await send('Network.enable'); await send('Page.addScriptToEvaluateOnNewDocument', { source: REGISTRO }); await send('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B })
  if (LATENCIA) await send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{const o=window.fetch.bind(window);window.fetch=(i,init)=>new Promise(r=>setTimeout(r,${LATENCIA})).then(()=>o(i,init))})()` })
  if (CPU > 1) await send('Emulation.setCPUThrottlingRate', { rate: CPU })
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(4000 + 4 * LATENCIA)
  let grabador = null, nCuadros = 0
  if (GRABAR) { fs.mkdirSync(GRABAR, { recursive: true }); let visto = 0
    grabador = setInterval(() => { while (visto < c.eventos.length) { const e = c.eventos[visto++]; if (e.method !== 'Page.screencastFrame') continue; send('Page.screencastFrameAck', { sessionId: e.params.sessionId }).catch(() => {}); fs.writeFileSync(path.join(GRABAR, String(++nCuadros).padStart(4, '0') + '-' + Math.round(e.params.metadata.timestamp * 1000 % 1e7) + '.jpg'), Buffer.from(e.params.data, 'base64')) } }, 15)
    await send('Page.startScreencast', { format: 'jpeg', quality: 55, maxWidth: 390, maxHeight: 844, everyNthFrame: 1 }) }
  const clic = async texto => { const r = JSON.parse(await ev(`(()=>{const b=[...document.querySelectorAll('nav button')].find(x=>x.getBoundingClientRect().width>0&&x.textContent.trim().startsWith(${JSON.stringify(texto)}));if(!b)return 'null';const r=b.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`)); if (!r) return false
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y }); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 }); await sleep(40); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 }); return true }
  const tabs = arg('--tabs') ? arg('--tabs').split(',') : ['Servicios', 'Canciones', 'Chats', 'Perfil', 'Inicio', 'Canciones', 'Inicio']
  const informe = []
  for (const tab of tabs) {
    await sleep(900 + 2 * LATENCIA)
    if (SCROLL) { await ev(`window.scrollTo(0, ${SCROLL})`); await sleep(300) }
    const p = ev(`__fr(${1400 + 3 * LATENCIA})`); await sleep(120); const ok = await clic(tab); const fr = await p
    // análisis
    const navs = fr.filter(x => x.nav).map(x => x.nav), navSaltos = navs.filter((n, i) => i && (Math.abs(n[0] - navs[i - 1][0]) > 0.5 || Math.abs(n[3] - navs[i - 1][3]) > 0.5 || Math.abs(n[2] - navs[i - 1][2]) > 0.5)).length
    const lentes = fr.filter(x => x.lente).map(x => x.lente), saltosLente = lentes.filter((l, i) => i && Math.abs(l[0] - lentes[i - 1][0]) > 90).length, lenteDestino = lentes[lentes.length - 1]
    const firmas = []; for (const x of fr) { const u = firmas[firmas.length - 1]; if (u && u.sig === x.sig && u.hondo === x.hondo) u.n++; else firmas.push({ sig: x.sig, hondo: x.hondo, n: 1, t: x.t, esperas: x.esperas }) }
    const finalSig = firmas[firmas.length - 1].sig, fugaces = firmas.filter((f, i) => i > 0 && i < firmas.length - 1 && f.n <= 6)
    const esp = firmas.filter(f => f.esperas > 0 && f.sig !== finalSig || (f.esperas > 0 && f.n > 0))
    const dh = [...new Set(fr.map(x => x.dh))], sy = [...new Set(fr.map(x => x.sy))]
    const fadeFrames = fr.filter(x => x.fo !== null && x.fo < 0.999).length, trFrames = fr.filter(x => x.ftr && x.ftr !== 'none').length, tarVacia = fr.filter(x => x.tarOp !== null && x.tarOp < 0.999).length
    informe.push({ tab, fadeFrames, trFrames, tarVacia, ok, cuadros: fr.length, navSaltos, saltosLente, lenteFinal: lenteDestino, firmas: firmas.map(f => `${f.t}ms ×${f.n}${f.esperas ? ' (espera:' + f.esperas + ')' : ''}: ${f.sig.slice(0, 110)}`), fugaces: fugaces.length, esperas: Math.max(...fr.map(x => x.esperas)), alturas: dh.length, scrolls: sy.length, sy, dh, activo: fr[fr.length - 1].act })
    console.log(`\n→ ${tab}: ${fr.length} cuadros · menú: ${navSaltos} saltos · lente: ${saltosLente} saltos bruscos · firmas distintas del contenido: ${firmas.length} (fugaces ≤6 cuadros: ${fugaces.length}) · marcadores de espera visibles (máx): ${Math.max(...fr.map(x => x.esperas))} · alturas de página distintas: ${dh.length} · cuadros con el contenido nuevo a media opacidad: ${fadeFrames} (con desplazamiento: ${trFrames}) · cuadros con la tarjeta del día a media opacidad (vacía): ${tarVacia}`)
    for (const f of firmas) console.log(`     ${String(f.t).padStart(4)} ms ×${String(f.n).padStart(3)}${f.esperas ? ' ⏳' + f.esperas : '   '} [${f.hondo}] ${f.sig.slice(0, 110)}`)
  }
  if (grabador) { await sleep(300); clearInterval(grabador); await send('Page.stopScreencast').catch(() => {}); console.log('cuadros de video guardados: ' + nCuadros) }
  if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(informe, null, 1))
  if (arg('--detalle')) { const t = arg('--detalle'); const p = ev(`__fr(${1400 + 3 * LATENCIA})`); await sleep(120); await clic(t); const fr = await p; fs.writeFileSync(arg('--detalle-salida') || '/tmp/pf-detalle.json', JSON.stringify(fr)); console.log('\ndetalle de «' + t + '»: ' + fr.length + ' cuadros guardados') }
  await c.cerrar()
})().catch(e => { console.error(e); process.exit(1) })
