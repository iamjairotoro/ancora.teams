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
    assert.ok(!/convocar|Convocar|aria-pressed|filtro/.test(l), 'sin botón «Convocar» ni filtros'); assert.ok(!/convocar:|todos:|filtroEquipo/.test(t), 'los textos viejos de la lista ya no están'); assert.ok(/onAbrir=\{\(\) => onAbrir\(f\.servicioId\)\}/.test(l)) })
  await prueba('la lista usa la ficha común (FichaServicio): la fila lleva cuadritos y chips de texto (estado y lo que falta, en ámbar); cada cuadrito lleva su nombre; el servicio MÁS CERCANO es la ficha grande, con «en N días»; sin porcentajes', async () => {
    const l = leer('components/servicio-movil/ListaServicios.tsx'), f = leer('components/servicio-movil/FichaServicio.tsx')
    assert.ok(/import FichaServicio, \{ Chips, Cuadritos \} from '\.\/FichaServicio'/.test(l)); assert.ok(/proximas\.map\(\(f, i\) => <Fila key=\{f\.servicioId\} f=\{f\} onAbrir=\{p\.onAbrir\} grande=\{i === 0\} \/>\)/.test(l), 'solo la primera es grande')
    assert.ok(/\[\{ texto: f\.estado \}, \.\.\.f\.ambar\.map\(a => \(\{ texto: a, ambar: true \}\)\)\]/.test(l)); assert.ok(/enDias=\{grande && !f\.terminado \? enDiasTexto\(diasHasta\(f\.fecha\)\) : null\}/.test(l)); assert.ok(!/%/.test(l + f), 'sin porcentajes')
    assert.ok(/className=\{ui\.cuadrito\} role="img" aria-label=\{e\.nombre\}/.test(f)); assert.ok(/ui\.chipAmbar/.test(f)) })
  await prueba('medidas de la ficha (mockups Lista-Admin y Lista-Usuario), todas con la escala de teléfono (--esc): FILA relleno 14, radio 18, fecha 54, cuadritos de 22 (separación 4), nombre 16/600, horario 13; GRANDE relleno 16, radio 22, fecha 68, título 19/700, borde izquierdo de 6 con el color del equipo, sombra suave y «en N días» en azul; solo tokens', async () => {
    const css = fs.readFileSync(path.join(RAIZ, 'components/servicio-movil/ficha.module.css'), 'utf8'), regla = n => (css.match(new RegExp('\\.' + n.replace(/\./g, '\\.') + '\\{[^}]*\\}')) || [''])[0], esc = px => `calc(${px}px * var(--esc, 1))`
    assert.ok(regla('ficha').includes(`border-radius:${esc(18)}`) && /background:var\(--anc-panel\)/.test(regla('ficha')), 'ficha: radio 18, fondo de tarjeta'); assert.ok(regla('abrir').includes(`padding:${esc(14)}`) && /min-height:44px/.test(regla('abrir')), 'relleno 14 y 44 px táctiles')
    assert.ok(regla('dia').includes(`width:${esc(54)}`) && regla('dia').includes(`padding:${esc(8)} 0`)); assert.ok(regla('dia b').includes(`font-size:${esc(24)}`) && regla('dia b').includes('font-weight:700')); assert.ok(regla('dia > span').includes('font-size:max(11px, calc(11px * var(--esc, 1)))'))
    assert.ok(regla('nombre').includes(`font-size:${esc(16)}`) && regla('nombre').includes('font-weight:600')); assert.ok(regla('horario').includes(`font-size:${esc(13)}`) && /color:var\(--anc-ink-3\)/.test(regla('horario')))
    assert.ok(regla('cuadrito').includes(`width:${esc(22)}`) && regla('cuadrito').includes(`height:${esc(22)}`) && regla('cuadrito').includes('font-size:max(11px, calc(11px * var(--esc, 1)))')); assert.ok(regla('cuadritos').includes(`gap:${esc(4)}`))
    assert.ok(/background:var\(--anc-sunk\)/.test(regla('chip')) && /border-radius:999px/.test(regla('chip'))); assert.ok(/background:var\(--anc-pe-bg\); color:var\(--anc-pe\)/.test(regla('chipAmbar')), 'ámbar para lo que falta')
    const g = regla('grande'); assert.ok(g.includes(`border-radius:${esc(22)}`) && g.includes(`border-left:${esc(6)} solid var(--anc-team-a)`) && /box-shadow:var\(--anc-e2\)/.test(g), 'grande: radio 22, borde izquierdo de 6 con el color del equipo, sombra suave')
    assert.ok(regla('grande .abrir').includes(`${esc(16)}`)); assert.ok(regla('grande .dia').includes(`width:${esc(68)}`)); assert.ok(regla('grande .nombre').includes(`font-size:${esc(19)}`) && regla('grande .nombre').includes('font-weight:700')); assert.ok(/color:var\(--anc-modo-ink\)/.test(regla('enDias')), '«en N días» en azul')
    assert.ok(regla('responder').includes(`border-radius:${esc(13)}`) && /min-height:max\(44px, calc\(46px \* var\(--esc, 1\)\)\)/.test(regla('responder')), 'botón de 46 y radio 13'); assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), 'solo tokens') })
  await prueba('«en N días»: hoy, mañana, en N días; ya pasó → nada', async () => {
    const { enDiasTexto } = real('lib/textos/servicio'); assert.deepEqual([0, 1, 2, 4, 30].map(enDiasTexto), ['hoy', 'mañana', 'en 2 días', 'en 4 días', 'en 30 días']); assert.equal(enDiasTexto(-1), null); assert.equal(enDiasTexto(NaN), null) })
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
