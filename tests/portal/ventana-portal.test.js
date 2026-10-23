// La confirmación del portal («Quitar mi confirmación», «Declinar…», «Aceptar aquí en su lugar») usa la ventana centrada común en teléfono y la hoja de siempre en escritorio; mismas reglas de foco y de guardado. Correr: `node tests/portal/ventana-portal.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const hoja = leer('app/portal/_components/convocatorias/HojaConfirmacion.tsx'), v = leer('components/ventanas/VentanaCentrada.tsx'), css = leer('components/ventanas/ventanas.module.css')
correr(async () => {
  await prueba('en teléfono HojaConfirmacion es la ventana centrada común (modo controlada, con el texto del botón «Guardando…» y el error dentro); fuera del teléfono, la hoja de siempre sin cambios', async () => {
    assert.ok(/const telefono = useTelefonoYa\(\)\s*\n\s*if \(!telefono\) return <HojaDeSiempre \{\.\.\.p\} \/>/.test(hoja)); assert.ok(/<VentanaCentrada controlada ocupado=\{!!p\.ocupado\} error=\{p\.error\} titulo=\{p\.titulo\}/.test(hoja)); assert.ok(/p\.ocupado \? 'Guardando…' : p\.etiquetaConfirmar/.test(hoja))
    for (const x of ["role=\"alertdialog\" aria-modal=\"true\" aria-labelledby={idTitulo} aria-describedby={idTexto}", 'cancelar.current?.focus()', "e.key === 'Escape'", 'ui.asa', 'ui.hoja}']) assert.ok(hoja.includes(x), 'la hoja de siempre perdió ' + x) })
  await prueba('modo controlada: sin historial, el foco entra en el primer botón (Cancelar), los botones no cierran solos, mientras guarda nada cancela ni se pulsa dos veces, y el error se dice dentro', async () => {
    assert.ok(/if \(controlada\) \{\s*\n\s*const antes = document\.activeElement[^]*querySelector<HTMLElement>\('button'\)\?\.focus\(\)/.test(v)); assert.ok(/if \(controlada\) \{ if \(!ocupado\) onCerrar\(\); return \}/.test(v)); assert.ok(/disabled=\{controlada && ocupado\}/.test(v)); assert.ok(/if \(controlada\) \{ b\.onClick\(\); return \}/.test(v)); assert.ok(/\{error && <p role="alert" className=\{ui\.error\}>/.test(v)); assert.ok(/\.error\{[^}]*var\(--anc-no\)/.test(css)) })
  await prueba('el contenido del aviso (párrafos con negritas) se dibuja dentro de la ventana con el estilo común; el modo normal (confirmaciones que no guardan) sigue con historial y «atrás»', async () => {
    assert.ok(/\.cuerpo b\{[^}]*font-weight:700/.test(css)); for (const x of ['history.pushState', 'history.back()', "window.addEventListener('popstate'"]) assert.ok(v.includes(x), 'el modo normal perdió ' + x) })
  await prueba('las acciones de HojaDeConvocatoria no cambian: la hoja decide su texto y el controlador guarda; «Aceptar aquí», «Quitar» y «Declinar» siguen pasando por confirmarHoja y cancelarHoja', async () => {
    const h = leer('app/portal/_components/convocatorias/HojaDeConvocatoria.tsx'); for (const x of ['onConfirmar={c.confirmarHoja}', 'onCancelar={c.cancelarHoja}', 'ocupado={c.ocupado}', 'error={h?.error}']) assert.ok(h.includes(x), 'falta ' + x) })
  terminar()
})
