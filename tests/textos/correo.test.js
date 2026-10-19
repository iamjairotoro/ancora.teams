// Errores sin jerga (commit «textos y errores», parte 5): lo que ve quien administra al fallar un correo o un envío no nombra variables, servicios ni tablas; el detalle técnico
// sale solo por la consola y sin claves; los textos antiguos guardados se muestran con el de ahora; `?tab=ajustes` ya no es una pestaña. Correr: `node tests/textos/correo.test.js`.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://prueba.invalid'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'prueba'      // lib/addToTeam trae el cliente del navegador; sin red ni claves reales
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('../portal/_banco')
const path = require('path'), fs = require('fs')
const carga = r => require(resolver(path.join(RAIZ, r)))
const { CORREO, textoFalloDeEnvio, textoSinConexionDeEnvio, textoFalloDeAccion } = carga('lib/textos/correo')
const { GUARDADO } = carga('lib/textos/correoGuardado')
const { procesarDestinatario, estadoCorreoParaGuardar } = carga('lib/convocatoria')
const { motivoDeError, enviarCorreo, limpiarMotivo } = carga('lib/email')
const { crearValidadorCorreo } = carga('lib/emailDominio')
const { problemaDeCorreo, traducirMotivoAntiguo } = carga('lib/problemasCorreo')
const { textoResumen } = carga('lib/convocatoriaTypes')
const { dbErrorText } = carga('lib/addToTeam')
const { pestanaInicial, VALID_TABS } = carga('lib/admin/pestanas')
const { archivosDeInterfaz, lineas } = require('./_fuentes')

const JERGA = /vercel|gmail_|smtp|supabase|servidor de correo|variable|contraseña de aplicación|migraci[oó]n|bucket|team_admins|\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b|\bEAUTH\b|\bdominio\b|payload|endpoint|\btoken\b/i
const textosDe = o => Object.values(o).flatMap(v => typeof v === 'string' ? [v] : typeof v === 'function' ? [v('ejemplo.cl')] : [])

// captura de console.error durante `fn`
async function espiando(fn) { const orig = console.error, vistos = []; console.error = (...a) => { vistos.push(a.map(String).join(' ')) }; try { await fn() } finally { console.error = orig } return vistos }

