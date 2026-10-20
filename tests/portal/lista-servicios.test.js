// Lista de Servicios en teléfono (bloque A2 de la fase 3): las filas por servicio y equipo, el chip de cada una, el filtro, el historial y el enlace con la página. Correr: `node tests/portal/lista-servicios.test.js`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const { estadoDeFila, filasProximas, filasHistorial, equiposDeLista, HISTORIAL_FILAS } = real('lib/admin/listaServicios')
const { faltan, sinResponderN } = real('lib/textos/servicio')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const eq = (teamId, nombre, o = {}) => ({ teamId, nombre, color: 'cobalto', asignados: 0, convocados: 0, confirmados: 0, rechazos: 0, sinResponder: 0, vacantes: 0, estado: 'convocado', ...o })
const sv = (id, fecha, equipos, o = {}) => ({ id, fecha, titulo: id, horaInicio: '10:00:00', horaFin: '14:00:00', tipo: 'servicio', terminado: false, equipos, ...o })

correr(async () => {
  console.log('chip de cada fila')
  await prueba('lo urgente primero: faltan posiciones → quién no respondió → completo; sin convocar es el botón; un servicio terminado no lleva chip', async () => {
    assert.deepEqual(estadoDeFila(eq('a', 'A', { vacantes: 2, sinResponder: 3 }), false), { tipo: 'faltan', texto: 'Faltan 2' })
    assert.deepEqual(estadoDeFila(eq('a', 'A', { vacantes: 1 }), false), { tipo: 'faltan', texto: 'Falta 1' })
    assert.deepEqual(estadoDeFila(eq('a', 'A', { sinResponder: 2 }), false), { tipo: 'sin-responder', texto: '2 sin responder' })
    assert.deepEqual(estadoDeFila(eq('a', 'A'), false), { tipo: 'completo', texto: 'Completo' })
    assert.deepEqual(estadoDeFila(eq('a', 'A', { estado: 'sin-convocar', vacantes: 3 }), false), { tipo: 'convocar' })
    assert.deepEqual(estadoDeFila(eq('a', 'A', { vacantes: 3 }), true), { tipo: 'ninguno' })
    assert.equal(faltan(1), 'Falta 1'); assert.equal(faltan(0), 'Faltan 0'); assert.equal(sinResponderN(4), '4 sin responder') })

  console.log('filas')
  const lista = [
    sv('s1', '2026-10-25', [eq('t1', 'Alabanza', { convocados: 10, confirmados: 9, asignados: 12, vacantes: 1 }), eq('t2', 'Producción', { color: 'naranja', convocados: 4, confirmados: 4 }), eq('t3', 'Bienvenida', { estado: 'sin-convocar' })]),
    sv('ens', '2026-10-27', [eq('t1', 'Alabanza', { convocados: 3, confirmados: 1, sinResponder: 2 })], { tipo: 'ensayo', horaInicio: '19:30:00', horaFin: '21:00:00' }),
    ...Array.from({ length: 12 }, (_, i) => sv('p' + i, `2026-10-${String(18 - i).padStart(2, '0')}`, [eq('t1', 'Alabanza', { convocados: 2, confirmados: 2 })], { terminado: true })),
  ]
  await prueba('una fila por servicio y equipo, en orden de fecha, con día, mes, horario y «N de M confirmados» sobre los CONVOCADOS', async () => {
    const f = filasProximas(lista)
    assert.deepEqual(f.map(x => x.clave), ['s1-t1', 's1-t2', 's1-t3', 'ens-t1'])
    assert.equal(f[0].diaSemana, 'dom'); assert.equal(f[0].dia, '25'); assert.equal(f[0].mes, 'oct'); assert.equal(f[0].cuando, 'domingo 25 de octubre')
    assert.equal(f[0].detalle, '10:00 – 14:00 · 9 de 10 confirmados', 'confirmados sobre convocados (10), no sobre asignados (12)')
    assert.equal(f[1].detalle, '10:00 – 14:00 · 4 de 4 confirmados'); assert.equal(f[2].detalle, '10:00 – 14:00 · Sin convocar')
    assert.equal(f[3].nombre, 'Ensayo · Alabanza'); assert.equal(f[3].detalle, '19:30 – 21:00 · 1 de 3 confirmados'); assert.equal(f[3].diaSemana, 'mar')
    assert.equal(f[0].color, 'cobalto'); assert.equal(f[1].color, 'naranja'); assert.ok(f.every(x => !x.terminado)) })
  await prueba('«1 de 1 confirmado» concuerda en singular y un equipo convocado sin respuestas aún no inventa números', async () => {
    const f = filasProximas([sv('x', '2026-11-01', [eq('t1', 'Alabanza', { convocados: 1, confirmados: 0 }), eq('t2', 'Prod', { convocados: 0 })])])
    assert.equal(f[0].detalle, '10:00 – 14:00 · 0 de 1 confirmado'); assert.equal(f[1].detalle, '10:00 – 14:00 · Convocado') })
  await prueba('el filtro deja solo ese equipo; un equipo sin servicios próximos da lista vacía', async () => {
    assert.deepEqual(filasProximas(lista, 't1').map(x => x.clave), ['s1-t1', 'ens-t1']); assert.deepEqual(filasProximas(lista, 'zz'), []) })
  await prueba('historial: los terminados, del más reciente al más antiguo, máximo 10 servicios, sin chip', async () => {
    assert.equal(HISTORIAL_FILAS, 10); const h = filasHistorial(lista)
    assert.equal(h.length, 10); assert.equal(h[0].servicioId, 'p0'); assert.equal(h[9].servicioId, 'p9'); assert.ok(h.every(x => x.terminado && x.estado.tipo === 'ninguno'))
    assert.equal(filasHistorial(lista, 'zz').length, 0); assert.equal(filasHistorial(lista, null, 3).length, 3) })
  await prueba('los chips del filtro: los equipos que aparecen, en orden de aparición y sin repetir', async () => {
    assert.deepEqual(equiposDeLista(lista).map(e => e.teamId), ['t1', 't2', 't3']); assert.deepEqual(equiposDeLista([]), []) })

  console.log('la pantalla')
  await prueba('la lista usa las filas y los textos compartidos, el resumen por equipo y los mismos estados de carga y error del Home', async () => {
    const l = leer('components/servicio-movil/ListaServicios.tsx')
    assert.ok(/from '@\/lib\/admin\/listaServicios'/.test(l)); assert.ok(/from '@\/lib\/textos\/servicio'/.test(l)); assert.ok(/ErrorDeCarga compacto/.test(l)); assert.ok(/onReintentar/.test(l)); assert.ok(/role="status"/.test(l))
    assert.ok(/aria-pressed=\{filtro === null\}/.test(l)); assert.ok(/aria-expanded=\{historial\}/.test(l)); assert.ok(/aria-label=\{T\.nuevoServicio\}/.test(l)) })
  await prueba('«Convocar» abre ese equipo (no convoca por sí solo) y la fila entera abre servicio + equipo', async () => {
    const l = leer('components/servicio-movil/ListaServicios.tsx'); assert.ok(/const abrir = \(\) => onAbrir\(f\.servicioId, f\.teamId\)/.test(l)); assert.ok(/onClick=\{abrir\}>\{T\.convocar\}/.test(l)) })
  await prueba('/admin: en teléfono sin ?servicio= va la lista, con ?servicio= la barra «‹ Servicios» y el servicio; en escritorio la vista de siempre; sin medir, ninguna', async () => {
    const a = leer('app/admin/page.tsx')
    assert.ok(/useMediaQuery\('\(max-width: 768px\)'\)/.test(a)); assert.ok(/const listaMovil = tab==='setlist' && telefono===true && !urlSrv\.servicio/.test(a)); assert.ok(/useResumenServicios\(listaMovil\)/.test(a))
    assert.ok(/telefono===null \? null : listaMovil/.test(a)); assert.ok(/\{telefono===true && <BarraServicios onVolver=\{volverServicio\} \/>\}/.test(a))
    assert.ok(/irServicio\(\{ servicio, equipo, herramienta: null \}\)/.test(a)); assert.ok(/return data\.id as string/.test(a), 'createService devuelve el id para abrir el servicio nuevo') })
  await prueba('la hoja «Nuevo servicio» llama a createService de la página (no crea por su lado) y abre el servicio creado; el ensayo exige «Depende de»', async () => {
    const h = leer('components/servicio-movil/HojaNuevoServicio.tsx')
    assert.ok(/await crear\(fecha, inicio, fin, tipo/.test(h)); assert.ok(/cerrar\(\(\) => onCreado\(id\)\)/.test(h)); assert.ok(/tipo !== 'rehearsal' \|\| !!padre/.test(h)); assert.ok(/from '\.\.\/admin-movil\/HojaBase'/.test(h)); assert.ok(/noSePudoCrear/.test(h)) })
  await prueba('los textos nuevos no usan «Toca», «Selecciona», ni jerga, y hablan de tú', async () => {
    const t = leer('lib/textos/servicio.ts'); assert.ok(!/\bToca\b|Selecciona|click|\bemail\b/i.test(t)); assert.ok(/Elige un servicio/.test(t)) })
  terminar()
})
