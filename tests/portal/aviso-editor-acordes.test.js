// El aviso del editor móvil de acordes: una franja fija bajo la barra (junto a «Guardar»), con el motivo concreto y sin datos internos. Solo interfaz: la ruta, el guardado y los datos no cambian.
// Correr: `node tests/portal/aviso-editor-acordes.test.js`   (en un navegador real, con la pantalla desplazada: tests/e2e-menus/editor-acordes-aviso.js)
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { TEXTOS_EDITOR: T, mensajeDeGuardado: m } = require(path.join(RAIZ, 'lib/textos/editorAcordes.ts'))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const fuente = sinComentarios(leer('components/canciones/EditorCancionMovil.tsx')), css = leer('components/canciones/editor-cancion-movil.module.css')

correr(async () => {
  await prueba('mensajeDeGuardado: cada respuesta tiene su motivo concreto; solo «hubo cambios» ofrece Reintentar', () => {
    assert.deepEqual(m(409, { error: 'x', campo: 'base' }), { texto: T.huboCambios, conflicto: true })
    for (const e of [401, 403]) assert.deepEqual(m(e, { error: 'No autorizado' }), { texto: T.noAutorizado, conflicto: false })
    assert.deepEqual(m(0, null), { texto: T.sinConexion, conflicto: false })
    assert.deepEqual(m(400, { error: 'Valor no válido en secciones' }), { texto: 'No se pudo guardar: valor no válido en los acordes. Tus cambios siguen en el editor.', conflicto: false })
    assert.ok(m(400, { error: 'Valor no válido en letra' }).texto.includes('en la letra') && m(400, { error: 'Valor no válido en tono' }).texto.includes('en el tono'))
    assert.deepEqual(m(400, { error: T.faltaTono, campo: 'tono' }), { texto: T.faltaTono, conflicto: false })
    for (const e of [500, 502, 504, 413, 404]) assert.deepEqual(m(e, { error: 'cualquier cosa' }), { texto: T.guardadoIncompleto, conflicto: false })
    assert.deepEqual(m(500, undefined), { texto: T.guardadoIncompleto, conflicto: false }, 'una respuesta sin cuerpo (HTML, vacía) no rompe') })

  await prueba('sin datos internos: nunca copia el texto del servidor ni muestra el nombre interno de un campo (songId, base, cuerpo); lo desconocido dice «los datos»', () => {
    for (const campo of ['songId', 'base', 'cuerpo', 'otro', '']) { const t = m(400, { error: 'Valor no válido en ' + campo }).texto; assert.ok(t.includes('en los datos'), campo); assert.ok(!/songId|\bbase\b|cuerpo|otro/.test(t.replace('Tus cambios', ''))) }
    const t = m(500, { error: 'SECRETO_stack: relation "song_section_variants" does not exist', detalle: 'SECRETO' }).texto; assert.ok(!/SECRETO|relation|song_section/.test(t))
    assert.ok(!/SECRETO/.test(m(403, { error: 'SECRETO' }).texto + m(409, { error: 'SECRETO' }).texto + m(400, { error: 'SECRETO en secciones; SECRETO' }).texto), 'ningún texto del servidor se copia')
    const todos = [T.noAutorizado, T.sinConexion, T.valorNoValidoEn('x'), T.huboCambios, T.guardadoIncompleto, T.faltaTono].join(' ')
    assert.ok(!/en vivo|al instante|tiempo real/i.test(todos), 'sin «en vivo»') })

  await prueba('la franja: va DESPUÉS de la barra y ANTES del cuerpo que se desplaza, lleva el aviso amarillo y el rojo; dentro del cuerpo ya no hay ninguno de los dos', () => {
    const cab = fuente.indexOf('className={ui.cab}'), franja = fuente.indexOf('className={ui.franja}'), cuerpo = fuente.indexOf('className={ui.cuerpo}')
    assert.ok(cab > 0 && cab < franja && franja < cuerpo, 'orden barra → franja → cuerpo')
    const dentroFranja = fuente.slice(franja, fuente.indexOf('{estado === \'listo\' && (\n        <>', franja))
    assert.ok(/role="status">\{aviso\}/.test(dentroFranja) && /ref=\{errorRef\} className=\{ui\.error\} role="alert" tabIndex=\{-1\}>\{error\}/.test(dentroFranja) && /\{conflicto && <>[\s\S]*T\.reintentar/.test(dentroFranja), 'aviso, error con foco y «Reintentar»')
    const enCuerpo = fuente.slice(cuerpo)
    assert.ok(!/\{aviso &&/.test(enCuerpo) && !/role="alert"/.test(enCuerpo.replace(/estado === 'error' && \([\s\S]*?\n        \)\}/, '')), 'el cuerpo ya no tiene el aviso ni el error de guardado') })

  await prueba('al aparecer el error recibe el foco (lo trae a la vista y lo anuncia), salvo «falta el tono», que deja el foco en el selector; se anuncia como alerta', () => {
    assert.ok(/useEffect\(\(\) => \{ if \(error && error !== T\.faltaTono\) errorRef\.current\?\.focus\(\) \}, \[error\]\)/.test(fuente))
    assert.ok(/if \(!tono\) \{ setError\(T\.faltaTono\); selectRef\.current\?\.focus\(\); return \}/.test(fuente)) })

  await prueba('la franja es fija: no se desplaza con el cuerpo, no se come más de un tercio de la pantalla y el error muestra el foco', () => {
    assert.ok(/\.franja\{[^}]*flex:none;[^}]*max-height:34vh;[^}]*overflow:auto;/.test(css) && /\.franja \.aviso, \.franja \.error\{ margin:0; \}/.test(css) && /\.error:focus-visible\{ outline:2px solid var\(--anc-modo-ink\)/.test(css))
    assert.ok(/\.cuerpo\{[^}]*flex:1; min-height:0; overflow:auto;/.test(css), 'el cuerpo es lo único que se desplaza') })

  await prueba('solo interfaz: Guardar sigue enviando el mismo cuerpo, una sola vez; el éxito sigue siendo la única salida que cierra; el texto del servidor no se muestra', () => {
    assert.equal((fuente.match(/fetch\(/g) || []).length, 2)
    assert.ok(/body: JSON\.stringify\(\{ songId, tono, letra: doc\.texto, secciones: aSecciones\(doc\), base: carga\.huella(?:, \.\.\.\(confirmarArreglo \? \{ confirmarArreglo: true \} : \{\}\))? \}\)/.test(fuente))
    assert.ok(/if \(r\.ok\) \{ onGuardado\(\); return \}/.test(fuente) && (fuente.match(/onGuardado\(\)/g) || []).length === 1, 'solo r.ok cierra')
    assert.ok(/const m = mensajeDeGuardado\(r\.status, j\)/.test(fuente) && /catch \{ setError\(mensajeDeGuardado\(0, null\)\.texto\) \}/.test(fuente) && !/j\?\.error/.test(fuente), 'ni siquiera lee j.error')
    assert.ok(/if \(m\.conflicto\) setConflicto\(true\)/.test(fuente) && /setGuardando\(true\); setError\(null\); setConflicto\(false\)/.test(fuente), '«Reintentar» solo tras un 409 y se limpia al volver a guardar')
    assert.ok(!/localStorage|sessionStorage|sendBeacon/.test(fuente)) })
  terminar()
})
