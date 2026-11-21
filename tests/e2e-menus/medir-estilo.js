// Mide, en píxeles reales de teléfono (390 px, ya con la escala --esc de 0,85), el tamaño, el peso, el alto y las esquinas de elementos representativos de varias pantallas. Sirve para el inventario del estilo de botones/selectores/tipografía
// (antes → después). Uso: BASE=http://127.0.0.1:3168 node tests/e2e-menus/medir-estilo.js [--json salida.json] [--ancho 390]
const fs = require('fs'), { lanzar, sleep } = require('./cdp.js'), portal = require('./portal-mock.js'), inv5 = require('./inv5-mock.js'), tira = require('./tira-mock.js'), B = process.env.BASE || 'http://127.0.0.1:3168'
const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null }
const ANCHO = +(arg('--ancho') || 390), SALIDA = arg('--json')
// Cada pantalla: mock, ruta, pasos (js) y los elementos a medir: [rol, texto exacto del elemento (o selector css con «css:»)].
const PANTALLAS = [
  { id: 'Inicio', mock: tira, ruta: '/portal/t65', pasos: [`document.querySelectorAll('[aria-label="Días"] button')[17].click()`], medir: [['título de pantalla', 'Inicio'], ['título de sección (tira)', 'Tu semana'], ['nombre de equipo (ficha)', 'Alabanza'], ['etiqueta de sección', 'Próximos'], ['chip de estado', 'Confirmada'], ['botón (Bloquear esta fecha)', 'Bloquear esta fecha'], ['enlace (Ver todos)', 'Ver todos'], ['texto base de la tarjeta del día', 'Si no estarás disponible, bloquea la fecha para que tu equipo lo sepa.'], ['título de tarjeta (fecha)', 'Lunes 23 de noviembre']] },
  { id: 'Servicios', mock: portal, ruta: '/portal/t65', pasos: [`[...document.querySelectorAll('nav button')].find(b=>b.getBoundingClientRect().width>0&&b.textContent.trim().startsWith('Servicios')).click()`], medir: [['título de pantalla', 'Servicios'], ['selector (opción activa)', 'Convocatorias'], ['selector (opción inactiva)', 'Disponibilidad'], ['título de tarjeta', 'Servicio Ancora'], ['chip de estado', 'Por responder'], ['etiqueta de sección', 'Próximos']] },
  { id: 'Canciones', mock: portal, ruta: '/portal/t65', pasos: [`[...document.querySelectorAll('nav button')].find(b=>b.getBoundingClientRect().width>0&&b.textContent.trim().startsWith('Canciones')).click()`], medir: [['título de pantalla', 'Canciones'], ['selector (opción activa)', 'Todas'], ['selector (opción inactiva)', 'Favoritas'], ['título de canción', 'Cuán grande es Él'], ['artista', 'Artista'], ['contador', '4 canciones']] },
  { id: 'Admin · ficha de servicio', mock: inv5, ruta: '/admin?tab=setlist&servicio=conv', pasos: [], medir: [['título de pantalla', 'Servicio conv'], ['botón/acción', 'Cambiar horario'], ['botón/acción', 'Orden del servicio']] },
]
;(async () => {
  const c = await lanzar(9608), { send, ev } = c, out = []
  await send('Network.enable'); await send('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: 844, deviceScaleFactor: 2, mobile: true })
  let mockId = null
  for (const p of PANTALLAS) {
    if (mockId) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: mockId }); mockId = (await send('Page.addScriptToEvaluateOnNewDocument', { source: p.mock.PORTAL || p.mock.MOCK })).identifier; await send('Network.setCookie', { name: 'sb-placeholder-auth-token', value: p.mock.SESION(), url: B })
    await send('Page.navigate', { url: B + '/portal/t65' }); await sleep(600); await ev(`localStorage.clear(); sessionStorage.clear(); localStorage.setItem('__rol','admin')`); await send('Page.navigate', { url: B + p.ruta }); await sleep(3800)
    for (const j of p.pasos) { await ev(j).catch(() => {}); await sleep(900) }
    for (const [rol, texto] of p.medir) {
      const r = JSON.parse(await ev(`JSON.stringify((()=>{const t=${JSON.stringify(texto)};const hojas=[...document.querySelectorAll('body *')].filter(e=>{const x=e.getBoundingClientRect();return x.width>0&&x.height>0&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()===t)});const e=hojas[0];if(!e)return null
        const cs=getComputedStyle(e),caja=e.closest('button,[role=radio],[role=tab],a')||e,cc=getComputedStyle(caja),r=caja.getBoundingClientRect();return {tam:+parseFloat(cs.fontSize).toFixed(2),peso:cs.fontWeight,alto:+r.height.toFixed(1),ancho:+r.width.toFixed(1),esquinas:cc.borderTopLeftRadius,esBoton:caja!==e||e.tagName==='BUTTON'}})())`))
      out.push({ pantalla: p.id, rol, texto, ...(r || { noEncontrado: true }) })
    }
  }
  console.log(`\nAncho ${ANCHO} px — tamaño y peso del texto; alto, ancho y esquinas de la caja (botón/opción si el texto está dentro de uno)`)
  for (const o of out) console.log(`${o.pantalla.padEnd(26)} ${o.rol.padEnd(34)} ${o.noEncontrado ? 'NO ENCONTRADO «' + o.texto + '»' : `${String(o.tam).padStart(5)} px · peso ${o.peso} · caja ${o.ancho}×${o.alto}${o.esBoton ? ` · esquinas ${o.esquinas}` : ''}`}`)
  if (SALIDA) fs.writeFileSync(SALIDA, JSON.stringify(out, null, 1)); await c.cerrar()
})().catch(e => { console.error(e); process.exit(1) })
