// Menú y «Servicios» del LÍDER en teléfono (etapa 1). Comprueba: el menú tiene SOLO tres ítems que llevan a pantallas que el líder puede abrir (nunca Personas ni Canciones todavía); se monta solo en teléfono
// (el HTML de escritorio y tablet no cambia); los componentes del líder no escriben nada ni importan el cliente de la base (todo viene de /api/lider/*), no ofrecen «Asignar personas», y los textos respetan las reglas.
// Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const real = n => require(resolver(path.join(RAIZ, n)))
const fuente = n => fs.readFileSync(path.join(RAIZ, n), 'utf8')
const sinComentarios = c => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const COMPONENTES = ['components/lider-movil/ServiciosLider.tsx', 'components/lider-movil/MenuLiderMovil.tsx', 'app/home/servicios/page.tsx']

correr(async () => {
  const { ITEMS_MENU_LIDER, destinoDeMenuLider } = real('lib/lider/menuMovil')
  await prueba('el menú del líder tiene EXACTAMENTE Home, Servicios, Personas y Resumen, en ese orden (sin «Mi espacio»), y cada uno lleva a una ruta que el líder puede abrir', async () => {
    assert.deepEqual(ITEMS_MENU_LIDER.map(i => [i.key, i.label, i.href]), [['home', 'Home', '/home'], ['servicios', 'Servicios', '/home/servicios'], ['personas', 'Personas', '/home/personas'], ['resumen', 'Resumen', '/home/resumen']])
    assert.ok(ITEMS_MENU_LIDER.every(i => !i.href.startsWith('/admin')), 'ningún ítem lleva a /admin (bloqueado para el líder)')
    assert.equal(destinoDeMenuLider('resumen'), '/home/resumen'); assert.ok(!ITEMS_MENU_LIDER.some(i => /espacio|portal/i.test(i.key + i.label + i.href)), '«Mi espacio» ya no está en el menú del líder')
  })
  await prueba('el menú es el PortalNav «solo teléfono» (desde 769 px no se muestra) con los íconos de los ítems', async () => {
    const c = sinComentarios(fuente('components/lider-movil/MenuLiderMovil.tsx')); assert.ok(/soloTelefono/.test(c) && /PortalNav/.test(c)); assert.ok(!/Personas|Canciones/.test(c))
  })
  await prueba('en /home el líder recibe su menú SOLO cuando telefono === true; el administrador conserva el suyo; en escritorio no se pasa ningún menú (el HTML no cambia)', async () => {
    const c = fuente('app/home/page.tsx'), m = c.match(/menuMovil=\{[^\n]*\}/)[0]
    assert.ok(/viewerIsAdmin \? <MenuAdminMovil/.test(m)); assert.ok(/telefono === true \? <MenuLiderMovil/.test(m)); assert.ok(/: undefined\}$/.test(m.replace(/\s*\/\/.*$/, '')) || /: undefined\}/.test(m))
  })
  await prueba('la pantalla /home/servicios redirige a /home en escritorio, manda al administrador a /admin y no monta nada fuera del teléfono', async () => {
    const c = sinComentarios(fuente('app/home/servicios/page.tsx'))
    assert.ok(/telefono === false\) router\.replace\('\/home'\)/.test(c)); assert.ok(/\/admin\?tab=setlist/.test(c)); assert.ok(/listo = permitido && !esAdmin && telefono === true/.test(c)); assert.ok(/menuMovil=\{listo \?/.test(c))
  })
  await prueba('el Home del líder abre servicios en /home/servicios y personas y equipos en /home/personas, y NUNCA le da los destinos de /admin', async () => {
    const c = fuente('app/home/page.tsx'), i = c.indexOf('puedeAbrirAdministracion(viewer) ?'), bloque = c.slice(i, c.indexOf('</HomeAdminMovil>'.length ? ')} />' : '', i) + 6)
    const rama = bloque.slice(bloque.indexOf('} : {') + 5)
    assert.ok(/\/home\/servicios\?servicio=/.test(rama) && /onVerServicios: \(\) => router\.push\('\/home\/servicios'\)/.test(rama)); assert.ok(!/\/admin/.test(rama), 'ningún destino de /admin'); assert.ok(/onVerPersonas: \(\) => router\.push\('\/home\/personas'\)/.test(rama) && /onAbrirEquipo: \(\) => router\.push\('\/home\/personas'\)/.test(rama), 'Personas del líder, no la de /admin')
  })
  await prueba('los componentes del líder no leen ni escriben tablas (sin .from(), sin rpc, sin métodos de escritura) y no tocan banda_assignments: solo piden /api/lider/* (el checklist usa su propia ruta autorizada)', async () => {
    for (const f of COMPONENTES) { const c = sinComentarios(fuente(f)); assert.ok(!/\.from\(|\.rpc\(|\.(insert|upsert)\(|method:\s*'(POST|PUT|PATCH|DELETE)'/.test(c), f); assert.ok(!/banda_assignments/.test(c), f) }
    const l = sinComentarios(fuente('components/lider-movil/ServiciosLider.tsx')); assert.ok(/\/api\/lider\/servicios/.test(l) && /\/api\/lider\/servicio\?id=/.test(l)); assert.ok(!/supabase/.test(l))
    const p = sinComentarios(fuente('app/home/servicios/page.tsx')); assert.ok(!/\.from\(/.test(p), 'la página no lee ninguna tabla (solo cierra sesión)')
  })
  await prueba('el bloque de un equipo AJENO no puede escribir: no importa el cliente de escritura, sus props son solo datos y la pantalla se lo da con UNA sola prop (equipo); solo los bloques de SU equipo importan lib/lider/cliente', async () => {
    const ajeno = sinComentarios(fuente('components/lider-movil/EquipoAjeno.tsx'))
    assert.ok(!/lib\/lider\/cliente|enviar\(|fetch\(/.test(ajeno), 'EquipoAjeno no escribe ni pide nada'); assert.ok(!/\bon[A-Z]\w*\??:\s*\(/.test(ajeno), 'ninguna prop de acción'); assert.ok(/\{ equipo \}: \{ readonly equipo: Datos \}/.test(ajeno))
    const lista = sinComentarios(fuente('components/lider-movil/ServiciosLider.tsx')); assert.ok(/<EquipoAjeno key=\{e\.id\} equipo=\{e\} \/>/.test(lista)); assert.ok(!/lib\/lider\/cliente/.test(lista))
    const importan = fs.readdirSync(path.join(RAIZ, 'components/lider-movil')).filter(f => /\.tsx?$/.test(f) && /lib\/lider\/cliente/.test(sinComentarios(fuente('components/lider-movil/' + f)))).sort()
    assert.deepEqual(importan, ['EquipoPropio.tsx', 'PantallaEquipo.tsx', 'PantallaHorario.tsx', 'PantallaNotas.tsx', 'PersonasEquipoPropio.tsx'])
    const cli = sinComentarios(fuente('lib/lider/cliente.ts')); assert.ok(/`\/api\/lider\/\$\{ruta\}`/.test(cli) && !/\/api\/admin|\/api\/send|\/api\/reassign/.test(cli))
  })
  await prueba('sin «Notificar» ni «Asignar personas» para otros equipos, y la pantalla del líder tampoco ofrece quitar herramientas, cambiar líderes ni roles', async () => {
    const todo = ['EquipoAjeno', 'EquipoPropio', 'PantallaEquipo', 'PantallaHorario', 'PantallaNotas', 'ServiciosLider'].map(n => sinComentarios(fuente(`components/lider-movil/${n}.tsx`))).join('\n')
    assert.ok(!/Notificar|send-invites|reassignment|ensayo-invites/i.test(todo)); assert.ok(!/is_leader|esLider\s*:\s*(true|!)|setTeamLeader|organization_members|team_admins/.test(todo.replace(/esLider: boolean/, '')), 'ni líderes ni roles')
    assert.ok(!/accion: 'quitar', equipo|herramientas', \{ accion: 'quitar'/.test(todo), 'no se quitan herramientas')
    const t = sinComentarios(fuente('lib/textos/servicioLider.ts')); assert.ok(!/Asignar personas/i.test(t + todo))
  })
  await prueba('Personas del líder: el bloque de los demás equipos no puede escribir (una sola prop de datos, sin el cliente), nunca se dibuja la foto, no se crean personas ni se tocan líderes, roles ni datos personales', async () => {
    const ajeno = sinComentarios(fuente('components/lider-movil/PersonasEquipoAjeno.tsx'))
    assert.ok(!/lib\/lider\/cliente|enviar\(|fetch\(/.test(ajeno), 'PersonasEquipoAjeno no escribe ni pide nada'); assert.ok(!/\bon[A-Z]\w*\??:\s*\(/.test(ajeno), 'ninguna prop de acción'); assert.ok(/\{ equipo, abierto: forzado \}: \{ readonly equipo: Datos; readonly abierto\?: boolean \}/.test(ajeno))
    const lista = sinComentarios(fuente('components/lider-movil/PersonasLider.tsx')); assert.ok(!/lib\/lider\/cliente|enviar\(/.test(lista), 'la pantalla no escribe: escribe solo PersonasEquipoPropio')
    const todos = fs.readdirSync(path.join(RAIZ, 'components/lider-movil')).filter(f => /\.tsx?$/.test(f)).map(f => sinComentarios(fuente('components/lider-movil/' + f))).join('\n')
    assert.ok(!/avatar_url|avatarUrl|<img\b|fecha_nacimiento/.test(todos), 'nunca la foto ni el nacimiento en la pantalla del líder')
    const personas = ['PersonasLider', 'PersonasEquipoPropio', 'PersonasEquipoAjeno', 'HojaPersona', 'HojaAgregarPersona'].map(n => sinComentarios(fuente(`components/lider-movil/${n}.tsx`))).join('\n')
    assert.ok(!/is_leader|team_admins|organization_members|setTeamLeader|crear persona|Nueva persona|nuevaPersona/i.test(personas.replace(/esLider/g, '')), 'ni líderes, ni roles, ni personas nuevas')
    assert.ok(!/type="(tel|email)"[^>]*onChange|<input[^>]*(telefono|correo)/i.test(personas), 'el teléfono y el correo solo se muestran')
  })
  await prueba('«Agregar persona» busca en el servidor: la hoja pide /api/lider/personas/buscar, no escribe, no lista a todos (mínimo 2 letras) y el selector de Servicios usa la misma hoja (ninguna ruta entrega la lista completa)', async () => {
    const h = sinComentarios(fuente('components/lider-movil/HojaAgregarPersona.tsx')); assert.ok(/\/api\/lider\/personas\/buscar\?equipo=/.test(h) && /MIN_LETRAS = 2/.test(h)); assert.ok(!/lib\/lider\/cliente|method:/.test(h))
    const s = sinComentarios(fuente('components/lider-movil/PantallaEquipo.tsx')); assert.ok(/HojaAgregarPersona/.test(s) && !/candidatos/.test(s), 'Servicios → Equipo usa la búsqueda')
    assert.ok(!/candidatos/.test(sinComentarios(fuente('app/api/lider/equipo/route.ts'))), 'la ruta de composición ya no entrega la lista de personas')
  })
  await prueba('/home/personas: solo teléfono, el administrador va a /admin y no lee ninguna tabla', async () => {
    const c = sinComentarios(fuente('app/home/personas/page.tsx'))
    assert.ok(/telefono === false\) router\.replace\('\/home'\)/.test(c) && /\/admin\?tab=personas/.test(c) && /listo = permitido && !esAdmin && telefono === true/.test(c) && /menuMovil=\{listo \?/.test(c)); assert.ok(!/\.from\(/.test(c))
  })
  await prueba('los textos: la línea explicativa y las etiquetas del tablero, sin «en vivo» ni «al instante»', async () => {
    const { TEXTOS_LIDER: T } = real('lib/textos/servicioLider')
    assert.equal(T.ayuda, 'Puedes ver todos los equipos. Solo puedes cambiar el tuyo.'); assert.equal(T.tuEquipo, 'Tu equipo'); assert.equal(T.soloLectura, 'Solo lectura'); assert.equal(T.menuResumen, 'Resumen'); assert.ok(!('menuMiEspacio' in T))
    assert.ok(!/en vivo|al instante/i.test(JSON.stringify(T)))
  })
  await prueba('Resumen del líder: la pantalla no escribe ni importa el cliente, nunca dibuja la foto, pide solo /api/lider/estadisticas, y su página usa la misma puerta que Personas (solo teléfono; el administrador va a /admin)', async () => {
    const pant = sinComentarios(fuente('components/lider-movil/ResumenLider.tsx'))
    assert.ok(!/lib\/lider\/cliente|enviar\(|method:\s*'(POST|PUT|PATCH|DELETE)'/.test(pant), 'ResumenLider no escribe'); assert.ok(!/avatar_url|<img|<Image\b/i.test(pant), 'solo iniciales'); assert.ok(/\/api\/lider\/estadisticas\?periodo=/.test(pant))
    assert.ok(!/telefono|email|nacimiento/i.test(pant)); assert.ok(!/en vivo|al instante/i.test(pant))
    const pag = sinComentarios(fuente('app/home/resumen/page.tsx'))
    assert.ok(/gate\.isOrgAdmin \|\| gate\.isAnyTeamLeader/.test(pag) && /max-width: 768px/.test(pag) && /window\.location\.href = '\/admin'/.test(pag) && /router\.replace\('\/home'\)/.test(pag) && /listo = permitido && !esAdmin && telefono === true/.test(pag) && /activo="resumen"/.test(pag))
    const { cifraServicios, cifraPersonas, avisoTodos, fechaDeUltimaVez, TEXTOS_RESUMEN_LIDER: TR } = real('lib/textos/servicioLider')
    assert.equal(cifraServicios(1), 'servicio'); assert.equal(cifraServicios(6), 'servicios'); assert.equal(cifraPersonas(1), 'persona sirvió'); assert.equal(cifraPersonas(4), 'personas sirvieron')
    assert.equal(avisoTodos('mes'), 'sirvió en todos los servicios del mes.'); assert.equal(fechaDeUltimaVez('2026-11-01'), 'domingo 1 nov'); assert.equal(TR.sinServicios, 'Aún sin servicios'); assert.equal(TR.anio, 'Este año')
    assert.ok(!/en vivo|al instante/i.test(JSON.stringify(TR)))
  })
  await prueba('ventana de asignar (etapa 4): «Tienen X en su perfil» primero, avisos «Sin otra asignación» / «Ya asignada en X» (de otro equipo solo el nombre del equipo) y «Bloqueó este día» deshabilitado; sin estos avisos nada impide en el servidor', async () => {
    const { opcionesDeAsignar, filtrarPorNombre, cifrasDeEquipo } = real('lib/lider/asignarLider')
    const i = (id, nombre, posiciones, asignadaEn = [], bloqueo = false) => ({ id, nombre, apellido: 'X', posiciones, asignadaEn, bloqueo })
    const ops = opcionesDeAsignar({ posicionId: 'pa', actualId: 'c', integrantes: [i('a', 'Luis', ['pa'], [], true), i('b', 'Bárbara', ['pa'], [{ posicion: 'stage', nombre: 'Stage' }]), i('c', 'Jairo', ['pa'], [{ posicion: 'pa', nombre: 'PA' }]), i('d', 'Zoe', [], [{ posicion: null, nombre: 'Producción' }]), i('e', 'Ana', ['pa'], [{ posicion: 'pa', nombre: 'PA' }])] })
    assert.deepEqual(ops.map(o => [o.nombre, o.disponible, o.conPerfil, o.detalle]), [['Ana X', true, true, 'Ya asignada en PA'], ['Bárbara X', true, true, 'Ya asignada en Stage'], ['Jairo X', true, true, 'Sin otra asignación'], ['Zoe X', true, false, 'Ya asignada en Producción'], ['Luis X', false, true, 'Bloqueó este día']], 'disponibles primero, por nombre; Jairo es quien ocupa el cupo y no se avisa de sí mismo')
    assert.equal(ops.find(o => o.nombre === 'Jairo X').esActual, true); assert.deepEqual(filtrarPorNombre(ops, 'BARBA').map(o => o.nombre), ['Bárbara X']); assert.equal(filtrarPorNombre(ops, '  ').length, 5)
    assert.deepEqual(cifrasDeEquipo([{ cupos: 2, slots: [{ persona: { estado: 'confirmo' } }, { persona: null }] }, { cupos: 1, slots: [{ persona: { estado: 'sin-responder' } }] }]), { cupos: 3, asignados: 2, confirmados: 1, faltan: 2 })
    assert.deepEqual(cifrasDeEquipo([]), { cupos: 0, asignados: 0, confirmados: 0, faltan: 0 })
    const hoja = sinComentarios(fuente('components/lider-movil/HojaPosicionLider.tsx'))
    assert.ok(!/lib\/lider\/cliente|enviar\(|fetch\(/.test(hoja), 'la ventana no escribe: avisa a EquipoPropio'); assert.ok(/disabled=\{!o\.disponible && !o\.esActual \|\| ocupado\}/.test(hoja)); assert.ok(!/Notificar|Orden|plantilla|is_leader|rol\b/i.test(hoja))
    assert.ok(!/bloque|asignadaEn|disponible/i.test(sinComentarios(fuente('app/api/lider/asignar/route.ts'))), '/api/lider/asignar no cambia: «Bloqueó este día» solo se deshabilita en la pantalla')
    const eq = sinComentarios(fuente('components/lider-movil/EquipoPropio.tsx')); assert.ok(/Gestionar|gestionarEquipo/.test(eq) && /posGrid/.test(eq) && /HojaPosicionLider/.test(eq)); assert.ok(!/Notificar|Orden\b/.test(eq)); assert.ok(!/en vivo|al instante/i.test(JSON.stringify(real('lib/textos/servicioLider').TEXTOS_LIDER_SERVICIO)))
  })
  terminar()
})
