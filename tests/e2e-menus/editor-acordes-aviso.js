// El aviso del editor móvil de acordes en un navegador REAL (Chrome por CDP), con la pantalla DESPLAZADA hacia abajo: un 400, un 409 y un fallo de red tienen que dejar el aviso rojo visible bajo la barra, junto a «Guardar», con el foco, anunciado como alerta y con el motivo concreto;
// el aviso amarillo («acordes antiguos») también. A 390 y 360 px, claro y oscuro; guarda las capturas. Las respuestas de error se simulan en el navegador (no hay servidor ni base de por medio).
// Uso: construir.sh 3168  →  BASE=http://127.0.0.1:3168 node tests/e2e-menus/editor-acordes-aviso.js <carpeta-de-capturas>
// Esperas con sondeo (15 s / 100 ms) y reintento del caso si se corta (AVISO, nunca un OK silencioso); una comprobación que falla no se reintenta.
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), M = require(R + 'inv5-mock.js')
const B = process.env.BASE || 'http://127.0.0.1:3168', OUT = process.argv[2] || '/tmp/editor-acordes-aviso'
fs.mkdirSync(OUT, { recursive: true })
const ESPERA_MAX = 15000, SONDEO = 100, REINTENTOS = 2
const LINEAS = Array.from({ length: 30 }, (_, i) => `Esta es la línea ${i + 1} de una letra larga para que la pantalla se desplace`)
const LETRA = 'VERSO 1:\n' + LINEAS.join('\n')
const SECCION = LINEAS.map(t => ({ kind: 'lyric', segments: [{ text: t }] }))
// GET: letra larga (para poder desplazar); con __aviso la letra y los acordes guardados no coinciden (sale el aviso amarillo). POST: según window.__modo responde 400, 409 o falla la red.
const PARCHE = `(()=>{const f=window.fetch.bind(window);window.__gets=0;window.__posts=0;window.fetch=async(i,o)=>{const u=typeof i==='string'?i:(i.url||String(i));const esAc=u.startsWith('/api/admin/canciones/acordes');const post=esAc&&((o&&o.method)||'GET').toUpperCase()==='POST';
if(post){window.__posts++;const m=window.__modo;const J=(c,s)=>new Response(JSON.stringify(c),{status:s,headers:{'content-type':'application/json'}});if(m==='red')throw new TypeError('Failed to fetch');if(m==='400')return J({error:'Valor no válido en secciones'},400);if(m==='409')return J({error:'Alguien más cambió esta canción. Recarga para ver los cambios.',campo:'base'},409)}
const r=await f(i,o);if(esAc&&!post){window.__gets++;const d=await r.clone().json();d.cancion.letra=${JSON.stringify(LETRA)};d.cancion.secciones=window.__aviso?[[{kind:'lyric',segments:[{text:'otra letra distinta'}]}]]:[${JSON.stringify(SECCION)}];return new Response(JSON.stringify(d),{status:200,headers:{'content-type':'application/json'}})}return r}})()`
const ESCENARIOS = { 400: { texto: 'valor no válido en los acordes', reintentar: false }, 409: { texto: 'Alguien más cambió esta canción', reintentar: true }, red: { texto: 'No hay conexión', reintentar: false } }

const out = []; let fallas = 0, paso = ''
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

