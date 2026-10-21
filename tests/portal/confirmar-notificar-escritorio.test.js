// «Notificar a N nuevos» en ESCRITORIO pregunta antes de convocar, con la misma hoja y el mismo texto que el teléfono; solo «Notificar» llama a sendInvites. Correr: `node tests/portal/confirmar-notificar-escritorio.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const crudo = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), leer = f => crudo(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const T = require(resolver(path.join(RAIZ, 'lib/textos/servicio')))

correr(async () => {
  await prueba('el botón de la nómina ya no convoca directo: abre la hoja con el equipo y cuántos son; solo «Notificar» llama a sendInvites', async () => {
    const v = leer('components/AdminServiceView.tsx')
    assert.ok(/setConfirmarNotificar\(\{teamId:section\.teamId,nuevos:teamStats\.newToInvite\}\)/.test(v)); assert.equal((v.match(/sendInvites\(/g) || []).length, 1, 'una sola llamada a sendInvites en la vista')
    assert.ok(/<HojaConfirmarNotificar nuevos=\{confirmarNotificar\.nuevos\} onCerrar=\{\(\)=>setConfirmarNotificar\(null\)\} onConfirmar=\{\(\)=>sendInvites\(confirmarNotificar\.teamId\)\} \/>/.test(v))
    assert.ok(!/onClick=\{\(\)=>sendInvites\(/.test(v), 'ningún botón llama a sendInvites directo') })
  await prueba('es LA MISMA hoja y el mismo texto del teléfono (un solo componente): título con plural, cuerpo «por correo» sin «notificación», botones «Notificar» y «Cancelar»; «Cancelar» y cerrar no envían', async () => {
    const h = leer('components/servicio-movil/HojasServicio.tsx'); assert.ok(/export function HojaConfirmarNotificar/.test(h)); assert.ok(/cerrar\(onConfirmar\)/.test(h) && /cerrar\(\)\}>\{T\.cancelar\}/.test(h))
    assert.ok(/from '\.\/servicio-movil\/HojasServicio'/.test(leer('components/AdminServiceView.tsx'))); assert.ok(/<HojaConfirmarNotificar/.test(leer('components/servicio-movil/ServicioMovil.tsx')))
    assert.equal(T.confirmarNotificarTitulo(3), '¿Notificar a 3 personas nuevas?'); assert.equal(T.confirmarNotificarTitulo(1), '¿Notificar a 1 persona nueva?'); assert.equal(T.TEXTOS_SERVICIO.confirmarNotificarCuerpo, 'Les llegará la convocatoria por correo.') })
  await prueba('en reposo no se dibuja nada: la hoja solo existe mientras `confirmarNotificar` tiene valor, y la vista no cambió su marcado', async () => {
    const v = leer('components/AdminServiceView.tsx'); assert.ok(/\{confirmarNotificar && <HojaConfirmarNotificar/.test(v)); assert.ok(/useState<\{teamId:string; nuevos:number\}\|null>\(null\)/.test(v)) })
  terminar()
})
