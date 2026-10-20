// Estados de error con «Reintentar» (commit «textos y errores», parte 2): una falla de carga se dice, no se confunde con «no hay datos». Aquí, la regla común y que cada pantalla la use;
// la prueba con la falla simulada en el navegador se corre aparte (ver el mensaje del commit). Correr: `node tests/textos/errores-de-carga.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const { fallaEsencial, exigirCarga, textoDeFallaDeCarga, FallaDeCarga } = require(resolver(path.join(RAIZ, 'lib/admin/cargaConError')))
const { TEXTOS } = require(resolver(path.join(RAIZ, 'lib/textos/comun')))
const { sinComentarios } = (() => { const t = r => r.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'); return { sinComentarios: t } })()
const fuente = f => sinComentarios(fs.readFileSync(path.join(RAIZ, f), 'utf8'))

correr(async () => {
  console.log('la regla común')
  await prueba('fallaEsencial: solo cuenta las consultas que devolvieron error (null, vacío y sin error no cuentan)', async () => {
    assert.equal(fallaEsencial(), false); assert.equal(fallaEsencial(null, undefined, {}, { data: [] }, { error: null }), false)
    assert.equal(fallaEsencial({ data: [] }, { error: { message: 'x' } }), true); assert.equal(fallaEsencial({ error: 'boom' }), true) })
  await prueba('exigirCarga lanza FallaDeCarga ante una consulta esencial caída y no hace nada si todas están bien', async () => {
    exigirCarga({ data: [] }, { data: [1] }); assert.throws(() => exigirCarga({ data: [] }, { error: { message: 'no' } }), FallaDeCarga) })
  await prueba('textoDeFallaDeCarga entrega SIEMPRE nuestro texto (nunca el del sistema) y el error real, a la consola', async () => {
    const orig = console.error, vistos = []; console.error = (...a) => vistos.push(a.join(' '))
    let t1, t2; try { t1 = textoDeFallaDeCarga(new Error('TypeError: Failed to fetch'), 'home'); t2 = textoDeFallaDeCarga('boom', 'admin') } finally { console.error = orig }
    assert.equal(t1, 'Revisa tu conexión e intenta de nuevo.'); assert.equal(t2, TEXTOS.revisaConexion); assert.ok(!/fetch|TypeError|boom/i.test(t1 + t2))
    assert.ok(/Failed to fetch/.test(vistos.join(' ')) && /boom/.test(vistos.join(' '))) })

  console.log('cada pantalla la usa')
  await prueba('Home (escritorio y teléfono): las cinco consultas esenciales se exigen y el aviso lleva el texto nuestro, no e.message', async () => {
    const p = fuente('app/home/page.tsx')
    assert.ok(/exigirCarga\(mRes, tRes, tpRes, tmRes, sRes\)/.test(p), 'exige personas, equipos, posiciones, membresías y servicios')
    assert.ok(!/exigirCarga\([^)]*(tmpRes|ttRes|dbRes|rolesRes)/.test(p), 'las secundarias (posiciones por persona, herramientas, bloqueos, roles) siguen tolerantes')
    assert.ok(/setBaseError\(textoDeFallaDeCarga\(e, 'home'\)\)/.test(p)); assert.ok(!/setBaseError\(e\?\.message/.test(p)) })
  await prueba('/admin: las cuatro cargas iniciales son estrictas, las recargas de después son tolerantes, y Personas y Canciones reciben el error', async () => {
    const a = fuente('app/admin/page.tsx')
    assert.ok(/loadServices\(true\), loadMembers\(true\), loadSongs\(true\), loadTeamsAndMemberships\(true\)/.test(a))
    for (const f of ['loadServices', 'loadMembers', 'loadSongs', 'loadTeamsAndMemberships']) assert.ok(new RegExp(`const ${f}\\s+= useCallback\\(async \\(estricto = false\\)`).test(a), f + ' tiene el modo estricto opcional')
    assert.ok(/esencialFallo: fallaEsencial\(teamsRes, posRes, tmRes\)/.test(a), 'equipos, posiciones y membresías son esenciales; secciones, posiciones por persona y herramientas no')
    assert.ok(/setDataError\(textoDeFallaDeCarga\(e, 'admin'\)\)/.test(a) && !/setDataError\(e\?\.message/.test(a))
    assert.ok(/onRefreshMembers=\{\(\) => \{ void loadMembers\(\) \}\}/.test(a), 'recargar tras guardar no lanza ni vacía la lista')
    assert.equal((a.match(/errorCarga=\{dataError\} onReintentarCarga=\{loadAllData\}/g) || []).length, 2) })
  await prueba('Personas, Canciones, Chats y Administradores muestran «No se pudieron cargar …» con «Reintentar» (ErrorDeCarga) en vez de una lista vacía', async () => {
    const casos = [['components/PersonasPanel.tsx', 'No se pudieron cargar las personas'], ['components/TeamPanel.tsx', 'No se pudieron cargar las personas'], ['components/canciones/CancionesPanel.tsx', 'No se pudieron cargar las canciones'],
      ['components/ChatModerationPanel.tsx', 'No se pudieron cargar los mensajes'], ['components/AdminsPanel.tsx', 'No se pudieron cargar los administradores']]
    for (const [f, titulo] of casos) { const t = fuente(f); assert.ok(t.includes(`<ErrorDeCarga titulo="${titulo}"`), f); assert.ok(/onReintentar=/.test(t), f + ' conecta «Reintentar»') }
    const e = fuente('components/ErrorDeCarga.tsx'); assert.ok(e.includes('TEXTOS.reintentar') && e.includes("role=\"alert\"")) })
  await prueba('Personas: ante una falla esencial SIN datos previos avisa; si ya había datos los conserva (una recarga tras guardar no vacía la lista)', async () => {
    const t = fuente('components/TeamPanel.tsx')
    assert.ok(/fallaEsencial\(teamsRes, posRes, tmRes\)/.test(t)); assert.ok(/if \(!yaCargo\.current\) setFallaCarga\(true\)/.test(t)); assert.ok(/yaCargo\.current = true; setFallaCarga\(false\)/.test(t)) })
  await prueba('Portal: si no carga la agenda o el catálogo de canciones, Inicio, Servicios y Canciones dicen «No se pudo cargar…» con «Reintentar» y no el mensaje de «no tienes nada»', async () => {
    const t = fuente('app/portal/_components/PortalApp.tsx')
    assert.ok(/setErrorCarga\('agenda'\)/.test(t) && /setErrorCarga\(p=>p\?\?'canciones'\)/.test(t))
    assert.equal((t.match(/'No se pudo cargar tu agenda\. '\+TEXTOS\.revisaConexion/g) || []).length, 3, 'Inicio, Servicios y Canciones'); assert.equal((t.match(/bloqueError\(/g) || []).length, 3, 'Inicio, Servicios y Canciones lo usan')
    assert.equal((t.match(/setErrorCarga\('agenda'\); setTab\(t=>t==='servicios'\?t:'home'\)/g) || []).length, 2, 'si la agenda no cargó, una pestaña restaurada de Canciones, Chats o Perfil (que sin datos quedarían en blanco) vuelve a Inicio')
    assert.ok(/No se pudieron cargar las canciones\. /.test(t)); assert.ok(/onClick=\{\(\)=>\{ void loadData\(\) \}\}>\{TEXTOS\.reintentar\}/.test(t)) })
  await prueba('Checklist, Cronograma y Notas del Servicio dicen «No se pudo cargar…» con «Reintentar» (y no un panel vacío); la nota no se puede escribir si no se pudo leer', async () => {
    const casos = [['components/ChecklistTool.tsx', 'No se pudo cargar el checklist', 2], ['components/ScheduleTool.tsx', 'No se pudo cargar el cronograma', 1], ['components/FreeTextTool.tsx', 'No se pudieron cargar las notas', 1]]
    for (const [f, titulo, errores] of casos) {
      const s = fuente(f)
      assert.ok(s.includes(`<ErrorDeCarga compacto titulo="${titulo}"`), f)
      assert.ok(/onReintentar=\{\(\) => \{ setLoading\(true\); (loadChecklist|load)\(\) \}\}/.test(s), f + ' conecta «Reintentar» con la carga')
      assert.equal((s.match(/setFalla\(true\)/g) || []).length, errores, f + ': cada consulta esencial que falla activa el aviso')
      assert.ok(/setFalla\(false\)/.test(s), f + ': una carga buena lo quita')
    }
    const n = fuente('components/FreeTextTool.tsx'); assert.ok(n.indexOf('if (falla) return') < n.indexOf('<textarea'), 'la nota con falla de carga no muestra el campo para escribir (guardar encima la pisaría)')
    const c = fuente('components/ChecklistTool.tsx'); assert.ok(/service_checklist_items[\s\S]{0,200}r\.error/.test(c), 'también los ítems del checklist son esenciales')
  })
  terminar()
})
