// Botón de modo (fase 1a): qué botón corresponde a cada rol, que un administrador nunca vea «Modo Líder», que sin rol no haya botón, y que el Perfil ya no tenga la fila «Administración». Correr: `npm run test:portal`.
const { assert, prueba, terminar, correr, resolver, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const { botonDelPortal, BOTON_MODO_USUARIO, etiquetaDeModo } = require(resolver(path.join(RAIZ, 'lib/modo')))
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
  terminar()
})
