// Fase 2a: menú inferior de la administración (ítems, activo por pestaña, filas de «Más» según el rol) y que la escala compartida produce EXACTAMENTE el CSS que el portal tenía antes. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { ITEMS_MENU, activoDelMenu, filasDeMas } = require(resolver(path.join(RAIZ, 'lib/admin/menuMovil')))
const { cssEscala } = require(resolver(path.join(RAIZ, 'lib/escalaMovil')))
correr(async () => {
  await prueba('el menú tiene cinco ítems, en el orden del tablero Admin · A', async () => {
    assert.deepEqual(ITEMS_MENU.map(i => i.label), ['Servicios', 'Personas', 'Canciones', 'Equipos', 'Más']); assert.deepEqual(ITEMS_MENU.map(i => i.key), ['setlist', 'personas', 'canciones', 'equipos', 'mas']) })
  await prueba('el ítem activo sigue a la pestaña: las cuatro propias tal cual; Calendario, Chats, Admins y lo desconocido cuelgan de «Más»', async () => {
    for (const t of ['setlist', 'personas', 'canciones', 'equipos']) assert.equal(activoDelMenu(t), t)
    for (const t of ['disponibilidad', 'chats', 'admins', 'ajustes', 'x', '', null, undefined]) assert.equal(activoDelMenu(t), 'mas', String(t)) })
  await prueba('«Más»: Calendario, Chats, Home; «Admins» solo para el owner; en /home no se ofrece «Home»', async () => {
    assert.deepEqual(filasDeMas({ esOwner: false }).map(f => f.key), ['disponibilidad', 'chats', 'home'])
    assert.deepEqual(filasDeMas({ esOwner: true }).map(f => f.key), ['disponibilidad', 'chats', 'admins', 'home'])
    assert.deepEqual(filasDeMas({ esOwner: true, enHome: true }).map(f => f.key), ['disponibilidad', 'chats', 'admins'])
    assert.equal(filasDeMas({ esOwner: false }).find(f => f.key === 'home').href, '/home') })
  await prueba('la escala compartida da el MISMO css que tenía el layout del portal (el portal no cambia)', async () => {
    const antes = `:root{--esc:1}@media (max-width:768px){:root{--esc:.85}}
:root{font-size:calc(100% * var(--esc));--anc-r:calc(var(--r) * var(--esc));--anc-r-s:calc(var(--r-s) * var(--esc));--anc-r-panel:calc(var(--r-panel) * var(--esc))}
.portal-root :is(input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select){font-size:16px}`
    assert.equal(cssEscala('.portal-root'), antes) })
  await prueba('el menú de la administración solo se muestra en teléfono y el portal sigue pasando su propio perfil', async () => {
    const css = fs.readFileSync(path.join(RAIZ, 'app/portal/_components/portal-nav.module.css'), 'utf8'); assert.ok(/@media \(min-width:769px\)\{ \.nav\.soloTel\{ display:none; \} \}/.test(css))
    const portal = fs.readFileSync(path.join(RAIZ, 'app/portal/_components/PortalApp.tsx'), 'utf8'); assert.ok(!/soloTelefono/.test(portal), 'el portal no usa el modo solo teléfono') })
  terminar()
})
