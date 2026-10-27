// Fase 2a: menú inferior de la administración (ítems, activo por pestaña, filas de la pantalla «Admin» según el rol) y que la escala compartida produce EXACTAMENTE el CSS que el portal tenía antes. Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { ITEMS_MENU, activoDelMenu, filasDeAdmin, inicialesDeOrg } = require(resolver(path.join(RAIZ, 'lib/admin/menuMovil')))
const { cssEscala } = require(resolver(path.join(RAIZ, 'lib/escalaMovil')))
correr(async () => {
  await prueba('el menú tiene cinco ítems, en el orden del tablero Menú · A: Home primero y «Equipos» ya no está', async () => {
    assert.deepEqual(ITEMS_MENU.map(i => i.label), ['Home', 'Servicios', 'Personas', 'Canciones', 'Admin']); assert.deepEqual(ITEMS_MENU.map(i => i.key), ['home', 'setlist', 'personas', 'canciones', 'admin']); assert.ok(!ITEMS_MENU.some(i => /equipos/i.test(i.label + i.key))) })
  await prueba('el ítem activo sigue a la pestaña: en /home es Home; Servicios, Personas y Canciones tal cual; la pestaña vieja «equipos» cuenta como Personas; la pantalla Admin, Calendario, Chats, Admins y lo desconocido cuelgan de «Admin»', async () => {
    for (const t of ['setlist', 'personas', 'canciones']) assert.equal(activoDelMenu(t), t)
    assert.equal(activoDelMenu(null, true), 'home'); assert.equal(activoDelMenu('chats', true), 'home'); assert.equal(activoDelMenu('equipos'), 'personas')
    for (const t of ['admin', 'disponibilidad', 'chats', 'admins', 'ajustes', 'x', '', null, undefined]) assert.equal(activoDelMenu(t), 'admin', String(t)) })
  await prueba('pantalla «Admin» (primera versión): Calendario, Chats, Admins solo para el propietario, Equipos e Historial; lo que se dejó fuera no está; cada fila lleva a su destino', async () => {
    assert.deepEqual(filasDeAdmin({ esOwner: false }).map(f => f.key), ['disponibilidad', 'chats', 'equipos', 'historial']); assert.deepEqual(filasDeAdmin({ esOwner: true }).map(f => f.key), ['disponibilidad', 'chats', 'admins', 'equipos', 'historial'])
    const f = k => filasDeAdmin({ esOwner: true }).find(x => x.key === k); assert.deepEqual([f('disponibilidad').destino, f('chats').destino, f('admins').destino], [{ tab: 'disponibilidad' }, { tab: 'chats' }, { tab: 'admins' }])
    assert.deepEqual(f('equipos').destino, { url: '/admin?tab=personas&gestion=equipos' }); assert.deepEqual(f('historial').destino, { url: '/admin?tab=setlist&historial=1' }); assert.equal(f('admins').detalle, 'Solo el propietario')
    for (const fuera of [/convocatoria/i, /ajustes/i, /sincroniz/i, /respaldo/i, /estad[ií]stic/i]) assert.ok(!filasDeAdmin({ esOwner: true }).some(x => fuera.test(x.key + x.label)), 'fuera de la primera versión: ' + fuera) })
  await prueba('iniciales de la organización para la tarjeta: «Iglesia Áncora» → «IA»', async () => { assert.equal(inicialesDeOrg('Iglesia Áncora'), 'IA'); assert.equal(inicialesDeOrg('Áncora'), 'A'); assert.equal(inicialesDeOrg('  '), '?'); assert.equal(inicialesDeOrg('una iglesia muy grande'), 'UI') })
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
