// «Acordes sobre la letra» en un navegador REAL (Chrome por CDP): el editor móvil (modo Acordes) y la lectura (HojaAcordes) a 390 y 360 px, claro y oscuro. Mide posiciones de verdad (getBoundingClientRect) y guarda las capturas.
// Qué comprueba: un acorde al final de la línea queda SOBRE la fila de la letra; ninguna palabra se parte entre filas; «siempre amén» va en la misma fila; la altura y la posición vertical de una línea son iguales con y sin acordes;
// un acorde largo (Cm7, F#m7) sobre una sílaba de una o dos letras no abre un hueco mayor que el acorde; dos acordes cercanos no se pisan; no hay scroll horizontal.
// Uso: construir.sh 3168 (el árbol de trabajo)  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/acordes-sobre-letra.js <carpeta-de-capturas>
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/acordes-sobre-letra'
fs.mkdirSync(OUT, { recursive: true })
const T2 = 'Señor de toda la tierra y de todo el cielo, rey de reyes y Señor de señores para siempre '
const LINEAS = ['El esplendor de un rey', 'Cuán grande es nuestro Dios, ' + T2 + 'amén', 'vestido en majestad', 'vestido en majestad', 'cantará mi corazón', 'cantará mi corazón']
// Los mismos datos en las dos pantallas. Grados: 1 = G, 4 = C, 5 = D, 7 = F#; «m7» = acorde largo.
const SEGS = [
  [['El esplendor de un rey']],
  [['Cuán grande es nuestro Dios, ', 1], [T2, 5], ['amén', 1]],
  [['vest', 1], ['i', 4, 'm7'], ['do', 7, 'm7'], [' en majestad']],
  [['vestido en majestad']],
  [['cantará mi corazón', 1]],
  [['cantará mi corazón']],
]
const seg = ([text, g, cal]) => ({ text, ...(g ? { acorde: { g, cal: cal || '' } } : {}) })
const PARCHE_EDITOR = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/admin/canciones/acordes')&&((o&&o.method)||'GET').toUpperCase()==='GET'){const d=await r.clone().json();d.cancion.letra=${JSON.stringify('VERSO 1:\n' + LINEAS.join('\n') + '\n\nCORO:\nCuán grande es Él')};d.cancion.secciones=[${JSON.stringify(SEGS.map(s => ({ kind: 'lyric', segments: s.map(seg) })))},[{kind:'lyric',segments:[{text:'Cuán grande es Él'}]}]];return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
const SEGS_LECTURA = SEGS.map((s, i) => i === 0 ? [seg(s[0]), { text: '', acorde: { g: 5, cal: '' } }] : s.map(seg))      // la primera línea lleva un acorde al FINAL (trozo sin texto)
const PARCHE_LECTURA = `(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const r=await f(i,o);if(u.startsWith('/api/portal/cancion?')){const d=await r.clone().json();d.acordes={tono:'G',secciones:[{code:'V1',name:'Verso 1',repeat:1,lineas:${JSON.stringify(SEGS_LECTURA.map(s => ({ kind: 'lyric', segments: s })))}}]};return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`

// Medidas de cada línea: filas de texto, palabras (grupos .pal), piezas y su acorde. Se evalúa dentro de la página.
const MEDIR = modo => `(()=>{const lineas=[...document.querySelectorAll('${modo === 'editor' ? '[data-fin]' : 'p[class*=linea]'}')];const R=e=>{const r=e.getBoundingClientRect();return{t:r.top,b:r.bottom,l:r.left,r:r.right,w:r.width,h:r.height}};
return JSON.stringify({scrollW:document.documentElement.scrollWidth,innerW:innerWidth,lineas:lineas.map(l=>{const lr=R(l);return{lineR:lr.r,txt:l.textContent.replace(/\\u200b/g,''),h:lr.h,top:lr.t,
lineR:lr.r,palabras:[...l.querySelectorAll('[class*=pal]')].map(p=>({piezas:[...p.querySelectorAll('[class*=pieza]')].map(z=>{const tx=z.querySelector('[data-t]'),ac=z.querySelector('[data-a]');const zr=R(z),tr=R(tx),ar=R(ac);let tw=0;if(tx.firstChild){const g=document.createRange();g.selectNodeContents(tx);tw=g.getBoundingClientRect().width}const chordEl=ac.querySelector('button')||ac;const cr=R(chordEl);return{texto:tx.textContent.replace(/\\u200b/g,''),acorde:ac.textContent,tTop:tr.t-lr.t,tL:tr.l,tR:tr.r,tW:tw,zW:zr.w,aTop:cr.t-lr.t,aB:cr.b-lr.t,aL:cr.l,aR:cr.r,aW:cr.w,fuente:parseFloat(getComputedStyle(tx).fontSize)}})}))}})})})()`

