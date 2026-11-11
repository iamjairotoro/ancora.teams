// Tira de partes FIJA de la lectura con acordes (C3): se queda arriba mientras se lee, con fondo propio, bajo la zona segura y por debajo de todo lo que flota; las secciones saltan a quedar justo debajo de ella;
// la parte activa se mantiene visible dentro de la tira y el globo con el nombre no se pierde bajo la barra de estado. El comportamiento real lo mide tests/e2e-menus/lectura-tira-fija.js (navegador). Datos inventados; sin red.
// Correr: `node tests/portal/lectura-tira-fija.test.js`
const { assert, prueba, terminar, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const Tira = require(path.join(RAIZ, 'components/canciones/lectura/TiraPartes.tsx')), Lectura = require(path.join(RAIZ, 'app/portal/_components/lectura/LecturaCancion.tsx'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
// el cuerpo de una regla CSS por su selector exacto (primera aparición)
const regla = (css, sel) => { const i = css.indexOf(sel + '{'); assert.ok(i >= 0, `existe la regla ${sel}`); return css.slice(i + sel.length + 1, css.indexOf('}', i)) }
const CSS_TIRA = leer('components/canciones/lectura/lectura-partes.module.css'), CSS_PARTES = leer('components/canciones/lectura/partes.module.css'), CSS_HOJA = leer('components/canciones/lectura/hoja-c3.module.css')
const TOKENS = leer('app/globals.css')

;(async () => {
  await prueba('la tira queda FIJA arriba: sticky, pegada a la zona segura (--safe-top) y con una capa por debajo del menú, el reproductor, los menús y las hojas', () => {
    const r = regla(CSS_TIRA, '.tiraCaja')
    assert.ok(/position:\s*sticky/.test(r), 'sticky'); assert.ok(/top:\s*var\(--safe-top,\s*0px\)/.test(r), 'se pega debajo de la zona segura, no a 0')
    const z = Number((r.match(/z-index:\s*(\d+)/) || [])[1]), capas = Object.fromEntries([...TOKENS.matchAll(/--z-([a-z]+):\s*(\d+)/g)].map(m => [m[1], Number(m[2])]))
    assert.ok(z > 0 && z < capas.nav && z < capas.player && z < capas.scrim && z < capas.sheet, `capa ${z}: bajo el menú (${capas.nav}), el reproductor (${capas.player}), el velo (${capas.scrim}) y las hojas (${capas.sheet})`)
    assert.ok(capas.player >= 29, 'el menú «Saltar a sección» usa la capa 29 (BarraCancion): la tira queda por debajo')
  })
  await prueba('la tira tiene fondo propio (el del tema, opaco) y una línea sutil debajo; no usa colores sueltos', () => {
    const r = regla(CSS_TIRA, '.tiraCaja')
    assert.ok(/background:\s*var\(--anc-bg\)/.test(r), 'fondo del tema'); assert.ok(/box-shadow:[^;]*var\(--anc-ring\)/.test(r), 'línea sutil con el token del anillo')
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(r), 'sin colores sueltos (claro y oscuro salen de los tokens)')
    assert.ok(/background:\s*var\(--anc-bg\)/.test(regla(leer('app/portal/_components/portal-nav.module.css'), '.statusFade')), 'es el mismo fondo que la franja sólida de la barra de estado: no se nota el empalme')
  })
  await prueba('la tira sigue deslizándose de lado (overflow-x:auto) y los círculos siguen midiendo 44 px', () => {
    const t = regla(CSS_TIRA, '.tira'); assert.ok(/overflow-x:\s*auto/.test(t)); assert.ok(/display:\s*flex/.test(t))
    assert.ok(/width:\s*max\(44px,\s*2\.75rem\)/.test(regla(CSS_TIRA, '.circ')) && /height:\s*max\(44px,\s*2\.75rem\)/.test(regla(CSS_TIRA, '.circ')))
  })
  await prueba('el alto de la tira que usan las secciones (--tira-alto) coincide con el real: círculo de 44 px + 0,5 rem de relleno arriba y abajo', () => {
    const def = (regla(CSS_PARTES, '.colores').match(/--tira-alto:\s*([^;]+);/) || [])[1]
    assert.equal(def.trim(), 'calc(max(44px, 2.75rem) + 1rem)')
    const pad = (regla(CSS_TIRA, '.tira').match(/padding:\s*([^;]+);/) || [])[1].trim().split(/\s+/)
    assert.equal(pad[0], '0.5rem', 'relleno de arriba'); assert.equal(pad[2], '0.5rem', 'relleno de abajo')
  })
  await prueba('al saltar, la sección queda justo debajo de la tira FIJA: scroll-margin-top = zona segura + alto de la tira + un respiro', () => {
    const r = regla(CSS_HOJA, '.secC3'), m = (r.match(/scroll-margin-top:\s*([^;]+);/) || [])[1]
    assert.ok(m && m.includes('var(--safe-top, 0px)') && m.includes('var(--tira-alto, 3.75rem)') && /\+\s*0\.625rem/.test(m), `scroll-margin-top: ${m}`)
    assert.equal(leer('components/canciones/HojaAcordes.tsx').split('c3ui.secC3').length - 1, 1, 'cada sección de la lectura nueva lleva esa clase (una sola vez en el código)')
    assert.ok(leer('app/portal/_components/lectura/LecturaCancion.tsx').includes("scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })"), 'el salto usa scrollIntoView con block start (respeta scroll-margin)')
  })
  await prueba('sticky funciona: ningún contenedor entre la tira y la ventana recorta (overflow), crea otro bloque de scroll ni lo aísla (transform, contain)', () => {
    const malos = /overflow\s*:\s*(hidden|auto|scroll|clip)|overflow-[xy]\s*:\s*(hidden|auto|scroll|clip)|(^|[;\s])transform\s*:|contain\s*:|will-change|filter\s*:|perspective\s*:/
    for (const [f, sels] of [['app/portal/_components/portal.module.css', ['.contenido', '.raiz']], ['app/portal/_components/cancion-portal.module.css', ['.wrap']], ['components/canciones/lectura/partes.module.css', ['.colores']]]) for (const s of sels) assert.ok(!malos.test(regla(leer(f), s)), `${f} ${s} no rompe el sticky`)
    assert.ok(!/overflow|transform|contain/.test((leer('app/portal/_components/lectura/LecturaCancion.tsx').match(/<div className=\{coloresUi\.colores\}[^>]*>/) || [''])[0]), 'la raíz de la lectura no recorta')
  })
  await prueba('la tira es hija directa de la raíz de la lectura (su bloque contenedor es toda la canción, así que se mantiene pegada hasta el final)', () => {
    const l = leer('app/portal/_components/lectura/LecturaCancion.tsx'), ir = l.indexOf('<TiraPartes'), ih = l.indexOf('<HojaAcordes'), ic = l.indexOf('<CabeceraCancion')
    assert.ok(ic < ir && ir < ih, 'orden: cabecera, tira, hoja'); assert.ok(l.indexOf('<div className={coloresUi.colores}>') < ic)
  })
  await prueba('corrimientoParaVer: 0 si el círculo ya se ve; corre solo lo justo (con respiro de 12 px) a la derecha o a la izquierda', () => {
    const c = { left: 0, right: 366 }, f = Tira.corrimientoParaVer
    assert.equal(f(c, { left: 100, right: 144 }), 0, 'en el medio'); assert.equal(f(c, { left: 12, right: 56 }), 0, 'justo en el margen izquierdo'); assert.equal(f(c, { left: 310, right: 354 }), 0, 'justo en el margen derecho')
    assert.equal(f(c, { left: 330, right: 374 }), 20, 'cortado a la derecha: 374 + 12 − 366'); assert.equal(f(c, { left: 400, right: 444 }), 90, 'fuera por la derecha: 444 + 12 − 366')
    assert.equal(f(c, { left: -30, right: 14 }), -42, 'cortado a la izquierda: −30 − 12'); assert.equal(f(c, { left: -200, right: -156 }), -212, 'fuera por la izquierda')
    assert.equal(f({ left: 20, right: 386 }, { left: 40, right: 84 }), 0, 'la tira no empieza en 0 de la pantalla: se mide en las coordenadas de ella (40 ≥ 20 + 12)'); assert.equal(f({ left: 20, right: 386 }, { left: 20, right: 64 }), -12, 'pegado al borde izquierdo de la tira: pide 12 px de respiro')
  })
  await prueba('globoVaAbajo: encima si hay ≥ 36 px libres sobre la tira; debajo si está pegada arriba (con o sin muesca)', () => {
    const f = Tira.globoVaAbajo
    assert.equal(f(0, 0), true, 'pegada a 0 (sin muesca)'); assert.equal(f(47, 47), true, 'pegada bajo una muesca de 47 px'); assert.equal(f(60, 47), true, 'a 13 px de pegarse'); assert.equal(f(83, 47), false, 'justo 36 px libres'); assert.equal(f(300, 47), false, 'en su sitio, bajo la cabecera')
  })
  await prueba('el globo: encima (-30 px) por omisión, como en la maqueta; DEBAJO con la clase tipAbajo; y la tira no usa scrollIntoView (nunca mueve la página, solo corre su propia fila)', () => {
    assert.ok(/top:\s*-30px/.test(regla(CSS_TIRA, '.tip'))); assert.ok(/top:\s*calc\(100%/.test(regla(CSS_TIRA, '.tipAbajo')))
    const t = leer('components/canciones/lectura/TiraPartes.tsx'); assert.ok(!t.includes('scrollIntoView'), 'sin scrollIntoView'); assert.ok(t.includes('ul.scrollTo({ left: ul.scrollLeft + dx'), 'corre la fila con scrollTo (solo horizontal)')
    assert.ok(t.includes('globo.abajo ? `${ui.tip} ${ui.tipAbajo}` : ui.tip'))
  })
  await prueba('línea de lectura: justo debajo de la tira fija (su borde de abajo + 16 px); sin tira, el 30 % de la pantalla de antes', () => {
    assert.equal(Lectura.lineaDeLectura(105, 844), 121); assert.equal(Lectura.lineaDeLectura(47 + 60, 667), 123, 'con muesca de 47 px: tira de 47 a 107'); assert.equal(Lectura.lineaDeLectura(null, 844), 844 * 0.3)
  })
  await prueba('parte activa: tocar una sección corta (Interludio) la deja activa y la siguiente NO la roba; con la regla vieja (30 %) sí la robaba', () => {
    // tira fija de 47 a 107 px; la sección saltada queda a 117 px (10 px bajo la tira), mide 100 px; la siguiente empieza a 117 + 100 + 28 = 245 px
    const linea = Lectura.lineaDeLectura(107, 844), bordes = [-900, -400, 117, 245, 560, 900]
    assert.equal(Lectura.parteActiva(bordes, linea), 2, 'la tocada (3.ª) queda activa')
    const vieja = (b, alto) => { let a = 0; b.forEach((x, i) => { if (x !== null && x <= alto * 0.3) a = i }); return a }
    assert.equal(vieja(bordes, 844), 3, 'con el 30 % (253 px) la siguiente (245 px) se la llevaba: el defecto que se corrige')
  })
  await prueba('parte activa: sigue al desplazamiento, ignora secciones que no están en la página, vale 0 antes de la primera y la sección que llega a la línea cambia la activa', () => {
    const f = Lectura.parteActiva, linea = 123
    assert.equal(f([300, 600, 900], linea), 0, 'antes de la primera'); assert.equal(f([-50, 300, 600], linea), 0); assert.equal(f([-500, 123, 600], linea), 1, 'justo en la línea ya es la 2.ª'); assert.equal(f([-500, 124, 600], linea), 0, 'un píxel antes, todavía la 1.ª')
    assert.equal(f([-900, -500, -100], linea), 2, 'al final, la última'); assert.equal(f([-900, null, -100], linea), 2, 'una sección ausente se salta'); assert.equal(f([null, null], linea), 0); assert.equal(f([], linea), 0)
  })
  await prueba('LecturaCancion usa la línea bajo la tira (no el 30 % fijo): busca la tira por su etiqueta y no queda la comparación vieja', () => {
    const l = leer('app/portal/_components/lectura/LecturaCancion.tsx')
    assert.ok(l.includes('document.querySelector(`ul[aria-label="${T.partes}"]`)?.parentElement') && l.includes('lineaDeLectura(tira ? tira.getBoundingClientRect().bottom : null, window.innerHeight)') && l.includes('setActiva(parteActiva('))
    assert.ok(!/getBoundingClientRect\(\)\.top <= window\.innerHeight \* 0\.3/.test(l), 'sin la comparación vieja')
  })
  await prueba('sigue siendo presentación: la tira no escribe nada ni toca datos', () => {
    const t = leer('components/canciones/lectura/TiraPartes.tsx'); assert.ok(!/fetch\(|supabase|localStorage|sessionStorage/.test(t))
  })
  terminar()
})()
