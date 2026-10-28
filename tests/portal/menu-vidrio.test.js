// Menú inferior de vidrio (teléfono): la lente, el gesto y que el escritorio no cambia. Lee el código fuente (el efecto visual se comprueba con capturas). Correr: `node tests/portal/menu-vidrio.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8')
const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
const tsx = sinComentarios(leer('app/portal/_components/PortalNav.tsx')), css = leer('app/portal/_components/portal-nav.module.css'), med = leer('app/portal/_components/portal-nav-medidas.css')
const vidrio = css.slice(css.indexOf('Menú de vidrio (teléfono'), css.indexOf('/* escritorio */'))

correr(async () => {
  await prueba('la lente y su copia ampliada solo existen en teléfono; el escritorio conserva su indicador y sus clases', async () => {
    assert.ok(/<span className=\{ui\.ind\} ref=\{indRef\}/.test(tsx) && /\.vidrio \.ind\{ display:none; \}/.test(vidrio), 'el indicador sigue en el HTML (idéntico en escritorio) y se oculta en teléfono'); assert.ok(/\{telefono && \(\s*<div className=\{ui\.lente\}/.test(tsx), 'la lente solo en teléfono')
    assert.ok(/\$\{telefono \? ` \$\{ui\.vidrio\}` : ''\}/.test(tsx), 'la clase .vidrio solo en teléfono'); assert.ok(/\.\.\.\(telefono \? \{ onPointerDown/.test(tsx.replace(/\s+/g, ' ')) || /\{\.\.\.\(telefono \? \{ onPointerDown/.test(tsx.replace(/\s+/g, ' ')), 'los gestos solo en teléfono')
    assert.ok(/@media \(min-width:769px\)\{ \.lente\{ display:none; \} \}/.test(vidrio)); assert.ok(/@media \(max-width:768px\)/.test(med) && /--nav-h:4\.625rem/.test(med) && /--nav-icon:1\.75rem/.test(med), 'barra de 74 px e ícono de 28 px, solo ≤ 768 px') })
  await prueba('accesibilidad: la copia ampliada es aria-hidden y sin botones; los botones reales conservan aria-current y el aviso de no leídos; los botones son los de la barra', async () => {
    const lente = tsx.slice(tsx.indexOf('className={ui.lente}'), tsx.indexOf('</div>', tsx.indexOf('ui.zoom')) + 6); assert.ok(/aria-hidden="true"/.test(lente) && !/<button/.test(lente), 'la copia no tiene botones')
    assert.ok(/aria-current=\{on \? 'page' : undefined\}/.test(tsx) && /hay mensajes sin leer/.test(tsx)); assert.ok(/onClick=\{\(\) => onSelect\(it\.key\)\}/.test(tsx), 'el toque corto sigue siendo el clic del botón') })
  await prueba('gesto: el arrastre empieza pasados 6 px, se suelta en el ítem más cercano y suprime el clic solo tras arrastrar; la lente sigue al dedo sin transición', async () => {
    assert.ok(/UMBRAL_ARRASTRE = 6/.test(tsx) && /ZOOM_REPOSO = 1\.15, ZOOM_PRESIONADO = 1\.26/.test(tsx)); assert.ok(/masCercano\(/.test(tsx) && /suprimirClick/.test(tsx) && /onClickCapture/.test(tsx))
    assert.ok(/data-arrastra\] \.lente, \.nav\[data-arrastra\] \.zoom\{ transition:none; \}/.test(vidrio)); assert.ok(/touch-action:none/.test(vidrio)) })
  await prueba('estilos: vidrio con prefijo -webkit-, sin filtros SVG, sin colores sueltos (solo tokens --anc-* y negro/blanco mezclados), rebote y reduced-motion', async () => {
    assert.ok(/-webkit-backdrop-filter:blur\(0\.1875rem\)/.test(vidrio) && /\bbackdrop-filter:blur\(0\.1875rem\)/.test(vidrio)); assert.ok(!/url\(#|filter:\s*url/.test(vidrio + css), 'sin filtros SVG')
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(sinComentarios(vidrio)), 'sin hex en el bloque de vidrio'); assert.ok(/--rebote:cubic-bezier\(\.3,1\.5,\.5,1\)/.test(vidrio)); assert.ok(/prefers-reduced-motion:reduce\)\{ \.lente, \.zoom\{ transition:none !important; \} \}/.test(vidrio))
    assert.ok(/\.copia\.cur\{ color:var\(--anc-accent\); \}/.test(vidrio)); assert.ok(!/maximum-scale|user-scalable/.test(leer('app/layout.tsx'))) })
  await prueba('safe-area: el margen inferior sigue saliendo de --nav-bottom (zona segura) y las pantallas dejan espacio con --portal-nav-total', async () => {
    assert.ok(/--nav-bottom:max\(var\(--nav-min-bottom\), calc\(var\(--safe-bottom\) - var\(--nav-overlap\)\)\)/.test(med)); assert.ok(/--portal-nav-total:calc\(var\(--nav-bottom\) \+ var\(--nav-h\)\)/.test(med)) })
  terminar()
})
