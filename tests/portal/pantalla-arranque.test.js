// Pantalla de arranque del teléfono: capa fija solo ≤768 px, sin cambios en escritorio y tablet. Correr: `node tests/portal/pantalla-arranque.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinCom = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
correr(async () => {
  await prueba('la capa solo existe en teléfono: display:none por defecto y fija a pantalla completa dentro de @media (max-width:768px)', async () => {
    const css = sinCom(leer('components/arranque/arranque.module.css'))
    assert.ok(/\.raiz\{ display:none; \}/.test(css)); assert.ok(/@media \(max-width:768px\)\{\s*\.raiz\{ --fondo:#FAFAFA;[^}]*position:fixed;\s*inset:0;/.test(css)); assert.ok(!/min-width/.test(css)) })
  await prueba('el fondo sale solo de la configuración del sistema (claro #FAFAFA / oscuro #1E1E1E, los de ancora-tokens-v5.css), definido en CSS desde el primer pintado; sin degradado azul ni dependencia de la preferencia guardada', async () => {
    const css = sinCom(leer('components/arranque/arranque.module.css')), tok = leer('app/ancora-tokens-v5.css')
    assert.ok(/--fondo:#FAFAFA; --texto:#525252/.test(css) && /@media \(max-width:768px\) and \(prefers-color-scheme:dark\)\{\s*\.raiz\{ --fondo:#1E1E1E; --texto:#A3A3A3/.test(css))
    assert.ok(/--anc-bg:#FAFAFA;/.test(tok) && /--anc-ink-3:#525252;/.test(tok) && /--anc-bg:#1E1E1E;/.test(tok) && /--anc-ink-3:#A3A3A3;/.test(tok), 'los literales siguen siendo los del sistema de diseño')
    assert.ok(!/gradient|#1F2A44|#2E3D5C|data-theme|var\(--anc/.test(css), 'nada del azul ni del tema guardado') })
  await prueba('logo según el fondo (crema sobre oscuro, verde sobre claro) con <picture> y la media query del sistema; anillo dorado, giro, safe-area, reducir movimiento y medidas en rem', async () => {
    const css = sinCom(leer('components/arranque/arranque.module.css')), t = sinCom(leer('components/arranque/PantallaArranque.tsx'))
    assert.ok(/<source media="\(prefers-color-scheme: dark\)" srcSet="\/logo-icon-cream\.png" \/>/.test(t) && /src="\/logo-icon-green\.png"/.test(t) && /alt=""/.test(t))
    assert.ok(/--anillo:#C9A14A/.test(css) && /animation:giroArranque/.test(css)); assert.ok(/safe-area-inset-top/.test(css) && /safe-area-inset-bottom/.test(css)); assert.ok(/prefers-reduced-motion:reduce\)\{ \.anillo\{ animation:none; \}/.test(css))
    assert.ok(!/\d+px/.test(css.replace(/@media[^{]*\{/g, '')), 'medidas en rem'); assert.ok(/Verificando acceso…/.test(leer('lib/textos/arranque.ts'))) })
  await prueba('se usa en las cuatro pantallas de arranque y no reemplaza nada: es una capa extra (/, /home y /admin solo mientras se verifica el acceso, portal mientras carga); las dos pantallas de antes quedan debajo', async () => {
    const pagina = sinCom(leer('app/page.tsx')), home = sinCom(leer('app/home/page.tsx')), admin = sinCom(leer('app/admin/page.tsx')), portal = sinCom(leer('app/portal/_components/PortalApp.tsx'))
    assert.ok(/<PantallaArranque \/>/.test(pagina) && /animate-spin/.test(pagina)); assert.ok(/<\/AppShell>\s*<\/div>\s*\{verifying && <PantallaArranque \/>\}\s*<\/div>/.test(home) && /Verificando acceso\.\.\./.test(home)); assert.ok(/<\/AppShell>\s*\{verifying && <PantallaArranque \/>\}\s*<\/div>/.test(admin) && /Verificando acceso\.\.\./.test(admin)); assert.ok(!/\{verifying && <PantallaArranque \/>\}\s*<(AppShell|div className="anc")/.test(home + admin), 'la capa va DESPUÉS del marco: así AppShell conserva su posición entre hijos y no se vuelve a montar al terminar la verificación')
    assert.ok(/<div className=\{ui\.giro\} role="status" aria-label="Cargando"\/><PantallaArranque \/>/.test(portal)); assert.ok(!/noAccess && <PantallaArranque/.test(home + admin), 'sin acceso no se tapa el aviso') })
  terminar()
})
