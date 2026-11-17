// El editor móvil frente al teclado del iPhone (paso 1): una capa de pantalla completa debe ocupar EXACTAMENTE la zona visible (`top` = lo que Safari desplazó la vista, `height` = el alto visible).
// `ajusteDePantalla` (lib/tecladoHoja.ts) hace la cuenta y `useTecladoPantalla` la aplica. Las hojas pequeñas siguen con `useTecladoHoja`, que NO cambia. Se ejecutan los dos ganchos de verdad con un viewport simulado. Sin red.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs'), Module = require('module')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const T = require(resolver(path.join(RAIZ, 'lib/tecladoHoja')))
const m = (innerHeight, alto, arriba = 0, escala = 1) => ({ innerHeight, alto, arriba, escala })

// React de mentira: useEffect corre el efecto en el acto y guarda su limpieza. Así los ganchos se ejecutan tal cual, contra un elemento y un visualViewport simulados.
const limpiezas = []; const cargaPrevia = Module._load
Module._load = function (req, ...r) { return req === 'react' ? { useEffect: f => { const c = f(); if (c) limpiezas.push(c) } } : cargaPrevia.call(this, req, ...r) }
const H = require(resolver(path.join(RAIZ, 'components/useTecladoHoja')))
Module._load = cargaPrevia
function escena(innerHeight) {
  const oyentes = { resize: [], scroll: [] }, vv = { height: innerHeight, offsetTop: 0, scale: 1, addEventListener: (t, f) => oyentes[t].push(f), removeEventListener: (t, f) => { oyentes[t] = oyentes[t].filter(x => x !== f) } }
  const props = {}, attrs = {}, el = { style: { top: '', bottom: '', height: '', maxHeight: '', setProperty: (k, v) => { props[k] = v }, removeProperty: k => { delete props[k] } }, setAttribute: (k, v) => { attrs[k] = v }, removeAttribute: k => { delete attrs[k] } }
  global.window = { innerHeight, visualViewport: vv }
  const mover = (alto, arriba, tipo = 'resize', escala = 1) => { vv.height = alto; vv.offsetTop = arriba; vv.scale = escala; oyentes[tipo].forEach(f => f()) }
  const estado = () => ({ top: el.style.top, bottom: el.style.bottom, height: el.style.height, maxHeight: el.style.maxHeight, alto: props['--alto-visible'], teclado: attrs['data-teclado'] })
  return { el, vv, oyentes, mover, estado }
}
const VACIO = { top: '', bottom: '', height: '', maxHeight: '', alto: undefined, teclado: undefined }