async function intento(ancho, tema, cuales) {
  const et = `${ancho} ${tema}`
  paso = 'abrir el navegador'; const c = await lanzar(9560), { send, ev } = c
  const esperar = async (cond, nombre) => {
    paso = `esperar «${nombre}»`; const t0 = Date.now()
    for (;;) {
      let v = false; try { v = await ev(`!!(${cond})`) } catch (_) { /* la página está cambiando */ }
      if (v) return
      if (Date.now() - t0 > ESPERA_MAX) throw new Error(`«${nombre}» no apareció en ${ESPERA_MAX / 1000} s`)
      await sleep(SONDEO)
    }
  }
  const boton = txt => `[...document.querySelectorAll('[role=dialog] button, button')].find(b=>b.textContent.trim()==='${txt}')`
  const clic = async (nombre, buscar) => { await esperar(buscar, nombre); paso = `clic en «${nombre}»`; await ev(`(${buscar}).click()`) }
  const foto = async nombre => { paso = `captura «${nombre}»`; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${OUT}/${nombre}__${ancho}__${tema}.png`, Buffer.from(s.data, 'base64')) }
  const CUERPO = `document.querySelector('[role=dialog] [class*="_cuerpo__"]')`
  const medir = () => ev(`(()=>{const a=document.querySelector('[role=dialog] [role=alert]');if(!a)return null;const r=a.getBoundingClientRect(),cab=document.querySelector('[role=dialog] [class*="_cab__"]').getBoundingClientRect(),g=[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Guardar').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,e=document.elementFromPoint(cx,cy);
    return JSON.stringify({top:r.top,bottom:r.bottom,h:r.height,cabB:cab.bottom,gB:g.bottom,innerH:innerHeight,scroll:${CUERPO}.scrollTop,activo:document.activeElement===a,tapa:!!e&&(e===a||a.contains(e)),texto:a.textContent.trim(),reint:[...a.querySelectorAll('button')].map(b=>b.textContent.trim()),botonVisible:a.querySelector('button')?(b=>b.top>=cab.bottom&&b.bottom<=innerHeight&&b.height>0)(a.querySelector('button').getBoundingClientRect()):null})})()`)
  try {
    paso = 'preparar el navegador'
    await send('Page.addScriptToEvaluateOnNewDocument', { source: M.MOCK }); await send('Page.addScriptToEvaluateOnNewDocument', { source: (cuales[0] === 'aviso' ? 'window.__aviso=true;' : '') + PARCHE }); await send('Network.enable'); await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: M.SESION(), url: B })
    await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 844, deviceScaleFactor: 2, mobile: true }); await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    paso = 'abrir /portal/t65'; await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600)
    paso = 'abrir /admin?tab=canciones'; await ev(`localStorage.clear();sessionStorage.clear();localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + '/admin?tab=canciones' })
    await clic('canción «Cuán grande es Él»', `[...document.querySelectorAll('*')].find(e=>e.childElementCount===0&&e.textContent.trim()==='Cuán grande es Él')`)
    await clic('Editar con acordes', boton('Editar con acordes'))
    await esperar(`document.fonts.status==='loaded'`, 'fuentes cargadas')
    await esperar(`document.querySelectorAll('[role=dialog] [data-fin]').length>=20`, 'las líneas del modo Acordes'); await sleep(300)      // en Letra el texto se desplaza dentro de su caja; en Acordes la hoja entera se desplaza
    const desplazar = async () => { paso = 'desplazar el cuerpo hacia abajo'; await ev(`(()=>{const c=${CUERPO};c.scrollTop=c.scrollHeight})()`); await sleep(200); const t = await ev(`${CUERPO}.scrollTop`); if (!(t > 100)) out.push('INFO  cuerpo: ' + await ev(`(()=>{const c=${CUERPO},a=document.querySelector('[role=dialog] textarea');return JSON.stringify({cuerpo:[c.scrollHeight,c.clientHeight],ta:a&&[a.scrollHeight,a.clientHeight,getComputedStyle(a).overflowY,getComputedStyle(a).resize]})})()`)); return t }
    for (const cual of cuales) {
      const e = `${et} ${cual}`
      if (cual === 'aviso') {
        await esperar(`document.querySelector('[role=dialog] [role=status]')`, 'el aviso amarillo')
        const st = await desplazar(); ok(st > 100, `${e}: la pantalla está desplazada hacia abajo (${Math.round(st)} px)`)
        const a = JSON.parse(await ev(`(()=>{const p=[...document.querySelectorAll('[role=dialog] [role=status]')].find(x=>x.textContent.includes('no coinciden con la letra'));if(!p)return JSON.stringify(null);const r=p.getBoundingClientRect(),cab=document.querySelector('[role=dialog] [class*="_cab__"]').getBoundingClientRect();return JSON.stringify({top:r.top,bottom:r.bottom,h:r.height,cabB:cab.bottom,innerH:innerHeight,enCuerpo:${CUERPO}.contains(p)})})()`))
        ok(!!a, `${e}: el aviso amarillo «acordes antiguos» existe`)
        if (a) { ok(a.top >= a.cabB - 1 && a.bottom <= a.innerH && a.h > 0, `${e}: el aviso amarillo se ve bajo la barra con la pantalla desplazada (${Math.round(a.top)}–${Math.round(a.bottom)} de ${a.innerH}; la barra termina en ${Math.round(a.cabB)})`); ok(!a.enCuerpo, `${e}: el aviso amarillo no vive en el cuerpo que se desplaza`) }
        await foto('aviso-acordes-antiguos'); continue
      }
      await ev(`window.__modo=${JSON.stringify(cual)}`)
      const st = await desplazar(); ok(st > 100, `${e}: la pantalla está desplazada hacia abajo (${Math.round(st)} px)`)
      const antes = await ev(`window.__posts`)
      await clic('Guardar', boton('Guardar')); await esperar(`document.querySelector('[role=dialog] [role=alert]')`, 'el aviso rojo'); await sleep(200)
      paso = 'medir'; const m = JSON.parse(await medir()), ex = ESCENARIOS[cual]
      ok(m.top >= m.cabB - 1 && m.bottom <= m.innerH && m.h > 0, `${e}: el aviso rojo queda visible bajo la barra (${Math.round(m.top)}–${Math.round(m.bottom)} de ${m.innerH}; la barra termina en ${Math.round(m.cabB)})`)
      ok(m.top - m.gB <= 40, `${e}: está junto al botón «Guardar» (a ${Math.round(m.top - m.gB)} px de él)`)
      ok(m.tapa, `${e}: nada lo tapa (el elemento en su centro es el aviso)`)
      ok(Math.abs(m.scroll - st) < 2 && m.scroll > 100, `${e}: la pantalla sigue desplazada (${Math.round(m.scroll)} px): el aviso se ve SIN subir`)
      ok(m.activo, `${e}: el aviso recibió el foco`)
      ok(m.texto.includes(ex.texto), `${e}: dice el motivo concreto («${m.texto.slice(0, 70)}…»)`)
      ok(!/songId|\bbase\b|cuerpo|secciones|Failed to fetch|TypeError/.test(m.texto), `${e}: no muestra datos internos ni el error del navegador`)
      ok((await ev(`window.__posts`)) === antes + 1, `${e}: Guardar envió UNA sola petición`)
      if (ex.reintentar) { ok(m.reint.includes('Reintentar') && m.botonVisible === true, `${e}: «Reintentar» se ve dentro del aviso`) } else ok(m.reint.length === 0, `${e}: no ofrece «Reintentar»`)
      await foto('aviso-' + cual)
      if (ex.reintentar) {
        const g0 = await ev(`window.__gets`); await clic('Reintentar', `[...document.querySelectorAll('[role=dialog] [role=alert] button')].find(b=>b.textContent.trim()==='Reintentar')`)
        await esperar(`window.__gets>${g0} && !document.querySelector('[role=dialog] [role=alert]')`, 'recarga y aviso fuera'); ok(true, `${e}: «Reintentar» recarga la canción y el aviso desaparece`)
        await ev(`window.__modo=''`)
      }
    }
  } finally { await c.cerrar() }
}

;(async () => {
  for (const ancho of [390, 360]) for (const tema of ['light', 'dark']) for (const cuales of [['aviso'], ['400', 'red', '409']]) {
    const et = `${ancho} ${tema} ${cuales.join('+')}`
    for (let n = 0; n <= REINTENTOS; n++) {
      const [lo, lf] = [out.length, fallas]
      try { await intento(ancho, tema, cuales); break }
      catch (e) {
        out.length = lo; fallas = lf
        if (n < REINTENTOS) out.push(`AVISO ${et}: se cortó en el paso «${paso}» (${e.message}) — intento ${n + 1} de ${REINTENTOS + 1}, se repite`)
        else ok(false, `${et}: se cortó en el paso «${paso}» tras ${REINTENTOS + 1} intentos — ${e.message}`)
      }
    }
  }
  const avisos = out.filter(x => x.startsWith('AVISO')).length
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas, ${avisos} avisos (reintentos)`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
