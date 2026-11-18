// El líder en teléfono usa las MISMAS pantallas del administrador (lista, ficha de la fecha con rejilla de equipos, pantalla de equipo) con permisos: en su equipo edita; en los ajenos solo mira (candado). Datos inventados; sin red.
// Lo que se comprueba: (1) un equipo ajeno se dibuja sin ningún control de edición y con «Solo lectura»; (2) el propio sí los tiene y lleva «Tu equipo»; (3) todos los equipos propios llevan «Tu equipo» en la rejilla; (4) el borde de énfasis ya no existe en estas pantallas;
// (5) la lista destaca solo el servicio más cercano; (6) el código del líder no puede escribir en un equipo ajeno. Correr: `node tests/portal/lider-pantallas-compartidas.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const Module = require('module'), path = require('path'), fs = require('fs'), ts = require(path.join(RAIZ, 'node_modules/typescript'))
const compilar = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: 'commonjs', target: 'es2022', esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, file)
Module._extensions['.tsx'] = compilar; Module._extensions['.ts'] = compilar
Module._extensions['.css'] = mod => { mod.exports = new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) }) }
const previo = Module._resolveFilename
Module._resolveFilename = function (req, ...r) { if (req.startsWith('@/')) { const b = path.join(RAIZ, req.slice(2)); for (const c of [b + '.tsx', b + '.ts', path.join(b, 'index.tsx'), b]) if (fs.existsSync(c)) return c } return previo.call(this, req, ...r) }
const React = require(path.join(RAIZ, 'node_modules/react')), { renderToStaticMarkup: R } = require(path.join(RAIZ, 'node_modules/react-dom/server')), h = React.createElement
const cargar = f => require(path.join(RAIZ, f))
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
const D = cargar('components/lider-movil/datosVista.ts'), { RejillaEquipos } = cargar('components/servicio-movil/PantallaServicio.tsx')
const Ajeno = cargar('components/lider-movil/EquipoAjeno.tsx').default, Propio = cargar('components/lider-movil/EquipoPropio.tsx').default

const propio = (id, nombre) => ({ id, nombre, color: 'cobalto', tuEquipo: true, herramientas: [{ id: 'h1', tipo: 'checklist', nombre: 'Checklist' }], integrantes: [],
  posiciones: [{ id: 'p1', nombre: 'Voz', cupos: 2, slots: [{ slot: 1, persona: { id: 'm1', nombre: 'Paula', apellido: 'Prueba', estado: 'confirmo' } }, { slot: 2, persona: null }] }] })
const ajeno = (id, nombre) => ({ id, nombre, color: 'rosa', tuEquipo: false, herramientas: ['checklist', 'notes'],
  personas: [{ nombre: 'Alba', apellido: 'Ajena', posicion: 'Sonido', estado: 'confirmo' }, { nombre: 'Aldo', apellido: 'Ajeno', posicion: 'Luces', estado: 'sin-responder' }],
  posiciones: [{ nombre: 'Sonido', cupos: 1 }, { nombre: 'Luces', cupos: 3 }] })
const SUB = 'sábado 14 de noviembre · 10:00 – 14:00'
const CONTROLES = /posAbrir|fichaHerrAnadir|Añadir|Gestionar equipo|Asignar|Notificar/

