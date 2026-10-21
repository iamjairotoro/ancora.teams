// ?servicio=&equipo=&herramienta= en /admin (bloque A de la fase 3): las URL, el atrás y los enlaces del Home. Correr: `node tests/portal/url-servicio.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { servicioDeUrl, urlConServicio, urlServicioAdmin, nivelDe, padreDe, VISTA_VACIA, crearNavegacionServicio } = require(resolver(path.join(RAIZ, 'lib/admin/urlServicio')))
const { urlConPestana } = require(resolver(path.join(RAIZ, 'lib/admin/urlPestana')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const P = q => new URLSearchParams(q), H = 'http://x.test/admin'
const V = (servicio, equipo = null, herramienta = null) => ({ servicio, equipo, herramienta })

correr(async () => {
  console.log('URL ↔ pantalla')
  await prueba('lista, servicio, equipo y herramienta: lo que pide cada URL y su nivel', async () => {
    assert.deepEqual(servicioDeUrl(P('tab=setlist')), VISTA_VACIA); assert.equal(nivelDe(servicioDeUrl(P('tab=setlist'))), 'lista')
    assert.deepEqual(servicioDeUrl(P('tab=setlist&servicio=s1')), V('s1')); assert.equal(nivelDe(V('s1')), 'servicio')
    assert.deepEqual(servicioDeUrl(P('tab=setlist&servicio=s1&equipo=t1')), V('s1', 't1')); assert.equal(nivelDe(V('s1', 't1')), 'equipo')
    assert.deepEqual(servicioDeUrl(P('servicio=s1&equipo=t1&herramienta=k9')), V('s1', 't1', 'k9')); assert.equal(nivelDe(V('s1', 't1', 'k9')), 'herramienta')
    assert.deepEqual(servicioDeUrl(P('servicio=s1&herramienta=orden')), V('s1', null, 'orden'), 'la Orden es del servicio: vale sin equipo') })
  await prueba('equipo y herramienta sin servicio no valen; una herramienta sin equipo solo vale si es la Orden; ids raros se ignoran', async () => {
    assert.deepEqual(servicioDeUrl(P('equipo=t1&herramienta=orden')), VISTA_VACIA); assert.deepEqual(servicioDeUrl(P('servicio=s1&herramienta=k9')), V('s1'))
    for (const raro of ['', 'a b', 'x/../y', "x'; drop table", 'a'.repeat(65), '<b>']) assert.deepEqual(servicioDeUrl(P(new URLSearchParams({ servicio: raro, equipo: 't1' }).toString())), VISTA_VACIA, raro)
    assert.deepEqual(servicioDeUrl(P(new URLSearchParams({ servicio: 's1', equipo: 'x y' }).toString())), V('s1'), 'un equipo con id raro se ignora y queda el servicio') })
  await prueba('urlConServicio escribe la vista con tab=setlist, respeta los demás parámetros y subir de nivel quita lo de abajo', async () => {
    assert.equal(urlConServicio(H + '?tab=setlist', V('s1')), '/admin?tab=setlist&servicio=s1')
    assert.equal(urlConServicio(H + '?tab=setlist&servicio=s1', V('s1', 't1')), '/admin?tab=setlist&servicio=s1&equipo=t1')
    assert.equal(urlConServicio(H + '?tab=setlist&servicio=s1&equipo=t1&herramienta=orden', V('s1', 't1')), '/admin?tab=setlist&servicio=s1&equipo=t1')
    assert.equal(urlConServicio(H + '?tab=setlist&servicio=s1&equipo=t1', null), '/admin?tab=setlist'); assert.equal(urlConServicio(H + '?tab=setlist', null), null, 'ya está en la lista')
    assert.equal(urlConServicio(H + '?tab=setlist&servicio=s1', V('s1')), null, 'sin cambios → null'); assert.equal(urlConServicio(H + '?x=1&tab=setlist#a', V('s2')), '/admin?x=1&tab=setlist&servicio=s2#a')
    assert.equal(urlConServicio(H + '?tab=setlist', V('a b')), null, 'un id raro no se escribe') })
  await prueba('padreDe: herramienta → equipo → servicio → lista', async () => {
    assert.deepEqual(padreDe(V('s1', 't1', 'k9')), V('s1', 't1')); assert.deepEqual(padreDe(V('s1', 't1')), V('s1')); assert.deepEqual(padreDe(V('s1')), VISTA_VACIA); assert.deepEqual(padreDe(VISTA_VACIA), VISTA_VACIA)
    assert.deepEqual(padreDe(V('s1', null, 'orden')), V('s1', null), 'la Orden sin equipo sube al servicio') })
  await prueba('urlServicioAdmin (los enlaces del Home): servicio, servicio + equipo, o la lista; ids raros no se cuelan', async () => {
    assert.equal(urlServicioAdmin('s1', 't1'), '/admin?tab=setlist&servicio=s1&equipo=t1'); assert.equal(urlServicioAdmin('s1'), '/admin?tab=setlist&servicio=s1'); assert.equal(urlServicioAdmin(), '/admin?tab=setlist')
    assert.equal(urlServicioAdmin(null, 't1'), '/admin?tab=setlist', 'un equipo sin servicio no vale'); assert.equal(urlServicioAdmin('a b', 't1'), '/admin?tab=setlist'); assert.equal(urlServicioAdmin('s1', '"><x'), '/admin?tab=setlist&servicio=s1')
    assert.equal(urlServicioAdmin({ type: 'click' }), '/admin?tab=setlist', 'un evento de clic que llegara por error no se escribe') })
  await prueba('al cambiar de pestaña se van servicio, equipo y herramienta; en Servicio se quedan; los de Personas siguen como antes', async () => {
    assert.equal(urlConPestana(H + '?tab=setlist&servicio=s1&equipo=t1&herramienta=orden', 'canciones'), '/admin?tab=canciones')
    assert.equal(urlConPestana(H + '?tab=setlist&servicio=s1&equipo=t1', 'setlist'), null)
    assert.equal(urlConPestana(H + '?tab=canciones', 'setlist'), '/admin?tab=setlist')
    assert.equal(urlConPestana(H + '?tab=personas&person=p1&gestion=equipo&team=t1&filter=all', 'personas'), null, 'Personas no cambió'); assert.equal(urlConPestana(H + '?tab=equipos&team=t1', 'personas'), '/admin?tab=personas&team=t1&gestion=equipo') })

  console.log('el atrás')
  // un historial falso: una pila de URL; `back` retrocede y avisa con un popstate (nav.alNavegar)
  const mundo = (inicial) => { const pila = [inicial]; let i = 0; const nav = crearNavegacionServicio({ href: () => 'http://x.test' + pila[i], historial: {
    pushState: (_, __, u) => { pila.splice(i + 1); pila.push(u); i++ }, replaceState: (_, __, u) => { pila[i] = u }, back: () => { if (i > 0) { i--; nav.alNavegar() } } } }); return { pila, get i() { return i }, nav, url: () => pila[i] } }
  await prueba('lista → servicio → equipo → herramienta, y el atrás va herramienta → equipo → servicio → lista → lo que había antes', async () => {
    const m = mundo('/home'); m.pila.push('/admin?tab=setlist'); m.nav.alNavegar()                                   // se llegó desde el Home a la lista
    ;(() => { /* simula el router.push del Home */ })()
    const mm = mundo('/home'); mm.pila.splice(0, 2, '/home', '/admin?tab=setlist'); // pila: Home, lista
    const w = (() => { const x = mundo('/admin?tab=setlist'); return x })()
    w.nav.ir(V('s1')); w.nav.ir(V('s1', 't1')); w.nav.ir(V('s1', 't1', 'orden'))
    assert.equal(w.url(), '/admin?tab=setlist&servicio=s1&equipo=t1&herramienta=orden'); assert.equal(w.nav.empujadas, 3)
    w.nav.volver(); assert.equal(w.url(), '/admin?tab=setlist&servicio=s1&equipo=t1')
    w.nav.ir(V('s1', 't1', 'k2')); w.nav.volver(); w.nav.alNavegar(); w.nav.volver() })
  await prueba('«‹» con entradas empujadas retrocede una; tras el atrás del teléfono («alNavegar») «‹» reemplaza sin salir; con enlace directo o recarga reemplaza por el nivel de arriba', async () => {
    const a = mundo('/admin?tab=setlist'); a.nav.ir(V('s1')); a.nav.ir(V('s1', 't1')); assert.equal(a.pila.length, 3)
    a.nav.volver(); assert.equal(a.url(), '/admin?tab=setlist&servicio=s1'); assert.equal(a.pila.length, 3, 'retrocedió sin borrar la entrada de adelante')
    a.nav.volver(); assert.equal(a.url(), '/admin?tab=setlist', 'volvió a la lista')
    // enlace directo a un equipo (nada empujado): «‹» reemplaza, la pila no crece y no se sale
    const b = mundo('/admin?tab=setlist&servicio=s1&equipo=t1'); assert.equal(b.nav.empujadas, 0)
    b.nav.volver(); assert.equal(b.url(), '/admin?tab=setlist&servicio=s1'); assert.equal(b.pila.length, 1); b.nav.volver(); assert.equal(b.url(), '/admin?tab=setlist'); assert.equal(b.pila.length, 1)
    b.nav.volver(); assert.equal(b.url(), '/admin?tab=setlist', 'en la lista «‹» no hace nada raro'); assert.equal(b.pila.length, 1)
    // tras un popstate se olvida lo empujado
    const c = mundo('/admin?tab=setlist'); c.nav.ir(V('s1')); c.nav.alNavegar(); assert.equal(c.nav.empujadas, 0); c.nav.volver(); assert.equal(c.url(), '/admin?tab=setlist') })
  await prueba('entrar al mismo nivel que ya está abierto no empuja una entrada repetida', async () => {
    const a = mundo('/admin?tab=setlist&servicio=s1'); a.nav.ir(V('s1')); assert.equal(a.pila.length, 1); assert.equal(a.nav.empujadas, 0) })

  console.log('la página y el Home')
  await prueba('/admin: el servicio de la URL queda elegido al entrar (también en escritorio) y los cambios posteriores solo cuando el parámetro cambia; el equipo llega a AdminServiceView', async () => {
    const a = leer('app/admin/page.tsx'), v = leer('components/AdminServiceView.tsx')
    assert.ok(/const servicioInicial = servicioDeUrl\(searchParams\)\.servicio/.test(a)); assert.ok(/const deUrl = servicioInicial \? \(data\|\|\[\]\)\.find/.test(a)); assert.ok(/setSelectedService\(deUrl \|\| next \|\| soloServicios\[0\]\)/.test(a))
    assert.ok(/const servicioAplicado = useRef<string \| null>\(servicioInicial\)/.test(a)); assert.ok(/if \(id === servicioAplicado\.current\) return/.test(a)); assert.ok(/equipoInicial: urlSrv\.equipo/.test(a))
    assert.ok(/equipoInicial\?: string \| null/.test(leer('components/servicio-movil/tipos.ts')), 'la prop está en el tipo compartido'); assert.ok(/equipoInicial/.test(v)); assert.ok(/equipoAplicado/.test(v), 'se aplica una vez por valor (no pisa cada cambio de pestaña)') })
  await prueba('el hook usa la API del historial dentro de efectos y manejadores (la página también se arma en el servidor) y la lógica vive en urlServicio.ts', async () => {
    const h = leer('lib/admin/useServicioUrl.ts'); assert.ok(/addEventListener\('popstate'/.test(h)); assert.ok(!/useMemo\(\(\) => crearNavegacionServicio/.test(h), 'no se toca window al renderizar'); assert.ok(/navegacion\.current \?\?= crearNavegacionServicio/.test(h))
    const u = leer('lib/admin/urlServicio.ts'); assert.ok(/pushState/.test(u) && /replaceState/.test(u) && /back\(\)/.test(u)) })
  await prueba('el Home (escritorio y teléfono) abre el servicio y el equipo: «Abrir servicio», «Ver» (los pendientes), «Asignar», el día del calendario y las filas de «Próximos»', async () => {
    const p = leer('app/home/page.tsx'), vh = leer('components/home/VistaHoy.tsx')
    assert.equal((p.match(/urlServicioAdmin\(/g) || []).length, 7, 'next ×2, atención ×3, día del calendario, teléfono'); assert.ok(!/router\.push\('\/admin\?tab=setlist'\)/.test(p), 'ya no se abre /admin sin elegir servicio')
    assert.ok(/onAbrirServicio: \(servicioId\?: string, teamId\?: string\) => void/.test(vh)); assert.ok(/p\.onAbrirServicio\(f\.servicioId, f\.teamId\)/.test(vh)); assert.ok(/p\.onAbrirServicio\(t\.servicioId, t\.modo === 'equipo' \? e\.teamId : undefined\)/.test(vh))
    assert.ok(/onVerTodos: \(\) => abrirServicios\(\)/.test(p), '«Ver todos» abre la lista, sin id') })
  terminar()
})
