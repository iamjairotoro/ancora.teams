// DETECCIÓN de menús recortados (teléfono, 390 y 360 px, claro y oscuro). Abre cada menú/popover/hoja en un contenedor bajo (estado vacío) y comprueba que su caja queda dentro del viewport y que ningún ancestro con
// overflow la recorta ni algo la cubre (elementFromPoint en las esquinas y el borde inferior). Uso (con la app corriendo, `npm run build && npm start`): BASE=http://127.0.0.1:3000 node tests/e2e-menus/menus-recorte.js [carpeta de capturas] [filtro]   → imprime un JSON con el resultado por menú y sale con 1 si alguno falla.
const path = require('path'), fs = require('fs'), os = require('os'), { lanzar, sleep } = require('./cdp.js')
const MOCKS = { inv5: require('./inv5-mock.js'), home: require('./home-mock.js'), portal: require('./portal-mock.js'), homeadmin: require('./homeadmin-mock.js'), tira: { ...require('./tira-mock.js'), MOCK: require('./tira-mock.js').PORTAL }, tiraadmin: { ...require('./tira-mock.js'), SESION: require('./homeadmin-mock.js').SESION, MOCK: require('./tira-mock.js').ADMIN } }
const B = process.env.BASE || 'http://127.0.0.1:3168', SHOTS = process.argv[2] ? path.resolve(process.argv[2]) : path.join(os.tmpdir(), 'menus-recorte'), FILTRO = process.argv[3] || ''; fs.mkdirSync(SHOTS, { recursive: true })
const RESUMEN = `;(()=>{const f=window.fetch.bind(window);window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));if(u.startsWith('/api/admin/servicios-resumen'))return new Response(JSON.stringify({generado:'x',servicios:[]}),{status:200,headers:{'Content-Type':'application/json'}});return f(i,o)}})();`

// Cada pasos: 'c:<selector css>' clic · 't:<texto>' clic en el botón (o fila) con ese texto · 'e:<ms>' espera · 'f:<selector>' enfoca. `menu` = el selector de la caja que se comprueba (la primera visible).
const COMPROBAR = sel => `(()=>{
  const cand=[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'})
  const m=cand[cand.length-1]; if(!m) return JSON.stringify({encontrado:false})
  m.scrollIntoView({block:'nearest',inline:'nearest'})
  const r=m.getBoundingClientRect(), W=innerWidth, H=innerHeight, f=[]
  const desc=e=>!e?'(nada)':(e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\\s+/).slice(0,2).join('.'):'')+(e.getAttribute&&e.getAttribute('aria-label')?'['+e.getAttribute('aria-label').slice(0,24)+']':''))
  if(r.left<-.5||r.right>W+.5||r.top<-.5||r.bottom>H+.5) f.push('fuera del viewport: ['+[r.left,r.top,r.right,r.bottom].map(Math.round)+'] en '+W+'×'+H)
  const recortes=[]
  for(let a=m.parentElement;a&&a!==document.documentElement;a=a.parentElement){const cs=getComputedStyle(a),ov=cs.overflowX+' '+cs.overflowY; if(!/(hidden|clip|auto|scroll)/.test(ov)) continue
    const ar=a.getBoundingClientRect(); if(r.left<ar.left-.5||r.right>ar.right+.5||r.top<ar.top-.5||r.bottom>ar.bottom+.5) recortes.push(desc(a)+' (overflow '+ov+') caja ['+[ar.left,ar.top,ar.right,ar.bottom].map(Math.round)+']')}
  const cs0=getComputedStyle(m), R=Math.max(parseFloat(cs0.borderTopLeftRadius)||0,parseFloat(cs0.borderTopRightRadius)||0,parseFloat(cs0.borderBottomLeftRadius)||0,parseFloat(cs0.borderBottomRightRadius)||0), k=Math.max(4,R*0.5+2)
  const pts=[[r.left+k,r.top+k],[r.right-k,r.top+k],[r.left+k,r.bottom-k],[r.right-k,r.bottom-k],[r.left+r.width/2,r.bottom-3],[r.left+r.width/2,r.top+3]]
  const cubiertos=[]; for(const [x,y] of pts){ if(x<0||y<0||x>W||y>H) continue; const e=document.elementFromPoint(x,y); if(!e||!(m===e||m.contains(e)||e.contains(m)&&e.getAttribute&&e.getAttribute('aria-hidden')==='true')) cubiertos.push('('+Math.round(x)+','+Math.round(y)+') lo tapa '+desc(e)) }
  if(cubiertos.length) f.push('cubierto/recortado en '+cubiertos.length+' punto(s): '+cubiertos.slice(0,2).join(' · '))
  if(recortes.length && cubiertos.length) f.push('ancestros que lo recortan: '+recortes.slice(0,2).join(' · '))
  return JSON.stringify({encontrado:true, ok:f.length===0, fallos:f, caja:[r.left,r.top,r.right,r.bottom].map(Math.round), alto:Math.round(r.height), viewport:[W,H], ancestrosConOverflow: recortes.length})
})()`


