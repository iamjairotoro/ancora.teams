// Pantalla de arranque del teléfono: capa fija solo ≤768 px, sin cambios en escritorio y tablet. Correr: `node tests/portal/pantalla-arranque.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
correr(async () => {
  await prueba('la capa solo existe en teléfono: display:none por defecto y fija a pantalla completa dentro de @media (max-width:768px)', async () => {
    const css = sinCom(leer('components/arranque/arranque.module.css'))
    assert.ok(/\.raiz\{ display:none; \}/.test(css)); assert.ok(/@media \(max-width:768px\)\{\s*\.raiz\{ position:fixed; inset:0;/.test(css)); assert.ok(!/min-width/.test(css)) })
  await prueba('diseño pedido: degradado #1F2A44→#2E3D5C, anillo #C9A14A que gira, logo crema, «Verificando acceso…»; igual en claro y oscuro (sin prefers-color-scheme ni var(--anc-*)); zonas seguras; reducir movimiento; sin px', async () => {
    const css = sinCom(leer('components/arranque/arranque.module.css')), t = sinCom(leer('components/arranque/PantallaArranque.tsx'))
    assert.ok(/linear-gradient\(135deg, #1F2A44, #2E3D5C\)/.test(css)); assert.ok(/#C9A14A/.test(css) && /animation:giroArranque/.test(css)); assert.ok(/src="\/logo-icon-cream\.png"/.test(t) && /alt=""/.test(t))
    assert.ok(!/prefers-color-scheme|var\(--/.test(css)); assert.ok(/safe-area-inset-top/.test(css) && /safe-area-inset-bottom/.test(css)); assert.ok(/prefers-reduced-motion:reduce\)\{ \.anillo\{ animation:none; \}/.test(css)); assert.ok(!/\d+px/.test(css.replace(/@media[^{]*\{/g, '')), 'medidas en rem')
    assert.ok(/Verificando acceso…/.test(leer("lib/textos/arranque.ts"))) })
  await prueba('se usa en las cuatro pantallas de arranque y no reemplaza nada: es una capa extra (/, /home y /admin solo mientras se verifica el acceso, portal mientras carga); las dos pantallas de antes quedan debajo', async () => {
    const pagina = sinCom(leer('app/page.tsx')), home = sinCom(leer('app/home/page.tsx')), admin = sinCom(leer('app/admin/page.tsx')), portal = sinCom(leer('app/portal/_components/PortalApp.tsx'))
    assert.ok(/<PantallaArranque \/>/.test(pagina) && /animate-spin/.test(pagina)); assert.ok(/\{verifying && <PantallaArranque \/>\}/.test(home) && /Verificando acceso\.\.\./.test(home)); assert.ok(/\{verifying && <PantallaArranque \/>\}/.test(admin) && /Verificando acceso\.\.\./.test(admin))
    assert.ok(/<div className=\{ui\.giro\} role="status" aria-label="Cargando"\/><PantallaArranque \/>/.test(portal)); assert.ok(!/noAccess && <PantallaArranque/.test(home + admin), 'sin acceso no se tapa el aviso') })
  terminar()
})
