// El editor móvil frente al teclado del iPhone (paso 2): con el teclado abierto (`data-teclado`, lo pone useTecladoPantalla) se da sitio al texto. Se quedan Deshacer, Rehacer y el botón de modo; se ocultan el tono, ABC/123 y la frase de ayuda;
// el panel de botones va en UNA fila; cabecera, herramientas y panel pierden respiro. En canción nueva se ocultan además el subtítulo y la tira de la estructura. Sin teclado no cambia nada. La medición real (≥ 150 px de texto visible) es tests/e2e-menus/editor-teclado.js.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const css = leer('components/canciones/editor-cancion-movil.module.css')
// las reglas del teclado: todo lo que empieza por `.raiz[data-teclado]`
const reglas = [...css.matchAll(/^(\.raiz\[data-teclado\][^{]*)\{([^}]*)\}/gm)].map(m => ({ sel: m[1].trim(), cuerpo: m[2].trim() }))
const regla = sel => { const r = reglas.find(x => x.sel === sel); assert.ok(r, 'falta la regla ' + sel); return r.cuerpo }

correr(async () => {
  await prueba('con el teclado se ocultan SOLO el tono, ABC/123, el salto de fila y la frase de ayuda; Deshacer, Rehacer y el botón de modo no se ocultan nunca', () => {
    assert.equal(regla('.raiz[data-teclado] .herr .tono, .raiz[data-teclado] .notacion, .raiz[data-teclado] .salto'), 'display:none;'); assert.equal(regla('.raiz[data-teclado] .pieTexto span'), 'display:none;')
    const ocultas = reglas.filter(r => /display:none/.test(r.cuerpo)).map(r => r.sel).join(' , ')
    assert.ok(!/\.icono|\.modoTexto|\.volver|\.encabezados|\.cab\b|\.cuerpo|\.area|\.barraTexto|\.franja/.test(ocultas), 'nada de lo que hace falta para escribir se oculta: ' + ocultas)
    const f = leer('components/canciones/EditorCancionMovil.tsx'); assert.match(f, /className=\{ui\.icono\} aria-label=\{T\.deshacer\}/); assert.match(f, /className=\{ui\.icono\} aria-label=\{T\.rehacer\}/); assert.match(f, /<span>\{T\.ayudaTexto\}<\/span>/, 'la frase de ayuda es el <span> del pie') })

  await prueba('el panel de botones va en UNA fila: «♪ Acordes» fijo a la izquierda y los encabezados deslizables ocupando el resto', () => {
    assert.equal(regla('.raiz[data-teclado] .barraTexto'), 'display:flex; align-items:center; padding:4px 0;'); assert.equal(regla('.raiz[data-teclado] .pieTexto'), 'order:-1; flex:none; padding:0 0 0 12px;')
    assert.equal(regla('.raiz[data-teclado] .encabezados'), 'flex:1; min-width:0; padding:0 12px 0 8px;'); assert.match(css, /^\.encabezados\{ display:flex; gap:8px; padding:0 12px 8px; overflow-x:auto;/m, 'siguen deslizándose de lado') })

  await prueba('cabecera, herramientas y cuerpo pierden respiro vertical pero la zona segura de arriba se respeta; las herramientas quedan en una fila', () => {
    assert.equal(regla('.raiz[data-teclado] .cab'), 'padding-top:calc(env(safe-area-inset-top, 0px) + 2px); padding-bottom:2px;'); assert.equal(regla('.raiz[data-teclado] .herr'), 'flex-wrap:nowrap; padding-bottom:2px;'); assert.equal(regla('.raiz[data-teclado] .cuerpo'), 'padding-bottom:8px;') })

  await prueba('canción nueva: con el teclado se ocultan el subtítulo y la tira de la estructura (con su cabecera); el marcador de carga y la tira sin teclado no cambian', () => {
    assert.equal(regla('.raiz[data-teclado] .subtitulo, .raiz[data-teclado] .tiraEditor'), 'display:none;'); assert.match(css, /^\.tiraEditor\{ padding:0 12px; \}/m); assert.match(css, /^\.estructuraCab\{[^}]*min-height:1\.5rem/m) })

  await prueba('sin teclado NADA cambia: las reglas de siempre siguen iguales y TODAS las reglas nuevas viven bajo `.raiz[data-teclado]` (9 reglas, ni una suelta)', () => {
    assert.equal(reglas.length, 9, reglas.map(r => r.sel).join(' | ')); assert.ok(reglas.every(r => r.sel.split(',').every(s => s.trim().startsWith('.raiz[data-teclado] '))), 'cada selector empieza por .raiz[data-teclado]')
    assert.match(css, /^\.herr\{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:0 12px 8px; \}/m); assert.match(css, /^\.cab\{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:calc\(env\(safe-area-inset-top, 0px\) \+ 6px\) 12px 6px; \}/m)
    assert.match(css, /^\.barraTexto\{ flex:none; padding:8px 0 calc\(env\(safe-area-inset-bottom, 0px\) \+ 8px\);/m); assert.match(css, /^\.cuerpo\{ flex:1; min-height:0; overflow:auto; padding:0 12px 24px;/m); assert.match(css, /^\.pieTexto\{ display:flex; align-items:center; gap:12px; padding:0 12px;/m)
    assert.ok(!/data-teclado/.test(leer('components/canciones/hoja-acordes.module.css')) && !/data-teclado/.test(leer('app/portal/_components/disponibilidad/hoja.module.css')), 'las hojas pequeñas no conocen data-teclado') })

  await prueba('la marca la pone el gancho de pantalla (y la quita al cerrar el teclado); lo que se toca conserva sus 44 px', () => {
    const h = leer('components/useTecladoHoja.ts'); assert.match(h, /el\.setAttribute\('data-teclado', '1'\)/); assert.match(h, /el\.removeAttribute\('data-teclado'\)/)
    assert.ok(!reglas.some(r => /min-height|height:/.test(r.cuerpo)), 'ninguna regla del teclado cambia alturas de botones'); assert.match(css, /^\.icono\{ min-height:44px; min-width:44px;/m); assert.match(css, /^\.volver\{ flex:none; min-height:44px;/m); assert.match(css, /^\.encabezados button\{ flex:none; min-height:44px;/m) })
  terminar()
})
