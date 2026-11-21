// La tira de días del Home en teléfono (prototipo docs/mockups/index.html): reglas puras (días, puntos, acciones por persona, cuerpo del bloqueo, quién bloqueó con el recorte del líder), el flujo elegir día → bloquear → quitar bloqueo,
// la tarjeta dibujada de verdad (react-dom/server) y que el desplazamiento sea el nativo del navegador. Sin base de datos. Correr: `node tests/portal/tira-dias.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const T = require(resolver(path.join(RAIZ, 'lib/home/tira')))
const PanelDia = require(path.join(RAIZ, 'components/home/PanelDia.tsx')).default
const PanelDiaUsuario = require(path.join(RAIZ, 'app/portal/_components/inicio/PanelDiaUsuario.tsx')).default
const crudo = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), leer = f => crudo(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const HOY = '2026-11-19'

correr(async () => {
  await prueba('los días de la tira: dos semanas atrás y unos cuatro meses adelante; hoy una vez, los pasados marcados y «Diciembre» en el día 1', async () => {
    const d = T.diasDeLaTira(HOY); assert.equal(d.length, 14 + 120 + 1); assert.equal(d[0].fecha, '2026-11-05'); assert.equal(d[d.length - 1].fecha, '2027-03-19')
    assert.equal(d.filter(x => x.esHoy).length, 1); assert.equal(d.find(x => x.esHoy).fecha, HOY); assert.ok(d.filter(x => x.pasado).every(x => x.fecha < HOY) && d.filter(x => x.pasado).length === 14)
    assert.equal(d.find(x => x.fecha === '2026-12-01').mesNuevo, 'Diciembre'); assert.equal(d.filter(x => x.mesNuevo).length, 4); assert.deepEqual(d.slice(0, 3).map(x => x.dia), ['jue', 'vie', 'sáb']); assert.deepEqual(T.diasDeLaTira('mal'), [])
    assert.ok(T.enLaTira('2026-11-05', HOY) && !T.enLaTira('2026-11-04', HOY) && T.enLaTira('2027-03-19', HOY) && !T.enLaTira('2027-03-20', HOY)); assert.equal(T.tituloDelDia(HOY), 'Jueves 19 de noviembre'); assert.equal(T.nombreDelMes('2026-12-05'), 'Diciembre') })
  await prueba('el punto: azul servicio, ámbar bloqueada; quien mira su agenda ve primero su bloqueo; administración y líderes, primero el servicio', async () => {
    const p = T.puntoDelDia
    assert.equal(p({ servicio: true, bloqueado: false, prioridad: 'bloqueo' }), 'servicio'); assert.equal(p({ servicio: false, bloqueado: true, prioridad: 'bloqueo' }), 'bloqueado'); assert.equal(p({ servicio: true, bloqueado: true, prioridad: 'bloqueo' }), 'bloqueado'); assert.equal(p({ servicio: false, bloqueado: false, prioridad: 'bloqueo' }), null)
    assert.equal(p({ servicio: true, bloqueado: true, prioridad: 'servicio' }), 'servicio'); assert.equal(p({ servicio: false, bloqueado: true, prioridad: 'servicio' }), 'bloqueado') })
  await prueba('lo que puede hacer cada persona en un día: bloquear solo lo propio, solo hacia adelante y si no está bloqueado; quitar solo lo propio; el aviso al líder solo si hay servicio y bloqueo', async () => {
    const a = T.accionesDelDia, base = { hayServicio: false, pasado: false, bloqueado: false, esPropio: true, hayDestino: true }
    assert.deepEqual(a(base), { abrir: false, bloquear: true, quitar: false, avisoLider: false, sinServicio: true })
    assert.deepEqual(a({ ...base, hayServicio: true }), { abrir: true, bloquear: true, quitar: false, avisoLider: false, sinServicio: false })
    assert.deepEqual(a({ ...base, bloqueado: true }), { abrir: false, bloquear: false, quitar: true, avisoLider: false, sinServicio: true })
    assert.deepEqual(a({ ...base, hayServicio: true, bloqueado: true }), { abrir: true, bloquear: false, quitar: true, avisoLider: true, sinServicio: false })
    assert.equal(a({ ...base, pasado: true }).bloquear, false, 'no se bloquea un día que ya pasó'); assert.equal(a({ ...base, pasado: true, bloqueado: true }).quitar, true, 'un bloqueo pasado sí se puede quitar')
    const otro = a({ ...base, esPropio: false, hayServicio: true, bloqueado: true }); assert.equal(otro.bloquear, false); assert.equal(otro.quitar, false); assert.equal(otro.avisoLider, false); assert.equal(a({ ...base, hayServicio: true, hayDestino: false }).abrir, false) })
  await prueba('el bloqueo propio sale de las filas que ya existen: una fila sin equipo = todos; una por equipo; «Solo …» si faltan equipos; el motivo es uno solo por fecha', async () => {
    const f = (o) => ({ blocked_date: '2026-11-20', reason: 'Viaje', ...o })
    assert.deepEqual(T.bloqueoDeLaFecha([f({ team_id: null })], '2026-11-20', 2), { motivo: 'Viaje', equipoIds: null, parcial: false })
    assert.deepEqual(T.bloqueoDeLaFecha([f({ team_id: 'a' }), f({ team_id: 'b' })], '2026-11-20', 2), { motivo: 'Viaje', equipoIds: ['a', 'b'], parcial: false })
    assert.deepEqual(T.bloqueoDeLaFecha([f({ team_id: 'a' })], '2026-11-20', 2), { motivo: 'Viaje', equipoIds: ['a'], parcial: true }); assert.equal(T.bloqueoDeLaFecha([f({ team_id: 'a' })], '2026-11-20', 1).parcial, false)
    assert.equal(T.bloqueoDeLaFecha([f({ team_id: null })], '2026-11-21', 2), null); assert.equal(T.bloqueoDeLaFecha([{ service: { fecha: '2026-11-22' }, team_id: null }], '2026-11-22', 1).motivo, '')
    assert.deepEqual(Array.from(T.diasConBloqueo([f({}), { service: { fecha: '2026-11-25' } }])).sort(), ['2026-11-20', '2026-11-25']) })
  await prueba('el cuerpo del bloqueo es el de /api/portal/bloqueos: un día, todos sus equipos (sin teamIds), motivo escrito > chip, máximo 500; quitar manda la fecha; los rangos siguen en Disponibilidad', async () => {
    assert.deepEqual(T.cuerpoDeBloqueo('2026-11-20', 'Viaje'), { date: '2026-11-20', reason: 'Viaje' }); assert.ok(!('teamIds' in T.cuerpoDeBloqueo('2026-11-20', '')), 'sin teamIds = todos'); assert.ok(!('startDate' in T.cuerpoDeBloqueo('2026-11-20', '')), 'un solo día'); assert.deepEqual(T.cuerpoDeQuitar('2026-11-20'), { date: '2026-11-20' })
    assert.equal(T.motivoFinal('Trabajo', ''), 'Trabajo'); assert.equal(T.motivoFinal('Trabajo', '  Cita médica '), 'Cita médica'); assert.equal(T.motivoFinal('', '   '), ''); assert.equal(T.motivoFinal('', 'x'.repeat(600)).length, 500); assert.deepEqual([...T.MOTIVOS_RAPIDOS], ['Trabajo', 'Familia', 'Viaje', 'Estudios'])
    const ruta = leer('app/api/portal/bloqueos/route.ts'); assert.ok(/b\.date \|\| b\.startDate/.test(ruta) && /b\.reason\.length > 500/.test(ruta) && /b\.teamIds != null/.test(ruta), 'el cuerpo coincide con lo que valida la ruta') })
  await prueba('flujo: elegir un día libre → bloquear → el día queda bloqueado (punto ámbar, motivo) → quitar bloqueo → vuelve a quedar libre; con las mismas filas que guarda la base', async () => {
    let filas = [], dia = '2026-11-20'; const estado = () => T.bloqueoDeLaFecha(filas, dia, 2)
    assert.equal(estado(), null); assert.equal(T.accionesDelDia({ hayServicio: false, pasado: false, bloqueado: false, esPropio: true, hayDestino: true }).bloquear, true)
    const post = T.cuerpoDeBloqueo(dia, T.motivoFinal('Viaje', '')); const guardadas = [{ blocked_date: post.date, team_id: null, reason: post.reason }]      // lo que devuelve la ruta
    filas = T.reemplazarFecha(filas, dia, guardadas); assert.equal(estado().motivo, 'Viaje'); assert.equal(T.puntoDelDia({ servicio: false, bloqueado: T.diasConBloqueo(filas).has(dia), prioridad: 'bloqueo' }), 'bloqueado'); assert.equal(T.accionesDelDia({ hayServicio: false, pasado: false, bloqueado: true, esPropio: true, hayDestino: true }).quitar, true)
    filas = T.reemplazarFecha(filas, dia, []); assert.equal(estado(), null); assert.equal(filas.length, 0)
    filas = [{ blocked_date: '2026-11-21', team_id: 'a' }]; filas = T.reemplazarFecha(filas, dia, guardadas); assert.equal(filas.length, 2, 'reemplazar una fecha no toca las otras') })
  await prueba('quién bloqueó (administración y líder): el líder solo ve filas de SU equipo y la frase «Bloqueó {su equipo}»; la administración ve todos los equipos y «Disponible en…»; una persona sin equipo solo la ve la administración', async () => {
    const filas = [{ member_id: 'm1', team_id: 't1', blocked_date: HOY, reason: 'Trabajo' }, { member_id: 'm1', team_id: 't2', blocked_date: HOY, reason: 'Trabajo' }, { member_id: 'm2', team_id: 't2', blocked_date: HOY, reason: null }, { member_id: 'm3', team_id: null, blocked_date: HOY, reason: null }, { member_id: 'm4', team_id: 't1', blocked_date: '2026-11-20', reason: 'Otro día' }]
    const personas = [{ id: 'm1', nombre: 'Ana', apellido: 'Paz' }, { id: 'm2', nombre: 'Beto' }, { id: 'm3', nombre: 'Cami' }, { id: 'm4', nombre: 'Dani' }], equipos = [{ id: 't1', name: 'Alabanza' }, { id: 't2', name: 'Producción' }]
    const equiposDe = m => ({ m1: ['t1', 't2'], m2: ['t2', 't1'], m3: [] })[m] || []
    const admin = T.quienBloqueo({ filas, fecha: HOY, viewer: { kind: 'admin' }, personas, equipos, equiposDe }), lider = T.quienBloqueo({ filas, fecha: HOY, viewer: { kind: 'leader', teamIds: new Set(['t1']) }, personas, equipos })
    assert.deepEqual(admin.map(x => x.nombre), ['Ana Paz', 'Beto', 'Cami']); assert.equal(admin[0].frase, 'Bloqueó todos sus equipos'); assert.deepEqual(admin[0].motivos, ['Trabajo']); assert.equal(admin[1].frase, 'Bloqueó Producción. Disponible en Alabanza.'); assert.equal(admin[2].frase, 'Sin equipo')
    assert.deepEqual(lider.map(x => x.nombre), ['Ana Paz'], 'el líder de Alabanza solo ve a quien bloqueó Alabanza'); assert.equal(lider[0].frase, 'Bloqueó Alabanza'); assert.ok(!/Producción|Disponible|todos sus equipos/.test(JSON.stringify(lider)), 'nada de otros equipos')
    assert.deepEqual(T.quienBloqueo({ filas, fecha: '2026-11-30', viewer: { kind: 'admin' }, personas, equipos }), []); assert.deepEqual(Array.from(T.fechasConBloqueoVisible(filas, { kind: 'admin' })).sort(), [HOY, '2026-11-20']); assert.deepEqual(Array.from(T.fechasConBloqueoVisible(filas, { kind: 'leader', teamIds: new Set(['t1']) })).sort(), [HOY, '2026-11-20'])
    assert.deepEqual(Array.from(T.fechasConBloqueoVisible(filas, { kind: 'leader', teamIds: new Set(['t9']) })), [], 'un líder de otro equipo no ve ninguna fecha') })

  // ── la tarjeta dibujada ──
  const dibujar = p => renderToStaticMarkup(React.createElement(PanelDia, p))
  const ev = { servicioId: 's1', equipoId: 't1', nombre: 'Servicio Ancora', detalle: '10:00 – 14:00 · Tu equipo: Alabanza', estado: 'Por responder', estadoAmbar: true, extras: [] }
  const acc = (o = {}) => T.accionesDelDia({ hayServicio: false, pasado: false, bloqueado: false, esPropio: true, hayDestino: true, ...o })
  await prueba('tarjeta con servicio: hora, tu equipo, estado y «Abrir servicio»; si además se puede bloquear, el segundo botón es «Bloquear esta fecha»', async () => {
    const h = dibujar({ fecha: '2026-11-22', esHoy: false, pasado: false, eventos: [ev], acciones: acc({ hayServicio: true }) })
    for (const x of ['Domingo 22 de noviembre', 'Servicio Ancora', '10:00 – 14:00 · Tu equipo: Alabanza', 'Por responder', 'Abrir servicio', 'Bloquear esta fecha']) assert.ok(h.includes(x), 'falta ' + x); assert.ok(!h.includes('No hay servicio'))
    assert.ok(h.indexOf('Abrir servicio') < h.indexOf('Bloquear esta fecha'), 'abrir va primero'); assert.ok(/estado estadoAmbar/.test(h), 'el estado que pide algo va en ámbar') })
  await prueba('tarjeta sin servicio: «No hay servicio este día» y «Bloquear esta fecha»; un día pasado no ofrece bloquear', async () => {
    const h = dibujar({ fecha: HOY, esHoy: true, pasado: false, eventos: [], acciones: acc() }); assert.ok(h.includes('No hay servicio este día.') && h.includes('Bloquear esta fecha') && h.includes('Hoy') && !h.includes('Abrir servicio'))
    const p = dibujar({ fecha: '2026-11-10', esHoy: false, pasado: true, eventos: [], acciones: acc({ pasado: true }) }); assert.ok(!p.includes('Bloquear esta fecha') && p.includes('ya pasó')) })
  await prueba('tarjeta con bloqueo: «Fecha bloqueada», el motivo y «Quitar bloqueo»; sin motivo dice «Sin motivo»; si hay servicio avisa que hay que hablar con el líder; un bloqueo de algunos equipos lo dice', async () => {
    const h = dibujar({ fecha: '2026-11-20', esHoy: false, pasado: false, eventos: [], acciones: acc({ bloqueado: true }), bloqueo: { motivo: 'Viaje', soloEquipos: null } })
    assert.ok(h.includes('Fecha bloqueada') && h.includes('Motivo: Viaje') && h.includes('Quitar bloqueo') && !h.includes('Bloquear esta fecha') && !h.includes('habla con tu líder'))
    const s = dibujar({ fecha: '2026-11-22', esHoy: false, pasado: false, eventos: [ev], acciones: acc({ hayServicio: true, bloqueado: true }), bloqueo: { motivo: '', soloEquipos: 'Alabanza' } })
    assert.ok(s.includes('Motivo: Sin motivo') && s.includes('Solo Alabanza') && s.includes('Hay un servicio este día: habla con tu líder.') && s.includes('Abrir servicio') && s.includes('Quitar bloqueo')) })
  await prueba('administración y líder: la tarjeta muestra quién bloqueó (y «Nadie bloqueó esta fecha.»), sin botones de bloquear ni quitar', async () => {
    const q = [{ memberId: 'm1', nombre: 'Ana Paz', frase: 'Bloqueó Alabanza', motivos: ['Trabajo'] }]
    const h = dibujar({ fecha: HOY, esHoy: true, pasado: false, eventos: [], acciones: T.accionesDelDia({ hayServicio: false, pasado: false, bloqueado: false, esPropio: false, hayDestino: true }), quienes: q })
    assert.ok(h.includes('Quién bloqueó esta fecha') && h.includes('Ana Paz') && h.includes('Bloqueó Alabanza') && h.includes('Motivo: Trabajo') && !h.includes('Bloquear esta fecha') && !h.includes('Quitar bloqueo'))
    assert.ok(dibujar({ fecha: HOY, esHoy: true, pasado: false, eventos: [], acciones: T.accionesDelDia({ hayServicio: false, pasado: false, bloqueado: false, esPropio: false, hayDestino: true }), quienes: [] }).includes('Nadie bloqueó esta fecha.')) })
  await prueba('la tarjeta del usuario (con sus datos): su servicio sale solo si lo convocaron; sus bloqueos de la base; si los bloqueos no cargaron no ofrece bloquear y lo dice con «Reintentar»', async () => {
    const entrada = { service: { id: 's1', fecha: '2026-11-22', tipo: 'servicio', titulo: 'Servicio Ancora', hora_inicio: '10:00:00', hora_fin: '14:00:00' }, team: { id: 't1', name: 'Alabanza', color: 'cobalto' }, invitation: { status: 'pending', sent_at: '2026-11-10T10:00:00Z' }, posiciones: ['Voces'] }
    const eq = [{ id: 't1', name: 'Alabanza', color: 'cobalto' }]
    const dib = (fecha, entradas, bloqueos) => renderToStaticMarkup(React.createElement(PanelDiaUsuario, { fecha, hoy: HOY, entradas, token: null, bloqueos, onFilas() {}, onRecargar() {}, onAbrirServicio() {} }))
    const ok = { filas: [], equipos: eq, estado: 'ok' }
    const con = dib('2026-11-22', [entrada], ok); assert.ok(con.includes('Servicio Ancora') && con.includes('Tu equipo: Alabanza') && con.includes('Abrir servicio') && con.includes('Bloquear esta fecha'))
    assert.ok(dib('2026-11-23', [], ok).includes('No hay servicio este día.'))
    const bl = dib('2026-11-22', [entrada], { ...ok, filas: [{ blocked_date: '2026-11-22', team_id: null, reason: 'Familia' }] }); assert.ok(bl.includes('Motivo: Familia') && bl.includes('Quitar bloqueo') && bl.includes('habla con tu líder'))
    const mal = dib('2026-11-23', [], { filas: [], equipos: [], estado: 'error' }); assert.ok(!mal.includes('Bloquear esta fecha') && mal.includes('No pudimos cargar tus bloqueos.') && mal.includes('Reintentar'))
    const cargando = dib('2026-11-23', [], { filas: [], equipos: [], estado: 'cargando' }); assert.ok(!cargando.includes('Bloquear esta fecha') && !cargando.includes('Quitar bloqueo')) })

  // ── la tira ──
  const tira = leer('components/home/TiraDias.tsx'), css = leer('components/home/tira-dias.module.css'), hoja = leer('components/home/HojaBloqueo.tsx'), usuario = leer('app/portal/_components/inicio/PanelDiaUsuario.tsx'), admin = leer('components/home/HomeAdminMovil.tsx'), page = leer('app/home/page.tsx')
  const regla = sel => { const m = new RegExp('(^|\\n|\\})\\s*' + sel.replace(/[.\[\]]/g, '\\$&') + '\\{').exec(css); if (!m) throw new Error('falta ' + sel); const i = m.index + m[0].length; return css.slice(i, css.indexOf('}', i)) }
  await prueba('el desplazamiento táctil es el NATIVO (overflow-x, sin páginas ni snap); el arrastre con inercia solo para mouse y lápiz (pointerType ≠ touch)', async () => {
    assert.ok(/overflow-x:auto/.test(regla('.tira')) && /touch-action:pan-x pan-y/.test(regla('.tira')) && /overscroll-behavior-x:contain/.test(regla('.tira')) && !/scroll-snap/.test(css), 'overflow nativo, sin snap'); assert.ok(/mask-image:linear-gradient\(90deg, transparent/.test(regla('.tira')), 'los bordes se desvanecen')
    assert.ok(/e\.pointerType === 'touch' \|\| e\.button !== 0\) return/.test(tira), 'el toque no pasa por el arrastre de JavaScript'); assert.ok(!/touchstart|touchmove|onTouch/.test(tira), 'sin eventos de toque'); assert.ok(/requestAnimationFrame\(paso\)/.test(tira) && /vel \*= 0\.94/.test(tira), 'inercia del prototipo')
    assert.ok(/hover:hover\) and \(pointer:fine\)[^}]*cursor:grab/.test(css), 'el cursor de arrastre solo con mouse') })
  await prueba('el día: píldora con letra arriba, número y punto; hoy con aro, pasados apagados, elegido en tinta y un poco más grande; transform y opacidad con la curva del prototipo (~320 ms); sin animar nada con reduced-motion', async () => {
    assert.ok(!/--curva/.test(css), 'la curva y las duraciones ya no son propias de la tira: salen de los tokens (M4)'); assert.ok(/transform var\(--anc-dur-screen\) var\(--anc-ease-drawer\)/.test(regla('.pildora')) && /animation:tira-entra var\(--anc-dur-screen\) var\(--anc-ease-drawer\)/.test(regla('.tarjetaIn[data-animar]')) && !/\d(ms|s)\b/.test(css.replace(/@media[^{]*\{[^}]*\}/g, '').replace(/[\d.]+(px|rem|em)/g, '')), 'ninguna duración suelta en la tira'); assert.ok(/transform:scale\(1\.1\)/.test(regla('.elegido .pildora')) && /background:var\(--anc-accent\)/.test(regla('.elegido .pildora'))); assert.ok(/inset 0 0 0 calc\(1\.5px/.test(regla('.hoy .pildora'))); assert.ok(/background:var\(--anc-sunk\)/.test(regla('.pasado .pildora')))
    assert.ok(/background:var\(--anc-modo-ink\)/.test(regla('.servicio')) && /background:var\(--anc-pe\)/.test(regla('.bloqueado')), 'azul servicio, ámbar bloqueada'); assert.ok(/prefers-reduced-motion:reduce\)\{\s*\.tarjetaIn\[data-animar\]\{ animation:tira-fundido var\(--anc-dur-reduced\) linear !important; \}/.test(css), 'con reducir movimiento la tarjeta solo hace un fundido de --anc-dur-reduced')
    assert.ok(/min-height:max\(44px/.test(regla('.btn')) && /min-height:max\(44px/.test(regla('.chip')) && /width:max\(44px/.test(regla('.pildora')), 'zonas táctiles de 44'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css.replace(/mask-image:[^;]*;/g, '')), 'solo tokens de color (el #000 de la máscara solo da transparencia)') })
  await prueba('la tarjeta no tiene alto mínimo y anima su alto (--anc-dur-screen, 280 ms) al cambiar de día o de estado; tocar un día lo centra con scroll suave (sin movimiento con reduced-motion)', async () => {
    assert.ok(!/min-height/.test(regla('.tarjeta')) && !/min-height/.test(regla('.tarjetaIn')), 'sin alto mínimo'); assert.ok(/transition:height var\(--anc-dur-screen\) var\(--anc-ease-drawer\)/.test(regla('.tarjeta')) && /overflow:hidden/.test(regla('.tarjeta')))
    assert.ok(/prefers-reduced-motion: reduce/.test(tira) && /behavior: suave && !menosMovimiento\(\) \? 'smooth' : 'auto'/.test(tira)); assert.ok(/if \(h0 === null \|\| h0 === h1 \|\| menosMovimiento\(\)\)/.test(tira) && /setTimeout\(\(\) => \{ o\.style\.height = '' \}, msDeToken\('--anc-dur-screen', 280\) \+ 100\)/.test(tira)) })
  await prueba('el chip del mes abre el mes completo para saltar a otra fecha; una fecha fuera de la tira lo dice y no cambia nada', async () => {
    assert.ok(/aria-haspopup="dialog"/.test(tira) && /<HojaInferior abierta=\{mesAbierto\} etiqueta=\{T\.hojaMesTitulo\}/.test(tira) && /mesDe\(mesVisto\.anio, mesVisto\.mes, hoy\)/.test(tira)); assert.ok(/if \(!enLaTira\(fecha, hoy\)\) \{ setNota\(T\.fueraDeRango\); return \}/.test(tira)) })
  await prueba('las hojas: respetan la zona segura, se cierran con Escape o el velo, el foco entra y vuelve, y suben sobre el teclado; el aviso «Tu motivo lo ven los líderes de tu equipo»', async () => {
    const h = leer('components/home/HojaInferior.tsx'); assert.ok(/e\.key === 'Escape'/.test(h) && /onClick=\{onCerrar\}/.test(h) && /useTecladoHoja\(ref, p\.montado\)/.test(h) && /aria-modal="true"/.test(h) && /volverA/.test(h)); assert.ok(/--safe-bottom, env\(safe-area-inset-bottom/.test(regla('.hoja')))
    assert.ok(/T\.hojaBloqueoAviso/.test(hoja) && require(resolver(path.join(RAIZ, 'lib/textos/tiraDias'))).TEXTOS_TIRA.hojaBloqueoAviso === 'Tu motivo lo ven los líderes de tu equipo.'); assert.ok(/MOTIVOS_RAPIDOS\.map/.test(hoja) && /maxLength=\{MOTIVO_MAXIMO\}/.test(hoja) && /if \(!ok\) setFallo\(true\)/.test(hoja), 'si falla, la hoja sigue abierta con el aviso') })
  await prueba('datos: el usuario usa /api/portal/bloqueos (POST de un día sin teamIds, DELETE por fecha) con las filas de PortalApp; nada de tablas ni rutas nuevas; el administrador y el líder solo leen (team_blocks_in_range, ya recortado por rol)', async () => {
    assert.ok(/portalFetch\(token, '\/api\/portal\/bloqueos', \{ method: 'POST'/.test(usuario) && /method: 'DELETE'/.test(usuario) && /cuerpoDeBloqueo\(fecha, motivo\)/.test(usuario) && /cuerpoDeQuitar\(fecha\)/.test(usuario)); assert.ok(!/teamIds/.test(usuario), 'sin elegir equipos: eso es de Disponibilidad')
    assert.ok(!/portalFetch|fetch\(|supabase/.test(admin) && /p\.quienBloqueo\(f\)/.test(admin) && /esPropio: false/.test(admin), 'el panel del admin no escribe'); assert.ok(/quienBloqueo\(\{ filas: dateBlocks, fecha, viewer,/.test(page) && /fechasConBloqueoVisible\(dateBlocks, viewer\)/.test(page))
    assert.ok(!fs.existsSync(path.join(RAIZ, 'app/api/portal/bloqueos-dia')), 'sin rutas nuevas') })
  await prueba('el calendario mensual de Servicios queda como estaba (el de Disponibilidad también: en M2 solo cambió la animación de sus hojas, ver hojas-movimiento.test.js); el escritorio del Inicio y del Home no cambia', async () => {
    const cambiados = require('child_process').spawnSync('git', ['diff', '--name-only', 'pre-tira-dias-dev-2026-11-19', '--', 'app/portal/_components/servicios', 'app/portal/_components/servicio', 'components/home/Home.tsx', 'components/home/calendario-home.module.css', 'components/home/CalendarioHome.tsx', 'lib/home/calendario.ts'], { cwd: RAIZ, encoding: 'utf8' })
    if (cambiados.status === 0) assert.equal(cambiados.stdout.trim(), '', 'no se tocó:\n' + cambiados.stdout)
    const ini = leer('app/portal/_components/inicio/Inicio.tsx'); assert.ok(/if \(telefono\) return <InicioTelefono /.test(ini) && /<Destacado /.test(ini) && /semanaActual\(hoy\)/.test(ini)); assert.ok(/telefono \? homeMovil : <Home \{\.\.\.homeProps\} \/>/.test(page)) })
  terminar()
})