// DESBORDE=1: antes de cada captura busca texto cortado o fuera de la pantalla (se compara el antes con el después: lo que aparece solo en el después es un problema nuevo).
// TEXTO=1: junto a cada captura guarda el texto visible de la página (<id>__<ancho>__<tema>.txt), para buscar pantallas vacías o con error («No encontramos…», «No se pudo…») con revisar-estados.js.
// ANIM_HOJA=1: anota, de cada hoja (clase hoja_hoja / hoja_velo de hoja.module.css) que aparece, sus animaciones activas un cuadro después de montarse (nombre, duración, curva: la de los fotogramas, que es donde una animación CSS guarda su animation-timing-function) y si usa la presencia (data-hoja). Se lee en `anim` de resultados.json.
const OBS_HOJA = `window.__an = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue
  for (const e of [n, ...n.querySelectorAll('*')]) { if (typeof e.className !== 'string' || !/hoja_(hoja|velo)__/.test(e.className)) continue
    requestAnimationFrame(() => window.__an.push({ titulo: e.getAttribute('aria-label') || (document.getElementById(e.getAttribute('aria-labelledby') || '-') || {}).textContent || '', clase: e.className.match(/hoja_(hoja|velo)/)[1], presencia: e.hasAttribute('data-hoja') || e.hasAttribute('data-hoja-velo'), anims: e.getAnimations().map(a => ({ n: a.animationName || 'transition:' + a.transitionProperty, d: a.effect.getComputedTiming().duration, e: ((a.effect.getKeyframes()[0] || {}).easing) || a.effect.getTiming().easing })) })) } } }).observe(document, { childList: true, subtree: true })`
const DESBORDE = `(()=>{const W=innerWidth,out=[];const d=e=>(e.tagName.toLowerCase()+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\\s+/)[0].replace(/_[\\w-]{5,}$/,''):''))+' «'+(e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,24)+'»'
 if(document.scrollingElement.scrollWidth>W+1)out.push('PÁGINA con scroll lateral: '+document.scrollingElement.scrollWidth+' > '+W)
 for(const e of document.querySelectorAll('body *')){const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||!(e.childNodes&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())))continue;const r=e.getBoundingClientRect();if(!r.width||!r.height)continue
  if(r.right>W+1&&cs.position!=='fixed'&&!e.closest('[style*="translate"],[aria-hidden=true]')){let a=e.parentElement,oculto=false;for(;a&&a!==document.body;a=a.parentElement){const o=getComputedStyle(a).overflowX;if(/(hidden|auto|scroll|clip)/.test(o)){oculto=true;break}}if(!oculto)out.push('FUERA ('+Math.round(r.right)+'>'+W+'): '+d(e))}
  if(/(hidden|clip)/.test(cs.overflowX)&&cs.textOverflow!=='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.push('CORTADO ancho '+e.scrollWidth+'>'+e.clientWidth+': '+d(e))
  if(/(hidden|clip)/.test(cs.overflowY)&&e.scrollHeight>e.clientHeight+1&&cs.webkitLineClamp==='none'&&cs.display!=='-webkit-box')out.push('CORTADO alto '+e.scrollHeight+'>'+e.clientHeight+': '+d(e))}
 return JSON.stringify([...new Set(out)].slice(0,40))})()`

const ESC = JSON.parse(fs.readFileSync(process.env.ESC_JSON, 'utf8')).map(e => ({ mock: 'inv5', menu: '', ...e }))

