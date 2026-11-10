// «Las líneas de compases ya guardadas se ven IGUAL» con `white-space: pre-wrap` (tests/portal/compas-espacios.test.js lo prueba en HTML; aquí en un navegador REAL): para cada línea de compases que ya existe (sin espacios de más), la caja del párrafo y la posición de
// CADA palabra son idénticas con `normal` (lo de antes) y con `pre-wrap` (lo de ahora), a 390, 360 y 820 px de ancho, también cuando la línea se parte en varias filas. Y un espacio nuevo (una pieza de 3 espacios) SÍ se ve: la línea queda más ancha.
// La regla se toma del archivo real components/canciones/hoja-acordes.module.css (la que dice `.compas{ … }`); la fuente es la serif del sistema, igual para las dos.
// Uso: node tests/e2e-menus/compas-pre-wrap.js
const R = __dirname + '/', { lanzar, sleep } = require(R + 'cdp.js'), fs = require('fs'), path = require('path')
const css = fs.readFileSync(path.join(R, '../../components/canciones/hoja-acordes.module.css'), 'utf8')
const regla = /\.compas\{([^}]*)\}/.exec(css)[1]
const tiene = /white-space:pre-wrap/.test(regla)
const LEGADAS = ['| G D | E C |', 'G x2', 'N.C. D', 'G / C / D ||', 'G A B C | E F♯ G A | C D E F♯ | A B C D | F♯ G A B | D E F♯ G | B C D E | G A B C |', '(repetir) A Amen', 'Cmaj7 Dm7 | G7sus4 C | Am7 D7 | Gadd9 Em7 | Cmaj7/E Dm7 G7 | Bm7♭5 E7 Am7 D7 G']
const NUEVA = 'G' + ' '.repeat(5) + 'D | Em ' + ' '.repeat(4) + ' C'
const out = []; let fallas = 0
const ok = (c, m) => { out.push((c ? 'OK    ' : 'FALLA ') + m); if (!c) fallas++ }

;(async () => {
  const c = await lanzar(9583), { send, ev } = c
  try {
    ok(tiene, 'hoja-acordes.module.css: `.compas` trae white-space:pre-wrap (la regla de ahora)')
    for (const ancho of [390, 360, 820]) {
      await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: 800, deviceScaleFactor: 2, mobile: ancho < 700 })
      const html = '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px}p{' + regla.replace(/white-space:[^;]*;?/, '') + ';font-family:serif;font-size:19px;line-height:1.55;font-weight:700;color:#345}.n{white-space:normal}.p{white-space:pre-wrap}</style><div id=raiz></div>'
      await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) }); await sleep(400)
      const medir = async (texto, clase) => JSON.parse(await ev(`(()=>{const r=document.getElementById('raiz');r.innerHTML='';const p=document.createElement('p');p.className=${JSON.stringify(clase)};p.textContent=${JSON.stringify(texto)};r.appendChild(p);
        const caja=p.getBoundingClientRect(),n=p.firstChild,rects=[];let i=0;for(const m of p.textContent.matchAll(/\\S+/g)){const g=document.createRange();g.setStart(n,m.index);g.setEnd(n,m.index+m[0].length);const q=g.getBoundingClientRect();rects.push([Math.round(q.left*100)/100,Math.round(q.top*100)/100,Math.round(q.width*100)/100])}
        let anchoLinea=0;const g2=document.createRange();g2.selectNodeContents(n);for(const q of g2.getClientRects())anchoLinea=Math.max(anchoLinea,q.width);
        return JSON.stringify({w:Math.round(caja.width*100)/100,h:Math.round(caja.height*100)/100,rects,filas:new Set(rects.map(x=>x[1])).size,anchoLinea:Math.round(anchoLinea*100)/100})})()`))
      for (const t of LEGADAS) {
        const a = await medir(t, 'n'), b = await medir(t, 'p')
        ok(a.w === b.w && a.h === b.h && JSON.stringify(a.rects) === JSON.stringify(b.rects), `${ancho} px · «${t.slice(0, 34)}${t.length > 34 ? '…' : ''}»: misma caja (${b.w}×${b.h}) y mismas posiciones de las ${b.rects.length} palabras en ${b.filas} fila(s)`)
      }
      const largas = [await medir(LEGADAS[4], 'p'), await medir(LEGADAS[5], 'p')]
      if (ancho < 700) ok(largas.some(x => x.filas > 1), `${ancho} px: hay líneas largas que se parten en varias filas (${largas.map(x => x.filas).join(', ')}), y también salen iguales`)
      const sinEsp = await medir('G D | Em C', 'p'), conEsp = await medir(NUEVA, 'p'), solo = await medir(NUEVA.replace(/ {2,}/g, ' '), 'p')
      ok(conEsp.rects.length === solo.rects.length && conEsp.rects[conEsp.rects.length - 1][0] > solo.rects[solo.rects.length - 1][0] + 20, `${ancho} px: un espacio nuevo SÍ se ve (la última palabra queda ${Math.round(conEsp.rects[conEsp.rects.length - 1][0] - solo.rects[solo.rects.length - 1][0])} px más a la derecha que sin espacios)`)
      void sinEsp
      const nn = await medir(NUEVA, 'n'); ok(nn.rects[nn.rects.length - 1][0] <= solo.rects[solo.rects.length - 1][0] + 0.5, `${ancho} px: con la regla de antes (normal) los espacios se perdían: por eso hace falta pre-wrap`)
    }
  } finally { await c.cerrar() }
  console.log(out.join('\n')); console.log(`\n${out.filter(x => x.startsWith('OK')).length} comprobaciones OK, ${fallas} fallas`); process.exit(fallas ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
