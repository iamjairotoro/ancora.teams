// Chats en teléfono (estilo de botones) en un navegador de verdad, 390 y 360 px, claro y oscuro: mide la lista (tarjetas separadas 8 px, pesos, ficha «Sin leer», ficha BETA junto al título, botón ancho con «+», títulos de sección)
// y la conversación (burbujas, cabecera y caja de escribir de 38 px con esquinas de 14). Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/chats-estilo.js
const { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const falla = []; const ok = (c, m) => { console.log(c ? '  ok  ' : '  FALLA', m); if (!c) falla.push(m) }
const cerca = (a, b, tol = 0.6) => Math.abs(a - b) <= tol
const IR_A_CHATS = `[...document.querySelectorAll('nav button')].find(b=>b.getBoundingClientRect().width>0&&b.textContent.trim().startsWith('Chats')).click()`
;(async () => {
  const c = await lanzar(9651), { send, ev } = c
  await send('Page.addScriptToEvaluateOnNewDocument', { source: portal.MOCK }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: portal.SESION(), url: B })
  const abrir = async (ancho, tema) => { await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3500)
    await ev(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(tema)}); ${IR_A_CHATS}`); await sleep(2200) }
  for (const [ancho, tema] of [[390, 'light'], [360, 'dark']]) {
    console.log(`\n── ${ancho} px · ${tema} · la lista`); await abrir(ancho, tema)
    const m = JSON.parse(await ev(`(()=>{
      const cs = e => getComputedStyle(e), px = v => parseFloat(v), hoja = e => e.children.length === 0
      const h1 = [...document.querySelectorAll('h1')].find(x => x.textContent.trim() === 'Chats'), enc = h1.parentElement
      const beta = [...document.querySelectorAll('span')].find(s => hoja(s) === false && s.firstChild && s.firstChild.nodeValue === 'BETA')
      const franja = [...document.querySelectorAll('p')].find(p => p.textContent.includes('Los chats están en pruebas'))
      const lis = [...document.querySelectorAll('li')].filter(l => l.querySelector('button[class*="fila"]'))
      const r = lis.map(l => l.getBoundingClientRect()), ul = lis[0].parentElement
      const sec = [...document.querySelectorAll('h2')].filter(h => ['Mensajes', 'Directos'].includes(h.textContent.trim()))
      const nombre = lis[0].querySelector('[class*="nombre"]'), prev = lis[0].querySelector('[class*="preview"]'), hora = lis[0].querySelector('[class*="hora"]')
      const ficha = [...lis[0].querySelectorAll('span')].find(s => hoja(s) && s.textContent === 'Sin leer'), punto = lis[0].querySelector('[class*="punto"]')
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Nuevo mensaje directo'), ico = btn.querySelector('svg'), txt = btn.querySelector('[class*="anc-bt__txt"]')
      const rb = btn.getBoundingClientRect(), cx = rb.left + rb.width / 2, cy = rb.top + rb.height / 2
      const toca = (dy) => { const e = document.elementFromPoint(cx, cy + dy); return !!e && (e === btn || btn.contains(e)) }
      return JSON.stringify({
        encRow: cs(enc).display === 'flex', betaJunto: !!beta && Math.abs(beta.getBoundingClientRect().top + beta.getBoundingClientRect().height / 2 - (h1.getBoundingClientRect().top + h1.getBoundingClientRect().height / 2)) < 12 && beta.getBoundingClientRect().left > h1.getBoundingClientRect().right - 1,
        betaBg: beta && cs(beta).backgroundColor, betaRadio: beta && px(cs(beta).borderTopLeftRadius), betaPeso: beta && cs(beta).fontWeight, betaTam: beta && px(cs(beta).fontSize), sinFranja: !franja,
        n: lis.length, sep: r.slice(1).map((x, i) => lis[i + 1].parentElement === lis[i].parentElement ? Math.round((x.top - r[i].bottom) * 100) / 100 : null).filter(v => v !== null), radio: px(cs(lis[0]).borderTopLeftRadius), sombra: cs(lis[0]).boxShadow !== 'none', ulBg: cs(ul).backgroundColor, ulSombra: cs(ul).boxShadow, ulOverflow: cs(ul).overflow,
        secPeso: sec.map(s => cs(s).fontWeight), secTam: sec.map(s => px(cs(s).fontSize)), nombrePeso: cs(nombre).fontWeight, previewPeso: cs(prev).fontWeight, previewColor: cs(prev).color, horaPeso: cs(hora).fontWeight, horaTam: px(cs(hora).fontSize),
        ficha: !!ficha && { alto: ficha.getBoundingClientRect().height, radio: px(cs(ficha).borderTopLeftRadius), peso: cs(ficha).fontWeight, tam: px(cs(ficha).fontSize) }, punto: !!punto,
        btn: { alto: rb.height, radio: px(cs(btn).borderTopLeftRadius), ancho: rb.width, ulAncho: ul.getBoundingClientRect().width, icoIzq: !!ico && txt && ico.getBoundingClientRect().right <= txt.getBoundingClientRect().left, icoX: ico && Math.round(ico.getBoundingClientRect().left - rb.left), clase: btn.className.includes('anc-bt--s'), toque: [toca(-21), toca(21)], fuera: toca(24) || toca(-24) },
        desborde: document.documentElement.scrollWidth - innerWidth })})()`))
    ok(m.encRow && m.betaJunto && m.sinFranja, 'BETA es una ficha junto al título (misma línea) y ya no existe la franja con el texto largo')
    ok(m.betaBg !== 'rgba(0, 0, 0, 0)' && cerca(m.betaRadio, 999, 600) && m.betaPeso === '400' && m.betaTam > 10 && m.betaTam < 13, `la ficha BETA: fondo ${m.betaBg}, peso ${m.betaPeso}, tamaño ${m.betaTam} px (etiqueta)`)
    ok(m.n >= 4 && m.sep.every(s => cerca(s, 8, 0.2)), `${m.n} conversaciones, cada una en su tarjeta, separadas ${m.sep.join(', ')} px dentro de cada lista`)
    ok(cerca(m.radio, 16, 0.2) && m.sombra && m.ulBg === 'rgba(0, 0, 0, 0)' && m.ulSombra === 'none' && m.ulOverflow === 'visible', `tarjeta de radio ${m.radio} con su sombra; sin caja contenedora (fondo ${m.ulBg}, sombra ${m.ulSombra})`)
    ok(m.secPeso.every(p => p === '400') && m.secTam.every(t => t > 10 && t < 13), `títulos de sección: peso ${m.secPeso.join('/')} y tamaño ${m.secTam.map(t => Math.round(t * 10) / 10).join('/')} px (etiqueta)`)
    ok(m.nombrePeso === '500' && m.previewPeso === '400' && m.horaPeso === '400', `título peso ${m.nombrePeso}; última línea peso ${m.previewPeso}; hora peso ${m.horaPeso}`)
    ok(!!m.ficha && !m.punto && m.ficha.alto >= 16 && m.ficha.alto <= 24 && m.ficha.peso === '400' && m.ficha.tam < 13, `no leídos: ficha pequeña «Sin leer» de ${Math.round(m.ficha.alto * 10) / 10} px de alto, peso ${m.ficha.peso}; ya no el punto`)
    ok(cerca(m.btn.alto, 38, 0.1) && cerca(m.btn.radio, 14, 0.1) && cerca(m.btn.ancho, m.btn.ulAncho, 1) && m.btn.icoIzq && m.btn.clase, `«Nuevo mensaje directo»: botón ancho (${Math.round(m.btn.ancho)} px) de ${m.btn.alto} px con esquinas de ${m.btn.radio} y «+» a la izquierda (a ${m.btn.icoX} px del borde), estilo anc-bt--s`)
    ok(m.btn.toque.every(Boolean) && !m.btn.fuera, `zona táctil de 44 px (toca a ±21 px, no a ±24: ${m.btn.toque.join(',')} / ${m.btn.fuera})`)
    ok(m.desborde <= 0, 'sin desborde horizontal')
  }
  await c.cerrar(); console.log(falla.length ? `\n${falla.length} con problema` : '\nTodo correcto'); process.exit(falla.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