;(async () => {
  const resultados = []
  for (const grupo of ['inv5', 'home', 'portal', 'homeadmin', 'tira', 'tiraadmin']) {
    const escenas = ESC.filter(e => e.mock === grupo && (!FILTRO || e.id.includes(FILTRO))); if (!escenas.length) continue
    const c = await lanzar(grupo === 'inv5' ? 9521 : 9522); const { send, ev } = c
    const M = MOCKS[grupo]; let mockSrc = M.MOCK
    if (process.env.ANIM_HOJA) await send('Page.addScriptToEvaluateOnNewDocument', { source: OBS_HOJA })
    await send('Page.addScriptToEvaluateOnNewDocument', { source: mockSrc + (/^(homeadmin|tiraadmin|inv5)$/.test(grupo) ? '' : RESUMEN) }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    for (const W of (process.env.ANCHOS || '390,360').split(',').map(Number)) for (const tema of (process.env.TEMAS || 'dark,light').split(',')) for (const e of escenas) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, ...(process.env.REDUCIR ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [])] }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(/^(portal|tira)$/.test(grupo) ? 900 : 350)
      await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Emulation.setDeviceMetricsOverride', { width: W, height: process.env.ESCRITORIO ? 900 : 844, deviceScaleFactor: process.env.ESCRITORIO ? 1 : 2, mobile: !process.env.ESCRITORIO }); await send('Page.navigate', { url: B + e.ruta }); await sleep(2800)
      let paso = 'ok'
      for (const p of e.pasos) { const [k, ...r] = p.split(':'), v = r.join(':')
        if (k === 'e') { await sleep(+v); continue }
        if (k === 'j') { await ev(v).catch(() => {}); await sleep(500); continue }
        if (k === 'l') { const [kk, vv] = v.split('='); await ev(`localStorage.setItem(${JSON.stringify(kk)}, ${JSON.stringify(vv)}); location.reload()`).catch(() => {}); await sleep(2500); continue }
        const js = k === 'c' ? `(()=>{ const b=[...document.querySelectorAll(${JSON.stringify(v)})].find(x=>x.getBoundingClientRect().width>0); if(!b) return false; b.click(); return true })()`
          : `(()=>{ const b=[...document.querySelectorAll('button, [role=button]')].find(x=>x.getBoundingClientRect().width>0 && (x.textContent.trim()===${JSON.stringify(v)} || x.textContent.trim().startsWith(${JSON.stringify(v)}) || (x.getAttribute('aria-label')||'').startsWith(${JSON.stringify(v)}))); if(!b) return false; b.click(); return true })()`
        if (!(await ev(js))) { paso = 'no se encontró el paso «' + p + '»; hay: ' + (await ev(`JSON.stringify([...document.querySelectorAll('main button, [role=dialog] button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>(x.getAttribute('aria-label')||x.textContent.trim()).slice(0,28)).slice(0,14))`)); break }; await sleep(350) }
      await sleep(500); if (paso !== 'ok') console.log(`  (aviso: paso fallido en ${e.id} ${W} ${tema}: ${paso.slice(0, 220)})`)
      const res = !e.menu ? { encontrado: true, ok: true, caja: [], alto: 0 } : paso === 'ok' ? JSON.parse(await ev(COMPROBAR(e.menu))) : { encontrado: false, motivo: paso }
      // Espera a que terminen las animaciones y transiciones FINITAS (las hojas inferiores suben y bajan): se fotografía siempre el estado de reposo. Las infinitas (giros de carga) no se esperan; tope de 3 s.
      await ev(`Promise.race([Promise.all(document.getAnimations().filter(a => { try { return a.effect.getComputedTiming().iterations !== Infinity } catch { return false } }).map(a => a.finished.catch(() => 0))), new Promise(r => setTimeout(r, 3000))]).then(() => 0)`).catch(() => {})
      await sleep(250)      // un respiro tras la última animación: el navegador deja de componer la capa y vuelve a pintar a la rejilla de píxeles
      { const sy = await ev('Math.round(scrollY)').catch(() => 0); if (sy) console.log(`  (aviso: la página está desplazada ${sy} px al fotografiar ${e.id} ${W} ${tema})`) }
      const foto = async () => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SHOTS, `${e.id}__${W}__${tema}.png`), Buffer.from(r.data, 'base64')) }
      if (process.env.ANIM_HOJA) res.anim = JSON.parse(await ev('JSON.stringify(window.__an || [])').catch(() => '[]'))
      const desborde = process.env.DESBORDE ? JSON.parse(await ev(DESBORDE).catch(() => '[]')) : undefined
      if (process.env.TEXTO) fs.writeFileSync(path.join(SHOTS, `${e.id}__${W}__${tema}.txt`), String(await ev('document.body.innerText').catch(() => '')))
      await foto(); resultados.push({ id: e.id, W, tema, ...res, ...(desborde ? { desborde } : {}) })
      console.log(`${res.encontrado ? (res.ok ? 'OK    ' : 'FALLA ') : 'NO-HAY'} ${e.id.padEnd(28)} ${W} ${tema.padEnd(5)}`, res.encontrado ? (res.ok ? `caja ${res.caja} alto ${res.alto}` : res.fallos.join(' | ')) : res.motivo || 'el menú no se abrió')
    }
    await c.cerrar()
  }
  fs.writeFileSync(path.join(SHOTS, 'resultados.json'), JSON.stringify(resultados, null, 1))
  const malos = resultados.filter(r => !r.encontrado || !r.ok); console.log(`\n${resultados.length - malos.length} de ${resultados.length} correctos; ${malos.length} con problema`)
  process.exit(malos.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