const out = []; let fallas = 0
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }
const dentro = (m, nombre) => m.lineas.filter(l => l.palabras.length)
function revisar(m, etiqueta) {
  const ls = m.lineas, L = n => ls.find(l => l.txt.includes(n))
  ok(m.scrollW <= m.innerW, `${etiqueta}: sin scroll horizontal (${m.scrollW} ≤ ${m.innerW})`)
  // 1. acorde al final de la línea: sobre la fila de la letra, no en línea
  const l1 = ls[0], fin = l1.palabras[l1.palabras.length - 1].piezas.find(z => z.texto === '' && z.acorde)
  ok(!!fin, `${etiqueta}: el acorde final «${fin && fin.acorde}» está DENTRO de la última palabra`)
  if (fin) ok(fin.aB <= fin.tTop + 1, `${etiqueta}: el acorde final queda SOBRE la fila de la letra (su borde de abajo ${Math.round(fin.aB)} ≤ la letra ${Math.round(fin.tTop)})`)
  // 2. ninguna palabra partida entre filas: todas las piezas de una palabra comparten la fila de su texto
  const partidas = []; for (const l of ls) for (const p of l.palabras) { const t = p.piezas.filter(z => z.texto !== '').map(z => Math.round(z.tTop)); if (t.length && Math.max(...t) - Math.min(...t) > 2) partidas.push(p.piezas.map(z => z.texto).join('·')) }
  ok(partidas.length === 0, `${etiqueta}: ninguna palabra se parte entre filas${partidas.length ? ' · ' + partidas.join(' | ') : ''}`)
  // 3. «siempre amén» en la misma fila
  const l2 = L('Cuán grande es nuestro'), pal = l2.palabras.map(p => p.piezas[0]), sie = pal.find(z => z.texto.startsWith('siempre')), ame = pal.find(z => z.texto === 'amén')
  const cabe = sie && ame && sie.tR + ame.zW <= l2.lineR + 0.5, mismaFila = sie && ame && Math.abs(sie.tTop - ame.tTop) <= 2
  ok(sie && ame && (cabe ? mismaFila : !mismaFila), `${etiqueta}: «siempre» y «amén» van en la misma fila si caben, y solo saltan si no caben (${cabe ? 'caben' : 'no caben'}; filas ${sie && Math.round(sie.tTop)} y ${ame && Math.round(ame.tTop)})`)
  ok(l2.h > l1.h * 1.8, `${etiqueta}: la frase larga se parte en varias filas (alto ${Math.round(l2.h)} vs ${Math.round(l1.h)})`)
  // 4. altura y posición vertical iguales con y sin acordes
  for (const [a, b, n] of [[ls[2], ls[3], 'vestido en majestad'], [ls[4], ls[5], 'cantará mi corazón']]) {
    ok(Math.abs(a.h - b.h) <= 0.5, `${etiqueta}: «${n}» mide lo mismo con y sin acordes (${a.h.toFixed(1)} y ${b.h.toFixed(1)})`)
    const ta = a.palabras.flatMap(p => p.piezas).filter(z => z.texto).map(z => Math.round(z.tTop)), tb = b.palabras.flatMap(p => p.piezas).filter(z => z.texto).map(z => Math.round(z.tTop))
    ok(Math.max(...ta) === Math.max(...tb) && Math.min(...ta) === Math.min(...tb), `${etiqueta}: la letra de «${n}» queda a la misma altura con y sin acordes`)
  }
  // 5. acordes largos sobre sílabas cortas: el hueco no pasa de lo que ocupa el acorde
  const vest = ls[2].palabras[0].piezas, sin = ls[3].palabras[0].piezas[0], con = vest.map(z => z.texto).join('')
  const extra = (ls[2].palabras.flatMap(p => p.piezas).reduce((s, z) => s + z.zW, 0)) - (ls[3].palabras.flatMap(p => p.piezas).reduce((s, z) => s + z.zW, 0))
  const piezaI = vest.find(z => z.texto === 'i'), piezaDo = vest.find(z => z.texto.trim() === 'do')
  ok(!!piezaI && !!piezaDo && piezaI.acorde === 'Cm7' && piezaDo.acorde.replace('♯', '#') === 'F#m7', `${etiqueta}: «vest|i|do» lleva G, Cm7 sobre «i» y F#m7 sobre «do» (${vest.map(z => z.texto + '/' + z.acorde).join(' · ')})`)
  if (piezaI && piezaDo) {
    const hueco = z => z.zW - z.tW, tope = z => z.aW + 1
    ok(hueco(piezaI) <= tope(piezaI) && hueco(piezaDo) <= tope(piezaDo), `${etiqueta}: el hueco bajo cada acorde largo no pasa del ancho del acorde (Cm7 sobre «i»: ${hueco(piezaI).toFixed(1)} px, acorde ${piezaI.aW.toFixed(1)}; F#m7 sobre «do»: ${hueco(piezaDo).toFixed(1)} px, acorde ${piezaDo.aW.toFixed(1)})`)
    ok(extra <= piezaI.aW + piezaDo.aW + 2, `${etiqueta}: «vestido en majestad» se ensancha ${extra.toFixed(1)} px con esos dos acordes largos (acordes ${(piezaI.aW + piezaDo.aW).toFixed(1)} px)`)
    // 6. dos acordes cercanos no se pisan
    ok(piezaI.aR <= piezaDo.aL + 0.5, `${etiqueta}: Cm7 y F#m7, a una sílaba de distancia, no se pisan (${piezaI.aR.toFixed(1)} ≤ ${piezaDo.aL.toFixed(1)})`)
    out.push(`INFO  ${etiqueta}: separación bajo Cm7 ${(piezaI.zW - piezaI.tW).toFixed(1)} px, bajo F#m7 ${(piezaDo.zW - piezaDo.tW).toFixed(1)} px; ensanche de la línea ${extra.toFixed(1)} px`)
  }
  // acordes de TODA la hoja: ninguno pisa al siguiente de su fila
  const todos = ls.flatMap(l => l.palabras.flatMap(p => p.piezas).filter(z => z.acorde).map(z => ({ ...z, fila: Math.round(z.aTop) + '|' + Math.round(l.top) }))); let pisan = 0
  for (let i = 0; i < todos.length - 1; i++) if (todos[i].fila === todos[i + 1].fila && todos[i].aR > todos[i + 1].aL + 0.5) pisan++
  ok(pisan === 0, `${etiqueta}: ningún acorde pisa al de al lado`)
}

