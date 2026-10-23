// DETECCIÓN de menús recortados (teléfono, 390 y 360 px, claro y oscuro). Abre cada menú/popover/hoja en un contenedor bajo (estado vacío) y comprueba que su caja queda dentro del viewport y que ningún ancestro con
// overflow la recorta ni algo la cubre (elementFromPoint en las esquinas y el borde inferior). Uso (con la app corriendo, `npm run build && npm start`): BASE=http://127.0.0.1:3000 node tests/e2e-menus/menus-recorte.js [carpeta de capturas] [filtro]   → imprime un JSON con el resultado por menú y sale con 1 si alguno falla.
const path = require('path'), fs = require('fs'), os = require('os'), { lanzar, sleep } = require('./cdp.js')
const MOCKS = { inv5: require('./inv5-mock.js'), home: require('./home-mock.js'), portal: require('./portal-mock.js'), homeadmin: require('./homeadmin-mock.js') }
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

const ESC = JSON.parse(fs.readFileSync(process.env.ESC_JSON, 'utf8')).map(e => ({ mock: 'inv5', menu: '', ...e }))

;(async () => {
  const resultados = []
  for (const grupo of ['inv5', 'home', 'portal', 'homeadmin']) {
    const escenas = ESC.filter(e => e.mock === grupo && (!FILTRO || e.id.includes(FILTRO))); if (!escenas.length) continue
    const c = await lanzar(grupo === 'inv5' ? 9521 : 9522); const { send, ev } = c
    const M = MOCKS[grupo]; let mockSrc = M.MOCK
    await send('Page.addScriptToEvaluateOnNewDocument', { source: mockSrc + (grupo === 'homeadmin' ? '' : RESUMEN) }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    for (const W of [390, 360]) for (const tema of ['dark', 'light']) for (const e of escenas) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] }); await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(grupo === 'portal' ? 900 : 350)
      await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Emulation.setDeviceMetricsOverride', { width: W, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Page.navigate', { url: B + e.ruta }); await sleep(2800)
      let paso = 'ok'
      for (const p of e.pasos) { const [k, ...r] = p.split(':'), v = r.join(':')
        if (k === 'e') { await sleep(+v); continue }
        if (k === 'j') { await ev(v).catch(() => {}); await sleep(500); continue }
        if (k === 'l') { const [kk, vv] = v.split('='); await ev(`localStorage.setItem(${JSON.stringify(kk)}, ${JSON.stringify(vv)}); location.reload()`).catch(() => {}); await sleep(2500); continue }
        const js = k === 'c' ? `(()=>{ const b=[...document.querySelectorAll(${JSON.stringify(v)})].find(x=>x.getBoundingClientRect().width>0); if(!b) return false; b.click(); return true })()`
          : `(()=>{ const b=[...document.querySelectorAll('main button, [role=dialog] button, main [role=button], .anc-rowMenu button')].find(x=>x.getBoundingClientRect().width>0 && (x.textContent.trim()===${JSON.stringify(v)} || x.textContent.trim().startsWith(${JSON.stringify(v)}) || (x.getAttribute('aria-label')||'').startsWith(${JSON.stringify(v)}))); if(!b) return false; b.click(); return true })()`
        if (!(await ev(js))) { paso = 'no se encontró el paso «' + p + '»; hay: ' + (await ev(`JSON.stringify([...document.querySelectorAll('main button, [role=dialog] button')].filter(x=>x.getBoundingClientRect().width>0).map(x=>(x.getAttribute('aria-label')||x.textContent.trim()).slice(0,28)).slice(0,14))`)); break }; await sleep(350) }
      await sleep(500)
      const res = !e.menu ? { encontrado: true, ok: true, caja: [], alto: 0 } : paso === 'ok' ? JSON.parse(await ev(COMPROBAR(e.menu))) : { encontrado: false, motivo: paso }
      const foto = async () => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SHOTS, `${e.id}__${W}__${tema}.png`), Buffer.from(r.data, 'base64')) }
      await foto(); resultados.push({ id: e.id, W, tema, ...res })
      console.log(`${res.encontrado ? (res.ok ? 'OK    ' : 'FALLA ') : 'NO-HAY'} ${e.id.padEnd(28)} ${W} ${tema.padEnd(5)}`, res.encontrado ? (res.ok ? `caja ${res.caja} alto ${res.alto}` : res.fallos.join(' | ')) : res.motivo || 'el menú no se abrió')
    }
    await c.cerrar()
  }
  fs.writeFileSync(path.join(SHOTS, 'resultados.json'), JSON.stringify(resultados, null, 1))
  const malos = resultados.filter(r => !r.encontrado || !r.ok); console.log(`\n${resultados.length - malos.length} de ${resultados.length} correctos; ${malos.length} con problema`)
  process.exit(malos.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
