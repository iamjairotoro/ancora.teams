// Personas: ¿se abre un perfil solo? (bug de octubre 2026: Personas > Equipos > Personas abría el perfil de la primera persona). Aquí: las reglas puras (lib/admin/personaEnUrl.ts), los RECORRIDOS en teléfono
// simulados con esas mismas funciones y las pestañas reales (urlConPestana), y que PersonasList las use. El recorrido en el navegador (390 px) se corre aparte. Correr: `node tests/portal/personas-perfil.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const { urlAlSeleccionar, alMontarLista } = real('lib/admin/personaEnUrl'), { urlConPestana } = real('lib/admin/urlPestana')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const BASE = 'http://x.test', IDS = ['m1', 'm2', 'm3']

// Un teléfono/escritorio de juguete que usa EXACTAMENTE las funciones de la app: la lista se monta (selecciona la primera o la pedida, escribe o no la URL, abre el cajón al entrar), se cambia de vista (desmonta y
// vuelve a montar), se navega por el menú (urlConPestana). `entradas` cuenta lo que se EMPUJARÍA al historial: la app solo usa replaceState, así que debe quedar en 0.
function aparato(anchoFijo, urlInicial) {
  const a = { url: BASE + urlInicial, cajon: null, entradas: 0,
    montarLista() {
      const m = alMontarLista({ href: a.url, ids: IDS, anchoFijo }); const pedida = new URL(a.url).searchParams.get('person'), seleccionada = pedida && IDS.includes(pedida) ? pedida : IDS[0]
      const nueva = urlAlSeleccionar(a.url, seleccionada, anchoFijo); if (nueva) a.url = BASE + nueva
      a.cajon = m.abrirCajon; if (m.urlNueva) a.url = BASE + m.urlNueva },
    ir(tab) { const n = urlConPestana(a.url, tab); if (n) a.url = BASE + n; a.cajon = null },
    cerrarCajon() { a.cajon = null },                                  // «‹ Personas»: cierra el cajón; no toca la URL ni el historial
    pedida: () => new URL(a.url).searchParams.get('person') }
  return a
}

