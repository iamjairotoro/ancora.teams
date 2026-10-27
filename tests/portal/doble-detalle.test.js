// El detalle del servicio con DOS (o más) convocatorias, en teléfono (Doble-A a Doble-D): una tarjeta por equipo, la confirmada arriba, la declinada por conflicto apagada, la ventana al confirmar, y el escritorio sin cambios.
// Se dibuja el componente de verdad (react-dom/server). Correr: `node tests/portal/doble-detalle.test.js`
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
Module._extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', path.join(b, 'index.tsx')]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup } = require(path.join(RAIZ, 'node_modules/react-dom/server'))
const Doble = require(path.join(RAIZ, 'app/portal/_components/servicio/ConvocatoriasDoble.tsx')).default
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

const S1 = { id: 's1', fecha: '2026-11-01', hora_inicio: '10:00:00', hora_fin: '14:00:00', tipo: 'servicio' }
const e = (id, team, status, pos, extra = {}, inv = {}) => ({ service: S1, team: { id: team, name: team === 'tA' ? 'Alabanza' : 'Producción', color: team === 'tA' ? 'rosa' : 'cobalto' }, posiciones: pos, cerrada: false, reemplazadaPor: null,
  invitation: { id, status, token: 't' + id, sent_at: '2026-10-01', declined_reason: null, needs_reassignment_confirm: false, ...inv }, ...extra })
const c = { ocupado: false, aviso: null, errorRespuesta: null, hoja: null, responder() {}, pedirConfirmar() {}, pedirCambiar() {}, pedirAceptarAqui() {}, pedirQuitar() {}, pedirDeclinar() {}, confirmarHoja() {}, cancelarHoja() {} }
const dibujar = entradas => renderToStaticMarkup(React.createElement(Doble, { entradas, c }))
const cuenta = (h, re) => (h.match(re) || []).length

correr(async () => {
  await prueba('dos convocatorias sin responder: el aviso, una tarjeta por equipo con sus posiciones y un par de botones cada una (Doble-A)', async () => {
    const h = dibujar([e('a', 'tA', 'pendiente', ['Bass']), e('p', 'tP', 'pendiente', ['Sonido'])])
    assert.ok(h.includes('Estás convocado en dos equipos para este servicio. Al confirmar uno, el otro se declina automáticamente.')); assert.equal(cuenta(h, /<li /g), 2); assert.ok(h.indexOf('Alabanza') < h.indexOf('Producción'))
    assert.ok(h.includes('Bass') && h.includes('Sonido')); assert.equal(cuenta(h, /aria-label="Confirmo en /g), 2); assert.equal(cuenta(h, /aria-label="No puedo en /g), 2); assert.equal(cuenta(h, /Sin responder/g), 2) })
  await prueba('confirmada + declinada por conflicto: la confirmada arriba y grande, la otra apagada con «Se declinó porque confirmaste otro equipo» y solo el botón «Cambiar» (no es un rechazo) (Doble-B)', async () => {
    const h = dibujar([e('a', 'tA', 'confirmado', ['Bass']), e('p', 'tP', 'declinado', ['Sonido'], { reemplazadaPor: { id: 'tA', name: 'Alabanza' } }, { declined_reason: 'conflict' })])
    assert.ok(h.includes('Confirmado')); assert.ok(h.includes('Se declinó porque confirmaste otro equipo')); assert.equal(cuenta(h, /<button/g), 1, 'ni «Confirmo» ni «No puedo»: solo «Cambiar» (migración 038)'); assert.ok(h.includes('aria-label="Cambiar a Producción"')); assert.ok(!h.includes('aria-label="Confirmo'))
    assert.ok(h.indexOf('class="tarjeta ok"') >= 0 || /tarjeta ok/.test(h), 'la confirmada va como tarjeta grande'); assert.ok(/tarjeta apagada/.test(h)); assert.ok(h.indexOf('Alabanza') < h.indexOf('Producción')); assert.ok(!h.includes('Estás convocado en dos equipos'), 'sin aviso cuando ya no queda nada por responder'); assert.ok(!/Dijiste que no puedes/.test(h), 'no se dice que rechazó') })
  await prueba('confirmada + rechazo voluntario: «Dijiste que no puedes» y «Confirmo» para cambiar de idea; una cerrada no lleva botones; varias posiciones del mismo equipo = una tarjeta «Bass · Voces» (Doble-D)', async () => {
    const h = dibujar([e('a', 'tA', 'confirmado', []), e('p', 'tP', 'declinado', ['Sonido'])])
    assert.ok(h.includes('Dijiste que no puedes')); assert.equal(cuenta(h, /aria-label="Confirmo en Producción"/g), 1)
    const cerr = dibujar([{ ...e('a', 'tA', 'pendiente', ['Bass']), cerrada: true }, { ...e('p', 'tP', 'pendiente', ['Sonido']), cerrada: true }]); assert.equal(cuenta(cerr, /aria-label="Confirmo/g), 0); assert.ok(/No respondiste/.test(cerr))
    const mismo = dibujar([e('a', 'tA', 'pendiente', ['Bass', 'Voces']), e('p', 'tP', 'declinado', ['Sonido'], {}, { declined_reason: 'conflict' })]); assert.ok(mismo.includes('Bass · Voces')); assert.equal(cuenta(mismo, /aria-label="Confirmo en Alabanza"/g), 1, 'un solo par de botones para las dos posiciones') })
  await prueba('el cableado: el detalle solo dibuja varias tarjetas en teléfono y con 2 o más; «Confirmo» avisa solo en teléfono; las ventanas dicen a qué equipo se confirma, cuál se declina y la regla del cruce', async () => {
    const s = leer('app/portal/_components/servicio/Servicio.tsx'), u = leer('app/portal/_components/convocatorias/useConvocatorias.ts'), h = leer('app/portal/_components/convocatorias/HojaDeConvocatoria.tsx'), a = leer('app/portal/_components/convocatorias/AccionesConvocatoria.tsx'), p = leer('app/portal/_components/PortalApp.tsx')
    assert.ok(/const doble = telefono && !!entradas && esDoble\(entradas\)/.test(s)); assert.ok(/doble \? <ConvocatoriasDoble entradas=\{entradas!\} c=\{conv\} \/>/.test(s)); assert.ok(/const puedeVer = doble \? !!entradaConfirmada\(entradas!\)/.test(s), 'con una confirmada se desbloquea el orden')
    assert.ok(/avisarAlConfirmar: telefonoYa/.test(p) && /convocatoriasDelServicio\(services as any\[\], entradaServicio\.service\.id\)/.test(p)); assert.ok(/ultimo\.current\.avisarAlConfirmar \? aDeclinar\(entrada as never, todas\) : \[\]/.test(u), 'el escritorio confirma directo'); assert.ok(/if \(!declina\.length\) \{ void responder\(entrada, 'si'\); return \}/.test(u))
    assert.ok(/cruce: textoDelCruce\(entrada as never, declina\)/.test(u)); assert.ok(/h\?\.tipo === 'confirmar'/.test(h) && /TD\.confirmarTexto\(h\.declina\)/.test(h) && /\{h\.cruce && <p>\{h\.cruce\}<\/p>\}/.test(h)); assert.equal((a.match(/c\.pedirConfirmar\(entrada\)/g) || []).length, 2, 'los dos «Confirmo» pasan por pedirConfirmar'); assert.ok(!/c\.responder\(entrada, 'si'\)/.test(a)) })
  terminar()
})
