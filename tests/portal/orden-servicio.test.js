// La Orden del servicio como componente (fase 3 · B1): AdminServiceView ya no lleva su lógica y se la pasa a components/OrdenDelServicio.tsx. Esto vigila la partición; que el escritorio quedó IGUAL se comprobó
// aparte (HTML renderizado idéntico y capturas dentro del ruido entre dos corridas del mismo build). Correr: `node tests/portal/orden-servicio.test.js`.
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const vista = leer('components/AdminServiceView.tsx'), orden = leer('components/OrdenDelServicio.tsx')

correr(async () => {
  await prueba('AdminServiceView ya no trae la lógica de la Orden (bloques, plantillas, panel de edición): vive en OrdenDelServicio', async () => {
    for (const x of ['addBlock', 'updateBlock', 'deleteBlock', 'buildOrderContent', 'applyTemplateOrder', 'vaciarOrder', 'tool_templates', 'service_blocks', 'service_applied_templates', 'EditPanel', 'BLOQUES_PRESET', 'order-row-desktop'])
      assert.ok(!vista.includes(x), 'AdminServiceView todavía menciona ' + x)
    for (const x of ['addBlock', 'updateBlock', 'deleteBlock', 'buildOrderContent', 'applyTemplateOrder', 'vaciarOrder', "from('tool_templates')", "from('service_blocks')", 'function EditPanel', 'BLOQUES_PRESET', 'order-row-desktop', 'order-row-mobile'])
      assert.ok(orden.includes(x), 'OrdenDelServicio no tiene ' + x) })
  await prueba('la vista le pasa el servicio, los bloques y el menú de la herramienta; el estado del menú «⋯» sigue siendo de la vista (lo comparten todas las herramientas)', async () => {
    assert.ok(/<OrdenDelServicio service=\{selectedService\} blocks=\{blocks\} setBlocks=\{setBlocks\} songs=\{songs\} members=\{members\} vozMemberIds=\{vozMemberIds\}/.test(vista))
    assert.ok(/menuAbierto=\{openToolMenuId===tool\.id\}/.test(vista)); assert.ok(/onQuitar=\{\(\)=>removeTeamTool\(tool\.id\)\}/.test(vista)); assert.ok(/alVaciar=\{\(\)=>setShowServiceMenu\(false\)\}/.test(vista))
    assert.ok(/const \[openToolMenuId,setOpenToolMenuId\]/.test(vista)) })
  await prueba('el componente es del SERVICIO: no conoce equipos ni la vista (nada de selectedService, tool.*, openToolMenuId ni removeTeamTool) y exporta los colores que la vista sigue usando', async () => {
    for (const x of ['selectedService', 'tool.id', 'openToolMenuId', 'removeTeamTool', 'equipoSections']) assert.ok(!orden.includes(x), 'OrdenDelServicio no debería conocer ' + x)
    assert.ok(/export const C = /.test(orden) && /export const ACCENT = /.test(orden)); assert.ok(/import OrdenDelServicio, \{ C, ACCENT \} from '\.\/OrdenDelServicio'/.test(vista)) })
  await prueba('los textos de la Orden no cambiaron (el escritorio es el mismo)', async () => {
    for (const t of ['Orden del servicio', 'Añadir', 'Bloque personalizado', 'Aplicar plantilla…', 'Guardar como plantilla', 'Sin ítems. Agrega una canción o bloque.', 'Observaciones', "Vaciar", 'Reemplazar', 'Agregar al final', "contar(blocks.length, 'ítem', 'ítems')"]) assert.ok(orden.includes(t), t) })
  await prueba('ningún comentario suelto como texto dentro del JSX (un «/* … */» sin llaves se dibuja en pantalla)', async () => {
    const crudo = fs.readFileSync(path.join(RAIZ, 'components/OrdenDelServicio.tsx'), 'utf8')
    assert.ok(!/<>\s*\n\s*\/\*/.test(crudo), 'comentario sin llaves justo después de <>'); assert.ok(/<>\s*\n\s*\{\/\* RIGHT/.test(crudo)) })
  terminar()
})
