// La herramienta «Orden del servicio» en teléfono (Orden-Herramienta-A y B): tarjeta ordenada, «Añadir» y «⋯» como hojas, y la confirmación de «Actualizar» SOLO en teléfono; escritorio igual. Correr: `node tests/portal/orden-herramienta-telefono.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const real = n => require(resolver(path.join(RAIZ, n)))

correr(async () => {
  await prueba('textos: títulos del menú exactos y en el mismo orden que hoy; resumen y confirmación con el texto pedido', async () => {
    const m = real('lib/textos/ordenHerramienta'), T = m.TEXTOS_ORDEN_HERRAMIENTA
    assert.deepEqual([T.aplicar, T.guardarComoPlantilla, T.actualizar, T.vaciar, T.quitarHerramienta, T.cancelar], ['Aplicar plantilla…', 'Guardar como plantilla', 'Actualizar', 'Vaciar', 'Quitar esta herramienta', 'Cancelar'])
    assert.equal(T.sinPlantillaAplicada, 'No hay ninguna plantilla aplicada'); assert.equal(T.duracionTotal, 'Duración total')
    assert.equal(m.resumenOrden(4, '59:18'), '4 ítems · 59:18'); assert.equal(m.resumenOrden(1, '5:00'), '1 ítem · 5:00'); assert.equal(m.resumenOrden(0, '0:00'), '0 ítems')
    assert.equal(m.confirmarActualizarPlantilla('Domingo regular'), 'Se actualizará la plantilla «Domingo regular» con el orden actual. También cambia los servicios nuevos que la usen. ¿Continuar?')
    const { partirMensaje } = real('lib/ventanas/partirMensaje'), p = partirMensaje(m.confirmarActualizarPlantilla('X')); assert.equal(p.titulo, '¿Continuar?') })
  await prueba('la duración total siempre es m:ss (59:18, 45:00) y el total puede pasar de 60 minutos', async () => {
    const src = sinCom(leer('components/orden/OrdenTelefono.tsx')); assert.ok(/duracionTotalMovil = \(secs: number\)/.test(src)); assert.ok(/String\(s\)\.padStart\(2, '0'\)/.test(src)) })
  await prueba('en escritorio no cambia nada: el panel de siempre queda en la rama sin teléfono, «Actualizar» llama directo y el menú sigue flotante', async () => {
    const o = sinCom(leer('components/OrdenDelServicio.tsx'))
    assert.ok(/\{telefono \? \(\s*<OrdenTelefono /.test(o) && /\) : \(\s*<div className=\{`\$\{styles\.panel\} am-h`\}>/.test(o), 'solo el teléfono estrena marcado')
    assert.ok(/onClick=\{\(\)=>\{updateAppliedOrderTemplate\(\);onCerrarMenu\(\)\}\}/.test(o), 'escritorio: Actualizar directo, sin confirmación'); assert.ok(/<MenuFlotante titulo="Acciones del Orden del servicio"/.test(o) && /<MenuFlotante titulo="Añadir al orden"/.test(o))
    assert.ok(/draggable/.test(o) && /order-row-desktop/.test(o) && /order-row-mobile/.test(o), 'el arrastre y las filas de escritorio siguen ahí') })
  await prueba('teléfono: «Actualizar» pide confirmar con el nombre de la plantilla y luego usa la misma función; las demás acciones usan las funciones de siempre', async () => {
    const o = sinCom(leer('components/OrdenDelServicio.tsx'))
    assert.ok(/async function actualizarConfirmando\(\) \{\s*if \(!\(await confirmar\(confirmarActualizarPlantilla\(plantillaAplicada\?\.name \|\| 'sin nombre'\)[^)]*\)\)\) return\s*await updateAppliedOrderTemplate\(\)/.test(o))
    for (const x of ['onAplicar={()=>setShowApplyOrder(true)}', 'onGuardarComo={()=>setShowSaveAsOrder(true)}', 'onActualizar={()=>{ void actualizarConfirmando() }}', 'onVaciar={()=>{ void vaciarOrder() }}', 'onQuitar={()=>onQuitar()}']) assert.ok(o.includes(x), x)
    assert.ok(/\{telefono && menuAbierto && \(\s*<HojaMenuOrden/.test(o) && /\{telefono && showPresets && \(\s*<HojaAnadirOrden/.test(o), 'las hojas solo en teléfono')
    assert.ok(/puedeGestionarPlantillas=\{!!canManageTemplates\}/.test(o), 'quien no administra plantillas solo ve «Quitar esta herramienta»') })
  await prueba('la hoja del ⋯: Aplicar, Guardar como, Actualizar (con línea gris), Vaciar y, aparte, Quitar; Cancelar al final; sobre HojaBase y con las filas compartidas', async () => {
    const h = sinCom(leer('components/orden/HojasOrden.tsx'))
    const ord = ['T.aplicar', 'T.guardarComoPlantilla', 'T.actualizar', 'T.vaciar', 'T.quitarHerramienta', 'T.cancelar'].map(x => h.indexOf(x)); assert.ok(ord.every(i => i > 0) && ord.every((i, k) => k === 0 || i > ord[k - 1]), 'orden de las filas')
    assert.ok(/<HojaBase idTitulo=\{id\}/.test(h) && /pantallas\.filaHoja/.test(h) && /pantallas\.peligro/.test(h), 'HojaBase y filas compartidas'); assert.ok(/disabled=\{!hayPlantilla\}/.test(h) && /T\.sinPlantillaAplicada/.test(h) && /«\$\{nombrePlantilla \|\| ''\}»/.test(h), 'Actualizar deshabilitada con su línea gris')
    assert.ok(/disabled=\{!hayBloques\}/.test(h), 'Guardar como y Vaciar siguen deshabilitados sin ítems'); assert.ok(/cerrar\(onActualizar\)/.test(h) && /cerrar\(onQuitar\)/.test(h), 'la acción corre después de cerrar la hoja')
    const peligro = h.match(/pantallas\.peligro/g) || []; assert.equal(peligro.length, 2, 'Vaciar y Quitar en rojo suave') })
  await prueba('«Añadir» como hoja: Canción, los bloques preestablecidos (con su duración) y Bloque personalizado', async () => {
    const h = sinCom(leer('components/orden/HojasOrden.tsx')); assert.ok(/T\.cancion/.test(h) && /bloques\.map\(b =>/.test(h) && /toMMSS\(b\.duracion_min\)/.test(h) && /T\.bloquePersonalizado/.test(h) && /onBloque\(\)/.test(h)) })
  await prueba('la fila: canciones con círculo numerado, bloques con ícono lineal, título sin cursiva a 16×esc, nota con lápiz (sin emoji), duración y chevron siempre; sin manija de reordenar', async () => {
    const t = sinCom(leer('components/orden/OrdenTelefono.tsx')), c = sinCom(leer('components/orden/orden-telefono.module.css'))
    assert.ok(/ui\.numero/.test(t) && /<Icono size=\{18\} \/>/.test(t) && /<Pencil /.test(t) && /<ChevronRight /.test(t) && !/📝/.test(t) && !/draggable|onDrag/.test(t))
    const r = s => { const i = ('\n' + c).indexOf('\n' + s + '{'); assert.ok(i >= 0, s); return c.slice(i, c.indexOf('}', i)) }
    const nm = r('.nm'); assert.ok(/font-size:calc\(16px \* var\(--esc, 1\)\)/.test(nm) && /font-weight:600/.test(nm) && /font-style:normal/.test(nm)); assert.ok(/tabular-nums/.test(r('.dur')) && /tabular-nums/.test(r('.pieV')))
    assert.ok(/min-height:max\(44px, calc\(64px \* var\(--esc, 1\)\)\)/.test(r('.fila')), 'fila mínima'); assert.ok(/max\(44px, calc\(52px \* var\(--esc, 1\)\)\)/.test(r('.anadir')) && /border-radius:999px/.test(r('.anadir')), 'Añadir de 44 px mínimo y píldora'); assert.ok(/border-radius:50%/.test(r('.mas')) && /max\(44px/.test(r('.mas')))
    assert.ok(/border-top:1px solid var\(--anc-rule\)/.test(r('.pie')), 'línea fina arriba del pie'); assert.ok(!/#[0-9a-fA-F]{3,6}\b|rgba?\(/.test(c), 'solo tokens --anc-*') })
  await prueba('el ítem sin título y el sin duración no rompen la fila (título de respaldo y «—»)', async () => {
    const t = sinCom(leer('components/orden/OrdenTelefono.tsx')); assert.ok(/'Sin título'/.test(t) && /\|\| '— canción —'/.test(t) && /dur \? toMMSS\(dur\) : '—'/.test(t)) })
  terminar()
})
