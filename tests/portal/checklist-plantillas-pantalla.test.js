// La ventana «Plantillas» del checklist del líder (teléfono): qué pide al servidor, que NUNCA manda contenido, la confirmación con los números, los mensajes del líder ante la predeterminada, y que escritorio y tablet no cambian.
// Correr: `node tests/portal/checklist-plantillas-pantalla.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'), plano = s => sinCom(s).replace(/\s+/g, ' ')

correr(async () => {
  await prueba('la ventana pide solo ids, un nombre y confirmaciones al servidor (nunca el contenido), y usa las cuatro acciones de plantillas', async () => {
    const x = plano(leer('components/servicio-movil/PlantillasChecklist.tsx'))
    for (const a of ['plantillas-listar', 'plantilla-previsualizar', 'plantilla-aplicar', 'plantilla-guardar']) assert.ok(x.includes(`'${a}'`), a)
    assert.ok(!/contenido|\bcontent\s*:|plantilla\.content/i.test(x.replace(/'Content-Type'/g, '')), 'el cliente nunca arma ni manda el contenido de una plantilla'); assert.ok(!/supabase|from\('tool_templates'\)/.test(x), 'nada directo a la base: todo por /api/admin/checklist'); assert.ok(/fetch\('\/api\/admin\/checklist'/.test(x))
    assert.ok(/esperados: \{ agregar: esperado\.agregar \}/.test(x), 'manda los números que la persona confirmó (si cambian, el servidor responde 409)') })
  await prueba('aplicar: primero previsualiza, avisa si no hay nada nuevo, confirma con los números del servidor y recién entonces aplica; si cambió el checklist vuelve a preguntar', async () => {
    const x = plano(leer('components/servicio-movil/PlantillasChecklist.tsx'))
    const iPre = x.indexOf("'plantilla-previsualizar'"), iNada = x.indexOf('T.nadaNuevo'), iConf = x.indexOf('confirmar(confirmarAplicar(esperado)'), iApl = x.indexOf("'plantilla-aplicar'")
    assert.ok(iPre > 0 && iNada > iPre && iConf > iNada && iApl > iConf, 'orden: previsualizar → nada nuevo → confirmar → aplicar'); assert.ok(/r\.status === 409 && r\.body\?\.codigo === 'cambio'/.test(x) && /T\.cambioElChecklist/.test(x))
    assert.ok(/if \(esperado\.agregar === 0\) \{ setError\(T\.nadaNuevo\); return \}/.test(x), 'sin nada nuevo no pregunta ni escribe') })
  await prueba('guardar: pregunta si reemplazar cuando el nombre ya existe (con el aviso de «predeterminada» para el admin); al líder ante la predeterminada le explica y le sugiere otro nombre (lo deja en el campo)', async () => {
    const x = plano(leer('components/servicio-movil/PlantillasChecklist.tsx'))
    assert.ok(/c === 'existe'[\s\S]*?existeConfirmar\(r\.body\.nombre \?\? limpio, !!r\.body\.predeterminada\)[\s\S]*?T\.reemplazarAccion/.test(x) || /r\.status === 409 && c === 'existe'/.test(x)); assert.ok(/guardar\(true\)/.test(x))
    assert.ok(/r\.status === 403 && c === 'predeterminada'/.test(x) && /predeterminadaBloqueada\(limpio, sug\)/.test(x) && /setNombre\(sug\)/.test(x))
    assert.ok(/maxLength=\{60\}/.test(x), 'nombre de hasta 60') })
  await prueba('ChecklistLider: el botón «Plantillas» solo existe con un checklist creado; sin checklist se ofrece «Empezar con una plantilla» (crea el checklist y abre la ventana); lo que pasó se muestra como informe (no como error)', async () => {
    const x = plano(leer('components/servicio-movil/ChecklistLider.tsx'))
    assert.ok(/\{vista\.checklistId && <button type="button" className=\{ui\.plantillasBtn\} onClick=\{\(\) => setPlantillas\(true\)\}>\{T\.plantillas\}<\/button>\}/.test(x)); assert.ok(/T\.empezarConPlantilla/.test(x) && /\.then\(ok => \{ if \(ok\) setPlantillas\(true\) \}\)/.test(x))
    assert.ok(/<PlantillasChecklist checklistId=\{vista\.checklistId\}/.test(x) && /onVista=\{v => aplicar\(v\)\}/.test(x)); assert.ok(/role="status" className=\{ui\.informe\}/.test(x), 'el informe es un status, no una alerta') })
  await prueba('la ventana es centrada (VentanaCentrada, sin el círculo del ícono), con «Guardar este como plantilla» y «Cerrar»; sin promesas de «en vivo»', async () => {
    const x = plano(leer('components/servicio-movil/PlantillasChecklist.tsx')), T = require(path.join(RAIZ, 'node_modules/typescript')) && null; void T
    assert.ok(/<VentanaCentrada titulo=\{plantillasDe\(equipo\)\} sinIcono controlada/.test(x)); assert.ok(/texto: T\.guardarComoPlantilla, primario: true/.test(x) && /texto: T\.cerrar/.test(x))
    const v = plano(leer('components/ventanas/VentanaCentrada.tsx')); assert.ok(/sinIcono = false/.test(v) && /\{!sinIcono && <span className=\{`\$\{ui\.icono\}/.test(v), 'el ícono sigue por defecto para las demás ventanas')
    const t = leer('lib/textos/checklist.ts'); assert.ok(/guardarComoPlantilla: 'Guardar este como plantilla'/.test(t) && /domingoPasado: 'Empezar con el del domingo pasado'/.test(t) && /domingoPasadoAyuda: 'Copia los ítems sin marcar'/.test(t))
    assert.ok(!/al instante|en vivo|tiempo real/i.test(sinCom(t) + sinCom(leer('components/servicio-movil/PlantillasChecklist.tsx'))), 'ningún texto visible promete actualización en vivo') })
  await prueba('estilos de la ventana: solo tokens --anc-*, tocables de 44 px y letra del campo de 16 px reales', async () => {
    const c = plano(leer('components/servicio-movil/plantillas.module.css')); assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(c) && !/\brgba?\(/.test(c), 'sin colores sueltos'); assert.ok(/\.fila\{[^}]*min-height:max\(44px, 3\.5rem\)/.test(c)); assert.ok(/\.entrada\{[^}]*min-height:max\(44px, 2\.75rem\)[^}]*font-size:16px/.test(c))
    const l = plano(leer('components/servicio-movil/checklist-lider.module.css')); assert.ok(/\.plantillasBtn\{[^}]*min-height:max\(44px, 2\.75rem\)/.test(l)) })
  await prueba('escritorio y tablet no cambian: ChecklistTool (escritorio) no usa nada nuevo; las plantillas del teléfono viven solo en ChecklistLider (que solo se dibuja en teléfono)', async () => {
    const d = leer('components/ChecklistTool.tsx'); assert.ok(!/PlantillasChecklist|checklistPlantillas|plantilla-guardar|api\/admin\/checklist/.test(d), 'el escritorio sigue con su propia lógica de plantillas')
    const p = leer('components/servicio-movil/PantallaHerramienta.tsx'); assert.ok(/ChecklistLider/.test(p)) })
  terminar()
})