correr(async () => {
  console.log('los textos')
  await prueba('ningún texto de CORREO nombra variables, servicios, tablas ni códigos', async () => {
    const malos = textosDe(CORREO).filter(t => JERGA.test(t)); assert.deepEqual(malos, [])
    assert.ok(textosDe(CORREO).length >= 20) })
  await prueba('motivoDeError: cada tipo de falla del envío da una frase de persona, sin el mensaje del sistema', async () => {
    const casos = [[{ code: 'EAUTH' }, CORREO.accesoRechazado], [{ responseCode: 535, message: '535-5.7.8 Username and Password not accepted' }, CORREO.accesoRechazado], [{ response: '550 5.4.5 Daily user sending limit exceeded' }, CORREO.limiteDiario],
      [{ code: 'EENVELOPE', response: 'No recipients defined' }, CORREO.direccionRechazada], [{ code: 'ECONNECTION' }, CORREO.sinConexion], [{ code: 'ETIMEDOUT' }, CORREO.sinConexion], [{ message: 'Error: socket hang up RAW 0xDEADBEEF' }, CORREO.noSePudoEnviar], [undefined, CORREO.noSePudoEnviar]]
    for (const [e, esperado] of casos) { const m = motivoDeError(e); assert.equal(m, esperado); assert.ok(!JERGA.test(m), m); assert.ok(!/0xDEADBEEF|socket|Username/.test(m)) } })
  await prueba('el límite diario dice «Se alcanzó el límite de correos de hoy. Vuelve a intentarlo más tarde.»', async () => { assert.equal(CORREO.limiteDiario, 'Se alcanzó el límite de correos de hoy. Vuelve a intentarlo más tarde.') })
  await prueba('«Se enviaron N correos» con 0, 1 y N, con «falló» y «omitido» concordados', async () => {
    const r = (enviados, fallaron = 0, omitidos = 0) => textoResumen({ enviados, fallaron, omitidos })
    assert.equal(r(0), 'Se enviaron 0 correos'); assert.equal(r(1), 'Se envió 1 correo'); assert.equal(r(5), 'Se enviaron 5 correos')
    assert.equal(r(3, 1, 1), 'Se enviaron 3 correos · 1 falló · 1 omitido'); assert.equal(r(3, 2, 4), 'Se enviaron 3 correos · 2 fallaron · 4 omitidos') })

  console.log('el detalle técnico va solo a la consola, sin claves')
  const SECRETO = 'SECRETO_ABCD1234efgh'
  process.env.GMAIL_APP_PASSWORD = SECRETO
  const transporte = sendMail => ({ t: { sendMail }, remitente: 'Prueba <a@b.test>' })
  await prueba('un envío que falla devuelve la frase de persona y escribe el detalle en la consola, recortado y sin la clave', async () => {
    let r; const logs = await espiando(async () => { r = await enviarCorreo({ to: 'x@y.test', subject: 's', html: 'h' }, transporte(async () => { const e = new Error(`535 Username and Password not accepted ${SECRETO} detalle largo`); e.code = 'EAUTH'; e.responseCode = 535; throw e })) })
    assert.deepEqual(r, { ok: false, motivo: CORREO.accesoRechazado, guardado: GUARDADO.accesoRechazado }); assert.ok(logs.length >= 1, 'debe quedar rastro en la consola'); assert.ok(/EAUTH/.test(logs.join(' ')))
    assert.ok(!JSON.stringify(r).includes(SECRETO) && !logs.join(' ').includes(SECRETO), 'la clave no sale ni en pantalla ni en la consola') })
  await prueba('una dirección que el servidor no acepta: frase de persona y rastro en la consola', async () => {
    let r; const logs = await espiando(async () => { r = await enviarCorreo({ to: 'x@y.test', subject: 's', html: 'h' }, transporte(async () => ({ accepted: [], rejected: ['x@y.test'] }))) })
    assert.deepEqual(r, { ok: false, motivo: CORREO.direccionNoAceptada, guardado: GUARDADO.noAceptada }); assert.ok(logs.length >= 1) })
  await prueba('un envío que sale bien no escribe nada en la consola', async () => {
    let r; const logs = await espiando(async () => { r = await enviarCorreo({ to: 'x@y.test', subject: 's', html: 'h' }, transporte(async () => ({ accepted: ['x@y.test'], rejected: [] }))) })
    assert.deepEqual(r, { ok: true }); assert.deepEqual(logs, []) })
  await prueba('sin la cuenta de correo configurada: frase de persona (sin nombrar variables) y las variables solo en la consola', async () => {
    const u = process.env.GMAIL_USER, p = process.env.GMAIL_APP_PASSWORD; delete process.env.GMAIL_USER; delete process.env.GMAIL_APP_PASSWORD
    let r; const logs = await espiando(async () => { r = await enviarCorreo({ to: 'x@y.test', subject: 's', html: 'h' }) })
    if (u !== undefined) process.env.GMAIL_USER = u; process.env.GMAIL_APP_PASSWORD = p
    assert.deepEqual(r, { ok: false, motivo: CORREO.sinConfigurar, guardado: GUARDADO.sinConfigurar }); assert.ok(/GMAIL_USER/.test(logs.join(' ')), 'el nombre de las variables queda en la consola') })
  await prueba('limpiarMotivo sigue sin dejar pasar la clave y ya no inventa «Error desconocido»', async () => {
    assert.ok(!limpiarMotivo(`falla con ${SECRETO}`).includes(SECRETO)); assert.equal(limpiarMotivo(''), CORREO.noSePudoEnviar) })

  console.log('la dirección del correo')
  await prueba('el validador dice «no existe» / «no recibe correo» / «no se pudo comprobar» sin hablar de dominios ni DNS', async () => {
    const err = code => Object.assign(new Error(code), { code })
    const v = async (mx, a4 = async () => { throw err('ENODATA') }) => crearValidadorCorreo({ resolveMx: mx, resolve4: a4, resolve6: async () => { throw err('ENODATA') } }, 60)('ana@ejemplo.cl')
    const noExiste = await v(async () => { throw err('ENOTFOUND') }); assert.equal(noExiste.estado, 'bloqueado'); assert.equal(noExiste.motivo, CORREO.dominioNoExiste('ejemplo.cl'))
    const nulo = await v(async () => [{ exchange: '', priority: 0 }]); assert.equal(nulo.motivo, CORREO.dominioNoRecibe('ejemplo.cl'))
    const sinMx = await v(async () => { throw err('ENODATA') }); assert.equal(sinMx.motivo, CORREO.dominioNoRecibe('ejemplo.cl'))
    const falla = await v(async () => { throw err('ESERVFAIL') }); assert.equal(falla.estado, 'no_validado'); assert.equal(falla.motivo, CORREO.noSePudoComprobar)
    const lento = await v(() => new Promise(() => {})); assert.equal(lento.motivo, CORREO.noSePudoComprobarATiempo)
    for (const t of [noExiste, nulo, sinMx, falla, lento]) assert.ok(!JERGA.test(t.motivo.replace(/«ejemplo\.cl»/g, '')), t.motivo)
    assert.deepEqual([noExiste, nulo, sinMx, falla, lento].map(t => t.guardado), [GUARDADO.dominioNoExiste('ejemplo.cl'), GUARDADO.dominioNoRecibe('ejemplo.cl'), GUARDADO.dominioSinServidor('ejemplo.cl'), GUARDADO.noSePudoValidar, GUARDADO.noSePudoValidarATiempo], 'lo que se guarda es el texto técnico de siempre') })

  console.log('textos guardados antes de este cambio')
  await prueba('traducirMotivoAntiguo: los textos técnicos de antes se muestran con el de ahora; lo desconocido pasa igual; vacío da null', async () => {
    const viejos = [['El servidor de correo rechazó el usuario o la contraseña de aplicación (revisar GMAIL_USER y GMAIL_APP_PASSWORD en Vercel).', CORREO.accesoRechazado], ['Falta configurar el correo del servidor (GMAIL_USER y GMAIL_APP_PASSWORD).', CORREO.sinConfigurar],
      ['Gmail alcanzó el límite diario de envíos; reintentar más tarde.', CORREO.limiteDiario], ['El servidor de correo rechazó la dirección. 550 5.1.1 no such user', CORREO.direccionRechazada], ['No se pudo conectar con el servidor de correo; reintentar en un momento.', CORREO.sinConexion],
      ['El servidor de correo no aceptó la dirección.', CORREO.direccionNoAceptada], ['Error desconocido', CORREO.noSePudoEnviar], ['El dominio ejemplo.cl declara que no recibe correo.', CORREO.dominioNoRecibe('ejemplo.cl')], ['El dominio ejemplo.cl no existe.', CORREO.dominioNoExiste('ejemplo.cl')],
      ['El dominio ejemplo.cl no tiene servidor de correo.', CORREO.dominioNoRecibe('ejemplo.cl')], ['No se pudo validar el dominio.', CORREO.noSePudoComprobar], ['No se pudo validar el dominio (tardó demasiado).', CORREO.noSePudoComprobarATiempo],
      ['Error inesperado al enviar; revisá el estado de la invitación.', CORREO.errorInesperado], ['Error inesperado al enviar; revisa el estado de la invitación.', CORREO.errorInesperado]]
    for (const [antes, despues] of viejos) assert.equal(traducirMotivoAntiguo(antes), despues, antes)
    assert.equal(traducirMotivoAntiguo('Buzón lleno'), 'Buzón lleno'); assert.equal(traducirMotivoAntiguo(''), null); assert.equal(traducirMotivoAntiguo(null), null) })
  await prueba('el globo del problema de correo traduce el texto guardado (y el de la última respuesta)', async () => {
    const p = problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló', errorGuardado: 'Gmail alcanzó el límite diario de envíos; reintentar más tarde.' }); assert.equal(p.motivo, CORREO.limiteDiario)
    const q = problemaDeCorreo({ email: 'a@b.test', ultimo: { estado: 'falló', motivo: 'El dominio x.cl no existe.', push: 'no aplica' } }); assert.equal(q.motivo, CORREO.dominioNoExiste('x.cl'))
    const r = problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló', errorGuardado: 'Buzón lleno' }); assert.equal(r.motivo, 'Buzón lleno') })

  console.log('lo que se guarda en email_error')
  await prueba('lo GUARDADO es el texto técnico de siempre (no el de persona) y se TRADUCE solo al mostrar; la persona ve la frase en pantalla', async () => {
    const err = (props, mensaje = 'x') => async () => { throw Object.assign(new Error(mensaje), props) }
    const casos = [
      [err({ code: 'EAUTH' }), 'El servidor de correo rechazó el usuario o la contraseña de aplicación (revisar GMAIL_USER y GMAIL_APP_PASSWORD en Vercel).', CORREO.accesoRechazado],
      [err({ responseCode: 535 }), 'El servidor de correo rechazó el usuario o la contraseña de aplicación (revisar GMAIL_USER y GMAIL_APP_PASSWORD en Vercel).', CORREO.accesoRechazado],
      [err({ response: '550 5.4.5 Daily user sending limit exceeded' }), 'Gmail alcanzó el límite diario de envíos; reintentar más tarde.', CORREO.limiteDiario],
      [err({ code: 'EENVELOPE', response: 'No recipients defined' }), 'El servidor de correo rechazó la dirección. No recipients defined', CORREO.direccionRechazada],
      [err({ code: 'ECONNECTION' }), 'No se pudo conectar con el servidor de correo; reintentar en un momento.', CORREO.sinConexion],
      [async () => ({ accepted: [], rejected: ['x@y.test'] }), 'El servidor de correo no aceptó la dirección.', CORREO.direccionNoAceptada],
    ]
    const orig = console.error; console.error = () => {}
    try {
      for (const [sendMail, tecnico, amable] of casos) {
        const deps = { preparar: async () => ({ subject: 's', html: 'h' }), validar: async () => ({ estado: 'ok' }), push: async () => 'no aplica', enviar: m => enviarCorreo(m, transporte(sendMail)) }
        const r = await procesarDestinatario({ memberId: 'm', nombre: 'Ana', email: 'ana@ejemplo.cl' }, deps)
        assert.equal(r.estado, 'falló'); assert.equal(r.motivo, amable, 'en pantalla, la frase de persona')
        const g = estadoCorreoParaGuardar(r, new Date('2026-10-19T12:00:00Z')); assert.equal(g.email_status, 'falló'); assert.equal(g.email_error, tecnico, 'en la base, el texto técnico original')
        assert.equal(problemaDeCorreo({ email: 'ana@ejemplo.cl', estadoGuardado: g.email_status, errorGuardado: g.email_error }).motivo, amable, 'al mostrar lo guardado, se traduce') }
      // una excepción inesperada
      const r2 = await procesarDestinatario({ memberId: 'm', nombre: 'Ana', email: 'ana@ejemplo.cl' }, { preparar: async () => { throw new Error('boom') }, validar: async () => ({ estado: 'ok' }), push: async () => 'no aplica', enviar: async () => ({ ok: true }) })
      assert.equal(r2.motivo, CORREO.errorInesperado); assert.equal(estadoCorreoParaGuardar(r2).email_error, GUARDADO.errorInesperado); assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló', errorGuardado: GUARDADO.errorInesperado }).motivo, CORREO.errorInesperado)
      // dirección bloqueada por el validador (dominio)
      const dom = crearValidadorCorreo({ resolveMx: async () => { throw Object.assign(new Error('x'), { code: 'ENOTFOUND' }) }, resolve4: async () => [], resolve6: async () => [] }, 60)
      const r3 = await procesarDestinatario({ memberId: 'm', nombre: 'Ana', email: 'ana@ejemplo.cl' }, { preparar: async () => ({ subject: 's', html: 'h' }), validar: dom, push: async () => 'no aplica', enviar: async () => ({ ok: true }) })
      assert.equal(r3.motivo, CORREO.dominioNoExiste('ejemplo.cl')); assert.equal(estadoCorreoParaGuardar(r3).email_error, 'El dominio ejemplo.cl no existe.')
      assert.equal(problemaDeCorreo({ email: 'a@b.test', estadoGuardado: 'falló', errorGuardado: 'El dominio ejemplo.cl no existe.' }).motivo, CORREO.dominioNoExiste('ejemplo.cl'))
    } finally { console.error = orig }
    const fuente = fs.readFileSync(path.join(RAIZ, 'app/api/reassignment-notify/route.ts'), 'utf8'); assert.ok(/email_error: emailSent \? null : emailErrorGuardado/.test(fuente), 'la ruta de reinvitar también guarda el texto técnico') })

  console.log('envíos, base de datos y permisos')
  await prueba('textoFalloDeEnvio / SinConexion / FalloDeAccion: frase de persona y el código solo en la consola', async () => {
    let a, b, c; const logs = await espiando(async () => { a = textoFalloDeEnvio(502, 'invitaciones'); c = textoFalloDeAccion(500) }); b = textoSinConexionDeEnvio('convocatorias')
    assert.equal(a, 'No se pudo completar el envío. Revisa el estado de las invitaciones antes de volver a intentar.'); assert.equal(b, 'No hay conexión. Revisa el estado de las convocatorias antes de volver a intentar.'); assert.equal(c, 'No se pudo completar. Intenta de nuevo.')
    for (const t of [a, b, c]) assert.ok(!/\d{3}|servidor/i.test(t), t); assert.ok(/502/.test(logs.join(' ')) && /500/.test(logs.join(' '))) })
  await prueba('dbErrorText nunca entrega el mensaje de la base: el nuestro, con «Revisa los permisos.» si es de permisos; el de la base, a la consola', async () => {
    let a, b, c; const logs = await espiando(async () => { a = dbErrorText({ code: '23503', message: 'insert or update on table "team_members" violates foreign key constraint' }, 'No se pudo agregar al equipo.'); b = dbErrorText({ code: '42501', message: 'new row violates row-level security policy for table "team_members"' }, 'No se pudo agregar al equipo.'); c = dbErrorText(null, 'No se pudo agregar al equipo.') })
    assert.equal(a, 'No se pudo agregar al equipo.'); assert.equal(b, 'No se pudo agregar al equipo. Revisa los permisos.'); assert.equal(c, 'No se pudo agregar al equipo.'); assert.ok(/team_members/.test(logs.join(' ')), 'el detalle queda en la consola') })

  console.log('ningún texto de usuario nombra migraciones, variables o tablas')
  await prueba('en archivos de interfaz, rutas y librerías: sin «migración», GMAIL_, Vercel, VAPID, bucket, nombres de tablas ni «token» dentro de frases (la consola y los errores de desarrollo quedan fuera)', async () => {
    const TECNICO = /migraci[oó]n|\b(GMAIL\w*|VAPID\w*|Vercel|NEXT_PUBLIC\w*|SUPABASE\w*)\b|\bbuckets?\b|\b(team_admins|team_members|team_positions|team_member_positions|banda_assignments|invitations|service_blocks|organization_members|tool_templates|service_position_slots|push_subscriptions|date_blocks|team_tools|song_attachments|song_sections|song_favorites)\b/
    const malos = []
    for (const f of archivosDeInterfaz().filter(x => x !== 'lib/textos/correoGuardado.ts')) lineas(f).forEach((l, i) => {      // correoGuardado.ts: lo que se guarda en email_error (técnico a propósito; no se muestra tal cual)
      for (const m of l.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) { const t = m[2]; if (!/\s/.test(t) || t.length < 12 || !TECNICO.test(t)) continue
        if (/console\.|throw new Error|\.from\(|\.rpc\(|\.select\(|\.eq\(|\.is\(|\.in\(|\.upsert\(|\.update\(|\.insert\(|\.delete\(|storage|onConflict|EMBED|^\s*(import|export)\b.*from|process\.env/.test(l)) continue
        malos.push(`${f}:${i + 1}  ${l.trim().slice(0, 110)}`) } })
    assert.deepEqual(malos, [], malos.join('\n'))
    const lineasToken = []
    for (const f of archivosDeInterfaz()) lineas(f).forEach((l, i) => { if (/\b(error|message|mensaje|motivo|texto|msg)\s*:\s*(['"`])[^'"`\n]*\btoken\b/i.test(l)) lineasToken.push(`${f}:${i + 1}  ${l.trim().slice(0, 100)}`) })
    assert.deepEqual(lineasToken, [], lineasToken.join('\n')) })

  console.log('?tab=ajustes')
  await prueba('«ajustes» ya no es una pestaña válida: abre la de siempre (Servicio); el enlace viejo ?tab=equipos sigue abriendo Personas', async () => {
    assert.ok(!VALID_TABS.includes('ajustes')); assert.equal(pestanaInicial('ajustes'), 'setlist'); assert.equal(pestanaInicial('equipos'), 'personas'); assert.equal(pestanaInicial('personas'), 'personas'); assert.equal(pestanaInicial('admins'), 'admins')
    for (const raro of [null, undefined, '', 'x', 'AJUSTES']) assert.equal(pestanaInicial(raro), 'setlist')
    const fuente = fs.readFileSync(path.join(RAIZ, 'app/admin/page.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1'); assert.ok(!/ajustes/i.test(fuente), 'app/admin/page.tsx ya no menciona «ajustes»') })
  terminar()
})
