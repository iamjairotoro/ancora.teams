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
  await prueba('el menú del líder tiene EXACTAMENTE Home, Servicios y Mi espacio, en ese orden, y cada uno lleva a una ruta que el líder puede abrir', async () => {
    assert.deepEqual(ITEMS_MENU_LIDER.map(i => [i.key, i.label, i.href]), [['home', 'Home', '/home'], ['servicios', 'Servicios', '/home/servicios'], ['miEspacio', 'Mi espacio', '/portal']])
    assert.ok(ITEMS_MENU_LIDER.every(i => !i.href.startsWith('/admin')), 'ningún ítem lleva a /admin (bloqueado para el líder)')
    assert.equal(destinoDeMenuLider('miEspacio'), '/portal')
  })
  await prueba('el menú es el PortalNav «solo teléfono» (desde 769 px no se muestra) con los íconos de los tres ítems', async () => {
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
  await prueba('el Home del líder abre servicios en /home/servicios y NUNCA le da los destinos de /admin (Personas y equipos siguen sin enlace)', async () => {
    const c = fuente('app/home/page.tsx'), i = c.indexOf('puedeAbrirAdministracion(viewer) ?'), bloque = c.slice(i, c.indexOf('</HomeAdminMovil>'.length ? ')} />' : '', i) + 6)
    const rama = bloque.slice(bloque.indexOf('} : {') + 5)
    assert.ok(/\/home\/servicios\?servicio=/.test(rama) && /onVerServicios: \(\) => router\.push\('\/home\/servicios'\)/.test(rama)); assert.ok(!/\/admin/.test(rama) && !/onVerPersonas|onAbrirEquipo/.test(rama))
  })
  await prueba('los componentes del líder no leen ni escriben tablas (sin .from(), sin rpc, sin métodos de escritura) y no tocan banda_assignments: solo piden /api/lider/* (el checklist usa su propia ruta autorizada)', async () => {
    for (const f of COMPONENTES) { const c = sinComentarios(fuente(f)); assert.ok(!/\.from\(|\.rpc\(|\.(insert|upsert)\(|method:\s*'(POST|PUT|PATCH|DELETE)'/.test(c), f); assert.ok(!/banda_assignments/.test(c), f) }
    const l = sinComentarios(fuente('components/lider-movil/ServiciosLider.tsx')); assert.ok(/\/api\/lider\/servicios/.test(l) && /\/api\/lider\/servicio\?id=/.test(l)); assert.ok(!/supabase/.test(l))
    const p = sinComentarios(fuente('app/home/servicios/page.tsx')); assert.ok(!/\.from\(/.test(p), 'la página no lee ninguna tabla (solo cierra sesión)')
  })
  await prueba('el detalle no tiene «Asignar personas» ni ninguna acción de cambio sobre los demás equipos (solo el botón Checklist de SU equipo)', async () => {
    const c = sinComentarios(fuente('components/lider-movil/ServiciosLider.tsx')), t = sinComentarios(fuente('lib/textos/servicioLider.ts'))
    assert.ok(!/Asignar/i.test(c + t)); const ajeno = c.slice(c.indexOf('<section key={e.id} className={ui.tarjeta}>')); assert.ok(!/<button[^>]*onClick=\{\(\) => irA/.test(ajeno), 'el equipo ajeno solo tiene el botón de plegar')
    assert.ok(c.includes('T.soloLectura') && c.includes('T.tuEquipo') && c.includes('T.ayuda'))
  })
  await prueba('los textos: la línea explicativa y las etiquetas del tablero, sin «en vivo» ni «al instante»', async () => {
    const { TEXTOS_LIDER: T } = real('lib/textos/servicioLider')
    assert.equal(T.ayuda, 'Puedes ver todos los equipos. Solo puedes cambiar el tuyo.'); assert.equal(T.tuEquipo, 'Tu equipo'); assert.equal(T.soloLectura, 'Solo lectura'); assert.equal(T.menuMiEspacio, 'Mi espacio')
    assert.ok(!/en vivo|al instante/i.test(JSON.stringify(T)))
  })
  terminar()
})
