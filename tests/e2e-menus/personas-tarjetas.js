// Personas y Equipos en teléfono (estilo de botones) en un navegador de verdad, 390 y 360 px, claro y oscuro: mide el selector F (2 columnas iguales, 38 px, esquinas de 14, íconos que se ocultan bajo ~345 px y pieza que se desliza), el buscador (38 px / 14),
// el contador (ícono de trazo, sin emoji, peso 400), las tarjetas (8 px entre ellas, sin caja única), los chips, la zona táctil de 44 px del «⋯», la barra de la fila seleccionada y la vista Equipos. Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/personas-tarjetas.js
const { lanzar, sleep } = require('./cdp.js'), inv5 = require('./inv5-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const cerca = (a, b, tol = 0.6) => Math.abs(a - b) <= tol
;(async () => {
  const c = await lanzar(9641), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: inv5.MOCK }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: inv5.SESION(), url: B })
  const ir = async (ancho, tema) => {
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    await ev(`localStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=personas' }); await sleep(3500)
    await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(tema)})`); await sleep(400) }
  for (const [ancho, tema] of [[390, 'light'], [360, 'dark']]) {
    console.log(`\n── ${ancho} px · ${tema}`); await ir(ancho, tema)
    const m = JSON.parse(await ev(`(()=>{
      const px = v => parseFloat(v), g = document.querySelector('[role=radiogroup]'), ops = [...g.querySelectorAll('[role=radio]')], cs = e => getComputedStyle(e)
      const campo = document.querySelector('input[type=search]').closest('label'), cc = cs(campo)
      const cuenta = [...document.querySelectorAll('p')].find(p => /de \\d+ persona/.test(p.textContent)), cu = cs(cuenta), svgC = cuenta.querySelector('svg')
      const lista = document.querySelector('[role=list]'), filas = [...lista.querySelectorAll('[role=listitem]')], rects = filas.map(f => f.getBoundingClientRect()), cl = cs(lista), f0 = cs(filas[0]), f1 = cs(filas[1])
      const mas = filas[1].querySelector('.anc-rowMore'), rm = mas.getBoundingClientRect(), cx = rm.left + rm.width / 2, cy = rm.top + rm.height / 2
      const toca = (dx, dy) => { const e = document.elementFromPoint(cx + dx, cy + dy); return !!e && (e === mas || mas.contains(e)) }
      const hoja = e => e.children.length === 0, chip = [...document.querySelectorAll('span')].filter(s => hoja(s) && s.textContent.trim() === 'Propietario')[0], sin = [...document.querySelectorAll('span')].filter(s => hoja(s) && s.textContent.trim() === 'Sin equipo')[0]
      const nombre = [...filas[1].querySelectorAll('span')].find(s => hoja(s) && s.textContent.trim() === 'Juan Pérez'), sub = [...filas[1].querySelectorAll('span')].find(s => hoja(s) && /Coros|Voz|Guitarra|Bajo|Sonido/.test(s.textContent)) ? [...filas[1].querySelectorAll('span')].find(s => s.children.length === 0 && /Coros|Voz|Guitarra|Bajo|Sonido/.test(s.textContent)) : null
      return JSON.stringify({ n: ops.length, w: ops.map(o => o.getBoundingClientRect().width), h: ops.map(o => o.getBoundingClientRect().height), r: ops.map(o => px(cs(o).borderTopLeftRadius)), ico: ops.map(o => !!o.querySelector('svg') && cs(o.querySelector('svg')).display !== 'none'), gtc: cs(g).gridTemplateColumns, bgSeg: cs(g).backgroundColor, boxSeg: cs(g).boxShadow,
        campoH: campo.getBoundingClientRect().height, campoR: px(cc.borderTopLeftRadius), campoBg: cc.backgroundColor, campoBorde: cc.borderTopWidth,
        cuentaTxt: cuenta.textContent, cuentaPeso: cu.fontWeight, cuentaColor: cu.color, svgC: !!svgC, svgW: svgC && svgC.getBoundingClientRect().width, svgFill: svgC && getComputedStyle(svgC).fill,
        filas: filas.length, sep: rects.slice(1).map((r, i) => Math.round((r.top - rects[i].bottom) * 100) / 100), radio: px(f0.borderTopLeftRadius), listaBg: cl.backgroundColor, listaSombra: cl.boxShadow, listaOverflow: cl.overflow, filaSombra: f1.boxShadow !== 'none', f0Sombra: f0.boxShadow, f0Bg: f0.backgroundColor, f1Bg: f1.backgroundColor, panelBg: cs(document.body).backgroundColor,
        masW: rm.width, toque: [toca(0, 0), toca(21, 0), toca(-21, 0), toca(0, 21), toca(0, -21)], toqueFuera: toca(24, 0) || toca(-24, 0) || toca(0, 24) || toca(0, -24),
        chipPeso: chip && cs(chip).fontWeight, chipBg: chip && cs(chip).backgroundColor, sinPeso: sin && cs(sin).fontWeight, sinBg: sin && cs(sin).backgroundColor, sinColor: sin && cs(sin).color,
        nomPeso: nombre && cs(nombre).fontWeight, subPeso: sub && cs(sub).fontWeight, subColor: sub && cs(sub).color, subTxt: sub && sub.textContent, desborde: document.documentElement.scrollWidth - innerWidth })})()`))
    ok(m.n === 2 && cerca(m.w[0], m.w[1], 0.2), `selector: 2 columnas iguales (${m.w.map(x => Math.round(x * 10) / 10)} px)`)
    ok(m.h.every(h => cerca(h, 38, 0.1)) && m.r.every(r => cerca(r, 14, 0.1)), `opciones de 38 px con esquinas de 14 (${m.h}, radios ${m.r})`)
    ok(m.bgSeg === 'rgba(0, 0, 0, 0)' && m.boxSeg === 'none', 'sin caja contenedora')
    ok(ancho === 390 ? m.ico.every(Boolean) : m.ico.every(x => !x), ancho === 390 ? 'íconos visibles a 390 px' : 'íconos ocultos a 360 px (bajo ~345 de ancho del selector)')
    ok(cerca(m.campoH, 38, 0.1) && cerca(m.campoR, 14, 0.1) && m.campoBorde === '0px', `buscador de 38 px con esquinas de 14 (${m.campoH} px, radio ${m.campoR}, borde ${m.campoBorde})`)
    ok(!m.cuentaTxt.includes('📲') && m.svgC && m.svgW > 10 && m.svgW < 18 && m.svgFill === 'none' && m.cuentaPeso === '400', `contador sin emoji, con ícono de trazo de ${Math.round(m.svgW * 10) / 10} px (fill ${m.svgFill}) y peso ${m.cuentaPeso}: «${m.cuentaTxt}»`)
    ok(m.filas >= 6 && m.sep.every(s => cerca(s, 8, 0.2)), `tarjetas separadas 8 px (${m.sep.join(', ')})`)
    ok(cerca(m.radio, 16, 0.2) && m.listaBg === 'rgba(0, 0, 0, 0)' && m.listaSombra === 'none' && m.listaOverflow === 'visible' && m.filaSombra, `sin caja contenedora (fondo ${m.listaBg}, sombra ${m.listaSombra}) y cada persona con radio ${m.radio} y sombra propia`)
    ok(!m.f0Sombra.includes('inset') && m.f0Bg === m.f1Bg, `sin barra negra: la primera tarjeta es igual a las demás (fondo ${m.f0Bg}, sombra ${m.f0Sombra.slice(0, 40)}…)`)
    ok(m.toque.every(Boolean) && !m.toqueFuera && cerca(m.masW, 24, 0.5), `«⋯» de ${Math.round(m.masW)} px con zona táctil de 44 (toca dentro de ±21 px y no fuera de ±24: ${m.toque.join(',')} / ${m.toqueFuera})`)
    ok(m.chipPeso === '400' && m.sinPeso === '400' && m.sinBg !== 'rgba(0, 0, 0, 0)', `chips en peso ${m.chipPeso}/${m.sinPeso}; «Sin equipo» con relleno de aviso (${m.sinBg})`)
    ok(m.subPeso === '400' && m.nomPeso === '500', `nombre ${m.nomPeso} (título) y posiciones ${m.subPeso}: «${m.subTxt}»`)
    ok(m.desborde <= 0, 'sin desborde horizontal')
    // la pieza se desliza al cambiar a Equipos
    const antes = JSON.parse(await ev(`(()=>{const p=document.querySelector('[role=radiogroup] > span'),r=document.querySelector('[role=radiogroup]');return JSON.stringify({x:p.getBoundingClientRect().left-r.getBoundingClientRect().left})})()`))
    await ev(`[...document.querySelectorAll('[role=radio]')][1].click()`); await sleep(60)
    const mid = JSON.parse(await ev(`(()=>{const p=document.querySelector('[role=radiogroup] > span'),r=document.querySelector('[role=radiogroup]');return JSON.stringify({x:p.getBoundingClientRect().left-r.getBoundingClientRect().left})})()`)); await sleep(500)
    const fin = JSON.parse(await ev(`(()=>{const p=document.querySelector('[role=radiogroup] > span'),r=document.querySelector('[role=radiogroup]');return JSON.stringify({x:p.getBoundingClientRect().left-r.getBoundingClientRect().left})})()`))
    ok(mid.x > antes.x + 1 && mid.x < fin.x - 1 && fin.x > antes.x + 100, `la pieza se desliza (${Math.round(antes.x)} → ${Math.round(mid.x)} → ${Math.round(fin.x)} px)`)
    // vista Equipos
    const e = JSON.parse(await ev(`(()=>{
      const cs = e => getComputedStyle(e), bl = [...document.querySelectorAll('section')].filter(s => s.querySelector('[aria-expanded]')), r = bl.map(b => b.getBoundingClientRect())
      const campo = document.querySelector('input[type=search]').closest('label'), cuenta = bl[0].querySelector('button span span:last-child')
      return JSON.stringify({ n: bl.length, sep: r.slice(1).map((x, i) => Math.round((x.top - r[i].bottom) * 100) / 100), radio: parseFloat(cs(bl[0]).borderTopLeftRadius), sombra: cs(bl[0]).boxShadow !== 'none', campoH: campo.getBoundingClientRect().height, campoR: parseFloat(cs(campo).borderTopLeftRadius), cuentaPeso: cuenta && cs(cuenta).fontWeight, cuentaTxt: cuenta && cuenta.textContent, gest: [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Gestionar equipos'), desborde: document.documentElement.scrollWidth - innerWidth })})()`))
    ok(e.n >= 2 && e.sep.every(s => cerca(s, 8, 0.2)) && cerca(e.radio, 16, 0.2) && e.sombra, `Equipos: ${e.n} tarjetas separadas ${e.sep.join(', ')} px, radio ${e.radio}, con sombra propia`)
    ok(cerca(e.campoH, 38, 0.1) && cerca(e.campoR, 14, 0.1) && e.cuentaPeso === '400' && e.gest && e.desborde <= 0, `Equipos: buscador ${e.campoH}/${e.campoR}, contador «${e.cuentaTxt}» en peso ${e.cuentaPeso}, «Gestionar equipos» presente, sin desborde`)
  }
  await c.cerrar()
  // El buscador de Canciones (portal) es el mismo compacto: 38 px y esquinas de 14, a 390 y 360, claro y oscuro
  const portal = require('./portal-mock.js'), c2 = await lanzar(9642)
  await c2.send('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await c2.send('Network.enable'); await c2.send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B })
  for (const [ancho, tema] of [[390, 'light'], [360, 'dark']]) {
    await c2.send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await c2.send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
    await c2.ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(tema)}); [...document.querySelectorAll('nav button')].find(x=>x.textContent.includes('Canciones')).click()`); await sleep(1500)
    const k = JSON.parse(await c2.ev(`(()=>{const l=document.querySelector('input[type=search]').closest('label'),cs=getComputedStyle(l);return JSON.stringify({h:l.getBoundingClientRect().height,r:parseFloat(cs.borderTopLeftRadius),b:cs.borderTopWidth,bg:cs.backgroundColor})})()`))
    console.log(`\n── Canciones · ${ancho} px · ${tema}`); ok(cerca(k.h, 38, 0.1) && cerca(k.r, 14, 0.1) && k.b === '0px', `buscador de Canciones de 38 px con esquinas de 14 (${k.h} px, radio ${k.r}, borde ${k.b}, fondo ${k.bg})`)
  }
  await c2.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