;(async () => {
  for (const modo of ['editor', 'lectura']) for (const ancho of [390, 360]) for (const tema of ['light', 'dark']) {
    const M = require(R + (modo === 'editor' ? 'inv5-mock.js' : 'portal-mock.js')), c = await lanzar(9540 + (modo === 'editor' ? 0 : 1)), { send, ev } = c, et = `${modo} ${ancho} ${tema}`
    try {
      await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: modo === 'editor' ? PARCHE_EDITOR : PARCHE_LECTURA }); await send('Network.enable')
      if (modo === 'editor') await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
      await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
      await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
      const foto = async nombre => { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
      if (modo === 'editor') {
        await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' }); await sleep(3000)
        await ev(`[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él').click()`); await sleep(800)
        await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Editar con acordes').click()`); await sleep(1500)
        await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Acordes').click()`); await sleep(600)
        // tocar al FINAL de la 1.ª línea (a la derecha del texto) y poner Em: el acorde final
        await ev(`(()=>{const t=[...document.querySelectorAll('[data-fin]')].find(l=>l.textContent.includes('esplendor'));const r=t.getBoundingClientRect();t.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.right-2,clientY:r.top+r.height-4}))})()`); await sleep(400)
        await ev(`[...document.querySelectorAll('[aria-label="Acordes en G"] button')].find(b=>b.textContent.startsWith('Em')).click()`); await sleep(400)
        await ev(`document.querySelector('[data-sel="1"]')?.scrollIntoView({block:'start'})`); await sleep(200); await foto('editor-ancla-al-final')
        await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='OK')?.click()`); await sleep(400)
        // con el cursor puesto entre dos letras de «majestad» (para ver el ancla: línea fina con punto)
        await ev(`(()=>{const t=[...document.querySelectorAll('[data-t]')].find(e=>e.textContent==='majestad');const r=t.getBoundingClientRect();t.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+r.width*0.5,clientY:r.top+r.height/2}))})()`); await sleep(400)
        await ev(`document.querySelector('[data-sel="1"]')?.scrollIntoView({block:'start'})`); await sleep(300); await foto('editor-ancla-entre-letras')
        await ev(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='OK')?.click()`); await sleep(400)
      } else {
        await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__acordes','1')`); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(3000)
        await ev(`document.querySelector('ul li button[aria-label^="Cuán"]').click()`); await sleep(1800)
      }
      const m = JSON.parse(await ev(MEDIR(modo)))
      await ev(`(()=>{const l=[...document.querySelectorAll('${modo === 'editor' ? '[data-fin]' : 'p[class*=linea]'}')][0];l&&l.scrollIntoView({block:'start'});window.scrollBy(0,-70)})()`); await sleep(300)
      await foto(modo === 'editor' ? 'editor-hoja' : 'lectura-hoja')
      revisar(m, et)
    } catch (e) { ok(false, `${et}: la prueba se cortó — ${e.message}`) } finally { await c.cerrar() }
  }
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
