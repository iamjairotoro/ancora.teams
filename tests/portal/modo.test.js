// Botón de modo (fase 1a): qué botón corresponde a cada rol, que un administrador nunca vea «Modo Líder», que sin rol no haya botón, y que el Perfil ya no tenga la fila «Administración». Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { botonDelPortal, BOTON_MODO_USUARIO, etiquetaDeModo, rolDeModoDe } = require(resolver(path.join(RAIZ, 'lib/modo')))
const { TEXTOS_MODO } = require(resolver(path.join(RAIZ, 'lib/textos/modo')))
const { administracionDe } = require(resolver(path.join(RAIZ, 'lib/portal/perfil')))
// cliente falso de Supabase: organization_members (roles de la persona), team_members (equipos que lidera) y teams (activos)
const falso = ({ roles = [], lidera = [] }) => ({ from: t => { const r = { data: t === 'organization_members' ? roles.map(role => ({ role })) : t === 'team_members' ? lidera.map(team_id => ({ team_id })) : lidera.map(id => ({ id })), error: null }; const q = { select: () => q, eq: () => q, in: () => q, is: () => q, then: (a, b) => Promise.resolve(r).then(a, b) }; return q } })
correr(async () => {
  await prueba('administrador → «Modo Admin» a /admin; líder → «Modo Líder» a /home; sin rol (o sin la fila del servidor) → sin botón', async () => {
    assert.deepEqual(botonDelPortal({ destino: '/admin', rol: 'admin' }), { texto: 'Modo Admin', href: '/admin', icono: 'admin' })
    assert.deepEqual(botonDelPortal({ destino: '/home', rol: 'lider' }), { texto: 'Modo Líder', href: '/home', icono: 'lider' })
    for (const nada of [null, undefined, { destino: '/x', rol: 'otro' }]) assert.equal(botonDelPortal(nada), null) })
  await prueba('un administrador nunca recibe «Modo Líder», aunque el destino sea /home', async () => {
    assert.equal(botonDelPortal({ destino: '/home', rol: 'admin' }).texto, 'Modo Admin') })
  await prueba('dentro de Admin o Líder el botón es «Modo Usuario» a /portal (identidad por sesión, no el token); la etiqueta de un administrador es siempre «MODO ADMIN»', async () => {
    assert.deepEqual(BOTON_MODO_USUARIO, { texto: 'Modo Usuario', href: '/portal', icono: 'usuario' }); assert.equal(etiquetaDeModo(true), 'MODO ADMIN'); assert.equal(etiquetaDeModo(false), 'MODO LÍDER') })
  await prueba('el Perfil ya no tiene la fila «Administración» ni recibe esa propiedad', async () => {
    const f = fs.readFileSync(path.join(RAIZ, 'app/portal/_components/perfil/Perfil.tsx'), 'utf8')
    assert.ok(!/<span className=\{ui\.t\}>Administración<\/span>/.test(f)); assert.ok(!/administracion\b/.test(f.replace(/\/\/.*$/gm, '')), 'Perfil no usa `administracion`') })
  await prueba('fase 1b: /admin y /home pasan la etiqueta a AppShell (admin siempre «MODO ADMIN»; en /home según `viewerIsAdmin`) y ya no usan «Mi portal ↗»', async () => {
    const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
    assert.ok(/etiquetaModo=\{etiquetaDeModo\(true\)\}/.test(leer('app/admin/page.tsx'))); assert.ok(/etiquetaModo=\{etiquetaDeModo\(viewerIsAdmin\)\}/.test(leer('app/home/page.tsx')))
    const shell = leer('components/AppShell.tsx'), codigo = shell.replace(/\/\/.*$/gm, ''); assert.ok(shell.includes('BOTON_MODO_USUARIO') && !codigo.includes('Mi portal') && !/portalHref/.test(codigo))
    for (const f of ['app/admin/page.tsx', 'app/home/page.tsx']) assert.ok(!/portalHref/.test(leer(f))) })
  await prueba('chip compacto (Modo · D, opción 1): 32 px de alto, padding 0 12 0 10, radio 16, texto 13/600, ícono de 16 px, SIN chevron; zona táctil de 44 px; etiqueta 11/700 con padding 4 9', async () => {
    const css = fs.readFileSync(path.join(RAIZ, 'components/modo/modo.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    const boton = css.match(/\.boton\{([^}]*)\}/)[1]; assert.ok(/min-height:max\(32px, 2rem\)/.test(boton)); assert.ok(/padding:0 0\.75rem 0 0\.625rem/.test(boton)); assert.ok(/border-radius:1rem/.test(boton)); assert.ok(/font-size:\.8125rem; font-weight:600/.test(boton)); assert.ok(/position:relative/.test(boton))
    assert.ok(/\.boton::after\{[^}]*inset:-7px -5px/.test(css), 'el área clicable crece 6 px fuera del borde por arriba y por abajo: 32 + 12 = 44')
    const et = css.match(/\.etiqueta\{([^}]*)\}/)[1]; assert.ok(/padding:4px 9px/.test(et) && /font-size:11px/.test(et) && /font-weight:700/.test(et))
    const comp = fs.readFileSync(path.join(RAIZ, 'components/modo/BotonModo.tsx'), 'utf8').replace(/\/\/.*$/gm, ''); assert.ok(!/ChevronRight/.test(comp) && /size="1rem"/.test(comp), 'sin chevron y con ícono de 16 px')
    const tk = fs.readFileSync(path.join(RAIZ, 'app/ancora-tokens-v5.css'), 'utf8'); assert.equal((tk.match(/--anc-modo-btn:rgba\(255,255,255,\.06\); --anc-modo-btn-ring:rgba\(255,255,255,\.10\)/g) || []).length, 2, 'oscuro (por sistema y forzado)'); assert.ok(/--anc-modo-btn:rgba\(0,0,0,\.04\); --anc-modo-btn-ring:rgba\(0,0,0,\.10\)/.test(tk), 'claro')
    assert.ok(!/modoBtn/.test(fs.readFileSync(path.join(RAIZ, 'components/app.module.css'), 'utf8')), 'ya no hay una versión compacta aparte en AppShell') })
  await prueba('los rótulos salen de lib/textos/modo.ts (botón y etiqueta de la barra)', async () => {
    assert.deepEqual(TEXTOS_MODO, { botonAdmin: 'Modo Admin', botonLider: 'Modo Líder', botonUsuario: 'Modo Usuario', etiquetaAdmin: 'MODO ADMIN', etiquetaLider: 'MODO LÍDER' })
    const m = fs.readFileSync(path.join(RAIZ, 'lib/modo.ts'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*\*[\s\S]*?\*\//g, ''); for (const x of ['Modo Admin', 'Modo Líder', 'Modo Usuario', 'MODO ADMIN', 'MODO LÍDER']) assert.ok(!m.includes(x), 'lib/modo.ts no debe llevar «' + x + '» escrito') })
  await prueba('Propietario o Admin → rol admin; solo líder → líder; Propietario que además lidera se ve como Propietario (admin); sin nada → sin rol', async () => {
    assert.equal(rolDeModoDe(true, false), 'admin'); assert.equal(rolDeModoDe(true, true), 'admin'); assert.equal(rolDeModoDe(false, true), 'lider'); assert.equal(rolDeModoDe(false, false), null) })
  await prueba('el servidor (administracionDe): owner → /admin; admin → /admin; owner que además lidera → /admin (nunca líder); solo líder → /home; nada → null; sin sesión de Google → null', async () => {
    assert.deepEqual(await administracionDe(falso({ roles: ['owner'] }), 'm1', 'google'), { destino: '/admin', rol: 'admin' })
    assert.deepEqual(await administracionDe(falso({ roles: ['admin'] }), 'm1', 'google'), { destino: '/admin', rol: 'admin' })
    assert.deepEqual(await administracionDe(falso({ roles: ['owner'], lidera: ['t1'] }), 'm1', 'google'), { destino: '/admin', rol: 'admin' })
    assert.deepEqual(await administracionDe(falso({ roles: ['member'], lidera: ['t1'] }), 'm1', 'google'), { destino: '/home', rol: 'lider' })
    assert.equal(await administracionDe(falso({ roles: ['member'] }), 'm1', 'google'), null); assert.equal(await administracionDe(falso({ roles: ['owner'] }), 'm1', 'link'), null) })
  terminar()
})