correr(async () => {
  await prueba('un equipo AJENO se dibuja con «Solo lectura» y SIN ningún control de edición: no hay tarjetas de posición que abran nada, ni «Añadir», ni «Gestionar equipo», y las herramientas se ven pero no son botones', () => {
    const html = R(h(Ajeno, { equipo: ajeno('b', 'Producción'), subtitulo: SUB }))
    assert.ok(html.includes('Solo lectura') && html.includes('Producción') && html.includes(SUB)); assert.ok(!CONTROLES.test(html), 'apareció un control de edición: ' + (html.match(CONTROLES) || [])[0])
    assert.ok(!html.includes('Tu equipo'), 'un equipo ajeno no es «Tu equipo»')
    assert.equal((html.match(/<button/g) || []).length, 0, 'un equipo ajeno no tiene ningún botón'); assert.ok(html.includes('fichaHerrQuieta'), 'las herramientas salen como fichas quietas')
    assert.ok(html.includes('Sonido') && html.includes('Alba Ajena') && html.includes('Faltan 2'), 've a su gente y lo que falta')
  })
  await prueba('SU equipo tiene los controles (abrir herramientas, añadir las que faltan, «Gestionar equipo», tocar una posición), la etiqueta azul «Tu equipo» y la frase de la convocatoria; no lleva «Notificar» ni «Orden del servicio» ni el candado', () => {
    const html = R(h(Propio, { equipo: propio('a', 'Alabanza'), servicioId: 's1', fecha: '2026-11-14', subtitulo: SUB, cerrado: false, irA: () => {}, onCambio: () => {} }))
    for (const c of ['posAbrir', 'fichaHerrAnadir', 'Gestionar equipo', 'Tu equipo', 'Quien administra envía la convocatoria. Aquí solo preparas tu equipo.']) assert.ok(html.includes(c), 'falta ' + c)
    assert.ok(!/Notificar|Orden del servicio|Solo lectura/.test(html)); assert.ok(!html.includes('fichaHerrQuieta'), 'sus herramientas sí se abren')
  })
  await prueba('en la rejilla del servicio cada equipo del líder lleva «Tu equipo» (también si lidera dos) y los demás llevan el candado; la tarjeta usa la misma rejilla del administrador', () => {
    const eq = [propio('a', 'Alabanza'), propio('c', 'Medios'), ajeno('b', 'Producción')]
    const html = R(h(RejillaEquipos, { equipos: eq.map(D.tarjetaDe), onAbrir: () => {} }))
    assert.equal((html.match(/>Tu equipo</g) || []).length, 2, 'los dos equipos propios'); assert.equal((html.match(/lucide-lock/g) || []).length, 1, 'un solo candado: el equipo ajeno')
    assert.ok(html.includes('rejilla') && (html.match(/tarjetaEquipo/g) || []).length === 3); assert.ok(html.includes('Falta 1') && html.includes('Faltan 2'), 'las etiquetas «Faltan N» salen también en los ajenos')
    assert.ok(!/\bborder\b|propia/i.test(html.replace(/border-top/g, '')), 'ningún borde de énfasis en la rejilla')
  })
  await prueba('el borde de énfasis ya no existe en estas pantallas: ninguna usa la clase .propia, la etiqueta «Tu equipo» no lleva borde y la tarjeta del equipo no trae otro borde que la franja de color de siempre', () => {
    for (const f of ['ServiciosLider', 'EquipoPropio', 'EquipoAjeno']) assert.ok(!/propia\b/.test(sinComentarios(leer(`components/lider-movil/${f}.tsx`)).replace(/EquipoPropio|equipoPropio|PersonasEquipoPropio/g, '')), `${f} no usa la clase propia`)
    for (const f of ['PantallaServicio', 'VistaEquipo']) assert.ok(!/ui\.propia|1\.5px/.test(leer(`components/servicio-movil/${f}.tsx`)))
    const css = leer('components/servicio-movil/pantallas.module.css'), regla = css.match(/^\.tuEquipo\{[^}]*\}/m); assert.ok(regla, 'existe .tuEquipo'); assert.ok(!/border(?!-radius)|outline|box-shadow/.test(regla[0]), 'la etiqueta no lleva borde'); assert.ok(/--anc-modo-ink/.test(regla[0]), 'es la etiqueta azul del modo')
    assert.ok(!/\.propia\b/.test(leer('components/lider-movil/lider-movil.module.css')), 'la clase del borde ya no existe'); assert.ok(!/ui\.propia/.test(leer('components/lider-movil/PersonasEquipoPropio.tsx')), 'tampoco en la pantalla Personas'); assert.ok(/ui\.etiqueta\}>\{T\.tuEquipo\}/.test(leer('components/lider-movil/PersonasEquipoPropio.tsx')), 'Personas conserva la etiqueta azul')
  })
  await prueba('la lista de servicios del líder usa la ficha del administrador y destaca SOLO el más cercano (el primero) con «en N días»; los demás son filas iguales', () => {
    const l = sinComentarios(leer('components/lider-movil/ServiciosLider.tsx'))
    assert.ok(/import FichaServicio from '..\/servicio-movil\/FichaServicio'/.test(l) && /<FichaServicio key=\{s\.id\} grande=\{i === 0\}/.test(l) && /enDias=\{i === 0 \? enDiasTexto\(diasHasta\(s\.fecha\)\) : null\}/.test(l))
    assert.equal((l.match(/grande=/g) || []).length, 1); assert.ok(!/ui\.fila\b|ui\.fecha\b/.test(l), 'ya no dibuja su propia fila')
  })
  await prueba('el nombre de la herramienta es el del administrador («Cronograma») en la pantalla del líder, en la hoja «Agregar herramienta» y en lo que entrega el servidor; la franja del primer servicio lleva el color del primer equipo del líder', () => {
    const T = cargar('lib/textos/servicioLider.ts'), A = cargar('lib/textos/servicio.ts').TEXTOS_SERVICIO
    assert.equal(A.herramientaCronograma, 'Cronograma'); assert.equal(T.TEXTOS_LIDER_EDICION.horario, 'Cronograma'); assert.equal(T.TEXTOS_LIDER_EDICION.tipoHorario, 'Cronograma'); assert.ok(!/'Horario'/.test(leer('lib/lider/servicioLider.ts')))
    const l = sinComentarios(leer('components/lider-movil/ServiciosLider.tsx')); assert.ok(/color=\{i === 0 \? c\.datos\.colorEquipo \?\? null : null\}/.test(l), 'solo el destacado lleva el color')
    const r = sinComentarios(leer('app/api/lider/servicios/route.ts')); assert.ok(/colorEquipo/.test(r) && /\.select\('color, sort_order, name'\)/.test(r), 'del equipo solo se lee el color (y el orden)')
  })
  await prueba('permisos del líder: un equipo ajeno solo pasa por EquipoAjeno (sin cliente, sin manejadores); solo SU equipo llega a EquipoPropio; la ficha de la fecha no trae lápiz, «Notificar» ni «Orden del servicio» ni «⋯»', () => {
    const l = sinComentarios(leer('components/lider-movil/ServiciosLider.tsx')), a = sinComentarios(leer('components/lider-movil/EquipoAjeno.tsx'))
    assert.ok(!/lib\/lider\/cliente|enviar\(|fetch\(/.test(a)); assert.ok(!/onAbrirHerramienta|onAnadirHerramienta|onAbrirPosicion|accionVoluntarios/.test(a), 'EquipoAjeno no le pasa manejadores a la vista')
    assert.ok(/propio \? <EquipoPropio/.test(l) && /equipo && !equipo\.tuEquipo \? <EquipoAjeno/.test(l)); assert.ok(/const propio = equipo\?\.tuEquipo \? equipo : null/.test(l), 'solo es «propio» si el servidor lo marcó tuEquipo')
    assert.ok(!/onEditarHorario|onNotificar|onAbrirOrden|onMas=/.test(l), 'ninguna acción nueva para el líder'); assert.ok(!/ordenDelServicio|notificarNuevos/.test(l))
  })
  await prueba('las cuentas son las del administrador: vacantes = cupos que nadie ocupa; confirmados sobre asignados; en un equipo ajeno las personas se agrupan por el nombre de su posición', () => {
    const a = D.cuentasDe(ajeno('b', 'P')), p = D.cuentasDe(propio('a', 'A'))
    assert.deepEqual([a.asignados, a.confirmados, a.cupos, a.vacantes], [2, 1, 4, 2]); assert.deepEqual([p.asignados, p.confirmados, p.cupos, p.vacantes], [1, 1, 2, 1])
    const s = D.cuentasDelServicio([propio('a', 'A'), ajeno('b', 'P')]); assert.deepEqual([s.asignados, s.confirmados, s.vacantes, s.porcentaje], [3, 2, 3, 67])
    assert.equal(D.resumenDe(D.cuentasDe({ ...ajeno('x', 'X'), personas: [] })), 'Sin asignar')
  })
  await prueba('sin parpadeo del diseño antiguo: mientras carga el líder ve el esqueleto del administrador (lista y servicio), nunca un «Cargando…» suelto, y ya no existen los acordeones «Solo lectura» de antes', () => {
    const l = sinComentarios(leer('components/lider-movil/ServiciosLider.tsx'))
    assert.ok(/<EsqueletoLista seccion \/>/.test(l) && /<EsqueletoServicio \/>/.test(l)); assert.ok(!/T\.cargando|aria-expanded|ChevronDown/.test(l))
    assert.ok(/EsqueletoServicio/.test(leer('components/servicio-movil/ServicioMovil.tsx')), 'el administrador usa el mismo esqueleto')
  })
  terminar()
})
