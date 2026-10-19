// Fase 2a: menú inferior de la administración (ítems, activo por pestaña, filas de «Más» según el rol) y que la escala compartida produce EXACTAMENTE el CSS que el portal tenía antes. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { ITEMS_MENU, activoDelMenu, filasDeMas } = require(resolver(path.join(RAIZ, 'lib/admin/menuMovil')))
const { cssEscala } = require(resolver(path.join(RAIZ, 'lib/escalaMovil')))
correr(async () => {
  await prueba('el menú tiene cinco ítems, en el orden del tablero Menú · A: Home primero y «Equipos» ya no está', async () => {
    assert.deepEqual(ITEMS_MENU.map(i => i.label), ['Home', 'Servicios', 'Personas', 'Canciones', 'Más']); assert.deepEqual(ITEMS_MENU.map(i => i.key), ['home', 'setlist', 'personas', 'canciones', 'mas']); assert.ok(!ITEMS_MENU.some(i => /equipos/i.test(i.label + i.key))) })
  await prueba('el ítem activo sigue a la pestaña: en /home es Home; Servicios, Personas y Canciones tal cual; la pestaña vieja «equipos» cuenta como Personas; Calendario, Chats, Admins y lo desconocido cuelgan de «Más»', async () => {
    for (const t of ['setlist', 'personas', 'canciones']) assert.equal(activoDelMenu(t), t)
    assert.equal(activoDelMenu(null, true), 'home'); assert.equal(activoDelMenu('chats', true), 'home'); assert.equal(activoDelMenu('equipos'), 'personas')
    for (const t of ['disponibilidad', 'chats', 'admins', 'ajustes', 'x', '', null, undefined]) assert.equal(activoDelMenu(t), 'mas', String(t)) })
  await prueba('«Más»: Calendario y Chats; «Admins» solo para el owner; Home ya no está aquí (es un ítem del menú)', async () => {
    assert.deepEqual(filasDeMas({ esOwner: false }).map(f => f.key), ['disponibilidad', 'chats']); assert.deepEqual(filasDeMas({ esOwner: true }).map(f => f.key), ['disponibilidad', 'chats', 'admins'])
    assert.ok(!filasDeMas({ esOwner: true }).some(f => /home/i.test(f.key + f.label))); assert.equal(filasDeMas({ esOwner: true }).find(f => f.key === 'admins').detalle, 'Solo el propietario de la organización') })
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