correr(async () => {
  await prueba('ajusteDePantalla: con el teclado abierto la capa ocupa la zona visible; sin desplazamiento de Safari empieza en 0', () => {
    assert.deepEqual(T.ajusteDePantalla(m(664, 362)), { arriba: 0, alto: 362 }); assert.deepEqual(T.ajusteDePantalla(m(640, 349)), { arriba: 0, alto: 349 }); assert.deepEqual(T.ajusteDePantalla(m(844, 500)), { arriba: 0, alto: 500 }) })

  await prueba('con la vista desplazada por Safari (offsetTop 120 y 200) sigue ajustando y la capa baja con la vista: es lo que fallaba (a 200 el cálculo de las hojas cree que ya no hay teclado)', () => {
    assert.deepEqual(T.ajusteDePantalla(m(664, 362, 120)), { arriba: 120, alto: 362 }); assert.deepEqual(T.ajusteDePantalla(m(664, 362, 200)), { arriba: 200, alto: 362 })
    assert.equal(T.ajusteDeTeclado(m(664, 362, 200)), null, 'el cálculo de las hojas pequeñas se apaga con ese desplazamiento (no se toca: es de ellas)') })

  await prueba('sin teclado no hace nada: viewport completo, la barra de direcciones de Safari que se esconde (hasta el umbral) y el zoom de dedos', () => {
    assert.equal(T.ajusteDePantalla(m(664, 664)), null); assert.equal(T.ajusteDePantalla(m(664, 664 - T.UMBRAL_TECLADO)), null, 'justo en el umbral: no es teclado'); assert.equal(T.ajusteDePantalla(m(664, 664 - 60, 30)), null, 'la barra de Safari')
    assert.deepEqual(T.ajusteDePantalla(m(664, 664 - T.UMBRAL_TECLADO - 1)), { arriba: 0, alto: 543 }, 'un px más que el umbral: sí')
    assert.equal(T.ajusteDePantalla(m(664, 362, 0, 1.02)), null, 'zoom de dedos'); assert.equal(T.ajusteDePantalla(m(664, 300, 150, 2)), null); assert.deepEqual(T.ajusteDePantalla(m(664, 362, 0, 1.005)), { arriba: 0, alto: 362 }, 'un redondeo de la escala no cuenta como zoom') })

  await prueba('valores raros: el desplazamiento nunca sale de [0, lo que tapa el teclado]; decimales redondeados; un alto visible de 0 no ajusta', () => {
    assert.deepEqual(T.ajusteDePantalla(m(664, 362, -40)), { arriba: 0, alto: 362 }); assert.deepEqual(T.ajusteDePantalla(m(664, 362, 999)), { arriba: 302, alto: 362 }, 'tope: innerHeight − alto')
    assert.deepEqual(T.ajusteDePantalla(m(664, 361.6, 119.5)), { arriba: 120, alto: 362 }); assert.deepEqual(T.ajusteDePantalla(m(664, 362, NaN)), { arriba: 0, alto: 362 }); assert.equal(T.ajusteDePantalla(m(664, 0)), null) })

  await prueba('useTecladoPantalla (ejecutado): al abrir el teclado pone top, height y bottom:auto, deja --alto-visible y marca data-teclado; sigue a la vista cuando Safari la desplaza (evento scroll); al cerrar el teclado lo quita todo', () => {
    const e = escena(664); H.useTecladoPantalla({ current: e.el })
    assert.deepEqual(e.estado(), VACIO, 'sin teclado no toca nada'); assert.equal(e.oyentes.resize.length, 1); assert.equal(e.oyentes.scroll.length, 1)
    e.mover(362, 0); assert.deepEqual(e.estado(), { top: '0px', bottom: 'auto', height: '362px', maxHeight: '', alto: '362px', teclado: '1' })
    e.mover(362, 120, 'scroll'); assert.deepEqual(e.estado(), { top: '120px', bottom: 'auto', height: '362px', maxHeight: '', alto: '362px', teclado: '1' }, 'la capa baja con la vista')
    e.mover(362, 200, 'scroll'); assert.equal(e.estado().top, '200px'); assert.equal(e.estado().teclado, '1', 'a 200 px sigue ajustada')
    e.mover(362, 0, 'resize', 1.5); assert.deepEqual(e.estado(), VACIO, 'con zoom de dedos se suelta')
    e.mover(362, 0); e.mover(664, 0); assert.deepEqual(e.estado(), VACIO, 'al cerrar el teclado queda como estaba')
    e.mover(362, 80); limpiezas.pop()(); assert.deepEqual(e.estado(), VACIO, 'al desmontar se limpia'); assert.equal(e.oyentes.resize.length + e.oyentes.scroll.length, 0, 'y suelta los oyentes') })

  await prueba('useTecladoPantalla inactivo o sin visualViewport no hace nada', () => {
    const e = escena(664); H.useTecladoPantalla({ current: e.el }, false); e.mover(362, 0); assert.deepEqual(e.estado(), VACIO); assert.equal(e.oyentes.resize.length, 0)
    global.window = { innerHeight: 664, visualViewport: null }; H.useTecladoPantalla({ current: e.el }); assert.deepEqual(e.estado(), VACIO); H.useTecladoPantalla({ current: null }) })

  await prueba('las hojas pequeñas NO cambian: useTecladoHoja (ejecutado) sigue subiendo bottom y limitando max-height, sin tocar top, height ni data-teclado', () => {
    const e = escena(844); H.useTecladoHoja({ current: e.el })
    e.mover(500, 0); assert.deepEqual(e.estado(), { top: '', bottom: '344px', height: '', maxHeight: `${500 - T.RESPIRO}px`, alto: `${500 - T.RESPIRO}px`, teclado: undefined })
    e.mover(450, 40); assert.deepEqual(e.estado(), { top: '', bottom: '354px', height: '', maxHeight: `${450 - T.RESPIRO}px`, alto: `${450 - T.RESPIRO}px`, teclado: undefined })
    e.mover(844, 0); assert.deepEqual(e.estado(), VACIO); limpiezas.pop()()
    for (const [f, re] of [['components/admin-movil/HojaBase.tsx', /useTecladoHoja\(ref\)/], ['app/portal/_components/disponibilidad/Disponibilidad.tsx', /useTecladoHoja\(hojaRef, !!selectedDay \|\| showRange\)/], ['components/AddPersonDialog.tsx', /useTecladoHoja\(scrimRef\)/]]) { const t = leer(f); assert.ok(re.test(t), f); assert.ok(!/useTecladoPantalla/.test(t), f + ' no usa el gancho de pantalla') } })

  await prueba('solo el editor móvil usa el gancho de pantalla completa; su capa sigue siendo fixed con inset:0 y el panel de abajo no se encoge', () => {
    const f = leer('components/canciones/EditorCancionMovil.tsx'), css = leer('components/canciones/editor-cancion-movil.module.css')
    assert.match(f, /useTecladoPantalla\(raizRef\)/); assert.ok(!/useTecladoHoja\(/.test(f)); assert.match(f, /ref=\{raizRef\}/)
    assert.match(css, /\.raiz\{ position:fixed; inset:0;/); assert.match(css, /\.barraTexto\{ flex:none;/); assert.match(css, /\.cuerpo\{ flex:1; min-height:0; overflow:auto;/)
    const usos = require('child_process').execSync('grep -rl "useTecladoPantalla" app components --include="*.ts" --include="*.tsx"', { cwd: RAIZ, encoding: 'utf8' }).trim().split('\n').sort(); assert.deepEqual(usos, ['components/canciones/EditorCancionMovil.tsx', 'components/useTecladoHoja.ts']) })
  terminar()
})
