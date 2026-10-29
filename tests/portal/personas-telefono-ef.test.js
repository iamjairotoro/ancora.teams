// Personas y Equipos en teléfono (Personas-E/F): pestañas de texto (solo teléfono), fila de persona compartida por las dos listas (valores del tablero × --esc) y escritorio/tablet sin cambios. Correr: `node tests/portal/personas-telefono-ef.test.js`
const { assert, prueba, terminar, correr, RAIZ } = require('./_banco')
const path = require('path'), fs = require('fs')
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8'), sinCom = t => t.replace(/\/\*[\s\S]*?\*\//g, ''), plano = t => sinCom(t).replace(/\s+/g, ' ')

correr(async () => {
  await prueba('PestanasTexto: tablist con tabs y aria-selected, un solo tab en el orden de Tab, flechas que cambian de pestaña; 16 px, 22 px entre pestañas, subrayado de 2 px (radio 1), activa 700 con --anc-ink e inactiva 600 con --anc-pestana-off, sin fondo ni borde, 44 de alto', async () => {
    const x = plano(leer('components/personas/PestanasTexto.tsx')), c = plano(leer('components/personas/pestanas-texto.module.css'))
    assert.ok(/role="tablist"/.test(x) && /role="tab"/.test(x) && /aria-selected=\{valor === p\.valor\}/.test(x) && /tabIndex=\{i === indice \? 0 : -1\}/.test(x)); assert.ok(/ArrowRight/.test(x) && /ArrowLeft/.test(x) && /onCambio\(pestanas\[i\]\.valor\)/.test(x))
    assert.ok(/\.grupo\{[^}]*gap:22px[^}]*inset 0 -1px 0 var\(--anc-rule\)/.test(c), 'hueco de 22 y línea base de 1 px tenue'); assert.ok(/\.pestana\{[^}]*min-height:44px[^}]*border:0; background:none[^}]*color:var\(--anc-pestana-off\)[^}]*font-size:16px; font-weight:600/.test(c))
    assert.ok(/\.pestana\[aria-selected="true"\]\{ color:var\(--anc-ink\); font-weight:700; \}/.test(c)); assert.ok(/::after\{[^}]*height:2px; border-radius:1px/.test(c), 'subrayado de 2 px con radio 1 del ancho del texto')
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(c) && !/\brgba?\(/.test(c), 'solo tokens') })
  await prueba('PersonasPanel dibuja PestanasTexto solo en teléfono y conserva el Segmentado (mismo marcado) en escritorio y tablet; la lógica de cambio (setVistaElegida) es la misma', async () => {
    const t = leer('components/PersonasPanel.tsx').replace(/\s+/g, ' ')
    assert.ok(/telefonoYa \? <PestanasTexto etiqueta=\{TEXTOS_PERSONAS\.comoVer\} valor=\{vista\} onCambio=\{setVistaElegida\} pestanas=\{\[.*?\]\} \/> : <Segmentado className=\{panel\.selector\} etiqueta=\{TEXTOS_PERSONAS\.comoVer\} valor=\{vista\} onCambio=\{setVistaElegida\}/.test(t))
    assert.ok(/\(!telefonoYa \|\| vista === 'equipo'\) && \( <button type="button" className=\{panel\.gestionar\}/.test(t), '«Gestionar equipos» sigue a la derecha') })
  await prueba('PersonaCelda: una sola fuente de tipografía para Personas y Equipos — nombre 16, secundaria 13, etiqueta 11,5/700, avatar 38 y fila mínima 58, todo × --esc con piso de 11 px y 44 de zona táctil', async () => {
    const c = plano(leer('components/personas/persona-celda.module.css'))
    assert.ok(/\.fila\.fila\{[^}]*min-height:max\(44px, calc\(58px \* var\(--esc, 1\)\)\)/.test(c), 'fila mínima 58×esc con piso de 44'); assert.ok(/\.av\{[^}]*width:calc\(38px \* var\(--esc, 1\)\); height:calc\(38px \* var\(--esc, 1\)\)/.test(c), 'avatar 38×esc')
    assert.ok(/\.nm\{[^}]*font-size:calc\(16px \* var\(--esc, 1\)\); font-weight:600/.test(c), 'nombre 16×esc / 600'); assert.ok(/\.sub\{[^}]*font-size:max\(11px, calc\(13px \* var\(--esc, 1\)\)\)[^}]*color:var\(--anc-ink-3\)/.test(c), 'secundaria 13×esc gris')
    assert.ok(/\.etiqueta\{[^}]*font-size:max\(11px, calc\(11\.5px \* var\(--esc, 1\)\)\)[^}]*font-weight:700/.test(c), 'etiqueta 11,5×esc / 700'); assert.ok(!/font-family/.test(c), 'sin fuente propia: hereda la de la app'); assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(c) && !/\brgba?\(/.test(c))
    const e = plano(leer('components/personas/por-equipo.module.css')), m = e.slice(e.lastIndexOf('@media (max-width:768px){'))
    assert.ok(/\.nombre\{ font-size:calc\(17px \* var\(--esc, 1\)\); \}/.test(m) && /\.cuenta\{ font-size:max\(11px, calc\(13px \* var\(--esc, 1\)\)\); \}/.test(m), 'título de equipo 17×esc y contador 13×esc')
    const l = plano(leer('components/personas-list.module.css')), ml = l.slice(l.lastIndexOf('@media (max-width:768px){')); assert.ok(/\.count\{ font-size:max\(11px, calc\(13px \* var\(--esc, 1\)\)\); \}/.test(ml), 'contador de la lista 13×esc') })
  await prueba('las dos listas usan PersonaCelda y claseFilaPersona SOLO en teléfono; en escritorio y tablet conservan su marcado de siempre (Admin, Propietario y Líder quedan junto al nombre)', async () => {
    const a = leer('components/PersonasList.tsx').replace(/\s+/g, ' '), b = leer('components/personas/PorEquipo.tsx').replace(/\s+/g, ' ')
    assert.ok(/className=\{telefono \? `\$\{styles\.rowMain\} \$\{claseFilaPersona\}` : styles\.rowMain\}/.test(a)); assert.ok(/\{telefono \? <PersonaCelda [^>]*etiqueta=\{roleOf\(m\.id\)\}[^>]*\/> : \( <> <PersonAvatar className=\{styles\.av\}/.test(a), 'Personas: celda en teléfono, marcado original fuera')
    assert.ok(/className=\{telefonoYa \? `\$\{ui\.persona\} \$\{claseFilaPersona\}` : ui\.persona\}/.test(b)); assert.ok(/\{telefonoYa \? <PersonaCelda .*?etiqueta=\{p\.lider \? 'Líder' : null\}.*?\/> : \( <> <PersonAvatar className=\{ui\.av\}/.test(b), 'Equipos: celda en teléfono, marcado original fuera')
    assert.ok(/<span className=\{ui\.lider\}>Líder<\/span>/.test(b), 'el escritorio conserva «Líder» en la línea de abajo') })
  terminar()
})
