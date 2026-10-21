// Lista de Servicios en teléfono (bloque A2 de la fase 3): las filas por servicio, lo que dice cada una, el historial y el enlace con la página. Correr: `node tests/portal/lista-servicios.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const { filasProximas, filasHistorial, cuadritosVisibles, HISTORIAL_FILAS } = real('lib/admin/listaServicios')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const eq = (teamId, nombre, o = {}) => ({ teamId, nombre, color: 'cobalto', asignados: 0, convocados: 0, confirmados: 0, rechazos: 0, sinResponder: 0, vacantes: 0, estado: 'convocado', ...o })
const sv = (id, fecha, equipos, o = {}) => ({ id, fecha, titulo: id, horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos, ...o })

const ADMIN = { kind: 'admin' }, LIDER = ids => ({ kind: 'leader', teamIds: new Set(ids) })

correr(async () => {
  console.log('una fila por servicio')
  const lista = [
    sv('Servicio Ancora — domingo 25 octubre 2026', '2026-10-25', [eq('t1', 'Alabanza', { estado: 'sin-convocar', vacantes: 3 }), eq('t2', 'Producción', { estado: 'sin-convocar', vacantes: 1 }), eq('t3', 'Logística', { estado: 'sin-convocar', vacantes: 1 })]),
    sv('Servicio Ancora', '2026-11-01', [eq('t1', 'Alabanza', { estado: 'sin-convocar', vacantes: 3 }), eq('t2', 'Producción', { estado: 'sin-convocar', vacantes: 2 }), eq('t3', 'Logística', { estado: 'sin-convocar', vacantes: 2 })]),
    sv('Ensayo', '2026-11-04', [eq('t1', 'Alabanza', { convocados: 3, confirmados: 1, sinResponder: 2 })], { tipo: 'ensayo', horaInicio: '19:30:00', horaFin: '21:00:00' }),
    ...Array.from({ length: 12 }, (_, i) => sv('p' + i, `2026-10-${String(18 - i).padStart(2, '0')}`, [eq('t1', 'Alabanza', { convocados: 2, confirmados: 2 })], { terminado: true })),
  ]
  await prueba('el mockup Servicios-B: «Servicio Ancora» con A·P·L y «10:00 – 14:00 · Sin convocar · 5 sin cubrir»; el ensayo con solo A y «19:30 – 21:00 · Convocado · 2 sin responder»', async () => {
    const f = filasProximas(lista)
    assert.deepEqual(f.map(x => x.servicioId), ['Servicio Ancora — domingo 25 octubre 2026', 'Servicio Ancora', 'Ensayo'], 'una fila por servicio, no por equipo')
    assert.deepEqual([f[0].diaSemana, f[0].dia, f[0].mes, f[0].cuando], ['dom', '25', 'oct', 'domingo 25 de octubre']); assert.equal(f[0].nombre, 'Servicio Ancora', 'sin la fecha que createService agrega'); assert.deepEqual(f[0].equipos.map(e => e.inicial), ['A', 'P', 'L'])
    assert.deepEqual([f[0].horario, f[0].estado, f[0].ambar], ['10:00 – 14:00', 'Sin convocar', ['5 sin cubrir']]); assert.deepEqual([f[1].estado, f[1].ambar], ['Sin convocar', ['7 sin cubrir']])
    assert.deepEqual([f[2].nombre, f[2].horario, f[2].estado, f[2].ambar, f[2].equipos.map(e => e.inicial)], ['Ensayo', '19:30 – 21:00', 'Convocado', ['2 sin responder'], ['A']]) })
  await prueba('el estado es texto: «Completo» si está convocado y no falta nada; «Convocado» + ámbar si falta; «Sin convocar» aunque haya asignados; un servicio terminado dice «Terminado» y no lleva ámbar', async () => {
    const completo = filasProximas([sv('x', '2026-11-08', [eq('t1', 'A', { convocados: 2, confirmados: 2 })])])[0]; assert.deepEqual([completo.estado, completo.ambar], ['Completo', []])
    const mixto = filasProximas([sv('x', '2026-11-08', [eq('t1', 'A', { convocados: 2, sinResponder: 1, vacantes: 2 })])])[0]; assert.deepEqual([mixto.estado, mixto.ambar], ['Convocado', ['2 sin cubrir', '1 sin responder']])
    const sinConv = filasProximas([sv('x', '2026-11-08', [eq('t1', 'A', { estado: 'sin-convocar', asignados: 2 })])])[0]; assert.deepEqual([sinConv.estado, sinConv.ambar], ['Sin convocar', []])
    const t = filasHistorial(lista)[0]; assert.deepEqual([t.estado, t.ambar, t.terminado], ['Terminado', [], true]) })
  await prueba('un servicio RECIÉN CREADO (sin asignados, convocados ni cupos: el resumen lo trae con `equipos: []`) SÍ tiene su fila, sin cuadritos y «Sin convocar»; la lista ya no depende de los equipos', async () => {
    const nuevo = sv('Servicio Ancora — domingo 8 noviembre 2026', '2026-11-08', []), f = filasProximas([nuevo, ...lista.slice(0, 1)])
    assert.deepEqual(f.map(x => x.servicioId), [nuevo.id, lista[0].id]); assert.deepEqual([f[0].nombre, f[0].equipos, f[0].estado, f[0].ambar, f[0].horario], ['Servicio Ancora', [], 'Sin convocar', [], '10:00 – 14:00'])
    assert.equal(filasProximas([sv('', '2026-11-08', [])])[0].nombre, 'Servicio', 'sin título, «Servicio»'); assert.equal(filasProximas([sv('', '2026-11-08', [], { tipo: 'ensayo' })])[0].nombre, 'Ensayo')
    // la causa (resumenServicios): un equipo sin asignados, convocados ni cupo guardado «no participa» y no entra en `equipos`
    const { resumenServicios } = real('lib/admin/resumenServicios'), r = resumenServicios({ ahora: new Date('2026-10-19T15:00:00Z'), teams: [{ id: 't1', name: 'Alabanza' }], positions: [{ id: 'p1', team_id: 't1' }], services: [{ id: 's', fecha: '2026-11-08', hora_inicio: '10:00', hora_fin: '14:00', titulo: 'Servicio Ancora' }], slots: [], assignments: [], invitations: [] })
    assert.deepEqual(r[0].equipos, [], 'el servicio nuevo llega sin equipos'); assert.equal(filasProximas(r).length, 1, 'y aun así sale en la lista') })
  await prueba('un LÍDER ve solo su equipo (sus cuadritos y sus números); un servicio donde participan otros equipos pero no el suyo no sale; uno sin ningún equipo todavía sí', async () => {
    const f = filasProximas(lista, LIDER(['t2'])); assert.deepEqual(f.map(x => x.servicioId), ['Servicio Ancora — domingo 25 octubre 2026', 'Servicio Ancora'], 'el ensayo es solo de Alabanza: no sale'); assert.deepEqual(f[0].equipos.map(e => e.nombre), ['Producción']); assert.deepEqual(f[0].ambar, ['1 sin cubrir']); assert.deepEqual(f[1].ambar, ['2 sin cubrir'])
    assert.deepEqual(filasProximas([sv('x', '2026-11-08', [])], LIDER(['t2'])).length, 1); assert.deepEqual(filasProximas(lista, LIDER([])), [], 'un líder sin equipos no ve servicios con equipos ajenos'); assert.equal(filasHistorial(lista, LIDER(['t9'])).length, 0) })
  await prueba('historial: los terminados, del más reciente al más antiguo, máximo 10; los cuadritos caben 5 y el resto va en «+N»', async () => {
    assert.equal(HISTORIAL_FILAS, 10); const h = filasHistorial(lista); assert.equal(h.length, 10); assert.equal(h[0].servicioId, 'p0'); assert.equal(h[9].servicioId, 'p9'); assert.equal(filasHistorial(lista, ADMIN, 3).length, 3)
    const equipos = Array.from({ length: 8 }, (_, i) => ({ teamId: 't' + i, nombre: 'E' + i, color: null, inicial: 'E' })); assert.deepEqual([cuadritosVisibles(equipos).items.length, cuadritosVisibles(equipos).mas], [5, 3]); assert.deepEqual([cuadritosVisibles(equipos.slice(0, 2)).items.length, cuadritosVisibles(equipos.slice(0, 2)).mas], [2, 0]) })

  console.log('la pantalla')
  await prueba('la lista es una fila por servicio con los textos de lib/textos; ya no tiene «Convocar» ni filtros por equipo; la fila abre el servicio; estados de carga y error iguales a los del Home', async () => {
    const l = leer('components/servicio-movil/ListaServicios.tsx'), t = leer('lib/textos/servicio.ts')
    assert.ok(/from '@\/lib\/admin\/listaServicios'/.test(l)); assert.ok(/from '@\/lib\/textos\/servicio'/.test(l)); assert.ok(/ErrorDeCarga compacto/.test(l)); assert.ok(/onReintentar/.test(l)); assert.ok(/role="status"/.test(l)); assert.ok(/aria-expanded=\{historial\}/.test(l)); assert.ok(/aria-label=\{T\.nuevoServicio\}/.test(l))
    assert.ok(!/convocar|Convocar|aria-pressed|filtro|chip/.test(l), 'sin botón «Convocar» ni filtros'); assert.ok(!/convocar:|todos:|filtroEquipo/.test(t), 'los textos viejos de la lista ya no están'); assert.ok(/onClick=\{\(\) => onAbrir\(f\.servicioId\)\}/.test(l)) })
  await prueba('las filas son altas y con ETIQUETAS (mockup Servicios-B, primera versión): bloque de fecha de 54, relleno 14, radio 18, cuadritos de 22 con separación de 4, todo con la escala de teléfono (--esc); el estado y lo que falta son etiquetas de texto; cada cuadrito lleva su nombre; sin porcentajes ni colores sueltos', async () => {
    const l = leer('components/servicio-movil/ListaServicios.tsx'); assert.ok(/className=\{ui\.cuadrito\} role="img" aria-label=\{e\.nombre\}/.test(l)); assert.ok(/<span className=\{ui\.etiqueta\}>\{f\.estado\}<\/span>/.test(l)); assert.ok(/f\.ambar\.map\(a => <span key=\{a\} className=\{`\$\{ui\.etiqueta\} \$\{ui\.etiquetaAmbar\}`\}>\{a\}<\/span>\)/.test(l)); assert.ok(!/%/.test(l.replace(/\/\*[^]*?\*\//g, '')), 'sin porcentajes')
    assert.ok(/<span className=\{ui\.nombre\}>[^]*<span className=\{ui\.horario\}>[^]*<span className=\{ui\.etiquetas\}>/.test(l), 'tres líneas: nombre, horario, y cuadritos + etiquetas')
    const css = fs.readFileSync(path.join(RAIZ, 'components/servicio-movil/lista.module.css'), 'utf8'), regla = n => (css.match(new RegExp('\\.' + n + '\\{[^}]*\\}')) || [''])[0], esc = px => `calc(${px}px * var(--esc, 1))`
    assert.ok(regla('fila').includes(`padding:${esc(14)}`) && regla('fila').includes(`border-radius:${esc(18)}`) && /background:var\(--anc-panel\)/.test(regla('fila')), 'fila: relleno 14, radio 18, fondo de tarjeta')
    assert.ok(regla('dia').includes(`width:${esc(54)}`) && regla('dia').includes(`padding:${esc(8)} 0`), 'bloque de fecha: 54 de ancho y relleno vertical 8'); assert.ok(regla('dia b').includes(`font-size:${esc(24)}`) && regla('dia b').includes('font-weight:700'), 'número de 24 en negrita'); assert.ok(regla('dia > span').includes('font-size:max(11px, calc(11px * var(--esc, 1)))'), 'día de la semana y mes de 11 (sin bajar de 11 px reales)')
    assert.ok(regla('nombre').includes(`font-size:${esc(16)}`) && regla('nombre').includes('font-weight:600'), 'nombre de 16 semibold'); assert.ok(regla('horario').includes(`font-size:${esc(13)}`) && /color:var\(--anc-ink-3\)/.test(regla('horario')), 'horario de 13, tenue')
    assert.ok(regla('cuadrito').includes(`width:${esc(22)}`) && regla('cuadrito').includes(`height:${esc(22)}`) && regla('cuadrito').includes('font-size:max(11px, calc(11px * var(--esc, 1)))'), 'cuadritos de 22 con letra de 11'); assert.ok(regla('cuadritos').includes(`gap:${esc(4)}`), 'separación de 4')
    assert.ok(/background:var\(--anc-sunk\)/.test(regla('etiqueta')) && /border-radius:999px/.test(regla('etiqueta'))); assert.ok(/background:var\(--anc-pe-bg\); color:var\(--anc-pe\)/.test(regla('etiquetaAmbar')), 'ámbar para lo que falta'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), 'solo tokens') })
  await prueba('el aviso de «Al crear el servicio» («Checklist de Producción: había 2, se usó el primero por orden») no sale en la lista (ni como banda en teléfono): la banda es solo del escritorio y el teléfono lo muestra en la pantalla del servicio', async () => {
    assert.ok(/\{createServiceMsg && telefono===false && \(/.test(leer('app/admin/page.tsx'))) })
  await prueba('/admin: en teléfono sin ?servicio= va la lista, con ?servicio= las pantallas del servicio (ServicioMovil); en escritorio la vista de siempre; sin medir, ninguna', async () => {
    const a = leer('app/admin/page.tsx')
    assert.ok(/useMediaQuery\('\(max-width: 768px\)'\)/.test(a)); assert.ok(/const listaMovil = tab==='setlist' && telefono===true && !urlSrv\.servicio/.test(a)); assert.ok(/useResumenServicios\(listaMovil\)/.test(a))
    assert.ok(/telefono===null \? null : listaMovil/.test(a)); assert.ok(/telefono===true \? \(\s*<ServicioMovil p=\{servicioProps\} viewer=\{VIEWER_ADMIN\} vista=\{urlSrv\} irA=\{irServicio\} volver=\{volverServicio\}/.test(a)); assert.ok(/<AdminServiceView \{\.\.\.servicioProps\} \/>/.test(a))
    assert.ok(/viewer=\{VIEWER_ADMIN\} onAbrir=\{servicio=>irServicio\(\{ servicio, equipo: null, herramienta: null \}\)\}/.test(a)); assert.ok(/return data\.id as string/.test(a), 'createService devuelve el id para abrir el servicio nuevo') })
  await prueba('la hoja «Nuevo servicio» llama a createService de la página (no crea por su lado) y abre el servicio creado; el ensayo exige «Depende de»', async () => {
    const h = leer('components/servicio-movil/HojaNuevoServicio.tsx')
    assert.ok(/await crear\(fecha, inicio, fin, tipo/.test(h)); assert.ok(/cerrar\(\(\) => onCreado\(id\)\)/.test(h)); assert.ok(/tipo !== 'rehearsal' \|\| !!padre/.test(h)); assert.ok(/from '\.\.\/admin-movil\/HojaBase'/.test(h)); assert.ok(/noSePudoCrear/.test(h)) })
  await prueba('los textos nuevos no usan «Toca», «Selecciona», ni jerga, y hablan de tú', async () => {
    const t = leer('lib/textos/servicio.ts').replace(/export const tocaPosicion = [^\n]*\n/, ''); assert.ok(!/\bToca\b|Selecciona|click|\bemail\b/i.test(t), '«Toca» solo como «Toca {posición}» (el verbo tocar un instrumento), nunca como instrucción'); assert.ok(/export const tocaPosicion = \(posicion: string\): string => `Toca \$\{posicion\}`/.test(leer('lib/textos/servicio.ts'))); assert.ok(/Elige un servicio/.test(t)) })
  terminar()
})
