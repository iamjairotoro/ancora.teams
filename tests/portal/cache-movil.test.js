// Caché de datos del teléfono (en memoria) y esqueleto de carga. Correr: `node tests/portal/cache-movil.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const C = require(resolver(path.join(RAIZ, 'lib/cache/datosMovil')))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

correr(async () => {
  await prueba('la clave lleva persona Y rol (sin distinguir mayúsculas); sin persona no hay clave ni caché', async () => {
    assert.equal(C.claveDeCache(' Ana@X.cl ', 'admin', 'r'), 'ana@x.cl|admin|r'); assert.notEqual(C.claveDeCache('a@x.cl', 'admin', 'r'), C.claveDeCache('a@x.cl', 'lider', 'r'))
    assert.equal(C.claveDeCache(null, 'admin', 'r'), null); assert.equal(C.leerCache(null), null); C._reiniciarCache(); assert.equal(C.guardarCache(null, 1, 0), false) })
  await prueba('guardar y leer; otra persona no ve lo de la primera', async () => {
    C._reiniciarCache(); const a = C.claveDeCache('a@x.cl', 'admin', 'r'), b = C.claveDeCache('b@x.cl', 'admin', 'r')
    assert.ok(C.guardarCache(a, [1], C.generacionActual())); assert.deepEqual(C.leerCache(a), [1]); assert.equal(C.leerCache(b), null) })
  await prueba('invalidar vacía todo, avisa a quien escucha y una respuesta que estaba en vuelo NO se guarda', async () => {
    C._reiniciarCache(); const k = C.claveDeCache('a@x.cl', 'admin', 'r'); let avisos = 0; const off = C.alCambiarCache(() => avisos++)
    C.guardarCache(k, [1], C.generacionActual()); const desde = C.generacionActual(); C.invalidarCache()
    assert.equal(C.leerCache(k), null); assert.equal(avisos, 1); assert.equal(C.guardarCache(k, [2], desde), false, 'respuesta anterior a la escritura: descartada'); assert.equal(C.leerCache(k), null)
    off(); C.invalidarCache(); assert.equal(avisos, 1, 'quien se desuscribió no recibe más'); C.limpiarCache(); assert.equal(C.leerCache(k), null) })
  await prueba('qué cuenta como escritura: POST/PUT/PATCH/DELETE a Supabase REST, storage o /api/; las lecturas, el login y las rpc de solo consulta no', async () => {
    const S = 'https://x.supabase.co/rest/v1/'
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'patch']) assert.ok(C.peticionEscribe(m, S + 'services'), m)
    assert.ok(C.peticionEscribe('POST', '/api/portal/cambiar-convocatoria')); assert.ok(C.peticionEscribe('POST', 'https://app.cl/api/x')); assert.ok(C.peticionEscribe('POST', 'https://x.supabase.co/storage/v1/object/a'))
    assert.ok(C.peticionEscribe('POST', S + 'rpc/cambiar_convocatoria'), 'una rpc desconocida cuenta como escritura')
    assert.ok(!C.peticionEscribe('GET', S + 'services')); assert.ok(!C.peticionEscribe(undefined, '/api/admin/servicios-resumen')); assert.ok(!C.peticionEscribe('POST', 'https://x.supabase.co/auth/v1/token'))
    for (const r of ['is_org_admin', 'is_any_team_leader', 'team_blocks_in_range', 'blocked_others_summary', 'get_algo']) assert.ok(!C.peticionEscribe('POST', S + 'rpc/' + r), r) })
  await prueba('sin localStorage ni sessionStorage en la caché; solo el teléfono la usa (el hook solo corre con `activo`, y los dos llamadores lo activan solo en teléfono)', async () => {
    const c = sinComentarios(leer('lib/cache/datosMovil.ts')), h = sinComentarios(leer('components/home/useResumenServicios.ts'))
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(c + h)); assert.ok(/if \(!clave\) return/.test(h) && /if \(!activo \|\| persona === null\) return/.test(h))
    assert.ok(/useResumenServicios\(listaMovil, gate\.status === 'ready' \? gate\.email : null\)/.test(leer('app/admin/page.tsx')) && /const listaMovil = tab==='setlist' && telefono===true/.test(leer('app/admin/page.tsx')))
    assert.ok(/useResumenServicios\(viewerIsAdmin && telefono === true, gate\.status === 'ready' \? gate\.email : null\)/.test(leer('app/home/page.tsx'))) })
  await prueba('el hook: clave con persona y rol «admin»; muestra lo cacheado con `actualizando` y siempre vuelve a pedir; cierre de sesión y cambio de usuario vacían la caché', async () => {
    const h = sinComentarios(leer('components/home/useResumenServicios.ts'))
    assert.ok(/claveDeCache\(persona, 'admin', 'servicios-resumen'\)/.test(h)); assert.ok(/actualizando: true/.test(h)); assert.ok(/fetch\('\/api\/admin\/servicios-resumen', \{ cache: 'no-store' \}\)/.test(h))
    assert.ok(/guardarCache\(clave, servicios, desde\)/.test(h)); assert.ok(/alCambiarCache\(/.test(h)); assert.ok(/onAuthStateChange/.test(h))
    const c = sinComentarios(leer('lib/cache/datosMovil.ts')); assert.ok(/evento === 'SIGNED_OUT' \|\| \(ultimo !== undefined && usuario !== ultimo\)/.test(c)) })
  await prueba('el esqueleto: sin texto visible, «Cargando» oculto + aria-busy, retraso de 150 ms, brillo solo con transform/opacity, quieto con «reducir movimiento», medidas de la ficha real', async () => {
    const t = leer('components/servicio-movil/EsqueletoLista.tsx'), css = sinComentarios(leer('components/servicio-movil/esqueleto.module.css'))
    assert.ok(/aria-busy="true"/.test(t) && /cargandoOculto/.test(t)); const marcado = sinComentarios(t).replace(/\{[^{}]*\}/g, '{}'); assert.ok(!/>[^<>{}=();]*[A-Za-zÁÉÍÓÚáéíóúñ]{3,}[^<>{}=();]*</.test(marcado), 'ningún texto literal entre etiquetas')
    assert.ok(/ficha\.abrir/.test(t) && /ficha\.superior/.test(t) && /ficha\.dia/.test(t) && /ficha\.cuerpo/.test(t) && /ficha\.nombre/.test(t) && /ficha\.extras/.test(t), 'usa las clases de la ficha real')
    assert.ok(/animation:aparece \.2s ease-out 150ms forwards/.test(css)); assert.ok(/@keyframes brillo\{ to\{ transform:translateX\(100%\); \} \}/.test(css)); assert.ok(/prefers-reduced-motion: reduce/.test(css) && /animation:none/.test(css))
    assert.ok(/px \* var\(--esc, 1\)/.test(css), 'medidas × --esc') })
  await prueba('Servicios admin y Home admin usan el esqueleto en lugar de «Cargando…»; el punto «actualizando» no lleva texto visible', async () => {
    const l = sinComentarios(leer('components/servicio-movil/ListaServicios.tsx')), hm = sinComentarios(leer('components/home/HomeAdminMovil.tsx'))
    assert.ok(/<EsqueletoLista seccion \/>/.test(l) && !/T\.cargando\}/.test(l)); assert.ok(/<EsqueletoLista filas=\{2\} \/>/.test(hm) && !/Cargando…/.test(hm))
    const p = sinComentarios(leer('components/servicio-movil/PuntoActualizando.tsx')); assert.ok(/role="status"/.test(p) && /aria-label=\{T\.actualizando\}/.test(p) && !/>[^<{]+</.test(p.replace(/<i [^>]*\/>/, ''))) })
  await prueba('el envoltorio de fetch: deja pasar todo sin tocarlo (mismos argumentos, misma promesa), solo observa las escrituras, y se quita (con la sesión y la caché) cuando ya nadie lo usa', async () => {
    C._reiniciarCache(); const llamadas = []; const rechazo = new Error('red')
    const original = (u, i) => { llamadas.push([u, i]); return u.includes('falla') ? Promise.reject(rechazo) : Promise.resolve({ ok: true, u }) }
    global.window = { fetch: original }; let bajas = 0, altas = 0
    const baja1 = C.usarInvalidacion(() => { altas++; return () => { bajas++ } }); assert.ok(C.invalidacionInstalada()); assert.notEqual(window.fetch, original, 'instalado')
    const k = C.claveDeCache('a@x.cl', 'admin', 'r'); C.guardarCache(k, [1], C.generacionActual())
    const init = { cache: 'no-store' }; const r = await window.fetch('/api/admin/servicios-resumen', init); assert.equal(r.u, '/api/admin/servicios-resumen'); assert.equal(llamadas[0][1], init, 'mismos argumentos')
    assert.deepEqual(C.leerCache(k), [1], 'una lectura GET no toca la caché'); await window.fetch('https://x.supabase.co/rest/v1/services', { method: 'GET' }); assert.deepEqual(C.leerCache(k), [1])
    await window.fetch('https://x.supabase.co/auth/v1/token', { method: 'POST' }); assert.deepEqual(C.leerCache(k), [1], 'login: no cuenta')
    await window.fetch('/api/algo', { method: 'POST' }); assert.equal(C.leerCache(k), null, 'una escritura descarta la caché')
    await assert.rejects(window.fetch('/api/falla', { method: 'POST' }), e => e === rechazo, 'el error original llega tal cual')
    C.guardarCache(k, [2], C.generacionActual()); baja1()
    const baja2 = C.usarInvalidacion(() => { altas++; return () => { bajas++ } }); assert.equal(altas, 1, 'cambiar de pantalla (desmontar y montar) no reinstala'); baja2()
    assert.ok(C.invalidacionInstalada(), 'dentro de la gracia sigue puesto'); await new Promise(r => setTimeout(r, C.GRACIA_DESINSTALAR_MS + 200))
    assert.ok(!C.invalidacionInstalada()); assert.equal(window.fetch, original, 'fetch vuelve a ser el original'); assert.equal(bajas, 1, 'se dejó de escuchar la sesión'); assert.equal(C.leerCache(k), null, 'la caché se vació')
    const antes = llamadas.length; await window.fetch('/api/x', { method: 'POST' }); assert.equal(llamadas.length, antes + 1); delete global.window })
  await prueba('si otro envolvió fetch después, al quitarse el nuestro queda inerte y no pisa al otro', async () => {
    C._reiniciarCache(); const original = () => Promise.resolve(1); global.window = { fetch: original }
    const baja = C.usarInvalidacion(); const nuestro = window.fetch; const ajeno = (...a) => nuestro(...a); window.fetch = ajeno; baja(); await new Promise(r => setTimeout(r, C.GRACIA_DESINSTALAR_MS + 200))
    assert.equal(window.fetch, ajeno, 'no se pisa al otro'); const k = C.claveDeCache('a@x.cl', 'admin', 'r'); C.guardarCache(k, [1], C.generacionActual()); await window.fetch('/api/x', { method: 'POST' }); assert.deepEqual(C.leerCache(k), [1], 'inerte: ya no observa'); delete global.window })
  await prueba('en escritorio y tablet nunca se instala: el hook solo llama si hay clave (activo) y los dos llamadores activan solo con ≤768 px', async () => {
    const h = sinComentarios(leer('components/home/useResumenServicios.ts')); assert.ok(/const clave = activo \? claveDeCache/.test(h) && /if \(!clave\) return/.test(h)); assert.ok(/return \(\) => \{ baja\(\); soltar\(\) \}/.test(h), 'al desactivarse se suelta')
    assert.ok(!/usarInvalidacion|instalarInvalidacion/.test(sinComentarios(leer('app/layout.tsx')) + sinComentarios(leer('lib/AuthGateContext.tsx')) + sinComentarios(leer('lib/supabase.ts')))) })
  terminar()
})