correr(async () => {
  console.log('las reglas')
  await prueba('con cajón (teléfono y tablet) la selección por defecto NO se escribe en la URL; con la ficha fija (≥ 1024 px) sí, como siempre; sin medir tampoco', async () => {
    assert.equal(urlAlSeleccionar(BASE + '/admin?tab=personas', 'm1', false), null); assert.equal(urlAlSeleccionar(BASE + '/admin?tab=personas', 'm1', null), null)
    assert.equal(urlAlSeleccionar(BASE + '/admin?tab=personas', 'm1', true), '/admin?tab=personas&person=m1'); assert.equal(urlAlSeleccionar(BASE + '/admin?tab=personas&person=m1', 'm2', true), '/admin?tab=personas&person=m2'); assert.equal(urlAlSeleccionar(BASE + '/admin?tab=personas&person=m1', 'm1', true), null, 'sin cambios → null'); assert.equal(urlAlSeleccionar(BASE + '/admin?tab=personas&person=m1', null, true), '/admin?tab=personas') })
  await prueba('al montar con cajón, un ?person= existente abre ESA persona y se quita de la URL; uno que no existe solo se quita; con ficha fija o sin medir no se toca nada', async () => {
    assert.deepEqual(alMontarLista({ href: BASE + '/admin?tab=personas&person=m3', ids: IDS, anchoFijo: false }), { abrirCajon: 'm3', urlNueva: '/admin?tab=personas' })
    assert.deepEqual(alMontarLista({ href: BASE + '/admin?tab=personas&person=zz', ids: IDS, anchoFijo: false }), { abrirCajon: null, urlNueva: '/admin?tab=personas' }); assert.deepEqual(alMontarLista({ href: BASE + '/admin?tab=personas', ids: IDS, anchoFijo: false }), { abrirCajon: null, urlNueva: null })
    assert.deepEqual(alMontarLista({ href: BASE + '/admin?tab=personas&person=m3', ids: IDS, anchoFijo: true }), { abrirCajon: null, urlNueva: null }); assert.deepEqual(alMontarLista({ href: BASE + '/admin?tab=personas&person=m3', ids: IDS, anchoFijo: null }), { abrirCajon: null, urlNueva: null })
    assert.equal(alMontarLista({ href: BASE + '/admin?tab=personas&person=m3&vista=equipos', ids: IDS, anchoFijo: false }).urlNueva, '/admin?tab=personas&vista=equipos', 'los demás parámetros se conservan') })

  console.log('los recorridos en teléfono')
  await prueba('Personas > Equipos > Personas: se ve el listado, NINGÚN perfil abierto, la URL sin person= y cero entradas extra en el historial', async () => {
    const t = aparato(false, '/admin?tab=personas'); t.montarLista(); assert.equal(t.cajon, null, 'al entrar no hay perfil'); assert.equal(t.pedida(), null, 'la primera persona no se escribe en la URL')
    t.montarLista()   // «Equipos» desmonta la lista y volver a «Personas» la monta otra vez
    assert.equal(t.cajon, null, 'Equipos > Personas NO abre ningún perfil'); assert.equal(t.pedida(), null); assert.equal(t.entradas, 0) })
  await prueba('menú inferior > Personas (venga de donde venga) muestra el listado sin abrir ningún perfil; también tras haber visto un perfil', async () => {
    const t = aparato(false, '/admin?tab=setlist&servicio=s1'); t.ir('personas'); t.montarLista(); assert.equal(t.cajon, null); assert.equal(t.pedida(), null)
    t.ir('setlist'); t.ir('personas'); t.montarLista(); assert.equal(t.cajon, null, 'otra vez por el menú: listado')
    const u = aparato(false, '/admin?tab=personas&person=m2'); u.montarLista(); assert.equal(u.cajon, 'm2'); u.cerrarCajon(); u.ir('canciones'); u.ir('personas'); u.montarLista(); assert.equal(u.cajon, null, 'tras ver un perfil y volver por el menú: listado') })
  await prueba('un enlace con person= explícito (por ejemplo desde Home) abre ese perfil; «atrás» (‹ Personas) vuelve al listado; volver a montar la lista no lo reabre; sin entradas extra', async () => {
    const t = aparato(false, '/admin?tab=personas&person=m3'); t.montarLista(); assert.equal(t.cajon, 'm3', 'abre ese perfil'); assert.equal(t.pedida(), null, 'el enlace ya cumplió: se quitó de la URL')
    t.cerrarCajon(); assert.equal(t.cajon, null, 'atrás: el listado'); t.montarLista(); assert.equal(t.cajon, null, 'Equipos > Personas después de cerrar: no se reabre'); assert.equal(t.entradas, 0)
    const h = aparato(false, '/admin?tab=personas&person=m1'); h.montarLista(); assert.equal(h.cajon, 'm1', 'también si la pedida es la primera') })
  await prueba('ESCRITORIO sin cambios: con la ficha fija la primera persona (o la pedida) queda seleccionada y escrita en la URL, nunca abre el cajón, y se conserva al volver a montar', async () => {
    const t = aparato(true, '/admin?tab=personas'); t.montarLista(); assert.equal(t.pedida(), 'm1', 'selección por defecto en la URL (intencional)'); assert.equal(t.cajon, null); t.montarLista(); assert.equal(t.pedida(), 'm1'); assert.equal(t.cajon, null)
    const u = aparato(true, '/admin?tab=personas&person=m3'); u.montarLista(); assert.equal(u.pedida(), 'm3'); assert.equal(u.cajon, null); assert.equal(u.entradas, 0) })

  console.log('el componente')
  await prueba('PersonasList usa esas dos funciones, escribe la URL solo con replaceState (nunca push) y ya no tiene su propia escritura de ?person=', async () => {
    const c = leer('components/PersonasList.tsx')
    assert.ok(/urlAlSeleccionar\(window\.location\.href, effectiveId, wide\)/.test(c)); assert.ok(/alMontarLista\(\{ href: window\.location\.href, ids: members\.map\(m => m\.id\), anchoFijo: wide \}\)/.test(c)); assert.ok(/if \(abrirCajon\) open\(abrirCajon, \{ backLabel: 'Personas' \}\)/.test(c))
    assert.ok(!/pushState|router\.(push|replace)|function writePersonToUrl/.test(c), 'solo replaceState'); assert.equal((c.match(/history\.replaceState/g) || []).length, 2); assert.ok(!/searchParams\.set\('person'/.test(c)) })
  await prueba('«Home» sigue abriendo a una persona con ?tab=personas&person=<id> (el enlace que esta regla respeta)', async () => {
    assert.ok(/router\.push\(`\/admin\?tab=personas&person=\$\{personId\}`\)/.test(fs.readFileSync(path.join(RAIZ, 'app/home/page.tsx'), 'utf8'))) })
  terminar()
})
